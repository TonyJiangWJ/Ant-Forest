/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-19 10:53:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-25 18:38:24
 * @Description: 
 */
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let WidgetUtils = singletonRequire('WidgetUtils')
let commonFunctions = singletonRequire('CommonFunction')
let configedAmount = config.targetWateringAmount
config.targetWateringAmount = 66
commonFunctions.requestScreenCaptureOrRestart(true)
WidgetUtils.wateringFriends()
config.targetWateringAmount = configedAmount
toast('done')
