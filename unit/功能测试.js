/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-09 11:14:45
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-03 21:32:30
 * @Description: 
 */
let WidgetUtils = require('../lib/WidgetUtils.js')
let commonFunctions = require('../lib/CommonFunction.js')
let _config = typeof config === 'undefined' ? require('../config.js').config : config
let _automator = typeof automator === 'undefined' ? require('../lib/Automator.js') : automator
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

// commonFunctions.minimize()
_automator.clickBack()