/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-05 09:12:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-30 20:19:59
 * @Description: 
 */
let { config: _config } = require('../../config.js')(runtime, this)
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo
} = singletonRequire('LogUtils')
let _commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')
let _own_text = null



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
    errorInfo('等待控件' + position + '失败， id：' + idRegex)
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
      isDesc: isDesc
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

const checkDirectionColors = function (point, count, img) {
  let matchCount = 0
  let color = 0
  let directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  // 上下左右各25个像素点，总计100个
  let end = false
  for (let i = 0; i < count; i++) {
    directions.forEach(direction => {
      if (end) {
        return
      }
      let checkPoint = {
        x: point.x + direction[0] * i,
        y: point.y + direction[1] * i
      }
      color = img.getBitmap().getPixel(checkPoint.x, checkPoint.y) >> 8 & 0xFF
      if (color === 0xFF) {
        matchCount++
      } else {
        debugForDev(['[{},{}] {} 颜色不匹配', checkPoint.x, checkPoint.y, colors.toString(color)])
      }

      if (matchCount > count) {
        end = true
      }
    })
  }
  return matchCount
}

const checkIsInFriendListByImg = function (checkTime, susspendError) {
  let found = false
  let scaleRate = _config.device_width / 1080
  _config.rank_check_left = _config.rank_check_left || parseInt(190 * scaleRate)
  _config.rank_check_top = _config.rank_check_top || parseInt(170 * scaleRate)
  _config.rank_check_width = _config.rank_check_width || parseInt(750 * scaleRate)
  _config.rank_check_height = _config.rank_check_height || parseInt(200 * scaleRate)
  let checkRegion = [_config.rank_check_left, _config.rank_check_top, _config.rank_check_width, _config.rank_check_height]
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
        rankCheckImg.recycle()
        debugForDev(['区域图片base64：「data:image/png;base64,{}」', base64String], false, true)
      }
      let point = images.findColor(img, '#1d9f4e', {
        region: checkRegion,
        threshold: _config.color_offset
      })
      found = (() => {
        if (point !== null) {
          let checkThreshold = parseInt(25 * scaleRate)
          let matchCount = checkDirectionColors(point, checkThreshold, img)
          // 判断周围颜色
          if (matchCount >= checkThreshold) {
            return true
          }
          if (!susspendError) {
            errorInfo(['校验排行榜失败，匹配点{} 其颜色为：{} 周围匹配的白色点数量：{}', JSON.stringify(point), colors.toString(img.getBitmap().getPixel(point.x, point.y)), matchCount])
          }
        }
        return false
      })()
      if (img) {
        img.recycle()
      }
      if (checkTime > 0) {
        sleep(1000)
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
  if (widgetCheck(_config.friend_home_ui_content, 500)) {
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
  return widgetWaiting(_config.friend_home_ui_content, '好友首页')
}

/**
 * 校验是否成功进入好友排行榜
 */
const friendListWaiting = function () {
  let in_friend_list = false
  if (_config.auto_set_img_or_widget && !_config.auto_setup_flag) {
    if (idCheck(_config.friend_list_id, 3000)) {
      debugInfo('自动设置为基于控件识别')
      _config.base_on_image = false
      _config.auto_setup_flag = true
      in_friend_list = true
    } else {
      debugInfo('自动设置为基于图像识别')
      _config.base_on_image = true
      _config.auto_setup_flag = true
    }
  }
  if (!in_friend_list) {
    if (_config.base_on_image) {
      in_friend_list = checkIsInFriendListByImg(5)
    } else {
      in_friend_list = idWaiting(_config.friend_list_id, '好友排行榜')
    }
  }
  if (_config.auto_set_img_or_widget && !in_friend_list) {
    debugInfo('判断排行榜失败，下次运行时重新分析基于图像还是控件识别')
    _config.auto_setup_flag = false
  }
  return in_friend_list
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
  }
}
/**
 * 快速下滑 
 * 用来统计最短时间
 */
