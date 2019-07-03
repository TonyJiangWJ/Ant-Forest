let { config } = require('../config.js')
let { commonFunctions } = require('./CommonFunction.js')
/**
 * 查找没有更多了控件是否存在
 * 
 * @param {number} sleepTime 超时时间
 */
const foundNoMoreWidget = function (sleepTime) {
  let sleep = sleepTime || config.timeout_findOne
  let noMoreWidgetHeight = 0

  let noMoreWidget = widgetGetOne(config.no_more_ui_content, sleep)
  if (noMoreWidget) {
    let bounds = noMoreWidget.bounds()
    commonFunctions.debug("找到控件: [" + bounds.left + ", " + bounds.top + ", " + bounds.right + ", " + bounds.bottom + "]")
    noMoreWidgetHeight = bounds.bottom - bounds.top
  }
  // todo 该校验并不完美，当列表已经加载过之后，明明没有在视野中的控件，位置centerY还是能够获取到，而且非0
  if (noMoreWidgetHeight > 50) {
    commonFunctions.debug('"没有更多了" 当前控件高度:' + noMoreWidgetHeight)
    return true
  } else {
    if (noMoreWidgetHeight > 0) {
      commonFunctions.debug('"没有更多了" 控件高度不符合要求' + noMoreWidgetHeight)
    }
    return false
  }
}

/**
 * 校验控件是否存在，并打印相应日志
 * @param {String} contentVal 控件文本
 * @param {String} position 日志内容 当前所在位置是否成功进入
 * @param {Number} timeoutSetting 超时时间 默认6000 即6秒钟
 */
const widgetWaiting = function (contentVal, position, timeoutSetting) {
  let waitingSuccess = widgetCheck(contentVal, timeoutSetting)

  if (waitingSuccess) {
    commonFunctions.debug('成功进入' + position)
    return true
  } else {
    commonFunctions.error('进入' + position + '失败')
    return false
  }
}

/**
 * 校验控件是否存在
 * @param {String} contentVal 控件文本
 * @param {Number} timeoutSetting 超时时间 不设置则为6秒
 * 超时返回false
 */
const widgetCheck = function (contentVal, timeoutSetting) {
  let timeout = timeoutSetting || 6000
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let descThread = threads.start(function () {
    descMatches(contentVal).waitFor()
    let res = descMatches(contentVal).findOne().desc()
    commonFunctions.debug('find desc ' + contentVal + " " + res)
    countDown.countDown()
  })

  let textThread = threads.start(function () {
    textMatches(contentVal).waitFor()
    let res = textMatches(contentVal).findOne().text()
    commonFunctions.debug('find text ' + contentVal + "  " + res)
    countDown.countDown()
  })
  let timeoutFlag = false
  let timeoutThread = threads.start(function () {
    sleep(timeout)
    timeoutFlag = true
    countDown.countDown()
  })
  countDown.await()
  descThread.interrupt()
  textThread.interrupt()
  timeoutThread.interrupt()
  return !timeoutFlag
}

/**
 * 校验是否成功进入自己的首页
 */
const homePageWaiting = function () {
  if (widgetCheck(config.friend_home_ui_content, 500)) {
    commonFunctions.error('错误位置：当前所在位置为好友首页')
    return false;
  }
  if (widgetCheck(config.friend_list_ui_content, 500)) {
    commonFunctions.error('错误位置：当前所在位置为好友排行榜')
    return false;
  }
  return widgetWaiting(config.home_ui_content, '个人首页')
}

/**
 * 校验是否成功进入好友首页
 */
const friendHomeWaiting = function () {
  return widgetWaiting(config.friend_home_ui_content, '好友首页')
}

/**
 * 校验是否成功进入好友排行榜
 */
const friendListWaiting = function () {
  return widgetWaiting(config.friend_list_ui_content, '好友排行榜')
}

/**
 * 根据内容获取一个对象
 * 
 * @param {string} contentVal 
 * @param {number} timeout 
 * @param {boolean} containType 是否带回类型
 */
