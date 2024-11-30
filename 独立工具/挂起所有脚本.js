
importClass(java.io.StringWriter)
importClass(java.io.StringReader)
importClass(java.io.PrintWriter)
importClass(java.io.BufferedReader)
importClass(java.lang.StringBuilder)
importClass(android.content.Intent)
importClass(android.view.View)

importClass('org.autojs.autojs.timing.TaskReceiver')
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

let { config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)

config.save_log_file = false
config.async_save_log_file = false
let commonFunction = sRequire('CommonFunction')
let logUtils = sRequire('LogUtils')
let runningQueueDispatcher = sRequire('RunningQueueDispatcher')
let NotificationHelper = sRequire('Notification')

runningQueueDispatcher.addRunningTask()

let stop = false
// 固定通知ID
const NOTICE_ID = 1111

commonFunction.registerOnEngineRemoved(function () {
  runningQueueDispatcher.removeRunningTask()
  NotificationHelper.cancelNotice(NOTICE_ID)
  stop = true
})
NotificationHelper.createNotification('当前等待中任务数：0', '当前无任务等待执行中', NOTICE_ID)
setInterval(() => {
  runningQueueDispatcher.showDispatchStatus()
  runningQueueDispatcher.renewalRunningTask()
  let waitingQueueStr = runningQueueDispatcher.getStorage().get("waitingQueue")
  if (waitingQueueStr) {
    let waitingQueue = JSON.parse(waitingQueueStr)
    if (waitingQueue && waitingQueue.length > 0) {
      let startScriptIntent = new Intent(context, TaskReceiver)
      startScriptIntent.setAction(new Date().getTime() + '')
      let scriptPath = waitingQueue[0].source
      // todo 当前为关闭 ’挂起所有脚本.js‘ 触发调度（当前前台包名在白名单时任务无法立即执行），后续修改为 直接运行脚本
      startScriptIntent.putExtra('script', buildScript(scriptPath))
      startScriptIntent.putExtra('triggerByNotice', new Date().getTime() + '')
      NotificationHelper.createNotification('当前等待中任务数：' + waitingQueue.length,
        '点击可以执行第一个任务：' + scriptPath.replace('/storage/emulated/0', '').replace('/sdcard', ''),
        NOTICE_ID, true, startScriptIntent)
    } else {
      NotificationHelper.createNotification('当前等待中任务数：0', '当前无任务等待执行中', NOTICE_ID)
    }
  }
}, 10000)

function buildScript (scriptPath) {
  return `
  engines.all().filter(engine => (engine.getSource() + '').endsWith('挂起所有脚本.js')).forEach(engine => engine.forceStop());
  `
}
