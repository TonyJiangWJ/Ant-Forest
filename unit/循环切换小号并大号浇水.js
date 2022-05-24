let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let accountChange = require('../lib/AlipayAccountManage.js')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let fileUtils = singletonRequire('FileUtils')
let automator = singletonRequire('Automator')
let unlocker = require('../lib/Unlock.js')
let { openFriendHome, doWaterFriend, openAndWaitForPersonalHome } = require('./waterFriend.js')
config.not_lingering_float_window = true
config.targetWateringAmount = 66
runningQueueDispatcher.addRunningTask()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  if (config.auto_lock && unlocker.needRelock() === true) {
    logUtils.debugInfo('重新锁定屏幕')
    automator.lockScreen()
  }
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, true,
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
if (config.accounts && config.accounts.length > 1) {
  config.accounts.forEach((accountInfo, idx) => {
    let { account, accountName } = accountInfo
    if (account === config.main_account) {
      return
    }
    floatyInstance.setFloatyText('准备切换账号为：' + account)
    sleep(1000)
    accountChange(account)
    floatyInstance.setFloatyText('切换完毕')
    sleep(500)
    floatyInstance.setFloatyText('开始执行浇水')
    try {
      if (openFriendHome()) {
        doWaterFriend()
      }
      floatyInstance.setFloatyText('切换下一个账号')
      sleep(500)
    } catch (e) {
      logUtils.errorInfo('执行异常：' + e)
      floatyInstance.setFloatyText('收取能量异常 进行下一个')
    }
  })
  floatyInstance.setFloatyText('全部账号能量收集完毕切换回主账号')
  sleep(1000)
  accountChange(config.main_account || config.accounts[0])
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，不进行切换'], true)
}
commonFunctions.minimize()
exit()
