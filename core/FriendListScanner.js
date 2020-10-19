/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-11 09:17:29
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-10-09 16:36:37
 * @Description: 基于控件识别可收取信息
 */
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _widgetUtils = singletonRequire('WidgetUtils')
let _runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')
let FileUtils = singletonRequire('FileUtils')

let BaseScanner = require('./BaseScanner.js')

const FriendListScanner = function () {
  BaseScanner.call(this)
  this.lock = null
  this.condition = null

  this.friends_list_parent = null
  this.valid_child_list = null
  this.all_loaded = false
  this.emptyList = true
  this.usedList = false
  this.avil_list = []

  this.errorCount = 0

  this.init = function (option) {
    this.current_time = option.currentTime || 0
    this.increased_energy = option.increasedEnergy || 0
    this.errorCount = 0
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
    this.baseDestory()
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
            try {
              that.lock.lock()
              debugInfo(threadName + "获取锁")
              that.friends_list_parent = _widgetUtils.getFriendListParent()
              that.valid_child_list = that.getValidChildList(that.friends_list_parent)
              that.all_loaded = true
              that.usedList = false
              debugInfo(threadName + "重新获取好友列表数据")
              sleep(100)
              that.condition.signal()
              debugInfo(threadName + '获取好友list完成')
              let listLength = that.whetherFriendListValidLength(that.friends_list_parent)
              if (listLength) {
                // 动态修改预加载超时时间
                let dynamicTimeout = Math.ceil(listLength / 20) * 800
                _config.timeoutLoadFriendList = dynamicTimeout
                var configStorage = storages.create(_storage_name)
                configStorage.put('timeoutLoadFriendList', dynamicTimeout)
                // let { config: anotherConfig } = require('../config.js')
                // debugInfo('another config\'s timeoutLoadFriendList:[' + anotherConfig.timeoutLoadFriendList + ']')
                debugInfo(threadName + '动态修改预加载超时时间为：' + dynamicTimeout + ' 设置完后缓存数据为：' + _config.timeoutLoadFriendList)
              }
            } finally {
              try {
                that.lock.unlock()
                debugInfo(threadName + "释放锁")
              } catch (e) {
                //_commonFunctions.printExceptionStack(e)
              }
            }
          }
        } catch (e) {
          errorInfo('预载入异常' + e)
          _commonFunctions.printExceptionStack(e)
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
          let l = that.whetherFriendListValidLength(that.friends_list_parent)
          let validChildList = null
          if (l) {
            validChildList = that.simpleCheckValidList(that.friends_list_parent)
          }
          let maxRepeatGet = 5
          while (!l || !validChildList || validChildList.length === 0) {
            if (maxRepeatGet-- <= 0) {
              if (!_widgetUtils.friendListWaiting()) {
                errorInfo('预获取线程尝试次数过多，且页面所在位置不正确，重新执行脚本')
                _runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
                _commonFunctions.getAndUpdateDismissReason('get-friend-list-failed')
                exit()
              }
            }
            warnInfo("首次获取列表数据不完整，再次获取")
            debugInfo('好友列表总长度：' + l + " 有效长度：" + (validChildList ? validChildList.length : '0'))
            sleep(400)
            that.friends_list_parent = _widgetUtils.getFriendListParent()
            l = that.whetherFriendListValidLength(that.friends_list_parent)
            if (l) {
              validChildList = that.simpleCheckValidList(that.friends_list_parent)
            }
          }
          that.valid_child_list = that.getValidChildList(that.friends_list_parent)
          debugInfo(['预获取线程中获取到好友列表，长度：{}', that.valid_child_list.length])
          that.emptyList = false
          that.usedList = false
          that.condition.signal()
          sleep(100)
        } catch (e) {
          errorInfo('预获取异常' + e)
          _commonFunctions.printExceptionStack(e)
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
    let screen = null
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
        screen = _commonFunctions.checkCaptureScreenPermission(5)
        if (this.friends_list_parent && this.friends_list_parent.children) {
          friendListLength = this.friends_list_parent.children().length
          debugInfo(
            '读取好友列表完成，开始检查可收取列表 列表长度:' + friendListLength
          )
          let validChildList = this.getValidChildList(this.friends_list_parent)
          let firstIdx = this.getFirstVisiable(validChildList)
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
            if (iterEnd !== -1 && idx > iterEnd) {
              continue
            }
            debugInfo('校验' + idx + "开始")
            if (fri.visibleToUser()) {
              let bounds = fri.bounds()
              let fh = bounds.bottom - bounds.top
              if (fh > 10) {
                if (checkedList.indexOf(idx) > -1) {
                  debugInfo(['当前可见好友信息已经判断过，直接跳过 idx:{} name: {} 开始识别下一个', idx, friendName])
                } else {
                  debugInfo(['识别好友信息 idx:{} name: {}', idx, friendName])
                  let container = this.isObtainable(fri, screen, friendName)
                  if (container.canDo) {
                    container.bounds = bounds
                    let pushed = this.recordAvailableList(container)
                    debugInfo([
                      '可收取 fh[{}] index:[{}] name:[{}]{}', fh, idx, container.name, pushed ? '' : ' 但是在白名单中，不收取TA'
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
                }
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
            this.errorCount = 0
          }

          if (stock_count > 2) {
            if (firstIdx === -1) {
              errorInfo(['在控件位置：{} 卡住多次, 且首个可见item获取失败，请尝试重启脚本', stock_idx], true)
              this.errorCount++
            } else {
              debugInfo(['在控件位置：{} 卡住多次，上划 首个可见item:{}', stock_idx, firstIdx])
            }
            stock_count = 0
            scrollUp()
            continue
          }
          debugInfo(
            ['可收取列表获取完成 校验数量[{}]，开始收集 待收取列表长度:[{}]', lastCheckedFriend + 1, this.avil_list.length]
          )
          let findEnd = new Date().getTime()
          let currentAnalyzeCost = findEnd - findStart
          totalAnalyzeTime += currentAnalyzeCost
          debugInfo(['检测好友列表可收取情况耗时：[{}]ms ', currentAnalyzeCost])
        } else {
          logInfo('好友列表不存在')
        }
        let failed = false
        if (this.errorCount >= 5) {
          errorInfo('列表识别失败达到5次 重新开始')
          failed = true
        }
        if (!_widgetUtils.friendListWaiting()) {
          errorInfo('崩了 当前不在好友列表 重新开始')
          failed = true
        }
        if (this.avil_list.length > 0) {
          if (false == this.collectAvailableList()) {
            errorInfo('流程出错 向上抛出')
            failed = true
          }
        } else {
          debugInfo('无好友可收集能量')
        }
        if (failed) {
          return true
        }
        // 重置为空列表
        this.avil_list = []

        let canScrollDown = true
        if ((lastCheckedFriend >= totalValidLength - 1 || _commonFunctions.getQueueDistinctSize(distinctQueue) <= 3) && this.all_loaded === false) {
          canScrollDown = false
          this.usedList = true
          this.condition.signal()
          let newValidList = null
          let tryReloadCount = 0
          do {
            if (newValidList !== null) {
              debugInfo('获取到的长度无变化，上下滑动触发加载')
              tryReloadCount++
              if (tryReloadCount === 3) {
                // 尝试重新出发加载达到三次，上划一页
                scrollUp()
              } else if (tryReloadCount >= 5) {
                // 多次出发失败，直接返回重新开始
                errorInfo('触发加载失败，重新开始')
                return true
              }
              automator.scrollUpAndDown()
              this.usedList = true
            }
            // 主流程等待
            debugInfo(['主流程等待预获取线程获取好友列表数据'])
            this.condition.await()
            newValidList = this.valid_child_list || []
            debugInfo(['主流程收到预获取线程获取好友列表数据的通知 已校验的长度：{} 新获取的长度：{}', totalValidLength, newValidList.length])

          } while (!this.usedList && newValidList && newValidList.length === totalValidLength && this.all_loaded === false)
          debugInfo(['主流程最终收到好友列表 已校验的长度：{} 新获取的长度：{} loadStatus:{}', totalValidLength, newValidList.length, this.all_loaded])
        }

        if (canScrollDown) {
          debugInfo('滑动进入下一页')
          automator.scrollDown()
        }
      } catch (e) {
        errorInfo('主流程出错' + e)
        _commonFunctions.printExceptionStack(e)
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
    if (this.avil_list.length > 0) {
      debugInfo(['有未收集的可收取能量'])
      if (false == this.collectAvailableList()) {
        errorInfo('流程出错 向上抛出')
        return true
      }
    } else {
      debugInfo('无好友可收集能量')
    }

    if (this.checkIsEveryFriendChecked(checkedList, totalValidLength)) {
      that.recordLost('有好友信息未校验')
    }

    this.checkRunningCountdown(countingDownContainers)
    _commonFunctions.addClosePlacehold(">>>><<<<")
    debugInfo([
      '全部收集完成, last:[{}] length:[{}]',
      lastCheckedFriend, totalValidLength
    ])
    logInfo([
      '全部好友收集完成, 总分析耗时：[{}]ms 总收集耗时：[{}]ms',
      totalAnalyzeTime, (new Date().getTime() - collectStart)
    ])
    if (this.lost_someone) {
      clearLogFile()
    }
    return this.getCollectResult()
  }

  this.start = function () {
    this.min_countdown = 10000
    this.preloading()
    this.pregetting()
    return this.collecting()
  }

}

FriendListScanner.prototype = Object.create(BaseScanner.prototype)
FriendListScanner.prototype.constructor = FriendListScanner

FriendListScanner.prototype.whetherFriendListValidLength = function (friends_list_parent) {
  return (friends_list_parent && friends_list_parent.children()) ? friends_list_parent.children().length : undefined
}

FriendListScanner.prototype.collectTargetFriend = function (obj) {
  if (!obj.protect) {
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
    if (!obj.recheck) {
      this.protectInfoDetect(obj.name)
    } else {
      this.isProtectDetectDone = true
      this.isProtected = false
    }
    return this.doCollectTargetFriend(obj)
  }
  return true
}

// 根据可收取列表收取好友
FriendListScanner.prototype.collectAvailableList = function () {
  while (this.avil_list.length) {
    if (false === this.collectTargetFriend(this.avil_list.shift())) {
      warnInfo('收取目标好友失败，向上抛出')
      return false
    }
  }
}

FriendListScanner.prototype.cutAndSaveImage = function (screen, countdownInfo) {
  threads.start(function () {
    try {
      let cutImg = images.clip(screen, countdownInfo.x, countdownInfo.y, countdownInfo.w, countdownInfo.h)
      let path = FileUtils.getCurrentWorkPath() + "/countdownImgs"
      let saveImgPath = _commonFunctions.formatString('{}/{}_{}_{}.png', path, countdownInfo.name, countdownInfo.countdown, countdownInfo.y)
      files.ensureDir(saveImgPath)
      images.save(cutImg, saveImgPath)
      infoLog(['保存倒计时图片：{}', saveImgPath])
    } catch (e) {
      errorInfo('截取图片失败' + e)
      _commonFunctions.printExceptionStack(e)
    }
  })
}

/**
 * 判断是否可收取
 * @param {Object} obj 好友控件对象
 * @param {Object} screen 截图
 * @param {string} name 好友名称
 */
FriendListScanner.prototype.isObtainable = function (obj, screen, name) {
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
        this.cutAndSaveImage(screen, countdownInfo)
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
      _commonFunctions.printExceptionStack(e)
    }
  }
  return container
}

/**
 * 记录好友信息
 * @param {Object} container 
 */
FriendListScanner.prototype.recordAvailableList = function (container) {
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
    this.avil_list.push(temp)
    return true
  }
  return false
}


