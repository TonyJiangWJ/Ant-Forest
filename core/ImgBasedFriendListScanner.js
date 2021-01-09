/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-11 09:17:29
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-05 23:34:22
 * @Description: 基于图像识别控件信息
 */
importClass(com.tony.ColorCenterCalculatorWithInterval)
importClass(com.tony.ScriptLogger)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')
let BaiduOcrUtil = require('../lib/BaiduOcrUtil.js')
let TesseracOcrUtil = require('../lib/TesseracOcrUtil.js')
let OcrUtil = _config.useTesseracOcr ? TesseracOcrUtil : BaiduOcrUtil
let useMockOcr = false
if (!_config.useTesseracOcr && !_config.useOcr) {
  OcrUtil = require('../lib/MockNumberOcrUtil.js')
  useMockOcr = true
}
let BaseScanner = require('./BaseScanner.js')

let SCRIPT_LOGGER = new ScriptLogger({
  log: function (message) {
    logInfo(message)
  },
  debug: function (message) {
    debugInfo(message)
  },
  error: function (message) {
    errorInfo(message)
  }
})

const SCALE_RATE = _config.scaleRate
const checkPoints = []
for (let i = 0; i < 30 * SCALE_RATE; i++) {
  for (let j = 0; j < 30 * SCALE_RATE; j++) {
    if (i === j) {
      if (i <= 5) {
        checkPoints.push([i, j, "#ffffff"])
      } else {
        checkPoints.push([i, j, "#000000"])
      }
    }
  }
}
for (let i = 20; i < 30 * SCALE_RATE; i++) {
  for (let j = 30; j > 20 * SCALE_RATE; j--) {
    if (i - 20 === (30 - j)) {
      checkPoints.push([i, j, "#000000"])
    }
  }
}
const EXECUTE_FAILED = true
const ImgBasedFriendListScanner = function () {
  BaseScanner.call(this)
  this.threadPool = null
  this.min_countdown_pixels = 10
  this.last_check_point = null
  this.last_check_color = null
  this.stroll_up_check_count = 0
  this.has_next = true
  let self = this
  this.init = function (option) {
    option = option || {}
    this.current_time = option.currentTime || 0
    this.increased_energy = option.increasedEnergy || 0
    this.createNewThreadPool()
  }

  this.start = function () {
    this.min_countdown = 10000
    this.min_countdown_pixels = 10
    debugInfo('图像分析即将开始')
    return this.collecting()
  }

  /**
   * 目前可能存在误判 帮收和可收 移除和帮收比较接近的可收点
   */
  this.sortAndReduce = function (points, gap) {
    gap = gap || 100 * _config.scaleRate
    debugForDev(['reduce gap: {}', gap])
    let lastY = -gap - 1
    let lastIsHelp = false
    let resultPoints = []
    if (points && points.length > 0) {
      points.sort((pd1, pd2) => {
        let p1 = pd1.point
        let p2 = pd2.point
        if (p1.y > p2.y) {
          return 1
        } else if (p1.y < p2.y) {
          return -1
        } else {
          return 0
        }
      }).forEach(pointData => {
        let point = pointData.point
        if (point.y - lastY > gap) {
          resultPoints.push(pointData)
          lastY = point.y
          lastIsHelp = pointData.isHelp
        } else {
          if (lastIsHelp || !pointData.isHelp) {
            // 距离过近的丢弃
            debugInfo(['丢弃距离较上一个:{} 比较近的：{}', lastY, JSON.stringify(pointData)])
          } else {
            // 上一个点非帮助 且当前点为帮助点 丢弃上一个点
            let dropLast = resultPoints.splice(resultPoints.length - 1)
            debugInfo(['丢弃上一个距离比较近的非帮助点：{}', JSON.stringify(dropLast)])
            resultPoints.push(pointData)
            lastY = point.y
            lastIsHelp = pointData.isHelp
          }
        }
      })
      debugInfo('重新分析后的点：' + JSON.stringify(resultPoints))
    }
    return resultPoints
  }

  this.destory = function () {
    this.baseDestory()
  }

  this.scrollUpIfNeeded = function (grayImg) {
    let countdown = new Countdown()
    let region = [parseInt(_config.device_width * 0.3), parseInt(_config.device_height * 0.6), 100, 200]
    let shouldScrollUp = false
    let last_p = null
    if (this.last_check_point) {
      let checkPointColor = grayImg.getBitmap().getPixel(this.last_check_point.x, this.last_check_point.y)
      // e5
      if ((this.last_check_color & 0xFF) === (checkPointColor & 0xFF)) {
        shouldScrollUp = true
        last_p = this.last_check_point
      } else {
        debugInfo([
          '校验点:{} 颜色：{} 不匹配 {}，正常继续',
          JSON.stringify(this.last_check_point), colors.toString(checkPointColor), colors.toString(this.last_check_color)
        ])
      }
    }
    this.last_check_point = images.findColor(grayImg, '#e5e5e5', { region: region })
    if (this.last_check_point) {
      this.last_check_color = grayImg.getBitmap().getPixel(this.last_check_point.x, this.last_check_point.y)
    } else {
      this.last_check_color = null
    }


    if (shouldScrollUp) {
      debugInfo(['校验点颜色相同，上划重新触发加载，{}', JSON.stringify(last_p)])
      _widgetUtils.tryFindBottomRegion(grayImg)
      automator.scrollUp()
    }

    if (this.last_check_color) {
      countdown.summary(
        _commonFunctions.formatString(
          '滑动校验 保存校验点数据：[{}] color:{}', JSON.stringify(this.last_check_point),
          colors.toString(this.last_check_color)
        )
      )
      return true
    } else {
      countdown.summary('滑动校验 未找到校验点')
      return false
    }
  }

  /**
   * 判断指定点区域是否为可收取的小手图标
   * 
   * @param {*} img 
   * @param {*} point 
   */
  this.checkIsCanCollect = function (img, point) {

    if (_config.check_finger_by_pixels_amount) {
      debugInfo(['使用像素点个数判断是否是可收集，当前点像素点个数为：{} 判断阈值为<={}', point.regionSame, _config.finger_img_pixels])
      return point.regionSame <= _config.finger_img_pixels
    } else {
      let height = point.bottom - point.top
      let width = point.right - point.left
      debugForDev(['checkPoints: {}', JSON.stringify(checkPoints)])
      let p = images.findMultiColors(com.stardust.autojs.core.image.ImageWrapper.ofBitmap(img.getBitmap()), "#ffffff", checkPoints, {
        region: [
          point.left + width - width / Math.sqrt(2),
          point.top,
          width / Math.sqrt(2) / 2,
          height / Math.sqrt(2) / 2
        ],
        threshold: 0
      })

      let flag = p !== null
      debugInfo(['point: {} 判定结果：{} {}', JSON.stringify(point), flag, JSON.stringify(p)])
      return flag
    }
  }
  /**
   * 执行收集操作
   * 
   * @return { true } if failed
   * @return { minCountdown, lostSomeone } if successful
   */
  this.collecting = function (testing) {
    let screen = null
    let grayScreen = null
    let intervalScreenForDetectCollect = null
    let intervalScreenForDetectHelp = null
    // console.show()
    let countingDownContainers = []
    // 列表中的滑动次数
    let count = 0
    this.has_next = true
    this.stroll_up_check_count = 0
    do {
      screen = _commonFunctions.checkCaptureScreenPermission(5)
      // 重新复制一份
      grayScreen = images.copy(images.grayscale(images.copy(screen)), true)
      let originScreen = images.copy(screen)
      intervalScreenForDetectCollect = images.medianBlur(images.interval(grayScreen, _config.can_collect_color_gray || '#828282', _config.color_offset), 5)
      intervalScreenForDetectHelp = images.medianBlur(images.interval(images.copy(screen), _config.can_help_color || '#f99236', _config.color_offset), 5)
      let countdown = new Countdown()
      let waitForCheckPoints = this.getAllCheckPoints(intervalScreenForDetectHelp, intervalScreenForDetectCollect)
      countdown.summary('获取可帮助和可能可收取的点')
      if (waitForCheckPoints.length > 0) {
        if (!_config.help_friend) {
          waitForCheckPoints = waitForCheckPoints.filter(p => !p.isHelp)
          debugInfo(['移除帮助收取的点之后：{}', JSON.stringify(waitForCheckPoints)])
        }
        countdown.restart()
        let countdownLatch = new CountDownLatch(waitForCheckPoints.length)
        let listWriteLock = threads.lock()
        let countdownLock = threads.lock()
        let imgResolveLock = threads.lock()
        let collectOrHelpList = []
        waitForCheckPoints.forEach(pointData => {
          if (pointData.isHelp) {
            this.threadPool.execute(function () {
              self.solveHelpPoint(intervalScreenForDetectHelp, pointData, listWriteLock, countdownLatch, collectOrHelpList)
            })
          } else {
            this.threadPool.execute(function () {
              let executeSuccess = false
              try {
                let calculator = new ColorCenterCalculatorWithInterval(
                  images.copy(intervalScreenForDetectCollect), _config.device_width - parseInt(200 * SCALE_RATE), pointData.point.x, pointData.point.y
                )
                calculator.setScriptLogger(SCRIPT_LOGGER)
                let point = calculator.getCenterPoint()
                if (self.checkIsCanCollect(images.copy(intervalScreenForDetectCollect), point)) {
                  // 可收取
                  executeSuccess = self.solveCollectable(point, listWriteLock, countdownLatch, collectOrHelpList)
                } else {
                  if (!testing) {
                    // 倒计时数据，直接标记执行完毕 将OCR请求交给异步处理
                    countdownLatch.countDown()
                    executeSuccess = true
                  }
                  self.solveCountdown(grayScreen, point, imgResolveLock, countdownLock, countingDownContainers)
                  if (testing) {
                    // 测试时等待
                    countdownLatch.countDown()
                    executeSuccess = true
                  }
                }
              } catch (e) {
                errorInfo('是否可收取及倒计时识别线程执行异常' + e)
                _commonFunctions.printExceptionStack(e)
              } finally {
                if (!executeSuccess) {
                  countdownLatch.countDown()
                }
              }
            })
          }
        })
        // 等待五秒
        if (!countdownLatch.await(_config.thread_pool_waiting_time || 5, TimeUnit.SECONDS)) {
          let activeCount = this.threadPool.getActiveCount()
          errorInfo('有线程执行失败 运行中的线程数：' + activeCount)
          // if (activeCount > 0) {
          debugInfo('将线程池关闭然后重建线程池')
          this.threadPool.shutdown()
          debugInfo(['等待imgBasedScanner线程池关闭, 结果: {}', this.threadPool.awaitTermination(5, TimeUnit.SECONDS)])
          this.createNewThreadPool()
          // }
        }
        originScreen.recycle()
        countdown.summary('分析所有可帮助和可收取的点')
        if (this.operateCollectIfNeeded(collectOrHelpList)) {
          return EXECUTE_FAILED
        }
      }
      this.visualHelper.displayAndClearAll()
      if (this.checkBottomAndRecycle(grayScreen, ++count)) {
        return EXECUTE_FAILED
      }
    } while (this.has_next)
    let poolWaitCount = 0
    while (this.threadPool.getActiveCount() > 0) {
      debugInfo(['当前线程池还有工作线程未结束，继续等待。运行中数量：{}', this.threadPool.getActiveCount()])
      sleep(100)
      poolWaitCount++
      // 当等待超过两秒时 结束线程池
      if (poolWaitCount > 20) {
        warnInfo(['线程池等待执行结束超时，当前剩余运行中数量：{} 强制结束', this.threadPool.getActiveCount()])
        this.threadPool.shutdown()
        debugInfo(['强制关闭imgBasedScanner线程池，等待线程池关闭, 结果: {}', this.threadPool.awaitTermination(5, TimeUnit.SECONDS)])
        this.createNewThreadPool()
        break
      }
    }

    this.checkRunningCountdown(countingDownContainers)

    return this.getCollectResult()
  }

  /**
   * 获取所有的待校验节点
   * 
   * @param {*} intervalScreenForDetectHelp 
   * @param {*} intervalScreenForDetectCollect 
   */
  this.getAllCheckPoints = function (intervalScreenForDetectHelp, intervalScreenForDetectCollect) {
    let waitForCheckPoints = []

    let helpPoints = this.detectHelp(intervalScreenForDetectHelp)
    if (helpPoints && helpPoints.length > 0) {
      waitForCheckPoints = waitForCheckPoints.concat(helpPoints.map(
        helpPoint => {
          return {
            isHelp: true,
            point: helpPoint
          }
        })
      )
    }

    let collectPoints = this.detectCollect(intervalScreenForDetectCollect)
    if (collectPoints && collectPoints.length > 0) {
      waitForCheckPoints = waitForCheckPoints.concat(collectPoints.map(
        collectPoint => {
          return {
            isHelp: false,
            point: collectPoint
          }
        })
      )
    }
    return this.sortAndReduce(waitForCheckPoints)
  }

  /**
   * 校验可帮助节点，并获取中心点
   * 
   * @param {*} intervalScreenForDetectHelp 
   * @param {*} pointData 
   * @param {*} listWriteLock 
   * @param {*} countdownLatch 
   * @param {*} collectOrHelpList 
   */
  this.solveHelpPoint = function (intervalScreenForDetectHelp, pointData, listWriteLock, countdownLatch, collectOrHelpList) {
    let executeSuccess = false
    try {
      if (_config.collect_by_stroll_only) {
        return
      }
      let calculator = new ColorCenterCalculatorWithInterval(
        images.copy(intervalScreenForDetectHelp), _config.device_width - parseInt(200 * SCALE_RATE), pointData.point.x, pointData.point.y
      )
      calculator.setScriptLogger(SCRIPT_LOGGER)
      let point = calculator.getCenterPoint()
      debugInfo('可帮助收取位置：' + JSON.stringify(point))
      listWriteLock.lock()
      try {
        collectOrHelpList.push({
          point: point,
          isHelp: true
        })
        this.visualHelper.addRectangle('可帮助点', [point.left, point.top, point.right - point.left, point.bottom - point.top])
      } finally {
        executeSuccess = true
        countdownLatch.countDown()
        listWriteLock.unlock()
        calculator = null
      }
    } catch (e) {
      errorInfo(['区域检测线程执行异常: {}', e])
      _commonFunctions.printExceptionStack(e)
    } finally {
      if (!executeSuccess) {
        countdownLatch.countDown()
      }
    }
  }

  /**
   * 校验可收取节点
   * 
   * @param {*} point 
   * @param {*} listWriteLock 
   * @param {*} countdownLatch 
   * @param {*} collectOrHelpList 
   */
  this.solveCollectable = function (point, listWriteLock, countdownLatch, collectOrHelpList) {
    if (_config.collect_by_stroll_only) {
      return true
    }
    let executeSuccess = false
    debugInfo('可收取位置：' + JSON.stringify(point))
    if (_config.autoSetThreshold && _config.ocrThreshold > point.regionSame * 1.44) {
      _config.ocrThreshold = parseInt(point.regionSame * 1.44)
      infoLog('自动设置ocr阈值：' + _config.ocrThreshold)
      let configStorage = storages.create(_storage_name)
      configStorage.put('ocrThreshold', _config.ocrThreshold)
    }
    listWriteLock.lock()
    try {
      collectOrHelpList.push({ point: point, isHelp: false })
      countdownLatch.countDown()
      executeSuccess = true
      this.visualHelper.addRectangle('可收取点', [point.left, point.top, point.right - point.left, point.bottom - point.top])
    } finally {
      listWriteLock.unlock()
    }
    return executeSuccess
  }

  /**
   * 处理倒计时节点
   * 
   * @param {*} grayScreen 
   * @param {*} point 
   * @param {*} imgResolveLock 
   * @param {*} countdownLock 
   * @param {*} countingDownContainers 
   */
  this.solveCountdown = function (grayScreen, point, imgResolveLock, countdownLock, countingDownContainers) {
    if (!_config.is_cycle) {
      debugInfo('倒计时中：' + JSON.stringify(point) + ' 像素点总数：' + point.regionSame)
      let forOcrScreen = images.copy(grayScreen)
      let width = point.right - point.left
      let height = point.bottom - point.top
      let offset = parseInt((width > height ? height - height / Math.sqrt(2) : width - width / Math.sqrt(2)) * 0.9)
      let down_off = parseInt(offset / 4)
      let base64String = null
      imgResolveLock.lock()
      try {
        this.visualHelper.addRectangle('倒计时中', [point.left, point.top, width, height])
        let countdownImg = images.clip(forOcrScreen, point.left + offset + down_off, point.top + down_off, point.right - point.left - offset - down_off, point.bottom - point.top - offset)
        let scale = 30 / countdownImg.width
        if (_config.develop_mode) {
          debugForDev(['图片压缩前base64 「data:image/png;base64,{}」', images.toBase64(countdownImg)])
        }
        if (useMockOcr) {
          // 将图片压缩或者放大到1080P下的分辨率
          scale = 1 / _config.scaleRate
        }
        if (scale !== 1) {
          countdownImg = images.resize(countdownImg, [parseInt(countdownImg.width * scale), parseInt(countdownImg.height * scale)])
        }
        countdownImg = images.interval(countdownImg, '#FFFFFF', 40)

        try {
          base64String = images.toBase64(countdownImg)
          if (_config.saveBase64ImgInfo) {
            debugInfo(['[记录运行数据]像素点数：「{}」倒计时图片：「data:image/png;base64,{}」', point.regionSame, base64String])
          }
        } catch (e) {
          errorInfo('存储倒计时图片失败：' + e)
          _commonFunctions.printExceptionStack(e)
        }
      } finally {
        imgResolveLock.unlock()
      }

      if (base64String) {
        if (point.regionSame >= (_config.ocrThreshold || 2900) && this.min_countdown >= 2 || useMockOcr) {
          // Ocr识图API获取文本
          let countdown = OcrUtil.getImageNumber(base64String)
          if (isFinite(countdown) && countdown > 0) {
            countdownLock.lock()
            try {
              debugInfo('获取倒计时数据为：' + countdown)
              if (countdown < this.min_countdown) {
                debugInfo('设置最小倒计时：' + countdown)
                this.min_countdown = countdown
                this.min_countdown_pixels = point.regionSame
              }
              countingDownContainers.push({
                point: point,
                isCountdown: true,
                countdown: countdown,
                stamp: new Date().getTime()
              })
            } finally {
              countdownLock.unlock()
            }
          }

        } else {
          debugInfo(['当前倒计时校验最小像素阈值：{} 已获取最小倒计时：{}', (_config.ocrThreshold || 2900), this.min_countdown])
        }
      }
    }

  }

  /**
   * 下滑并校验是否到达底部
   * 
   * @param {*} grayScreen 
   * @param {*} count 
   */
  this.checkBottomAndRecycle = function (grayScreen, count) {
    automator.scrollDown()
    sleep(300)
    let screen = null
    let failed = false
    if (_config.checkBottomBaseImg) {
      if (!images.isValidImg(grayScreen)) {
        screen = _commonFunctions.checkCaptureScreenPermission()
        grayScreen = images.grayscale(screen)
      }
      let reached = _widgetUtils.reachBottom(grayScreen)
      if (reached) {
        grayScreen.recycle()
        // 二次校验，避免因为加载中导致的错误判断
        screen = _commonFunctions.checkCaptureScreenPermission()
        grayScreen = images.grayscale(screen)
        reached = _widgetUtils.reachBottom(grayScreen)
      }
      this.has_next = !reached
    } else {
      this.has_next = count < (_config.friendListScrollTime || 30)
    }
    // 每5次滑动判断一次是否在排行榜中
    if (this.has_next && count % 5 == 0) {
      if (!_widgetUtils.friendListWaiting()) {
        errorInfo('当前不在好友排行榜！')
        failed = true
      }
      if (!images.isValidImg(grayScreen)) {
        // 判断列表是否加载失败，重新上划 触发加载
        screen = _commonFunctions.checkCaptureScreenPermission()
        grayScreen = images.grayscale(screen)
      }
      if (!this.scrollUpIfNeeded(images.copy(grayScreen))) {
        if (++this.stroll_up_check_count >= 5) {
          warnInfo('滑动校验失败达到5次，重新执行')
          failed = true
        }
      } else {
        this.stroll_up_check_count = 0
      }
    }
    if (!this.has_next) {
      if (!_widgetUtils.friendListWaiting()) {
        errorInfo('当前不在好友排行榜！')
        failed = true
      }
    }
    grayScreen && grayScreen.recycle()
    return failed
  }

  /**
   * 执行收取动作
   * 
   * @param {*} collectOrHelpList 
   */
  this.operateCollectIfNeeded = function (collectOrHelpList) {
    if (!_config.collect_by_stroll_only) {
      if (collectOrHelpList && collectOrHelpList.length > 0) {
        debugInfo(['开始收集和帮助收取，总数：{}', collectOrHelpList.length])
        if (_config.develop_mode) {
          collectOrHelpList.forEach(target => {
            debugInfo(JSON.stringify(target))
          })
        }
        let noError = true
        collectOrHelpList.forEach(point => {
          if (noError) {
            if (false === this.collectTargetFriend(point)) {
              noError = false
            }
          }
        })
        if (!noError) {
          return EXECUTE_FAILED
        }
      } else {
        debugInfo('无可收取或帮助的内容')
      }
    } else {
      debugInfo('只通过逛一逛收集，跳过排行榜中的收取，仅识别倒计时')
    }
  }

  this.detectHelp = function (img) {
    let helpPoints = this.detectColors(img)
    if (helpPoints && helpPoints.length > 0) {
      debugInfo('可帮助的点：' + JSON.stringify(helpPoints))
    }
    return helpPoints
  }

  this.detectCollect = function (img) {
    let collectPoints = this.detectColors(img)
    if (collectPoints && collectPoints.length > 0) {
      debugInfo('可收取的点：' + JSON.stringify(collectPoints))
    }
    return collectPoints
  }

  this.detectColors = function (img) {
    let use_img = images.copy(img)
    let movingY = parseInt(180 * SCALE_RATE)
    let movingX = parseInt(100 * SCALE_RATE)
    debugForDev(['moving window size: [{},{}]', movingX, movingY])
    // 预留70左右的高度
    let endY = _config.device_height - movingY - 70 * SCALE_RATE
    let runningY = 440 * SCALE_RATE
    let startX = _config.device_width - movingX
    let regionWindow = []
    let findColorPoints = []
    let countdown = new Countdown()
    let hasNext = true
    do {
      if (runningY > endY) {
        runningY = endY
        hasNext = false
      }
      regionWindow = [startX, runningY, movingX, movingY]
      debugForDev('检测区域：' + JSON.stringify(regionWindow))
      let point = images.findColor(use_img, '#FFFFFF', {
        region: regionWindow
      })
      if (_config.develop_mode) {
        countdown.summary('检测初始点')
      }
      if (point) {
        findColorPoints.push(point)
      }
      runningY += movingY
      countdown.restart()
    } while (hasNext)
    return findColorPoints
  }
}

