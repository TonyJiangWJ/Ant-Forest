let config = require('../config.js')
let formatDate = require("./DateUtil.js")
function CommonFunctions() {
  this.show_temp_floaty = function (text, wd) {
    floaty.closeAll()
    let width = wd || 180
    var w = floaty.window(
      <card cardBackgroundColor="#aa000000" cardCornerRadius="20dp">
        <horizontal w="200" h="35" paddingLeft="15" gravity="center">
          <text
            id="content"
            w="120"
            h="25"
            textSize="10dp"
            textColor="#ffffff"
            layout_gravity="center"
            gravity="left|center"
          />
          <card
            id="stop"
            w="25"
            h="25"
            cardBackgroundColor="#fafafa"
            cardCornerRadius="15dp"
            layout_gravity="right|center"
            paddingRight="-15"
          >
            <text
              w="25"
              h="25"
              textSize="16dp"
              textColor="#000000"
              layout_gravity="center"
              gravity="center"
            >
              ×
            </text>
          </card>
        </horizontal>
      </card>
    )
    ui.run(function () {
      w.content.text(text)
    })
    // w.setSize(180, 30)
    w.stop.on('click', () => {
      w.close()
    })
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
    // 赋值间隔时间 使第一次直接显示悬浮窗
    let delayShowStampPoint = -delayShowGapCfg
    let delayShowGap = 0

    let delayLogStampPoint = -1
    let delayLogGap = 0
    for (;;) {
      let now = new Date().getTime()
      if (now - startTime > timestampGap) {
        break
      }
      i = (now - startTime) / 60000
      let left = minutes - i
      let showFloaty = false
      let showLog = false
      delayLogGap = i - delayLogStampPoint
      // 半分钟打印一次日志
      if (delayLogGap >= 0.5) {
        delayLogStampPoint = i
        showLog = true
      }
      // 运行在非debug模式下也即不显示debug日志的情况下，隔五分钟显示悬浮窗
      if (!config.show_debug_log) {
        delayShowGap = i - delayShowStampPoint
        if (left <= 2 || delayShowGap >= delayShowGapCfg) {
          delayShowStampPoint = i
          showFloaty = true
        }
      } else {
        showFloaty = true
      }

      if (showFloaty && (left > 2 || showLog)) {
        this.show_temp_floaty(text + left.toFixed(2) + ']分')
      }
      if (showLog) {
        this.log(text + left.toFixed(2) + ']分')
      }
      sleep(500)
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