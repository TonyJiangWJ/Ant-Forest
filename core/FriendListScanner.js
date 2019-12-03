/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-11 09:17:29
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-03 23:07:41
 * @Description: 
 */
let _widgetUtils = typeof WidgetUtils === 'undefined' ? require('../lib/WidgetUtils.js') : WidgetUtils
let automator = require('../lib/Automator.js')
let _commonFunctions = typeof commonFunctions === 'undefined' ? require('../lib/CommonFunction.js') : commonFunctions
let _config = typeof config === 'undefined' ? require('../config.js').config : config
let FileUtils = require('../lib/FileUtils.js')

let _avil_list = []
let _increased_energy = 0
let _collect_any = false
let _min_countdown = 10000
let _current_time = 0

const _package_name = 'com.eg.android.AlipayGphone'

const whetherFriendListValidLength = function (friends_list_parent) {
  return (friends_list_parent && friends_list_parent.children()) ? friends_list_parent.children().length : undefined
}



/**
 * 展示当前累积收集能量信息，累加已记录的和当前运行轮次所增加的
 * 
 * @param {本次增加的能量值} increased
 */
const showCollectSummaryFloaty = function (increased) {
  if (_config.is_cycle) {
    _commonFunctions.showCollectSummaryFloaty0(_increased_energy, _current_time, increased)
  } else {
    _commonFunctions.showCollectSummaryFloaty0(null, null, increased)
  }
}

/**
 * 收集目标能量球能量
 * 
 * @param {*} energy_ball 能量球对象
 * @param {boolean} isOwn 是否收集自身能量
 * @param {boolean} isDesc 是否是desc类型
 */
const collectBallEnergy = function (energy_ball, isOwn, isDesc) {
  if (_config.skip_five && !isOwn) {
    let regexCheck = /(\d+)克/
    let execResult
    if (isDesc) {
      debugInfo('获取能量球desc数据')
      execResult = regexCheck.exec(energy_ball.desc())
    } else {
      debugInfo('获取能量球text数据')
      execResult = regexCheck.exec(energy_ball.text())
    }
    if (execResult.length > 1 && parseInt(execResult[1]) <= 5) {
      debugInfo(
        '能量小于等于五克跳过收取 ' + isDesc ? energy_ball.desc() : energy_ball.text()
      )
      return
    }
  }
  debugInfo(isDesc ? energy_ball.desc() : energy_ball.text())
  automator.clickCenter(energy_ball)
  if (!isOwn) {
    _collect_any = true
  }
  sleep(300)
}

// 收取能量
const collectEnergy = function (own) {
  let isOwn = own || false
  let ballCheckContainer = _widgetUtils.widgetGetAll(_config.collectable_energy_ball_content, null, true)
  if (ballCheckContainer !== null) {
    debugInfo('能量球存在')
    ballCheckContainer.target
      .forEach(function (energy_ball) {
        collectBallEnergy(energy_ball, isOwn, ballCheckContainer.isDesc)
      })
  } else {
    debugInfo('无能量球可收取')
  }
}

// 收取能量同时帮好友收取
const collectAndHelp = function (needHelp) {
  // 收取好友能量
  collectEnergy()
  let screen = null
  _commonFunctions.waitFor(function () {
    screen = captureScreen()
  }, 500)
  if (!screen) {
    warnInfo('获取截图失败，无法帮助收取能量')
    return
  }
  // 帮助好友收取能量
  let energyBalls
  if (
    className('Button').descMatches(/\s/).exists()
  ) {
    energyBalls = className('Button').descMatches(/\s/).untilFind()
  } else if (
    className('Button').textMatches(/\s/).exists()
  ) {
    energyBalls = className('Button').textMatches(/\s/).untilFind()
  }
  if (energyBalls && energyBalls.length > 0) {
    let length = energyBalls.length
    let helped = false
    let colors = _config.helpBallColors || ['#f99236', '#f7af70']
    energyBalls.forEach(function (energy_ball) {
      let bounds = energy_ball.bounds()
      let o_x = bounds.left,
        o_y = bounds.top,
        o_w = bounds.width() + 20,
        o_h = bounds.height() + 20,
        threshold = _config.color_offset
      for (let color of colors)
        if (
          images.findColor(screen, color, {
            region: [o_x, o_y, o_w, o_h],
            threshold: threshold
          })
        ) {
          automator.clickCenter(energy_ball)
          helped = true
          _collect_any = true
          sleep(200)
          debugInfo("找到帮收取能量球颜色匹配" + color)
          break
        }
    })
    if (!helped && needHelp) {
      warnInfo(['未能找到帮收能量球需要增加匹配颜色组 当前{}', colors])
    }
    // 当数量大于等于6且帮助收取后，重新进入
    if (helped && length >= 6) {
      return true
    }
  }
}

