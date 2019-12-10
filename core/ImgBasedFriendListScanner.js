/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-11 09:17:29
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-06 15:30:10
 * @Description: 
 */
importClass(com.tony.BitCheck)
let _widgetUtils = typeof WidgetUtils === 'undefined' ? require('../lib/WidgetUtils.js') : WidgetUtils
let automator = require('../lib/Automator.js')
let _commonFunctions = typeof commonFunctions === 'undefined' ? require('../lib/CommonFunction.js') : commonFunctions
let _FloatyInstance = typeof FloatyInstance === 'undefined' ? require('../lib/FloatyUtil.js') : FloatyInstance
let _config = typeof config === 'undefined' ? require('../config.js').config : config
let FileUtils = require('../lib/FileUtils.js')

let _avil_list = []
let _increased_energy = 0
let _collect_any = false
let _min_countdown = 10000
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
      return true
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
    debugInfo('等待进入好友主页：' + obj.name)
    let restartLoop = false
    let count = 1
    automator.click(obj.point.x, obj.point.y)
    ///sleep(1000)
    while (!_widgetUtils.friendHomeWaiting()) {
      debugInfo(
        '未能进入主页，尝试再次进入 count:' + count++
      )
      automator.click(obj.point.x, obj.point.y)
      sleep(1000)
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
    if (protectInfoDetect()) {
      warnInfo(['{} 好友已使用能量保护罩，跳过收取', obj.name])
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
    temp.interrupt()
    debugInfo('好友能量收取完毕, 回到好友排行榜')
    let returnCount = 0
    while (!_widgetUtils.friendListWaiting()) {
      sleep(1000)
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

// 根据可收取列表收取好友
const collectAvailableList = function () {
  while (_avil_list.length) {
    if (false === collectTargetFriend(_avil_list.shift())) {
      warnInfo('收取目标好友失败，向上抛出')
      return false
    }
  }
}


/**
 * 记录好友信息
 * @param {Object} screen
 */
const checkAvailiable = function (point, isHelp) {
  automator.click(point.x, point.y)
  let temp = {}
  // TODO 获取好友名称
  let container = ''
  // 记录好友ID
  temp.name = container.name
  // 记录是否有保护罩
  temp.protect = _commonFunctions.checkIsProtected(temp.name)
  // 记录是否是帮助收取
  temp.isHelp = isHelp
  // 不在白名单的 添加到可收取列表
  if (_config.white_list.indexOf(temp.name) < 0) {
    _avil_list.push(temp)
  }
}

function BFSColorCenterCalculator (img, color, point, threshold) {
  this.img = img
  this.color = color
  this.point = point
  this.threshold = threshold

  this.nearbyNodes = new this.Queue()


  this.init = function () {

  }




  this.Queue = function () {
    this.nodes = []
    this.size = 0
    this.idxEnd = 0
    this.idxStart = 0

    this.dequeue = function () {
      if (this.size > 0) {
        return this.nodes[this.idxStart++]
      }
    }

    this.push = function (item) {
      this.size++
      this.nodes.push(item)
      this.idxEnd++
    }

    this.isEmpty = function () {
      return this.size === 0
    }
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
      console.log(val)
    })
  }
}

function CheckBit (maxVal) {
  this.BUFFER_LENGTH = Math.ceil(maxVal / 8)
  this.BYTE_SIZE = 1 << 3
  this.bytes = []
  this.init()
}

CheckBit.prototype.init = function () {
  this.bytes = Array(this.BUFFER_LENGTH + 1).join(0).split('')
}

CheckBit.prototype.setBit = function (val) {
  let idx = ~~(val / this.BYTE_SIZE)
  let posi = 1 << (val % this.BYTE_SIZE)
  let unset = (this.bytes[idx] & posi) !== posi
  this.bytes[idx] = this.bytes[idx] | posi
  return unset
}

CheckBit.prototype.isUnchecked = function (point) {
  if (point.x < 880) {
    return false
  }
  // 1080 - 200 = 880
  return this.setBit((point.x - 880) * 10000 + point.y)
}


const BIT_MAX_VAL = 200 * 10000 + 2160
// 计算中心点
function ColorRegionCenterCalculator (img, color, point, threshold) {
  // 列表方式判断是否已校验
  this.checkedPoint = []
  // 对象hash方式
  this.checkedHash = {}
  // JavaScript位运算方式
  this.checkBit = new CheckBit(BIT_MAX_VAL)
  // Java打包的位运算方式
  this.bitChecker = new BitCheck(BIT_MAX_VAL)
  this.checkedX = []
  this.checkedY = []
  this.img = img
  this.color = color
  this.point = point
  this.threshold = threshold

  /**
   * 获取所有同色区域的点集合
   */
  this.getAllColorRegionPoints = function () {
    // this.checkedPoint.push(this.point)
    // this.checkedX = [this.point.x]
    // this.checkedY = [this.point.y]
    // let nearlyColorPoints = this.getNearly(point)
    log('初始点：' + JSON.stringify(this.point))
    let nearlyColorPoints = this.getNearlyNorecursion(this.point)
    nearlyColorPoints = nearlyColorPoints || []
    // nearlyColorPoints.push(point)
    // log('颜色检测完毕同色像素点总数：' + nearlyColorPoints.length + '校验像素点总数：' + this.checkedPoint.length )
    // sleep(5000)
    // log('同色像素点总数：' + nearlyColorPoints.length + '\n集合：' + JSON.stringify(nearlyColorPoints))
    // log('校验像素点总数：' + this.checkedPoint.length + '\n集合' + JSON.stringify(this.checkedPoint))
    return nearlyColorPoints
  }

  /**
   * 获取颜色中心点
   */
  this.getColorRegionCenter = function () {
    let maxX = -1
    let minX = 1080 + 10
    let maxY = -1
    let minY = 20000

    let nearlyColorPoints = this.getAllColorRegionPoints()
    if (nearlyColorPoints && nearlyColorPoints.length > 0) {
      console.log('同色点总数：' + nearlyColorPoints.length)
      let start = new Date().getTime()
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
      log('计算中心点耗时' + (new Date().getTime() - start) + 'ms')
      let center = {
        x: parseInt((maxX + minX) / 2),
        y: parseInt((maxY + minY) / 2),
        same: nearlyColorPoints.length
      }
      // log('获取中心点位置为：' + JSON.stringify(center))
      return center
    } else {
      console.log('没有找到同色点 原始位置：' + JSON.stringify(this.point))
      return this.point
    }
  }


  this.isOutofScreen = function (point) {
    let width = 1080
    let height = 2160
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
    this.checkedPoint.push(point)
    // this.isUnchecked(point)
    // this.isUncheckedHash(point)
    // this.isUncheckedBit(point)
    this.isUncheckedBitJava(point)
    let step = 0
    let totalStart = new Date().getTime()
    // let totalCheckAndCreate = 0
    // let totalCheckColor = 0
    // let timestamp = 0
    while (!stack.isEmpty()) {
      let target = stack.peek()
      let allChecked = true
      for (let i = 0; i < 4; i++) {
        let direction = directs[i]
        // timestamp = new Date().getTime()
        let checkItem = this.getDirectionPoint(target, direction)
        // totalCheckAndCreate += new Date().getTime() - timestamp
        if (!checkItem) {
          continue
        }
        step++
        allChecked = false
        // timestamp = new Date().getTime()
        if (images.detectsColor(this.img, this.color, checkItem.x, checkItem.y, this.threshold)) {
          nearlyPoints.push(checkItem)
          stack.push(checkItem)
        }
        // totalCheckColor += new Date().getTime() - timestamp
      }
      if (allChecked) {
        stack.pop()
      }
    }
    log('找了多个点 总计步数：' + step + '\n总耗时：' + (new Date().getTime() - totalStart) + 'ms')
    // log('判断是否校验耗时：' + totalCheckAndCreate + 'ms')
    // log('判断颜色耗时：' + totalCheckColor + 'ms')
    return nearlyPoints
  }

  this.isUncheckedBitJava = function (point) {
    if (point.x < 880) {
      return false
    }
    // 1080 - 200 = 880
    return this.bitChecker.isUnchecked((point.x - 880) * 10000 + point.y)
  }

  this.isUncheckedBit = function (point) {
    return this.checkBit.isUnchecked(point)
  }


  this.isUncheckedHash = function (point) {
    // let start = new Date().getTime()
    let key = point.x + '-' + point.y
    if (this.checkedHash[key]) {
      return false
    }
    this.checkedHash[key] = true
    return true
  }

  this.isUnchecked = function (point) {
    // 超出屏幕的直接返回false
    if (this.isOutofScreen(point)) {
      return false
    }
    let filted = this.checkedPoint.filter(checked => checked.x === point.x && checked.y === point.y)
    let checked = filted && filted.length > 0
    // sleep(5)
    if (!checked) {
      this.checkedPoint.push(point)
    }
    return !checked
  }

  this.getDirectionPoint = function (point, direct) {
    // log('准备获取附近节点:' + JSON.stringify(point))
    let nearPoint = {
      x: point.x + direct[0],
      y: point.y + direct[1]
    }
    if (this.isOutofScreen(nearPoint) || !this.isUncheckedBitJava(nearPoint)) {
      // if (this.isOutofScreen(nearPoint) || !this.isUncheckedBit(nearPoint)) {
      // if (this.isOutofScreen(nearPoint) || !this.isUncheckedHash(nearPoint)) {
      // if (this.isOutofScreen(nearPoint) || !this.isUnchecked(nearPoint)) {
      return null
    }
    return nearPoint
  }

}

function ImgBasedFriendListScanner () {

  this.start = function () {
    _increased_energy = 0
    _min_countdown = 10000
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
          log('丢弃距离较上一个比较近的：' + JSON.stringify(point))
        }
      })
      log('重新分析后的点：' + JSON.stringify(resultPoints))
    }
    return resultPoints
  }

  this.collecting = function () {
    let screen = _commonFunctions.checkCaptureScreenPermission()
    console.show()
    console.log('获取到screen' + (screen === null ? '失败' : '成功'))
    _FloatyInstance.setFloatyTextColor('#FF0000')
    let helpPoints = this.sortAndReduce(this.detectHelp(screen))
    if (helpPoints && helpPoints.length > 0) {
      helpPoints.forEach(point => {
        let calculator = new ColorRegionCenterCalculator(screen, _config.can_help_color || '#f99236', point, _config.color_offset)
        point = calculator.getColorRegionCenter()
        console.log('设置悬浮窗位置：' + JSON.stringify(point))
        _FloatyInstance.setFloatyInfo(point, '\'可帮助收取')
        sleep(5000)
      })
    }
    let collectPoints = this.sortAndReduce(this.detectCollect(screen))
    if (collectPoints && collectPoints.length > 0) {
      collectPoints.forEach(point => {
        let calculator = new ColorRegionCenterCalculator(screen, _config.can_collect_color || '#1da06a', point, _config.color_offset)
        point = calculator.getColorRegionCenter()
        console.log('设置悬浮窗位置：' + JSON.stringify(point))
        _FloatyInstance.setFloatyInfo(point, '\'可能可收取')
        sleep(5000)
      })
    }
  }

  this.detectHelp = function (img) {
    let helpPoints = this.detectColors(img, _config.can_help_color || '#f99236')
    console.log('可帮助的点：' + JSON.stringify(helpPoints))
    return helpPoints
  }

  this.detectCollect = function (img) {
    let collectPoints = this.detectColors(img, _config.can_collect_color || '#1da06a')
    console.log('可收取的点：' + JSON.stringify(collectPoints))
    return collectPoints
  }

  this.detectColors = function (img, color) {
    log('准备检测颜色：' + color)
    let endY = 2160 - 200
    let runningY = 100
    let startX = 1080 - 100
    let regionWindow = [startX, runningY, 100, 200]
    let findColorPoints = []
    let countdown = new Countdown()
    while (runningY < endY) {
      log('检测区域：' + JSON.stringify(regionWindow))
      let point = images.findColor(img, color, {
        region: regionWindow,
        threshold: _config.color_offset || 20
      })
      countdown.summary('检测初始点')
      if (point) {
        findColorPoints.push(point)
      }
      runningY += 200
      if (runningY > endY) {
        runningY = endY
      }
      regionWindow = [startX, runningY, 100, 200]
      countdown.restart()
    }
    return findColorPoints
  }
}

function Countdown () {
  this.start = new Date().getTime()
  this.getCost = function () {
    return new Date().getTime() - this.start
  }

  this.summary = function (content) {
    console.log(content + '耗时' + this.getCost() + 'ms')
  }

  this.restart = function () {
    this.start = new Date().getTime()
  }

}

module.exports = ImgBasedFriendListScanner