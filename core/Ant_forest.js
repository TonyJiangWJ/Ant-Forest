/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-04-01 14:15:55
 * @Description: 蚂蚁森林操作集
 */
let { WidgetUtils } = require('../lib/WidgetUtils.js')
let { unlocker } = require('../lib/Unlock.js')
let { automator } = require('../lib/Automator.js')
let { commonFunctions } = require('../lib/CommonFunction.js')
let { config } = require('../config.js')

function Ant_forest() {
  const _package_name = 'com.eg.android.AlipayGphone'

  let _pre_energy = 0, // 记录收取前能量值
    _post_energy = 0, // 记录收取后能量值
    _timestamp = 0, // 记录获取自身能量倒计时
    _min_countdown = 0, // 最小可收取倒计时
    _current_time = 0, // 当前收集次数
    _fisrt_running = true, // 是否第一次进入蚂蚁森林
    _has_next = true, // 是否下一次运行
    _avil_list = [], // 可收取好友列表
    _collect_any = false, // 收集过能量
    reTry = 0
  /***********************
   * 综合操作
   ***********************/

  // 进入蚂蚁森林主页
  const startApp = function () {
    commonFunctions.log('启动支付宝应用')
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=60000002',
      packageName: _package_name
    })
  }

  /**
   * 关闭活动弹窗
   */
  const clearPopup = function () {
    // 合种/添加快捷方式提醒
    threads.start(function () {
      let floty = idEndsWith('J_pop_treedialog_close').findOne(
        config.timeout_findOne
      )
      if (floty) {
        floty.click()
      }
    })
    threads.start(function () {

      let buttons = className('android.widget.Button')
        .desc('关闭').findOne(
          config.timeout_findOne
        )
      if (buttons) {
        buttons.click()
      }
    })
    threads.start(function () {
      let floty = descEndsWith('关闭蒙层').findOne(config.timeout_findOne)
      if (floty) {
        floty.click()
      }
      floty = textEndsWith('关闭蒙层').findOne(config.timeout_findOne)
      if (floty) {
        floty.click()
      }
    })
    commonFunctions.debug('关闭蒙层成功')
  }

  // 显示文字悬浮窗
  const showFloaty = function (text) {
    commonFunctions.closeFloatyWindow()
    let window = floaty.window(
      <card cardBackgroundColor="#aa000000" cardCornerRadius="20dp">
        <horizontal w="250" h="40" paddingLeft="15" gravity="center">
          <text
            id="log"
            w="180"
            h="30"
            textSize="12dp"
            textColor="#ffffff"
            layout_gravity="center"
            gravity="left|center"
          />
          <card
            id="stop"
            w="30"
            h="30"
            cardBackgroundColor="#fafafa"
            cardCornerRadius="15dp"
            layout_gravity="right|center"
            paddingRight="-15"
          >
            <text
              w="30"
              h="30"
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
    window.stop.on('click', () => {
      exit()
    })
    commonFunctions.log(text)
    ui.run(function () {
      window.log.text(text)
    })
    // 30秒后关闭，防止立即停止
    setTimeout(() => { exit() }, 1000 * 30)
  }

  /***********************
   * 构建下次运行
   ***********************/

  // 异步获取 toast 内容
  const getToastAsync = function (filter, limit, exec) {
    filter = typeof filter == null ? '' : filter
    let lock = threads.lock()
    let complete = lock.newCondition()
    let result = []
    lock.lock()

    // 在新线程中开启监听
    let thread = threads.start(function () {
      try {
        lock.lock()
        let temp = []
        let counter = 0
        let toastDone = false
        let startTimestamp = new Date().getTime()
        // 监控 toast
        events.onToast(function (toast) {
          if (
            toast &&
            toast.getPackageName() &&
            toast.getPackageName().indexOf(filter) >= 0
          ) {
            counter++
            temp.push(toast.getText())
            if (counter == limit) {
              commonFunctions.log('正常获取toast信息' + temp)
              toastDone = true
            } else if (new Date().getTime() - startTimestamp > 10000) {
              commonFunctions.log('等待超过十秒秒钟，直接返回结果')
              toastDone = true
            }
          } else {
            commonFunctions.log('无法获取toast内容，直接返回[]')
            toastDone = true
          }
        })
        // 触发 toast
        exec()
        let count = 10
        while (count-- > 0 && !toastDone) {
          sleep(1000)
        }
        if (!toastDone) {
          commonFunctions.debug('超时释放锁')
        } else {
          commonFunctions.debug('temp' + temp)
          result = temp
        }
      } finally {
        complete.signal()
        lock.unlock()
      }
    })
    // 获取结果
    commonFunctions.debug('阻塞等待toast结果')
    complete.await()
    commonFunctions.debug('阻塞等待结束，等待锁释放')
    lock.unlock()
    commonFunctions.debug('获取toast结果成功：' + result)
    thread.interrupt()
    return result
  }

  // 获取自己的能量球中可收取倒计时的最小值
  const getMinCountdownOwn = function () {
    let target
    if (className('Button').descMatches(/\s/).exists()) {
      target = className('Button')
        .descMatches(/\s/)
        .filter(function (obj) {
          return obj.bounds().height() / obj.bounds().width() > 1.05
        })
    } else if (className('Button').textMatches(/\s/).exists()) {
      target = className('Button')
        .textMatches(/\s/)
        .filter(function (obj) {
          return obj.bounds().height() / obj.bounds().width() > 1.05
        })
    }
    if (target && target.exists()) {
      let ball = target.untilFind()
      let temp = []
      commonFunctions.debug('待收取球数' + ball.length)
      let toasts = getToastAsync(_package_name, ball.length, function () {
        ball.forEach(function (obj) {
          automator.clickCenter(obj)
          sleep(500)
        })
      })
      toasts.forEach(function (toast) {
        let countdown = toast.match(/\d+/g)
        if (countdown !== null && countdown.length >= 2) {
          temp.push(countdown[0] * 60 - -countdown[1])
        } else {
          commonFunctions.debug('获取倒计时错误：' + countdown)
        }
      })
      _min_countdown = Math.min.apply(null, temp)
      _timestamp = new Date()
    } else {
      _min_countdown = null
      commonFunctions.log('无可收取能量')
    }
  }

  // 确定下一次收取倒计时
  const getMinCountdown = function () {
    let countDownNow = calculateMinCountdown()
    // 如果有收集过能量，那么先返回主页在进入排行榜，以获取最新的倒计时信息，避免收集过的倒计时信息不刷新，此过程可能导致执行过慢
    if (_collect_any) {
      if (!countDownNow || countDownNow >= 2) {
        commonFunctions.debug('收集过能量，重新获取倒计时列表')
        automator.clickBack()
        WidgetUtils.homePageWaiting()
        automator.enterFriendList()
        WidgetUtils.friendListWaiting()
        WidgetUtils.loadFriendList()
        // 再次获取倒计时数据
        countDownNow = calculateMinCountdown()
      } else {
        commonFunctions.debug('当前倒计时时间短，无需再次获取')
      }
    } else {
      commonFunctions.debug('未收集能量直接获取倒计时列表')
    }
    _min_countdown = countDownNow
  }

  const calculateMinCountdown = function () {
    let temp = []
    if (_min_countdown && _timestamp instanceof Date) {
      commonFunctions.debug('已记录自身倒计时：' + countdown_own + '分')
      let passedTime = Math.round((new Date() - _timestamp) / 60000)
      let countdown_own = _min_countdown - passedTime
      commonFunctions.debug('本次收集经过了：' + passedTime + '分，最终记录自身倒计时：' + countdown_own + '分')
      countdown_own >= 0 ? temp.push(countdown_own) : temp.push(0)
    }
    let friCountDowmContainer = WidgetUtils.widgetGetAll('\\d+’', null, true)
    if (friCountDowmContainer) {
      let isDesc = friCountDowmContainer.isDesc
      friCountDowmContainer.target.forEach(function (countdown) {
        let countdown_fri = null
        if (isDesc) {
          countdown_fri = parseInt(countdown.desc().match(/\d+/))
        } else if (countdown.text()) {
          countdown_fri = parseInt(countdown.text().match(/\d+/))
        }
        if (countdown_fri) {
          temp.push(countdown_fri)
        }
      })
    }
    if (temp.length === 0) {
      return
    }
    return Math.min.apply(null, temp)
  }


  // 构建下一次运行
  const generateNext = function () {
    // 循环模式，判断循环次数
    if (config.is_cycle) {
      if (_current_time < config.cycle_times) {
        _has_next = true
      } else {
        _has_next = false
      }
    } else {
      // 永不终止模式，判断倒计时不存在，直接等待配置的激活时间
      if (config.never_stop) {
        if (commonFunctions.isEmpty(_min_countdown) || _min_countdown > config.reactive_time) {
          _min_countdown = config.reactive_time || 60
        }
        _has_next = true
        return
      }
      // 计时模式 超过最大循环次数 退出执行
      if (_current_time > config.max_collect_repeat) {
        _has_next = false
        return
      }
      // 计时模式，超过最大等待时间 退出执行
      if (
        _min_countdown != null &&
        _min_countdown <= config.max_collect_wait_time
      ) {
        _has_next = true
      } else {
        _has_next = false
      }
    }
  }

  /***********************
   * 记录能量
   ***********************/

  // 记录当前能量
  const getCurrentEnergy = function () {
    let currentEnergyWidgetContainer = WidgetUtils.widgetGetOne('\\d+g', null, true)
    let currentEnergy = undefined
    if (currentEnergyWidgetContainer) {
      let target = currentEnergyWidgetContainer.target
      let isDesc = currentEnergyWidgetContainer.isDesc
      if (isDesc) {
        currentEnergy = parseInt(target.desc().match(/\d+/))
      } else {
        currentEnergy = parseInt(target.text().match(/\d+/))
      }
    }
    if (currentEnergy) {
      // 存储能量值数据
      commonFunctions.storeEnergy(currentEnergy)
    }
    return currentEnergy
  }

  // 记录初始能量值
  const getPreEnergy = function () {
    let currentEnergy = getCurrentEnergy()
    if (_fisrt_running && _has_next) {
      _pre_energy = currentEnergy
      commonFunctions.persistHistoryEnergy(currentEnergy)
      commonFunctions.log('当前能量：' + currentEnergy)
    } else {
      let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
      let runTimes = commonFunctions.getTodaysRuntimeStorage('runTimes')
      let sum = currentEnergy - energyInfo.startEnergy
      let content = '第 ' + runTimes.runTimes + ' 次运行, 累计收集:' + sum + 'g'
      commonFunctions.log(content)
      commonFunctions.showTextFloaty(content)
    }
  }

  // 记录最终能量值
  const getPostEnergy = function () {
    automator.clickBack()
    WidgetUtils.homePageWaiting()
    _post_energy = getCurrentEnergy()
    commonFunctions.log('当前能量：' + _post_energy)
    commonFunctions.showEnergyInfo()
    let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
    if (!_fisrt_running && !_has_next) {
      showFloaty('本次共收取：' + (_post_energy - _pre_energy) + 'g 能量，累积共收取' + (_post_energy - energyInfo.startEnergy) + 'g')
    }
    automator.clickClose()
    home()
  }

  /***********************
   * 收取能量
   ***********************/

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
        commonFunctions.debug('获取能量球desc数据')
        execResult = regexCheck.exec(energy_ball.desc())
      } else {
        commonFunctions.debug('获取能量球text数据')
        execResult = regexCheck.exec(energy_ball.text())
      }
      if (execResult.length > 1 && parseInt(execResult[1]) <= 5) {
        commonFunctions.debug(
          '能量小于等于五克跳过收取 ' + isDesc ? energy_ball.desc() : energy_ball.text()
        )
        return
      }
    }
    commonFunctions.debug(isDesc ? energy_ball.desc() : energy_ball.text())
    automator.clickCenter(energy_ball)
    if (!isOwn) {
      _collect_any = true
    }
    sleep(300)
  }

  // 收取能量
  const collectEnergy = function (own) {
    let isOwn = own || false
    let ballCheckContainer = WidgetUtils.widgetGetAll(/.*克/, null, true)
    if (ballCheckContainer !== null) {
      commonFunctions.debug('能量球存在')
      ballCheckContainer.target
        .forEach(function (energy_ball) {
          collectBallEnergy(energy_ball, isOwn, ballCheckContainer.isDesc)
        })
    } else {
      commonFunctions.debug('无能量球可收取')
    }
  }

  // 收取能量同时帮好友收取
  const collectAndHelp = function () {
    let screen = captureScreen()
    // 收取好友能量
    collectEnergy()
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
      energyBalls.forEach(function (energy_ball) {
        let bounds = energy_ball.bounds()
        let o_x = bounds.left,
          o_y = bounds.top,
          o_w = bounds.width(),
          o_h = bounds.height(),
          threshold = config.color_offset
        if (
          images.findColor(screen, '#f99236', {
            region: [o_x, o_y, o_w, o_h],
            threshold: threshold
          }) ||
          images.findColor(screen, '#f7af70', {
            region: [o_x, o_y, o_w, o_h],
            threshold: threshold
          })
        ) {
          automator.clickCenter(energy_ball)
          helped = true
          _collect_any = true
          sleep(200)
        }
      })
      // 当数量大于等于6且帮助收取后，重新进入
      if (helped && length >= 6) {
        return true
      }
    }
  }

  // 判断并记录保护罩
  const recordProtected = function (toast) {
    if (toast.indexOf('能量罩') > 0) {
      let title = textContains('的蚂蚁森林')
        .findOne(config.timeout_findOne)
        .text()
      commonFunctions.addNameToProtect(title.substring(0, title.indexOf('的')))
    }
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

  const collectTargetFriend = function (obj) {
    if (obj.isHelp) {
      commonFunctions.log('帮助好友' + obj.name)
    } else {
      commonFunctions.log('收集好友' + obj.name)
    }
    let rentery = false
    if (!obj.protect) {
      let temp = protectDetect(_package_name)
      //automator.click(obj.target.centerX(), obj.target.centerY())
      commonFunctions.debug('等待进入好友主页：' + obj.name)
      let restartLoop = false
      let count = 1
      automator.click(obj.target.centerX(), obj.target.centerY())
      ///sleep(1000)
      while (!WidgetUtils.friendHomeWaiting()) {
        commonFunctions.debug(
          '未能进入主页，尝试再次进入 count:' + count++
        )
        automator.click(obj.target.centerX(), obj.target.centerY())
        sleep(1000)
        if (count > 5) {
          commonFunctions.log('重试超过5次，取消操作')
          restartLoop = true
          break
        }
      }
      if (restartLoop) {
        commonFunctions.log('页面流程出错，重新开始')
        return false
      }
      commonFunctions.debug('准备开始收取')
      if (config.help_friend) {
        rentery = collectAndHelp()
      } else {
        collectEnergy()
      }
      automator.back()
      temp.interrupt()
      commonFunctions.debug('好友能量收取完毕, 回到好友排行榜')
      let returnCount = 0
      while (!WidgetUtils.friendListWaiting()) {
        sleep(1000)
        if (returnCount++ === 2) {
          // 等待两秒后再次触发
          automator.back()
        }
        if (returnCount > 5) {
          commonFunctions.log('返回好友排行榜失败，重新开始')
          return false
        }
      }
      if (rentery) {
        obj.isHelp = false
        collectTargetFriend(obj)
      }
    }
  }

  // 根据可收取列表收取好友
  const collectAvailableList = function () {
    while (_avil_list.length) {
      collectTargetFriend(_avil_list.shift())
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
    let o_x = obj.child(len - 3).bounds().right,
      o_y = obj.bounds().top,
      o_w = 5,
      o_h = obj.bounds().height() - 10,
      threshold = config.color_offset
    if (o_h > 0 && !obj.child(len - 2).childCount()) {
      if (
        // 是否可收取
        images.findColor(screen, '#1da06a', {
          region: [o_x, o_y, o_w, o_h],
          threshold: threshold
        })
      ) {
        container.canDo = true
        return container
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
        return container
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

  // 识别可收取好友并记录
  const findAndCollect = function () {
    let lastCheckFriend = -1
    let friendListLength = -2
    commonFunctions.debug('加载好友列表')
    WidgetUtils.loadFriendList()
    do {
      // todo 等待列表稳定
      sleep(100)
      let screen = captureScreen()
      sleep(100)
      commonFunctions.debug('获取好友列表')
      let friends_list = WidgetUtils.getFriendList()
      commonFunctions.debug('判断好友信息')
      if (friends_list && friends_list.children) {
        friendListLength = friends_list.children().length
        commonFunctions.debug(
          '读取好友列表完成，开始检查可收取列表 列表长度:' + friendListLength
        )
        friends_list.children().forEach(function (fri, idx) {
          if (fri.visibleToUser()) {
            if (fri.childCount() >= 3) {
              let bounds = fri.bounds()
              let fh = bounds.bottom - bounds.top
              if (fh > 10) {
                let container = isObtainable(fri, screen)
                if (container.canDo) {
                  container.bounds = bounds
                  recordAvailableList(container)
                  commonFunctions.debug('可收取 index:' + idx + ' name:' + container.name)
                } else {
                  commonFunctions.debug('不可收取 index:' + idx + ' name:' + container.name)
                }
                // 记录最后一个校验的下标索引, 也就是最后出现在视野中的
                lastCheckFriend = idx + 1
              } else {
                // commonFunctions.debug('不在视野范围'+ idx + ' name:' + WidgetUtils.getFriendsName(fri))
              }
            } else {
              commonFunctions.debug('不符合好友列表条件 childCount:' + fri.childCount() + ' index:' + idx)
            }
          }
        })
        commonFunctions.debug(
          '可收取列表获取完成 校验数量' + lastCheckFriend + '，开始收集 待收取列表长度:' + _avil_list.length
        )
        if (false == collectAvailableList()) {
          commonFunctions.log('流程出错 向上抛出')
          return false
        }
      } else {
        commonFunctions.log('好友列表不存在')
      }
      if (!WidgetUtils.friendListWaiting()) {
        commonFunctions.log('崩了崩了 重新开始')
        return false
      }
      // 重置为空列表
      _avil_list = []
      commonFunctions.debug('收集完成 last:' + lastCheckFriend + '，下滑进入下一页')
      automator.scrollDown(200)
      commonFunctions.debug('进入下一页')
    } while (
      lastCheckFriend < friendListLength
    )
    commonFunctions.log('全部好友收集完成, last:' + lastCheckFriend + ' length:' + friendListLength)
  }

  /***********************
   * 主要函数
   ***********************/

  // 收取自己的能量
  const collectOwn = function () {
    commonFunctions.log('开始收集自己能量')
    let restartCount = 0
    let waitFlag
    startApp()
    // 首次启动等待久一点
    sleep(1500)
    while (!(waitFlag = WidgetUtils.homePageWaiting()) && restartCount++ < 5) {
      commonFunctions.log('程序未启动，尝试再次唤醒')
      automator.clickClose()
      commonFunctions.debug('关闭H5')
      sleep(1500)
      // 解锁并启动
      unlocker.exec()
      startApp()
    }
    if (!waitFlag && restartCount >= 5) {
      commonFunctions.log('退出脚本')
      engines.myEngine().forceStop();
    }
    commonFunctions.log('进入个人首页成功')
    clearPopup()
    getPreEnergy()
    commonFunctions.debug('准备收集自己能量')
    collectEnergy(true)
    commonFunctions.debug('准备计算最短时间')
    getMinCountdownOwn()
    _fisrt_running = false
  }

  // 收取好友的能量
  const collectFriend = function () {
    commonFunctions.log('开始收集好友能量')
    automator.enterFriendList()
    let enterFlag = WidgetUtils.friendListWaiting()
    if (!enterFlag) {
      return false
    }
    if (false == findAndCollect()) {
      _min_countdown = 0
      _has_next = true
      _current_time = _current_time == 0 ? 0 : _current_time - 1
      commonFunctions.log('重新开始')
      reTry++
      return false
    }
    getMinCountdown()
    generateNext()
    getPostEnergy()
  }


  return {
    exec: function () {
      let thread = threads.start(function () {
        events.setMaxListeners(0)
        events.observeToast()
      })
      try {
        while (true) {
          _collect_any = false
          commonFunctions.commonDelay(_min_countdown)
          commonFunctions.showEnergyInfo()
          let currentTime = commonFunctions.increaseRunTimes()
          let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
          commonFunctions.showTextFloaty('第 ' + currentTime + ' 次运行, 累计已收集' + energyInfo.totalIncrease + 'g')
          _current_time++
          unlocker.exec()
          try {
            _avil_list = []
            collectOwn()
            collectFriend()
          } catch (e) {
            commonFunctions.log('发生异常 [' + e + '] [' + e.message + ']')
            _current_time = _current_time == 0 ? 0 : _current_time - 1
            _min_countdown = 0
            _has_next = true
            reTry = 0
          }
          if (config.auto_lock === true && unlocker.needRelock() === true) {
            commonFunctions.debug('重新锁定屏幕')
            automator.lockScreen()
          }
          events.removeAllListeners()
          if (_has_next === false || reTry > 5) {
            commonFunctions.log('收取结束')
            break
          }
        }
      } catch (e) {
        commonFunctions.log('发生异常，终止程序 [' + e + '] [' + e.message + ']')
      }
      // 释放资源
      _avil_list = []
      thread.interrupt()
    }
  }
}

module.exports = {
  antForestRunner: new Ant_forest()
}
