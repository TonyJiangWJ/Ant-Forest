
var { default_config, config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let changeAccount = require('../lib/AlipayAccountManage.js').changeAccount
var configStorage = storages.create(_storage_name)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
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
commonFunctions.showCommonDialogAndWait('自动切换回主账号')
commonFunctions.listenDelayStart()
commonFunctions.backHomeIfInVideoPackage()
changeAccount(config.main_account, true)

commonFunctions.minimize()
debugInfo(['切换完毕'])
exit()
