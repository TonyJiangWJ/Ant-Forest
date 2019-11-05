let { WidgetUtils } = require('../lib/WidgetUtils.js')
let { commonFunctions } = require('../lib/CommonFunction.js')
let { config } = require('../config.js')
let { automator } = require('../lib/Automator.js')
let Timers = require('../lib/Timers.js')(runtime, this)
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo
} = require('../lib/LogUtils.js')

debugInfo('debug')
logInfo('log')
infoLog('info')
warnInfo('warn')
errorInfo('error')