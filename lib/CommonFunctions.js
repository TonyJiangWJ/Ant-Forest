/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-07-04 00:14:22
 * @Description: 公用方法
 */
let config = storages.create("ant_forest_config")
let { formatDate } = require('./DateUtil.js')
let Timers = require('./__timers__pro_v37.js')(runtime, this)

let RUNTIME_STORAGE = 'ant_runtime_store'
let ENERGY_TAG = 'energy'
let RUN_TIMES_TAG = 'runTimes'
let PROTECT_TAG = 'protectList'
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
      let floaty_x = config.get("min_floaty_x") || 150
      let floaty_y = config.get("min_floaty_y") || 20
      floatyWindow.setPosition(parseInt(floaty_x), parseInt(floaty_y))
    }
    ui.run(function () {
      floatyWindow.content.text(text)
    })
  }

  this.commonDelay = function (minutes, text) {
    debugInfo('倒计时' + minutes)
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
        this.showMiniFloaty(text + left.toFixed(2) + ']分')
        debugInfo(text + left.toFixed(2) + ']分')
      }
      sleep(500)
    }
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
    } else if (key === FRIEND_COLLECT_TAG) {
      return this.createFriendCollectStore(today)
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
        debugInfo("解析JSON数据失败, key:" + key + " value:" + existStoreObjStr, e)
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
    logInfo(summary)
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

  this.addOpenPlacehold = function (content) {
    //content = content || ""
    content = "<<<<<<<" + (content || "") + ">>>>>>>"
    console.verbose(content)
  }

  this.addClosePlacehold = function (content) {
    //content = content || ""
    content = ">>>>>>>" + (content || "") + "<<<<<<<"
    console.verbose(content)
  }

  /**
   * 获取当前脚本的运行工作路径，main.js所在的文件夹
   */
  this.getCurrentWorkPath = function () {
    let workPath = files.cwd()
    debugInfo("当前脚本工作路径:" + workPath)
    return workPath
  }

  /**
   * 校验是否重复运行 如果重复运行则关闭当前脚本
   */
  this.checkDuplicateRunning = function () {
    let currentEngine = engines.myEngine()
    let runningEngines = engines.all()
    let runningSize = runningEngines.length
    let currentSource = currentEngine.getSource() + ''
    debugInfo('当前脚本信息 id:' + currentEngine.id + ' source:' + currentSource + ' 运行中脚本数量：' + runningSize)
    if (runningSize > 1) {
      runningEngines.forEach(script => {
        let compareEngine = script
        let compareSource = compareEngine.getSource() + ''
        debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource)
        if (currentEngine.id !== compareEngine.id && compareSource + '' === currentSource) {
          warnInfo('脚本正在运行中 退出当前脚本：' + currentSource, true)
          engines.myEngine().forceStop()
          exit()
        }
      })
    }
  }

  /**
   * 获取真实的main.js的路径
   */
  this.getRealMainScriptPath = function () {
    let currentPath = this.getCurrentWorkPath()
    if (files.exists(currentPath + '/main.js')) {
      return currentPath + '/main.js'
    }
    let paths = currentPath.split('/')

    do {
      paths = paths.slice(0, paths.length - 1)
      currentPath = paths.reduce((a, b) => a += '/' + b)
    }
    while (!files.exists(currentPath + '/main.js') && paths.length > 0);
    if (paths.length > 0) {
      return currentPath + '/main.js'
    } else {
      errorInfo('无法获取main.js的路径')
    }
  }

  /**
   * 设置指定时间后自动启动main脚本
   */
  this.setUpAutoStart = function (minutes) {
    let mainScriptJs = this.getRealMainScriptPath()
    let millis = new Date().getTime() + minutes * 60 * 1000;
    // 预定一个{minutes}分钟后的任务
    let task = Timers.addDisposableTask({
      path: mainScriptJs,
      date: millis
    })
    debugInfo("定时任务预定成功: " + task.id);
  }
}

module.exports = {
  commonFunctions: new CommonFunctions()
}