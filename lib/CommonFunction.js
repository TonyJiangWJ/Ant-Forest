let config = require('../config.js')
function CommonFunctions() {
  this.show_temp_floaty = function (text) {
    floaty.closeAll()
    var w = floaty.rawWindow(
      <frame gravity="center" bg="#77ff0000">
        <text id="content" />
      </frame>
    )
    ui.run(function () {
      w.content.text(text)
    })
    w.setSize(-2, -2)

    setTimeout(function () {
      w.close()
    }, 2000)
  }

  this.common_delay = function (minutes, text) {
    if (typeof text === 'undefined' || text === '') {
      text = '距离下次运行还有['
    }

    minutes = typeof minutes != null ? minutes : 0
    if (minutes === 0) {
      return
    }
    let startTime = new Date().getTime()
    let timestampGap = minutes * 60000
    let i = 0
    for (;;) {
      let now = new Date().getTime()
      if (now - startTime > timestampGap) {
        break
      }
      i = (now - startTime) / 60000
      let left = minutes - i
      log(text + left.toFixed(2) + ']分')
      this.show_temp_floaty(text + (minutes - i).toFixed(2) + ']分')

      if (left * 60000 > 30000) {
        sleep(30000)
      } else {
        sleep(left * 60000)
      }
    }
    }

  this.debug = function (string) {
    if (config.show_debug_log) {
      log(string)
      if (config.toast_debug_info) {
        toast(string)
      }
    }
  }

  this.asyncOperation = function (operation, operationDesc, predicate, retryDelay) {
    retryDelay = typeof retryDelay !== 'undefined' ? retryDelay : 1000
    commonFunctions.debug("等待" + operationDesc)
    let restartLoop = false
    let lock = threads.lock()
    let complete = lock.newCondition()
    let checkThread = threads.start(function () {
      lock.lock()
      commonFunctions.debug('子线程获得锁')
      let count = 1
      let running = true
      operation()
      ///sleep(1000)
      while (running) {
        if (count > 5) {
          log('重试超过5次，取消操作')
          restartLoop = true
          break
        }
        if (!predicate()) {
          commonFunctions.debug('未能' + operationDesc + '，再次尝试 count:' + count++)
          operation()
          sleep(retryDelay)
        } else {
          running = false
          commonFunctions.debug(operationDesc + "成功")
        }
      }
      complete.signal()
      lock.unlock()
      commonFunctions.debug('子线程发送信号并释放锁')
    })
    lock.lock()
    commonFunctions.debug('主线程获得锁并等待')
    complete.await()
    lock.unlock()
    checkThread.interrupt()
    return restartLoop
  }
}

module.exports = CommonFunctions