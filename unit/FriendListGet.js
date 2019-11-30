/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-30 11:34:59
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-11-30 21:16:09
 * @Description: 测试功能用
 */
let config = {
  friend_list_ui_content: '(周|总)排行榜',
  help_friend: true
}
const whetherFriendListValidLength = function (friends_list) {
  return (friends_list && friends_list.children()) ? friends_list.children().length : undefined
}
const getFriendsName = function (fri) {
  try {
    let nameContainer = fri.child(2).child(0).child(0)
    return nameContainer.text() || nameContainer.desc()
  } catch (e) {
    log(e)
  }
}
console.show()
const _own_text = 'TonyJiang'

const getJRankSelfBottom = function () {
  let maxTry = 50
  while (maxTry-- > 0) {
    try {
        return textMatches(_own_text).findOnce(1).bounds().bottom;
    } catch (e) {
      try {
        return descMatches(_own_text).findOnce(1).bounds().bottom;
      } catch (e2) {
        // nothing to do here
      }
    }
  }
  return null
}

const getH5RankSelfBottom = function () {
  let maxTry = 50
  while (maxTry-- > 0) {
    try {
      return idMatches(/.*h5_h_divider/).findOnce().bounds().bottom;
    } catch (e) {
      // nothing to do here
    }
  }
  return null
}

let countdown = new Countdown()
// let count = 10
// while (count-- > 0) {
//   sleep(1000)
//   countdown = new Countdown()
//   log(getJRankSelfBottom())
//   countdown.summary('获取个人控件底部')
// }
countdown = new Countdown()
log(getH5RankSelfBottom())
countdown.summary('获取h5_h_dividier')

countdown = new Countdown()
getFriendsList1('TonyJiang')
countdown.summary('获取好友列表Root1')
countdown = new Countdown()
getFriendsList('TonyJiang')
countdown.summary('获取好友列表Root0')

function convertObjectContent (originContent) {
  if (typeof originContent === 'string') {
    return originContent
  } else if (Array.isArray(originContent)) {
    // let [marker, ...args] = originContent
    let marker = originContent[0]
    let args = originContent.slice(1)
    let regex = /(\{\})/g
    let matchResult = marker.match(regex)
    if (matchResult && args && matchResult.length > 0 && matchResult.length === args.length) {
      args.forEach((item, idx) => {
        marker = marker.replace('{}', item)
      })
      return marker
    } else if (matchResult === null) {
      return marker
    }
  }
  console.error('参数不匹配[' + originContent + ']')
  return originContent
}

function debugInfo (content, isToast) {
  let c = convertObjectContent(content)
  console.verbose(c)
}

function isObtainable (obj, screen) {
  let container = {
    fri: obj,
    isHelp: false,
    name: getFriendsName(obj),
    canDo: false
  }

  let len = obj.childCount()
  if (len < 5) {
    return container
  }
  // 分析目标控件的索引
  let targetIdx = 4
  if (!config.is_cycle) {
    let countDO = obj.child(targetIdx)
    if (countDO.childCount() > 0) {
      let cc = countDO.child(0)
      debugInfo(['获取[{}] 倒计时数据[{}] ', container.name, (cc.desc() ? cc.desc() : cc.text())])
      let num = null
      if (cc.desc()) {
        num = parseInt(cc.desc().match(/\d+/))
      }
      if (!num && cc.text()) {
        num = parseInt(cc.text().match(/\d+/))
      }
      if (isFinite(num)) {
        debugInfo([
          '记录[{}] 倒计时[{}]分 time[{}]',
          container.name, num, new Date().getTime()
        ])
        if (config.cutAndSaveCountdown) {
          let countdownInfo = {
            name: container.name,
            x: obj.bounds().left,
            y: obj.bounds().top,
            h: obj.bounds().height(),
            w: obj.bounds().width(),
            countdown: num
          }
          cutAndSaveImage(screen, countdownInfo)
        }
        container.countdown = {
          count: num,
          stamp: new Date().getTime()
        }
        return container
      }

    }
  }
  let o_x = obj.child(targetIdx).bounds().left,
    o_y = obj.bounds().top,
    o_w = 5,
    o_h = obj.bounds().height() - 10,
    threshold = config.color_offset
  if (o_h > 50) {
    o_h = 50
  }
  if (o_h > 0) {
    try {
      if (
        // 是否可收取
        images.findColor(screen, config.can_collect_color || '#1da06a', {
          region: [o_x, o_y, o_w, o_h],
          threshold: threshold
        })
      ) {
        container.canDo = true
      } else if (
        config.help_friend &&
        // 是否可帮收取
        images.findColor(screen, config.can_help_color || '#f99236', {
          region: [o_x, o_y, o_w, o_h],
          threshold: threshold
        })
      ) {
        container.canDo = true
        container.isHelp = true
      }
      if (container.canDo || container.isHelp) {
        // warnInfo(['剪切图片识别区域「x:{} y:{} w:{} h:{}」base64:[\ndata:image/png;base64, {}\n]', o_x, o_y, o_w, o_h, images.toBase64(images.clip(screen, o_x, o_y, o_w, o_h))])
        // warnInfo(['原始图片信息 base64[\ndata:image/png;base64, {}\n]', images.toBase64(screen, 'png', 5)])
      }
    } catch (e) {
      // errorInfo(['图片分析失败{} base64:[data:image/png;base64, {}]', e, images.toBase64(screen, 'png', 50)])
      debugInfo(['图片分析失败{} imgsize:[w:{}, h:{}]', e, screen.getWidth(), screen.getHeight()])
    }
  }
  return container
}


