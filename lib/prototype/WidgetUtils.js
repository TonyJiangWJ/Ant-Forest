/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-05 09:12:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-09 17:33:25
 * @Description: 
 */
let formatDate = require('../DateUtil.js')
let { config: _config, storage_name: _storage_name } = require('../../config.js')(runtime, this)
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo
} = singletonRequire('LogUtils')
let _commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')
let _own_text = null

/**
 * 切换控件获取的模式，正常模式基本能获取到当前最新的数据 快速模式会直接获取已缓存的控件信息，但是控件内容并不一定是最新的，目前来说没啥用
 * @param {number} newMode 0或1 正常模式或快速模式
 */
const changeMode = function (newMode) {
  try {
    let clz = runtime.accessibilityBridge.getClass()
    clz = clz.getSuperclass()
    let field = clz.getDeclaredField('mMode')
    field.setAccessible(true)
    let mode = parseInt(field.get(runtime.accessibilityBridge))
    debugInfo(['current mode: {}', mode === 0 ? 'NORMAL' : 'FAST'])
    runtime.accessibilityBridge.setMode(newMode)
    mode = parseInt(field.get(runtime.accessibilityBridge))
    debugInfo(['mode after set: {}', mode === 0 ? 'NORMAL' : 'FAST'])
  } catch (e) {
    console.error('执行异常' + e)
  }
}

const enableFastMode = function () {
  changeMode(1)
}

const enableNormalMode = function () {
  changeMode(0)
}

/**
 * 判断控件A或者控件B是否存在；超时返回0 找到A返回1 否则返回2
 * 
 * @param {string|regex} contentA 控件A的内容
 * @param {string|regex} contentB 控件B的内容
 * @param {number} timeout 超时时间
 * @param {boolean} containContent 是否传递实际内容
 */
const alternativeWidget = function (contentA, contentB, timeout, containContent) {
  timeout = timeout || _config.timeout_existing
  let timeoutFlag = true
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let matchRegexA = new RegExp(contentA)
  let matchRegexB = new RegExp(contentB)
  let isDesc = false, findA = false
  let res = null
  let descThreadA = threads.start(function () {
    descMatches(matchRegexA).waitFor()
    res = descMatches(matchRegexA).findOne().desc()
    debugInfo('find desc ' + contentA + " " + res)
    timeoutFlag = false
    isDesc = true
    findA = true
    countDown.countDown()
  })

  let textThreadA = threads.start(function () {
    textMatches(matchRegexA).waitFor()
    res = textMatches(matchRegexA).findOne().text()
    debugInfo('find text ' + contentA + "  " + res)
    timeoutFlag = false
    findA = true
    countDown.countDown()
  })
  let descThreadB = threads.start(function () {
    descMatches(matchRegexB).waitFor()
    res = descMatches(matchRegexB).findOne().desc()
    debugInfo('find desc ' + contentB + " " + res)
    timeoutFlag = false
    isDesc = true
    countDown.countDown()
  })

  let textThreadB = threads.start(function () {
    textMatches(matchRegexB).waitFor()
    res = textMatches(matchRegexB).findOne().text()
    debugInfo('find text ' + contentB + "  " + res)
    timeoutFlag = false
    countDown.countDown()
  })

  let timeoutThread = threads.start(function () {
    sleep(timeout)
    countDown.countDown()
  })
  countDown.await()
  descThreadA.interrupt()
  textThreadA.interrupt()
  descThreadB.interrupt()
  textThreadB.interrupt()
  timeoutThread.interrupt()
  if (timeoutFlag) {
    debugInfo(['cannot find any matches {} or {}', contentA, contentB])
  }
  // 超时返回0 找到A返回1 否则返回2
  let returnVal = timeoutFlag ? 0 : (findA ? 1 : 2)
  if (containContent) {
    return {
      content: res,
      value: returnVal
    }
  } else {
    return returnVal
  }
}

/**
 * 校验控件是否存在，并打印相应日志
 * @param {String} contentVal 控件文本
 * @param {String} position 日志内容 当前所在位置是否成功进入
 * @param {Number} timeoutSetting 超时时间 单位毫秒 默认为_config.timeout_existing
 */
const widgetWaiting = function (contentVal, position, timeoutSetting) {
  let waitingSuccess = widgetCheck(contentVal, timeoutSetting)
  position = position || contentVal
  if (waitingSuccess) {
    debugInfo('等待控件成功：' + position)
    return true
  } else {
    errorInfo('等待控件[' + position + ']失败, 查找内容：' + contentVal)
    return false
  }
}

