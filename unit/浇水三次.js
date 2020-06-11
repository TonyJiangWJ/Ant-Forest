/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-19 10:53:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-06-10 19:23:53
 * @Description: 
 */
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let WidgetUtils = singletonRequire('WidgetUtils')
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