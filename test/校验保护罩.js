/*
 * @Author: TonyJiangWJ
 * @Date: 2020-07-06 00:08:21
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-10-24 01:14:15
 * @Description: 
 */ 

let { config: _config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let _widgetUtils = singletonRequire('WidgetUtils')
let commonFunctions = singletonRequire('CommonFunction')
_config.show_debug_log = true
let automator = singletonRequire('Automator')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo
} = singletonRequire('LogUtils')
let formatDate = require('../lib/DateUtil.js')

const protectInfoDetect = function (name) {
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
    debugInfo('超时时间：' + formatDate(new Date(timeout)))
    // this.recordCurrentProtected(name, timeout)
    return true
  } else {
    debugInfo('not found using protect info')
  }
  return false
}

protectInfoDetect()