/**
 * 校验控件是否存在
 * @param {String} contentVal 控件文本
 * @param {Number} timeoutSetting 超时时间 单位毫秒 不设置则为_config.timeout_existing
 * @param {Boolean} containType 返回结果附带文本是desc还是text
 * 超时返回false
 */
const widgetCheck = function (contentVal, timeoutSetting, containType) {
  let timeout = timeoutSetting || _config.timeout_existing
  let timeoutFlag = true
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let matchRegex = new RegExp(contentVal)
  let isDesc = false
  let descThread = threads.start(function () {
    descMatches(matchRegex).waitFor()
    let res = descMatches(matchRegex).findOne().desc()
    debugInfo('find desc ' + contentVal + " " + res)
    timeoutFlag = false
    isDesc = true
    countDown.countDown()
  })

  let textThread = threads.start(function () {
    textMatches(matchRegex).waitFor()
    let res = textMatches(matchRegex).findOne().text()
    debugInfo('find text ' + contentVal + "  " + res)
    timeoutFlag = false
    countDown.countDown()
  })

  let timeoutThread = threads.start(function () {
    sleep(timeout)
    countDown.countDown()
  })
  countDown.await()
  descThread.interrupt()
  textThread.interrupt()
  timeoutThread.interrupt()
  if (timeoutFlag) {
    debugInfo('cannot find any matches ' + contentVal + ' timeout:' + timeout)
  }
  if (containType) {
    return {
      timeout: timeoutFlag,
      isDesc: isDesc
    }
  }
  return !timeoutFlag
}

/**
 * id检测
 * @param {string|RegExp} idRegex 
 * @param {number} timeoutSetting 
 */
const idCheck = function (idRegex, timeoutSetting) {
  let timeout = timeoutSetting || _config.timeout_existing
  let timeoutFlag = true
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let idCheckThread = threads.start(function () {
    idMatches(idRegex).waitFor()
    debugInfo('find id ' + idRegex)
    timeoutFlag = false
    countDown.countDown()
  })

  let timeoutThread = threads.start(function () {
    sleep(timeout)
    countDown.countDown()
  })
  countDown.await()
  idCheckThread.interrupt()
  timeoutThread.interrupt()
  if (timeoutFlag) {
    warnInfo(['未能找到id:{}对应的控件', idRegex])
  }
  return !timeoutFlag
}

/**
 * 校验控件是否存在，并打印相应日志
 * @param {String} idRegex 控件文本
 * @param {String} position 日志内容 当前所在位置是否成功进入
 * @param {Number} timeoutSetting 超时时间 默认为_config.timeout_existing
 */
const idWaiting = function (idRegex, position, timeoutSetting) {
  let waitingSuccess = idCheck(idRegex, timeoutSetting)
  position = position || idRegex
  if (waitingSuccess) {
    debugInfo('等待控件成功：' + position)
    return true
  } else {
    errorInfo('等待控件[' + position + ']失败， id：' + idRegex)
    return false
  }
}

/**
 * 根据id获取控件信息
 * @param {String|RegExp} idRegex id
 * @param {number} timeout 超时时间
 * @return 返回找到的控件，否则null
 */
const widgetGetById = function (idRegex, timeout) {
  timeout = timeout || _config.timeout_findOne
  let target = null
  if (idCheck(idRegex, timeout)) {
    idRegex = new RegExp(idRegex)
    target = idMatches(idRegex).findOne(timeout)
  }
  return target
}

/**
 * 根据内容获取一个对象
 * 
 * @param {string} contentVal 
 * @param {number} timeout 
 * @param {boolean} containType 是否带回类型
 * @param {boolean} suspendWarning 是否隐藏warning信息
 */
