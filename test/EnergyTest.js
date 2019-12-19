/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-19 09:31:04
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-19 09:47:28
 * @Description: 
 */
let { config } = require('../config.js')
if (config.base_on_image) {
  runtime.loadDex('../lib/autojs-tools.dex')
}
let runningQueueDispatcher = require('../lib/RunningQueueDispatcher.js')
let LogUtils = require('../lib/LogUtils.js')
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo, clearLogFile, appendLog, removeOldLogFiles
} = LogUtils
let widgetUtils = require('../lib/WidgetUtils.js')

console.show()

log(widgetUtils.getFriendEnergy())