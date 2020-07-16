/*
 * @Author: TonyJiangWJ
 * @Date: 2020-07-06 00:08:21
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-07-16 20:12:39
 * @Description: 
 */ 

let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let WidgetUtils = singletonRequire('WidgetUtils')
let commonFunctions = singletonRequire('CommonFunction')
let { config } = require('../config.js')
let automator = singletonRequire('Automator')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo
} = singletonRequire('LogUtils')
let formatDate = require('../lib/DateUtil.js')

const protectInfoDetect = function () {
  let usingInfo = WidgetUtils.widgetGetOne('使用了保护罩', 500, true)
  if (usingInfo !== null) {
    let target = usingInfo.target
    warnInfo(['found using protect info, bounds:{}', target.bounds()], true)
    let parent = target.parent().parent()
    let targetRow = parent.row()
    let time = parent.child(2).text()
    if (!time) {
      time = parent.child(2).desc()
    }
    let isToday = true
    let yesterday = WidgetUtils.widgetGetOne('昨天', 1000, true)
    let yesterdayRow = null
    if (yesterday !== null) {
      yesterdayRow = yesterday.target.row()
      // warnInfo(yesterday.target.indexInParent(), true)
      isToday = yesterdayRow > targetRow
    }
    // if (!isToday) {
      // 获取前天的日期
      let dateBeforeYesterday = formatDate(new Date(new Date().getTime() - 3600 * 24 * 1000 * 2), 'MM-dd')
      let dayBeforeYesterday = WidgetUtils.widgetGetOne(dateBeforeYesterday, 50, true)
      if (dayBeforeYesterday !== null) {
        let dayBeforeYesterdayRow = dayBeforeYesterday.target.row()
        if (dayBeforeYesterdayRow < targetRow) {
          debugInfo('能量罩使用时间已超时，前天之前的数据')
          return false
        } else {
          infoLog(['前天row:{}', dayBeforeYesterdayRow])
        }
      }
    // }
    warnInfo(['using time:{}-{} bottoms: y[{}] t[{}]', isToday ? '今天' : '昨天', time, yesterdayRow, targetRow], true)
    return true
  } else {
    warnInfo('not found using protect info', true)
  }
  return false
}

protectInfoDetect()