const widgetGetOne = function (contentVal, timeout, containType, suspendWarning) {
  let target = null
  let isDesc = false
  let waitTime = timeout || _config.timeout_existing
  let timeoutFlag = true
  debugInfo(['try to find one: {} timeout: {}ms', contentVal.toString(), waitTime])
  let checkResult = widgetCheck(contentVal, waitTime, true)
  if (!checkResult.timeout) {
    timeoutFlag = false
    let matchRegex = new RegExp(contentVal)
    if (!checkResult.isDesc) {
      target = textMatches(matchRegex).findOne(_config.timeout_findOne)
    } else {
      isDesc = true
      target = descMatches(matchRegex).findOne(_config.timeout_findOne)
    }
  }
  // 当需要带回类型时返回对象 传递target以及是否是desc
  if (target && containType) {
    let result = {
      target: target,
      isDesc: isDesc,
      content: isDesc ? target.desc() : target.text()
    }
    return result
  }
  if (timeoutFlag) {
    if (suspendWarning) {
      debugInfo('timeout for finding ' + contentVal)
    } else {
      warnInfo('timeout for finding ' + contentVal)
    }
  }
  return target
}

/**
 * 根据内容获取所有对象的列表
 * 
 * @param {string} contentVal 
 * @param {number} timeout 
 * @param {boolean} containType 是否传递类型
 */
const widgetGetAll = function (contentVal, timeout, containType) {
  let target = null
  let isDesc = false
  let timeoutFlag = true
  let waitTime = timeout || _config.timeout_existing
  debugInfo(['try to find all: {} timeout: {}ms', contentVal.toString(), waitTime])
  let checkResult = widgetCheck(contentVal, waitTime, true)
  if (!checkResult.timeout) {
    timeoutFlag = false
    let matchRegex = new RegExp(contentVal)
    if (!checkResult.isDesc) {
      target = textMatches(matchRegex).untilFind()
    } else {
      isDesc = true
      target = descMatches(matchRegex).untilFind()
    }
  }
  if (timeoutFlag && !target) {
    return null
  } else if (target && containType) {
    let result = {
      target: target,
      isDesc: isDesc
    }
    return result
  }
  return target
}
/**
 * 查找没有更多了控件是否存在
 * 
 * @param {number} sleepTime 超时时间
 */
const foundNoMoreWidget = function (sleepTime) {
  let sleep = sleepTime || _config.timeout_findOne
  let noMoreWidgetHeight = 0

  let noMoreWidget = widgetGetOne(_config.no_more_ui_content, sleep, false, true)
  if (noMoreWidget) {
    let bounds = noMoreWidget.bounds()
    debugInfo("找到控件: [" + bounds.left + ", " + bounds.top + ", " + bounds.right + ", " + bounds.bottom + "]")
    noMoreWidgetHeight = bounds.bottom - bounds.top
    debugInfo('"没有更多了" 当前控件高度:' + noMoreWidgetHeight)
    return true
  }
  return false
}

