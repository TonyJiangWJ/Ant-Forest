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
let automator = singletonRequire('Automator')
let LogFloaty = singletonRequire('LogFloaty')
let unlocker = require('../lib/Unlock.js')
let _BaseScanner = require('../core/BaseScanner.js')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let { openFriendHome, doWaterFriend, openAndWaitForPersonalHome, getSignReward } = require('./waterFriend.js')
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
commonFunctions.showCommonDialogAndWait('循环执行小号并收集能量')
commonFunctions.listenDelayStart()
commonFunctions.backHomeIfInVideoPackage()
if (config.accounts && config.accounts.length > 1) {
  if (!config.main_account_username) {
    let match = config.accounts.filter(acc => acc.account === config.main_account)
    if (match && match.length > 0) {
      config.main_account_username = match[0].accountName
    }
  }
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
    LogFloaty.pushLog('开始执行收取能量')
    try {
      doCollectSelf()
      getSignReward()
      if (config.watering_main_account && config.watering_main_at === 'collect') {
        if (openFriendHome(true)) {
          doWaterFriend()
        }
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

function doCollectSelf () {
  if (!openAndWaitForPersonalHome()) {
    return
  }
  LogFloaty.pushLog('开始识别并收取能量')
  let scanner = new _BaseScanner()
  let balls = []
  let invalidBalls = []
  let preEnergy = getCurrentEnergy()
  scanner.checkAndCollectByHough(true, ball => { balls.push(ball) }, null, invalid => { invalidBalls.push(invalid) })
  scanner.destroy()
  let postEnergy = getCurrentEnergy()
  let validBallCount = balls.length - invalidBalls.length
  LogFloaty.pushLog('收取能量完毕' + ('有效能量球个数：' + validBallCount) + (validBallCount > 0 ? '增加能量值：' + (postEnergy - preEnergy) : ''))
  sleep(500)
}

function getCurrentEnergy () {
  let currentEnergy = widgetUtils.getCurrentEnergy()
  logUtils.debugInfo(['getCurrentEnergy 获取能量值: {}', currentEnergy])
  return currentEnergy
}
