let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
runningQueueDispatcher.addRunningTask()
let { changeAccount, ensureMainAccount } = require('../lib/AlipayAccountManage.js')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let fileUtils = singletonRequire('FileUtils')
let automator = singletonRequire('Automator')
let LogFloaty = singletonRequire('LogFloaty')
let widgetUtils = singletonRequire('WidgetUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let unlocker = require('../lib/Unlock.js')
let { openFriendHome, doWaterFriend, openAndWaitForPersonalHome } = require('./waterFriend.js')
config.not_lingering_float_window = true

// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  if (config.auto_lock && unlocker.needRelock() === true) {
    logUtils.debugInfo('重新锁定屏幕')
    automator.lockScreen()
  }
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, false,
    () => {
      // 重置屏幕亮度
      config.resetBrightness && config.resetBrightness()
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

if (!floatyInstance.init()) {
  toast('创建悬浮窗失败')
  exit()
}
commonFunctions.requestScreenCaptureOrRestart()
floatyInstance.enableLog()
commonFunctions.showCommonDialogAndWait('循环执行小号能量雨')
commonFunctions.listenDelayStart()
commonFunctions.backHomeIfInVideoPackage()
let anyFailed = false, failedAccounts = []
if (config.accounts && config.accounts.length > 1) {
  config.accounts.forEach((accountInfo, idx) => {
    let { account, accountName } = accountInfo
    LogFloaty.pushLog('准备切换账号为：' + account)
    sleep(1000)
    changeAccount(account)
    LogFloaty.pushLog('切换完毕')
    sleep(500)
    LogFloaty.pushLog('开始执行能量雨')
    let source = fileUtils.getCurrentWorkPath() + '/unit/能量雨收集.js'
    runningQueueDispatcher.doAddRunningTask({ source: source })
    let targetSendName = config.accounts[(idx + 1) % config.accounts.length].accountName
    logUtils.debugInfo(['赠送对象昵称为：{}', targetSendName])
    // 隐藏日志悬浮窗，降低性能消耗
    LogFloaty.hide()
    engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')), arguments: { executeByAccountChanger: true, executorSource: engines.myEngine().getSource() + '', targetSendName: targetSendName } })
    commonFunctions.commonDelay(2.5, '执行能量雨[', true, true, function (postStr) {
      logUtils.debugInfo(['能量雨执行结果：{}', postStr])
      try {
        let result = JSON.parse(postStr)
        if (result.code == 'success') {
          logUtils.debugInfo('能量雨执行成功')
        } else {
          logUtils.errorInfo(['能量雨执行失败，原因：{}', result.failMessage])
          anyFailed = true
          failedAccounts.push(account)
        }
      } catch (e) {
        logUtils.errorInfo(['解析能量雨执行结果失败，原因：{}', e])
      }
    })
    if (config.watering_main_account && config.watering_main_at === 'rain' && account !== config.main_account) {
      LogFloaty.pushLog('切换到小号浇水')
      if (openFriendHome()) {
        doWaterFriend()
      }
    }
  })
  LogFloaty.show()
  LogFloaty.pushLog('全部账号能量雨执行完毕，切换回主账号')
  sleep(1000)
  ensureMainAccount()
  LogFloaty.pushLog('主账号再次校验能量雨机会')
  let source = fileUtils.getCurrentWorkPath() + '/unit/能量雨收集.js'
  runningQueueDispatcher.doAddRunningTask({ source: source })
  // 隐藏日志悬浮窗，降低性能消耗
  LogFloaty.hide()
  engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')), arguments: { executeByAccountChanger: true, executorSource: engines.myEngine().getSource() + '' } })
  commonFunctions.commonDelay(2.5, '执行能量雨[', true, true)
  // 重新展示日志悬浮窗
  LogFloaty.show()
  LogFloaty.pushLog('能量雨全部执行完毕')
  sleep(500)
  if (anyFailed) {
    LogFloaty.pushLog('部分账号能量雨执行失败，失败账号为：' + failedAccounts.join(','))
    LogFloaty.pushLog('设置五分钟后重试')
    commonFunctions.setUpAutoStart(5)
  }
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，不进行切换'], true)
}
commonFunctions.minimize()
exit()
