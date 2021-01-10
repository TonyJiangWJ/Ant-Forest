/*
 * @Author: NickHopps
 * @Date: 2019-01-31 22:58:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-10 11:21:39
 * @Description: 
 */
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')
let _runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let alipayUnlocker = singletonRequire('AlipayUnlocker')
let callStateListener = _config.enable_call_state_control ? singletonRequire('CallStateListener')
  : { exitIfNotIdle: () => { }, enableListener: () => { }, disableListener: () => { } }
let StrollScanner = require('./StrollScanner.js')
let ImgBasedFriendListScanner = require('./ImgBasedFriendListScanner.js')
let BaseScanner = require('./BaseScanner.js')

function Ant_forest () {
  let _base_scanner = new BaseScanner()
  _commonFunctions.registerOnEngineRemoved(function () {
    if (_base_scanner !== null) {
      _base_scanner.destory()
      _base_scanner = null
    }
  }, 'release threadPool')

  let _pre_energy = 0, // 记录收取前能量值
    _post_energy = 0, // 记录收取后能量值
    _timestamp = 0, // 记录获取自身能量倒计时
    _min_countdown = null, // 最小可收取倒计时
    _current_time = 0, // 当前收集次数
    _fisrt_running = true, // 是否第一次进入蚂蚁森林
    _has_next = true, // 是否下一次运行
    _collect_any = false, // 收集过能量
    _re_try = 0,
    _lost_someone = false, // 是否漏收,
    _lost_count = 0, // 漏收异常次数,
    _lost_reason = '', // 漏收原因
    _friends_min_countdown = null
  /***********************
   * 综合操作
   ***********************/

  // 进入蚂蚁森林主页
  const startApp = function () {
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=60000002',
      packageName: _config.package_name
    })
    _commonFunctions.readyForAlipayWidgets()
    if (_config.is_alipay_locked) {
      sleep(1000)
      alipayUnlocker.unlockAlipay()
    }
  }

  const recordLost = function (reason) {
    _lost_someone = true
    _lost_reason = reason
  }

  /**
   * 关闭活动弹窗
   */
  const clearPopup = function () {
    // 合种/添加快捷方式提醒
    threads.start(function () {
      let floty = idEndsWith('J_pop_treedialog_close').findOne(
        _config.timeout_findOne
      )
      if (floty) {
        floty.click()
      }
    })
    threads.start(function () {

      let buttons = className('android.widget.Button')
        .desc('关闭').findOne(
          _config.timeout_findOne
        )
      if (buttons) {
        buttons.click()
      }
    })
    threads.start(function () {
      let floty = descEndsWith('关闭蒙层').findOne(_config.timeout_findOne)
      if (floty) {
        floty.click()
      }
      floty = textEndsWith('关闭蒙层').findOne(_config.timeout_findOne)
      if (floty) {
        floty.click()
      }
    })
    debugInfo('关闭蒙层成功')
  }

  // 显示文字悬浮窗
  const showFloaty = function (text) {
    _commonFunctions.closeFloatyWindow()
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
      _runningQueueDispatcher.removeRunningTask()
      engines.myEngine().forceStop()
    })
    logInfo(text)
    ui.run(function () {
      window.log.text(text)
    })
  }

  /***********************
   * 构建下次运行
   ***********************/

  // 异步获取 toast 内容
  const getToastAsync = function (filter, limit, exec) {
    limit = limit >= 6 ? 6 : limit
    filter = typeof filter == null ? '' : filter
    let lock = threads.lock()
    let complete = lock.newCondition()
    let result = []
    lock.lock()

    // 在新线程中开启监听
    let thread = threads.start(function () {
      lock.lock()
      try {
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
            if (counter >= limit) {
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
        limit = exec()
        let count = 3
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
    let temp = []
    let toasts = []
    // 先分析控件是否存在，存在直接通过控件判断倒计时
    if (target && target.exists()) {
      let ball = target.untilFind()
      debugInfo('待收取球数' + ball.length)
      toasts = getToastAsync(_config.package_name, ball.length >= 2 ? 2 : ball.length, function () {
        let screen = _commonFunctions.checkCaptureScreenPermission()
        let count = 0
        for (let i = 0; i < ball.length; i++) {
          let countDownBall = ball[i]
          let bounds = countDownBall.bounds()
          let halfHeight = parseInt(bounds.height() / 2)
          if (!images.findColor(screen, '#d1971a', {
            region: [bounds.left, bounds.top + parseInt(halfHeight / 2), bounds.right - bounds.left, halfHeight],
            threshold: _config.color_offset || 20
          })) {
            count++
          }
          automator.clickCenter(countDownBall)
          sleep(500)
          // 只需要点击两个球就够了
          if (count >= 2) {
            break
          }
        }
        // 返回实际倒计时个数，用于终止toast等待
        return count
      })
    } else {
      // 无法获取到控件 通过图像分别判断白天和晚上的倒计时球颜色数据
      let ballPoints = []
      _base_scanner.checkAndCollectByHough(true, balls => ballPoints = balls, null, null, 1)
      if (ballPoints && ballPoints.length > 0) {
        ballPoints.sort((a, b) => {
          if (a.x > b.x) {
            return 1
          } else if (a.x === b.x) {
            return 0
          } else {
            return -1
          }
        })
        debugInfo(['图像分析获取到倒计时能量球位置：{}', JSON.stringify(ballPoints)])
        toasts = getToastAsync(_config.package_name, ballPoints.length >= 2 ? 2 : ballPoints.length,
          () => {
            let count = 0
            ballPoints.forEach(point => {
              if (point.y < _config.tree_collect_top || point.y > _config.tree_collect_top + _config.tree_collect_height) {
                // 可能是左上角的活动图标 或者 识别到了其他范围的球
                return
              }
              automator.click(point.x, point.y)
              sleep(500)
              count++
            })
            // 返回实际倒计时个数, 用于终止toast等待
            return count
          }
        )
      } else {
        debugInfo('未找到能量球')
      }
    }
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
  }

  // 确定下一次收取倒计时
  const getMinCountdown = function () {
    let countDownNow = calculateMinCountdown()
    _min_countdown = isFinite(countDownNow) ? countDownNow : _min_countdown
    logInfo(['获取最终倒计时时间：{}', _min_countdown])
  }

  const peekCountdownContainer = function (container) {
    if (container) {
      return _commonFunctions.formatString('倒计时数据总长度：{} 文本属性来自[{}]', container.target.length, (container.isDesc ? 'desc' : 'text'))
    } else {
      return null
    }
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
    let friCountDownContainer = _widgetUtils.widgetGetAll('\\d+’', 1000, true)

    debugInfo('get \\d+’ container:' + peekCountdownContainer(friCountDownContainer))
    if (friCountDownContainer) {
      let isDesc = friCountDownContainer.isDesc
      friCountDownContainer.target.forEach(function (countdown) {
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
    if (_config.is_cycle) {
      if (_current_time < _config.cycle_times) {
        _has_next = true
      } else {
        logInfo("达到最大循环次数")
        _has_next = false
      }
    } else {
      // 永不终止模式，判断倒计时不存在，直接等待配置的激活时间
      if (_config.never_stop) {
        let reactiveTime = _config.getReactiveTime() || 60
        if (_commonFunctions.isEmpty(_min_countdown) || _min_countdown > reactiveTime) {
          debugInfo(['永不停止模式，已经获取倒计时[{}]大于重新激活时间，设置倒计时时间为：{}', _min_countdown, reactiveTime])
          _min_countdown = reactiveTime
        }
        _has_next = true
        return
      }
      // 计时模式，超过最大等待时间 退出执行
      if (
        _min_countdown != null &&
        _min_countdown <= _config.max_collect_wait_time
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

  /**
   * 获取当前能量值
   * 
   * @param {boolean} noStore 是否不记录当前能量值到缓存
   */
  const getCurrentEnergy = function (noStore) {
    let currentEnergyWidget = _widgetUtils.widgetGetById(_config.energy_id || 'J_userEnergy')
    let currentEnergy = undefined
    if (currentEnergyWidget) {
      let content = currentEnergyWidget.text() || currentEnergyWidget.desc()
      currentEnergy = parseInt(content.match(/\d+/))
    }
    if (!noStore && currentEnergy) {
      // 存储能量值数据
      _commonFunctions.storeEnergy(currentEnergy)
    }
    debugInfo(['getCurrentEnergy 获取能量值: {}', currentEnergy])
    return currentEnergy
  }

  // 记录初始能量值
  const getPreEnergy = function () {
    let currentEnergy = getCurrentEnergy()
    if (_fisrt_running && _has_next) {
      _pre_energy = currentEnergy
      _commonFunctions.persistHistoryEnergy(currentEnergy)
      logInfo('当前能量：' + currentEnergy)
    }
    // 初始化，避免关闭收取自己时统计成负值
    _post_energy = currentEnergy
    showCollectSummaryFloaty()
  }

  const showCollectSummaryFloaty = function (increased) {
    if (_config.is_cycle) {
      _commonFunctions.showCollectSummaryFloaty0(_post_energy - _pre_energy, _current_time, increased)
    } else {
      _commonFunctions.showCollectSummaryFloaty0(null, null, increased)
    }
  }

  // 记录最终能量值
  const getPostEnergy = function (collectedFriend) {
    if (collectedFriend) {
      debugInfo('非仅收自己，返回主页面')
      automator.back()
      _widgetUtils.homePageWaiting()
      // 二次收集自身能量
      recheckOwn()
    }
    // 等待能量值稳定
    sleep(500)
    _post_energy = getCurrentEnergy()
    logInfo('当前能量：' + _post_energy)
    _commonFunctions.showEnergyInfo()
    let energyInfo = _commonFunctions.getTodaysRuntimeStorage('energy')
    if (!_has_next) {
      showFloaty('本次共收取：' + (_post_energy - _pre_energy) + 'g 能量，累积共收取' + energyInfo.totalIncrease + 'g')
    } else {
      showCollectSummaryFloaty()
    }
    // 循环模式、或者有漏收 不返回home
    if ((!_config.is_cycle || !_has_next) && !_lost_someone) {
      automator.clickClose()
      sleep(1000)
      // 返回最小化支付宝
      _commonFunctions.minimize()
    }
  }


  // 收取能量
  const collectEnergy = function () {
    debugInfo('直接通过图像分析收取能量')
    _base_scanner.checkAndCollectByHough(true)
  }

  const checkAndNewImageBasedScanner = function () {
    if (ImgBasedFriendListScanner === null) {
      warnInfo('未加载基于图像分析的资源，重新加载')
      resolver()
      runtime.loadDex('../lib/color-region-center.dex')
      try {
        importClass(com.tony.ColorCenterCalculatorWithInterval)
      } catch (e) {
        let errorInfo = e + ''
        if (/importClass must be called/.test(errorInfo)) {
          errorInfo('请强制关闭AutoJS并重新启动', true)
          _runningQueueDispatcher.removeRunningTask()
          exit()
        }
      }
      ImgBasedFriendListScanner = require('./ImgBasedFriendListScanner.js')
    }
    return new ImgBasedFriendListScanner()
  }

  const findAndCollect = function () {
    let scanner = checkAndNewImageBasedScanner()
    scanner.init({ currentTime: _current_time, increasedEnergy: _post_energy - _pre_energy })
    let executeResult = scanner.start()
    // 执行失败 返回 true
    if (executeResult === true) {
      recordLost('收集执行失败')
    } else {
      _lost_someone = executeResult.lostSomeone
      _lost_reason = executeResult.lostReason
      _collect_any = executeResult.collectAny
      _friends_min_countdown = executeResult.minCountdown
    }
    scanner.destory()
    scanner = null
    return _lost_someone
  }

  const tryCollectByStroll = function () {
    debugInfo('尝试逛一逛收集能量')
    let scanner = new StrollScanner()
    scanner.init({ currentTime: _current_time, increasedEnergy: _post_energy - _pre_energy })
    let runResult = scanner.start()
    scanner.destory()
    if (runResult) {
      automator.back()
      _widgetUtils.homePageWaiting()
      _post_energy = getCurrentEnergy(true)
      logInfo('逛一逛结束 当前能量：' + _post_energy)
    }
  }

  const autoDetectTreeCollectRegion = function () {
    if (_config.auto_detect_tree_collect_region) {
      let treeDialog = _widgetUtils.widgetGetById('J_tree_dialog_wrap', 1000)
      let plantTree = _widgetUtils.widgetGetOne(/^\s*种树\s*$/, 1000)
      if (treeDialog && plantTree) {
        let anchorTop = plantTree.bounds().bottom
        let anchorBottom = treeDialog.bounds().top
        let marginBorder = plantTree.bounds().width()
        _config.tree_collect_left = marginBorder
        _config.tree_collect_top = parseInt(0.6 * (anchorBottom - anchorTop) + anchorTop)
        _config.tree_collect_width = parseInt(_config.device_width - 2 * marginBorder)
        _config.tree_collect_height = parseInt((anchorBottom - anchorTop) * 1.25)
        detectRegion = [_config.tree_collect_left, _config.tree_collect_top, _config.tree_collect_width, _config.tree_collect_height]
        infoLog('自动识别能量球区域：' + JSON.stringify(detectRegion))
        let configStorage = storages.create(_storage_name)
        configStorage.put('tree_collect_left', _config.tree_collect_left)
        configStorage.put('tree_collect_top', _config.tree_collect_top)
        configStorage.put('tree_collect_width', _config.tree_collect_width)
        configStorage.put('tree_collect_height', _config.tree_collect_height)
        configStorage.put('auto_detect_tree_collect_region', false)
      } else {
        warnInfo('自动识别能量球识别区域失败，未识别到对象：' + (treeDialog ? '' : '种树 ') + (plantTree ? '' : 'J_tree_dialog_wrap'))
        warnInfo('请运行config.js并手动修改能量球所在区域的配置', true)
      }
    }
  }
  /***********************
   * 主要函数
   ***********************/

  /**
   * 打开支付宝蚂蚁森林 并等待
   */
  const openAndWaitForPersonalHome = function () {
    let restartCount = 0
    let waitFlag
    let startWait = 1000
    if (!_config.is_cycle) {
      startApp()
      // 首次启动等待久一点
      sleep(1500)
    }
    while (!(waitFlag = _widgetUtils.homePageWaiting()) && restartCount++ < 5) {
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
      engines.myEngine().forceStop()
    }
    logInfo('进入个人首页成功')
    // 自动识别能量球区域
    autoDetectTreeCollectRegion()
    clearPopup()
    getPreEnergy()
  }

  // 收取自己的能量
  const collectOwn = function () {
    if (_config.not_collect_self) {
      return
    }
    _commonFunctions.addOpenPlacehold('开始收集自己能量')
    debugInfo('准备收集自己能量')
    let energyBeforeCollect = getCurrentEnergy(true)
    collectEnergy()
    // 计时模式和只收自己时都去点击倒计时能量球 避免只收自己时控件刷新不及时导致漏收
    if (!_config.is_cycle || _config.collect_self_only) {
      debugInfo('准备计算最短时间')
      getMinCountdownOwn()
    }
    _post_energy = getCurrentEnergy(true)
    let collectedEnergy = _post_energy - energyBeforeCollect
    if (collectedEnergy) {
      logInfo(['收集自己能量：{}g', collectedEnergy])
      _base_scanner.showCollectSummaryFloaty(collectedEnergy)
    }
    _commonFunctions.addClosePlacehold("收集自己的能量完毕")
    _fisrt_running = false
  }

  // 二次校验自己的能量值
  const recheckOwn = function () {
    if (_config.not_collect_self) {
      return
    }
    _commonFunctions.addOpenPlacehold('开始二次收集自己能量')
    debugInfo('准备收集自己能量')
    let energyBeforeCollect = getCurrentEnergy(true)
    collectEnergy()
    let energyAfterCollect = getCurrentEnergy(true)
    let collectedEnergy = energyAfterCollect - energyBeforeCollect
    if (collectedEnergy) {
      logInfo(['收集自己能量：{}g', collectedEnergy])
      _base_scanner.showCollectSummaryFloaty(collectedEnergy)
    }
    _commonFunctions.addClosePlacehold("二次收集自己的能量完毕")
  }

  // 收取好友的能量
  const collectFriend = function () {
    _commonFunctions.addOpenPlacehold('开始收集好友能量')
    if (_config.try_collect_by_stroll) {
      // 首先尝试逛一逛收集
      tryCollectByStroll()
    }
    automator.enterFriendList()
    let enterFlag = _widgetUtils.friendListWaiting()
    if (!enterFlag) {
      errorInfo('进入好友排行榜失败')
      recordLost('进入好友排行榜失败')
      return false
    }
    let loadedStatus = _widgetUtils.ensureRankListLoaded(3)
    if (!loadedStatus) {
      warnInfo('排行榜加载中')
    }
    debugInfo('进入好友排行榜成功')
    if (true === findAndCollect()) {
      _min_countdown = null
      _has_next = true
      _current_time = _current_time == 0 ? 0 : _current_time - 1
      errorInfo('收集好友能量失败，重新开始')
      _re_try++
      return false
    } else {
      _re_try = 0
    }
    _commonFunctions.addClosePlacehold("收集好友能量结束")
  }

  const Executor = function () {
    this.eventSettingThread = null
    this.stopListenThread = null
    this.needRestart = false
    this.setupEventListeners = function () {
      this.eventSettingThread = threads.start(function () {
        events.setMaxListeners(0)
        events.observeToast()
      })
    }

    /**
     * 监听音量上键直接关闭 音量下延迟5分钟
     */
    this.listenStopCollect = function () {
      this.interruptStopListenThread()
      this.stopListenThread = threads.start(function () {
        infoLog('即将收取能量，运行中可按音量上键关闭', true)
        events.removeAllKeyDownListeners('volume_down')
        events.observeKey()
        events.on("key_down", function (keyCode, event) {
          let stop = false
          if (keyCode === 24) {
            stop = true
            warnInfo('关闭脚本', true)
            _commonFunctions.cancelAllTimedTasks()
          } else if (keyCode === 25) {
            warnInfo('延迟五分钟后启动脚本', true)
            _commonFunctions.setUpAutoStart(5)
            stop = true
          }
          if (stop) {
            unlocker && unlocker.saveNeedRelock(true)
            _runningQueueDispatcher.removeRunningTask()
            engines.myEngine().forceStop()
            _config.resetBrightness && _config.resetBrightness()
          }
        })
      })
    }

    this.readyForStart = function () {
      callStateListener.exitIfNotIdle()
      callStateListener.enableListener()
      _runningQueueDispatcher.addRunningTask()
      // 取消定时任务
      _commonFunctions.cancelAllTimedTasks()
      if (!(images.hasOwnProperty('isDelegated') && images.isDelegated())) {
        warnInfo('图片资源代理丢失，重新启动')
        _commonFunctions.getAndUpdateDismissReason('_lost_image_delegate')
        _runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
        exit()
      } else {
        debugInfo('图片资源代理正常')
      }
      unlocker.exec()
      _commonFunctions.showDialogAndWait(true)
      this.listenStopCollect()
      _commonFunctions.showEnergyInfo()
      if (_base_scanner === null) {
        _base_scanner = new BaseScanner()
      }
    }

    this.endLoop = function () {
      callStateListener.disableListener()
      resourceMonitor.releaseAll()
      this.interruptStopListenThread()
      events.removeAllListeners('key_down')
      events.removeAllListeners('toast')
      if (_config.auto_lock === true && unlocker.needRelock() === true) {
        debugInfo('重新锁定屏幕')
        automator.lockScreen()
        unlocker.saveNeedRelock(true)
      }
      _config.resetBrightness && _config.resetBrightness()
      flushAllLogs()
      _runningQueueDispatcher.removeRunningTask()
      if (_base_scanner !== null) {
        _base_scanner.destory()
        _base_scanner = null
      }
    }

    this.interruptStopListenThread = function () {
      if (this.stopListenThread !== null) {
        this.stopListenThread.interrupt()
        this.stopListenThread = null
      }
    }

    this.endCollect = function () {
      logInfo('收取结束')
      if (this.eventSettingThread != null) {
        this.eventSettingThread.interrupt()
        this.eventSettingThread = null
      }
    }
  }

  /**
   * 循环运行
   */
  const CycleExecutor = function () {
    Executor.call(this)

    this.execute = function () {
      this.setupEventListeners()
      this.readyForStart()
      _current_time = 0
      startApp()
      // 首次启动等待久一点
      sleep(1500)
      while (true) {
        _current_time++
        _commonFunctions.showEnergyInfo(_current_time)
        // 增加当天运行总次数
        _commonFunctions.increaseRunTimes()
        infoLog("========循环第" + _current_time + "次运行========")
        showCollectSummaryFloaty()
        try {
          openAndWaitForPersonalHome()
          collectOwn()
          let runSuccess = true
          if (!_config.collect_self_only) {
            if (collectFriend() === false) {
              // 收集失败，重新开始
              _lost_someone = true
              _current_time = _current_time == 0 ? 0 : _current_time - 1
              _has_next = true
              runSuccess = false
            }
          }
          if (runSuccess) {
            generateNext()
            getPostEnergy(!_config.collect_self_only)
          }
        } catch (e) {
          errorInfo('发生异常 [' + e + ']')
          _current_time = _current_time == 0 ? 0 : _current_time - 1
          _commonFunctions.printExceptionStack(e)
          _has_next = true
          _re_try = 0
        }
        if (!_lost_someone && (_has_next === false || _re_try > 5)) {
          break
        }
        logInfo('========本轮结束========')
      }
      this.endLoop()
      this.endCollect()
      // 返回最小化支付宝
      _commonFunctions.minimize()
    }
  }

  /**
   * 计时运行
   */
  const CountdownExecutor = function () {
    Executor.call(this)

    this.doInLoop = function () {
      _min_countdown = null
      openAndWaitForPersonalHome()
      collectOwn()
      let runSuccess = true
      let executeNext = false
      if (!_config.collect_self_only) {
        do {
          _collect_any = false
          if (collectFriend() === false) {
            // 收集失败，重新开始
            _lost_someone = true
            _current_time = _current_time == 0 ? 0 : _current_time - 1
            _has_next = true
            runSuccess = false
          }
          debugInfo(['收集好友能量结束，运行状态：{} 是否收集过: {} 是否重新校验排行榜：{}', runSuccess, _collect_any, _config.recheck_rank_list])
          executeNext = runSuccess && _collect_any && _config.recheck_rank_list
          if (executeNext) {
            automator.back()
            _widgetUtils.homePageWaiting()
            _post_energy = getCurrentEnergy(true)
          }
        } while (executeNext)
      }
      if (runSuccess) {
        if (!_config.is_cycle && !_lost_someone) {
          getMinCountdown()
        }
        generateNext()
        getPostEnergy(!_config.collect_self_only)
      }
    }

    this.execute = function () {
      this.setupEventListeners()
      _current_time = 0
      while (true) {
        _collect_any = false
        if (_lost_someone) {
          warnInfo('上一次收取有漏收，再次收集', true)
          warnInfo('漏收原因：' + _lost_reason)
          automator.back()
          _commonFunctions.getAndUpdateDismissReason('lost_someone')
          _lost_someone = false
          _lost_reason = ''
          _lost_count++
          if (_lost_count >= 5) {
            warnInfo('连续漏收达到五次，可能存在不可恢复错误，重新启动脚本')
            _commonFunctions.getAndUpdateDismissReason('_lost_someone_over_limit')
            _commonFunctions.setUpAutoStart(1)
            if (_config.auto_lock === true && unlocker.needRelock() === true) {
              debugInfo('重新锁定屏幕')
              automator.lockScreen()
            }
            exit()
          }
        } else {
          debugInfo(['获取到的倒计时时间：{}', _min_countdown])
          if (_min_countdown > 0) {
            // 提前10秒左右结束计时
            let delayTime = 10 / 60.0
            // 延迟自动启动，用于防止autoJs自动崩溃等情况下导致的问题
            delayTime += (_config.delayStartTime || 5000) / 60000.0
            _commonFunctions.setUpAutoStart(_min_countdown - delayTime)
            _runningQueueDispatcher.removeRunningTask()
            // 如果不驻留悬浮窗  则不延迟，直接关闭
            if (_config.not_lingering_float_window) {
              // 展示一下悬浮窗信息 提示还剩多久启动
              _commonFunctions.showTextFloaty('脚本将在' + _min_countdown + '分钟后自动执行')
              sleep(3000)
              exit()
            } else {
              _commonFunctions.commonDelay(_min_countdown - delayTime)
            }
          }
        }
        this.readyForStart()
        let runTime = _commonFunctions.increaseRunTimes()
        infoLog("========第" + runTime + "次运行========")
        showCollectSummaryFloaty()
        debugInfo('展示悬浮窗完毕')
        _current_time++
        if (_config.develop_mode) {
          this.doInLoop()
        } else {
          try {
            this.doInLoop()
          } catch (e) {
            errorInfo('发生异常 [' + e + ']')
            recordLost('发生异常 [' + e + ']')
            _commonFunctions.printExceptionStack(e)
            _current_time = _current_time == 0 ? 0 : _current_time - 1
            _lost_someone = true
            _min_countdown = null
            _has_next = true
            _re_try = 0
          }
        }
        // 当前没有遗漏 准备结束当前循环
        if (!_lost_someone) {
          _lost_count = 0
          this.endLoop()
          if (_has_next === false || _re_try > 5) {
            break
          }
        }
        logInfo('========本轮结束========')
      }
      this.endCollect()
    }
  }

  return {
    exec: function () {
      let executor = null
      if (_config.is_cycle) {
        executor = new CycleExecutor()
      } else {
        executor = new CountdownExecutor()
      }
      executor.execute()
    }
  }
}

module.exports = new Ant_forest()
