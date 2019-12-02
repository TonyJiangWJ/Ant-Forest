/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-09 11:14:45
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-02 23:17:47
 * @Description: 
 */
let { WidgetUtils } = require('../lib/WidgetUtils.js')
let { commonFunctions } = require('../lib/CommonFunction.js')
let { config } = require('../config.js')
let { automator } = require('../lib/Automator.js')
let Timers = require('../lib/Timers.js')(runtime, this)
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo, clearLogFile, removeOldLogFiles
} = require('../lib/LogUtils.js')

debugInfo('debug')
logInfo('log')
infoLog('info')
warnInfo('warn')
errorInfo('error')
// commonFunctions.showDialogAndWait()
// commonFunctions.showAllAutoTimedTask()

// removeOldLogFiles()
WidgetUtils.quickScrollDown()
let count = 15
while (count-- > 0) {
  scrollUp()
  sleep(10)
}