const checkIsInFriendListByImg = function (checkTime, susspendError) {
  let found = false
  let scaleRate = _config.scaleRate
  _config.rank_check_left = _config.rank_check_left || parseInt(190 * scaleRate)
  _config.rank_check_top = _config.rank_check_top || parseInt(170 * scaleRate)
  _config.rank_check_width = _config.rank_check_width || parseInt(750 * scaleRate)
  _config.rank_check_height = _config.rank_check_height || parseInt(200 * scaleRate)
  let checkRegion = [_config.rank_check_left, _config.rank_check_top, _config.rank_check_width, _config.rank_check_height]
  _commonFunctions.ensureRegionInScreen(checkRegion)
  debugInfo(['准备校验区域[{}]颜色是否匹配好友排行榜', JSON.stringify(checkRegion)])
  let start = new Date().getTime()
  let img = null
  checkTime = checkTime || 1

  while (!found && checkTime-- > 0) {
    img = _commonFunctions.checkCaptureScreenPermission()
    if (img) {
      debugInfo(['图片大小：{}, {}', img.width, img.height])
      if (_config.develop_mode) {
        let rankCheckImg = images.clip(img, checkRegion[0], checkRegion[1], checkRegion[2], checkRegion[3])
        let base64String = images.toBase64(rankCheckImg)
        debugForDev(['好友排行榜校验区域图片base64：「data:image/png;base64,{}」', base64String], false, true)
      }
      let intervalImg = com.stardust.autojs.core.image.ImageWrapper.ofBitmap(images.inRange(img, '#008814', '#32D564').getBitmap())
      let checkColorPoints = []
      let checkColorBlack = '#000000'
      let checkColorWhite = '#ffffff'
      for (let i = -25; i <= 25; i += 5) {
        checkColorPoints.push([i, 0, checkColorWhite])
        checkColorPoints.push([i, 5, checkColorBlack])
      }
      let point = images.findMultiColors(intervalImg, checkColorWhite, checkColorPoints, { region: checkRegion, threshold: _config.color_offset })
      if (point) {
        found = true
      }
      if (!found) {
        if (!susspendError) {
          warnInfo('校验排行榜失败')
        }
        if (checkTime > 0) {
          sleep(500)
        }
        if (checkTime === 1) {
          warnInfo('排行榜校验失败多次，尝试自动识别校验区域')
          let points = []
          // 横向约200个像素点
          let limit = 200 * scaleRate / 3
          for (let i = 0; i < limit; i++) {
            points.push([i, 0, checkColorWhite])
          }
          let offset = parseInt(180 * scaleRate)
          let point = images.findMultiColors(intervalImg, checkColorWhite, points, { region: [offset, 50, _config.device_width - offset * 2, _config.device_height * 0.3] })
          if (point) {
            found = true
            _config.rank_check_left = point.x
            _config.rank_check_top = point.y - 10
            _config.rank_check_width = parseInt(200 * scaleRate * 3)
            if (_config.rank_check_width + _config.rank_check_left >= _config.device_width - offset) {
              _config.rank_check_width = _config.device_width - offset - _config.rank_check_left
            }
            _config.rank_check_height = 30
            checkRegion = [_config.rank_check_left, _config.rank_check_top, _config.rank_check_width, _config.rank_check_height]
            debugInfo(['自动识别的排行榜识别区域为：[{}]', JSON.stringify(checkRegion)])
            debugInfo('刷新配置到本地缓存')
            let configStorage = storages.create(_storage_name)
            configStorage.put('rank_check_left', _config.rank_check_left)
            configStorage.put('rank_check_top', _config.rank_check_top)
            configStorage.put('rank_check_width', _config.rank_check_width)
            configStorage.put('rank_check_height', _config.rank_check_height)
          } else {
            warnInfo('自动识别排行榜失败，未识别到匹配内容')
            debugForDev(['自动设置失败，当前图片信息：[data:image/png;base64,{}]', images.toBase64(img)])
          }
        }
      }
    }
  }
  debugInfo(['排行榜判断耗时：{}ms', (new Date().getTime() - start)])
  return found
}

/**
 * 校验是否成功进入自己的首页
 */
const homePageWaiting = function () {
  if (widgetCheck(_config.friend_home_check_regex || 'TA收取你', 500)) {
    errorInfo('错误位置：当前所在位置为好友首页')
    return false
  }
  if (checkIsInFriendListByImg(1, true)) {
    errorInfo('错误位置：当前所在位置为好友排行榜')
    return false
  }
  return widgetWaiting(_config.home_ui_content, '个人首页')
}

/**
 * 校验是否成功进入好友首页
 */
const friendHomeWaiting = function () {
  return widgetWaiting(_config.friend_home_check_regex, '好友首页')
}

/**
 * 校验是否成功进入好友排行榜
 */
const friendListWaiting = function () {
  return checkIsInFriendListByImg(5)
}

const ensureRankListLoaded = function (checkTime) {
  let start = new Date().getTime()
  let img = _commonFunctions.checkCaptureScreenPermission(3)
  let color = '#969696'
  let scaleRate = _config.scaleRate
  let loaded = false
  let check_region = [parseInt(70 * scaleRate), _config.rank_check_top + _config.rank_check_height, 200, 300]
  debugInfo(['准备校验排行榜是否加载完毕，检测区域：{} 是否匹配灰度颜色#969696', JSON.stringify(check_region)])
  while (!loaded && checkTime-- > 0) {
    let point = images.findColor(images.grayscale(img), color, { region: check_region })
    if (point) {
      debugInfo(['检测到了排行榜加载完毕的检测点：{}', JSON.stringify(point)])
      loaded = true
    } else {
      debugInfo('未检测到排行榜加载完毕的检测点，等待1秒')
      sleep(1000)
      img = _commonFunctions.checkCaptureScreenPermission(3)
    }
  }
  debugInfo(['排行榜加载状态:{} 判断耗时：{}ms', loaded, (new Date().getTime() - start)])
  return loaded
}


/**
 * 加载好友排行榜列表
 * @deprecated 新版蚂蚁森林不可用
 */
