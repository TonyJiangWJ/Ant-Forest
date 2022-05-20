/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-18 14:17:09
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-08 00:40:13
 * @Description: 能量收集和扫描基类，负责通用方法和执行能量球收集
 */
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
let { config: _config, storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')
let FileUtils = singletonRequire('FileUtils')
let AntForestDao = singletonRequire('AntForestDao')
let { debugInfo, logInfo, errorInfo, warnInfo, infoLog, debugForDev, developSaving } = singletonRequire('LogUtils')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let ENGINE_ID = engines.myEngine().id
let _package_name = 'com.eg.android.AlipayGphone'
let _HoughHelper = require('../utils/HoughHelper.js')
let _VisualHelper = require('../utils/VisualHelper.js')

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
    increased = increased || 0
    this.increased_energy += increased
    if (_config.is_cycle) {
      _commonFunctions.showCollectSummaryFloaty0(this.increased_energy, this.current_time, increased)
    } else {
      _commonFunctions.showCollectSummaryFloaty0(null, null, this.increased_energy)
    }
  }

  // 收取能量
  this.collectEnergy = function () {
    this.checkAndCollectByHough()
  }

  /**
   * 等待保护罩校验完成 并返回是否使用了保护罩
   */
  this.awaitForCollectable = function () {
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
   * 根据图像识别 帮助收取或者收取能量球
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
        || _config.double_click_card_used && haveValidBalls && --recheckLimit > 0
      if (repeat) {
        debugInfo(['需要二次校验，等待{}ms', this.is_own ? 200 : 500])
        sleep(this.is_own ? 200 : 500)
      }
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
              self.visualHelper.addCircle(collectableBall.isWatering ? '好友浇水能量球' : '可收取', collectableBall.ball)
            } else {
              self.visualHelper.addCircle('非有效能量球', collectableBall.ball)
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
    this.visualHelper.displayAndClearAll()
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
    if (this.is_own && _config.cutAndSaveTreeCollect && this.recheck && rgbImg) {
      let savePath = FileUtils.getCurrentWorkPath() + '/resources/tree_collect/'
        + 'collect_own_' + (Math.random() * 899 + 100).toFixed(0) + '.png'
      files.ensureDir(savePath)
      images.save(rgbImg, savePath)
      debugForDev(['保存自身能量球图片：「{}」', savePath])
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
      if (
        // 可能是左上角的活动图标 或者 识别到了其他范围的球
        ball.y < _config.tree_collect_top - (this.is_own ? cvt(80) : 0) || ball.y > _config.tree_collect_top + _config.tree_collect_height
        || ball.x < _config.tree_collect_left || ball.x > _config.tree_collect_left + _config.tree_collect_width
        // 取值范围就不正确的无效球，避免后续报错，理论上不会进来，除非配置有误
        || ball.x - radius <= 0 || ball.x + radius >= _config.device_width || ball.y - radius <= 0 || ball.y + 1.6 * radius >= _config.device_height) {
        return
      }
      let ballImage = images.clip(rgbImg, ball.x - radius, ball.y - radius, radius * 2, 2.6 * radius)
      // 用于判定是否可收取
      let intervalForCollectCheck = images.inRange(ballImage, _config.collectable_lower || '#89d600', _config.collectable_upper || '#ffff14')
      let avgForCollectable = OpenCvUtil.getHistAverage(intervalForCollectCheck)
      // 用于判定是否浇水球
      let intervalForHelpCheck = images.inRange(ballImage, _config.water_lower || '#caa50e', _config.water_upper || '#ffede2')
      // 判定是否为浇水球
      let avgHsv = OpenCvUtil.getHistAverage(intervalForHelpCheck)
      let collectableBall = {
        ball: ball, isOwn: this.is_own, avg: avgHsv,
        mainAvg: avgForCollectable,
        ballImage: ballImage
      }

      debugForDev(['取色耗时：{}ms', new Date().getTime() - startForColorValue])
      if (avgHsv >= COLLECTING_THRESHOLD) {
        // 浇水能量球
        collectableBall.isWatering = true
        recheck = this.is_own
      } else if (avgForCollectable < COLLECTING_THRESHOLD) {
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
      clickPoints.forEach((point, idx) => {
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
            this.randomSleep(100)
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
    this.isProtectDetectDone = false
    this.isProtected = false
    let loadMoreButton = _widgetUtils.widgetGetOne(_config.friend_load_more_content || '点击展开好友动态', 1000)
    if (loadMoreButton) {
      let limit = 3
      while (loadMoreButton && --limit > 0) {
        debugInfo(['点击展开好友动态：[{},{}]', loadMoreButton.bounds().centerX(), loadMoreButton.bounds().centerY()])
        // automator.clickCenter(loadMoreButton)
        loadMoreButton.click()
        sleep(100)
        loadMoreButton = _widgetUtils.widgetGetOne(_config.friend_load_more_content || '点击展开好友动态', 400)
      }
      if (loadMoreButton) {
        warnInfo(['点击展开好友失败 {}', loadMoreButton.bounds()])
      }
    } else {
      debugInfo(['未找到加载更多按钮:「{}」', _config.friend_load_more_content || '点击展开好友动态'])
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
      let sleepTime = 1000
      if (this.collect_count > 1) {
        // 多个能量球，多等待五百毫秒
        sleep(500)
        sleepTime = 500
      }
      // 最多等一秒
      let timeout = new Date().getTime() + sleepTime
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
          new Date().getTime() - timeout + sleepTime
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

  this.doCollectTargetFriend = function (obj, toastListenThread) {
    debugInfo(['准备开始收取好友：「{}」', obj.name])
    let regetFriendName = this.getFriendName()
    if (regetFriendName != obj.name) {
      warnInfo(['重新通过控件获取好友名称为：{} 和旧值「{}」不符，重置好友名称', regetFriendName, obj.name])
      obj.name = regetFriendName
    }
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
    toastListenThread = toastListenThread || this.protectDetect(_package_name, obj.name)
    this.collectEnergy()
    if (this.isProtected) {
      debugInfo(['异步判定已使用了保护罩，跳过后续操作 name: {}', obj.name])
      return this.backToListIfNeeded(false, obj, toastListenThread)
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
    if (this.collect_operated && friendGrowEnergy === 0 && collectEnergy === 0 && !obj.recheck) {
      // 没有收集到能量，可能有保护罩，等待1.5秒
      warnInfo(['未收集到能量，可能当前能量值未刷新或者好友使用了保护罩，等待1.5秒'], true)
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
      AntForestDao.saveFriendCollect(obj.name, postE, gotEnergyAfterWater, needWaterback ? _config.targetWateringAmount : null)
      this.showCollectSummaryFloaty(gotEnergyAfterWater)
      if (_config.cutAndSaveTreeCollect && screen) {
        let savePath = FileUtils.getCurrentWorkPath() + '/resources/tree_collect/'
          + 'unknow_collected_' + gotEnergyAfterWater + '_' + (Math.random() * 899 + 100).toFixed(0) + '.png'
        files.ensureDir(savePath)
        images.save(screen, savePath)
        debugForDev(['保存可收取能量球图片：「{}」', savePath])
      }
    } else {
      warnInfo(['未收取能量，可能有森林赠礼，延迟等待动画'], true)
      sleep(1500)
    }
    // 校验是否有森林赠礼
    if (this.checkForPlantReward()) {
      infoLog(['好友「{}」有森林赠礼，已领取', obj.name])
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
      // 如果是可帮助 且 无法获取控件信息的，已帮助收取的重新进入判断一次
      debugInfo('帮助收取后需要再次进入好友页面检测')
      rentery = true

      if (_config.cutAndSaveTreeCollect && screen) {
        let savePath = FileUtils.getCurrentWorkPath() + '/resources/tree_collect/'
          + 'unknow_helped_' + friendGrowEnergy + '_' + (Math.random() * 899 + 100).toFixed(0) + '.png'
        files.ensureDir(savePath)
        images.save(screen, savePath)
        debugForDev(['保存可帮助能量球图片：「{}」', savePath])
      }
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
    if (screen && _config.image_config.reward_for_plant) {
      let collect = OpenCvUtil.findByImageSimple(images.cvtColor(images.grayscale(screen), 'GRAY2BGRA'), images.fromBase64(_config.image_config.reward_for_plant))
      if (collect) {
        debugInfo('截图找到了目标, 获取森林赠礼')
        automator.click(collect.centerX(), collect.centerY())
        let gotItBtn = _widgetUtils.widgetGetOne('知道了', 1000)
        if (gotItBtn) {
          debugInfo('大礼盒需要点击知道了')
          automator.clickCenter(gotItBtn)
          sleep(300)
        }
        return true
      }
    }
    return false
  }
}
module.exports = BaseScanner