const widgetGetOne = function (contentVal, timeout, containType) {
  let target = null
  let isDesc = false
  let waitTime = timeout || config.timeout_findOne
  if (textMatches(contentVal).exists()) {
    commonFunctions.debug('text ' + contentVal + ' found')
    target = textMatches(contentVal).findOne(waitTime)
  } else if (descMatches(contentVal).exists()) {
    isDesc = true
    commonFunctions.debug('desc ' + contentVal + ' found')
    target = descMatches(contentVal).findOne(waitTime)
  } else {
    commonFunctions.debug('none of text or desc found for ' + contentVal)
  }
  // 当需要带回类型时返回对象 传递target以及是否是desc
  if (target && containType) {
    let result = {
      target: target,
      isDesc: isDesc
    }
    return result
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
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let waitTime = timeout || config.timeout_findOne
  let findThread = threads.start(function () {
    if (textMatches(contentVal).exists()) {
      commonFunctions.debug('text ' + contentVal + ' found')
      target = textMatches(contentVal).untilFind()
    } else if (descMatches(contentVal).exists()) {
      isDesc = true
      commonFunctions.debug('desc ' + contentVal + ' found')
      target = descMatches(contentVal).untilFind()
    } else {
      commonFunctions.debug('none of text or desc found for ' + contentVal)
    }
    countDown.countDown()
  })
  let timeoutFlag = false
  let timeoutThread = threads.start(function () {
    sleep(waitTime)
    timeoutFlag = true
    countDown.countDown()
    commonFunctions.warn('timeout for finding ' + contentVal)
  })
  countDown.await()
  findThread.interrupt()
  timeoutThread.interrupt()
  if (timeoutFlag) {
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
 * 加载好友排行榜列表
 */
const loadFriendList = function () {
  commonFunctions.log('正在展开好友列表请稍等。。。', true)
  let start = new Date()
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let loadThread = threads.start(function () {
    while ((more = idMatches(".*J_rank_list_more.*").findOne(200)) != null) {
      more.click()
    }
  })
  let foundNoMoreThread = threads.start(function () {
    widgetCheck(config.no_more_ui_content, config.timeoutLoadFriendList || 6000)
    countDown.countDown()
  })
  let timeoutThread = threads.start(function () {
    sleep(config.timeoutLoadFriendList || 6000)
    commonFunctions.error("预加载好友列表超时")
    countDown.countDown()
  })
  countDown.await()
  let end = new Date()
  commonFunctions.log('好友列表展开完成, cost ' + (end - start) + ' ms', true)
  // 调试模式时获取信息
  if (config.show_debug_log) {
    let friendList = getFriendList()
    if (friendList && friendList.children) {
      commonFunctions.debug('好友列表长度：' + friendList.children().length)
    }
  }
  loadThread.interrupt()
  foundNoMoreThread.interrupt()
  timeoutThread.interrupt()
}

/**
 * 获取排行榜好友列表
 */
const getFriendList = function () {
  let friends_list = null
  if (idMatches('J_rank_list_append').exists()) {
    commonFunctions.debug('newAppendList')
    friends_list = idMatches('J_rank_list_append').findOne(
      config.timeout_findOne
    )
  } else if (idMatches('J_rank_list').exists()) {
    commonFunctions.debug('oldList')
    friends_list = idMatches('J_rank_list').findOne(
      config.timeout_findOne
    )
  }
  return friends_list
}
/**
   * 获取好友昵称
   * 
   * @param {Object} fri 
   */
const getFriendsName = function (fri) {
  let name = null
  if (commonFunctions.isEmpty(fri.child(1).desc())) {
    name = fri.child(2).desc()
  } else {
    name = fri.child(1).desc()
  }
  if (commonFunctions.isEmpty(name)) {
    if (commonFunctions.isEmpty(fri.child(1).text())) {
      name = fri.child(2).text()
    } else {
      name = fri.child(1).text()
    }
  }
  return name
}
/**
 * 快速下滑 
 * @deprecated 不再使用 本用来统计最短时间 现在可以先直接加载全部列表然后获取
 */
const quickScrollDown = function () {
  do {
    _automator.scrollDown(50)
    sleep(50)
  } while (
    !foundNoMoreWidget()
  )
}

/**
 * 等待排行榜稳定
 * 即不在滑动过程
 */
const waitRankListStable = function () {
  let startPoint = new Date()
  commonFunctions.debug('等待列表稳定')
  let compareBottomVal = getJRankSelfBottom()
  let size = config.friendListStableCount || 8
  let bottomValQueue = createQueue(size)
  while (getQueueDistinctSize(bottomValQueue) > 1) {
    sleep(50)
    compareBottomVal = getJRankSelfBottom()
    if (compareBottomVal === undefined && ++invalidCount > 10) {
      commonFunctions.warn('获取坐标失败次数超过十次')
      break
    } else {
      pushQueue(bottomValQueue, size, compareBottomVal)
      commonFunctions.debug(
        '添加参考值：' + compareBottomVal +
        '队列重复值数量：' + getQueueDistinctSize(bottomValQueue)
      )
    }
  }
  commonFunctions.debug('列表已经稳定 等待列表稳定耗时[' + (new Date() - startPoint) + ']ms，不可接受可以调小config.js中的friendListStableCount')
}

const createQueue = function (size) {
  let queue = []
  for (let i = 0; i < size; i++) {
    queue.push(i)
  }
  return queue
}

const getQueueDistinctSize = function (queue) {
  return queue.reduce((a, b) => {
    if (a.indexOf(b) < 0) {
      a.push(b)
    }
    return a
  }, []).length
}

const pushQueue = function (queue, size, val) {
  if (queue.length >= size) {
    queue.shift()
  }
  queue.push(val)
}


/**
 * 获取列表中自己的底部高度
 */
const getJRankSelfBottom = function () {
  let maxTry = 50
  while (maxTry-- > 0) {
    try {
      return idMatches(/.*J_rank_list_self/).findOnce().bounds().bottom;
    } catch (e) {
      // nothing to do here
    }
  }
  return null
}

const getYouCollectEnergy = function () {
  let youGet = widgetGetOne("你收取.*")
  if (youGet && youGet.parent) {
    let youGetParent = youGet.parent()
    let childSize = youGetParent.children().length
    commonFunctions.debug('你收取TA父级控件拥有子控件数量：' + childSize)
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
  let energyWidget = widgetGetOne(/\d+g/)
  if (energyWidget) {
    if (energyWidget.desc()) {
      return energyWidget.desc().match(/\d+/)
    } else {
      return energyWidget.text().match(/\d+/)
    }
  }
  return null
}


/**
 * 给好友浇水
 */
const wateringFriends = function () {
  let wateringWidget = widgetGetOne(config.warting_widget_content)
  if (wateringWidget) {
    let bounds = wateringWidget.bounds()
    automator.click(bounds.centerX(), bounds.centerY())
    commonFunctions.debug('found wateringWidget:' + wateringWidget.bounds())
  } else {
    commonFunctions.error('未找到浇水按钮')
  }
}

module.exports = {
  WidgetUtils: {
    foundNoMoreWidget: foundNoMoreWidget,
    widgetWaiting: widgetWaiting,
    widgetCheck: widgetCheck,
    homePageWaiting: homePageWaiting,
    friendHomeWaiting: friendHomeWaiting,
    friendListWaiting: friendListWaiting,
    widgetGetOne: widgetGetOne,
    widgetGetAll: widgetGetAll,
    loadFriendList: loadFriendList,
    getFriendList: getFriendList,
    getFriendsName: getFriendsName,
    quickScrollDown: quickScrollDown,
    waitRankListStable: waitRankListStable,
    getJRankSelfBottom: getJRankSelfBottom,
    getYouCollectEnergy: getYouCollectEnergy,
    getFriendEnergy: getFriendEnergy,
    wateringFriends: wateringFriends
  }
}