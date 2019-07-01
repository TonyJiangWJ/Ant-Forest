let { config } = require('../config.js')
let { formatDate } = require('./DateUtil.js')
let RUNTIME_STORAGE = 'ant_forest_runtime_store'
let ENERGY_TAG = 'energy'
let RUN_TIMES_TAG = 'runTimes'
let PROTECT_TAG = 'protectList'
let FRIEND_COLLECT_TAG = 'friendCollect'
let floatyWindow = null

function CommonFunctions() {
  /**
   * 关闭悬浮窗并将floatyWindow置为空，在下一次显示时重新新建悬浮窗 因为close之后的无法再次显示
   */
  this.closeFloatyWindow = function () {
    floaty.closeAll()
    floatyWindow = null
  }

  /**
   * 显示mini悬浮窗
   */
  this.showMiniFloaty = function (text, color) {
    if (this.isEmpty(floatyWindow)) {
      floatyWindow = floaty.rawWindow(
        <frame gravity="left">
          <text id="content" textSize="8dp" textColor="#15ff00" />
        </frame>
      )
      let floaty_x = config.min_floaty_x || 150
      let floaty_y = config.min_floaty_y || 20
      floatyWindow.setPosition(parseInt(floaty_x), parseInt(floaty_y))
    }
    ui.run(function () {
      floatyWindow.content.text(text)
    })
  }

  /**
   * 显示悬浮窗 根据配置自动显示mini悬浮窗和可关闭悬浮窗，目前来说不推荐使用可关闭悬浮窗
   * @param text {String} 悬浮窗文字内容
   */
  this.showTextFloaty = function (text) {
    if (config.show_small_floaty) {
      this.showMiniFloaty(text)
    } else {
      this.showCloseableFloaty(text)
    }
  }

  /**
   * 显示可关闭悬浮窗 不推荐使用 不友好
   */
  this.showCloseableFloaty = function (text) {
    if (this.isEmpty(floatyWindow)) {
      floatyWindow = floaty.window(
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
      // w.setSize(180, 30)
      floatyWindow.stop.on('click', () => {
        floatyWindow.close()
        floatyWindow = null
      })
    }
    ui.run(function () {
      floatyWindow.content.text(text)
    })

  }

  this.commonDelay = function (minutes, text) {
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
    let delayLogStampPoint = -1
    let delayLogGap = 0
    for (; ;) {
      let now = new Date().getTime()
      if (now - startTime > timestampGap) {
        break
      }
      i = (now - startTime) / 60000
      let left = minutes - i
      delayLogGap = i - delayLogStampPoint
      // 半分钟打印一次日志
      if (delayLogGap >= 0.5) {
        delayLogStampPoint = i
        this.showTextFloaty(text + left.toFixed(2) + ']分')
        this.debug(text + left.toFixed(2) + ']分')
      }
      sleep(500)
    }
  }

  this.info = function (string, isToast) {
    if (isToast) {
      toast(string)
    }
    console.info(string)
    this.appedLog(string)
  }

  this.warn = function (string, isToast) {
    if (isToast) {
      toast(string)
    }
    console.warn(string)
    this.appedLog(string)
  }

  this.error = function (string, isToast) {
    if (isToast) {
      toast(string)
    }
    console.error(string)
    this.appedLog(string)
  }

  this.debug = function (string, isToast) {
    if (config.show_debug_log) {
      console.verbose(string)
      if (config.toast_debug_info || isToast) {
        toast(string)
      }
    }
    this.appedLog(string)
  }

  this.log = function (string, isToast) {
    if (isToast) {
      toastLog(string)
    } else {
      log(string)
    }
    this.appedLog(string)
  }

  this.appedLog = function (content) {
    let string = formatDate(new Date()) + ":" + content + "\n"
    files.append("../log-verbose.log", string);
  }

  this.persistHistoryEnergy = function (energy) {
    let string = formatDate(new Date()) + ':' + energy + 'g\n'
    files.append('../history-energy.log', string)
  }

  /**
   * 根据传入key创建当日缓存
   */
  this.createTargetStore = function (key, today) {
    if (key === ENERGY_TAG) {
      return this.createEnergyStore(today)
    } else if (key === RUN_TIMES_TAG) {
      return this.createRunTimesStore(today)
    } else if (key === PROTECT_TAG) {
      return this.createProtectStore(today)
    }
  }

  /**
   * 创建能量信息缓存
   */
  this.createEnergyStore = function (today) {
    let initEnergy = {
      date: today,
      totalIncrease: 0
    }
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(ENERGY_TAG, JSON.stringify(initEnergy))
    return initEnergy
  }

  /**
   * 创建运行次数缓存
   */
  this.createRunTimesStore = function (today) {
    let initRunTimes = {
      date: today,
      runTimes: 0
    }

    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(RUN_TIMES_TAG, JSON.stringify(initRunTimes))
    return initRunTimes
  }

  /**
   * 创建能量保护信息缓存
   */
  this.createProtectStore = function (today) {
    let initProtect = {
      date: today,
      protectList: []
    }
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(PROTECT_TAG, JSON.stringify(initProtect))
    return initProtect
  }

  /**
   * 获取当天的缓存信息，不存在时创建一个初始值
   * @param key {String} key名称
   */
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

  /**
   * 通用更新缓存方法
   * @param key {String} key值名称
   * @param valObj {Object} 存值对象
   */
  this.updateRuntimeStorage = function (key, valObj) {
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(key, JSON.stringify(valObj))
  }

  /**
   * 存储能量值
   */
  this.storeEnergy = function (newVal) {
    let existEnergy = this.getTodaysRuntimeStorage(ENERGY_TAG)
    if (this.isEmpty(existEnergy.startEnergy)) {
      existEnergy.startEnergy = newVal
    }
    // 获取已存在的能量值
    let existEnergyVal = existEnergy.existVal

    existEnergy.preEnergy = existEnergyVal
    existEnergy.existVal = newVal
    existEnergy.totalIncrease = newVal - existEnergy.startEnergy
    // 更新存储数据
    this.updateRuntimeStorage(ENERGY_TAG, existEnergy)
  }

  /**
   * 增加运行次数 并返回当前运行次数
   */
  this.increaseRunTimes = function () {
    let runTimesStore = this.getTodaysRuntimeStorage(RUN_TIMES_TAG)
    let preRunTimes = runTimesStore.runTimes || 0
    runTimesStore.runTimes = preRunTimes + 1
    this.updateRuntimeStorage(RUN_TIMES_TAG, runTimesStore)
    return preRunTimes + 1
  }

  /**
   * 打印能量收集信息
   */
  this.showEnergyInfo = function () {
    let existEnergy = this.getTodaysRuntimeStorage(ENERGY_TAG)
    let runTimesStore = this.getTodaysRuntimeStorage(RUN_TIMES_TAG)
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

  /**
   * 校验好友名字是否在保护列表中 当前判断只能说当天不会再收取，无法判断好友保护罩什么时候消失 功能待强化
   */
  this.checkIsProtected = function (objName) {
    let protectStore = this.getTodaysRuntimeStorage(PROTECT_TAG)
    if (this.isEmptyArray(protectStore.protectList)) {
      return false
    }
    return protectStore.protectList.indexOf(objName) > -1
  }

  /**
   * 将好友名字存入保护列表
   */
  this.addNameToProtect = function (objName) {
    let protectStore = this.getTodaysRuntimeStorage(PROTECT_TAG)
    protectStore.protectList.push(objName)
    // 更新数据到缓存
    this.updateRuntimeStorage(PROTECT_TAG, protectStore)
  }

  this.isEmpty = function (val) {
    return val === null || typeof val === 'undefined' || val === ''
  }

  this.isEmptyArray = function (array) {
    return array === null || typeof array === 'undefined' || array.length === 0
  }

  this.clearLogFile = function () {
    files.write("../log-verbose.log", "logs for [" + formatDate(new Date()) + "]")
  }

  this.addOpenPlacehold = function (content) {
    //content = content || ""
    content = "<<<<<<<" + (content || "") + ">>>>>>>"
    this.appedLog(content)
    console.verbose(content)
  }

  this.addClosePlacehold = function (content) {
    //content = content || ""
    content = ">>>>>>>" + (content || "") + "<<<<<<<"
    this.appedLog(content)
    console.verbose(content)
  }

  /**
   * 获取当前脚本的运行工作路径，main.js所在的文件夹
   */
  this.getCurrentWorkPath = function () {
    let workPath = files.cwd()
    this.debug("当前脚本工作路径:" + workPath)
    return workPath
  }

  /**
   * 校验是否重复运行 如果重复运行则关闭当前脚本
   */
  this.checkDuplicateRunning = function () {
    let currentSource = engines.myEngine().getSource()
    let runningEngines = engines.all()
    let runningSize = runningEngines.length
    this.debug('当前脚本信息' + currentSource + '运行中脚本数量：' + runningSize)
    
    if (runningSize > 1) {
      runningEngines.slice(0, runningSize - 1).forEach(script => {
        let scriptSource = script.getSource() + ''
        this.debug('对比脚本信息' + scriptSource)
        if (scriptSource.indexOf(currentSource) > -1) {
          this.warn('脚本正在运行中 退出当前脚本：' + scriptSource)
          engines.myEngine().forceStop()
          exit()
        }
      })
    }
  }
}

module.exports = {
  commonFunctions: new CommonFunctions()
}