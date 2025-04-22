
var { default_config, config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let LogFloaty = singletonRequire('LogFloaty')
let commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let widgetUtils = singletonRequire('WidgetUtils')
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
commonFunctions.showCommonDialogAndWait('自动打开领取红包码')
commonFunctions.listenDelayStart()
commonFunctions.backHomeIfInVideoPackage()


fetchAndOpen()

// commonFunctions.minimize()
LogFloaty.pushLog('领取完毕')
exit()


function fetchAndOpen () {
  LogFloaty.pushLog('请求服务接口获取中，请稍后')
  let disposable = threads.disposable()
  let defaultCode = 'g:/NabWAyj54mL 或.復-置此消息打开支付宝，鸿抱天天有，好上添好  Q:/L MU5958 2020/04/11'
  http.get('https://tonyjiang.hatimi.top/mutual-help/announcement?category=hongbao&deviceId=' + device.getAndroidId(), {}, (res, err) => {
    if (err) {
      console.error('请求异常', err)
      disposable.setAndNotify({ success: false, error: '请求异常' + err })
      return
    }
    if (res.body) {
      let responseStr = res.body.string()
      console.log('获取响应：', responseStr)
      try {
        let data = JSON.parse(responseStr)
        if (data.announcement) {
          console.log('红包口令码：' + data.announcement.text)
          disposable.setAndNotify({ success: true, text: data.announcement.text })
        } else if (data.error) {
          toastLog(data.error)
          disposable.setAndNotify({ success: false, erorr: data.error })
        }
      } catch (e) {
        console.error('执行异常' + e)
        disposable.setAndNotify({ success: false, erorr: '执行异常，具体见日志' })
      }
    }
  })

  let result = disposable.blockedGet()
  let code = defaultCode
  if (result.success) {
    LogFloaty.pushLog('获取口令码成功' + result.text)
  } else {
    LogFloaty.pushWarningLog('获取口令码失败，使用默认口令' + defaultCode)
  }
  setClip(code)
  LogFloaty.pushLog('打开支付宝中')
  app.startActivity({
    action: 'VIEW',
    data: 'alipays://platformapi/startapp?appId=20001003&keyword=' + encodeURI(code) + '&v2=true',
    packageName: 'com.eg.android.AlipayGphone'
  })
  sleep(1000)
  if (widgetUtils.widgetWaiting('去领取')) {
    sleep(1000)
    let target = widgetUtils.widgetGetOne('去领取', 1000)
    LogFloaty.pushLog('去领取')
    automator.clickCenter(target)
    sleep(1000)
  } else {
    LogFloaty.pushWarningLog('查找 去领取 失败，请手动领取')
  }
}