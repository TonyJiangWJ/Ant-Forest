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
    reTry = 0,
    increasedEnergy = 0
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
      _timestamp = new Date()
    } else {
      _min_countdown = null
      logInfo('无可收取能量')
    }
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
    if (isFinite(_min_countdown) && _timestamp instanceof Date) {
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
    // 循环模式不返回home
    if (!config.is_cycle || !_has_next) {
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
          o_w = bounds.width(),
          o_h = bounds.height(),
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
        warnInfo("未能找到帮收能量球需要增加匹配颜色组" + colors)
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
            commonFunctions.recordFriendCollectInfo({
              friendName: obj.name,
              friendEnergy: postE,
              postCollect: postGet,
              preCollect: preGot,
              helpCollect: 0
            })
            increasedEnergy += gotEnergy
            showCollectSummaryFloaty(increasedEnergy)
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
      if (!collectTargetFriend(_avil_list.shift())) {
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

  // 识别可收取好友并记录
  const findAndCollect = function () {
    const FREE_STATUS = 0
    // 判断加载状态用
    const LOADING_STATUS = -1
    const LOADED_STATUS = 1
    const COLLECT_STATUS = 2
    // 获取好友列表用
    const ANALYZE_FRIENDS = 1
    const GETTING_FRIENDS = 2
    // 好友列表有效性
    const USED_STATUS = 0
    const UPDATED_STATUS = 1

    let lastCheckFriend = -1
    let friendListLength = -2
    let totalVaildLength = 0
    debugInfo('加载好友列表')
    let atomic = threads.atomic()
    // 控制是否继续获取好友列表
    let gettingAtomic = threads.atomic()
    // 用来控制好友列表的获取，避免无限循环获取影响性能
    let friendListAtomic = threads.atomic()
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
              debugInfo(threadName + '找到了没有更多 old atomic status:[' + atomic.getAndSet(LOADED_STATUS) + '] old friendListStatus:[' + friendListAtomic.getAndSet(UPDATED_STATUS) + ']')
              infoLog(threadName + '预加载好友列表完成，耗时[' + (new Date().getTime() - preLoadStart) + ']ms 列表长度：' + listLength, true, true)
              // 动态修改预加载超时时间
              let dynamicTimeout = listLength * 30
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
          debugInfo(threadName + '更新预加载状态失败old status：' + atomic.get())
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
        if (whetherFriendListValidLength(friends_list)) {
          friendListAtomic.compareAndSet(USED_STATUS, UPDATED_STATUS)
        }
        gettingAtomic.compareAndSet(GETTING_FRIENDS, FREE_STATUS)
        sleep(100)
        debugInfo(threadName + '获取好友list完成')
      }
    })
    if (!WidgetUtils.friendListWaiting()) {
      errorInfo('崩了 当前不在好友列表 重新开始')
      return false
    }
    commonFunctions.addOpenPlacehold("<<<<>>>>")
    let errorCount = 0
    let iteratorStart = -1
    let QUEUE_SIZE = 4
    let queue = commonFunctions.createQueue(QUEUE_SIZE)
    do {
      let pageStartPoint = new Date().getTime()
      WidgetUtils.waitRankListStable()
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
      let findStart = new Date().getTime()
      while (!gettingAtomic.compareAndSet(FREE_STATUS, ANALYZE_FRIENDS)) {
        // 等待获取完好友列表
        sleep(10)
      }
      debugInfo('判断好友信息')
      if (friends_list && friends_list.children) {
        friendListLength = friends_list.children().length
        debugInfo(
          '读取好友列表完成，开始检查可收取列表 列表长度:' + friendListLength
        )
        let iteratorEnd = -1
        friends_list.children().forEach(function (fri, idx) {
          if (idx <= iteratorStart || (iteratorEnd !== -1 && idx > iteratorEnd)) {
            //debugInfo('[' + idx + ']跳出判断iteratorStart:[' + iteratorStart + '] iteratorEnd:[' + iteratorEnd + ']')
            return
          }
          if (fri.visibleToUser()) {
            if (fri.childCount() >= 3) {
              let bounds = fri.bounds()
              let fh = bounds.bottom - bounds.top
              if (fh > 10) {
                let container = isObtainable(fri, screen)
                if (container.canDo) {
                  container.bounds = bounds
                  recordAvailableList(container)
                  debugInfo('可收取 index:' + idx + ' name:' + container.name)
                } else {
                  debugInfo('不可收取 index:' + idx + ' name:' + container.name)
                  totalVaildLength = idx + 1
                }
                // 记录最后一个校验的下标索引, 也就是最后出现在视野中的
                lastCheckFriend = idx + 1
                iteratorStart = idx
              } else {
                //debugInfo('不在视野范围' + idx + ' name:' + WidgetUtils.getFriendsName(fri))
                totalVaildLength = idx + 1
                if (idx > iteratorStart && iteratorEnd === -1) {
                  iteratorEnd = idx
                }
              }
            } else {
              debugInfo('不符合好友列表条件 childCount:' + fri.childCount() + ' index:' + idx)
            }
          } else {
            //debugInfo("不可见" + idx)
            totalVaildLength = idx + 1
            if (idx > iteratorStart && iteratorEnd === -1) {
              iteratorEnd = idx
            }
          }
        })
        debugInfo(
          '可收取列表获取完成 校验数量' + lastCheckFriend + '，开始收集 待收取列表长度:' + _avil_list.length + ' 更新列表状态为已使用 old status:' + friendListAtomic.getAndSet(USED_STATUS)
        )
        debugInfo('检测完：' + gettingAtomic.getAndSet(FREE_STATUS))
        let findEnd = new Date().getTime()
        debugInfo('检测好友列表可收取情况耗时：[' + (findEnd - findStart) + ']ms')
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
        let setResult = atomic.compareAndSet(COLLECT_STATUS, FREE_STATUS)
        debugInfo('收取好友后设置atomic：' + setResult)
      } else {
        logInfo('好友列表不存在')
      }
      if (!WidgetUtils.friendListWaiting()) {
        errorInfo('崩了 当前不在好友列表 重新开始')
        return false
      }
      // 重置为空列表
      _avil_list = []
      debugInfo('收集完成 last:' + lastCheckFriend + '，下滑进入下一页')
      automator.scrollDown(config.scrollDownSpeed || 200)
      debugInfo('进入下一页, 本页耗时：[' + (new Date().getTime() - pageStartPoint) + ']ms')
      debugInfo('add [' + lastCheckFriend + '] into queue, distinct size:[' + commonFunctions.getQueueDistinctSize(queue) + ']')
      commonFunctions.pushQueue(queue, QUEUE_SIZE, lastCheckFriend)
    } while (
      (atomic.get() !== LOADED_STATUS || lastCheckFriend < totalVaildLength) && commonFunctions.getQueueDistinctSize(queue) > 1
    )
    commonFunctions.addClosePlacehold(">>>><<<<")
    logInfo('全部好友收集完成, last:' + lastCheckFriend + ' length:' + totalVaildLength + ' queueSize:' + commonFunctions.getQueueDistinctSize(queue))
    loadThread.interrupt()
    preGetFriendListThread.interrupt()
  }


  /***********************
   * 主要函数
   ***********************/

  // 收取自己的能量
  const collectOwn = function () {
    commonFunctions.addOpenPlacehold('开始收集自己能量')
    let restartCount = 0
    let waitFlag
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
        home()
      }
      sleep(1000)
      // 解锁并启动
      unlocker.exec()
      startApp()
      sleep(1000)
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
    debugInfo('准备计算最短时间')
    getMinCountdownOwn()
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
      reTry++
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
          increasedEnergy = 0
          if (_min_countdown > 0 && !config.is_cycle) {
            // 延迟自动启动，用于防止autoJs自动崩溃等情况下导致的问题
            commonFunctions.setUpAutoStart(_min_countdown)
            commonFunctions.commonDelay(_min_countdown)
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
            reTry = 0
          }
          if (config.auto_lock === true && unlocker.needRelock() === true) {
            debugInfo('重新锁定屏幕')
            automator.lockScreen()
          }
          events.removeAllListeners()
          if (_has_next === false || reTry > 5) {
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