// 判断并记录保护罩
const recordProtected = function (toast) {
  if (toast.indexOf('能量罩') > 0) {
    recordCurrentProtected()
  }
}

const recordCurrentProtected = function () {
  let title = textContains('的蚂蚁森林')
    .findOne(_config.timeout_findOne)
    .text()
  _commonFunctions.addNameToProtect(title.substring(0, title.indexOf('的')))
}

// 检测能量罩
const protectDetect = function (filter) {
  filter = typeof filter == null ? '' : filter
  // 在新线程中开启监听
  return threads.start(function () {
    events.onToast(function (toast) {
      if (toast.getPackageName().indexOf(filter) >= 0)
        recordProtected(toast.getText())
    })
  })
}

const protectInfoDetect = function () {
  let usingInfo = _widgetUtils.widgetGetOne(_config.using_protect_content, 50, true, true)
  if (usingInfo !== null) {
    let target = usingInfo.target
    debugInfo(['found using protect info, bounds:{}', target.bounds()], true)
    let parent = target.parent().parent()
    let targetRow = parent.row()
    let time = parent.child(1).text()
    if (!time) {
      time = parent.child(1).desc()
    }
    let isToday = true
    let yesterday = _widgetUtils.widgetGetOne('昨天', 50, true, true)
    let yesterdayRow = null
    if (yesterday !== null) {
      yesterdayRow = yesterday.target.row()
      // warnInfo(yesterday.target.indexInParent(), true)
      isToday = yesterdayRow > targetRow
    }
    if (!isToday) {
      // 获取前天的日期
      let dateBeforeYesterday = formatDate(new Date(new Date().getTime() - 3600 * 24 * 1000 * 2), 'MM-dd')
      let dayBeforeYesterday = _widgetUtils.widgetGetOne(dateBeforeYesterday, 50, true, true)
      if (dayBeforeYesterday !== null) {
        let dayBeforeYesterdayRow = dayBeforeYesterday.target.row()
        if (dayBeforeYesterdayRow < targetRow) {
          debugInfo('能量罩使用时间已超时，前天之前的数据')
          return false
        } else {
          debugInfo(['前天row:{}', dayBeforeYesterdayRow])
        }
      }
    }
    debugInfo(['using time:{}-{} rows: yesterday[{}] target[{}]', (isToday ? '今天' : '昨天'), time, yesterdayRow, targetRow], true)
    recordCurrentProtected()
    return true
  } else {
    debugInfo('not found using protect info')
  }
  return false
}

