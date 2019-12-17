/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-17 21:47:09
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-17 22:05:06
 * @Description: 
 */

let LogUtils = require('../lib/LogUtils.js')
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo, clearLogFile, appendLog, removeOldLogFiles
} = LogUtils
let WidgetUtil = require('../lib/WidgetUtils.js')
requestScreenCapture(false)
toastLog(WidgetUtil.friendListWaiting())

sleep(1000)
console.show()