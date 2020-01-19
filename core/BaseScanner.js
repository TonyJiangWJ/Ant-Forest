/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-18 14:17:09
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-01-19 23:19:54
 * @Description: 排行榜扫描基类
 */

let _widgetUtils = typeof WidgetUtils === 'undefined' ? require('../lib/WidgetUtils.js') : WidgetUtils
let automator = require('../lib/Automator.js')
let _commonFunctions = typeof commonFunctions === 'undefined' ? require('../lib/CommonFunction.js') : commonFunctions
let _config = typeof config === 'undefined' ? require('../config.js').config : config

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
    this.collect_any = true
    sleep(300)
  }

  // 收取能量
  this.collectEnergy = function () {
    let ballCheckContainer = _widgetUtils.widgetGetAll(_config.collectable_energy_ball_content, null, true)
    if (ballCheckContainer !== null) {
      debugInfo('能量球存在')
      let that = this
      ballCheckContainer.target
        .forEach(function (energy_ball) {
          that.collectBallEnergy(energy_ball, ballCheckContainer.isDesc)
        })
    } else {
      debugInfo('无能量球可收取')
    }
  }

  // 收取能量同时帮好友收取
  this.collectAndHelp = function (needHelp) {
    // 收取好友能量
    this.collectEnergy()
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
        let interval_ball = images.interval(ball, "#61a075", 30)
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
      if (helped && length >= 6) {
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
}
module.exports = BaseScanner