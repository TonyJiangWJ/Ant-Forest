let { WidgetUtils } = require('../lib/WidgetUtils.js')
let { commonFunctions } = require('../lib/CommonFunction.js')
let { config } = require('../config.js')
let { automator } = require('../lib/Automator.js')
let Timers = require('../lib/Timers.js')(runtime, this)

toastLog(Timers.getAllTasks())