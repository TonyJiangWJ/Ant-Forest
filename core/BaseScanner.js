/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-18 14:17:09
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-13 00:16:07
 * @Description: 能量收集和扫描基类，负责通用方法和执行能量球收集
 */
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
let { config: _config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')
let FileUtils = singletonRequire('FileUtils')
let customMultiTouch = files.exists(FileUtils.getCurrentWorkPath() + '/extends/MultiTouchCollect.js') ? require('../extends/MultiTouchCollect.js') : null
let { debugInfo, logInfo, errorInfo, warnInfo, infoLog, debugForDev, developSaving } = singletonRequire('LogUtils')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let ENGINE_ID = engines.myEngine().id
let _package_name = 'com.eg.android.AlipayGphone'

const BaseScanner = function () {

  let SCALE_RATE = _config.device_width / 1080
  let cvt = (v) => parseInt(v * SCALE_RATE)
  let detectRegion = [
    _config.tree_collect_left, _config.tree_collect_top,
    _config.tree_collect_width, _config.tree_collect_height
  ]
  let GAP = parseInt(detectRegion[2] / 6)
  let multiCheckPoints = []
  for (let x = -parseInt(25 * SCALE_RATE); x <= parseInt(25 * SCALE_RATE); x += 2) {
    multiCheckPoints.push([x, 0, '#ffffff'])
  }
  this.temp_img = null
  this.found_balls = []
  this.collect_operated = false
  this.increased_energy = 0
  this.current_time = 0
  this.collect_any = false
  this.min_countdown = 10000
  this.lost_reason = ''
  this.lost_someone = false
  this.threadPool = null
  this.isProtected = false
  this.isProtectDetectDone = false
  this.protectDetectingLock = threads.lock()
  this.protectDetectingCondition = this.protectDetectingLock.newCondition()
  this.lifecycleCallbackId = null

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
    let self = this
    // 注册生命周期结束后关闭线程池，防止脚本意外中断时未调用destroy导致线程池一直运行
    this.lifecycleCallbackId = _commonFunctions.registerOnEngineRemoved(function () {
      self.baseDestory()
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

  this.baseDestory = function () {
    if (this.threadPool !== null) {
      this.threadPool.shutdown()
      debugInfo(['等待scanner线程池关闭, 结果: {}', this.threadPool.awaitTermination(5, TimeUnit.SECONDS)])
      if (this.lifecycleCallbackId) {
        _commonFunctions.unregisterLifecycleCallback(this.lifecycleCallbackId)
        this.lifecycleCallbackId = null
      }
      this.threadPool = null
    }
  }

  this.destory = function () {
    this.baseDestory()
  }

  /**
   * 展示当前累积收集能量信息，累加已记录的和当前运行轮次所增加的
   * 
   * @param {本次增加的能量值} increased
   */
  this.showCollectSummaryFloaty = function (increased) {
    increased = increased || 0
    this.increased_energy += increased
    if (_config.is_cycle) {
      _commonFunctions.showCollectSummaryFloaty0(this.increased_energy, this.current_time, increased)
    } else {
      _commonFunctions.showCollectSummaryFloaty0(null, null, this.increased_energy)
    }
  }

  /**
   * 收集目标能量球能量
   * 
   * @param {*} energy_ball 能量球对象
   * @param {boolean} isDesc 是否是desc类型
   */
  this.collectBallEnergy = function (energy_ball, isDesc) {
    if (_config.skip_five && !isOwn) {
      let regexCheck = /(\d+)/
      let execResult
      if (isDesc) {
        debugInfo('获取能量球desc数据')
        execResult = regexCheck.exec(energy_ball.desc())
      } else {
        debugInfo('获取能量球text数据')
        execResult = regexCheck.exec(energy_ball.text())
      }
      if (execResult.length > 1 && parseInt(execResult[1]) <= 5) {
        debugInfo(
          '能量小于等于五克跳过收取 ' + isDesc ? energy_ball.desc() : energy_ball.text()
        )
        return
      }
    }
    debugInfo(isDesc ? energy_ball.desc() : energy_ball.text())
    automator.clickCenter(energy_ball)
    sleep(300)
    return true
  }

  // 收取能量
  this.collectEnergy = function (isHelp) {
    if (_config.direct_use_img_collect_and_help) {
      this.checkAndCollectByHough()
    } else {
      this.checkAndCollectByWidget()
    }
  }

  this.checkAndCollectByWidget = function (isSecond) {
    let ballCheckContainer = _widgetUtils.widgetGetAll(_config.collectable_energy_ball_content, isHelp ? 200 : 500, true)
    if (ballCheckContainer !== null) {
      debugInfo(['可收取能量球个数：「{}」', ballCheckContainer.target.length])
      if (_config.cutAndSaveTreeCollect) {
        // 保存图像数据 方便后续开发
        let screen = _commonFunctions.checkCaptureScreenPermission()
        if (screen) {
          let saveDir = FileUtils.getCurrentWorkPath() + "/resources/tree_collect/"
          files.ensureDir(saveDir)
          images.save(screen, _commonFunctions.formatString('{}can_collect_ball_{}_{}.png',
            saveDir,
            ballCheckContainer.target.length,
            (100 + (1000 * Math.random()) % 899).toFixed(0))
          )
        }
      }
      if (!this.awaitForCollectable()) {
        return
      }
      let that = this
      let haveCollected = false
      ballCheckContainer.target
        .forEach(function (energy_ball) {
          if (that.collectBallEnergy(energy_ball, ballCheckContainer.isDesc)) {
            haveCollected = true
          }
        })
      if (!isSecond && haveCollected && _config.use_dubble_click_card) {
        sleep(200)
        this.checkAndCollectByWidget(true)
      }
    } else {
      debugInfo('控件判断无能量球可收取')
      // 尝试全局点击
      if (_config.try_collect_by_multi_touch) {
        if (!this.awaitForCollectable()) {
          return
        }
        this.multiTouchToCollect()
      } else {
        // 尝试通过图像识别收取
        this.checkAndCollectByHough()
      }
    }
  }

  /**
   * 等待保护罩校验完成 并返回是否使用了保护罩
   */
  this.awaitForCollectable = function () {
    if (!this.isProtectDetectDone) {
      try {
        this.protectDetectingLock.lock()
        debugInfo(['等待能量保护罩检测结束：{}', this.protectDetectingCondition.await(600, TimeUnit.MILLISECONDS)])
      } catch (e) {
        warnInfo('等待保护罩校验完毕异常' + e)
      } finally {
        this.protectDetectingLock.unlock()
      }
    }
    return !this.isProtected
  }

  this.defaultMultiTouch = function () {
    let y = 700
    // 模拟一个梯形点击区域
    for (let x = 200; x <= 900; x += 100) {
      let px = x
      let py = x < 550 ? y - (0.5 * x - 150) : y - (-0.5 * x + 400)
      automator.click(parseInt(px * SCALE_RATE), parseInt(py * SCALE_RATE))
      sleep(15)
    }
  }

  this.multiTouchToCollect = function () {
    if (customMultiTouch) {
      debugInfo('使用自定义扩展的区域点击')
      customMultiTouch()
    } else {
      debugInfo('使用默认的区域点击')
      this.defaultMultiTouch()
    }
  }

  /**
   * 根据图像识别 帮助收取或者收取能量球
   * @param isOwn 是否收集自己，收自己时不判断帮收能量球
   * @param {function} findBallsCallback 测试用 回调找到的球列表
   * @param {function} findPointCallback 测试用 回调可点击的点
   * @param {function} findInvalidCallback 测试用 回调非可点击的点
   */
  this.checkAndCollectByHough = function (isOwn, findBallsCallback, findPointCallback, findInvalidCallback, recheckLimit) {
    findBallsCallback = findBallsCallback || function () { }
    findPointCallback = findPointCallback || function () { }
    findInvalidCallback = findInvalidCallback || function () { }
    recheckLimit = recheckLimit || 3
    isOwn = isOwn || false
    if (isOwn) {
      // 收集自己，直接设置保护罩检测完毕
      this.isProtectDetectDone = true
    }
    let start = new Date().getTime()
    let recheck = false
    let lock = threads.lock()
    let haveValidBalls = false, haveBalls = false
    let self = this
    this.collect_operated = false
    this.ensureThreadPoolCreated()
    let repeat = false
    do {
      haveValidBalls = false
      haveBalls = false
      recheck = false
      let screen = _commonFunctions.checkCaptureScreenPermission()
      if (screen) {
        let _start = new Date().getTime()
        this.temp_img = images.copy(screen, true)
        let rgbImg = images.copy(screen, true)
        screen = images.medianBlur(screen, 5)
        let grayImgInfo = images.grayscale(screen)
        let findBalls = images.findCircles(
          grayImgInfo,
          {
            param1: 100,
            param2: 30,
            minRadius: cvt(65),
            maxRadius: cvt(75),
            minDst: cvt(100),
            // region: detectRegion
          }
        )
        debugInfo(['找到的球:{}', JSON.stringify(findBalls)])
        this.found_balls = findBalls
        if (this.isProtected) {
          // 已判定为使用了保护罩
          return
        }
        if (findBalls && findBalls.length > 0) {
          let dayOrNightImg = images.clip(rgbImg, config.tree_collect_left, config.tree_collect_top, 40, 40)
          let result = OpenCvUtil.getMedian(dayOrNightImg)
          let isNight = result < 100
          findBallsCallback(findBalls)
          let clickPoints = []
          let invalidPoints = []
          let countdownLatch = new CountDownLatch(findBalls.length)
          findBalls.forEach(b => {
            this.threadPool.execute(function () {
              try {
                if (rgbImg.getMat().dims() >= 2) {
                  let startForColorValue = new Date().getTime()
                  let clipImg = images.clip(rgbImg, b.x - cvt(30), b.y + cvt(35), cvt(60), cvt(20))
                  let avgHsv = OpenCvUtil.getHistAverage(clipImg)
                  let median = OpenCvUtil.getMedian(clipImg)
                  clipImg = images.clip(rgbImg, b.x - cvt(40), b.y + cvt(80), cvt(80), cvt(20))
                  let clipGrayImg = images.clip(grayImgInfo, b.x - cvt(40), b.y + cvt(80), cvt(80), cvt(20))
                  let medianBottom = OpenCvUtil.getMedian(clipImg)
                  let stdDeviation = OpenCvUtil.getStandardDeviation(clipGrayImg)
                  let collectableBall = { ball: b, isHelp: false, medianBottom: medianBottom, avg: avgHsv, median: median, std: stdDeviation, isNight: isNight }
                  let medianBottomMin = isNight ? 80 : 180
                  debugForDev(['取色耗时：{}ms', new Date().getTime() - startForColorValue])
                  if (median >= 235 && avgHsv >= 235) {
                    // 浇水能量球
                    collectableBall.isWatering = true
                    recheck = isOwn
                  } else if (!isOwn && medianBottom > medianBottomMin) {
                    // 判定为帮收
                    collectableBall.isHelp = true
                  } else if (!isOwn && stdDeviation <= 30 || isOwn && Math.abs(212 - median) <= 3 && avgHsv > 200) {
                    // 判定为可收取
                    // collectableBall = collectableBall
                  } else {
                    // 非帮助或可收取
                    collectableBall.invalid = true
                  }
                  lock.lock()
                  if (!collectableBall.invalid) {
                    clickPoints.push(collectableBall)
                  } else {
                    invalidPoints.push(collectableBall)
                    findInvalidCallback(collectableBall)
                  }
                  lock.unlock()
                } else {
                  debugInfo(['mat dims is smaller then two, rgb: {}', rgbImg.getMat().dims()])
                }
              } catch (e) {
                errorInfo('线程执行异常：' + e)
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
          if (clickPoints && clickPoints.length > 0) {
            let clickStart = new Date().getTime()
            debugInfo(['找到可收取和和帮助的点集合：{}', JSON.stringify(clickPoints)])
            clickPoints.forEach((point, idx) => {
              let b = point.ball
              if (b.y < _config.tree_collect_top - (isOwn ? cvt(80) : 0) || b.y > _config.tree_collect_top + _config.tree_collect_height) {
                // 可能是左上角的活动图标 或者 识别到了其他范围的球
                return
              }
              haveValidBalls = true
              findPointCallback(point)
              if (isOwn && point.isWatering && !_config.skip_own_watering || _config.help_friend && point.isHelp || !point.isHelp) {
                self.collect_operated = true
                automator.click(b.x, b.y)
                if (idx < clickPoints.length - 1) {
                  sleep(100)
                }
              }
            })
            debugInfo(['点击能量球耗时：{}ms', new Date().getTime() - clickStart])
          } else {
            debugInfo('未找到匹配的可收取或帮助的点')
            if (_config.develop_mode && !isOwn) {
              debugForDev(['图片数据：[data:image/png;base64,{}]', images.toBase64(rgbImg)], false, true)
              debugForDev(['invalidBalls: [{}]', JSON.stringify(invalidPoints)])
            }
          }
          if (isOwn && _config.cutAndSaveTreeCollect && recheck && rgbImg) {
            let savePath = FileUtils.getCurrentWorkPath() + '/resources/tree_collect/'
              + 'collect_own_' + (Math.random() * 899 + 100).toFixed(0) + '.png'
            files.ensureDir(savePath)
            images.save(rgbImg, savePath)
            debugForDev(['保存自身能量球图片：「{}」', savePath])
          }
          if (!isOwn && !haveValidBalls) {
            this.savingDevelopImageForNotFound()
          }
        }
        rgbImg.recycle()
      }
      // 有浇水能量球且收自己时，进行二次校验 最多3次 || 非收取自己，且未找到可操作能量球，二次校验 仅一次
      repeat = recheck && isOwn && --recheckLimit > 0 || !haveValidBalls && haveBalls && --recheckLimit >= 2 || _config.use_double_click_card && haveValidBalls
      if (repeat) {
        debugInfo(['需要二次校验，等待{}ms', isOwn ? 200 : 500])
        sleep(isOwn ? 200 : 500)
      }
    } while (repeat)
    debugInfo(['收集能量球总耗时：{}ms', new Date().getTime() - start])
  }

  // 收取能量同时帮好友收取
  this.collectAndHelp = function (needHelp) {
    // 收取好友能量
    this.collectEnergy(needHelp)
    if (_config.direct_use_img_collect_and_help) {
      if (needHelp) {
        // 因为无法判断剩余多少个能量球，当需要帮助之后返回true 重新进入，下次调用时传递needHelp为false即可
        return true
      } else {
        return
      }
    }
    if (this.isProtected) {
      return
    }
    if (_config.try_collect_by_multi_touch) {
      // 多点点击方式直接就帮助了 不再执行后续操作 后续判断是否有帮助来确定是否需要重进
      return
    }
    this.checkAndHelpByWidget()
  }

  this.checkAndHelpByWidget = function () {
    let screen = _commonFunctions.checkCaptureScreenPermission()
    if (!screen) {
      warnInfo('获取截图失败，无法帮助收取能量')
      return
    }
    // 帮助好友收取能量
    let energyBalls
    if (
      className('Button').descMatches(/\s/).exists()
    ) {
      energyBalls = className('Button').descMatches(/\s/).untilFind()
    } else if (
      className('Button').textMatches(/\s/).exists()
    ) {
      energyBalls = className('Button').textMatches(/\s/).untilFind()
    }
    if (energyBalls && energyBalls.length > 0) {
      let length = energyBalls.length
      let helped = false
      let colors = _config.helpBallColors || ['#f99236', '#f7af70']
      let that = this
      energyBalls.forEach(function (energy_ball) {
        let bounds = energy_ball.bounds()
        let text = energy_ball.text() || ''
        let desc = energy_ball.desc() || ''
        if (!(/^\s*$/.test(text) && /^\s*$/.test(desc))) {
          return
        }
        let o_x = bounds.left,
          o_y = bounds.top,
          o_w = bounds.width() + 5,
          o_center_h = parseInt(bounds.height() * 1.5 / 2)
        threshold = _config.color_offset

        let ball = images.clip(screen, o_x + parseInt(o_w * 0.2), o_y + parseInt(o_center_h / 2), parseInt(o_w * 0.6), parseInt(o_center_h / 2))
        let interval_ball = images.interval(ball, "#61a075", 50)
        for (let color of colors) {
          if (
            // 下半部分颜色匹配
            images.findColor(screen, color, {
              region: [o_x, o_y + o_center_h, o_w, o_center_h],
              threshold: threshold
            })
            // 二值化后图片中会有白色部分是可帮助收取的
            && images.findColor(interval_ball, '#FFFFFF')
          ) {
            automator.clickCenter(energy_ball)
            helped = true
            that.collect_any = true
            sleep(200)
            debugInfo("找到帮收取能量球颜色匹配" + color)
            break
          }
        }
      })
      if (!helped && needHelp) {
        warnInfo(['未能找到帮收能量球需要增加匹配颜色组 当前{}', colors])
      }
      // 当数量大于等于6且帮助收取后，重新进入
      if (helped && needHelp && length >= 6) {
        debugInfo('帮助了 且有六个球 重新进入')
        return true
      } else {
        debugInfo(['帮助了 但是只有{}个球 不重新进入', length])
      }
    }
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
    let self = this
    this.isProtectDetectDone = false
    this.isProtected = false
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
    let usingInfo = _widgetUtils.widgetGetOne(_config.using_protect_content, 500, true, true)
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
      let yesterday = _widgetUtils.widgetGetOne('昨天|Yesterday', 1000, true, true)
      let yesterdayRow = null
      if (yesterday !== null) {
        yesterdayRow = yesterday.target.row()
        // warnInfo(yesterday.target.indexInParent(), true)
        isToday = yesterdayRow > targetRow
      }
      if (!isToday) {
        // 获取前天的日期
        let dateBeforeYesterday = formatDate(new Date(new Date().getTime() - 3600 * 24 * 1000 * 2), 'MM-dd')
        let dayBeforeYesterday = _widgetUtils.widgetGetOne(dateBeforeYesterday, 200, true, true)
        if (dayBeforeYesterday !== null) {
          let dayBeforeYesterdayRow = dayBeforeYesterday.target.row()
          if (dayBeforeYesterdayRow < targetRow) {
            debugInfo('能量罩使用时间已超时，前天之前的数据')
            return false
          } else {
            debugInfo(['前天row:{}', dayBeforeYesterdayRow])
          }
        }
        let timeRe = /(\d{2}:\d{2})/
        let match = timeRe.exec(time)
        if (match) {
          usingTime = match[1]
          let compare = new Date('1999/01/01 ' + usingTime)
          let usingFlag = compare.getHours() * 60 + compare.getMinutes()
          let now = new Date().getHours() * 60 + new Date().getMinutes()
          if (usingFlag < now) {
            return false
          }
        }
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
    if (_config.cutAndSaveTreeCollect && this.temp_img) {
      try {
        let savePath = FileUtils.getCurrentWorkPath() + '/resources/tree_collect_not_found/'
          + 'unknow_not_found_' + (Math.random() * 9999 + 100).toFixed(0) + '.png'
        files.ensureDir(savePath)
        images.save(this.temp_img, savePath)
        debugForDev(['保存未识别能量球图片：「{}」', savePath])
      } catch (e) {
        errorInfo('保存未识别能量球图片异常' + e)
      }
    }
    if (_config.develop_saving_mode && this.temp_img && this.found_balls && this.found_balls.length > 0) {
      try {
        this.found_balls.forEach(ball => {
          ball.x = parseInt(ball.x)
          ball.y = parseInt(ball.y)
          developSaving(['cannot match, point: [{},{}] color: {}', ball.x, ball.y, colors.toString(this.temp_img.getBitmap().getPixel(ball.x, ball.y))], 'cannot_match')
        })
      } catch (e) {
        debugInfo('保存不可识别球数据异常 ' + e)
      }
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
   * @param {number} oldFriendEnergy 
   */
  this.waitEnergyChangedIfCollected = function (oldCollected, oldFriendEnergy) {
    let postCollected = oldCollected, postEnergy = oldFriendEnergy
    if (this.collect_operated) {
      debugInfo(['等待能量值数据刷新，原始值collect:{} energy:{}', oldCollected, oldFriendEnergy])
      // 最多等一秒
      let timeout = new Date().getTime() + 1000
      let timeoutFlag = false
      while (postCollected === oldCollected && postEnergy === oldFriendEnergy) {
        if (new Date().getTime() > timeout) {
          debugInfo('等待能量数据更新超时')
          timeoutFlag = true
          break
        }
        sleep(50)
        postCollected = _widgetUtils.getYouCollectEnergy() || 0
        postEnergy = _widgetUtils.getFriendEnergy()
      }
      if (!timeoutFlag) {
        debugInfo([
          '能量值数据刷新，新值collect:{} energy:{} 总耗时：{}ms',
          this.checkAndDisplayIncreased(postCollected, oldCollected),
          this.checkAndDisplayIncreased(postEnergy, oldFriendEnergy),
          new Date().getTime() - timeout + 1000
        ])
      }
    }
    return { postCollected: postCollected, postEnergy: postEnergy }
  }

  this.checkAndDisplayIncreased = function (newVal, oldVal) {
    if (newVal === oldVal) {
      return newVal
    }
    let compare = newVal - oldVal
    return newVal + '(' + (compare > 0 ? '+' + compare : compare) + ')'
  }

  this.doCollectTargetFriend = function (obj, temp) {
    debugInfo(['准备开始收取好友：「{}」', obj.name])
    let preGot, postGet, preE, postE, rentery = false
    let screen = null
    if (_config.cutAndSaveTreeCollect) {
      screen = images.copy(_commonFunctions.checkCaptureScreenPermission(), true)
    }
    try {
      preGot = _widgetUtils.getYouCollectEnergy() || 0
      preE = _widgetUtils.getFriendEnergy()
    } catch (e) {
      errorInfo("[" + obj.name + "]获取收集前能量异常" + e)
      _commonFunctions.printExceptionStack(e)
    }
    let temp = temp || this.protectDetect(_package_name, obj.name)
    if (_config.help_friend) {
      rentery = this.collectAndHelp(obj.isHelp)
    } else {
      this.collectEnergy()
    }
    if (this.isProtected) {
      debugInfo(['异步判定已使用了保护罩，跳过后续操作 name: {}', obj.name])
      return this.backToListIfNeeded(false, obj)
    }
    try {
      // 等待控件数据刷新
      let { postEnergy, postCollected } = this.waitEnergyChangedIfCollected(preGot, preE)
      postGet = postCollected
      postE = postEnergy
    } catch (e) {
      errorInfo("[" + obj.name + "]获取收取后能量异常" + e)
      _commonFunctions.printExceptionStack(e)
    }
    let friendGrowEnergy = postE - preE
    let collectEnergy = postGet - preGot
    debugInfo(['执行前，收集数据：{} 好友能量：{}; 执行后，收集数据：{} 好友能量：{}', preGot, preE, postGet, postE])
    if (this.collect_operated && friendGrowEnergy === 0 && collectEnergy === 0 && !obj.isHelp && !obj.recheck) {
      // 没有收集到能量，可能有保护罩，等待1.5秒
      warnInfo(['非帮助收集，未收集到能量，可能当前能量值未刷新或者好友使用了保护罩，等待1.5秒'], true)
      sleep(1500)
      try {
        // 1.5秒后重新获取能量值
        postGet = _widgetUtils.getYouCollectEnergy() || 0
        postE = _widgetUtils.getFriendEnergy()
        collectEnergy = postGet - preGot
        friendGrowEnergy = postE - preE
      } catch (e) {
        errorInfo("[" + obj.name + "]二次获取收取后能量异常" + e)
        _commonFunctions.printExceptionStack(e)
      }
    }
    if (collectEnergy > 0) {
      let gotEnergyAfterWater = collectEnergy
      this.collect_any = true
      let needWaterback = _commonFunctions.recordFriendCollectInfo({
        hasSummaryWidget: _config.has_summary_widget,
        friendName: obj.name,
        friendEnergy: postE,
        postCollect: postGet,
        preCollect: preGot,
        helpCollect: 0
      })
      try {
        if (needWaterback) {
          _widgetUtils.wateringFriends()
          gotEnergyAfterWater -= (_config.targetWateringAmount || 0)
        }
      } catch (e) {
        errorInfo('收取[' + obj.name + ']' + collectEnergy + 'g 大于阈值:' + _config.wateringThreshold + ' 回馈浇水失败 ' + e)
        _commonFunctions.printExceptionStack(e)
      }
      logInfo([
        "收取好友:{} 能量 {}g {}",
        obj.name, gotEnergyAfterWater, (needWaterback ? '浇水' + (_config.targetWateringAmount || 0) + 'g' : '')
      ])
      this.showCollectSummaryFloaty(gotEnergyAfterWater)
      if (_config.cutAndSaveTreeCollect && screen) {
        let savePath = FileUtils.getCurrentWorkPath() + '/resources/tree_collect/'
          + 'unknow_collected_' + gotEnergyAfterWater + '_' + (Math.random() * 899 + 100).toFixed(0) + '.png'
        files.ensureDir(savePath)
        images.save(screen, savePath)
        debugForDev(['保存可收取能量球图片：「{}」', savePath])
      }
    }

    if (friendGrowEnergy > 0) {
      this.collect_any = true
      logInfo("帮助好友:" + obj.name + " 回收能量 " + friendGrowEnergy + "g")
      _commonFunctions.recordFriendCollectInfo({
        hasSummaryWidget: _config.has_summary_widget,
        fromHelp: true,
        friendName: obj.name,
        friendEnergy: postE,
        postCollect: postGet,
        preCollect: preGot,
        helpCollect: friendGrowEnergy
      })
      if (_config.try_collect_by_multi_touch || _config.direct_use_img_collect_and_help) {
        // 如果是可帮助 且 无法获取控件信息的，已帮助收取的重新进入判断一次
        debugInfo('帮助收取后需要再次进入好友页面检测')
        rentery = true
      }
      if (_config.cutAndSaveTreeCollect && screen) {
        let savePath = FileUtils.getCurrentWorkPath() + '/resources/tree_collect/'
          + 'unknow_helped_' + friendGrowEnergy + '_' + (Math.random() * 899 + 100).toFixed(0) + '.png'
        files.ensureDir(savePath)
        images.save(screen, savePath)
        debugForDev(['保存可帮助能量球图片：「{}」', savePath])
      }
    }
    screen && screen.recycle()
    temp.interrupt()
    return this.backToListIfNeeded(rentery, obj)
  }

  this.backToListIfNeeded = function (rentery, obj) {
    if (rentery) {
      debugInfo('好友能量收取完毕, 有帮助收取 重新校验是否有新能量球')
      sleep(500)
      obj.isHelp = false
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
}
module.exports = BaseScanner
