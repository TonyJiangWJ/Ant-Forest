/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-04-01 14:15:55
 * @Description: 蚂蚁森林操作集
 */
let { WidgetUtils } = require('../lib/WidgetUtils.js')
let { automator } = require('../lib/Automator.js')
let { commonFunctions } = require('../lib/CommonFunction.js')
let { config } = require('../config.js')

function Ant_forest () {
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
    _re_try = 0,
    _increased_energy = 0,
    _lost_some_one = false // 是否漏收
  /***********************
   * 综合操作
   ***********************/

  // 进入蚂蚁森林主页
  const startApp = function () {
    logInfo('启动支付宝应用')
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
    debugInfo('关闭蒙层成功')
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
    logInfo(text)
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
          if (toastDone) {
            return
          }
          if (
            toast &&
            toast.getPackageName() &&
            toast.getPackageName().indexOf(filter) >= 0
          ) {
            counter++
            temp.push(toast.getText())
            if (counter == limit) {
              logInfo('正常获取toast信息' + temp)
              toastDone = true
            } else if (new Date().getTime() - startTimestamp > 10000) {
              warnInfo('等待超过十秒秒钟，直接返回结果')
              toastDone = true
            }
          } else {
            errorInfo('无法获取toast内容，直接返回[]')
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
          warnInfo('获取toast超时释放锁')
        }
        debugInfo('temp' + temp)
        result = temp
      } finally {
        complete.signal()
        lock.unlock()
      }
    })
    // 获取结果
    debugInfo('阻塞等待toast结果')
    complete.await()
    debugInfo('阻塞等待结束，等待锁释放')
    lock.unlock()
    debugInfo('获取toast结果成功：' + result)
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
      debugInfo('待收取球数' + ball.length)
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
          errorInfo('获取倒计时错误：' + countdown)
        }
      })
      _min_countdown = Math.min.apply(null, temp)
    } else {
      _min_countdown = null
      logInfo('无可收取能量')
    }
    _timestamp = new Date()
  }

  // 确定下一次收取倒计时
  const getMinCountdown = function () {
    let countDownNow = calculateMinCountdown()
    // 如果有收集过能量，那么先返回主页在进入排行榜，以获取最新的倒计时信息，避免收集过的倒计时信息不刷新，此过程可能导致执行过慢
    if (_collect_any) {
      if (!isFinite(countDownNow) || countDownNow >= 2) {
        debugInfo('收集过能量，重新获取倒计时列表，原倒计时时间：[' + countDownNow + ']分')
        automator.clickBack()
        WidgetUtils.homePageWaiting()
        automator.enterFriendList()
        WidgetUtils.friendListWaiting()
        WidgetUtils.loadFriendList()
        sleep(100)
        // 再次获取倒计时数据
        let newCountDown = calculateMinCountdown(countDownNow, new Date())
        debugInfo('第二次获取倒计时时间:[' + newCountDown + ']分')
        if (isFinite(countDownNow)) {
          countDownNow = (isFinite(newCountDown) && newCountDown < countDownNow) ? newCountDown : countDownNow
        } else {
          countDownNow = newCountDown
        }
      } else {
        debugInfo('当前倒计时时间短，无需再次获取')
      }
    } else {
      debugInfo('未收集能量直接获取倒计时列表')
    }
    _min_countdown = isFinite(countDownNow) ? countDownNow : _min_countdown
  }

  const calculateMinCountdown = function (lastMin, lastTimestamp) {
    let temp = []
    if (_min_countdown && isFinite(_min_countdown) && _timestamp instanceof Date) {
      debugInfo('已记录自身倒计时：' + _min_countdown + '分')
      let passedTime = Math.round((new Date() - _timestamp) / 60000)
      let countdown_own = _min_countdown - passedTime
      debugInfo('本次收集经过了：[' + passedTime + ']分，最终记录自身倒计时：[' + countdown_own + ']分')
      countdown_own >= 0 ? temp.push(countdown_own) : temp.push(0)
    }
    if (isFinite(lastMin) && lastTimestamp instanceof Date) {
      debugInfo('上轮获取倒计时[' + lastMin + ']分')
      let passedTime = Math.round((new Date() - lastTimestamp) / 60000)
      lastMin = lastMin - passedTime
      debugInfo('重新获取倒计时经过了：[' + passedTime + ']分，最终记录上轮倒计时：[' + lastMin + ']分')
      lastMin >= 0 ? temp.push(lastMin) : temp.push(0)
    }
    let friCountDowmContainer = WidgetUtils.widgetGetAll('\\d+’', null, true)
    debugInfo('get \\d+` container:' + friCountDowmContainer)
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
    temp = temp.filter(i => isFinite(i))
    let min = Math.min.apply(null, temp)
    min = isFinite(min) ? min : undefined
    debugInfo('获取倒计时最小值：[' + min + ']分')
    return min
  }


  // 构建下一次运行
  const generateNext = function () {
    // 循环模式，判断循环次数
    if (config.is_cycle) {
      if (_current_time < config.cycle_times) {
        _has_next = true
      } else {
        logInfo("达到最大循环次数")
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
        logInfo("达到最大循环次数")
        return
      }
      // 计时模式，超过最大等待时间 退出执行
      if (
        _min_countdown != null &&
        _min_countdown <= config.max_collect_wait_time
      ) {
        _has_next = true
      } else {
        logInfo(_min_countdown + "超过最大等待时间")
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
      logInfo('当前能量：' + currentEnergy)
    }
    showCollectSummaryFloaty()
  }

  const showCollectSummaryFloaty = function (increased) {
    increased = increased || 0
    let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
    let runTimes = commonFunctions.getTodaysRuntimeStorage('runTimes')
    let content = '第 ' + runTimes.runTimes + ' 次运行, 累计已收集:' + ((energyInfo.totalIncrease || 0) + increased) + 'g'
    commonFunctions.showTextFloaty(content)
  }

  // 记录最终能量值
  const getPostEnergy = function () {
    automator.clickBack()
    WidgetUtils.homePageWaiting()
    // 等待能量值稳定
    sleep(500)
    _post_energy = getCurrentEnergy()
    logInfo('当前能量：' + _post_energy)
    commonFunctions.showEnergyInfo()
    let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
    if (!_fisrt_running && !_has_next) {
      showFloaty('本次共收取：' + (_post_energy - _pre_energy) + 'g 能量，累积共收取' + energyInfo.totalIncrease + 'g')
    } else {
      showCollectSummaryFloaty()
    }
    // 循环模式、或者有漏收 不返回home
    if ((!config.is_cycle || !_has_next) && !_lost_some_one) {
      automator.clickClose()
      home()
    }
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
            infoLog("找到帮收取能量球颜色匹配" + color)
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
    let usingInfo = WidgetUtils.widgetGetOne('使用了保护罩', 50, true)
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
      debugInfo('not found using protect info', true)
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
      if (config.help_friend) {
        rentery = collectAndHelp(obj.isHelp)
      } else {
        collectEnergy()
      }
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

  /**
   * 校验好友列表对象是否有效，有效则返回子控件长度
   * 
   * @param {Object} friends_list 
   */
  const whetherFriendListValidLength = function (friends_list) {
    return (friends_list && friends_list.children()) ? friends_list.children().length : undefined
  }

  const LOADING_STATUS_MAP = {
    '0': '空闲',
    '-1': '加载中',
    '1': '加载完成',
    '2': '收取中'
  }
  const GETTING_STATUS_MAP = {
    '0': '空闲',
    '1': '检测可收取状态中',
    '2': '获取好友列表中'
  }
  const FRIEND_LIST_STATUS_MAP = {
    '0': '已使用',
    '-1': '初始化',
    '1': '已更新'
  }
  // 识别可收取好友并记录
  const findAndCollect = function () {
    if (!WidgetUtils.friendListWaiting()) {
      errorInfo('崩了 当前不在好友列表 重新开始')
      return false
    }
    const FREE_STATUS = 0
    // 判断加载状态用
    const LOADING_STATUS = -1
    const LOADED_STATUS = 1
    const COLLECT_STATUS = 2
    // 获取好友列表用
    const ANALYZE_FRIENDS = 1
    const GETTING_FRIENDS = 2
    // 好友列表有效性
    const INIT_STATUS = -1
    const USED_STATUS = 0
    const UPDATED_STATUS = 1

    let lastCheckFriend = -1
    let friendListLength = -2
    let totalValidLength = 0
    debugInfo('加载好友列表')
    let atomic = threads.atomic(FREE_STATUS)
    // 控制是否继续获取好友列表
    let gettingAtomic = threads.atomic(FREE_STATUS)
    // 用来控制好友列表的获取，避免无限循环获取影响性能
    let friendListAtomic = threads.atomic(INIT_STATUS)
    let friends_list = null
    let loadThread = threads.start(function () {
      let threadName = '[预加载线程]'
      let preLoadStart = new Date().getTime()
      while (atomic.get() !== LOADED_STATUS) {
        while (!atomic.compareAndSet(FREE_STATUS, LOADING_STATUS)) {
          if (atomic.get() === LOADED_STATUS) {
            break
          }
          // wait
          sleep(10)
        }
        if ((more = idMatches(".*J_rank_list_more.*").findOne(200)) != null) {
          let loadMoreContent = config.load_more_ui_content || '查看更多'
          let noMoreContent = config.no_more_ui_content || '没有更多了'
          if ((more.desc() && more.desc().match(noMoreContent)) || (more.text() && more.text().match(noMoreContent))) {
            debugInfo(threadName + '发现没有更多按钮，获取好友列表')
            // 加载完之后立即获取好友列表
            while (!gettingAtomic.compareAndSet(FREE_STATUS, GETTING_FRIENDS)) {
              // wait
              sleep(10)
            }
            debugInfo(threadName + '正获取好友list中')
            friends_list = WidgetUtils.getFriendList()
            gettingAtomic.compareAndSet(GETTING_FRIENDS, FREE_STATUS)
            sleep(100)
            debugInfo(threadName + '获取好友list完成')
            let listLength = whetherFriendListValidLength(friends_list)
            if (listLength) {
              // 设置当前状态为已加载完成
              debugInfo([
                threadName + '找到了没有更多 old atomic status:[{}] old friendListAtomic status:[{}]',
                LOADING_STATUS_MAP[atomic.getAndSet(LOADED_STATUS)], FRIEND_LIST_STATUS_MAP[friendListAtomic.getAndSet(UPDATED_STATUS)]
              ])
              debugInfo([
                threadName + '预加载好友列表完成，耗时[{}]ms 列表长度：[{}]',
                (new Date().getTime() - preLoadStart), listLength
              ], true)
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
            debugInfo(threadName + '点击加载更多，热身中 速度较慢')
            more.click()
          } else {
            debugInfo(threadName + 'find target j_rank_list_more but desc/text is :' + more.desc() + ', ' + more.text())
          }
        }
        if (!atomic.compareAndSet(LOADING_STATUS, FREE_STATUS)) {
          debugInfo([
            threadName + '更新预加载状态atomic失败old status：[{}]', LOADING_STATUS_MAP[atomic.get()]
          ])
        }
        sleep(150)
      }
    })

    let preGetFriendListThread = threads.start(function () {
      let threadName = '[预获取好友列表线程]'
      while (atomic.get() !== LOADED_STATUS) {
        if (friendListAtomic.get() === UPDATED_STATUS) {
          // 好友列表获取后没有经过使用，继续等待
          continue
        }
        while (!gettingAtomic.compareAndSet(FREE_STATUS, GETTING_FRIENDS)) {
          if (atomic.get() === LOADED_STATUS) {
            break
          }
          // wait
          sleep(10)
        }
        if (atomic.get() === LOADED_STATUS) {
          debugInfo(threadName + '发现列表已展开完毕 gettingAtomic.status:' + gettingAtomic.getAndSet(FREE_STATUS))
          break
        }
        debugInfo(threadName + '正获取好友list中')
        friends_list = WidgetUtils.getFriendList()
        if (whetherFriendListValidLength(friends_list) >= 9) {

          if (friendListAtomic.compareAndSet(USED_STATUS, UPDATED_STATUS)) {
            debugInfo(['{}刷新列表成功 长度[{}]', threadName, friends_list.children().length])
          }
          if (friendListAtomic.compareAndSet(INIT_STATUS, UPDATED_STATUS)) {
            debugInfo(['{}初始化获取列表成功 长度[{}]', threadName, friends_list.children().length])
          }
        }
        sleep(100)
        debugInfo(['{}获取好友list完成 释放加载线程变量，原状态：[{}]', threadName, GETTING_STATUS_MAP[gettingAtomic.getAndSet(FREE_STATUS)]])
      }
    })

    commonFunctions.addOpenPlacehold("<<<<>>>>")
    let errorCount = 0
    let iteratorStart = -1
    let QUEUE_SIZE = 4
    let queue = commonFunctions.createQueue(QUEUE_SIZE)
    let step = 0
    while (friendListAtomic.get() === INIT_STATUS) {
      sleep(10)
      if (step % 500 === 0) {
        warnInfo('好友列表未加载完成，继续等待...')
      }
      step += 10
    }
    let lastCheckedIndex = iteratorStart
    let lastValidCheckIdx = iteratorStart
    let stuckCount = 0
    // 重新滑动的次数
    let reScrollTime = 0

    let checkedList = []
    let saveDebugImage = config.save_debug_image//|| true
    let rootpath = '/storage/emulated/0/脚本/debugImages/'
    let countingDownContainers = []
    do {
      let screenDebugName = rootpath + formatDate(new Date(), 'HHmmss.S') + '.png'
      let pageStartPoint = new Date().getTime()
      WidgetUtils.waitRankListStable()

      let findStart = new Date().getTime()
      let recheck = false
      while (!gettingAtomic.compareAndSet(FREE_STATUS, ANALYZE_FRIENDS)) {
        if (gettingAtomic.get() === ANALYZE_FRIENDS) {
          warnInfo('上次分析中发现问题，进行二次校验')
          recheck = true
          break
        }
        // 等待获取完好友列表
        sleep(10)
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
      if (saveDebugImage) {
        let p = new Date()
        images.save(screen, screenDebugName)
        infoLog([
          'saved image[{}] cost time[{}]ms',
          screenDebugName, (new Date() - p)
        ])
      }
      lastCheckedIndex = iteratorStart
      debugInfo(['判断好友信息 last[{}] start[{}] ', lastCheckedIndex, iteratorStart])
      if (iteratorStart < lastValidCheckIdx) {
        warnInfo([
          '上一次检测加载中，再来一遍 start[{}] lastValid[{}]',
          iteratorStart, lastValidCheckIdx
        ])
      }
      if (friends_list && friends_list.children) {
        friendListLength = friends_list.children().length
        debugInfo(
          '读取好友列表完成，开始检查可收取列表 列表长度:' + friendListLength
        )
        let iteratorEnd = -1
        let validChildList = friends_list.children().filter((fri) => {
          return fri.childCount() >= 3
        })
        if (!(validChildList && validChildList.length > 0)) {
          warnInfo(['未能获取好友列表 释放gettingAtomic', gettingAtomic.compareAndSet(ANALYZE_FRIENDS, FREE_STATUS)])
          continue
        }
        totalValidLength = validChildList.length
        debugInfo(['获取有效好友列表长度为：{}', totalValidLength])
        validChildList.forEach(function (fri, idx) {
          let gap = Math.abs(idx - iteratorStart)
          if (idx <= iteratorStart || (iteratorEnd !== -1 && idx > iteratorEnd)) {
            if (gap < 5) {
              debugInfo([
                '[{}]跳出判断iteratorStart:[{}] iteratorEnd:[{}]',
                idx, iteratorStart, iteratorEnd
              ])
            }
            return
          }
          if (idx <= lastValidCheckIdx) {
            debugInfo([
              '已经校验[{}] 跳过识别', idx
            ])
            iteratorStart = idx
            return
          }
          if (fri.visibleToUser()) {
            let bounds = fri.bounds()
            let fh = bounds.bottom - bounds.top
            if (fh > 10) {
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
              checkedList.push(idx)
              // 记录最后一个校验的下标索引, 也就是最后出现在视野中的
              lastCheckFriend = idx + 1
              iteratorStart = idx
            } else {
              if (gap <= 5) {
                let flag = ~~(Math.random() * 1000)
                if (recheck && saveDebugImage) {
                  screen = captureScreen()
                  screenDebugName = rootpath + commonFunctions.formatString(
                    'start[{}] 不在视野范围[{}] name:[{}] bounds[{}]{}.png',
                    iteratorStart, idx, WidgetUtils.getFriendsName(fri)
                    , fri.bounds()
                  )
                  images.save(screen, screenDebugName)
                }
                debugInfo([
                  'start[{}] 不在视野范围[{}] name:[{}] bounds[{}]{}.png',
                  iteratorStart, idx, WidgetUtils.getFriendsName(fri)
                  , fri.bounds(), flag
                ])
              }
              if (idx > iteratorStart && iteratorEnd === -1) {
                iteratorEnd = idx
                debugInfo(["set end[{}]", idx])
              }
            }
          } else {
            if (gap < 5) {
              let randomFlag = ~~(Math.random() * 1000)
              debugInfo(['start[{}]invisible [{}]不在视野范围{}', iteratorStart, idx, randomFlag])
              if (recheck && saveDebugImage) {
                screen = captureScreen()
                screenDebugName = rootpath + commonFunctions.formatString(
                  'start[{}]invisible [{}]不在视野范围{}.png', iteratorStart, idx, randomFlag
                )
                images.save(screen, screenDebugName)
              }
            }
            if (idx > iteratorStart && iteratorEnd === -1) {
              iteratorEnd = idx
              debugInfo(["set end[{}]", idx])
            }
          }
        })
        debugInfo(
          ['可收取列表获取完成 校验数量[{}]，开始收集 待收取列表长度:[{}]', lastCheckFriend, _avil_list.length]
        )
        let findEnd = new Date().getTime()
        debugInfo(['检测好友列表可收取情况耗时：[{}]ms ', (findEnd - findStart)])
      } else {
        logInfo('好友列表不存在')
      }
      if (!WidgetUtils.friendListWaiting()) {
        errorInfo('崩了 当前不在好友列表 重新开始')
        return false
      }

      if (
        iteratorStart - lastCheckedIndex < 5
        && stuckCount <= 5
      ) {
        debugInfo([
          '校验数量[{}] 小于5 可能列表在加载中 不滑动 stuckCount:[{}]',
          (iteratorStart - lastCheckedIndex), stuckCount
        ])
        if (stuckCount >= 3 && reScrollTime++ <= 3) {
          warnInfo('卡死3次，不正常，将页面上划重新开始', true)
          scrollUp()
          stuckCount = 0
        }
        // 重新获取好友列表
        friends_list = WidgetUtils.getFriendList()
        let regetLength = whetherFriendListValidLength(friends_list)
        warnInfo(['重新获取好友列表，获得列表长度[{}]', regetLength])
        if (regetLength) {
          let tmp = regetIteratorStartIdx(friends_list, iteratorStart, lastValidCheckIdx)
          if (tmp >= 0) {
            iteratorStart = tmp
          } else {
            warnInfo('未能找到首个可见item')
          }
        }
        stuckCount += 1
        iteratorEnd = -1
        debugInfo('开始第二次分析')
      } else {
        reScrollTime = 0
        debugInfo([
          '释放加载线程变量gettingAtomic 原值[{}]',
          GETTING_STATUS_MAP[gettingAtomic.getAndSet(FREE_STATUS)]
        ])
        // -------准备收集好友列表-------
        while (!atomic.compareAndSet(FREE_STATUS, COLLECT_STATUS)) {
          if (atomic.get() === LOADED_STATUS) {
            debugInfo('加载完毕直接退出等待')
            break
          }
          // wait
          sleep(10)
        }
        let loaded = atomic.get() === LOADED_STATUS
        let loadStatStr = loaded ? '加载完毕' : '未加载完毕'
        debugInfo('准备开始收集，列表加载状态：' + loadStatStr)
        if (_avil_list.length > 0) {
          if (false == collectAvailableList()) {
            errorInfo('流程出错 向上抛出')
            return false
          }
        } else {
          debugInfo('无好友可收集能量')
        }
        debugInfo('收取好友后设置atomic：' + atomic.compareAndSet(COLLECT_STATUS, FREE_STATUS))
        // 重置为空列表
        _avil_list = []
        debugInfo(['收集完 lastCheckedIndex[{}] iteratorStart[{}]', lastCheckedIndex, iteratorStart])
        debugInfo([
          '更新列表状态为已使用 old status:[{}]',
          FRIEND_LIST_STATUS_MAP[friendListAtomic.getAndSet(USED_STATUS)]
        ])
        // -------收集好友列表完成-------

        debugInfo(['下滑进入下一页 「{}」', stuckCount])
        stuckCount = 0
        // automator.scrollDown(config.scrollDownSpeed || 200)
        scrollDown()
        debugInfo(['进入下一页, stuckCount[{}], 本页耗时：[{}]ms', stuckCount, (new Date().getTime() - pageStartPoint)])
        debugInfo(['add [{}] into queue, distinct size:[{}]', lastCheckFriend, commonFunctions.getQueueDistinctSize(queue)])
        commonFunctions.pushQueue(queue, QUEUE_SIZE, lastCheckFriend)
        lastValidCheckIdx = iteratorStart
      }
    } while (
      (
        atomic.get() !== LOADED_STATUS
        || friendListLength !== whetherFriendListValidLength(friends_list)
        || friendListAtomic.get() !== USED_STATUS
        || lastCheckFriend < totalValidLength
      ) && commonFunctions.getQueueDistinctSize(queue) > 1
    )
    debugInfo(['校验收尾'])
    if (_avil_list.length > 0) {
      debugInfo(['有未收集的可收取能量'])
      if (false == collectAvailableList()) {
        errorInfo('流程出错 向上抛出')
        return false
      }
    } else {
      debugInfo('无好友可收集能量')
    }

    _lost_some_one = checkIsEveryFriendChecked(checkedList, totalValidLength)
    checkRunningCountdown(countingDownContainers)
    commonFunctions.addClosePlacehold(">>>><<<<")
    logInfo([
      '全部好友收集完成, last:[{}] length:[{}] queueSize:[{}] finalLoadStatus[{}]',
      lastCheckFriend, totalValidLength, commonFunctions.getQueueDistinctSize(queue)
      , LOADING_STATUS_MAP[atomic.get()]
    ])
    if (_lost_some_one) {
      clearLogFile()
    }
    loadThread.interrupt()
    preGetFriendListThread.interrupt()
  }

  const regetIteratorStartIdx = function (friends_list, iteratorStart, lastValidCheckIdx) {
    let found = false
    let findError = false
    friends_list.children().forEach(function (fri, idx) {
      if (idx < iteratorStart - 10 || found || findError) {
        // skip
        return
      }
      let bounds = fri.bounds()
      let fh = bounds.bottom - bounds.top
      if (fri.visibleToUser() && fh > 50) {
        if (idx > lastValidCheckIdx) {
          // 获取的值过大重新获取，划动到上一页再获取
          warnInfo(['获取的值过大重新获取，划动到上一页再获取 idx:{} lastValidCheckIdx:{}', idx, lastValidCheckIdx], true)
          scrollUp()
          findError = true
        }
        iteratorStart = idx
        let randomFileName = ~~(Math.random() * 1000)
        debugInfo([
          '找到首个可见索引[{}] 从[{}]开始二次校验 跳过已校验索引<=[{}]{}',
          idx, iteratorStart, lastValidCheckIdx, randomFileName
        ])
        let saveDebugImage = config.save_debug_image //|| true
        if (saveDebugImage) {
          let screenDebugName = '/storage/emulated/0/脚本/debugImages/' +
            commonFunctions.formatString(
              '找到首个可见索引[{}] 从[{}]开始二次校验 跳过已校验索引<=[{}]{}.png',
              idx, iteratorStart, lastValidCheckIdx, randomFileName
            )
          screen = captureScreen()
          images.save(screen, screenDebugName)
        }
        found = true
      }
    })
    if (findError) {
      warnInfo(['重新获取可见item信息 currentStart:[{}] lastValidCheckIdx:[{}]', iteratorStart, lastValidCheckIdx])
      return regetIteratorStartIdx(friends_list, iteratorStart, lastValidCheckIdx)
    }
    if (found) {
      return iteratorStart
    } else {
      return -1
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
          infoLog('[' + item.name + ']倒计时结束')
          // 标记有倒计时结束的漏收了，收集完之后进行第二次收集
          _lost_some_one = true
        }
      })
    }
  }



  /***********************
   * 主要函数
   ***********************/

  // 收取自己的能量
  const collectOwn = function () {
    commonFunctions.addOpenPlacehold('开始收集自己能量')
    let restartCount = 0
    let waitFlag
    let startWait = 1000
    startApp()
    if (!config.is_cycle) {
      // 首次启动等待久一点
      sleep(1500)
    }
    while (!(waitFlag = WidgetUtils.homePageWaiting()) && restartCount++ < 5) {
      warnInfo('程序未启动，尝试再次唤醒')
      automator.clickClose()
      debugInfo('关闭H5')
      if (restartCount >= 3) {
        startWait += 200 * restartCount
        home()
      }
      sleep(1000)
      // 解锁并启动
      unlocker.exec()
      startApp()
      sleep(startWait)
    }
    if (!waitFlag && restartCount >= 5) {
      logInfo('退出脚本')
      engines.myEngine().forceStop();
    }
    logInfo('进入个人首页成功')
    clearPopup()
    getPreEnergy()
    debugInfo('准备收集自己能量')
    collectEnergy(true)
    if (!config.is_cycle) {
      debugInfo('准备计算最短时间')
      getMinCountdownOwn()
    }
    commonFunctions.addClosePlacehold("收集自己的能量完毕")
    _fisrt_running = false
  }

  // 收取好友的能量
  const collectFriend = function () {
    commonFunctions.addOpenPlacehold('开始收集好友能量')
    automator.enterFriendList()
    let enterFlag = WidgetUtils.friendListWaiting()
    if (!enterFlag) {
      return false
    }
    if (false == findAndCollect()) {
      _min_countdown = 0
      _has_next = true
      _current_time = _current_time == 0 ? 0 : _current_time - 1
      errorInfo('收集好友能量失败，重新开始')
      _re_try++
      return false
    }
    commonFunctions.addClosePlacehold("收集好友能量结束")
    if (!config.is_cycle) {
      getMinCountdown()
    }
    generateNext()
    getPostEnergy()
  }

  /**
   * 监听音量上键延迟执行
   **/
  const listenDelayCollect = function () {
    threads.start(function () {
      infoLog('即将收取能量，按音量下键延迟五分钟执行', true)
      events.observeKey()
      events.onceKeyDown('volume_down', function (event) {
        warnInfo('延迟五分钟后启动脚本', true)
        commonFunctions.setUpAutoStart(5)
        engines.myEngine().forceStop()
        exit()
      })
    })
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
          _increased_energy = 0
          if (_lost_some_one) {
            warnInfo('上一次收取有漏收，再次收集', true)
          } else {
            if (_min_countdown > 0 && !config.is_cycle) {
              // 延迟自动启动，用于防止autoJs自动崩溃等情况下导致的问题
              commonFunctions.setUpAutoStart(_min_countdown)
              commonFunctions.commonDelay(_min_countdown)
            }
          }
          listenDelayCollect()
          commonFunctions.showEnergyInfo()
          let runTime = commonFunctions.increaseRunTimes()
          infoLog("========第" + runTime + "次运行========")
          showCollectSummaryFloaty()
          _current_time++
          unlocker.exec()
          try {
            _avil_list = []
            collectOwn()
            collectFriend()
          } catch (e) {
            errorInfo('发生异常 [' + e + '] [' + e.message + ']')
            _current_time = _current_time == 0 ? 0 : _current_time - 1
            _min_countdown = 0
            _has_next = true
            _re_try = 0
          }
          if (!config.is_cycle && !_lost_some_one && config.auto_lock === true && unlocker.needRelock() === true) {
            debugInfo('重新锁定屏幕')
            automator.lockScreen()
          }
          events.removeAllListeners()
          if (_has_next === false || _re_try > 5) {
            logInfo('收取结束')
            setTimeout(() => {
              exit()
            }, 30000)
            break
          }
          logInfo('========本轮结束========')
        }
      } catch (e) {
        errorInfo('发生异常，终止程序 [' + e + '] [' + e.message + ']')
        exit()
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
