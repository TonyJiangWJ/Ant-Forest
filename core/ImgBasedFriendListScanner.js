/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-11 09:17:29
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-13 22:00:28
 * @Description: 
 */
importClass(com.tony.BitCheck)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
let _widgetUtils = typeof WidgetUtils === 'undefined' ? require('../lib/WidgetUtils.js') : WidgetUtils
let automator = require('../lib/Automator.js')
let _commonFunctions = typeof commonFunctions === 'undefined' ? require('../lib/CommonFunction.js') : commonFunctions
let _FloatyInstance = typeof FloatyInstance === 'undefined' ? require('../lib/FloatyUtil.js') : FloatyInstance
let _config = typeof config === 'undefined' ? require('../config.js').config : config
let FileUtils = require('../lib/FileUtils.js')
let BaiduOcrUtil = require('../lib/BaiduOcrUtil.js')
let _avil_list = []
let _increased_energy = 0
let _collect_any = false
let _min_countdown = 10000
let _min_countdown_pixels = 10
let _lost_someone = false
let _current_time = 0

const _package_name = 'com.eg.android.AlipayGphone'


/**
 * 展示当前累积收集能量信息，累加已记录的和当前运行轮次所增加的
 * 
 * @param {本次增加的能量值} increased
 */
const showCollectSummaryFloaty = function (increased) {
  increased = increased || 0
  _increased_energy += increased
  if (_config.is_cycle) {
    _commonFunctions.showCollectSummaryFloaty0(_increased_energy, _current_time, increased)
  } else {
    _commonFunctions.showCollectSummaryFloaty0(null, null, _increased_energy)
  }
}

/**
 * 收集目标能量球能量
 * 
 * @param {*} energy_ball 能量球对象
 * @param {boolean} isDesc 是否是desc类型
 */
const collectBallEnergy = function (energy_ball, isDesc) {
  if (_config.skip_five && !isOwn) {
    let regexCheck = /(\d+)克/
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
  _collect_any = true
  sleep(300)
}

// 收取能量
const collectEnergy = function (own) {
  let isOwn = own || false
  let ballCheckContainer = _widgetUtils.widgetGetAll(_config.collectable_energy_ball_content, null, true)
  if (ballCheckContainer !== null) {
    debugInfo('能量球存在')
    ballCheckContainer.target
      .forEach(function (energy_ball) {
        collectBallEnergy(energy_ball, isOwn, ballCheckContainer.isDesc)
      })
  } else {
    debugInfo('无能量球可收取')
  }
}

// 收取能量同时帮好友收取
const collectAndHelp = function (needHelp) {
  // 收取好友能量
  collectEnergy()
  let screen = null
  _commonFunctions.waitFor(function () {
    screen = captureScreen()
  }, 500)
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
    energyBalls.forEach(function (energy_ball) {
      let bounds = energy_ball.bounds()
      let o_x = bounds.left,
        o_y = bounds.top,
        o_w = bounds.width() + 20,
        o_h = bounds.height() + 20,
        threshold = _config.color_offset
      for (let color of colors)
        if (
          images.findColor(screen, color, {
            region: [o_x, o_y, o_w, o_h],
            threshold: threshold
          })
        ) {
          automator.clickCenter(energy_ball)
          helped = true
          _collect_any = true
          sleep(200)
          debugInfo("找到帮收取能量球颜色匹配" + color)
          break
        }
    })
    if (!helped && needHelp) {
      warnInfo(['未能找到帮收能量球需要增加匹配颜色组 当前{}', colors])
    }
    // 当数量大于等于6且帮助收取后，重新进入
    if (helped && length >= 6) {
      debugInfo('帮助了 且有六个球 重新进入')
      return true
    } else {
      debugInfo(['帮助了 但是只有{}个球 不重新进入', length])
    }
  }
}

// 判断并记录保护罩
const recordProtected = function (toast) {
  if (toast.indexOf('能量罩') > 0) {
    recordCurrentProtected()
  }
}

const recordCurrentProtected = function () {
  let title = textContains('的蚂蚁森林')
    .findOne(_config.timeout_findOne)
    .text()
  _commonFunctions.addNameToProtect(title.substring(0, title.indexOf('的')))
}

// 检测能量罩
const protectDetect = function (filter) {
  filter = typeof filter == null ? '' : filter
  // 在新线程中开启监听
  return threads.start(function () {
    events.onToast(function (toast) {
      if (toast.getPackageName().indexOf(filter) >= 0)
        recordProtected(toast.getText())
    })
  })
}

const protectInfoDetect = function () {
  let usingInfo = _widgetUtils.widgetGetOne(_config.using_protect_content, 50, true, true)
  if (usingInfo !== null) {
    let target = usingInfo.target
    debugInfo(['found using protect info, bounds:{}', target.bounds()], true)
    let parent = target.parent().parent()
    let targetRow = parent.row()
    let time = parent.child(1).text()
    if (!time) {
      time = parent.child(1).desc()
    }
    let isToday = true
    let yesterday = _widgetUtils.widgetGetOne('昨天', 50, true, true)
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
    }
    debugInfo(['using time:{}-{} rows: yesterday[{}] target[{}]', (isToday ? '今天' : '昨天'), time, yesterdayRow, targetRow], true)
    recordCurrentProtected()
    return true
  } else {
    debugInfo('not found using protect info')
  }
  return false
}