function friendListWaiting () {
  return widgetWaiting(config.friend_list_ui_content, '好友排行榜')
}

function widgetWaiting (contentVal, position, timeoutSetting) {
  let waitingSuccess = widgetCheck(contentVal, timeoutSetting)

  if (waitingSuccess) {
    log('成功进入' + position)
    return true
  } else {
    log('进入' + position + '失败')
    return false
  }
}


/**
 * 校验控件是否存在
 * @param {String} contentVal 控件文本
 * @param {Number} timeoutSetting 超时时间 不设置则为config.timeout_existing
 * 超时返回false
 */
function widgetCheck (contentVal, timeoutSetting) {
  let timeout = timeoutSetting || 1000
  let timeoutFlag = true
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let descThread = threads.start(function () {
    descMatches(contentVal).waitFor()
    let res = descMatches(contentVal).findOne().desc()
    log('find desc ' + contentVal + " " + res)
    timeoutFlag = false
    countDown.countDown()
  })

  let textThread = threads.start(function () {
    textMatches(contentVal).waitFor()
    let res = textMatches(contentVal).findOne().text()
    log('find text ' + contentVal + "  " + res)
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
  return !timeoutFlag
}


function getFriendsList (ownText) {
  if (ownText) {
    // log('我自己：' + ownText)
    let allSelf = textMatches(new RegExp('^' + ownText + '$')).find()
    if (allSelf && allSelf.length >= 2) {
      try {
        let rootParent = allSelf[1].parent().parent().parent().parent()
        // log('列表总长度：' + rootParent.children().length)
        return rootParent
      } catch (e) {
        log(e)
      } finally {
        // countdown.summary('获取好友列表根节点')
      }
    }
  }
}

function getFriendsList1 (ownText) {
  if (ownText) {
    // log('我自己：' + ownText)
    let self = textMatches(new RegExp('^' + ownText + '$')).findOnce(1)
    if (self) {
      try {
        let rootParent = self.parent().parent().parent().parent()
        // log('列表总长度：' + rootParent.children().length)
        return rootParent
      } catch (e) {
        log(e)
      } finally {
        // countdown.summary('获取好友列表根节点')
      }
    }
  }
}


function Countdown () {
  this.start = new Date().getTime()
  this.getCost = function () {
    return new Date().getTime() - this.start
  }

  this.summary = function (content) {
    console.log(content + '耗时' + this.getCost() + 'ms')
  }

}

function getOwntext () {
  let anyone = null
  let regex = /[.\d]+[kgt]+$/
  let countdown = new Countdown()
  if (textMatches(regex).exists()) {
    anyone = textMatches(regex).findOne(1000)
    log('当前获取到的内容：' + anyone.text())
  } else if (descMatches(regex).exists()) {
    log('当前获取到的内容：' + anyone.desc())
    anyone = descMatches(regex).findOne(1000)
  }
  countdown.summary('获取能量值控件')
  if (anyone) {
    try {
      let ownElement = anyone.parent().parent().children()[2].children()[0].children()[0]
      return ownElement.text() || ownElement.desc()
    } catch (e) {
      log(e)
      return null
    } finally {
      countdown.summary('分析自身id')
    }
  }

}


function iteratorAllText (element, parent) {
  if (element) {
    let content = element.desc() || element.text()
    log(parent + '>' + content)
    if (element.children()) {
      element.children().forEach((child, idx) => {
        iteratorAllText(child, parent + '>' + content + ':' + idx)
      })
    }
  }
}