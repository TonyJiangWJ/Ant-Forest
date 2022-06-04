let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let accountChange = require('../lib/AlipayAccountManage.js')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let fileUtils = singletonRequire('FileUtils')
let automator = singletonRequire('Automator')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
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
commonFunctions.showCommonDialogAndWait('同步小号行走步数')
commonFunctions.listenDelayStart()
if (config.accounts && config.accounts.length >= 1) {
  config.accounts.forEach(({account}) => {
    floatyInstance.setFloatyText('准备切换账号为：' + account)
    sleep(1000)
    accountChange(account)
    floatyInstance.setFloatyText('切换完毕')
    sleep(500)
    // 执行行走捐同步步数
    openWalkingData()
    checkIfOKExists()
    findAndEnterWalkingDonate()
    checkWalkingData()
  })
  floatyInstance.setFloatyText('账号切换完毕，切换回主账号')
  sleep(1000)
  accountChange(config.main_account || config.accounts[0])
  floatyInstance.setFloatyText('切换完毕，再见')
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号不进行切换'], true)
}
commonFunctions.minimize()
exit()

function convertPosition(target) {
  return {x: target.bounds().centerX(), y: target.bounds().centerY()}
}

function openWalkingData() {
  logUtils.logInfo('准备打开行走捐')
  app.startActivity({
    action: 'VIEW',
    data: 'alipays://platformapi/startapp?appId=10000009',
    packageName: config.package_name
  })
  floatyInstance.setFloatyInfo({x: config.device_width /2 , y: config.device_height/2}, "查找是否有'打开'对话框")
  let confirm = widgetUtils.widgetGetOne(/^打开$/, 1000)
  if (confirm) {
    automator.clickCenter(confirm)
  }
  sleep(1000)
  widgetUtils.widgetWaiting('我的证书')
}

function checkIfOKExists() {
  let ok = widgetUtils.widgetGetOne('好的')
  if (ok) {
    floatyInstance.setFloatyInfo(convertPosition(ok), '找到了好的')
    automator.clickCenter(ok)
    sleep(1000)
  }
}

function findAndEnterWalkingDonate() {
  floatyInstance.setFloatyText('查找行走捐')
  let donate = widgetUtils.widgetGetOne('行走捐')
  if (donate) {
    floatyInstance.setFloatyInfo(convertPosition(donate), '找到了行走捐')
    automator.clickCenter(donate)
    sleep(1000)
    donate = widgetUtils.widgetGetOne('行走捐', 500)
    if (donate) {
      automator.clickCenter(donate)
      sleep(1000)
    }
    return true
  } else {
    floatyInstance.setFloatyText('未找到行走捐')
  }
  return false
}

function checkWalkingData() {
  let today = widgetUtils.widgetGetOne('今日步数')
  if (today) {
    let walkingData = widgetUtils.subWidgetGetOne(today.parent(), '^\\d+$', null, true)
    if (walkingData) {
      let content = walkingData.content
      floatyInstance.setFloatyInfo(convertPosition(walkingData.target), '当前步数：' + content)
      logUtils.infoLog(['当前步数：{}', content])
      sleep(2000)
      donate()
    }
  } else {
    if (findAndEnterWalkingDonate()) {
      checkWalkingData()
    }
  }
}

function donate() {
  floatyInstance.setFloatyText('查找是否存在立即捐步')
  let donateBtn = widgetUtils.widgetGetOne('立即捐步')
  if (donateBtn) {
    floatyInstance.setFloatyInfo(convertPosition(donateBtn), '立即捐步')
    sleep(1000)
    automator.clickCenter(donateBtn)
    sleep(1000)
    let okBtn = widgetUtils.widgetGetOne('知道了')
    automator.clickCenter(okBtn)
    sleep(1000)
  } else {
    floatyInstance.setFloatyText('未找到立即捐步按钮')
    sleep(500)
  }
}
