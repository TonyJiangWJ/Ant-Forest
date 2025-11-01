
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')
let logFloaty = singletonRequire('LogFloaty')
let NotificationHelper = singletonRequire('Notification')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let widgetUtils = singletonRequire('WidgetUtils')

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
commonFunctions.showCommonDialogAndWait('医疗健康')
commonFunctions.listenDelayStart()
commonFunctions.backHomeIfInVideoPackage()
let hospitalRunner = new HospitalRunner()
let result = hospitalRunner.exec()
if (!result.success) {
  logFloaty.pushErrorLog('当前任务未完成，设置五分钟后重启')
  commonFunctions.setUpAutoStart(5)
  NotificationHelper.createNotification('医疗健康执行失败，请检查', result.errorMsg + '，请检查是否存在问题')
} else {
  NotificationHelper.cancelNotice()
}
commonFunctions.minimize(config.package_name)
exit()


function HospitalRunner () {
  this.browsedIds = []
  this.exec = function () {
    logFloaty.pushLog('准备打开医疗健康')
    if (!this.openApp()) {
      return { success: false, errorMsg: '打开医疗健康失败' }
    }
    this.doBrowse(6)
    return { success: true }
  }

  this.openApp = function () {
    app.startActivity({
      action: "VIEW",
      data: "alipays://platformapi/startapp?appId=2021003141652419&page=pages%2Findex%2Findex%3FunderTakeTabCode%3Denergy&enbsv=0.2.2508310551.47&chInfo=ch_share__chsub_QQ&fxzjshareChinfo=ch_share__chsub_QQ&shareTimestamp=1756634611237&apshareid=19dc6ba4-ff89-42e1-ba96-836c1b98b494&shareBizType=H5App_XCX&launchKey=f0ad67e0-5383-45bb-9e07-c4b58a44b9eb-1756636049069",
      packageName: config.package_name
    })
    logFloaty.pushLog('等待界面加载')
    let start = Date.now()
    sleep(1000)
    let result = widgetUtils.widgetWaiting('.*(看线上健康科普得绿色能量|你有\\d+g能量已成熟).*', null, 15000, null, { algorithm: 'PVDFS' })
    logFloaty.pushLog('医疗健康页面加载' + (result ? '成功' : '失败') + '，耗时:' + (Date.now() - start) + 'ms')
    return result
  }

  this.doBrowse = function (limit) {
    if (!isNaN(limit) && limit <= 0) {
      logFloaty.pushLog('今日能量已领完，结束任务')
      return
    }
    if (limit < 6 && this.browsedIds.length == 0) {
      automator.randomScrollDown()
    }
    limit = limit || 6
    let tip = widgetUtils.widgetGetOne('看线上健康科普得绿色能量.*', 2000, false, false, null, { algorithm: 'PVDFS' })
    if (!tip) {
      logFloaty.pushLog('当前可能不在医疗健康页面 尝试重新打开')
      if (!this.openApp()) {
        logFloaty.pushErrorLog('重新打开医疗健康失败')
        return
      }
      return this.doBrowse(limit)
    }
    let regex = /看线上健康科普得绿色能量\D+(\d+)g/
    if (regex.test(tip.text())) {
      let rest = parseInt(regex.exec(tip.text())[1])
      logFloaty.pushLog('还剩' + rest + 'g能量')
      if (rest <= 0) {
        logFloaty.pushLog('今日能量已领完，结束任务')
        return false
      } else {
        limit = rest / 16
        logFloaty.pushLog('今日还有' + limit + '次浏览机会')
      }
    } else {
      logFloaty.pushLog('可操作元素未找到，随机获取一个卡片进行浏览，剩余次数：' + limit)
    }
    if (this.browsedIds.length >= 4) {
      automator.randomScrollDown()
      sleep(1000)
    }
    let tryTime = 3
    while (tryTime-- > 0) {
      let targetEntry = idMatches('industry_content_card_.*').filter(v => {
        if (this.browsedIds.includes(v.id())) { return false }
        return v.bounds().centerY() > 0 && v.bounds().centerY() < config.device_height - 100
      }).findOne(1000)
      if (targetEntry) {
        this.browsedIds.push(targetEntry.id())
        ensureInScreenAndClickCenter(targetEntry)
        logFloaty.pushLog('进入浏览：' + targetEntry.id())
        sleep(5000)
        automator.back()
        sleep(1000)
        return this.doBrowse(limit - 1)
      } else {
        automator.randomScrollDown()
      }
    }
    logFloaty.pushErrorLog('未能找到可浏览控件')
  }

  function ensureInScreenAndClickCenter (targetEntry) {
    let centerY = targetEntry.bounds().centerY()
    if (centerY > config.device_height - 200) {
      automator.swipe(100, 100, config.device_height - 200, config.device_height - (centerY - config.device_height), 1000)
    } else if (centerY < 100) {
      automator.swipe(100, 100, 200, 200 + 100 - centerY, 1000)
    }
    targetEntry = widgetUtils.widgetById(targetEntry.id())
    if (!targetEntry) {
      logFloaty.pushErrorLog('控件丢失！' + targetEntry.id())
      return
    }
    automator.clickCenter(targetEntry)
  }
}