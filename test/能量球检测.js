let { config } = require('../config.js')
let { debugInfo, errorInfo, warnInfo, logInfo, infoLog } = require('../lib/LogUtils.js')
let WidgetUtil = require('../lib/WidgetUtils.js')
console.show()
logInfo('能量球检测正则：' + config.collectable_energy_ball_content)
config.show_debug_log = true
let ballContainers = WidgetUtil.widgetGetAll(config.collectable_energy_ball_content, 5000, true)
if (ballContainers && ballContainers.target.length > 0) {
  logInfo('有可收取的能量球')
  ballContainers.target.forEach(element => {
    logInfo('能量球：' + (ballContainers.isDesc ? element.desc() : element.text()))
  })
} else {
  logInfo('无可收取能量球')
}