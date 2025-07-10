/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-19 10:53:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-06-11 10:15:37
 * @Description: 
 */
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let WidgetUtils = singletonRequire('WidgetUtils')
let commonFunctions = singletonRequire('CommonFunction')
let configedAmount = config.targetWateringAmount
config.targetWateringAmount = 66
console.show()
commonFunctions.requestScreenCaptureOrRestart(true)
WidgetUtils.wateringFriends(true)
config.targetWateringAmount = configedAmount
toast('done')
