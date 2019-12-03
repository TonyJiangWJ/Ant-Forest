let WidgetUtils = require('../lib/WidgetUtils.js')
let commonFunctions = require('../lib/CommonFunction.js')
let { config } = require('../config.js')
let automator = require('../lib/Automator.js')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo
} = require('../lib/LogUtils.js')
let count = 0
while (count++ < 5) {
  WidgetUtils.wateringFriends()
  sleep(1500)
}
toast('done')