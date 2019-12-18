/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-11 09:17:29
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-18 19:02:20
 * @Description: 基于图像识别控件信息
 */
importClass(com.tony.BitCheck)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
let _widgetUtils = typeof WidgetUtils === 'undefined' ? require('../lib/WidgetUtils.js') : WidgetUtils
let automator = require('../lib/Automator.js')
let _commonFunctions = typeof commonFunctions === 'undefined' ? require('../lib/CommonFunction.js') : commonFunctions
let _config = typeof config === 'undefined' ? require('../config.js').config : config
let BaiduOcrUtil = require('../lib/BaiduOcrUtil.js')
let BaseScanner = require('./BaseScanner.js')
const _package_name = 'com.eg.android.AlipayGphone'

const Stack = function () {
  this.size = 0
  this.innerArray = []
  this.index = -1

  this.isEmpty = function () {
    return this.size === 0
  }

  this.push = function (val) {
    this.innerArray.push(val)
    this.index++
    this.size++
  }

  this.peek = function () {
    if (this.isEmpty()) {
      return null
    }
    return this.innerArray[this.index]
  }

  this.pop = function (val) {
    if (this.isEmpty()) {
      return null
    }
    this.size--
    return this.innerArray.splice(this.index--)[0]
  }

  this.print = function () {
    if (this.isEmpty()) {
      return
    }
    this.innerArray.forEach(val => {
      debugInfo(val)
    })
  }
}

const SCALE_RATE = device.width / 1080
const ANALYZE_WIDTH = parseInt(200 * SCALE_RATE)
const BIT_MAX_VAL = device.height << 8 | ANALYZE_WIDTH
debugInfo(['初始化 BitMap最大值为:{} 小手分析宽度:{} 缩放比例：{}', BIT_MAX_VAL, ANALYZE_WIDTH, SCALE_RATE])
// 计算中心点
function ColorRegionCenterCalculator (img, point, threshold) {
  // Java打包的位运算方式
  this.bitChecker = new BitCheck(BIT_MAX_VAL)

  // 在外部灰度化
  this.img = images.copy(img)
  this.color = img.getBitmap().getPixel(point.x, point.y) >> 8 & 0xFF
  // this.color = color
  this.point = point
  this.threshold = threshold
  // 回收原始图像
  img.recycle()

  /**
   * 获取所有同色区域的点集合
   */
  this.getAllColorRegionPoints = function () {
    let nearlyColorPoints = this.getNearlyNorecursion(this.point)
    nearlyColorPoints = nearlyColorPoints || []
    // 回收图像资源
    this.img.recycle()
    return nearlyColorPoints
  }

  /**
   * 获取颜色中心点
   */
  this.getColorRegionCenter = function () {
    let maxX = -1
    let minX = device.width + 10
    let maxY = -1
    let minY = device.height + 10
    debugInfo(['准备获取[{}]的同色[{}]点区域', JSON.stringify(this.point), colors.toString(this.color)])
    let nearlyColorPoints = this.getAllColorRegionPoints()
    if (nearlyColorPoints && nearlyColorPoints.length > 0) {
      nearlyColorPoints.forEach((item, idx) => {
        if (maxX < item.x) {
          maxX = item.x
        }
        if (minX > item.x) {
          minX = item.x
        }
        if (maxY < item.y) {
          maxY = item.y
        }
        if (minY > item.y) {
          minY = item.y
        }
      })
      let center = {
        top: minY,
        bottom: maxY,
        left: minX,
        right: maxX,
        x: parseInt((maxX + minX) / 2),
        y: parseInt((maxY + minY) / 2),
        same: nearlyColorPoints.length
      }
      // debugInfo('获取中心点位置为：' + JSON.stringify(center))
      return center
    } else {
      debugInfo(['没有找到同色点 原始位置：「{}」 颜色：「{}」', JSON.stringify(this.point), colors.toString(this.color)])
      return this.point
    }
  }


  this.isOutofScreen = function (point) {
    let width = device.width
    let height = device.height
    if (point.x >= width || point.x < 0 || point.y < 0 || point.y >= height) {
      return true
    }
    return false
  }

  this.getNearlyNorecursion = function (point) {
    let directs = [
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0]
    ]
    let stack = new Stack()
    stack.push(point)
    let nearlyPoints = [point]
    this.isUncheckedBitJava(point)
    let step = 0
    let totalStart = new Date().getTime()
    while (!stack.isEmpty()) {
      let target = stack.peek()
      let allChecked = true
      for (let i = 0; i < 4; i++) {
        let direction = directs[i]
        let checkItem = this.getDirectionPoint(target, direction)
        if (!checkItem) {
          continue
        }
        step++
        allChecked = false
        // 灰度化图片颜色比较
        let checkColor = this.img.getBitmap().getPixel(checkItem.x, checkItem.y) >> 8 & 0xFF
        if (Math.abs(checkColor - this.color) < this.threshold) {
          nearlyPoints.push(checkItem)
          stack.push(checkItem)
        }
      }
      if (allChecked) {
        stack.pop()
      }
    }
    debugInfo([
      '原始点：{} 颜色：{}, 找了多个点 总计步数：{} 总耗时：{}ms 同色点个数：{}',
      JSON.stringify(this.point), colors.toString(this.color), step,
      new Date().getTime() - totalStart, nearlyPoints.length
    ])
    return nearlyPoints
  }

  this.isUncheckedBitJava = function (point) {
    let x_start = device.width - ANALYZE_WIDTH
    if (point.x < x_start) {
      return false
    }
    return this.bitChecker.isUnchecked(point.y << 8 | (point.x - x_start))
  }

  this.getDirectionPoint = function (point, direct) {
    // debugInfo('准备获取附近节点:' + JSON.stringify(point))
    let nearPoint = {
      x: point.x + direct[0],
      y: point.y + direct[1]
    }
    if (this.isOutofScreen(nearPoint) || !this.isUncheckedBitJava(nearPoint)) {
      return null
    }
    return nearPoint
  }

}

