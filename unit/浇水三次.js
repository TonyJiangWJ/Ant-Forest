/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-19 10:53:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-30 09:07:18
 * @Description: 
 */
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let WidgetUtils = singletonRequire('WidgetUtils')
let count = 0
while (count++ < 3) {
  WidgetUtils.wateringFriends()
  sleep(1500)
}
toast('done')
back()