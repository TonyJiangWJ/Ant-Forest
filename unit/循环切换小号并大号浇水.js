let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
runningQueueDispatcher.addRunningTask()
let { changeAccount, ensureMainAccount } = require('../lib/AlipayAccountManage.js')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let fileUtils = singletonRequire('FileUtils')
let LogFloaty = singletonRequire('LogFloaty')
let automator = singletonRequire('Automator')
let unlocker = require('../lib/Unlock.js')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let { openFriendHome, doWaterFriend, openAndWaitForPersonalHome, getSignReward } = require('./waterFriend.js')
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
commonFunctions.showCommonDialogAndWait('切换小号给大号浇水')
commonFunctions.listenDelayStart()
commonFunctions.backHomeIfInVideoPackage()
if (config.accounts && config.accounts.length > 1) {
  config.accounts.forEach((accountInfo, idx) => {
    let { account, accountName } = accountInfo
    if (account === config.main_account) {
      return
    }
    LogFloaty.pushLog('准备切换账号为：' + account)
    sleep(1000)
    changeAccount(account)
    LogFloaty.pushLog('切换完毕')
    sleep(500)
    openAndWaitForPersonalHome()
    LogFloaty.pushLog('准备收集奖励')
    sleep(1000)
    getSignReward()
    LogFloaty.pushLog('开始执行浇水')
    try {
      if (openFriendHome()) {
        doWaterFriend()
      }
      LogFloaty.pushLog('切换下一个账号')
      sleep(500)
    } catch (e) {
      logUtils.errorInfo('执行异常：' + e)
      LogFloaty.pushLog('收取能量异常 进行下一个')
    }
  })
  LogFloaty.pushLog('全部账号能量收集完毕切换回主账号')
  sleep(1000)
  ensureMainAccount()
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，不进行切换'], true)
}
commonFunctions.minimize()
exit()
