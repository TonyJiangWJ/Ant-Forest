
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')
let logFloaty = singletonRequire('LogFloaty')
let NotificationHelper = singletonRequire('Notification')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let { Market } = require('./森林集市/internal.js')
config.buddha_like_mode = false
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
config.not_lingering_float_window = true
logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()

// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  if (config.auto_lock === true && unlocker.needRelock() === true) {
    debugInfo('重新锁定屏幕')
    automator.lockScreen()
    unlocker.saveNeedRelock(true)
  }
  config.resetBrightness && config.resetBrightness()
  debugInfo('校验并移除已加载的dex')
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, false,
    () => {
      // 保存是否需要重新锁屏
      unlocker.saveNeedRelock()
      config.isRunning = false
    }
  )
}, 'main')
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
let unlocker = require('../lib/Unlock.js')
unlocker.exec()
commonFunctions.showCommonDialogAndWait('森林集市')
let market = new Market()
let result = market.exec()
if (!result.success) {
  logFloaty.pushErrorLog('当前任务未完成，设置五分钟后重启')
  commonFunctions.setUpAutoStart(5)
  NotificationHelper.createNotification('森林集市执行失败，请检查', result.errorInfo + '，请检查是否存在问题')
} else {
  NotificationHelper.cancelNotice()
}
commonFunctions.minimize(config.package_name)
exit()
