/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-19 10:53:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-27 19:58:06
 * @Description: 
 */
let WidgetUtils = require('../lib/WidgetUtils.js')
let singletoneRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletoneRequire('CommonFunction')
let { config } = require('../config.js')(runtime, this)
let automator = singletoneRequire('Automator')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo
} = singletoneRequire('LogUtils')
let count = 0
while (count++ < 3) {
  WidgetUtils.wateringFriends()
  sleep(1500)
}
toast('done')
back()