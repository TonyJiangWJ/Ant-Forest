/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 19:41:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-20 13:38:53
 * @Description: 
 */
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
console.show()
log('=============总收集排序==============')
//commonFunctions.showCollectSummary()
log('=============今日收集排序==============')
commonFunctions.showCollectSummary('todayCollect')
//log('=============帮助排序==============')
//commonFunctions.showCollectSummary('todayHelp')