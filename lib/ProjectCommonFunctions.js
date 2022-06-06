/**
 * 每个项目里面新增或者修改的方法集合
 */
let { config: _config } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let _logUtils = singletonRequire('LogUtils')
let formatDate = require('./DateUtil.js')
let storageFactory = singletonRequire('StorageFactory')
let ENERGY_TAG = 'energy'
let RUN_TIMES_TAG = 'runTimes'
let PROTECT_TAG = 'protectList'
let FRIEND_COLLECT_TAG = 'friendCollect'
let BAIDU_INVOKE_COUNT = 'baiduInvokeCount'
let TESSERAC_INVOKE_COUNT = 'tesseracInvokeCount'
let WATERING_COOPERATION_PLANT = 'wateringCooperationPlant'
let USER_NAME_MD5 = 'userNameImgMD5'
let REWARD_COLLECTED = 'rewardCollected'
let FAKE_WALKING_DATA = 'fakeWalkingData'
let window = this
let BaseCommonFunction = require('./BaseCommonFunctions.js')

const ProjectCommonFunction = function () {
  BaseCommonFunction.call(this)

  /**
   * 定义缓存KEY列表 用于导出运行时数据
   */
  this.keyList = [ENERGY_TAG, RUN_TIMES_TAG, PROTECT_TAG, FRIEND_COLLECT_TAG, BAIDU_INVOKE_COUNT, TESSERAC_INVOKE_COUNT, WATERING_COOPERATION_PLANT, USER_NAME_MD5, REWARD_COLLECTED, FAKE_WALKING_DATA]

  this.persistHistoryEnergy = function (energy) {
    let string = formatDate(new Date()) + ':' + energy + 'g\n'
    try {
      files.append(FileUtils.getRealMainScriptPath(true) + '/history-energy.log', string)
    } catch (e) {
      _logUtils.errorInfo('保存历史能量数据失败')
      this.printExceptionStack(e)
    }
  }

  this.getTodaysIncreasedEnergy = function () {
    return this.getTodaysRuntimeStorage(ENERGY_TAG).totalIncrease || 0
  }

  this.showCollectSummaryFloaty0 = function (totalIncrease, currentTime, increased) {
    increased = increased || 0
    _logUtils.debugInfo(['show floaty increased:{}', increased])
    let energyInfo = this.getTodaysRuntimeStorage(ENERGY_TAG)
    let content = ''
    if (_config.is_cycle) {
      totalIncrease = isFinite(totalIncrease) && totalIncrease > 0 ? totalIncrease : 0
      content = '第 ' + currentTime + ' 次循环, 循环已增加:' + (totalIncrease + increased) + 'g'
    } else {
      let runTimes = this.getTodaysRuntimeStorage('runTimes')
      content = '第 ' + runTimes.runTimes + ' 次运行, 累计已增加:' + ((energyInfo.totalIncrease || 0) + increased) + 'g'
    }
    _logUtils.debugInfo('展示悬浮窗内容：' + content)
    this.showTextFloaty(content)
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
    return runTimesStore.runTimes
  }


  /**
   * 增加调用次数 并返回当前已经调用次数
   */
  this.increaseInvokeCount = function () {
    let invokeStorage = this.getTodaysRuntimeStorage(BAIDU_INVOKE_COUNT)
    let count = invokeStorage.count || 0
    invokeStorage.count = count + 1
    this.updateRuntimeStorage(BAIDU_INVOKE_COUNT, invokeStorage)
    return invokeStorage.count
  }

  /**
   * 增加调用次数 并返回当前已经调用次数
   */
  this.increaseTesseracInvokeCount = function () {
    let invokeStorage = this.getTodaysRuntimeStorage(TESSERAC_INVOKE_COUNT)
    let count = invokeStorage.count || 0
    invokeStorage.count = count + 1
    this.updateRuntimeStorage(TESSERAC_INVOKE_COUNT, invokeStorage)
    return invokeStorage.count
  }

  /**
   * 获取百度OCR调用次数信息
   */
  this.getBaiduInvokeCountStorage = function () {
    return this.getTodaysRuntimeStorage(BAIDU_INVOKE_COUNT)
  }

  /**
   * 获取tesserac OCR调用次数信息
   */
  this.getTesseracInvokeCountStorage = function () {
    return this.getTodaysRuntimeStorage(TESSERAC_INVOKE_COUNT)
  }
  /**
   * 记录好友收集信息
   * @param friendCollect 包含好友信息
   * friendName 好友名
   * friendEnergy 好友能量总数
   * preCollect 收集前数据
   * postCollect 收集后数据
   * helpCollect 本次帮助收集能量数
   * hasSummaryWidget 是否有 你收取TA 控件存在
   * fromHelp 是否来自帮助收取，不判断浇水
   * @return {boolean} 是否浇水
   */
  this.recordFriendCollectInfo = function (friendCollect) {
    _logUtils.debugInfo('保存收集数据' + JSON.stringify(friendCollect))
    let friendCollectStore = this.getTodaysRuntimeStorage(FRIEND_COLLECT_TAG)
    let existCollectList = friendCollectStore.collectInfos || []
    let existCollectInfoIndex = existCollectList.findIndex(
      (collectInfo) => collectInfo.friendName === friendCollect.friendName
    )
    let collectInfo
    let needWateringBack = false
    if (existCollectInfoIndex > -1) {
      // 获取已存在的能量收集信息
      collectInfo = existCollectList[existCollectInfoIndex]
      collectInfo.friendEnergy = friendCollect.friendEnergy
      // 今日收集能量起始值
      collectInfo.initCollect = collectInfo.initCollect === undefined ? (collectInfo.preCollect || 0) : collectInfo.initCollect
      // 总共已收集ta的能量
      if (friendCollect.hasSummaryWidget) {
        collectInfo.totalCollect = friendCollect.postCollect
      } else {
        // 无控件时 仅仅传递当前收集的能量值 需要加上已记录的能量值
        collectInfo.totalCollect = friendCollect.postCollect - friendCollect.initCollect
      }
    } else {
      collectInfo = this.getInitCollectInfo(friendCollect)
    }
    // 今日收集ta的能量数
    collectInfo.todayCollect = collectInfo.totalCollect - collectInfo.initCollect
    collectInfo.todayHelp += friendCollect.helpCollect || 0

    // 浇水统计 
    if (
      !friendCollect.fromHelp &&
      _config.wateringBack === true &&
      // 今日收集大于阈值，且未浇过水
      collectInfo.todayCollect > _config.wateringThreshold && collectInfo.todayWatering <= 0
      // 不在浇水黑名单内
      && !(_config.wateringBlackList && _config.wateringBlackList.indexOf(friendCollect.friendName) > -1)
    ) {
      _logUtils.infoLog("已收集[" + collectInfo.friendName + "] " + collectInfo.todayCollect + "g 给他浇浇水")
      needWateringBack = true
      // 今日浇水递增
      collectInfo.todayWatering += 10
    } else {
      needWateringBack = false
    }

    if (existCollectInfoIndex > -1) {
      existCollectList[existCollectInfoIndex] = this.parseFieldToInts(collectInfo)
    } else {
      existCollectList.push(this.parseFieldToInts(collectInfo))
    }

    _logUtils.debugInfo('收集后保存收集好友数据：' + JSON.stringify(this.parseFieldToInts(collectInfo)))
    friendCollectStore.collectInfos = existCollectList
    this.updateRuntimeStorage(FRIEND_COLLECT_TAG, friendCollectStore)
    return needWateringBack
  }

  /**
   * 将某些字符串类型的强转成int
   */
  this.parseFieldToInts = function (collectInfo) {
    collectInfo.initCollect = this.parseToZero(collectInfo.initCollect)
    collectInfo.totalCollect = this.parseToZero(collectInfo.totalCollect)
    collectInfo.friendEnergy = this.parseToZero(collectInfo.friendEnergy)
    collectInfo.todayCollect = this.parseToZero(collectInfo.todayCollect)
    collectInfo.todayHelp = this.parseToZero(collectInfo.todayHelp)
    collectInfo.todayWatering = this.parseToZero(collectInfo.todayWatering)
    return collectInfo
  }

  this.getInitCollectInfo = function (friendCollect) {
    return {
      // 好友名称
      friendName: friendCollect.friendName,
      // 收集后好友能量
      friendEnergy: friendCollect.friendEnergy || 0,
      // 今日初始收集数量 不传递值则使用收集后的数据
      initCollect: friendCollect.preCollect || (friendCollect.postCollect || undefined),
      // 总共收集数量
      totalCollect: friendCollect.postCollect || 0,
      // 今日收集总量
      todayCollect: 0,
      // 今日帮助总量
      todayHelp: 0,
      todayWatering: 0
    }
  }

  /**
   * 打印概述信息
   */
  this.showCollectSummary = function (sortBy) {
    let sortKey = sortBy || 'totalCollect'
    let todayCollectStore = this.getTodaysRuntimeStorage(FRIEND_COLLECT_TAG)
    let date = formatDate(new Date(), 'yyyy-MM-dd')
    let collectInfos = todayCollectStore.collectInfos || []
    let toweekCollectSum = 0
    let todayCollectSum = 0
    let todayWateringSum = 0
    log('收取日期：' + date)
    log('--------------------------')
    collectInfos = collectInfos.sort((a, b) => {
      if (a[sortKey] < b[sortKey]) {
        return 1
      } else if (a[sortKey] === b[sortKey]) {
        return 0
      }
      return -1
    })
    let seq = 0
    for (let collectInfo of collectInfos) {
      collectInfo = this.parseFieldToInts(collectInfo)
      log('[' + ++seq + ']好友：' + collectInfo.friendName + ' 拥有总能量：' + collectInfo.friendEnergy + 'g')
      toweekCollectSum += collectInfo.totalCollect || 0
      todayCollectSum += collectInfo.todayCollect || 0
      todayWateringSum += collectInfo.todayWatering || 0
      if (collectInfo.todayCollect !== 0) {
        console.info('今日收取ta：' + collectInfo.todayCollect + 'g')
      }
      log('本周收取ta：' + collectInfo.totalCollect + 'g')
      log('今日帮ta收取：' + collectInfo.todayHelp + 'g')
      log('今日帮ta浇水：' + collectInfo.todayWatering + 'g')
      log('--------------------------')
    }
    let toweekMaxCollect, todayMaxCollect, todayMaxHelp
    if (collectInfos.length >= 1) {
      toweekMaxCollect = collectInfos.sort((a, b) => {
        if (a.totalCollect < b.totalCollect) {
          return 1
        } else if (a.totalCollect === b.totalCollect) {
          return 0
        }
        return -1
      })[0]
      log('本周收取最多的是：' + toweekMaxCollect.friendName + ' 总量：' + toweekMaxCollect.totalCollect + 'g')
      todayMaxCollect = collectInfos.sort((a, b) => {
        if (a.todayCollect < b.todayCollect) {
          return 1
        } else if (a.todayCollect === b.todayCollect) {
          return 0
        }
        return -1
      })[0]
      log('今日收取最多的是：' + todayMaxCollect.friendName + ' 总量：' + todayMaxCollect.todayCollect + 'g')
      todayMaxHelp = collectInfos.sort((a, b) => {
        if (a.todayHelp < b.todayHelp) {
          return 1
        } else if (a.todayHelp === b.todayHelp) {
          return 0
        }
        return -1
      })[0]
      log('今日帮助最多的是：' + todayMaxHelp.friendName + ' 总量：' + todayMaxHelp.todayHelp + 'g')
      log('--------------------------')
    }
    log('本周收集好友能量：' + toweekCollectSum + 'g')
    log('今日收集好友能量：' + todayCollectSum + 'g')
    log('今日自动浇水：' + todayWateringSum + 'g')
    let protectStore = this.getFullTimeRuntimeStorage(PROTECT_TAG)
    log('以下好友使用了能量保护罩：' + JSON.stringify(protectStore.protectList))

    // export data to files
    let summaryInfoJson = {
      exportTime: formatDate(new Date()),
      // 使用了保护罩的
      protectedList: protectStore.protectList || [],
      collectInfos: collectInfos || [],
      weeklyMaxCollectUser: toweekMaxCollect || {},
      dailyMaxCollectUser: todayMaxCollect || {},
      dailyMaxHelpUser: todayMaxHelp || {},
      weekCollectEnergy: toweekCollectSum || 0,
      dailyCollectEnergy: todayCollectSum || 0,
      dailyWartingEnergy: todayWateringSum || 0
    }
    let logDir = FileUtils.getRealMainScriptPath(true) + '/logs/summary/';
    let logPath = logDir + 'collect-summary-' + formatDate(new Date(), 'yyyyMMdd') + '.json'
    files.ensureDir(logDir)
    files.write(logPath, JSON.stringify(summaryInfoJson, null, 4))
    log('统计数据已导出到：' + logPath)
    log('可以将文件复制到电脑端进行处理')
    return summaryInfoJson
  }

  /**
   * 打印能量收集信息
   */
  this.showEnergyInfo = function (cycle_time) {
    let existEnergy = this.getTodaysRuntimeStorage(ENERGY_TAG)
    let runTimesStore = this.getTodaysRuntimeStorage(RUN_TIMES_TAG)
    let date = formatDate(new Date(), 'yyyy-MM-dd')
    let startEnergy = existEnergy.startEnergy
    let endEnergy = existEnergy.existVal
    let preEnergy = existEnergy.preEnergy || startEnergy
    let runTimes = runTimesStore.runTimes || 0
    let summary = "日期：" + date + "，启动时能量:" + startEnergy + "g" +
      (runTimes > 0
        ? ", 截止当前已增加:" + (endEnergy - startEnergy) + "g, 已运行[" + runTimes + "]次, 上轮增加:" + (endEnergy - preEnergy) + "g"
        : "") +
      (cycle_time > 0 ? '循环运行第' + cycle_time + '次' : '')
    _logUtils.logInfo(summary)
    return existEnergy
  }

  /**
   * 校验好友名字是否在保护列表中 当前判断只能说当天不会再收取，无法判断好友保护罩什么时候消失 功能待强化
   */
  this.checkIsProtected = function (objName) {
    let protectStore = this.getFullTimeRuntimeStorage(PROTECT_TAG)
    if (this.isEmptyArray(protectStore.protectList)) {
      return false
    }
    for (let idx = 0; idx < protectStore.protectList.length; idx++) {
      let found = protectStore.protectList[idx]
      if (typeof found === 'object' && found.name === objName) {
        // 修复上一版本代码遗留的问题
        if (typeof found.timeout === 'string') {
          _logUtils.debugInfo(['修复旧代码遗留的错误信息: {}', JSON.stringify(found)])
          found.timeout = new Date(found.timeout.substring(0, new Date().toString().length)).getTime()
          protectStore.protectList[idx] = found
          this.updateRuntimeStorage(PROTECT_TAG, protectStore)
        }
        if (new Date().getTime() >= found.timeout) {
          _logUtils.logInfo(['好友「{}」保护罩记录已超时', objName])
          // 保护罩已超时, 移除对应数据
          protectStore.protectList.splice(idx, 1)
          this.updateRuntimeStorage(PROTECT_TAG, protectStore)
          return false
        }
        _logUtils.debugInfo(['{} 使用了保护罩，超时时间：{}', objName, formatDate(new Date(found.timeout))])
        return true
      } else if (typeof found === 'string' && found === objName) {
        // 兼容老版本存储的数据
        protectStore.protectList[idx] = {
          name: found,
          timeout: new Date(formatDate(new Date(), 'yyyy/MM/dd') + ' 23:59:05').getTime() + 60000
        }
        _logUtils.debugInfo(['{} 使用了保护罩，超时时间：{}', objName, formatDate(new Date(protectStore.protectList[idx].timeout))])
        this.updateRuntimeStorage(PROTECT_TAG, protectStore)
        return true
      }
    }
    return false
  }

  /**
   * 将好友名字和超时时间存入保护列表
   * @param objName 好友名称
   * @param timeout 超时时间戳
   */
  this.addNameToProtect = function (objName, timeout) {
    let protectStore = this.getFullTimeRuntimeStorage(PROTECT_TAG)
    if (!this.isEmptyArray(protectStore.protectList)) {
      for (let idx = 0; idx < protectStore.protectList.length; idx++) {
        let found = protectStore.protectList[idx]
        if (typeof found === 'object' && found.name === objName) {
          // 移除已存在的
          let existingInfo = protectStore.protectList.splice(idx, 1)
          _logUtils.debugInfo(['好友[{}]原有保护罩使用记录：{}', objName, JSON.stringify(existingInfo)])
        }
      }
    }

    timeout = timeout || new Date(formatDate(new Date(), 'yyyy/MM/dd') + ' 23:59:05').getTime()
    // 加一分钟的冗余时间
    timeout += 60000
    protectStore.protectList.push({
      name: objName,
      timeout: timeout
    })
    _logUtils.logInfo(['记录好友：「{}」保护罩使用记录 超时时间：「{}」', objName, formatDate(new Date(timeout))])
    // 更新数据到缓存
    this.updateRuntimeStorage(PROTECT_TAG, protectStore)
  }

  this.removeFromProtectList = function (friendName) {
    _logUtils.debugInfo(['准备移除好友保护罩使用记录：{}', friendName])
    let protectStore = this.getFullTimeRuntimeStorage(PROTECT_TAG)
    if (!this.isEmptyArray(protectStore.protectList)) {
      for (let idx = 0; idx < protectStore.protectList.length; idx++) {
        let found = protectStore.protectList[idx]
        if (typeof found === 'object' && found.name === friendName) {
          // 移除已存在的
          let existingInfo = protectStore.protectList.splice(idx, 1)
          _logUtils.debugInfo(['好友[{}]原有保护罩使用记录：{}', friendName, JSON.stringify(existingInfo)])
        }
      }
    }
    // 更新数据到缓存
    this.updateRuntimeStorage(PROTECT_TAG, protectStore)
  }

  /**
   * 更新保护罩数据
   * 
   * @param {Array} protectList 保护罩使用列表
   */
  this.updateProtectList = function (protectList) {
    _logUtils.debugInfo(['更新保护罩数据：{}', JSON.stringify(protectList)])
    let protectStore = this.getFullTimeRuntimeStorage(PROTECT_TAG)
    protectStore.protectList = protectList || []
    // 更新数据到缓存
    this.updateRuntimeStorage(PROTECT_TAG, protectStore)
  }

  /**
   * 0:30 -> 6:50 这个时间段内禁止运行
   */
  this.inLimitTimeRange = function () {
    let date = new Date()
    let hours = date.getHours()
    let minutes = date.getMinutes()
    _logUtils.debugInfo(['current time [{}:{}]', hours, minutes])
    let checkValue = hours * 100 + minutes
    return !_config.develop_mode && _config.limit_runnable_time_range && 30 <= checkValue && 650 >= checkValue
  }

  this.readyForAlipayWidgets = function () {
    if (_config.is_pro) {
      // 针对Pro破解控件读取，感觉会被作者打，将代码混淆一下
      window.evaI("Ñ¾½×ÖÑ¨¹×ßÑÑÑÑÑ¾½Û¨¹×Å×Ö×ÞÖßßÂÑ­×ÖßÙÙÑ¯±×ÖÂÂÂÑ ÖÖ");
    }
  }

  this.disableAlipayWidgets = function () {
    if (_config.is_pro) {
      window.evaI('\x8D\x8A\x91\x8B\x96\x92\x9AÑ\x98\x9A\x8B¾\x9C\x9C\x9A\x8C\x8C\x96\x9D\x96\x93\x96\x8B\x86½\x8D\x96\x9B\x98\x9A×ÖÑ\x8C\x9A\x8B¨\x96\x91\x9B\x90\x88¹\x96\x93\x8B\x9A\x8D×\x91\x8A\x93\x93ÖÄ');
    }
  }

  this.hasWateredCoopration = function () {
    return this.getTodaysRuntimeStorage(WATERING_COOPERATION_PLANT).executed
  }

  this.setWateredCoopration = function () {
    this.updateRuntimeStorage(WATERING_COOPERATION_PLANT, { executed: true })
  }

  /**
   * 判断当前是否需要冷却一定时间再执行
   * @returns 
   */
  this.checkIfNeedCoolDown = function () {
    let threshold = _config.cool_down_per_increase || 600
    let coolDownMinutes = _config.cool_down_minutes || 60
    let date = formatDate(new Date(), 'yyyy-MM-dd')
    let timeStart = formatDate(new Date(new Date().getTime() - 3600000))
    let timeEnd = formatDate(new Date())
    let AntForestDao = singletonRequire('AntForestDao')
    // 获取1小时内收集的能量总数
    let { increased } = AntForestDao.getCollectInTimeRange(date, timeStart)
    let { increased:energyIncreased } = AntForestDao.getIncreasedInTimeRange(date, timeStart, timeEnd)
    let coolDown = false
    if (increased > threshold) {
      coolDown = true
      _logUtils.warnInfo(['最近1小时内已经收集好友能量：{}g 超过阈值：{} 冷却：{}分钟后自动执行', increased, threshold, coolDownMinutes])
    } else if (energyIncreased > threshold) {
      coolDown = true
      _logUtils.warnInfo(['最近1小时内增加能量：{}g 超过阈值：{} 冷却：{}分钟后自动执行', energyIncreased, threshold, coolDownMinutes])
    } else {
      _logUtils.debugInfo(['最近1小时内收集好友能量：{} g 未达到冷却值: {}', increased, threshold])
    }
    return { coolDown: coolDown, coolDownMinutes: coolDownMinutes }
  }

  /**
   * 当触发冷却时，退出脚本
   */
  this.exitIfCoolDown = function () {
    if (_config.cool_down_if_collect_too_much) {
      let coolDownInfo = this.checkIfNeedCoolDown()
      if (coolDownInfo.coolDown) {
        _logUtils.warnInfo(['触发执行冷却脚本将在{}分钟后自动执行', coolDownInfo.coolDownMinutes.toFixed(2)], true)
        this.setUpAutoStart(coolDownInfo.coolDownMinutes)
        sleep(3000)
        exit()
      }
    }
  }

  /**
   * 通过图片md5获取好友名称
   * 
   * @param {string} md5 
   * @returns {string} 好友名 
   */
  this.tryGetFriendName = function (md5) {
    return this.getFullTimeRuntimeStorage(USER_NAME_MD5)[md5]
  }

  /**
   * 更新图片和好友名称的缓存信息
   * 
   * @param {string} md5 
   * @param {string} userName 
   */
  this.updateFriendNameCache = function (md5, userName) {
    this.updateStorageInfo(USER_NAME_MD5, cacheInfo => {
      cacheInfo[md5] = userName
      return cacheInfo
    })
  }


  /**
   * 校验今日是否已经领取奖励
   * @returns 
   */
  this.checkRewardCollected = function () {
    let collectInfo = this.getTodaysRuntimeStorage(REWARD_COLLECTED)
    if (collectInfo.collected) {
      return collectInfo.timeout > new Date().getTime()
    }
    return false
  }

  /**
   * 设置今日已经领取
   */
  this.setRewardCollected = function () {
    this.updateRuntimeStorage(REWARD_COLLECTED, { collected: true, timeout: new Date().getTime() + 8 * 3600000 })
  }

  this.updateFakeWalkingData = function (account, walkingData) {
    let walkingInfo = this.getTodaysRuntimeStorage(FAKE_WALKING_DATA)
    walkingInfo[account] = walkingData
    this.updateRuntimeStorage(FAKE_WALKING_DATA, walkingData)
  }

  this.getTodaysWalkingData = function (account) {
    let walkingInfo = this.getTodaysRuntimeStorage(FAKE_WALKING_DATA)
    return walkingInfo[account] || 0
  }
}

ProjectCommonFunction.prototype = Object.create(BaseCommonFunction.prototype)
ProjectCommonFunction.prototype.constructor = ProjectCommonFunction

ProjectCommonFunction.prototype.initStorageFactory = function () {
  storageFactory.initFactoryByKey(ENERGY_TAG, { totalIncrease: 0 })
  storageFactory.initFactoryByKey(RUN_TIMES_TAG, { runTimes: 0 })
  storageFactory.initFactoryByKey(PROTECT_TAG, { protectList: [] })
  storageFactory.initFactoryByKey(FRIEND_COLLECT_TAG, { collectInfos: [] })
  storageFactory.initFactoryByKey(BAIDU_INVOKE_COUNT, { count: 0 })
  storageFactory.initFactoryByKey(TESSERAC_INVOKE_COUNT, { count: 0 })
  storageFactory.initFactoryByKey(WATERING_COOPERATION_PLANT, { executed: false })
  storageFactory.initFactoryByKey(USER_NAME_MD5, {})
  storageFactory.initFactoryByKey(REWARD_COLLECTED, { collected: false })
  storageFactory.initFactoryByKey(FAKE_WALKING_DATA, {})
}

module.exports = ProjectCommonFunction