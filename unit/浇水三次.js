/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-19 10:53:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-25 18:37:48
 * @Description: 
 */
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let WidgetUtils = singletonRequire('WidgetUtils')
let commonFunctions = singletonRequire('CommonFunction')
commonFunctions.requestScreenCaptureOrRestart(true)
let count = 0
let configedAmount = config.targetWateringAmount
config.targetWateringAmount = 66
while (count++ < 3) {
  WidgetUtils.wateringFriends()
  sleep(1500)
}
config.targetWateringAmount = configedAmount
toast('done')
back()