importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)

let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(compareEngine => {
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop()
    }
  })
}

let args = engines.myEngine().execArgv
console.log('来源参数：' + JSON.stringify(args))
let { config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let widgetUtils = sRequire('WidgetUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let FloatyInstance = sRequire('FloatyUtil')
let NotificationHelper = sRequire('Notification')
let LogFloaty = sRequire('LogFloaty')
let SimpleFloatyButton = require('../lib/FloatyButtonSimple.js')
if (!FloatyInstance.init()) {
  toastLog('初始化悬浮窗失败')
  exit()
}
FloatyInstance.enableLog()
if (!commonFunction.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
config.show_debug_log = true
let runningQueueDispatcher = sRequire('RunningQueueDispatcher')
commonFunction.autoSetUpBangOffset(true)
runningQueueDispatcher.addRunningTask()


let clickButtons = new SimpleFloatyButton('clickBalls', [
  {
    id: 'getMutualCode',
    text: '获取互助码并打开',
    onClick: function () {
      getCodeAndOpen()
    }
  },
  {
    id: 'hangout',
    text: '开始逛一逛',
    onClick: function () {
      toastLog('请手动进入逛一逛界面，自动上下滑动15秒')
      clickButtons.changeButtonStyle('hangout', null, '#FF753A')
      let limit = 16
      while (limit-- > 0) {
        let start = new Date().getTime()
        LogFloaty.replaceLastLog('逛一逛 等待倒计时结束 剩余：' + limit + 's')
        clickButtons.changeButtonText('hangout', '等待' + limit + 's')
        if (limit % 2 == 0) {
          automator.randomScrollDown()
        } else {
          automator.randomScrollUp()
        }
        sleep(1000 - (new Date().getTime() - start))
      }
      clickButtons.changeButtonStyle('hangout', null, '#3FBE7B')
      clickButtons.changeButtonText('hangout', '开始逛一逛')
    }
  }
])
let clickButtonWindow = clickButtons.window


// 保持运行
setInterval(function () { }, 1000)

commonFunction.registerOnEngineRemoved(function () {
  runningQueueDispatcher.removeRunningTask()
  isRunning = false
})


function getCodeAndOpen () {
  clickButtons.changeButtonStyle('getMutualCode', null, '#FF753A')
  clickButtons.changeButtonText('getMutualCode', '请求中...')
  toastLog('请求服务接口获取中，请稍后')
  let disposable = threads.disposable()
  http.get('https://tonyjiang.hatimi.top/mutual-help/random?category=forestTreasureHunt&deviceId=' + device.getAndroidId(), {}, (res, err) => {
    if (err) {
      console.error('请求异常', err)
      disposable.setAndNotify({ success: false, erorr: '请求异常' })
      return
    }
    if (res.body) {
      let responseStr = res.body.string()
      console.log('获取响应：', responseStr)
      try {
        let data = JSON.parse(responseStr)
        if (data.record) {
          console.log('互助码：' + data.record.text)
          disposable.setAndNotify({ success: true, text: data.record.text })
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
  if (result.success) {
    setClip(result.text)
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=20001003&keyword=' + encodeURI(result.text) + '&v2=true',
      packageName: 'com.eg.android.AlipayGphone'
    })
  } else {
    toastLog('获取互助码失败' + result.error)
  }
  clickButtons.changeButtonText('getMutualCode', '获取互助码并打开')
  clickButtons.changeButtonStyle('getMutualCode', null, '#3FBE7B')
}