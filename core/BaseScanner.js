/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-18 14:17:09
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-10-09 22:45:02
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
    _commonFunctions.registerOnEngineRemoved(function () {
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
  }

  // 收取能量
  this.collectEnergy = function (isHelp) {
    if (_config.direct_use_img_collect_and_help) {
      this.checkAndCollectByImg()
      return
    }
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
      ballCheckContainer.target
        .forEach(function (energy_ball) {
          that.collectBallEnergy(energy_ball, ballCheckContainer.isDesc)
        })
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
        this.checkAndCollectByImg()
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
        this.protectDetectingCondition.await(600, TimeUnit.MILLISECONDS)
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
   */
  this.checkAndCollectByHough = function (isOwn, findBallsCallback, findPointCallback) {
    findBallsCallback = findBallsCallback || function () { }
    findPointCallback = findPointCallback || function () { }
    isOwn = isOwn || false
    let start = new Date().getTime()
    let recheck = false, recheckLimit = 3
    let lock = threads.lock()
    this.ensureThreadPoolCreated()
    do {
      recheck = false
      let screen = _commonFunctions.checkCaptureScreenPermission()
      if (screen) {
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
        // 多点找色用
        let intervalImg = images.medianBlur(images.inRange(grayImgInfo, '#c8c8c8', '#cacaca'), 5)
        // 将色彩空间恢复成 RGBA，否则images.pixel会报错
        intervalImg = com.stardust.autojs.core.image.ImageWrapper.ofBitmap(intervalImg.getBitmap())
        debugInfo(['找到的球:{}', JSON.stringify(findBalls)])
        this.found_balls = findBalls
        if (this.isProtected) {
          // 已判定为使用了保护罩
          return
        }
        if (findBalls && findBalls.length > 0) {
          findBallsCallback(findBalls)
          let clickPoints = []
          let countdownLatch = new CountDownLatch(findBalls.length)
          findBalls.forEach(b => {
            let region = [b.x - cvt(40), b.y + cvt(70), cvt(60), cvt(30)]
            let recheckRegion = [b.x - cvt(40), b.y - cvt(40), cvt(80), cvt(80)]
            _commonFunctions.ensureRegionInScreen(region)
            _commonFunctions.ensureRegionInScreen(recheckRegion)
            this.threadPool.execute(function () {
              try {
                if (rgbImg.getMat().dims() >= 2 && intervalImg.getMat().dims() >= 2) {
                  // 先判断能量球底部 文字的颜色是否匹配帮收
                  let p = images.findColor(rgbImg, '#f2a45a', { region: region, threshold: 30 }) || images.findColor(rgbImg, '#dc9423', { region: region, threshold: 30 }) || images.findColor(rgbImg, '#e6cca6', { region: region, threshold: 30 })
                  // 帮收能量球，判断能量球中心点的颜色是否匹配
                  if (p && (isOwn || images.findColor(rgbImg, '#2dad39', { region: recheckRegion, threshold: 30 }) || images.findColor(rgbImg, '#278a70', { region: recheckRegion, threshold: 30 }))) {
                    recheck = true
                    lock.lock()
                    clickPoints.push({ ball: p, isHelp: true, color: colors.toString(rgbImg.getBitmap().getPixel(p.x, p.y)) })
                    lock.unlock()
                  } else {
                    // 非帮收能量球，校验是否是可收取能量球
                    p = images.findMultiColors(intervalImg, '#ffffff', multiCheckPoints, { region: recheckRegion, threshold: 1 }) || images.findColor(rgbImg, '#2dad39', { region: region, threshold: 6 }) || images.findColor(rgbImg, '#0fe4ff', { region: region, threshold: 6 })
                    if (p) {
                      lock.lock()
                      clickPoints.push({ ball: p, isHelp: false, color: colors.toString(rgbImg.getBitmap().getPixel(p.x, p.y)) })
                      lock.unlock()
                    }
                  }
                } else {
                  debugInfo(['mat dims is smaller then two, rgb: {} interval: {}', rgbImg.getMat().dims(), intervalImg.getMat().dims()])
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
          debugInfo(['判断可收集或帮助能量球信息总耗时：{}ms', new Date().getTime() - start])
          if (!this.awaitForCollectable()) {
            return
          }
          if (clickPoints && clickPoints.length > 0) {
            debugInfo(['找到可收取和和帮助的点集合：{}', JSON.stringify(clickPoints)])
            clickPoints.forEach(point => {
              let b = point.ball
              if (b.y < _config.tree_collect_top - (isOwn ? cvt(80) : 0) || b.y > _config.tree_collect_top + _config.tree_collect_height) {
                // 可能是左上角的活动图标 或者 识别到了其他范围的球
                return
              }
              findPointCallback(point)
              developSaving(['{} ball, match position: [{},{}] color: {} ', point.isHelp ? 'help' : 'collect', point.ball.x, point.ball.y, point.color], 'matching_colors')
              if (isOwn || _config.help_friend && point.isHelp || !point.isHelp) {
                automator.click(b.x, b.y)
                sleep(100)
              }
            })
          } else {
            debugInfo('未找到匹配的可收取或帮助的点')
            if (_config.develop_mode && !isOwn) {
              debugForDev(['图片数据：[data:image/png;base64,{}]', images.toBase64(rgbImg)], false, true)
            }
          }
        }
      }
    } while (recheck && isOwn && --recheckLimit > 0)
    debugInfo(['收集能量球总耗时：{}ms', new Date().getTime() - start])
  }

  /**
   * 根据图像识别 帮助收取或者收取能量球
   * @deprecated 废弃，改用霍夫变换
   * @param isOwn 是否收集自己，收自己时不判断帮收能量球
   */
  this.checkAndCollectByImg = function (isOwn) {
    // 是否通过霍夫变换识别能量球
    if (_config.detect_balls_by_hough) {
      return this.checkAndCollectByHough(isOwn)
    }
    isOwn = isOwn || false
    let start = new Date().getTime()
    let allPoints = this.checkByImg('#c8c8c8', '#cacaca', '可收取')
    if (this.isProtected) {
      // 已判定为使用了保护罩
      return
    }
    if (!isOwn) {
      // 不需要帮助好友时，过滤帮助收取的点
      if (!_config.help_friend && allPoints.length > 0) {
        let start = new Date().getTime()
        let screen = _commonFunctions.checkCaptureScreenPermission()
        if (screen) {
          this.temp_img = images.copy(screen, true)
          let forCheckImg = images.copy(screen)
          allPoints = allPoints.filter(point => {
            let region = [detectRegion[0] + point.x, detectRegion[1] + point.y, 50, 200]
            _commonFunctions.ensureRegionInScreen(region)
            for (let i = 0; i < _config.helpBallColors.length; i++) {
              let color = _config.helpBallColors[i]
              // 校验是否匹配帮收能量球颜色
              if (images.findColor(forCheckImg, color, { region: region, threshold: _config.color_offset })) {
                return false
              }
              debugInfo(['{} 未找到匹配的颜色：{}', region, color])
            }
            return true
          })
          debugInfo(['过滤可帮助能量球后：「{}」过滤耗时：{}ms', JSON.stringify(allPoints), new Date().getTime() - start])
        }
      } else if (_config.help_friend) {
        let firstCheckPoints = this.checkByImg('#b5b5b5', '#d6d6d6', '可帮助')
        // 延迟一段时间二次检验
        sleep(250)
        let secondCheckPoints = this.checkByImg('#b5b5b5', '#d6d6d6', '可帮助')
        allPoints = allPoints.concat(firstCheckPoints.concat(secondCheckPoints))
      }
    } else {
      debugInfo('收取自己的能量球，跳过帮收能量球的校验')
      // TODO 识别好友浇水能量球，暂时懒得实现 手动收呗
    }
    debugInfo(['得到的点集合：「{}」', JSON.stringify(allPoints)])
    // 整合校验的点，移除距离较近的，然后进行点击
    let clickPoints = []
    let lastPx = -200
    let lastPy = -200
    if (allPoints.length > 0) {
      if (!this.awaitForCollectable()) {
        return
      }
      allPoints.forEach(p => {
        if (this.getDistance(p, lastPx, lastPy) >= 100 * SCALE_RATE) {
          clickPoints.push(p)
          lastPx = p.x
          lastPy = p.y
        }
      })
      debugInfo(['过滤后的点集合：「{}」', JSON.stringify(clickPoints)])
      this.clickCheckPoints(clickPoints)
    }
    debugInfo(['判断可收集能量球信息总耗时：{}ms', new Date().getTime() - start])
  }

  /**
   * @deprecated 废弃改用霍夫变换
   * @param {*} p 
   * @param {*} lpx 
   * @param {*} lpy 
   */
  this.getDistance = function (p, lpx, lpy) {
    return Math.sqrt(Math.pow(p.x - lpx, 2) + Math.pow(p.y - lpy, 2))
  }

  /**
   * @deprecated 废弃改用霍夫变换
   * @param {*} lowColor 
   * @param {*} highColor 
   * @param {*} type 
   */
  this.checkAndClickByImg = function (lowColor, highColor, type) {
    let clickPoints = this.checkByImg(lowColor, highColor, type)
    this.clickCheckPoints(clickPoints)
  }

  /**
   * @deprecated 废弃改用霍夫变换
   * @param {*} clickPoints 
   */
  this.clickCheckPoints = function (clickPoints) {
    if (clickPoints.length > 0) {
      clickPoints.forEach(p => {
        automator.click(p.x + detectRegion[0], p.y + detectRegion[1])
        sleep(100)
      })
      // 点击后加一定延迟 避免过快导致出问题
      sleep(100)
    }
  }

  /**
   * @deprecated 废弃改用霍夫变换
   * @param {*} lowColor 
   * @param {*} highColor 
   * @param {*} type 
   */
  this.checkByImg = function (lowColor, highColor, type) {
    let isHelp = type === '可帮助'
    let screen = _commonFunctions.checkCaptureScreenPermission()
    if (screen) {
      let start = new Date().getTime()
      let intervalImg = images.medianBlur(images.inRange(images.grayscale(screen), lowColor, highColor), 5)
      // 切割检测区域
      intervalImg = images.clip(intervalImg, detectRegion[0], detectRegion[1], detectRegion[2], detectRegion[3])

      let clickPoints = []
      let lastPx = -GAP
      let lastPy = -GAP
      let step = parseInt(75 * SCALE_RATE)
      let o = step * 3

      for (let x = 0; x <= detectRegion[2] - GAP; x += GAP) {
        let offset = x == 3 * GAP ? o : Math.abs(o -= step)
        if (offset == step) {
          offset = parseInt(90 * SCALE_RATE)
        }
        let checkPoints = []
        for (let x = -parseInt(25 * SCALE_RATE); x <= parseInt(25 * SCALE_RATE); x += 2) {
          checkPoints.push([x, 0, '#ffffff'])
        }
        if (isHelp) {
          // 帮收能量球追加校验 避免和倒计时能量球混了
          for (let y = 0; y <= parseInt(25 * SCALE_RATE); y += 2) {
            checkPoints.push([0, y, '#ffffff'])
          }
        }
        let p = images.findMultiColors(
          intervalImg, "#ffffff",
          checkPoints,
          {
            region: [
              x, offset,
              GAP, detectRegion[3] - offset
            ]
          }
        )
        if (p && this.getDistance(p, lastPx, lastPy) >= 100 * SCALE_RATE) {
          clickPoints.push(p)
          lastPx = p.x
          lastPy = p.y
        }
      }
      debugInfo([
        '{} 点个数：「{}」列表：{} 耗时:{}ms',
        type, clickPoints.length, JSON.stringify(clickPoints), new Date().getTime() - start
      ])
      return clickPoints
    }
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
    this.threadPool.execute(function () {
      try {
        self.protectDetectingLock.lock()
        self.isProtected = self._protectInfoDetect(name)
        self.isProtectDetectDone = true
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
        let dayBeforeYesterday = _widgetUtils.widgetGetOne(dateBeforeYesterday, 50, true, true)
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
        this.temp_img.recycle()
        this.temp_img = null
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

  this.doCollectTargetFriend = function (obj, temp) {
    debugInfo(['准备开始收取好友：「{}」', obj.name])
    let preGot, postGet, preE, postE, rentery = false
    let screen = null
    if (_config.cutAndSaveTreeCollect) {
      screen = images.copy(_commonFunctions.checkCaptureScreenPermission())
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
      sleep(150)
      postGet = _widgetUtils.getYouCollectEnergy() || 0
      postE = _widgetUtils.getFriendEnergy()
    } catch (e) {
      errorInfo("[" + obj.name + "]获取收取后能量异常" + e)
      _commonFunctions.printExceptionStack(e)
    }
    let friendGrowEnergy = postE - preE
    let collectEnergy = postGet - preGot
    if (!obj.isHelp) {
      debugInfo("开始收集前:" + preGot + " 收集后:" + postGet)
    } else {
      debugInfo("开始帮助前:" + preE + " 帮助后:" + postE)
    }
    if (friendGrowEnergy === 0 && collectEnergy === 0 && !obj.isHelp && !obj.recheck) {
      if (!obj.doubleCheck) {
        warnInfo(['非帮助收集，未收集到能量，1秒后重试'], true)
        sleep(1000)
        obj.doubleCheck = true
        this.savingDevelopImageForNotFound()
        return this.doCollectTargetFriend(obj, temp)
      }
      // 没有收集到能量，可能有保护罩，等待2秒
      warnInfo(['非帮助收集，未收集到能量，可能当前好友使用了保护罩，等待1.5秒'], true)
      this.savingDevelopImageForNotFound()
      sleep(1500)
      try {
        // 2秒后重新获取能量值
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
      this.showCollectSummaryFloaty(collectEnergy)
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