const loadFriendList = function () {
  logInfo('正在展开好友列表请稍等。。。', true)
  let start = new Date()
  let timeout = true
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let loadThread = threads.start(function () {
    while ((more = idMatches(".*J_rank_list_more.*").findOne(200)) != null) {
      more.click()
    }
  })
  let foundNoMoreThread = threads.start(function () {
    widgetCheck(_config.no_more_ui_content, _config.timeoutLoadFriendList || _config.timeout_existing)
    timeout = false
    countDown.countDown()
  })
  let timeoutThread = threads.start(function () {
    sleep(_config.timeoutLoadFriendList || _config.timeout_existing)
    errorInfo("预加载好友列表超时")
    countDown.countDown()
  })
  countDown.await()
  let end = new Date()
  logInfo('好友列表展开' + (timeout ? '超时' : '完成') + ', cost ' + (end - start) + ' ms', true)
  // 调试模式时获取信息
  if (_config.show_debug_log) {
    let friendList = getFriendListParent()
    if (friendList && friendList.children) {
      debugInfo('好友列表长度：' + friendList.children().length)
    }
  }
  loadThread.interrupt()
  foundNoMoreThread.interrupt()
  timeoutThread.interrupt()
  return timeout
}

/**
 * 获取排行榜好友列表
 * @deprecated 新版蚂蚁森林不可用
 */
const getFriendListOld = function () {
  let friends_list = null
  if (idMatches('J_rank_list_append').exists()) {
    debugInfo('newAppendList')
    friends_list = idMatches('J_rank_list_append').findOne(
      _config.timeout_findOne
    )
  } else if (idMatches('J_rank_list').exists()) {
    debugInfo('oldList')
    friends_list = idMatches('J_rank_list').findOne(
      _config.timeout_findOne
    )
  }
  return friends_list
}

const getFriendListParent = function getFriendRoot () {
  let anyone = null
  let regex = /[.\d]+[kgt]+$/
  let countdown = new Countdown()
  if (textMatches(regex).exists()) {
    anyone = textMatches(regex).findOnce(1)
    debugInfo('当前获取到的能量值内容：' + anyone.text())
  } else if (descMatches(regex).exists()) {
    debugInfo('当前获取到的能量值内容：' + anyone.desc())
    anyone = descMatches(regex).findOnce(1)
  }
  countdown.summary('获取能量值控件')
  if (anyone) {
    try {
      return anyone.parent().parent().parent()
    } catch (e) {
      debugInfo('获取能量值控件失败' + e)
      _commonFunctions.printExceptionStack(e)
    }
  } else {
    debugInfo('获取能量值控件失败')
  }
}


function Countdown () {
  this.start = new Date().getTime()
  this.getCost = function () {
    return new Date().getTime() - this.start
  }

  this.summary = function (content) {
    debugInfo(content + '耗时' + this.getCost() + 'ms')
  }

}

const getOwntext = function () {
  let anyone = null
  let regex = /[.\d]+[kgt]+$/
  let countdown = new Countdown()
  if (textMatches(regex).exists()) {
    anyone = textMatches(regex).findOne(1000)
    debugInfo('当前获取到的内容：' + anyone.text())
  } else if (descMatches(regex).exists()) {
    debugInfo('当前获取到的内容：' + anyone.desc())
    anyone = descMatches(regex).findOne(1000)
  }
  countdown.summary('获取能量值控件')
  if (anyone) {
    try {
      let ownElement = anyone.parent().parent().children()[2].children()[0].children()[0]
      return ownElement.text() || ownElement.desc()
    } catch (e) {
      errorInfo(e)
      _commonFunctions.printExceptionStack(e)
      return null
    } finally {
      countdown.summary('分析自身id')
    }
  }

}

/**
   * 获取好友昵称
   * 
   * @param {Object} fri 
   */
const getFriendsName = function (fri) {
  try {
    let nameContainer = fri.child(2).child(0).child(0)
    return nameContainer.text() || nameContainer.desc()
  } catch (e) {
    errorInfo('获取好友名称失败:' + e)
    _commonFunctions.printExceptionStack(e)
  }
}

/**
 * 等待排行榜稳定
 * 即不在滑动过程
 */