const ImgBasedFriendListScanner = function () {
  BaseScanner.call(this)
  this.threadPool = null
  this.min_countdown_pixels = 10

  this.init = function (option) {
    this.current_time = option.currentTime || 0
    this.increased_energy = option.increasedEnergy || 0
    this.threadPool = new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(256))
  }

  this.start = function () {
    this.increased_energy = 0
    this.min_countdown = 10000
    this.min_countdown_pixels = 10
    debugInfo('图像分析即将开始')
    return this.collecting()
  }

  this.sortAndReduce = function (points, gap) {
    gap = gap || 110
    // 默认情况下已经排序了 没必要再次排序
    let last = -gap - 1
    let resultPoints = []
    if (points && points.length > 0) {
      points.forEach(point => {
        if (point.y - last > gap) {
          resultPoints.push(point)
          last = point.y
        } else {
          // 距离过近的丢弃
          debugInfo('丢弃距离较上一个比较近的：' + JSON.stringify(point))
        }
      })
      debugInfo('重新分析后的点：' + JSON.stringify(resultPoints))
    }
    return resultPoints
  }

  this.destory = function () {
    this.threadPool.shutdownNow()
    this.threadPool = null
  }

  this.reachBottom = function (grayImg) {
    let virtualButtonHeight = _config.virtualButtonHeight | 0
    let height = device.height - virtualButtonHeight
    for (let startY = 5; startY < 50; startY++) {
      let colorGreen = grayImg.getBitmap().getPixel(10, height - startY) >> 8 & 0xFF
      if (Math.abs(colorGreen - 245) > 4) {
        return false
      }
    }
    return true
  }
  this.collecting = function () {
    let screen = null
    let grayScreen = null
    // console.show()
    let countingDownContainers = []
    let count = 0
    let hasNext = true
    let that = this
    do {
      screen = _commonFunctions.checkCaptureScreenPermission()
      // 重新复制一份
      let tmpImg = images.copy(screen)
      grayScreen = images.grayscale(tmpImg)
      tmpImg.recycle()
      debugInfo('获取到screen' + (screen === null ? '失败' : '成功'))
      let countdown = new Countdown()
      let waitForCheckPoints = []
      if (_config.help_friend) {
        let helpPoints = this.sortAndReduce(this.detectHelp(screen))
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
      }
      let collectPoints = this.sortAndReduce(this.detectCollect(screen))
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
      countdown.summary('获取可帮助和可能可收取的点')
      if (waitForCheckPoints.length > 0) {
        countdown.restart()
        let countdownLatch = new CountDownLatch(waitForCheckPoints.length)
        let listWriteLock = threads.lock()
        let countdownLock = threads.lock()
        let collectOrHelpList = []
        waitForCheckPoints.forEach(pointData => {
          if (pointData.isHelp) {
            this.threadPool.execute(function () {
              let calculator = new ColorRegionCenterCalculator(images.copy(grayScreen), pointData.point, _config.color_offset)
              let point = calculator.getColorRegionCenter()
              debugInfo('可帮助收取位置：' + JSON.stringify(point))
              listWriteLock.lock()
              collectOrHelpList.push({
                point: point,
                isHelp: true
              })
              countdownLatch.countDown()
              listWriteLock.unlock()
              calculator = null
            })
          } else {
            this.threadPool.execute(function () {
              let calculator = new ColorRegionCenterCalculator(images.copy(grayScreen), pointData.point, _config.color_offset)
              let point = calculator.getColorRegionCenter()
              if (point.same < (_config.finger_img_pixels || 2300)) {
                debugInfo('可能可收取位置：' + JSON.stringify(point))
                listWriteLock.lock()
                collectOrHelpList.push({ point: point, isHelp: false })
                countdownLatch.countDown()
                listWriteLock.unlock()
              } else {
                debugInfo('倒计时中：' + JSON.stringify(point) + ' 像素点总数：' + point.same)
                // 直接标记执行完毕 将OCR请求交给异步处理
                countdownLatch.countDown()
                if (_config.useOcr) {
                  let countdownImg = images.clip(grayScreen, point.left, point.top, point.right - point.left, point.bottom - point.top)
                  let base64String = null
                  try {
                    base64String = images.toBase64(countdownImg)
                    countdownImg.recycle()
                    if (_config.saveBase64ImgInfo) {
                      debugInfo(['[记录运行数据]像素点数：「{}」倒计时图片：「{}」', point.same, base64String])
                    }
                  } catch (e) {
                    errorInfo('存储倒计时图片失败：' + e)
                  }
                  if (base64String) {
                    if (point.same > (_config.ocrThresold || 2900) && that.min_countdown >= 2) {
                      // 百度识图API获取文本
                      let result = BaiduOcrUtil.recoginze(base64String)
                      if (result && result.words_result_num > 0) {
                        let filter = result.words_result.filter(r => isFinite(parseInt(r.words)))
                        if (filter && filter.length > 0) {
                          debugInfo('百度识图结果：' + JSON.stringify(filter))
                          countdownLock.lock()
                          let countdown = parseInt(filter[0].words)
                          if (countdown < that.min_countdown) {
                            debugInfo('设置最小倒计时：' + countdown)
                            that.min_countdown = countdown
                            that.min_countdown_pixels = point.same
                          }
                          countingDownContainers.push({
                            countdown: countdown,
                            stamp: new Date().getTime()
                          })
                          countdownLock.unlock()
                        }
                      }
                    }
                  }
                }
              }
              calculator = null
            })
          }
        })
        // 等待五秒
        if (!countdownLatch.await(5, TimeUnit.SECONDS)) {
          let activeCount = this.threadPool.getActiveCount()
          errorInfo('有线程执行失败 运行中的线程数：' + activeCount)
          if (activeCount > 0) {
            debugInfo('将线程池关闭然后重建线程池')
            this.threadPool.shutdownNow()
            this.threadPool = new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(1024))
          }
        }
        countdown.summary('分析所有可帮助和可收取的点')
        if (collectOrHelpList && collectOrHelpList.length > 0) {
          debugInfo(['开始收集和帮助收取，总数：{}', collectOrHelpList.length])
          let noError = true
          collectOrHelpList.forEach(point => {
            if (noError) {
              if (false === that.collectTargetFriend(point)) {
                noError = false
              }
            }
          })
          if (!noError) {
            // true is error
            return true
          }
        } else {
          debugInfo('无可收取或帮助的内容')
        }
      }
      automator.scrollDown()
      sleep(500)
      count++
      if (_config.checkBottomBaseImg) {
        let reached = this.reachBottom(grayScreen)
        if (reached) {
          // 二次校验，避免因为加载中导致的错误判断
          let newScreen = _commonFunctions.checkCaptureScreenPermission()
          let newGrayScreen = images.grayscale(newScreen)
          reached = this.reachBottom(newGrayScreen)
          newScreen.recycle()
          newGrayScreen.recycle()
        }
        hasNext = !reached
      } else {
        hasNext = count < (_config.friendListScrollTime || 30)
      }
      screen.recycle()
      grayScreen.recycle()
      // 每5次滑动判断一次是否在排行榜中
      if (hasNext && count % 5 == 0 && !_widgetUtils.friendListWaiting()) {
        errorInfo('当前不在好友排行榜！')
        // true is error
        return true
      }
    } while (hasNext)
    let poolWaitCount = 0
    while (this.threadPool.getActiveCount() > 0) {
      debugInfo(['当前线程池还有工作线程未结束，继续等待。运行中数量：{}', this.threadPool.getActiveCount()])
      sleep(100)
      poolWaitCount++
      // 当等待超过两秒时 结束线程池
      if (poolWaitCount > 20) {
        warnInfo(['线程池等待执行结束超时，当前剩余运行中数量：{} 强制结束', this.threadPool.getActiveCount()])
        this.threadPool.shutdownNow()
        this.threadPool = new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(256))
        break
      }
    }
    if (countingDownContainers.length > 0) {
      this.lost_someone = this.checkRunningCountdown(countingDownContainers)
    }
    automator.back()
    return {
      minCountdown: this.min_countdown,
      lostSomeone: this.lost_someone
    }
  }

  this.detectHelp = function (img) {
    let helpPoints = this.detectColors(img, _config.can_help_color || '#f99236')
    debugInfo('可帮助的点：' + JSON.stringify(helpPoints))
    return helpPoints
  }

  this.detectCollect = function (img) {
    let collectPoints = this.detectColors(img, _config.can_collect_color || '#1da06a')
    debugInfo('可收取的点：' + JSON.stringify(collectPoints))
    return collectPoints
  }

  this.detectColors = function (img, color) {
    debugInfo('准备检测颜色：' + color)

    let movingY = parseInt(200 * SCALE_RATE)
    let movingX = parseInt(100 * SCALE_RATE)
    // 预留70左右的高度
    let endY = device.height - movingY - 70 * SCALE_RATE
    let runningY = 440 * SCALE_RATE
    let startX = device.width - movingX
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
      let point = images.findColor(img, color, {
        region: regionWindow,
        threshold: _config.color_offset || 20
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

ImgBasedFriendListScanner.prototype.returnToListAndCheck = function () {
  automator.back()
  sleep(500)
  let returnCount = 0
  while (!_widgetUtils.friendListWaiting()) {
    sleep(500)
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

ImgBasedFriendListScanner.prototype.collectTargetFriend = function (obj) {
  let rentery = false
  if (!obj.protect) {
    let temp = this.protectDetect(_package_name)
    //automator.click(obj.target.centerX(), obj.target.centerY())
    debugInfo('等待进入好友主页')
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
    let title = textContains('的蚂蚁森林')
      .findOne(_config.timeout_findOne)
      .text()
    obj.name = title.substring(0, title.indexOf('的'))
    let skip = false
    if (!skip && _config.white_list && _config.white_list.indexOf(obj.name) > 0) {
      debugInfo(['{} 在白名单中不收取他', obj.name])
      skip = true
    }
    if (!skip && _commonFunctions.checkIsProtected(obj.name)) {
      debugInfo(['{} 使用了保护罩 不收取他'])
      skip = true
    }
    if (!skip && this.protectInfoDetect()) {
      warnInfo(['{} 好友已使用能量保护罩，跳过收取', obj.name])
      skip = true
    }
    if (skip) {
      return this.returnToListAndCheck()
    }
    debugInfo('准备开始收取')

    let preGot
    let preE
    try {
      preGot = _widgetUtils.getYouCollectEnergy() || 0
      preE = _widgetUtils.getFriendEnergy()
    } catch (e) { errorInfo("[" + obj.name + "]获取收集前能量异常" + e) }
    if (_config.help_friend) {
      rentery = this.collectAndHelp(obj.isHelp)
    } else {
      this.collectEnergy()
    }
    try {
      let postGet = _widgetUtils.getYouCollectEnergy() || 0
      let postE = _widgetUtils.getFriendEnergy()
      if (!obj.isHelp && postGet !== null && preGot !== null) {
        let gotEnergy = postGet - preGot
        debugInfo("开始收集前:" + preGot + "收集后:" + postGet)
        if (gotEnergy) {
          let needWaterback = _commonFunctions.recordFriendCollectInfo({
            friendName: obj.name,
            friendEnergy: postE,
            postCollect: postGet,
            preCollect: preGot,
            helpCollect: 0
          })
          try {
            if (needWaterback) {
              _widgetUtils.wateringFriends()
              gotEnergy -= 10
            }
          } catch (e) {
            errorInfo('收取[' + obj.name + ']' + gotEnergy + 'g 大于阈值:' + _config.wateringThreshold + ' 回馈浇水失败 ' + e)
          }
          logInfo([
            "收取好友:{} 能量 {}g {}",
            obj.name, gotEnergy, (needWaterback ? '其中浇水10g' : '')
          ])
          this.showCollectSummaryFloaty(gotEnergy)
        } else {
          debugInfo("收取好友:" + obj.name + " 能量 " + gotEnergy + "g")
        }
      } else if (obj.isHelp && postE !== null && preE !== null) {
        let gotEnergy = postE - preE
        debugInfo("开始帮助前:" + preE + " 帮助后:" + postE)
        if (gotEnergy) {
          logInfo("帮助好友:" + obj.name + " 回收能量 " + gotEnergy + "g")
          _commonFunctions.recordFriendCollectInfo({
            friendName: obj.name,
            friendEnergy: postE,
            postCollect: postGet,
            preCollect: preGot,
            helpCollect: gotEnergy
          })
        } else {
          debugInfo("帮助好友:" + obj.name + " 回收能量 " + gotEnergy + "g")
        }
      }
    } catch (e) {
      errorInfo("[" + obj.name + "]获取收取后能量异常" + e)
    }
    temp.interrupt()
    debugInfo('好友能量收取完毕, 回到好友排行榜')
    if (false === this.returnToListAndCheck()) {
      return false
    }
    if (rentery) {
      obj.isHelp = false
      return this.collectTargetFriend(obj)
    }
  }
  return true
}

ImgBasedFriendListScanner.prototype.checkRunningCountdown = function (countingDownContainers) {
  if (!_config.is_cycle && countingDownContainers.length > 0) {
    debugInfo(['倒计时中的好友数[{}]', countingDownContainers.length])
    let that = this
    countingDownContainers.forEach((item, idx) => {
      let now = new Date()
      let stamp = item.stamp
      let count = item.countdown
      let passed = Math.round((now - stamp) / 60000.0)
      debugInfo([
        '需要计时[{}]分\t经过了[{}]分\t计时时间戳[{}]',
        count, passed, stamp
      ])
      if (passed >= count) {
        debugInfo('有一个记录倒计时结束')
        // 标记有倒计时结束的漏收了，收集完之后进行第二次收集
        return true
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
    debugInfo(content + '耗时' + this.getCost() + 'ms')
  }

  this.restart = function () {
    this.start = new Date().getTime()
  }

}
module.exports = ImgBasedFriendListScanner