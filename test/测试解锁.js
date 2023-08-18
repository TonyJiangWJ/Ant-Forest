var { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')

let floatyInstance = singletonRequire('FloatyUtil')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')

if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
let unlocker = require('../lib/Unlock.js')

floatyInstance.setFloatyInfo({ x: parseInt(config.device_width / 2.7), y: parseInt(config.device_height / 2) }, ' ', { textSize: 20 })
config.unlock_device_flag = null
while (!unlocker.unlocker.is_locked()) {
  let lock = threads.lock()
  let complete = lock.newCondition()
  let awaitDialog = dialogs.build({
    cancelable: false,
    negative: '取消',
    positive: '确定',
    title: '请手动锁屏',
    content: '请手动锁定屏幕，脚本将在点击确定5秒后开始识别自动解锁'
  })
    .on('negative', () => {
      exit()
    })
    .on('positive', () => {
      lock.lock()
      complete.signal()
      lock.unlock()
      awaitDialog.dismiss()
    })
    .show()
  lock.lock()
  complete.await()
  lock.unlock()
  let limit = 5
  while (limit > 0) {
    floatyInstance.setFloatyText('倒计时' + limit-- + '秒')
    sleep(1000)
  }
}

device.vibrate(200)
unlocker.exec()


toastLog('解锁完毕')