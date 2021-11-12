runtime.loadDex('../lib/autojs-common.dex')
importClass(com.tony.autojs.common.ImagesResolver)
let ResultAdapter = require('result_adapter')
console.show()

let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(engine => {
    let compareEngine = engine
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop()
    }
  })
}

let permission = requestScreenCapture()

let screen = null
let captureThread = createCaptureThread()
let failedCount = 0
threads.start(function () {
  while (true) {
    if (permission) {
      if (screen == null) {
        log('截图失败')
        failedCount++
      } else {
        failedCount = 0
      }
    }
    log('截图线程截图：' + (screen != null ? screen.getWidth() : false))
    screen = null
    if (failedCount > 3 && permission) {
      permission = false
      ImagesResolver.releaseImageCapture(runtime)
      sleep(1000)
      log('准备重新获取截图权限')
      permission = ResultAdapter.wait(ImagesResolver.requestScreenCapture(runtime))
      log('重新获取截图权限：' + permission)
      captureThread.interrupt()
      console.verbose('准备重新创建截图线程')
      captureThread = createCaptureThread()
      console.verbose('重新创建截图线程')
      failedCount = 0
    }
    sleep(2000)
  }
})

function createCaptureThread () {
  return threads.start(function () {
    while (true && !java.lang.Thread.currentThread().isInterrupted()) {
      if (!permission) {
        return
      }
      console.verbose('准备截图')
      screen = captureScreen()
      if (screen) {
        toastLog('截图成功')
        sleep(2000)
      }
    }
  })
}