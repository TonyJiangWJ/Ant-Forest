
importClass(java.io.StringWriter)
importClass(java.io.StringReader)
importClass(java.io.PrintWriter)
importClass(java.io.BufferedReader)
importClass(java.lang.StringBuilder)
importClass(android.view.View)
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

runningQueueDispatcher.addRunningTask()

let stop = false

commonFunction.registerOnEngineRemoved(function () {
  runningQueueDispatcher.removeRunningTask()
  stop = true
})


let floatyWindow = floaty.rawWindow(
  <horizontal>
    <text id="text" fontFamily="sans-serif-medium" typeface="normal" text="当前任务: 0" textSize="12dp"></text>
  </horizontal>
)

setInterval(() => {
  runningQueueDispatcher.showDispatchStatus()
  runningQueueDispatcher.renewalRunningTask()
  let waitingQueueStr = runningQueueDispatcher.getStorage().get("waitingQueue")
  if (waitingQueueStr) {
    let waitingQueue = JSON.parse(waitingQueueStr)
    if (waitingQueue && waitingQueue.length > 0) {
      ui.run(function () {
        floatyWindow.text.setText('当前等待中任务：' + waitingQueue.length)
      })
    } else {
      ui.run(function () {
        floatyWindow.text.setText('当前等待中任务：0')
      })
    }
  }
}, 30000)

ui.run(function () {
  floatyWindow.text.setText('当前等待中任务：0')
})