const waitRankListStable = function () {
  let startPoint = new Date()
  debugInfo('等待列表稳定')
  let compareBottomVal = getJRankSelfBottom()
  let size = _config.friendListStableCount || 3
  if (size <= 1) {
    size = 2
  }
  let bottomValQueue = _commonFunctions.createQueue(size)
  while (_commonFunctions.getQueueDistinctSize(bottomValQueue) > 1) {
    compareBottomVal = getJRankSelfBottom()
    if (compareBottomVal === undefined && ++invalidCount > 10) {
      warnInfo('获取坐标失败次数超过十次')
      break
    } else {
      _commonFunctions.pushQueue(bottomValQueue, size, compareBottomVal)
      debugInfo(
        '添加参考值：' + compareBottomVal +
        '队列重复值数量：' + _commonFunctions.getQueueDistinctSize(bottomValQueue)
      )
    }
  }
  debugInfo('列表已经稳定 等待列表稳定耗时[' + (new Date() - startPoint) + ']ms，不可接受可以调小config.js中的friendListStableCount')
}



/**
 * 获取列表中自己的底部高度
 */
const getJRankSelfBottom = function () {
  let maxTry = 50
  // TODO 当前own_text设为了null，如果设为具体值反而更慢 暂时就这样吧
  while (maxTry-- > 0) {
    try {
      try {
        return textMatches(_own_text).findOnce(1).bounds().bottom
      } catch (e) {
        try {
          return descMatches(_own_text).findOnce(1).bounds().bottom
        } catch (e2) {
          // nothing to do here
        }
      }
    } catch (e) {
      // nothing to do here
    }
  }
  return null
}

function CollectInfo (widgetInfo) {
  if (widgetInfo.childCount() > 1) {
    this.time = widgetInfo.child(1).text() || widgetInfo.child(1).desc()
    let contentWidget = widgetInfo.child(0)
    if (contentWidget.childCount() === 2) {
      this.targetUser = contentWidget.child(0).text() || contentWidget.child(0).desc()
      this.collectText = contentWidget.child(1).text() || contentWidget.child(1).desc()
    }
  }

  this.getCollected = function () {
    let regex = /^(收取|took)\s*(\d+)g/
    if (regex.test(this.collectText)) {
      return parseInt(regex.exec(this.collectText)[2])
    } else {
      return 0
    }
  }
}

const getYouCollectEnergyByWidget = function () {
  let youGet = widgetGetOne('你收取TA')
  if (youGet && youGet.parent) {
    let youGetParent = youGet.parent()
    let childSize = youGetParent.children().length
    debugForDev('你收取TA父级控件拥有子控件数量：' + childSize)
    let energySum = youGetParent.child(childSize - 1)
    if (energySum) {
      if (energySum.desc()) {
        return energySum.desc().match(/\d+/)
      } else if (energySum.text()) {
        return energySum.text().match(/\d+/)
      }
    }
  } else {
    config.has_summary_widget = false
  }
}

const getYouCollectEnergyByList = function () {
  let today = widgetGetOne('今天|Today', 500, false, true)
  if (today !== null) {
    let container = today.parent()
    if (container) {
      let collectInfos = []
      let hasNext = true
      let timeRange = [formatDate(new Date(), 'HH:mm'), formatDate(new Date(new Date().getTime() - 60000), 'HH:mm')]
      container.children().forEach((elem, idx) => {
        if (hasNext) {
          let collectInfo = new CollectInfo(elem)
          if (collectInfo.time && timeRange.indexOf(collectInfo.time) < 0) {
            hasNext = false
          } else if (!_config.my_id && collectInfo.targetUser !== 'TA的好友' || collectInfo.targetUser === _config.my_id) {
            collectInfos.push(collectInfo)
          }
        }
      })
      // _config.show_debug_log = true
      debugInfo(['我当前的收集信息：{}', JSON.stringify(collectInfos)])
      return collectInfos.length > 0 ? collectInfos.map(collect => collect.getCollected()).reduce((a, b) => a = a + b) : 0
    }
  }
  // console.show()
  return 0
}

const getYouCollectEnergy = function () {
  let result = null
  if (_config.has_summary_widget || widgetCheck('你收取TA', 500)) {
    _config.has_summary_widget = true
    result = getYouCollectEnergyByWidget()
  } else {
    _config.has_summary_widget = false
    result = getYouCollectEnergyByList()
  }
  result = parseInt(result)
  return isNaN(result) ? 0 : result
}

const getFriendEnergy = function () {
  let energyWidget = widgetGetById(_config.energy_id || 'J_userEnergy')
  let result = null
  if (energyWidget) {
    if (energyWidget.desc()) {
      result = energyWidget.desc().match(/\d+/)
    } else {
      result = energyWidget.text().match(/\d+/)
    }
  }
  result = parseInt(result)
  return isNaN(result) ? 0 : result
}

