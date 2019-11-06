let { WidgetUtils } = require('../lib/WidgetUtils.js')
let { automator } = require('../lib/Automator.js')
let { commonFunctions } = require('../lib/CommonFunction.js')
let { config } = require('../config.js')

let _avil_list = []
let _increased_energy = 0

const _package_name = 'com.eg.android.AlipayGphone'

const whetherFriendListValidLength = function (friends_list) {
  return (friends_list && friends_list.children()) ? friends_list.children().length : undefined
}

const showCollectSummaryFloaty = function (increased) {
  increased = increased || 0
  let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
  let runTimes = commonFunctions.getTodaysRuntimeStorage('runTimes')
  let content = '第 ' + runTimes.runTimes + ' 次运行, 累计已收集:' + ((energyInfo.totalIncrease || 0) + increased) + 'g'
  commonFunctions.showTextFloaty(content)
}

/**
 * 收集目标能量球能量
 * 
 * @param {*} energy_ball 能量球对象
 * @param {boolean} isOwn 是否收集自身能量
 * @param {boolean} isDesc 是否是desc类型
 */
const collectBallEnergy = function (energy_ball, isOwn, isDesc) {
  if (config.skip_five && !isOwn) {
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
  let ballCheckContainer = WidgetUtils.widgetGetAll(config.collectable_energy_ball_content, null, true)
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
  commonFunctions.waitFor(function () {
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
    let colors = config.helpBallColors || ['#f99236', '#f7af70']
    energyBalls.forEach(function (energy_ball) {
      let bounds = energy_ball.bounds()
      let o_x = bounds.left,
        o_y = bounds.top,
        o_w = bounds.width() + 20,
        o_h = bounds.height() + 20,
        threshold = config.color_offset
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
    .findOne(config.timeout_findOne)
    .text()
  commonFunctions.addNameToProtect(title.substring(0, title.indexOf('的')))
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
  let usingInfo = WidgetUtils.widgetGetOne(config.using_protect_content, 50, true)
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
    let yesterday = WidgetUtils.widgetGetOne('昨天', 50, true)
    let yesterdayRow = null
    if (yesterday !== null) {
      yesterdayRow = yesterday.target.row()
      // warnInfo(yesterday.target.indexInParent(), true)
      isToday = yesterdayRow > targetRow
    }
    if (!isToday) {
      // 获取前天的日期
      let dateBeforeYesterday = formatDate(new Date(new Date().getTime() - 3600 * 24 * 1000 * 2), 'MM-dd')
      let dayBeforeYesterday = WidgetUtils.widgetGetOne(dateBeforeYesterday, 50, true)
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
    while (!WidgetUtils.friendHomeWaiting()) {
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
      return
    }
    debugInfo('准备开始收取')

    let preGot
    let preE
    try {
      preGot = WidgetUtils.getYouCollectEnergy() || 0
      preE = WidgetUtils.getFriendEnergy()
    } catch (e) { errorInfo("[" + obj.name + "]获取收集前能量异常" + e) }
    // /*TODO
    if (config.help_friend) {
      rentery = collectAndHelp(obj.isHelp)
    } else {
      collectEnergy()
    }
    // */
    try {
      let postGet = WidgetUtils.getYouCollectEnergy() || 0
      let postE = WidgetUtils.getFriendEnergy()
      if (!obj.isHelp && postGet !== null && preGot !== null) {
        let gotEnergy = postGet - preGot
        debugInfo("开始收集前:" + preGot + "收集后:" + postGet)
        if (gotEnergy) {
          logInfo("收取好友:" + obj.name + " 能量 " + gotEnergy + "g")
          let needWaterback = commonFunctions.recordFriendCollectInfo({
            friendName: obj.name,
            friendEnergy: postE,
            postCollect: postGet,
            preCollect: preGot,
            helpCollect: 0
          })
          try {
            if (needWaterback) {
              WidgetUtils.wateringFriends()
              gotEnergy -= 10
            }
          } catch (e) {
            errorInfo('收取[' + obj.name + ']' + gotEnergy + 'g 大于阈值:' + config.wateringThresold + ' 回馈浇水失败 ' + e)
          }
          _increased_energy += gotEnergy
          showCollectSummaryFloaty(_increased_energy)
        } else {
          debugInfo("收取好友:" + obj.name + " 能量 " + gotEnergy + "g")

        }
      } else if (obj.isHelp && postE !== null && preE !== null) {
        let gotEnergy = postE - preE
        debugInfo("开始帮助前:" + preE + " 帮助后:" + postE)
        if (gotEnergy) {
          logInfo("帮助好友:" + obj.name + " 回收能量 " + gotEnergy + "g")
          commonFunctions.recordFriendCollectInfo({
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
    while (!WidgetUtils.friendListWaiting()) {
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

// 判断是否可收取
const isObtainable = function (obj, screen) {
  let container = {
    fri: obj,
    isHelp: false,
    name: WidgetUtils.getFriendsName(obj),
    canDo: false
  }

  let len = obj.childCount()
  if (!config.is_cycle && len > 5) {
    let countDO = obj.child(5)
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
        container.countdown = {
          count: num,
          stamp: new Date().getTime()
        }
        return container
      }

    }
  }
  let o_x = obj.child(len - 3).bounds().right,
    o_y = obj.bounds().top,
    o_w = 5,
    o_h = obj.bounds().height() - 10,
    threshold = config.color_offset
  if (o_h > 50) {
    o_h = 50
  }
  let tmp = ''
  if (o_h > 0 && !obj.child(len - 2).childCount()) {
    try {
      if (
        // 是否可收取
        images.findColor(screen, '#1da06a', {
          region: [o_x, o_y, o_w, o_h],
          threshold: threshold
        })
      ) {
        container.canDo = true
      } else if (
        config.help_friend &&
        // 是否可帮收取
        images.findColor(screen, '#f99236', {
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
  temp.protect = commonFunctions.checkIsProtected(temp.name)
  // 记录是否是帮助收取
  temp.isHelp = container.isHelp
  // 不在白名单的 添加到可收取列表
  if (config.white_list.indexOf(temp.name) < 0) {
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
  if (!config.is_cycle && countingDownContainers.length > 0) {
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
        _lost_some_one = true
      }
    })
  }
}


function FriendListScanner () {
  this.lock = null
  this.condition = null

  this.friends_list = null
  this.all_loaded = false
  this.emptyList = true
  this.usedList = false


  this.init = function () {
    this.lock = threads.lock()
    this.condition = this.lock.newCondition()
    this.all_loaded = false
    this.emptyList = true
    this.usedList = false
  }

  this.destory = function () {
    this.preloadingThread.interrupt()
    this.pregettingThread.interrupt()
    this.friends_list = null
  }


  this.preloadingThread = null
  this.pregettingThread = null


  this.preloading = function () {
    that = this
    this.preloadingThread = threads.start(function () {
      let threadName = '预加载线程'
      debugInfo(threadName + '启动' + that.all_loaded)
      while (that.all_loaded === false) {
        debugInfo(threadName + '进入循环体')
        try {

          if ((more = idMatches(".*J_rank_list_more.*").findOne(200)) != null) {
            let loadMoreContent = config.load_more_ui_content || '查看更多'
            let noMoreContent = config.no_more_ui_content || '没有更多了'
            if ((more.desc() && more.desc().match(noMoreContent)) || (more.text() && more.text().match(noMoreContent))) {
              debugInfo(threadName + '发现没有更多按钮，获取好友列表')
              debugInfo(threadName + '正获取好友list中')
              that.lock.lock()
              debugInfo(threadName + "获取锁")
              that.friends_list = WidgetUtils.getFriendList()
              that.all_loaded = true
              that.usedList = false
              debugInfo(threadName + "重新获取好友列表数据")
              sleep(100)
              that.condition.signal()
              debugInfo(threadName + '获取好友list完成')
              let listLength = whetherFriendListValidLength(that.friends_list)
              if (listLength) {
                // 动态修改预加载超时时间
                let dynamicTimeout = Math.ceil(listLength / 20) * 800
                config.timeoutLoadFriendList = dynamicTimeout
                let { storage_name } = require('../config.js')
                var configStorage = storages.create(storage_name)
                configStorage.put('timeoutLoadFriendList', dynamicTimeout)
                // let { config: anotherConfig } = require('../config.js')
                // debugInfo('another config\'s timeoutLoadFriendList:[' + anotherConfig.timeoutLoadFriendList + ']')
                debugInfo(threadName + '动态修改预加载超时时间为：' + dynamicTimeout + ' 设置完后缓存数据为：' + config.timeoutLoadFriendList)
              }
            } else if ((more.desc() && more.desc().match(loadMoreContent)) || (more.text() && more.text().match(loadMoreContent))) {

              debugInfo(threadName + '点击加载前等待锁')
              that.lock.lock()
              debugInfo(threadName + '点击加载前获得锁')
              debugInfo(threadName + '点击加载更多，热身中 速度较慢')
              more.click()
              that.condition.signal()
            } else {
              debugInfo(threadName + 'find target j_rank_list_more but desc/text is :' + more.desc() + ', ' + more.text())
            }
          }
          sleep(100)
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
      debugInfo('预获取线程启动' + that.all_loaded)
      while (that.all_loaded === false) {
        debugInfo('预获取线程进入循环体')
        try {

          debugInfo('预获取线程等待锁')
          that.lock.lock()
          debugInfo('预获取线程获取锁')
          while (!that.emptyList && !that.usedList) {
            debugInfo('预获取线程等待信号')
            that.condition.await()
            if (that.all_loaded === true) {
              // 在等待时列表可能已经获取完毕，直接退出
              break
            }
          }
          that.friends_list = WidgetUtils.getFriendList()
          let l = whetherFriendListValidLength(that.friends_list)
          let validChildList = null
          if (l) {
            validChildList = that.friends_list.children().filter((fri) => {
              return fri.childCount() >= 3
            })
          }
          while (!l || !validChildList || validChildList.length === 0) {
            warnInfo("首次获取列表数据不完整，再次获取")
            that.friends_list = WidgetUtils.getFriendList()
            l = whetherFriendListValidLength(that.friends_list)
            if (l) {
              validChildList = that.friends_list.children().filter((fri) => {
                return fri.childCount() >= 3
              })
            }
          }
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
   * 执行检索，失败返回true lostSomeOne 有收集遗漏，成功返回false
   */
  this.collecting = function () {
    let totalAnalyzeTime = 0
    let collectStart = new Date().getTime()
    let lastCheckFriend = -1
    let checkedList = []
    let totalValidLength = 0
    let QUEUE_SIZE = 2
    let queue = commonFunctions.createQueue(QUEUE_SIZE)
    let countingDownContainers = []
    let iterStart = -1
    let iterEnd = -1
    let errorCount = 0
    do {
      try {
        iterEnd = -1
        iterStart = lastCheckFriend
        WidgetUtils.waitRankListStable()

        let findStart = new Date().getTime()

        debugInfo('主流程等待锁')
        this.lock.lock()
        debugInfo('主流程获取锁')
        while (this.emptyList === true) {
          debugInfo('主流程等待信号')
          this.condition.await()
        }
        // 获取截图 用于判断是否可收取
        let screen = null
        commonFunctions.waitFor(function () {
          screen = captureScreen()
        }, 500)
        if (!screen) {
          errorCount++
          if (errorCount >= 5) {
            errorInfo('获取截图失败多次, 可能已经没有了截图权限，重新执行脚本')
            commonFunctions.setUpAutoStart(0.02)
            exit()
          }
          warnInfo('获取截图失败 再试一次')
          continue
        }

        if (this.friends_list && this.friends_list.children) {
          friendListLength = this.friends_list.children().length
          debugInfo(
            '读取好友列表完成，开始检查可收取列表 列表长度:' + friendListLength
          )
          let validChildList = this.friends_list.children().filter((fri) => {
            return fri.childCount() >= 3
          })
          debugInfo('有效好友列表长度' + validChildList.length)
          totalValidLength = validChildList.length
          for (let idx = 0; idx < totalValidLength; idx++) {
            let fri = validChildList[idx]
            if (idx < iterStart || (iterEnd !== -1 && idx > iterEnd)) {
              continue
            }
            debugInfo('校验' + idx + "开始")
            if (fri.visibleToUser()) {
              let bounds = fri.bounds()
              let fh = bounds.bottom - bounds.top
              if (fh > 10) {
                debugInfo('识别好友信息， ' + idx)
                let container = isObtainable(fri, screen)
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
                lastCheckFriend = idx
                checkedList.push(idx)
              } else {
                debugInfo(['好友[{}]信息不可见，控件高度[{}]低于10', idx, fh])
                iterEnd = idx
              }
            } else {
              debugInfo(['好友[{}]信息不可见', idx])
              iterEnd = idx
            }
          }
          debugInfo(
            ['可收取列表获取完成 校验数量[{}]，开始收集 待收取列表长度:[{}]', lastCheckFriend, _avil_list.length]
          )
          let findEnd = new Date().getTime()
          let currentAnalyzeCost = findEnd - findStart
          totalAnalyzeTime += currentAnalyzeCost
          debugInfo(['检测好友列表可收取情况耗时：[{}]ms ', currentAnalyzeCost])
        } else {
          logInfo('好友列表不存在')
        }
        if (!WidgetUtils.friendListWaiting()) {
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

        // -------收集好友列表完成-------
        automator.scrollDown()
        debugInfo(['add [{}] into queue, distinct size:[{}]', lastCheckFriend, commonFunctions.getQueueDistinctSize(queue)])
        commonFunctions.pushQueue(queue, QUEUE_SIZE, lastCheckFriend)
        // 当剩余未检测数量小于等于20时，通知重新获取列表数据
        if (lastCheckFriend >= totalValidLength - 20) {
          this.usedList = true
          this.condition.signal()
        }
      } catch (e) {
        errorInfo('主流程出错' + e)
      } finally {
        debugInfo('主流程释放锁')
        this.lock.unlock()
      }
    } while (
      (lastCheckFriend < totalValidLength || this.all_loaded === false) && commonFunctions.getQueueDistinctSize(queue) > 1
    )


    debugInfo(['校验收尾'])
    if (_avil_list.length > 0) {
      debugInfo(['有未收集的可收取能量'])
      if (false == collectAvailableList()) {
        errorInfo('流程出错 向上抛出')
        return true
      }
    } else {
      debugInfo('无好友可收集能量')
    }

    _lost_some_one = checkIsEveryFriendChecked(checkedList, totalValidLength)
    checkRunningCountdown(countingDownContainers)
    commonFunctions.addClosePlacehold(">>>><<<<")
    debugInfo([
      '全部收集完成, last:[{}] length:[{}] queueSize:[{}]',
      lastCheckFriend, totalValidLength, commonFunctions.getQueueDistinctSize(queue)
    ])
    logInfo([
      '全部好友收集完成, 总分析耗时：[{}]ms 总收集耗时：[{}]ms',
      totalAnalyzeTime, (new Date().getTime() - collectStart)
    ])
    if (_lost_some_one) {
      clearLogFile()
    }
    return _lost_some_one
  }

  this.start = function () {
    this.preloading()
    this.pregetting()
    return this.collecting()
  }
}

module.exports = {
  FriendListScanner: FriendListScanner
}