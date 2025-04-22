let { config } = require('../config.js')(runtime, global)

let unlocker = require('../lib/Unlock.js')
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
runningQueueDispatcher.addRunningTask()
let { changeAccount, ensureMainAccount } = require('../lib/AlipayAccountManage.js')
let automator = singletonRequire('Automator')
let commonFunctions = singletonRequire('CommonFunction')
let floatyInstance = singletonRequire('FloatyUtil')
let LogFloaty = singletonRequire('LogFloaty')
let logUtils = singletonRequire('LogUtils')
let NotificationHelper = singletonRequire('Notification')
let { Market } = require('./森林集市/internal.js')
config.not_lingering_float_window = true
config.targetWateringAmount = 66
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  if (config.auto_lock && unlocker.needRelock() === true) {
    logUtils.debugInfo('重新锁定屏幕')
    automator.lockScreen()
  }
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
unlocker.exec()
commonFunctions.requestScreenCaptureOrRestart()

if (!floatyInstance.init()) {
  toast('创建悬浮窗失败')
  exit()
}
floatyInstance.enableLog()
commonFunctions.showCommonDialogAndWait('切换大小号执行森林集市')
commonFunctions.listenDelayStart()
commonFunctions.backHomeIfInVideoPackage()
let market = new Market()
let failedCount = 0, failedAccounts = ''
if (config.accounts && config.accounts.length > 1) {
  config.accounts.forEach((accountInfo, idx) => {
    let { account, accountName } = accountInfo
    LogFloaty.pushLog('准备切换账号为：' + account)
    sleep(1000)
    changeAccount(account)
    LogFloaty.pushLog('切换完毕')
    sleep(500)
    LogFloaty.pushLog('开始执行森林集市')
    try {
      let result = market.exec()
      if (!result.success) {
        LogFloaty.pushErrorLog('森林集市执行失败' + result.errorInfo)
        failedCount++
        failedAccounts += ',' + account
      }
      LogFloaty.pushLog('切换下一个账号')
      sleep(500)
    } catch (e) {
      logUtils.errorInfo('执行异常：' + e)
      LogFloaty.pushLog('森林集市执行异常 进行下一个')
      failedCount++
      failedAccounts += ',' + account
    }
  })
  if (failedCount > 0) {
    NotificationHelper.createNotification('大小号森林集市执行失败，请检查', '当前有账号森林集市执行失败，请检查是否存在问题，失败个数：' + failedCount + '' + failedAccounts)
  } else {
    NotificationHelper.cancelNotice()
  }
  LogFloaty.pushLog('全部账号执行完毕切换回主账号')
  sleep(1000)
  ensureMainAccount()
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，不进行切换'], true)
}
commonFunctions.minimize(config.package_name)
exit()