ImgBasedFriendListScanner.prototype = Object.create(BaseScanner.prototype)
ImgBasedFriendListScanner.prototype.constructor = ImgBasedFriendListScanner


ImgBasedFriendListScanner.prototype.collectTargetFriend = function (obj) {
  if (!obj.protect) {
    //automator.click(obj.target.centerX(), obj.target.centerY())
    debugInfo(['等待进入好友主页, 位置：「{}, {}」设备宽高：[{}, {}]', obj.point.x, obj.point.y, _config.device_width, _config.device_height])
    if (_config.develop_mode) {
      let screen = _commonFunctions.checkCaptureScreenPermission()
      let startY = obj.point.y - 32
      let height = _config.device_height - startY > 190 ? 190 : _config.device_height - startY - 1
      let rangeImg = images.clip(screen, 0, startY, _config.device_width, height)
      let base64 = images.toBase64(rangeImg)
      debugForDev(['点击区域「{}, {}」startY:{} 图片信息：「data:image/png;base64,{}」', obj.point.x, obj.point.y, startY, base64], false, true)
    }
    let restartLoop = false
    let count = 1
    automator.click(obj.point.x, obj.point.y)
    ///sleep(1000)
    while (!_widgetUtils.friendHomeWaiting()) {
      debugInfo(
        '未能进入主页，尝试再次进入 count:' + count++
      )
      automator.click(obj.point.x, obj.point.y)
      sleep(500)
      if (count >= 3) {
        warnInfo('重试超过3次，取消操作')
        restartLoop = true
        break
      }
    }
    if (restartLoop) {
      errorInfo('页面流程出错，重新开始')
      return false
    }
    let name = this.getFriendName()
    if (name) {
      obj.name = name
      debugInfo(['进入好友[{}]首页成功', obj.name])
    } else {
      errorInfo(['获取好友名称失败，请检查好友首页文本"XXX的蚂蚁森林"是否存在'])
    }
    let skip = false
    if (!skip && _config.white_list && _config.white_list.indexOf(obj.name) >= 0) {
      debugInfo(['{} 在白名单中不收取他', obj.name])
      skip = true
    }
    if (!skip && _commonFunctions.checkIsProtected(obj.name)) {
      warnInfo(['{} 使用了保护罩 不收取他', obj.name])
      skip = true
    }
    if (skip) {
      return this.returnToListAndCheck()
    }
    if (!obj.recheck) {
      this.protectInfoDetect(obj.name)
    } else {
      this.isProtected = false
      this.isProtectDetectDone = true
    }
    return this.doCollectTargetFriend(obj)
  }
  return true
}