const collectTargetFriend = function (obj) {
  let rentery = false
  if (!obj.protect) {
    let temp = protectDetect(_package_name)
    //automator.click(obj.target.centerX(), obj.target.centerY())
    debugInfo('等待进入好友主页：' + obj.name)
    let restartLoop = false
    let count = 1
    automator.click(obj.target.centerX(), obj.target.centerY())
    ///sleep(1000)
    while (!_widgetUtils.friendHomeWaiting()) {
      debugInfo(
        '未能进入主页，尝试再次进入 count:' + count++
      )
      automator.click(obj.target.centerX(), obj.target.centerY())
      sleep(1000)
      if (count > 5) {
        warnInfo('重试超过5次，取消操作')
        restartLoop = true
        break
      }
    }
    if (restartLoop) {
      errorInfo('页面流程出错，重新开始')
      return false
    }
    if (protectInfoDetect()) {
      warnInfo(['{} 好友已使用能量保护罩，跳过收取', obj.name])
      automator.back()
      return
    }
    debugInfo('准备开始收取')

    let preGot
    let preE
    try {
      preGot = _widgetUtils.getYouCollectEnergy() || 0
      preE = _widgetUtils.getFriendEnergy()
    } catch (e) { errorInfo("[" + obj.name + "]获取收集前能量异常" + e) }
    if (_config.help_friend) {
      rentery = collectAndHelp(obj.isHelp)
    } else {
      collectEnergy()
    }
    try {
      let postGet = _widgetUtils.getYouCollectEnergy() || 0
      let postE = _widgetUtils.getFriendEnergy()
      if (!obj.isHelp && postGet !== null && preGot !== null) {
        let gotEnergy = postGet - preGot
        debugInfo("开始收集前:" + preGot + "收集后:" + postGet)
        if (gotEnergy) {
          let needWaterback = _commonFunctions.recordFriendCollectInfo({
            friendName: obj.name,
            friendEnergy: postE,
            postCollect: postGet,
            preCollect: preGot,
            helpCollect: 0
          })
          try {
            if (needWaterback) {
              _widgetUtils.wateringFriends()
              gotEnergy -= 10
            }
          } catch (e) {
            errorInfo('收取[' + obj.name + ']' + gotEnergy + 'g 大于阈值:' + _config.wateringThresold + ' 回馈浇水失败 ' + e)
          }
          logInfo([
            "收取好友:{} 能量 {}g {}",
            obj.name, gotEnergy, (needWaterback ? '其中浇水10g' : '')
          ])
          showCollectSummaryFloaty(gotEnergy)
        } else {
          debugInfo("收取好友:" + obj.name + " 能量 " + gotEnergy + "g")

        }
      } else if (obj.isHelp && postE !== null && preE !== null) {
        let gotEnergy = postE - preE
        debugInfo("开始帮助前:" + preE + " 帮助后:" + postE)
        if (gotEnergy) {
          logInfo("帮助好友:" + obj.name + " 回收能量 " + gotEnergy + "g")
          _commonFunctions.recordFriendCollectInfo({
            friendName: obj.name,
            friendEnergy: postE,
            postCollect: postGet,
            preCollect: preGot,
            helpCollect: gotEnergy
          })
        } else {
          debugInfo("帮助好友:" + obj.name + " 回收能量 " + gotEnergy + "g")
        }
      }
    } catch (e) {
      errorInfo("[" + obj.name + "]获取收取后能量异常" + e)
    }
    automator.back()
    temp.interrupt()
    debugInfo('好友能量收取完毕, 回到好友排行榜')
    let returnCount = 0
    while (!_widgetUtils.friendListWaiting()) {
      sleep(1000)
      if (returnCount++ === 2) {
        // 等待两秒后再次触发
        automator.back()
      }
      if (returnCount > 5) {
        errorInfo('返回好友排行榜失败，重新开始')
        return false
      }
    }
    if (rentery) {
      obj.isHelp = false
      return collectTargetFriend(obj)
    }
  }
  return true
}

// 根据可收取列表收取好友
const collectAvailableList = function () {
  while (_avil_list.length) {
    if (false === collectTargetFriend(_avil_list.shift())) {
      warnInfo('收取目标好友失败，向上抛出')
      return false
    }
  }
}

const cutAndSaveImage = function (screen, countdownInfo) {
  threads.start(function () {
    try {
      let cutImg = images.clip(screen, countdownInfo.x, countdownInfo.y, countdownInfo.w, countdownInfo.h)
      let path = FileUtils.getCurrentWorkPath() + "/countdownImgs"
      files.ensureDir(path)
      let saveImgPath = _commonFunctions.formatString('{}/{}_{}_{}.png', path, countdownInfo.name, countdownInfo.countdown, countdownInfo.y)
      images.save(cutImg, saveImgPath)
      infoLog(['保存倒计时图片：{}', saveImgPath])
    } catch (e) {
      errorInfo('截取图片失败' + e)
    }
  })
}

