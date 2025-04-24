/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-18 14:17:09
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-04-24 10:02:38
 * @Description: 能量收集和扫描基类，负责通用方法和执行能量球收集
 */
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
let { config: _config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')
let FileUtils = singletonRequire('FileUtils')
let AntForestDao = singletonRequire('AntForestDao')
let WarningFloaty = singletonRequire('WarningFloaty')
let YoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let { debugInfo, logInfo, errorInfo, warnInfo, infoLog, debugForDev, developSaving } = singletonRequire('LogUtils')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let ENGINE_ID = engines.myEngine().id
let _package_name = 'com.eg.android.AlipayGphone'
let _HoughHelper = require('../utils/HoughHelper.js')
let _VisualHelper = require('../utils/VisualHelper.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')

const BaseScanner = function () {
  let self = this
  // 针对奇葩分辨率，比如辣鸡瀑布屏
  let SCALE_RATE = _config.scaleRate
  let cvt = (v) => parseInt(v * SCALE_RATE)
  let COLLECTING_THRESHOLD = 25
  let EMPTY_FUNC = () => { }
  this.temp_img = null
  this.collect_operated = false
  this.is_own = false
  this.recheck = false
  this.collect_count = 0
  this.increased_energy = 0
  this.current_time = 0
  this.collect_any = false
  this.nocollect_count = 0
  this.min_countdown = 10000
  this.lost_reason = ''
  this.lost_someone = false
  this.threadPool = null
  this.isProtected = false
  this.isProtectDetectDone = false
  this.protectDetectingLock = threads.lock()
  this.protectDetectingCondition = this.protectDetectingLock.newCondition()
  this.lifecycleCallbackId = null
  this.houghHelper = null
  this.visualHelper = new _VisualHelper()
  this.visualHelper.init()
  // 收集对象
  this.target = null
  this.createNewThreadPool = function () {
    this.threadPool = new ThreadPoolExecutor(_config.thread_pool_size || 4, _config.thread_pool_max_size || 4, 60,
      TimeUnit.SECONDS, new LinkedBlockingQueue(_config.thread_pool_queue_size || 256),
      new ThreadFactory({
        newThread: function (runnable) {
          let thread = Executors.defaultThreadFactory().newThread(runnable)
          thread.setName(_config.thread_name_prefix + ENGINE_ID + '-scanner-' + thread.getName())
          return thread
        }
      })
    )
    // 注册生命周期结束后关闭线程池，防止脚本意外中断时未调用destroy导致线程池一直运行
    this.lifecycleCallbackId = _commonFunctions.registerOnEngineRemoved(function () {
      self.baseDestroy()
    }, 'shutdown scanner thread pool')
  }

  /**
   * 确保线程池已经创建
   */
  this.ensureThreadPoolCreated = function () {
    if (this.threadPool === null) {
      this.createNewThreadPool()
    }
  }

  this.baseDestroy = function () {
    if (this.threadPool !== null) {
      this.threadPool.shutdown()
      debugInfo(['等待scanner线程池关闭, 结果: {}', this.threadPool.awaitTermination(5, TimeUnit.SECONDS)])
      if (this.lifecycleCallbackId) {
        _commonFunctions.unregisterLifecycleCallback(this.lifecycleCallbackId)
        this.lifecycleCallbackId = null
      }
      this.threadPool = null
    }
    if (this.houghHelper !== null) {
      this.houghHelper = null
    }
    if (this.visualHelper !== null) {
      this.visualHelper.closeDialog()
      this.visualHelper = null
    }
  }

  this.initHoughHelperIfNeeded = function () {
    if (_config.develop_saving_mode && this.houghHelper === null) {
      this.houghHelper = new _HoughHelper()
    }
  }

  this.destroy = function () {
    this.baseDestroy()
  }

  /**
   * 展示当前累积收集能量信息，累加已记录的和当前运行轮次所增加的
   * 
   * @param {本次增加的能量值} increased
   */
  this.showCollectSummaryFloaty = function (increased) {
    if (this.group_execute_mode) {
      _commonFunctions.showTextFloaty('组队模式执行中，无法统计收集能量值')
      return
    }
    increased = increased || 0
    this.increased_energy += increased
    if (_config.is_cycle) {
      _commonFunctions.showCollectSummaryFloaty0(this.increased_energy, this.current_time, increased)
    } else {
      _commonFunctions.showCollectSummaryFloaty0(null, null, this.increased_energy)
    }
  }

  // 收取能量
  this.collectEnergy = function (isOwn) {
    this.collect_operated = false
    if (!isOwn && _config.use_one_key_collect && (YoloDetection.enabled || _config.image_config.one_key_collect)) {
      this.collectByOneKeyCollect()
      return
    }
    if (YoloDetection.enabled) {
      this.checkAndCollectByYolo(isOwn)
    } else {
      this.checkAndCollectByHough(isOwn)
    }
  }

  /**
   * 使用一键收
   *
   * @returns 
   */
  this.collectByOneKeyCollect = function () {

    let start = new Date().getTime()
    let haveValidBalls = false
    let recheck = false
    let limit = 3
    // 等待控件加载 否则截图可能存在载入动画
    _widgetUtils.widgetGetOne(_config.friend_load_more_content || '展开好友动态', 500)
    do {
      haveValidBalls = false
      WarningFloaty.clearAll()
      // 避免截图太快将悬浮窗内容截图进来
      sleep(30)
      let screen = _commonFunctions.checkCaptureScreenPermission()
      if (screen) {
        if (this.isProtected) {
          // 已判定为使用了保护罩
          return
        }
        let saveScreen = images.copy(screen, true)
        let collected = false
        if (YoloDetection.enabled) {
          let yoloCheckList = YoloDetection.forward(screen, { confidence: _config.yolo_confidence || 0.7, filter: (result) => result.label == 'one_key' || result.label == 'collect' })
          debugInfo(['本次yolo模型判断一键收信息总耗时：{}ms 找到目标数：{}', new Date().getTime() - start, yoloCheckList.length])
          if (yoloCheckList && yoloCheckList.length > 0) {
            let collect = yoloCheckList.filter(r => r.label == 'one_key')[0]
            if (collect) {
              if (limit < 3) {
                // 二次校验 检查是否有可收取球
                if (yoloCheckList.filter(c => c.label == 'collect').length <= 0) {
                  warnInfo(['yolo识别一键收多次且未找到可收取球，可能识别不正确，退出循环'])
                  break
                }
              }
              WarningFloaty.addRectangle('一键收', [collect.x - 10, collect.y - 10, collect.width + 20, collect.height + 20])
              clickOneKeyPoint(collect.centerX, collect.centerY)
              collected = true
            }
          }
          if (!collected && !recheck) {
            // 首次执行且yolo识别失败，尝试图片查找
            warnInfo(['yolo识别一键收失败'])
            YoloTrainHelper.saveImage(saveScreen, '一键收', 'one_key_fail', _config.save_one_key_fail_train_data)
            // 通过图片查找补充
            collected = this.oneKeyCollectByImg()
          }
        } else {
          collected = this.oneKeyCollectByImg()
        }

        if (collected) {
          this.one_key_had_success = true
          haveValidBalls = true
          YoloTrainHelper.saveImage(saveScreen, '一键收', 'one_key', _config.save_one_key_train_data)
          this.collect_operated = true
        } else if (!recheck) {
          if (!YoloDetection.enabled) {
            warnInfo(['未能通过一键收图片找到目标按钮，请确认在查找图片设这中正确配置了相应图片，仅仅覆盖文字即可，不要截取多余的信息'])
          } else {
            warnInfo(['未能通过YOLO识别一键收位置，建议收集YOLO图片数据，并上传 让作者进一步训练'])
          }
          sleep(500)
          // 兜底的OCR识别一键收
          if (this.oneKeyCollectByOcr()) {
            this.collect_operated = true
            haveValidBalls = true
          }
        } else if (_config.double_check_collect) {
          debugInfo(['二次校验未能找到一键收'])
        }
        saveScreen.recycle()
      } else {
        errorInfo('获取截图失败')
      }
      if (haveValidBalls && _config.double_check_collect) {
        recheck = true
        debugInfo(['需要二次校验，等待{}ms', 150])
        sleep(150)
      }
      WarningFloaty.clearAll()
    } while (haveValidBalls && _config.double_check_collect && limit-- > 0)
    debugInfo(['收集能量球总耗时：{}ms', new Date().getTime() - start])
  }

  this.oneKeyCollectByImg = function () {
    let screen = _commonFunctions.checkCaptureScreenPermission()
    if (_config.image_config.one_key_collect) {
      debugInfo(['尝试图片识别一键收'])
      let collect = OpenCvUtil.findByImageSimple(images.cvtColor(images.grayscale(screen), 'GRAY2BGRA'), images.fromBase64(_config.image_config.one_key_collect))
      if (collect) {
        WarningFloaty.addRectangle('一键收', [collect.left - 10, collect.top - 10, collect.width() + 20, collect.height() + 20])
        clickOneKeyPoint(collect.centerX(), collect.centerY())
        return true
      } else {
        warnInfo(['尝试图片查找一键收按钮失败，请重新通过可视化配置配置一键收图片，尽量仅覆盖文字以提高识别准确性'])
      }
    } else {
      warnInfo(['一键收图片没有配置，无法加载'])
    }
  }

  /**
   * 尝试OCR识别一键收，识别成功后将现有文字区域截图 覆盖配置的一键收图片 image_config.one_key_collect
   * @returns 
   */
  this.oneKeyCollectByOcr = function () {
    let screen = _commonFunctions.checkCaptureScreenPermission()
    let ocrRegion = ((w, h) => [0.2 * w, 0.4 * h, 0.6 * w, 0.3 * h])(_config.device_width, _config.device_height)
    debugInfo(['尝试ocr识别一键收，识别区域：[{}]', JSON.stringify(ocrRegion)])
    WarningFloaty.addRectangle('OCR识别区域', ocrRegion)
    let ocrCheck = localOcrUtil.recognizeWithBounds(screen, ocrRegion, '一键收')
    if (ocrCheck && ocrCheck.length > 0) {
      let bounds = ocrCheck[0].bounds
      debugInfo(['识别结果：{}', JSON.stringify(bounds)])
      try {
        debugInfo(['{} {} {} {}', bounds.left, bounds.top, bounds.width(), bounds.height])
      } catch (e) {
        // pass
      }
      let region = [
        bounds.left, bounds.top,
        bounds.right - bounds.left, bounds.bottom - bounds.top
      ]
      debugInfo(['通过ocr找到了目标：{}', region])
      let subImage = images.clip(images.cvtColor(images.grayscale(screen), 'GRAY2BGRA'), region[0], region[1], region[2], region[3])
      _config.overwrite('image_config.one_key_collect', images.toBase64(subImage))
      WarningFloaty.addRectangle('一键收', region)
      clickOneKeyPoint(bounds.left + (bounds.right - bounds.left) * 0.5, bounds.top + (bounds.bottom - bounds.top) * 0.5)
      return true
    } else {
      warnInfo(['无法通过ocr找到一键收，可能当前有活动元素阻断'])
    }
    return false
  }

  /**
   * 如果开启了 二次校验 则直接在一键收位置点击两次避免二次识别失败
   * @param {*} x 
   * @param {*} y 
   */
  function clickOneKeyPoint(x, y) {
    automator.click(x, y)
    if (_config.double_check_collect) {
      // 启用了二次校验 直接双击
      sleep(50)
      automator.click(x, y)
    }
  }

  /**
   * 等待保护罩校验完成 并返回是否使用了保护罩
   */
  this.awaitForCollectable = function () {
    if (this.is_own) {
      return true
    }
    if (!this.is_own && _config.use_one_key_collect && _config.image_config.one_key_collect) {
      debugInfo('一键收模式下不等待保护罩校验')
      return true
    }
    if (!this.isProtectDetectDone) {
      this.protectDetectingLock.lock()
      try {
        // TODO 如果昨日在保护罩中，需要等待更久 避免列表过长未识别完成
        debugInfo(['等待能量保护罩检测结束：{}', this.protectDetectingCondition.await(600, TimeUnit.MILLISECONDS)])
      } catch (e) {
        warnInfo('等待保护罩校验完毕异常' + e)
      } finally {
        this.protectDetectingLock.unlock()
      }
    }
    return !this.isProtected
  }

  /**
   * 根据YOLO模型进行识别 收取能量球
   * @param {boolean} isOwn 是否收集自己
   * @param {function} findBallsCallback 测试用 回调找到的球列表
   * @param {function} findPointCallback 测试用 回调可点击的点
   * @param {function} findInvalidCallback 测试用 回调非可点击的点
   * @param {int} recheckLimit 识别次数
   */
  this.checkAndCollectByYolo = function (isOwn, findBallsCallback, findPointCallback, findInvalidCallback, recheckLimit) {
    this.is_own = isOwn || false
    this.collect_operated = false
    findBallsCallback = findBallsCallback || EMPTY_FUNC
    findPointCallback = findPointCallback || EMPTY_FUNC
    findInvalidCallback = findInvalidCallback || EMPTY_FUNC

    recheckLimit = recheckLimit || 3
    let repeat = false
    if (this.is_own) {
      // 收集自己，直接设置保护罩检测完毕
      this.isProtectDetectDone = true
    }
    let start = new Date().getTime()
    do {
      haveValidBalls = false
      this.recheck = false
      let screen = _commonFunctions.checkCaptureScreenPermission()
      if (screen) {
        let rgbImg = images.copy(screen, true)
        YoloTrainHelper.saveImage(screen, (isOwn ? '自身首页' : '好友首页') + '识别是否有可收集能量球')
        if (this.isProtected) {
          // 已判定为使用了保护罩
          return
        }
        let _start = new Date().getTime()
        let yoloCheckList = YoloDetection.forward(rgbImg, { confidence: _config.yolo_confidence || 0.85, filter: (result) => result.label == 'collect' || isOwn && (result.label == 'waterBall' || result.label == 'countdown' || result.label == 'cannot') })
        debugInfo(['本次yolo模型判断可收集能量球信息总耗时：{}ms 找到目标数：{}', new Date().getTime() - _start, yoloCheckList.length])
        let collectableList = yoloCheckList.filter(c => {
          if (c.label == 'collect' || isOwn && c.label == 'waterBall') {
            return true
          }
          // 转换成圆心坐标
          findInvalidCallback({
            x: c.x + c.width / 2,
            y: c.y + c.height / 2,
            radius: c.width / 2,
          })
          return false
        })
        if (this.is_own) {
          collectableList = this.filterCollectableList(collectableList)
        }
        if (collectableList.length > 0) {
          haveValidBalls = true
          if (!this.awaitForCollectable()) {
            return
          }
          collectableList.forEach(c => {
            WarningFloaty.addRectangle('collect:' + c.confidence.toFixed(2), [c.x, c.y, c.width, c.height])
            automator.click(c.x + c.width / 2, c.y + c.height / 2)
            self.collect_count++
            self.randomSleep()
            if (c.label == 'waterBall') {
              this.recheck = true
            }
          })
          self.collect_operated = true
        }
        rgbImg.recycle()
      }
      // 有浇水能量球且收自己时，进行二次校验 最多3次 || 非收取自己，且未找到可操作能量球，二次校验 仅一次 || 使用了双击卡，且点击过球
      repeat = this.recheck && this.is_own && --recheckLimit > 0
        || !this.is_own && !haveValidBalls && --recheckLimit >= 2
        || _config.double_check_collect && haveValidBalls && --recheckLimit > 0
      if (repeat) {
        debugInfo(['需要二次校验，等待{}ms', this.is_own ? 200 : 500])
        sleep(this.is_own ? 200 : 500)
      }
      WarningFloaty.clearAll()
    } while (repeat)
    debugInfo(['收集能量球总耗时：{}ms', new Date().getTime() - start])
  }

  /**
   * 过滤自身能量球 筛选能量球所在范围内的球
   *
   * @param {*} collectableList 
   * @returns 
   */
  this.filterCollectableList = function (collectableList) {
    return collectableList.filter(c => {
      // 过滤非能量球所在范围内的球
      let ball = {
        x: c.x + c.width / 2,
        y: c.y + c.height / 2,
        radius: c.width / 2,
      }
      let radius = ball.radius
      if (
        // 可能是左上角的活动图标 或者 识别到了其他范围的球
        ball.y < _config.tree_collect_top - (this.is_own ? cvt(80) : 0) || ball.y > _config.tree_collect_top + _config.tree_collect_height
        || ball.x < _config.tree_collect_left || ball.x > _config.tree_collect_left + _config.tree_collect_width
        // 取值范围就不正确的无效球，避免后续报错，理论上不会进来，除非配置有误
        || ball.x - radius <= radius || ball.x + radius >= _config.device_width - radius || ball.y - radius <= 0 || ball.y + 1.6 * radius >= _config.device_height) {
        debugInfo(['球：[{},{} r{}]不在能量球所在区域范围内', ball.x, ball.y, ball.radius])
        return false
      }
      return true
    })
  }

  /**
   * 根据图像识别 收取能量球
   * @param isOwn 是否收集自己，收自己时不判断帮收能量球
   * @param {function} findBallsCallback 测试用 回调找到的球列表
   * @param {function} findPointCallback 测试用 回调可点击的点
   * @param {function} findInvalidCallback 测试用 回调非可点击的点
   */
  this.checkAndCollectByHough = function (isOwn, findBallsCallback, findPointCallback, findInvalidCallback, recheckLimit) {
    findBallsCallback = findBallsCallback || EMPTY_FUNC
    findPointCallback = findPointCallback || EMPTY_FUNC
    findInvalidCallback = findInvalidCallback || EMPTY_FUNC
    recheckLimit = recheckLimit || 3
    this.is_own = isOwn || false
    if (this.is_own) {
      // 收集自己，直接设置保护罩检测完毕
      this.isProtectDetectDone = true
    }
    let start = new Date().getTime()
    let haveValidBalls = false, haveBalls = false
    this.collect_operated = false
    this.collect_count = 0
    this.ensureThreadPoolCreated()
    let repeat = false
    this.initHoughHelperIfNeeded()
    do {
      haveValidBalls = false
      haveBalls = false
      this.recheck = false
      let screen = _commonFunctions.checkCaptureScreenPermission()
      if (screen) {
        YoloTrainHelper.saveImage(screen, (isOwn ? '自身首页' : '好友首页') + '识别是否有可收集能量球')
        this.temp_img = images.copy(screen, true)
        let rgbImg = images.copy(screen, true)
        let grayImgInfo = images.grayscale(images.medianBlur(screen, 5))
        let findBalls = images.findCircles(
          grayImgInfo,
          {
            param1: _config.hough_param1 || 30,
            param2: _config.hough_param2 || 30,
            minRadius: _config.hough_min_radius || cvt(65),
            maxRadius: _config.hough_max_radius || cvt(75),
            minDst: _config.hough_min_dst || cvt(100)
          }
        )
        debugInfo(['找到的球:{}', JSON.stringify(findBalls)])
        haveBalls = findBalls && findBalls.length > 0
        if (this.isProtected) {
          // 已判定为使用了保护罩
          return
        }
        if (haveBalls) {
          findBallsCallback(findBalls)
          haveValidBalls = this.detectCollectableBalls(rgbImg, findBalls, findPointCallback, findInvalidCallback)
        }
        rgbImg.recycle()
      }
      // 有浇水能量球且收自己时，进行二次校验 最多3次 || 非收取自己，且未找到可操作能量球，二次校验 仅一次 || 使用了双击卡，且点击过球
      repeat = this.recheck && this.is_own && --recheckLimit > 0
        || !haveValidBalls && haveBalls && --recheckLimit >= 2
        || _config.double_check_collect && haveValidBalls && --recheckLimit > 0
      if (repeat) {
        debugInfo(['需要二次校验，等待{}ms', this.is_own ? 200 : 500])
        sleep(this.is_own ? 200 : 500)
      }
      WarningFloaty.clearAll()
    } while (repeat)
    debugInfo(['收集能量球总耗时：{}ms', new Date().getTime() - start])
  }


  this.detectCollectableBalls = function (rgbImg, findBalls, findPointCallback, findInvalidCallback) {
    let _start = new Date().getTime()
    let clickPoints = []
    let invalidPoints = []
    let countdownLatch = new CountDownLatch(findBalls.length)
    let lock = threads.lock()
    findBalls.forEach(ball => {
      this.threadPool.execute(function () {
        try {
          let collectableBall = self.doDetectCollectableBalls(rgbImg, ball)
          if (collectableBall) {
            lock.lock()
            if (_config.develop_saving_mode) {
              if (typeof formatDate === 'undefined')
                formatDate = require('../lib/DateUtil.js')
              collectableBall.createTime = formatDate(new Date())
              self.houghHelper.saveImage(collectableBall.ballImage, collectableBall)
            }
            collectableBall.ballImage = null
            if (!collectableBall.invalid) {
              clickPoints.push(collectableBall)
              WarningFloaty.addCircle(collectableBall.isWatering ? '好友浇水能量球' : '可收取', collectableBall.ball, '#00ff00')
            } else {
              WarningFloaty.addCircle('非有效能量球', collectableBall.ball, '#888888')
              invalidPoints.push(collectableBall)
              findInvalidCallback(collectableBall)
            }
            lock.unlock()
          }
        } catch (e) {
          errorInfo('baseScanner线程执行异常：' + e)
          _commonFunctions.printExceptionStack(e)
        } finally {
          countdownLatch.countDown()
        }
      })
    })
    debugInfo(['countdownLatch waiting count: {}', countdownLatch.getCount()])
    countdownLatch.await(_config.thread_pool_waiting_time || 5, TimeUnit.SECONDS)
    debugInfo(['判断可收集或帮助能量球信息总耗时：{}ms', new Date().getTime() - _start])
    if (!this.awaitForCollectable()) {
      return
    }
    let haveValidBalls = clickPoints && clickPoints.length > 0
    if (haveValidBalls) {
      this.operateCollect(clickPoints, findPointCallback)
    } else {
      debugInfo('未找到匹配的可收取或帮助的点')
      if (_config.develop_mode && !this.is_own) {
        debugForDev(['图片数据：[data:image/png;base64,{}]', images.toBase64(rgbImg)], false, true)
        debugForDev(['invalidBalls: [{}]', JSON.stringify(invalidPoints)])
      }
    }
    if (this.is_own && _config.save_yolo_train_data && this.recheck && rgbImg) {
      YoloTrainHelper.saveImage(rgbImg, '自身有可收取能量球')
    }
    if (!this.is_own && !haveValidBalls) {
      this.savingDevelopImageForNotFound()
    }
    return haveValidBalls
  }

  this.doDetectCollectableBalls = function (rgbImg, ball) {
    if (rgbImg.getMat().dims() >= 2) {
      /**
       * 能量球多维度采样，通过不同的数值来判断是否可收取、帮助、浇水球
       */
      let startForColorValue = new Date().getTime()
      let radius = parseInt(ball.radius)
      let ballArea = 3.14 * radius * radius
      let areaCount = ballArea
      if (
        // 可能是左上角的活动图标 或者 识别到了其他范围的球
        ball.y < _config.tree_collect_top - (this.is_own ? cvt(80) : 0) || ball.y > _config.tree_collect_top + _config.tree_collect_height
        || ball.x < _config.tree_collect_left || ball.x > _config.tree_collect_left + _config.tree_collect_width
        // 取值范围就不正确的无效球，避免后续报错，理论上不会进来，除非配置有误
        || ball.x - radius <= radius || ball.x + radius >= _config.device_width - radius || ball.y - radius <= 0 || ball.y + 1.6 * radius >= _config.device_height) {
        debugInfo(['球：[{},{} r{}]不在能量球所在区域范围内', ball.x, ball.y, ball.radius])
        return
      }
      let ballImage = images.clip(rgbImg, ball.x - radius, ball.y - radius, radius * 2, 2 * radius)
      // 用于判定是否可收取
      let intervalForCollectCheck = images.inRange(ballImage, _config.collectable_lower || '#9BDA00', _config.collectable_upper || '#E1FF2F')
      let avgForCollectable = OpenCvUtil.getHistAverage(intervalForCollectCheck)
      try {
        let start = new Date().getTime()
        areaCount = OpenCvUtil.getNoneZeroCount(intervalForCollectCheck)
        debugInfo(['cost: {}ms 亮色面积「{}」占比「{}%」avg: {}', new Date().getTime() - start, areaCount, (areaCount / ballArea * 100).toFixed(2), avgForCollectable])
      } catch (e) {
        warnInfo(['获取面积异常' + e])
      }
      // 用于判定是否浇水球
      let intervalForWaterCheck = images.inRange(ballImage, _config.water_lower || '#e8cb3a', _config.water_upper || '#ffed8e')
      // 判定是否为浇水球
      let avgHsv = OpenCvUtil.getHistAverage(intervalForWaterCheck)
      let collectableBall = {
        ball: ball, isOwn: this.is_own, avg: avgHsv,
        mainAvg: avgForCollectable,
        ballImage: ballImage
      }

      debugForDev(['取色耗时：{}ms', new Date().getTime() - startForColorValue])
      if (avgHsv >= COLLECTING_THRESHOLD) {
        // 浇水能量球
        collectableBall.isWatering = true
        this.recheck = this.is_own
      } else if (avgForCollectable < COLLECTING_THRESHOLD && areaCount / ballArea < 0.2) {
        // 非帮助或可收取, 大于25的则是可收取的，否则为无效球
        collectableBall.invalid = true
      }
      // 排除非可收取的和好友页面中的浇水球
      if (!this.is_own && collectableBall.isWatering) {
        collectableBall.invalid = true
      }
      return collectableBall
    } else {
      debugInfo(['mat dims is smaller then two, rgb: {}', rgbImg.getMat().dims()])
    }
    return null
  }

  this.operateCollect = function (clickPoints, findPointCallback) {
    let clickStart = new Date().getTime()
    debugInfo(['找到可收取和和帮助的点集合：{}', JSON.stringify(clickPoints)])
    if (findPointCallback === EMPTY_FUNC) {
      let shouldWaitForWatering = false
      clickPoints.sort(randomSort).forEach((point, idx) => {
        let b = point.ball
        if (
          // 收取自身的好友浇水球
          this.is_own && point.isWatering && !_config.skip_own_watering_ball
          // 非浇水直接收取
          || !point.isWatering) {
          self.collect_operated = true
          self.collect_count++
          automator.click(b.x + this.getRandomOffset(b), b.y + this.getRandomOffset(b))
          if (point.isWatering && !_config.skip_own_watering_ball) {
            debugInfo(['浇水球，双击一下 并等待1秒'])
            sleep(50)
            automator.click(b.x + this.getRandomOffset(b), b.y + this.getRandomOffset(b))
            shouldWaitForWatering = true
          }
          if (idx < clickPoints.length - 1) {
            this.randomSleep()
          }
        }
      })
      debugInfo(['点击能量球耗时：{}ms', new Date().getTime() - clickStart])
      if (shouldWaitForWatering) {
        debugInfo('有浇水球 等待动画1秒')
        sleep(1000)
      }
    } else {
      findPointCallback(clickPoints)
    }
  }

  this.getRandomOffset = function (b) {
    return Math.random() * b.radius / 2
  }

  this.randomSleep = function () {
    if (_config.fast_collect_mode || _config._double_click_card_used) {
      sleep(100)
      return
    }
    sleep(100 + Math.random() * (_config.random_sleep_time || 500))
  }

  // 判断并记录保护罩
  this.recordProtected = function (toast, name) {
    if (toast && toast.indexOf('能量罩') > 0) {
      this.recordCurrentProtected(name)
    }
  }

  this.recordCurrentProtected = function (name, timeout) {
    if (name) {
      _commonFunctions.addNameToProtect(name, timeout)
      return
    }
    name = this.getFriendName()
    if (name) {
      _commonFunctions.addNameToProtect(title, timeout)
    } else {
      errorInfo(['获取好友名称失败，无法加入保护罩列表'])
    }
  }

  this.getFriendName = function () {
    let titleContainer = _widgetUtils.widgetGetOne(_config.friend_name_getting_regex || '.*的蚂蚁森林', null, true)
    if (titleContainer) {
      toastLog('content: ' + titleContainer.content)
    } else {
      toastLog('未找到目标控件')
    }
    let regex = new RegExp(_config.friend_name_getting_regex || '(.*)的蚂蚁森林')
    if (titleContainer && regex.test(titleContainer.content)) {
      return regex.exec(titleContainer.content)[1]
    } else {
      errorInfo(['获取好友名称失败，请检查好友首页文本"{}"是否存在', _config.friend_name_getting_regex || '(.*)的蚂蚁森林'])
      return null
    }
  }

  // 检测能量罩
  this.protectDetect = function (filter, name) {
    filter = typeof filter == null ? '' : filter
    let that = this
    // 在新线程中开启监听
    return threads.start(function () {
      events.onToast(function (toast) {
        if (toast.getPackageName().indexOf(filter) >= 0) {
          that.recordProtected(toast.getText(), name)
        }
      })
    })
  }

  this.doIfProtected = function () {
    // do nothing
  }

  /**
   * 异步校验是否有保护罩使用信息
   * @param {string} name
   */
  this.protectInfoDetect = function (name) {
    let loadMoreButton = _widgetUtils.widgetGetOne(_config.friend_load_more_content || '展开好友动态', 1000)
    if (!this.is_own && _config.use_one_key_collect && _config.image_config.one_key_collect) {
      debugInfo('一键收模式下不进行保护罩校验')
      return
    }
    this.isProtectDetectDone = false
    this.isProtected = false

    if (loadMoreButton) {
      let limit = 3
      while (loadMoreButton && --limit > 0) {
        debugInfo(['点击展开好友动态：[{},{}]', loadMoreButton.bounds().centerX(), loadMoreButton.bounds().centerY()])
        // automator.clickCenter(loadMoreButton)
        loadMoreButton.click()
        sleep(100)
        loadMoreButton = _widgetUtils.widgetGetOne(_config.friend_load_more_content || '展开好友动态', 400)
      }
      if (loadMoreButton) {
        warnInfo(['点击展开好友失败 {}', loadMoreButton.bounds()])
      }
    } else {
      debugInfo(['未找到加载更多按钮:「{}」', _config.friend_load_more_content || '展开好友动态'])
      return false
    }
    this.threadPool.execute(function () {
      try {
        self.isProtected = self._protectInfoDetect(name)
        self.isProtectDetectDone = true
        self.protectDetectingLock.lock()
        self.protectDetectingCondition.signal()
        if (self.isProtected) {
          warnInfo(['{} 好友已使用能量保护罩，跳过收取', name])
          self.doIfProtected({ name: name })
        }
      } catch (e) {
        warnInfo('保护罩校验异常' + e)
      } finally {
        self.protectDetectingLock.unlock()
      }
    })
  }

  this._protectInfoDetect = function (name) {
    let usingInfo = _widgetUtils.widgetGetOne(_config.using_protect_content, 500, true, true, null, { algorithm: 'PDFS' })
    if (usingInfo !== null) {
      let target = usingInfo.target
      let usingTime = null
      debugInfo(['found using protect info, bounds:{}', target.bounds()], true)
      let parent = target.parent().parent()
      let targetRow = parent.row()
      let time = parent.child(2).text()
      if (!time) {
        time = parent.child(2).desc()
      }
      let isToday = true
      let yesterday = _widgetUtils.widgetGetOne('昨天|Yesterday', 1000, true, true, null, { algorithm: 'PDFS' })
      let yesterdayRow = null
      if (yesterday !== null) {
        yesterdayRow = yesterday.target.row()
        // warnInfo(yesterday.target.indexInParent(), true)
        isToday = yesterdayRow > targetRow
      }
      if (!isToday) {
        // 获取前天的日期
        let dateBeforeYesterday = formatDate(new Date(new Date().getTime() - 3600 * 24 * 1000 * 2), 'MM-dd')
        let dayBeforeYesterday = _widgetUtils.widgetGetOne(dateBeforeYesterday, 200, true, true, null, { algorithm: 'PDFS' })
        if (dayBeforeYesterday !== null) {
          let dayBeforeYesterdayRow = dayBeforeYesterday.target.row()
          if (dayBeforeYesterdayRow < targetRow) {
            debugInfo('能量罩使用时间已超时，前天之前的数据')
            return false
          } else {
            debugInfo(['前天row:{}', dayBeforeYesterdayRow])
          }
        }
      }
      let timeRe = /(\d{2}:\d{2})/
      let match = timeRe.exec(time)
      if (match) {
        usingTime = match[1]
        let compare = new Date('1999/01/01 ' + usingTime)
        let usingFlag = compare.getHours() * 60 + compare.getMinutes()
        let now = new Date().getHours() * 60 + new Date().getMinutes()
        if (!isToday && usingFlag < now) {
          // 非今天使用，且使用时间点早于当前时间点
          return false
        }
      } else {
        warnInfo(['未能正确获取保护罩使用时间的文本信息：{}', time])
      }
      debugInfo(['using time:{}-{} rows: yesterday[{}] target[{}]', (isToday ? '今天' : '昨天'), usingTime || time, yesterdayRow, targetRow], true)
      let timeout = isToday ? new Date(formatDate(new Date(new Date().getTime() + 24 * 3600000), 'yyyy/MM/dd ') + usingTime).getTime()
        : new Date(formatDate(new Date(), 'yyyy/MM/dd ') + usingTime).getTime()
      this.recordCurrentProtected(name, timeout)
      return true
    } else {
      debugInfo('not found using protect info')
    }
    return false
  }

  this.savingDevelopImageForNotFound = function () {
    if (_config.save_yolo_train_data && this.temp_img) {
      YoloTrainHelper.saveImage(this.temp_img, '好友界面未找到可收取能量球')
    }
    if (this.temp_img) {
      this.temp_img.recycle()
      this.temp_img = null
    }
  }

  this.returnToListAndCheck = function () {
    automator.back()
    sleep(500)
    let returnCount = 0
    while (!_widgetUtils.friendListWaiting()) {
      if (returnCount++ === 2) {
        // 等待两秒后再次触发
        automator.back()
      }
      if (returnCount > 5) {
        errorInfo('返回好友排行榜失败，重新开始')
        return false
      }
    }
  }

  /**
   * 等待能量值控件数据刷新 超时时间1秒
   * 
   * @param {number} oldCollected 
   */
  this.waitEnergyChangedIfCollected = function (oldCollected) {
    let postCollected = oldCollected
    if (this.collect_operated) {
      debugInfo(['等待能量值数据刷新，原始值collect:{}', oldCollected])
      let sleepTime = 1000
      if (this.collect_count > 1) {
        // 多个能量球，多等待五百毫秒
        sleep(500)
        sleepTime = 500
      }
      // 最多等一秒
      let timeout = new Date().getTime() + sleepTime
      let timeoutFlag = false
      while (postCollected === oldCollected) {
        if (new Date().getTime() > timeout) {
          debugInfo('等待能量数据更新超时')
          timeoutFlag = true
          break
        }
        sleep(50)
        postCollected = _widgetUtils.getYouCollectEnergy() || 0
      }
      if (!timeoutFlag) {
        debugInfo([
          '能量值数据刷新，新值collect:{} 总耗时：{}ms',
          this.checkAndDisplayIncreased(postCollected, oldCollected),
          new Date().getTime() - timeout + sleepTime
        ])
      }
    }
    return { postCollected: postCollected }
  }

  this.checkAndDisplayIncreased = function (newVal, oldVal) {
    if (newVal === oldVal) {
      return newVal
    }
    let compare = newVal - oldVal
    return newVal + '(' + (compare > 0 ? '+' + compare : compare) + ')'
  }

  this.doCollectTargetFriend = function (obj, toastListenThread) {
    debugInfo(['准备开始收取好友：「{}」', obj.name])
    this.target = obj.name
    let regetFriendName = this.getFriendName()
    if (regetFriendName != obj.name) {
      if (regetFriendName == false) {
        warnInfo(['当前非好友首页 估计已经结束'])
        return false
      }
      warnInfo(['重新通过控件获取好友名称为：{} 和旧值「{}」不符，重置好友名称', regetFriendName, obj.name])
      obj.name = regetFriendName
    }
    if (this.group_execute_mode) {
      warnInfo('组队模式 不再获取好友能量信息')
      this.collectEnergy()
      return this.backToListIfNeeded(false, obj)
    }
    let preGot, postGet, rentery = false
    try {
      preGot = _widgetUtils.getYouCollectEnergy() || 0
    } catch (e) {
      errorInfo("[" + obj.name + "]获取收集前能量异常" + e)
      _commonFunctions.printExceptionStack(e)
    }
    toastListenThread = toastListenThread || this.protectDetect(_package_name, obj.name)
    let screen = null
    if (_config.save_yolo_train_data) {
      screen = images.copy(_commonFunctions.checkCaptureScreenPermission(), true)
    }
    this.collectEnergy()
    if (this.isProtected) {
      debugInfo(['异步判定已使用了保护罩，跳过后续操作 name: {}', obj.name])
      return this.backToListIfNeeded(false, obj, toastListenThread)
    }
    try {
      // 等待控件数据刷新
      let { postCollected } = this.waitEnergyChangedIfCollected(preGot)
      postGet = postCollected
    } catch (e) {
      errorInfo("[" + obj.name + "]获取收取后能量异常" + e)
      _commonFunctions.printExceptionStack(e)
    }
    let collectedEnergy = postGet - preGot
    debugInfo(['执行前，收集数据：{}; 执行后，收集数据：{}', preGot, postGet])
    if (!this.collect_operated) {
      this.failed_count = (this.failed_count || 0) + 1
      debugInfo(['未收集能量，失败次数+1 [{}]', this.failed_count])
      if (_config.use_one_key_collect && !this.one_key_had_success && this.failed_count >= 3) {
        warnInfo(['一键收从未成功且收取失败次数过多，临时关闭一键收'])
        _config.use_one_key_collect = false
      }
    }
    if (this.collect_operated && collectedEnergy === 0 && !obj.recheck) {
      // 没有收集到能量，可能有保护罩，等待1.5秒
      warnInfo(['未收集到能量，可能当前能量值未刷新或者好友使用了保护罩，等待1.5秒'], true)
      sleep(1500)
      try {
        // 1.5秒后重新获取能量值
        postGet = _widgetUtils.getYouCollectEnergy() || 0
        collectedEnergy = postGet - preGot
      } catch (e) {
        errorInfo("[" + obj.name + "]二次获取收取后能量异常" + e)
        _commonFunctions.printExceptionStack(e)
      }
    }
    if (collectedEnergy > 0) {
      let gotEnergyAfterWater = collectedEnergy
      let friendEnergy = _widgetUtils.getFriendCurrentEnergy()
      this.collect_any = true
      let needWaterback = _commonFunctions.recordFriendCollectInfo({
        hasSummaryWidget: _config.has_summary_widget,
        friendName: obj.name,
        friendEnergy: friendEnergy,
        postCollect: postGet,
        preCollect: preGot,
        helpCollect: 0
      })
      try {
        if (needWaterback) {
          if (!_widgetUtils.wateringFriends()) {
            warnInfo(['给好友{}浇水失败，可能界面卡死，取消浇水', obj.name])
            let widgetChecking = _widgetUtils.widgetGetOne('请选择为TA浇水的克数', 1000)
            if (widgetChecking) {
              let p = {
                x: widgetChecking.bounds().left,
                y: widgetChecking.bounds().top
              }
              debugInfo(['点击位置「{}, {}」关闭浇水菜单', p.x, p.y])
              automator.click(p.x, p.y / 2)
              sleep(500)
            }
            needWaterback = false
          }
          gotEnergyAfterWater -= (_config.targetWateringAmount || 0)
        }
      } catch (e) {
        errorInfo('收取[' + obj.name + ']' + collectedEnergy + 'g 大于阈值:' + _config.wateringThreshold + ' 回馈浇水失败 ' + e)
        _commonFunctions.printExceptionStack(e)
      }
      logInfo([
        "收取好友:{} 能量 {}g {}",
        obj.name, gotEnergyAfterWater, (needWaterback ? '浇水' + (_config.targetWateringAmount || 0) + 'g' : '')
      ])
      AntForestDao.saveFriendCollect(obj.name, friendEnergy, gotEnergyAfterWater, needWaterback ? _config.targetWateringAmount : null)
      this.showCollectSummaryFloaty(gotEnergyAfterWater)
      if (_config.save_yolo_train_data && screen) {
        YoloTrainHelper.saveImage(screen, '好友界面有可收取能量球')
      }
    } else {
      warnInfo(['未收取能量，可能有森林赠礼，延迟等待动画'], true)
      sleep(1500)
      YoloTrainHelper.saveImage(_commonFunctions.captureScreen(), '未能收取能量', 'friend_no_energy', _config.save_no_energy_train_data)
      this.nocollect_count++
      if (!this.collect_any && this.nocollect_count >= 3) {
        warnInfo(['如果你首次使用，且无法收取能量，请检查并关闭MIUI电诈防护功能，具体见可视化配置中常见问题，不要再单独来问，谢谢'], true)
      }
    }
    // 校验是否有森林赠礼
    if (!this.collect_any && this.checkForPlantReward()) {
      infoLog(['好友「{}」有森林赠礼，已领取', obj.name])
    }
    screen && screen.recycle()
    events.removeAllListeners('toast')
    return this.backToListIfNeeded(rentery, obj)
  }

  this.backToListIfNeeded = function (rentery, obj, toastListenThread) {
    if (toastListenThread) {
      events.removeAllListeners('toast')
    }
    if (rentery) {
      debugInfo('好友能量收取完毕, 有帮助收取 重新校验是否有新能量球')
      sleep(500)
      obj.recheck = true
      return this.doCollectTargetFriend(obj)
    }
    debugInfo('好友能量收取完毕, 回到好友排行榜')
    if (false === this.returnToListAndCheck()) {
      return false
    }
    return true
  }

  this.recordLost = function (reason) {
    this.lost_someone = true
    this.lost_reason = reason
  }

  this.getCollectResult = function () {
    return {
      minCountdown: this.min_countdown,
      lostSomeone: this.lost_someone,
      lostReason: this.lost_reason,
      collectAny: this.collect_any
    }
  }

  /**
   * 校验是否有种树奖励
   * 
   * @returns 
   */
  this.checkForPlantReward = function () {
    let screen = _commonFunctions.checkCaptureScreenPermission()
    if (!screen) {
      warnInfo(['获取截图失败，无法判断是否存在森林赠礼'])
      return
    }
    YoloTrainHelper.saveImage(screen, '校验是否有种树奖励')
    let clicked = false
    if (YoloDetection.enabled) {
      let result = YoloDetection.forward(screen, { confidence: 0.75, filter: (result) => result.label == 'gift' })
      if (result && result.length > 0) {
        result = result[0]
        automator.click(result.centerX, result.centerY)
        clicked = true
      }
    } else if (_config.image_config.reward_for_plant) {
      let collect = OpenCvUtil.findByImageSimple(images.cvtColor(images.grayscale(screen), 'GRAY2BGRA'), images.fromBase64(_config.image_config.reward_for_plant))
      if (collect) {
        debugInfo('截图找到了目标, 获取森林赠礼')
        automator.click(collect.centerX(), collect.centerY())
        clicked = true
      }
    } else {
      warnInfo(['无法正确判断是否存在森林赠礼种树奖励,请确认配置赠礼图片或者开启Yolo模型识别'])
    }
    if (clicked) {
      let gotItBtn = _widgetUtils.widgetGetOne('知道了', 1000)
      if (gotItBtn) {
        debugInfo('大礼盒需要点击知道了')
        automator.clickCenter(gotItBtn)
        sleep(300)
      }
      return true
    }
    return false
  }
}
module.exports = BaseScanner

// inner function
function randomSort (_, b) {
  return Math.random() > Math.random() ? 1 : -1
}