FriendListScanner.prototype.checkIsEveryFriendChecked = function (checkedList, totalValidLength) {
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

FriendListScanner.prototype.checkRunningCountdown = function (countingDownContainers) {
  if (!_config.is_cycle && countingDownContainers.length > 0) {
    debugInfo(['倒计时中的好友数[{}]', countingDownContainers.length])
    let that = this
    countingDownContainers.forEach((item, idx) => {
      let now = new Date()
      let stamp = item.countdown.stamp
      let count = item.countdown.count
      let passed = Math.round((now - stamp) / 60000.0)
      debugInfo([
        '[{}] 需要计时[{}]分 经过了[{}]分 计时时间戳[{}]',
        item.name, count, passed, stamp
      ])
      if (passed >= count) {
        debugInfo('[' + item.name + ']倒计时结束')
        // 标记有倒计时结束的漏收了，收集完之后进行第二次收集
        that.recordLost('有倒计时结束')
      } else {
        let rest = count - passed
        that.min_countdown = rest < that.min_countdown ? rest : that.min_countdown
      }
    })
  }
}

FriendListScanner.prototype.getFirstVisiable = function (friendList) {
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

FriendListScanner.prototype.simpleCheckValidList = function (friends_list_parent) {
  if (friends_list_parent) {
    return friends_list_parent.children().filter((fri) => {
      return fri && fri.childCount() >= 4
    })
  }
}

FriendListScanner.prototype.getValidChildList = function (friends_list_parent) {
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


module.exports = FriendListScanner