const checkAndClickWatering = function () {
  // 直接通过偏移量获取浇水按钮
  let jTreeWarp = widgetGetById('J_tree_dialog_wrap')
  if (jTreeWarp) {
    let warpBounds = jTreeWarp.bounds()
    target = {
      centerX: parseInt(warpBounds.left + 0.4 * warpBounds.width()),
      centerY: parseInt(warpBounds.bottom - 0.07 * warpBounds.height())
    }
  }
  return target
}

/**
 * 给好友浇水
 */
const wateringFriends = function () {
  let wateringWidget = checkAndClickWatering()
  if (wateringWidget) {
    automator.click(wateringWidget.centerX, wateringWidget.centerY)
    debugInfo('assemment wateringWidget:' + JSON.stringify(wateringWidget))
    sleep(500)
    let giveHimButton = null
    let give_content = _config.do_watering_button_content || '送给\\s*TA|浇水送祝福'

    let targetWateringAmount = _config.targetWateringAmount || 10
    targetWateringAmount += ''
    if (['10', '18', '33', '66'].indexOf(targetWateringAmount) < 0) {
      errorInfo(['浇水数配置有误：{}', _config.targetWateringAmount])
      targetWateringAmount = '10'
    }
    infoLog(['准备浇水：「{}」克', targetWateringAmount])
    let wateringAmountWidgetRegex = '^' + targetWateringAmount + '(g|克)$'
    let wateringAmountTargets = widgetGetAll(wateringAmountWidgetRegex, 3000)
    let target = null
    if (wateringAmountTargets) {
      wateringAmountTargets.forEach(b => {
        if (target === null) {
          if (b.isClickable() && b.getClassName() === 'android.widget.Button' && b.depth() >= 15) {
            target = b
          }
        } else {
          debugInfo(['不匹配浇水能量配置：clickable：{}, className: {}, depth:'])
        }
      })
    }
    if (target) {
      // 查找是否勾选了提醒
      try {
        let noticeBounds = target.parent().child(7).child(0).bounds()
        if (noticeBounds) {
          let screen = _commonFunctions.checkCaptureScreenPermission()
          if (screen) {
            let color = '#1E9F4D'
            let checkPoints = []
            for (let i = 0; i < 10; i++) {
              checkPoints.push([i, 0, color])
            }
            let point = images.findMultiColors(screen, color, checkPoints, { region: [noticeBounds.left, noticeBounds.top, noticeBounds.width(), noticeBounds.height()] })
            if (point) {
              automator.click(point.x, point.y)
            }
          }
        }
      } catch (e) {
        console.error('查找按钮异常' + e)
      }
      automator.clickCenter(target)
      sleep(200)
    } else {
      warnInfo('未找到浇水数量选项, 浇水失败')
      return false
    }
    if (widgetCheck(give_content, 5000) && (giveHimButton = widgetGetOne(give_content))) {
      debugInfo('found watering to TA:' + giveHimButton.bounds())
      let bounds = giveHimButton.bounds()
      automator.click(parseInt(bounds.left + bounds.width() / 2), parseInt(bounds.top + bounds.height() / 2))
      sleep(500)
    } else {
      debugInfo(['没有找到 {} 按钮', give_content])
    }
  } else {
    errorInfo('未找到浇水按钮')
  }
}


const reachBottom = function (grayImg) {
  let start = new Date().getTime()
  let region = [_config.bottom_check_left, _config.bottom_check_top, _config.bottom_check_width, _config.bottom_check_height]
  _commonFunctions.ensureRegionInScreen(region)
  let color = _config.bottom_check_gray_color || '#999999'
  debugInfo(['准备校验排行榜底部区域:{} 颜色：{}', JSON.stringify(region), color])
  let flag = false
  if (images.findColor(grayImg, color, { region: region, threshold: 4 })) {
    flag = true
    _config.bottom_check_succeed = true
  }
  debugInfo(['判断排行榜底部:{} 耗时：{}ms', flag, new Date().getTime() - start])
  return flag
}

