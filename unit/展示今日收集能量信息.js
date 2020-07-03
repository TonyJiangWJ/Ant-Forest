/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 19:41:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-07-03 19:57:29
 * @Description: 
 */
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
console.show()
// log('=============总收集排序==============')
//commonFunctions.showCollectSummary()
log('=============今日收集排序==============')
let summaryInfo = commonFunctions.showCollectSummary('todayCollect')
//log('=============帮助排序==============')
//commonFunctions.showCollectSummary('todayHelp')
log('统计数据来自于好友首页控件，如需保存每日数据，请将当前文件设置每天的定时任务')
log('控制台将在10秒后自动关闭，可前往日志页面继续查看')
setTimeout(function () {
  console.hide()
}, 10000)