const collectTargetFriend = function (obj) {
  let rentery = false
  if (!obj.protect) {
    let temp = protectDetect(_package_name)
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
      if (count > 5) {
        warnInfo('重试超过5次，取消操作')
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
    if (!skip && protectInfoDetect()) {
      warnInfo(['{} 好友已使用能量保护罩，跳过收取', obj.name])
      skip = true
    }
    if (skip) {
      automator.back()
      return
    }
    debugInfo('准备开始收取')

    let preGot
    let preE
    try {
      preGot = _widgetUtils.getYouCollectEnergy() || 0
      preE = _widgetUtils.getFriendEnergy()
    } catch (e) { errorInfo("[" + obj.name + "]获取收集前能量异常" + e) }
    if (_config.help_friend) {
      rentery = collectAndHelp(obj.isHelp)
    } else {
      collectEnergy()
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
          showCollectSummaryFloaty(gotEnergy)
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
    automator.back()
    sleep(500)
    temp.interrupt()
    debugInfo('好友能量收取完毕, 回到好友排行榜')
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
    if (rentery) {
      obj.isHelp = false
      return collectTargetFriend(obj)
    }
  }
  return true
}

const checkRunningCountdown = function (countingDownContainers) {
  if (!_config.is_cycle && countingDownContainers.length > 0) {
    debugInfo(['倒计时中的好友数[{}]', countingDownContainers.length])
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
        _min_countdown = rest < _min_countdown ? rest : _min_countdown
      }
    })
  }
}

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

const BIT_MAX_VAL = device.height * 1000 + 200
// 计算中心点
function ColorRegionCenterCalculator (img, point, threshold) {
  // Java打包的位运算方式
  this.bitChecker = new BitCheck(BIT_MAX_VAL)
  let s = new Date().getTime()
  // 在外部灰度化
  this.img = img
  this.color = img.getBitmap().getPixel(point.x, point.y) >> 8 & 0xFF
  // this.color = color
  this.point = point
  this.threshold = threshold

  /**
   * 获取所有同色区域的点集合
   */
  this.getAllColorRegionPoints = function () {
    let nearlyColorPoints = this.getNearlyNorecursion(this.point)
    nearlyColorPoints = nearlyColorPoints || []
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
        let checkColor = img.getBitmap().getPixel(checkItem.x, checkItem.y) >> 8 & 0xFF
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
    if (point.x < 880) {
      return false
    }
    // 1080 - 200 = 880
    return this.bitChecker.isUnchecked((point.x - 880) * 10000 + point.y)
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

function ImgBasedFriendListScanner () {

  this.threadPool = null

  this.init = function (option) {
    _current_time = option.currentTime || 0
    _increased_energy = option.increasedEnergy || 0
    this.threadPool = new ThreadPoolExecutor(4, 8, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(1024))
  }

  this.start = function () {
    _increased_energy = 0
    _min_countdown = 10000
    _min_countdown_pixels = 10
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
    let height = device.height
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
    do {
      screen = _commonFunctions.checkCaptureScreenPermission()
      // 重新复制一份
      screen = images.copy(screen)
      grayScreen = images.grayscale(images.copy(screen))
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
                if (_config.useOcr) {
                  let countdowmImg = images.clip(grayScreen, point.left, point.top, point.right - point.left, point.bottom - point.top)
                  let base64String = null
                  try {
                    base64String = images.toBase64(countdowmImg)
                    debugInfo(['倒计时图片：「{}」', base64String])
                  } catch (e) {
                    errorInfo('存储倒计时图片失败：' + e)
                  }
                  if (base64String) {
                    if (point.same > (_config.ocrThresold || 2900) && _min_countdown >= 2) {
                      // 百度识图API获取文本
                      let result = BaiduOcrUtil.recoginze(base64String)
                      if (result && result.words_result_num > 0) {
                        let filter = result.words_result.filter(r => isFinite(parseInt(r.words)))
                        if (filter && filter.length > 0) {
                          debugInfo('百度识图结果：' + JSON.stringify(filter))
                          countdownLock.lock()
                          let countdown = parseInt(filter[0].words)
                          if (countdown < _min_countdown) {
                            debugInfo('设置最小倒计时：' + countdown)
                            _min_countdown = countdown
                            _min_countdown_pixels = point.same
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
                listWriteLock.lock()
                countdownLatch.countDown()
                listWriteLock.unlock()
              }
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
          collectOrHelpList.forEach(point => {
            collectTargetFriend(point)
            sleep(100)
          })
        } else {
          debugInfo('无可收取或帮助的内容')
        }
      }
      automator.scrollDown()
      sleep(500)
      if (_config.checkBottomBaseImg) {
        hasNext = !this.reachBottom(grayScreen)
      } else {
        hasNext = count++ < (_config.friendListScrollTime || 30)
      }
    } while (hasNext)
    if (countingDownContainers.length > 0) {
      _lost_someone = checkRunningCountdown(countingDownContainers)
    }
    automator.back()
    return {
      minCountdown: _min_countdown,
      lostSomeone: _lost_someone
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
    let scaleRate = device.width / 1080
    let movingY = parseInt(200 * scaleRate)
    let movingX = parseInt(100 * scaleRate)
    // 预留70左右的高度
    let endY = device.height - movingY - 70 * scaleRate
    let runningY = 440 * scaleRate
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
      debugInfo('检测区域：' + JSON.stringify(regionWindow))
      let point = images.findColor(img, color, {
        region: regionWindow,
        threshold: _config.color_offset || 20
      })
      countdown.summary('检测初始点')
      if (point) {
        findColorPoints.push(point)
      }
      runningY += movingY
      countdown.restart()
    } while (hasNext)
    return findColorPoints
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