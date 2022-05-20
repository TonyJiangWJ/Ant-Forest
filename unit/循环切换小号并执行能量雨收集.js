let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let accountChange = require('../lib/AlipayAccountManage.js')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let fileUtils = singletonRequire('FileUtils')
let automator = singletonRequire('Automator')
let unlocker = require('../lib/Unlock.js')
config.not_lingering_float_window = true
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

if (!floatyInstance.init()) {
  toast('创建悬浮窗失败')
  exit()
}
floatyInstance.enableLog()
commonFunctions.showCommonDialogAndWait('循环执行小号能量雨')

if (config.accounts && config.accounts.length > 1) {
  config.accounts.forEach((accountInfo, idx) => {
    let { account, accountName } = accountInfo
    floatyInstance.setFloatyText('准备切换账号为：' + account)
    sleep(1000)
    accountChange(account)
    floatyInstance.setFloatyText('切换完毕')
    sleep(500)
    floatyInstance.setFloatyText('开始执行能量雨')
    let source = fileUtils.getCurrentWorkPath() + '/unit/能量雨收集.js'
    runningQueueDispatcher.doAddRunningTask({ source: source })
    let targetSendName = config.accounts[(idx + 1) % config.accounts.length].accountName
    logUtils.debugInfo(['赠送对象昵称为：{}', targetSendName])
    engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')), arguments: { executeByAccountChanger: true, executorSource: engines.myEngine().getSource() + '', targetSendName: targetSendName } })
    commonFunctions.commonDelay(2.5, '执行能量雨[', true, true)
  })
  floatyInstance.setFloatyText('全部账号能量雨执行完毕，切换回主账号')
  sleep(1000)
  accountChange(config.main_account || config.accounts[0])
  floatyInstance.setFloatyText('主账号再次校验能量雨机会')
  let source = fileUtils.getCurrentWorkPath() + '/unit/能量雨收集.js'
  runningQueueDispatcher.doAddRunningTask({ source: source })
  engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')), arguments: { executeByAccountChanger: true, executorSource: engines.myEngine().getSource() + '' } })
  commonFunctions.commonDelay(2.5, '执行能量雨[', true, true)
  floatyInstance.setFloatyText('能量雨全部执行完毕')
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，不进行切换'], true)
}
commonFunctions.minimize()
exit()