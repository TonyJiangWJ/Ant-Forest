/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-02 23:25:07
 * @Description: 蚂蚁森林操作集
 */
let { WidgetUtils } = require('../lib/WidgetUtils.js')
let { automator } = require('../lib/Automator.js')
let { commonFunctions } = require('../lib/CommonFunction.js')
let { runningQueueDispatcher } = require('../lib/RunningQueueDispatcher.js')
let { config } = require('../config.js')
let { FriendListScanner } = require('./FriendListScanner.js')

function Ant_forest () {
  const _package_name = 'com.eg.android.AlipayGphone'

  let _pre_energy = 0, // 记录收取前能量值
    _post_energy = 0, // 记录收取后能量值
    _timestamp = 0, // 记录获取自身能量倒计时
    _min_countdown = 0, // 最小可收取倒计时
    _current_time = 0, // 当前收集次数
    _fisrt_running = true, // 是否第一次进入蚂蚁森林
    _has_next = true, // 是否下一次运行
    _collect_any = false, // 收集过能量
    _re_try = 0,
    _lost_someone = false // 是否漏收,
  _friends_min_countdown = 0
  /***********************
   * 综合操作
   ***********************/

  // 进入蚂蚁森林主页
  const startApp = function () {
    commonFunctions.launchPackage(_package_name, false)
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
      let toasts = getToastAsync(_package_name, ball.length >= 2 ? 2 : ball.length, function () {
        // 只需要点击两个球就够了
        for (let i = 0; i < ball.length && i < 2; i++) {
          let countDownBall = ball[i]
          automator.clickCenter(countDownBall)
          sleep(500)
        }
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
      /** TODO 暂时屏蔽
      if (!isFinite(countDownNow) || countDownNow >= 2) {
        debugInfo('收集过能量，重新获取倒计时列表，原倒计时时间：[' + countDownNow + ']分')
        automator.clickBack()
        WidgetUtils.homePageWaiting()
        automator.enterFriendList()
        WidgetUtils.friendListWaiting()
        WidgetUtils.quickScrollDown()
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
       */
    } else {
      debugInfo('未收集能量直接获取倒计时列表')
    }
    _min_countdown = isFinite(countDownNow) ? countDownNow : _min_countdown
  }

  const calculateMinCountdown = function (lastMin, lastTimestamp) {
    let temp = []
    if (_friends_min_countdown && isFinite(_friends_min_countdown)) {
      temp.push(_friends_min_countdown)
    }
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
    let peekCountdownContainer = function (container) {
      if (container) {
        return commonFunctions.formatString('倒计时数据总长度：{} 文本属性来自[{}]', container.target.length, (container.isDesc ? 'desc' : 'text'))
      } else {
        return null
      }
    }
    debugInfo('get \\d+’ container:' + peekCountdownContainer(friCountDowmContainer))
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
    debugInfo('展示悬浮窗内容：' + content)
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
    if ((!config.is_cycle || !_has_next) && !_lost_someone) {
      automator.clickClose()
      sleep(1000)
      // 重新打开启动前的app
      commonFunctions.reopenPackageBeforeRunning()
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

  const findAndCollect = function () {
    let scanner = new FriendListScanner()
    scanner.init()
    let executeResult = scanner.start()
    if (executeResult === true) {
      _lost_someone = true
    } else {
      _lost_someone = executeResult.loatSomeone
      _collect_any = executeResult.collectAny
      _friends_min_countdown = executeResult.minCountdown
    }
    scanner.destory()
    return _lost_someone
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
      startApp(false)
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
    if (true === findAndCollect()) {
      _min_countdown = 0
      _has_next = true
      _current_time = _current_time == 0 ? 0 : _current_time - 1
      errorInfo('收集好友能量失败，重新开始')
      _re_try++
      return false
    }
    commonFunctions.addClosePlacehold("收集好友能量结束")
    if (!config.is_cycle && !_lost_someone) {
      getMinCountdown()
    }
    generateNext()
    getPostEnergy()
  }

  /**
   * 监听音量上键直接关闭
   **/
  const listenStopCollect = function () {
    threads.start(function () {
      sleep(1000)
      infoLog('即将收取能量，运行中可按音量上键关闭', true)
      events.observeKey()
      events.onceKeyDown('volume_up', function (event) {
        if (config.autoSetBrightness) {
          device.setBrightnessMode(1)
        }
        runningQueueDispatcher.removeRunningTask()
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
          if (_lost_someone) {
            warnInfo('上一次收取有漏收，再次收集', true)
          } else {
            if (_min_countdown > 0 && !config.is_cycle) {
              // 提前10秒左右结束计时
              let delayTime = 10 / 60.0
              // 延迟自动启动，用于防止autoJs自动崩溃等情况下导致的问题
              delayTime += (config.delayStartTime || 5000) / 60000.0
              commonFunctions.setUpAutoStart(_min_countdown - delayTime)
              runningQueueDispatcher.removeRunningTask()
              // 如果不驻留悬浮窗  则不延迟，直接关闭
              if (config.notLingeringFloatWindow) {
                exit()
              } else {
                commonFunctions.commonDelay(_min_countdown - delayTime)
                commonFunctions.checkCaptureScreenPermission()
              }
            }
          }
          runningQueueDispatcher.addRunningTask()
          listenStopCollect()
          if (!config.is_cycle) {
            if (config.tryGetExactlyPackage) {
              commonFunctions.showDialogAndWait(true)
              commonFunctions.recordCurrentPackage()
            } else {
              commonFunctions.recordCurrentPackage()
              commonFunctions.showDialogAndWait(true)
            }
          }

          commonFunctions.showEnergyInfo()
          let runTime = commonFunctions.increaseRunTimes()
          infoLog("========第" + runTime + "次运行========")
          showCollectSummaryFloaty()
          debugInfo('展示悬浮窗完毕')
          _current_time++
          unlocker.exec()
          try {
            _avil_list = []
            collectOwn()
            if (collectFriend() === false) {
              // 收集失败，重新开始
              _lost_someone = true
              _current_time = _current_time == 0 ? 0 : _current_time - 1
              _min_countdown = 0
              _has_next = true
            }
          } catch (e) {
            errorInfo('发生异常 [' + e + '] [' + e.message + ']')
            _current_time = _current_time == 0 ? 0 : _current_time - 1
            _lost_someone = true
            _min_countdown = 0
            _has_next = true
            _re_try = 0
          }
          // 当前不在循环模式下，且没有遗漏
          if (!config.is_cycle && !_lost_someone) {
            if (config.auto_lock === true && unlocker.needRelock() === true) {
              debugInfo('重新锁定屏幕')
              automator.lockScreen()
            }
            if (config.autoSetBrightness) {
              device.setBrightnessMode(1)
            }
          }
          events.removeAllListeners()
          if (!_lost_someone && (_has_next === false || _re_try > 5)) {
            logInfo('收取结束')
            setTimeout(() => {
              exit()
            }, 30000)
            runningQueueDispatcher.removeRunningTask()
            break
          }
          logInfo('========本轮结束========')
        }
      } catch (e) {
        errorInfo('发生异常，终止程序 [' + e + '] [' + e.message + ']')
        // 设置三分钟后重试
        commonFunctions.setUpAutoStart(3)
        runningQueueDispatcher.removeRunningTask()
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