const tryFindBottomRegion = function (grayImg) {
  let scaleRate = _config.scaleRate
  // 如果未成功识别过排行榜底部区域 则进行自动配置
  if (!_config.bottom_check_succeed) {
    // 首先校验是否存在邀请按钮
    let detectRegion = [parseInt(800 * scaleRate), parseInt(_config.device_height * 0.8), parseInt(100 * scaleRate), parseInt(_config.device_height * 0.19)]
    _commonFunctions.ensureRegionInScreen(detectRegion)
    debugInfo(['准备识别区域中是否可能匹配排行榜底部:{}', JSON.stringify(detectRegion)])
    let color = '#999999'
    let point = images.findColor(grayImg, color, { region: detectRegion, threshold: 4 })
    if (point /* false */) {
      _config.bottom_check_left = point.x - 5
      _config.bottom_check_top = point.y - 5
      _config.bottom_check_width = 10
      _config.bottom_check_height = 10
      _config.bottom_check_succeed = true
    } else {
      debugInfo('未能自动识别到排行榜底部识别区')
      // 然后校验 “没有更多了” 是否存在
      detectRegion = [parseInt(600.0 / 1080 * scaleRate * _config.device_width), _config.device_height - parseInt(200 * scaleRate), parseInt(50 * scaleRate), 190 * scaleRate]
      _commonFunctions.ensureRegionInScreen(detectRegion)
      let checkPoints = []
      for (let x = 0; x < 30 * scaleRate; x++) {
        checkPoints.push([x, 0, color])
      }
      for (let y = 0; y < 3; y++) {
        checkPoints.push([parseInt(15 * scaleRate), parseInt(12 * scaleRate) + y, color])
      }
      debugInfo(['尝试多点找色识别区域：「{}」点集合：「{}」', JSON.stringify(detectRegion), JSON.stringify(checkPoints)])
      // 多点找色需要彩色原图
      grayImg = _commonFunctions.checkCaptureScreenPermission(3)
      point = images.findMultiColors(grayImg, color, checkPoints, { region: detectRegion })
      if (point) {
        _config.bottom_check_left = point.x - 5
        _config.bottom_check_top = point.y - 5
        _config.bottom_check_width = 20
        _config.bottom_check_height = 20
        _config.bottom_check_succeed = true
        if (_config.useOcr) {
          debugInfo('尝试使用百度OCR接口识别排行榜底部区域, hhhh 骗你的 速度太慢了')
        }
      } else {
        debugInfo('未能自动识别到排行榜底部识别区')
      }
    }
    if (_config.bottom_check_succeed) {
      detectRegion = [_config.bottom_check_left, _config.bottom_check_top, _config.bottom_check_width, _config.bottom_check_height]
      debugInfo(['自动识别的排行榜底部识别区域为：[{}] 刷新配置到本地缓存', JSON.stringify(detectRegion)])
      let configStorage = storages.create(_storage_name)
      _config.bottom_check_gray_color = color
      configStorage.put('bottom_check_left', _config.bottom_check_left)
      configStorage.put('bottom_check_top', _config.bottom_check_top)
      configStorage.put('bottom_check_width', _config.bottom_check_width)
      configStorage.put('bottom_check_height', _config.bottom_check_height)
      configStorage.put('bottom_check_gray_color', _config.bottom_check_gray_color)
      configStorage.put('bottom_check_succeed', _config.bottom_check_succeed)
    }
  }
}

module.exports = {
  enableFastMode: enableFastMode,
  enableNormalMode: enableNormalMode,
  alternativeWidget: alternativeWidget,
  widgetWaiting: widgetWaiting,
  widgetCheck: widgetCheck,
  idWaiting: idWaiting,
  idCheck: idCheck,
  widgetGetOne: widgetGetOne,
  widgetGetAll: widgetGetAll,
  foundNoMoreWidget: foundNoMoreWidget,
  homePageWaiting: homePageWaiting,
  friendHomeWaiting: friendHomeWaiting,
  friendListWaiting: friendListWaiting,
  ensureRankListLoaded: ensureRankListLoaded,
  loadFriendList: loadFriendList,
  reachBottom: reachBottom,
  tryFindBottomRegion: tryFindBottomRegion,
  getFriendListParent: getFriendListParent,
  getFriendsName: getFriendsName,
  waitRankListStable: waitRankListStable,
  getJRankSelfBottom: getJRankSelfBottom,
  getYouCollectEnergy: getYouCollectEnergy,
  getFriendEnergy: getFriendEnergy,
  wateringFriends: wateringFriends,
  getOwntext: getOwntext,
  widgetGetById: widgetGetById
}