/**
 * 判断是否可收取
 * @param {Object} obj 好友控件对象
 * @param {Object} screen 截图
 * @param {string} name 好友名称
 */
const isObtainable = function (obj, screen, name) {
  let container = {
    fri: obj,
    isHelp: false,
    name: name || _widgetUtils.getFriendsName(obj),
    canDo: false
  }

  let len = obj.childCount()
  if (len < 5) {
    return container
  }
  // 分析目标控件的索引
  let targetIdx = 4

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
      if (_config.cutAndSaveCountdown) {
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

  let o_x = obj.child(targetIdx).bounds().left,
    o_y = obj.bounds().top,
    o_w = 5,
    o_h = obj.bounds().height() - 10,
    threshold = _config.color_offset
  if (o_h > 50) {
    o_h = 50
  }
  if (o_h > 0) {
    try {
      if (
        // 是否可收取
        images.findColor(screen, _config.can_collect_color || '#1da06a', {
          region: [o_x, o_y, o_w, o_h],
          threshold: threshold
        })
      ) {
        container.canDo = true
      } else if (
        _config.help_friend &&
        // 是否可帮收取
        images.findColor(screen, _config.can_help_color || '#f99236', {
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
      errorInfo(['图片分析失败{} imgsize:[w:{}, h:{}]', e, screen.getWidth(), screen.getHeight()])
    }
  }
  return container
}

/**
 * 记录好友信息
 * @param {Object} container 
 */
const recordAvailableList = function (container) {
  let temp = {}
  // 记录可收取对象
  temp.target = container.bounds
  // 记录好友ID
  temp.name = container.name
  // 记录是否有保护罩
  temp.protect = _commonFunctions.checkIsProtected(temp.name)
  // 记录是否是帮助收取
  temp.isHelp = container.isHelp
  // 不在白名单的 添加到可收取列表
  if (_config.white_list.indexOf(temp.name) < 0) {
    _avil_list.push(temp)
  }
}


const checkIsEveryFriendChecked = function (checkedList, totalValidLength) {
  debugInfo('校验好友数量[' + checkedList.length + ']')
  checkedList = checkedList.reduce((a, b) => {
    if (a.indexOf(b) < 0) {
      a.push(b)
    }
    return a
  }, [])
  debugInfo('去重复后数量[' + checkedList.length + ']')
  let vibrated = false
  for (let i = 0; i < totalValidLength; i++) {
    if (checkedList.indexOf(i) < 0) {

      errorInfo('未校验[' + i + '] 可能存在漏收', !vibrated)
      errorInfo('校验好友数量[' + checkedList.length + ']')
      if (!vibrated) {
        device.vibrate(200)
        vibrated = true
      }
    }
  }
  return vibrated
}

const checkRunningCountdown = function (countingDownContainers) {
  if (!_config.is_cycle && countingDownContainers.length > 0) {
    debugInfo(['倒计时中的好友数[{}]', countingDownContainers.length])
    countingDownContainers.forEach((item, idx) => {
      let now = new Date()
      let stamp = item.countdown.stamp
      let count = item.countdown.count
      let passed = Math.round((now - stamp) / 60000.0)
      debugInfo([
        '[{}]\t需要计时[{}]分\t经过了[{}]分\t计时时间戳[{}]',
        item.name, count, passed, stamp
      ])
      if (passed >= count) {
        debugInfo('[' + item.name + ']倒计时结束')
        // 标记有倒计时结束的漏收了，收集完之后进行第二次收集
        return true
      } else {
        let rest = count - passed
        _min_countdown = rest < _min_countdown ? rest : _min_countdown
      }
    })
  }
}

const getFirstVisiable = function (friendList) {
  let found = false
  let firstIdx = -1
  friendList.forEach((item, idx) => {
    if (found) {
      return
    }
    // if (item.visibleToUser()) {
    let h = item.bounds().bottom - item.bounds().top
    if (h > 10) {
      found = true
      firstIdx = idx
    }
    // }

  })
  if (found) {
    debugInfo(['找到首个可见item idx:{} bounds:{}', firstIdx, friendList[firstIdx].bounds()], false)
  } else {
    debugInfo(['未能找到首个可见item'], false)
  }
  return firstIdx
}

const simpleCheckValidList = function (friends_list_parent) {
  if (friends_list_parent) {
    return friends_list_parent.children().filter((fri) => {
      return fri && fri.childCount() >= 4
    })
  }
}

const getValidChildList = function (friends_list_parent) {
  return friends_list_parent.children().filter((fri) => {
    if (!fri) {
      return false
    }
    if (fri.childCount() >= 4) {
      let text = fri.child(3).child(0).text()
      let desc = fri.child(3).child(0).desc()
      let content = text || desc
      let regex = /.*[tg]|(证书)$/
      return regex.test(content)
    } else {
      let name = _widgetUtils.getFriendsName(fri)
      warnInfo(name + "不是有效的列表")
    }
    return false
  })
}

function FriendListScanner () {
  this.lock = null
  this.condition = null

  this.friends_list_parent = null
  this.valid_child_list = null
  this.all_loaded = false
  this.emptyList = true
  this.usedList = false


  this.init = function (option) {
    _current_time = option.currentTime || 0
    _increased_energy = option.increasedEnergy || 0
    this.lock = threads.lock()
    this.condition = this.lock.newCondition()
    this.all_loaded = false
    this.emptyList = true
    this.usedList = false
  }

  this.destory = function () {
    this.preloadingThread.interrupt()
    this.pregettingThread.interrupt()
    this.friends_list_parent = null
  }


  this.preloadingThread = null
  this.pregettingThread = null


  this.preloading = function () {
    that = this
    this.preloadingThread = threads.start(function () {
      let threadName = '预加载线程'
      debugInfo(threadName + '启动')
      while (that.all_loaded === false) {
        debugInfo(threadName + '进入循环体')
        try {
          // 500毫秒检测一次
          sleep(500)
          // 如果发现 没有更多 则更新状态为列表已经完全加载完毕 all_loaded = true
          if (_widgetUtils.foundNoMoreWidget()) {
            debugInfo(threadName + '发现没有更多按钮，获取好友列表')
            debugInfo(threadName + '正获取好友list中')
            that.lock.lock()
            debugInfo(threadName + "获取锁")
            that.friends_list_parent = _widgetUtils.getFriendListParent()
            that.valid_child_list = getValidChildList(that.friends_list_parent)
            that.all_loaded = true
            that.usedList = false
            debugInfo(threadName + "重新获取好友列表数据")
            sleep(100)
            that.condition.signal()
            debugInfo(threadName + '获取好友list完成')
            let listLength = whetherFriendListValidLength(that.friends_list_parent)
            if (listLength) {
              // 动态修改预加载超时时间
              let dynamicTimeout = Math.ceil(listLength / 20) * 800
              _config.timeoutLoadFriendList = dynamicTimeout
              let { storage_name } = require('../config.js')
              var configStorage = storages.create(storage_name)
              configStorage.put('timeoutLoadFriendList', dynamicTimeout)
              // let { config: anotherConfig } = require('../config.js')
              // debugInfo('another config\'s timeoutLoadFriendList:[' + anotherConfig.timeoutLoadFriendList + ']')
              debugInfo(threadName + '动态修改预加载超时时间为：' + dynamicTimeout + ' 设置完后缓存数据为：' + _config.timeoutLoadFriendList)
            }
            // } else if ((more.desc() && more.desc().match(loadMoreContent)) || (more.text() && more.text().match(loadMoreContent))) {

            //   debugInfo(threadName + '点击加载前等待锁')
            //   that.lock.lock()
            //   debugInfo(threadName + '点击加载前获得锁')
            //   debugInfo(threadName + '点击加载更多，热身中 速度较慢')
            //   more.click()
            //   that.condition.signal()
            // } else {
            //   debugInfo(threadName + 'find target j_rank_list_more but desc/text is :' + more.desc() + ', ' + more.text())
            // }
          }
        } catch (e) {
          errorInfo('预载入异常' + e)
        } finally {
          try {
            that.lock.unlock()
            debugInfo(threadName + "释放锁")
          } catch (e) {

          }
        }
      }
      debugInfo(threadName + '退出循环')
    })
  }

  this.pregetting = function () {
    that = this
    this.pregettingThread = threads.start(function () {
      debugInfo('预获取线程启动')
      while (that.all_loaded === false) {
        debugInfo('预获取线程进入循环体')
        try {

          debugInfo('预获取线程等待锁')
          that.lock.lock()
          debugInfo('预获取线程获取锁')
          while (!that.emptyList && !that.usedList) {
            debugInfo(['预获取线程等待信号 empty:{} used:{}', that.emptyList, that.usedList])
            that.condition.await()
            if (that.all_loaded === true) {
              // 在等待时列表可能已经获取完毕，直接退出
              break
            }
          }
          that.friends_list_parent = _widgetUtils.getFriendListParent()
          let l = whetherFriendListValidLength(that.friends_list_parent)
          let validChildList = null
          if (l) {
            validChildList = simpleCheckValidList(that.friends_list_parent)
          }
          while (!l || !validChildList || validChildList.length === 0) {
            warnInfo("首次获取列表数据不完整，再次获取")
            debugInfo('好友列表总长度：' + l + " 有效长度：" + (validChildList ? validChildList.length : '0'))
            sleep(400)
            that.friends_list_parent = _widgetUtils.getFriendListParent()
            l = whetherFriendListValidLength(that.friends_list_parent)
            if (l) {
              validChildList = simpleCheckValidList(that.friends_list_parent)
            }
          }
          that.valid_child_list = getValidChildList(that.friends_list_parent)
          debugInfo(['预获取线程中获取到好友列表，长度：{}', that.valid_child_list.length])
          that.emptyList = false
          that.usedList = false
          that.condition.signal()
          sleep(100)
        } catch (e) {
          errorInfo('预获取异常' + e)
        } finally {
          that.lock.unlock()
          debugInfo('预获取线程释放锁')
        }
      }
      debugInfo('预获取线程退出循环体')
    })
  }

  /**
   * 执行检索，失败返回true 有收集遗漏，成功返回对象
   * {
   *   // 是否有漏收
   *   lostSomeone: _lost_someone,
   *   // 是否收集过任何人
   *   collectAny: _collect_any,
   *   // 记录的最小倒计时数据
   *   minCountdown: _min_countdown
   * }
   */
  this.collecting = function () {
    let totalAnalyzeTime = 0
    let collectStart = new Date().getTime()
    let lastCheckedFriend = -1
    let checkedList = []
    let totalValidLength = 0
    let countingDownContainers = []
    let iterEnd = -1
    let QUEUE_SIZE = 5
    let distinctQueue = _commonFunctions.createQueue(QUEUE_SIZE)
    let stock_idx = -1
    let stock_count = 0
    do {
      try {
        iterEnd = -1
        iterStart = lastCheckedFriend
        _widgetUtils.waitRankListStable()

        let findStart = new Date().getTime()

        debugInfo('主流程等待锁')
        this.lock.lock()
        debugInfo('主流程获取锁')
        while (this.emptyList === true) {
          debugInfo('主流程等待信号')
          this.condition.await()
        }
        // 获取截图 用于判断是否可收取 截图失败时终止程序并几秒后重启，主要是因为丢失了截图权限
        let screen = _commonFunctions.checkCaptureScreenPermission(false, 5)
        if (this.friends_list_parent && this.friends_list_parent.children) {
          friendListLength = this.friends_list_parent.children().length
          debugInfo(
            '读取好友列表完成，开始检查可收取列表 列表长度:' + friendListLength
          )
          let validChildList = getValidChildList(this.friends_list_parent)
          let firstIdx = getFirstVisiable(validChildList)
          if (lastCheckedFriend > 0 && firstIdx > lastCheckedFriend) {
            if (checkedList.indexOf(firstIdx) <= 0) {
              debugInfo(['列表不正确，上划重新开始 当前首个：{} 已校验到：{}', firstIdx, lastCheckedFriend])
              scrollUp()
              continue
            } else {
              debugInfo(['重置lastChecked为当前首个可见item：{} ', firstIdx])
              lastCheckedFriend = firstIdx
            }
          }

          totalValidLength = validChildList.length
          debugInfo(['有效好友列表长度: {}', totalValidLength])
          if (firstIdx >= 0 && lastCheckedFriend - firstIdx >= 6) {
            debugInfo(['当前首个可见item index:{} 远小于上一次检测的index:{} 重置lastChecked', firstIdx, lastCheckedFriend])
            lastCheckedFriend = firstIdx
          }
          for (let idx = (lastCheckedFriend > 0 ? lastCheckedFriend + 1 : 0); idx < totalValidLength; idx++) {
            let fri = validChildList[idx]
            let friendName = _widgetUtils.getFriendsName(fri)
            if ((iterEnd !== -1 && idx > iterEnd) || checkedList.indexOf(idx) > -1) {
              continue
            }
            debugInfo('校验' + idx + "开始")
            if (fri.visibleToUser()) {
              let bounds = fri.bounds()
              let fh = bounds.bottom - bounds.top
              if (fh > 10) {
                debugInfo(['识别好友信息 idx:{} name: {}', idx, friendName])
                let container = isObtainable(fri, screen, friendName)
                if (container.canDo) {
                  container.bounds = bounds
                  recordAvailableList(container)
                  debugInfo([
                    '可收取 fh[{}] index:[{}] name:[{}]', fh, idx, container.name
                  ])
                } else {
                  debugInfo([
                    '不可收取 fh[{}] index:[{}] name:[{}]', fh, idx, container.name
                  ])
                  //debugInfo('不可收取 index:' + idx + ' name:' + container.name)
                  if (container.countdown) {
                    countingDownContainers.push(container)
                  }
                }
                lastCheckedFriend = idx
                checkedList.push(idx)
              } else {
                debugInfo(['好友[{}]信息不可见 stock:{}，控件高度[{}]低于10 top:{}', friendName ? friendName : idx, stock_idx, fh, bounds.top])
                iterEnd = idx
              }
            } else {
              debugInfo(['好友[{}]信息不可见 stock:{}', idx, stock_idx])
              iterEnd = idx
            }
          }
          if (iterEnd !== -1 && iterEnd === stock_idx) {
            stock_count++
          } else {
            stock_idx = iterEnd
            stock_count = 0
          }

          if (stock_count > 2) {
            if (firstIdx === -1) {
              errorInfo(['在控件位置：{} 卡住多次, 且首个可见item获取失败，请尝试重启脚本', stock_idx], true)
            } else {
              debugInfo(['在控件位置：{} 卡住多次，上划 首个可见item:{}', stock_idx, firstIdx])
            }
            stock_count = 0
            scrollUp()
            continue
          }
          debugInfo(
            ['可收取列表获取完成 校验数量[{}]，开始收集 待收取列表长度:[{}]', lastCheckedFriend + 1, _avil_list.length]
          )
          let findEnd = new Date().getTime()
          let currentAnalyzeCost = findEnd - findStart
          totalAnalyzeTime += currentAnalyzeCost
          debugInfo(['检测好友列表可收取情况耗时：[{}]ms ', currentAnalyzeCost])
        } else {
          logInfo('好友列表不存在')
        }
        if (!_widgetUtils.friendListWaiting()) {
          errorInfo('崩了 当前不在好友列表 重新开始')
          return true
        }
        if (_avil_list.length > 0) {
          if (false == collectAvailableList()) {
            errorInfo('流程出错 向上抛出')
            return true
          }
        } else {
          debugInfo('无好友可收集能量')
        }
        // 重置为空列表
        _avil_list = []

        let canScrollDown = true
        if ((lastCheckedFriend >= totalValidLength - 1 || _commonFunctions.getQueueDistinctSize(distinctQueue) <= 3) && this.all_loaded === false) {
          canScrollDown = false
          this.usedList = true
          this.condition.signal()
          let newValidList = null
          do {
            if (newValidList !== null) {
              debugInfo('获取到的长度无变化，上下滑动触发加载')
              automator.scrollUpAndDown()
              this.usedList = true
            }
            // 主流程等待
            debugInfo(['主流程等待预获取线程获取好友列表数据'])
            this.condition.await()
            newValidList = this.valid_child_list || []
            debugInfo(['主流程收到预获取线程获取好友列表数据的通知 已校验的长度：{} 新获取的长度：{}', totalValidLength, newValidList.length])
          } while(!this.usedList && newValidList && newValidList.length === totalValidLength && this.all_loaded === false)
          debugInfo(['主流程最终收到好友列表 已校验的长度：{} 新获取的长度：{} loadStatus:{}', totalValidLength, newValidList.length, this.all_loaded])
        }
        // -------收集好友列表完成-------
        // let canScrollDown = true
        // 当剩余未检测数量小于等于20时，通知重新获取列表数据
        // 新版暂时没法预加载 去除
        // if (lastCheckedFriend >= totalValidLength - 15 && this.all_loaded === false) {
        //   debugInfo('未检测数量小于等于20时，通知重新获取列表数据')
        //   canScrollDown = false
        //   this.usedList = true
        //   this.condition.signal()
        //   while (lastCheckedFriend === totalValidLength - 1 && this.all_loaded === false && this.usedList === true) {
        //     // 列表未加载完，但是已经检测完当前列表，网络较差的时候会发生，释放条件为重新获取列表 刷新usedList为false 或者加载完all_loaded = true
        //     warnInfo([
        //       '网络太差，继续等待, last:{} total:{} loaded:{} used:{}',
        //       lastCheckedFriend, totalValidLength, this.all_loaded, this.usedList
        //     ])
        //     this.condition.await()
        //   }
        // }

        if (canScrollDown) {
          debugInfo('滑动进入下一页')
          automator.scrollDown()
        }
      } catch (e) {
        errorInfo('主流程出错' + e)
        return true
      } finally {
        debugInfo('主流程释放锁')
        this.lock.unlock()
      }
      _commonFunctions.pushQueue(distinctQueue, QUEUE_SIZE, lastCheckedFriend)
    } while (
      lastCheckedFriend < this.valid_child_list.length - 1 || this.all_loaded === false
    )

    debugInfo([
      '校验收尾 state:{} lastCheck:{} total:{} queueSize:{}',
      this.all_loaded, lastCheckedFriend, totalValidLength, _commonFunctions.getQueueDistinctSize(distinctQueue)
    ])
    if (_avil_list.length > 0) {
      debugInfo(['有未收集的可收取能量'])
      if (false == collectAvailableList()) {
        errorInfo('流程出错 向上抛出')
        return true
      }
    } else {
      debugInfo('无好友可收集能量')
    }

    _lost_someone = checkIsEveryFriendChecked(checkedList, totalValidLength)
    _lost_someone = _lost_someone || checkRunningCountdown(countingDownContainers)
    _commonFunctions.addClosePlacehold(">>>><<<<")
    debugInfo([
      '全部收集完成, last:[{}] length:[{}]',
      lastCheckedFriend, totalValidLength
    ])
    logInfo([
      '全部好友收集完成, 总分析耗时：[{}]ms 总收集耗时：[{}]ms',
      totalAnalyzeTime, (new Date().getTime() - collectStart)
    ])
    if (_lost_someone) {
      clearLogFile()
    }
    return {
      lostSomeone: _lost_someone,
      collectAny: _collect_any,
      minCountdown: _min_countdown
    }
  }

  this.start = function () {
    _increased_energy = 0
    _min_countdown = 10000
    this.preloading()
    this.pregetting()
    return this.collecting()
  }
}

module.exports = FriendListScanner