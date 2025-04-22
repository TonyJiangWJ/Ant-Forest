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
// 强制指定为paddleOcr
config.local_ocr_priority = 'paddle'
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let storageFactory = singletonRequire('StorageFactory')
config.not_lingering_float_window = true
floatyInstance.enableLog()
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
  logUtils.errorInfo('获取无障碍权限失败')
  exit()
}
unlocker.exec()

if (!floatyInstance.init()) {
  toast('创建悬浮窗失败')
  exit()
}
const ACCOUNT_EXECUTION = "ACCOUNT_EXECUTION"
commonFunctions.requestScreenCaptureOrRestart()
floatyInstance.enableLog()
commonFunctions.showCommonDialogAndWait('同步小号行走步数')
commonFunctions.listenDelayStart()
commonFunctions.backHomeIfInVideoPackage()
storageFactory.initFactoryByKey(ACCOUNT_EXECUTION, { done: [] })

let doneList = storageFactory.getValueByKey(ACCOUNT_EXECUTION).done
logUtils.debugInfo(['当前已执行账号列表：{}', JSON.stringify(doneList)])
if (config.accounts && config.accounts.length >= 1) {
  config.accounts.forEach(({ account }) => {
    if (doneList.indexOf(account) > -1) {
      return
    }
    config.current_execute_account = account
    LogFloaty.pushLog('准备切换账号为：' + account)
    sleep(1000)
    changeAccount(account)
    LogFloaty.pushLog('切换完毕')
    sleep(500)
    // 执行行走捐同步步数
    openWalkingData()
    if (findAndEnterWalkingDonate()) {
      checkWalkingData()
    } else {
      logUtils.errorInfo(['未找到行走捐赠按钮，退出执行'])
    }
  })
  LogFloaty.pushLog('账号切换完毕，切换回主账号')
  sleep(1000)
  ensureMainAccount()
  LogFloaty.pushLog('切换完毕，再见')
  sleep(500)
  if (config.has_account_fail) {
    logUtils.warnInfo(['有账号执行失败，延迟五分钟后重试'])
    commonFunctions.setUpAutoStart(5)
  }
  storageFactory.updateValueByKey(ACCOUNT_EXECUTION, { done: doneList })
} else {
  logUtils.errorInfo(['当前未配置多账号不进行切换'], true)
}
commonFunctions.minimize()
exit()

function convertPosition (target) {
  if (typeof target.bounds == 'function') {
    return { x: target.bounds().centerX(), y: target.bounds().centerY() }
  } else {
    let bounds = target.bounds
    return { x: bounds.left + bounds.width() / 2, y: bounds.top + bounds.height() }
  }
}


function openWalkingData () {
  logUtils.logInfo('准备打开行走捐')
  app.startActivity({
    action: 'VIEW',
    data: 'alipays://platformapi/startapp?appId=10000009',
    packageName: config.package_name
  })
  floatyInstance.setFloatyInfo({ x: config.device_width / 2, y: config.device_height / 2 }, "查找是否有'打开'对话框")
  let confirm = widgetUtils.widgetGetOne(/^打开$/, 1000)
  if (confirm) {
    automator.clickCenter(confirm)
  }
  sleep(1000)
}


function findAndEnterWalkingDonate () {
  LogFloaty.pushLog('查找行走捐')
  let donate = ocrWaiting('行走捐', 3, 1000)
  if (donate) {
    donate = convertPosition(donate)
    floatyInstance.setFloatyInfo(donate, '找到了行走捐')
    automator.click(donate.x, donate.y)
    sleep(1000)
    return true
  } else {
    LogFloaty.pushLog('未找到行走捐')
  }
  return false
}

function ocrWaiting (text, loop, duration, region) {
  logUtils.debugInfo(['ocr查找内容：{}', text])
  let checkLimit = loop || 5
  duration = duration || 1000
  let findTarget = false
  floatyInstance.hide()
  sleep(50)
  do {
    let ocrCheck = localOcrUtil.recognizeWithBounds(commonFunctions.captureScreen(), region, text)
    if (ocrCheck && ocrCheck.length > 0) {
      logUtils.debugInfo(['ocr找到目标：{} {}', text, JSON.stringify(ocrCheck)])
      return ocrCheck[0]
    }
    if (--checkLimit > 0) {
      sleep(duration)
    } else {
      break
    }
  } while (!findTarget)
  logUtils.debugInfo(['ocr查找：「{}」失败', text])
  floatyInstance.restore()
  return false
}

function checkWalkingData (recheck) {
  let ocrCheckResult = ocrWaiting('今日步数', 5, 1000, [0, 0, config.device_width * 0.5, config.device_height * 0.3])
  let executeFail = false
  if (ocrCheckResult) {
    floatyInstance.setFloatyInfo(convertPosition(ocrCheckResult), '今日步数')
    sleep(1000)
    let donateBtn = ocrWaiting('立即捐步', 1, 1000)
    if (!donateBtn) {
      LogFloaty.pushLog('未找到立即捐步，检查是否已完成')
      sleep(1000)
      let done = ocrWaiting('查看受捐项目', 1, 1000)
      if (done) {
        floatyInstance.setFloatyInfo(convertPosition(done), '今日已捐助')
        sleep(1000)
      } else {
        logUtils.debugInfo(['未找到立即捐步，也未找到已捐助信息'])
        executeFail = true
      }
    } else {
      let position = convertPosition(donateBtn)
      floatyInstance.setFloatyInfo(position, '点击捐步')
      automator.click(position.x, position.y)
      sleep(1000)
    }
  } else {
    logUtils.debugInfo(['未找到今日步数, 尝试重新进入界面'])
    sleep(1000)
    if (!recheck && findAndEnterWalkingDonate()) {
      return checkWalkingData(true)
    } else {
      executeFail = true
    }
  }
  if (executeFail) {
    logUtils.debugInfo(['{}账号执行失败', config.current_execute_account])
    config.has_account_fail = true
  } else {
    doneList.push(config.current_execute_account)
  }
}