const quickScrollDown = function () {
  do {
    automator.scrollDown(50)
  } while (
    !foundNoMoreWidget(50)
  )
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

const getYouCollectEnergy = function () {
  let youGet = widgetGetOne('你收取TA')
  if (youGet && youGet.parent) {
    let youGetParent = youGet.parent()
    let childSize = youGetParent.children().length
    debugInfo('你收取TA父级控件拥有子控件数量：' + childSize)
    let energySum = youGetParent.child(childSize - 1)
    if (energySum) {
      if (energySum.desc()) {
        return energySum.desc().match(/\d+/)
      } else if (energySum.text()) {
        return energySum.text().match(/\d+/)
      }
    }
  }
  return undefined
}

const getFriendEnergy = function () {
  let energyWidget = widgetGetById(_config.energy_id || 'J_userEnergy')
  if (energyWidget) {
    if (energyWidget.desc()) {
      return energyWidget.desc().match(/\d+/)
    } else {
      return energyWidget.text().match(/\d+/)
    }
  }
  return null
}

const checkAndClickWatering = function () {
  if (widgetCheck(_config.watering_widget_content, 1000)) {
    return widgetGetOne(_config.watering_widget_content)
  } else {
    // 无法获取到浇水控件文本，通过其他方式获取
    let jTreeWarp = widgetGetById('J_tree_dialog_wrap')
    if (jTreeWarp) {
      let warpBounds = jTreeWarp.bounds()
      return {
        centerX: parseInt(warpBounds.right - 0.18 * warpBounds.width()),
        centerY: parseInt(warpBounds.bottom - 0.12 * warpBounds.height())
      }
    }
  }
}

/**
 * 给好友浇水
 */
const wateringFriends = function () {
  let wateringWidget = checkAndClickWatering()
  if (wateringWidget) {
    let scaleRate = _config.device_width / 1080
    if (wateringWidget.hasOwnProperty('bounds')) {
      let bounds = wateringWidget.bounds()
      automator.click(bounds.centerX(), bounds.centerY())
      debugInfo('found wateringWidget:' + wateringWidget.bounds())
    } else {
      automator.click(wateringWidget.centerX, wateringWidget.centerY)
      debugInfo('assemment wateringWidget:' + JSON.stringify(wateringWidget))
    }
    sleep(500)
    let giveHimButton = null
    let give_content = _config.do_watering_button_content || '送给\\s*TA|浇水送祝福'

    let targetWateringAmount = _config.targetWateringAmount || 10
    targetWateringAmount += ''
    if (['1', '5', '10', '18'].indexOf(targetWateringAmount) < 0) {
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
          if (b.isClickable() && b.getClassName() === 'android.widget.Button' && b.depth() === 15) {
            target = b
          }
        }
      })
    }
    if (target) {
      automator.clickCenter(target)
      sleep(200)
    } else {
      warnInfo('未找到浇水数量选项')
    }
    if (widgetCheck(give_content, 5000) && (giveHimButton = widgetGetOne(give_content))) {
      debugInfo('found watering to TA:' + giveHimButton.bounds(), true)
      automator.click(parseInt(_config.device_width / 2), parseInt(_config.device_height - 150 * scaleRate))
      sleep(500)
    } else {
      debugInfo(['没有找到 {} 按钮', give_content])
    }
  } else {
    errorInfo('未找到浇水按钮')
  }
}

module.exports = {
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
  loadFriendList: loadFriendList,
  getFriendListParent: getFriendListParent,
  getFriendsName: getFriendsName,
  quickScrollDown: quickScrollDown,
  waitRankListStable: waitRankListStable,
  getJRankSelfBottom: getJRankSelfBottom,
  getYouCollectEnergy: getYouCollectEnergy,
  getFriendEnergy: getFriendEnergy,
  wateringFriends: wateringFriends,
  getOwntext: getOwntext,
  widgetGetById: widgetGetById
}