ImgBasedFriendListScanner.prototype.checkRunningCountdown = function (countingDownContainers) {
  if (!_config.is_cycle && countingDownContainers.length > 0) {
    debugInfo(['倒计时中的好友数[{}]', countingDownContainers.length])
    let that = this
    countingDownContainers.forEach((item, idx) => {
      if (item.countdown <= 0) {
        return
      }
      let now = new Date()
      let stamp = item.stamp
      let count = item.countdown
      let passed = Math.round((now - stamp) / 60000.0)
      debugInfo([
        '需要计时[{}]分 经过了[{}]分 计时时间戳[{}]',
        count, passed, stamp
      ])
      if (passed >= count) {
        debugInfo('有一个记录倒计时结束')
        // 标记有倒计时结束的漏收了，收集完之后进行第二次收集
        that.recordLost('有倒计时结束')
      } else {
        let rest = count - passed
        that.min_countdown = rest < that.min_countdown ? rest : that.min_countdown
      }
    })
  }
}

function Countdown () {
  this.start = new Date().getTime()
  this.getCost = function () {
    return new Date().getTime() - this.start
  }

  this.summary = function (content) {
    debugInfo(content + ' 耗时' + this.getCost() + 'ms')
  }

  this.restart = function () {
    this.start = new Date().getTime()
  }

}
module.exports = ImgBasedFriendListScanner
