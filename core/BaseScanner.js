/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-18 14:17:09
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-01 18:05:42
 * @Description: 排行榜扫描基类
 */
let { config: _config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')
let FileUtils = singletonRequire('FileUtils')
let customMultiTouch = files.exists(FileUtils.getCurrentWorkPath() + '/extends/MultiTouchCollect.js') ? require('../extends/MultiTouchCollect.js') : null
let { debugInfo, logInfo, errorInfo, warnInfo, infoLog } = singletonRequire('LogUtils')

let _package_name = 'com.eg.android.AlipayGphone'

const BaseScanner = function () {
  this.increased_energy = 0
  this.current_time = 0
  this.collect_any = false
  this.min_countdown = 10000
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
    this.collect_any = true
    sleep(300)
  }

  // 收取能量
  this.collectEnergy = function (isHelp) {
    let ballCheckContainer = _widgetUtils.widgetGetAll(_config.collectable_energy_ball_content, isHelp ? 200 : 500, true)
    if (ballCheckContainer !== null) {
      debugInfo(['可收取能量球个数：「{}」', ballCheckContainer.target.length])
      if (_config.cutAndSaveCountdown) {
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
          screen.recycle()
        }
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
        this.multiTouchToCollect()
      }
    }
  }

  this.defaultMultiTouch = function () {
    let scaleRate = _config.device_width / 1080
    let y = 700
    // 模拟一个梯形点击区域
    for (let x = 200; x <= 900; x += 100) {
      let px = x
      let py = x < 550 ? y - (0.5 * x - 150) : y - (-0.5 * x + 400)
      automator.click(parseInt(px * scaleRate), parseInt(py * scaleRate))
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

  // 收取能量同时帮好友收取
  this.collectAndHelp = function (needHelp) {
    // 收取好友能量
    this.collectEnergy(needHelp)
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
        ball.recycle()
        interval_ball.recycle()
      })
      if (!helped && needHelp) {
        warnInfo(['未能找到帮收能量球需要增加匹配颜色组 当前{}', colors])
      }
      screen.recycle()
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
    if (toast.indexOf('能量罩') > 0) {
      this.recordCurrentProtected(name)
    }
  }

  this.recordCurrentProtected = function (name, timeout) {
    if (name) {
      _commonFunctions.addNameToProtect(name, timeout)
      return
    }
    let title = textContains('的蚂蚁森林')
      .findOne(_config.timeout_findOne)
      .text().match(/(.*)的蚂蚁森林/)
    if (title) {
      _commonFunctions.addNameToProtect(title[1], timeout)
    } else {
      errorInfo(['获取好友名称失败，无法加入保护罩列表，请检查好友首页文本"XXX的蚂蚁森林"是否存在'])
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

  this.protectInfoDetect = function (name) {
    let usingInfo = _widgetUtils.widgetGetOne(_config.using_protect_content, 50, true, true)
    if (usingInfo !== null) {
      let target = usingInfo.target
      let usingTime = null
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

  this.doCollectTargetFriend = function (obj) {
    debugInfo(['准备开始收取好友：「{}」', obj.name])
    let temp = this.protectDetect(_package_name, obj.name)
    let preGot, preE, rentery = false
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
      // 等待控件数据刷新
      sleep(150)
      let postGet = _widgetUtils.getYouCollectEnergy() || 0
      let postE = _widgetUtils.getFriendEnergy()
      if (!obj.isHelp && postGet !== null && preGot !== null) {
        let gotEnergy = postGet - preGot
        let gotEnergyAfterWater = gotEnergy
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
              gotEnergyAfterWater = _widgetUtils.getYouCollectEnergy() - preGet
            }
          } catch (e) {
            errorInfo('收取[' + obj.name + ']' + gotEnergy + 'g 大于阈值:' + _config.wateringThreshold + ' 回馈浇水失败 ' + e)
          }
          logInfo([
            "收取好友:{} 能量 {}g {}",
            obj.name, gotEnergyAfterWater, (needWaterback ? '浇水' + (gotEnergy - gotEnergyAfterWater) + 'g' : '')
          ])
          this.showCollectSummaryFloaty(gotEnergy)
        } else {
          debugInfo("收取好友:" + obj.name + " 能量 " + gotEnergy + "g")
        }
      } else if (obj.isHelp && postE !== null && preE !== null) {
        let gotEnergy = postE - preE
        debugInfo("开始帮助前:" + preE + " 帮助后:" + postE)
        if (gotEnergy > 0) {
          logInfo("帮助好友:" + obj.name + " 回收能量 " + gotEnergy + "g")
          _commonFunctions.recordFriendCollectInfo({
            friendName: obj.name,
            friendEnergy: postE,
            postCollect: postGet,
            preCollect: preGot,
            helpCollect: gotEnergy
          })
          if (_config.try_collect_by_multi_touch) {
            // 如果是可帮助 且 无法获取控件信息的，以帮助收取的重新进入判断一次
            rentery = true
          }
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
    return true
  }
}
module.exports = BaseScanner