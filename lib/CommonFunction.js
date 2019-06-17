let config = require('../config.js')
function CommonFunctions() {
  this.show_temp_floaty = function (text) {
    floaty.closeAll()
    var w = floaty.window(
      <card cardBackgroundColor="#aa000000" cardCornerRadius="20dp">
        <horizontal w="auto" h="40" paddingLeft="15" gravity="center">
          <text
            id="content"
            w="180"
            h="30"
            textSize="12dp"
            textColor="#ffffff"
            layout_gravity="center"
            gravity="left|center"
          />
        </horizontal>
      </card>
    )
    // var w = floaty.rawWindow(
    //   <frame gravity="center" bg="#77ff0000">
    //     <text id="content" />
    //   </frame>
    // )
    ui.run(function () {
      w.content.text(text)
    })
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
    // 当运行在非debug模式下，五分钟显示一次悬浮窗，避免在金融相关app下无悬浮窗权限导致系统老是弹权限管理
    let delayShowGapCfg = 5
    let delayShowStampPoint = -1
    let delayShowGap = 0
    for (;;) {
      let now = new Date().getTime()
      if (now - startTime > timestampGap) {
        break
      }
      i = (now - startTime) / 60000
      let left = minutes - i
      let showFloaty = false
      // 第一次启动时，显示内容并将point值赋值为0
      if (delayShowStampPoint == -1) {
        showFloaty = true
        delayShowStampPoint = 0
      }
      // 运行在非debug模式下也即不显示debug日志的情况下，隔五分钟显示悬浮窗
      if (!config.show_debug_log) {
        delayShowGap = i - delayShowStampPoint
        if (delayShowGap > delayShowGapCfg) {
          delayShowStampPoint = i
          showFloaty = true
        } else if (left <= 2) {
          showFloaty = true
        }
      } else {
        showFloaty = true
      }

      if (showFloaty) {
        this.show_temp_floaty(text + left.toFixed(2) + ']分')
      }
      this.log(text + left.toFixed(2) + ']分')

      if (left * 60000 > 30000) {
        sleep(30000)
      } else {
        sleep(left * 60000)
      }
    }
  }

  this.debug = function (string) {
    if (config.show_debug_log) {
      log("debug:" + string)
      if (config.toast_debug_info) {
        toast(string)
      }
    }
    string = formatDate(new Date()) + ":" + string + "\n"
    files.append("../log-verbose.log", string);
  }

  this.log = function (string) {
    log(string)
    string = formatDate(new Date()) + ":" + string + "\n"
    files.append("../log-verbose.log", string);
  }

  this.persitst_history_energy = function (energy) {
    let string = formatDate(new Date()) + ':' + energy + 'g\n'
    files.append('../history-energy.log', string)
  }

  this.clearLogFile = function () {
    files.write("../log-verbose.log", "logs for [" + formatDate(new Date()) + "]")
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
          this.log('重试超过5次，取消操作')
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