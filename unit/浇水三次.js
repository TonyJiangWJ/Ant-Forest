/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-19 10:53:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-20 20:45:49
 * @Description: 
 */
let WidgetUtils = require('../lib/WidgetUtils.js')
let commonFunctions = require('../lib/CommonFunction.js')
let { config } = require('../config.js')
let automator = require('../lib/Automator.js')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo
} = require('../lib/LogUtils.js')
let count = 0
while (count++ < 3) {
  WidgetUtils.wateringFriends()
  sleep(1500)
}
toast('done')
back()