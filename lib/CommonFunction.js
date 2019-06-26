let {config} = require('../config.js')
let formatDate = require("./DateUtil.js")
let RUNTIME_STORAGE = 'ant_forest_runtime_store'
function CommonFunctions() {
  this.show_raw_floaty = function (text, color) {
    floaty.closeAll()
    var w = floaty.rawWindow(
      <frame gravity="left">
        <text id="content" textSize="8dp" textColor="#15ff00"/>
      </frame>
    )
    let floaty_x = config.min_floaty_x || 150
    let floaty_y = config.min_floaty_y || 20
    w.setPosition(parseInt(floaty_x), parseInt(floaty_y))
    ui.run(function () {
      w.content.text(text)
    })
  }

  this.show_temp_floaty = function (text) {
    if (config.show_small_floaty) {
      this.show_raw_floaty(text)
    } else {
      this.show_closeable_floaty(text)
    }
  }

  this.show_closeable_floaty = function (text) {
    floaty.closeAll()
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
    this.debug('倒计时' + minutes)
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
        showFloaty = showLog
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

  this.createTargetStore = function (key, today) {
    if (key === 'energy') {
      return this.createEnergyStore(today)
    } else if (key === 'runTimes') {
      return this.createRunTimesStore(today)
    }
  }

  this.createEnergyStore = function (today) {
    let initEnergy = {
      date: today,
      totalIncrease: 0
    }
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put('energy', JSON.stringify(initEnergy))
    return initEnergy
  }

  this.createRunTimesStore = function (today) {
    let initRunTimes = {
      date: today,
      runTimes: 0
    }

    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put('runTimes', JSON.stringify(initRunTimes))
    return initRunTimes
  }

  this.getTodaysRuntimeStorage = function (key) {
    let today = formatDate(new Date(), 'yyyy-MM-dd')
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    let existStoreObjStr = runtimeStorages.get(key)
    if (existStoreObjStr) {
      try {
        let existStoreObj = JSON.parse(existStoreObjStr)
        if (existStoreObj.date === today) {
          return existStoreObj
        }
      } catch (e) {
        this.debug("解析JSON数据失败, key:" + key + " value:" + existStoreObjStr, e)
      }
    }
    return this.createTargetStore(key, today)
  }

  this.updateRuntimeStorage = function (key, valObj) {
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(key, JSON.stringify(valObj))
  }

  this.storeEnergy = function (newVal) {
    let existEnergy = this.getTodaysRuntimeStorage('energy')
    if (this.isEmpty(existEnergy.startEnergy)) {
      existEnergy.startEnergy = newVal
    }
    // 获取已存在的能量值
    let existEnergyVal = existEnergy.existVal
    if (existEnergyVal === newVal) {
      // 能量无变化则不存储任何值
      return
    }
    existEnergy.preEnergy = existEnergyVal
    existEnergy.existVal = newVal
    existEnergy.totalIncrease = newVal - existEnergy.startEnergy
    // 更新存储数据
    this.updateRuntimeStorage('energy', existEnergy)
  }

  this.increaseRunTimes = function () {
    let runTimesStore = this.getTodaysRuntimeStorage('runTimes')
    let preRunTimes = runTimesStore.runTimes || 0
    runTimesStore.runTimes = preRunTimes + 1
    this.updateRuntimeStorage('runTimes', runTimesStore)
    return preRunTimes + 1
  }

  this.showEnergyInfo = function () {
    let existEnergy = this.getTodaysRuntimeStorage('energy')
    let runTimesStore = this.getTodaysRuntimeStorage('runTimes')
    let date = existEnergy.date
    let startEnergy = existEnergy.startEnergy
    let endEnergy = existEnergy.existVal
    let preEnergy = existEnergy.preEnergy || startEnergy
    let runTimes = runTimesStore.runTimes || 0
    let summary = "日期：" + date + "，启动时能量:" + startEnergy + "g" +
      (runTimes > 0
        ? ", 截止当前已收集:" + (endEnergy - startEnergy) + "g, 已运行[" + runTimes + "]次, 上轮收集:" + (endEnergy - preEnergy) + "g"
        : "")
    this.log(summary)
    return existEnergy
  }

  this.isEmpty = function (val) {
    return val === null || typeof val === 'undefined' || val === ''
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