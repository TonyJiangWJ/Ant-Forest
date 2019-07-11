/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-07-04 00:10:11
 * @Description: 蚂蚁森林操作集
 */

function Ant_forest(automator, unlock) {
  const _automator = automator,
    _unlock = unlock,
    _config = storages.create("ant_forest_config"),
    _package_name = "com.eg.android.AlipayGphone";

  let _pre_energy = 0,       // 记录收取前能量值
    _post_energy = 0,      // 记录收取后能量值
    _timestamp = 0,        // 记录获取自身能量倒计时
    _min_countdown = 0,    // 最小可收取倒计时
    _current_time = 0,     // 当前收集次数
    _fisrt_running = true, // 是否第一次进入蚂蚁森林
    _has_next = true,      // 是否下一次运行
    _avil_list = [],       // 可收取好友列表
    reTry = 0,              // 重试次数
    _collect_any = false    // 是否收集过

  /***********************
   * 综合操作
   ***********************/

  // 进入蚂蚁森林主页
  const _start_app = function () {
    app.startActivity({
      action: "VIEW",
      data: "alipays://platformapi/startapp?appId=60000002",
    });
  }

  // 关闭提醒弹窗
  const _clear_popup = function () {
    // 合种/添加快捷方式提醒
    threads.start(function () {
      let popup = idEndsWith("J_pop_treedialog_close").findOne(_config.get("timeout_findOne"));
      if (popup) popup.click();
    });
    // 活动
    threads.start(function () {
      let popup = descEndsWith("关闭蒙层").findOne(_config.get("timeout_findOne"));
      if (popup) popup.click();
    });
  }

  // 显示文字悬浮窗
  const _show_floaty = function (text) {
    commonFunctions.closeFloatyWindow()
    let window = floaty.window(
      <card cardBackgroundColor="#aa000000" cardCornerRadius="20dp">
        <horizontal w="250" h="40" paddingLeft="15" gravity="center">
          <text id="log" w="180" h="30" textSize="12dp" textColor="#ffffff" layout_gravity="center" gravity="left|center"></text>
          <card id="stop" w="30" h="30" cardBackgroundColor="#fafafa" cardCornerRadius="15dp" layout_gravity="right|center" paddingRight="-15">
            <text w="30" h="30" textSize="16dp" textColor="#000000" layout_gravity="center" gravity="center">×</text>
          </card>
        </horizontal>
      </card>
    );
    window.stop.on("click", () => {
      exit()
    });
    ui.run(function () {
      window.log.text(text)
    })
    // 30秒后关闭，防止立即停止
    setTimeout(() => {
      exit()
    }, 1000 * 30)
  }

  // 异步获取 toast 内容
  const _get_toast_async = function (filter, limit, exec) {
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
            warnInfo('无法获取toast内容，直接返回[]')
            toastDone = true
          }
        })
        // 触发 toast
        exec()
        let count = 10
        // 主线程等待10秒 超时退出等待
        while (count-- > 0 && !toastDone) {
          sleep(1000)
        }
        if (!toastDone) {
          errorInfo('超时释放锁')
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
  /***********************
   * 获取下次运行倒计时
   ***********************/

  // 获取自己的能量球中可收取倒计时的最小值
  const _get_min_countdown_own = function () {
    let target
    if (className('Button')
      .descMatches(/\s/).exists()) {
      target = className('Button')
        .descMatches(/\s/)
        .filter(function (obj) {
          return obj.bounds().height() / obj.bounds().width() > 1.05
        })
    } else if (className('Button')
      .textMatches(/\s/).exists()) {
      target = className('Button')
        .textMatches(/\s/)
        .filter(function (obj) {
          return obj.bounds().height() / obj.bounds().width() > 1.05
        })
    }
    if (target && target.exists()) {
      let ball = target.untilFind();
      let temp = [];
      debugInfo('待收取球数' + ball.length)
      let toasts = _get_toast_async(_package_name, ball.length, function () {
        ball.forEach(function (obj) {
          debugInfo("触发能量球toast" + obj.bounds())
          _automator.clickCenter(obj);
          sleep(500);
        });
      });
      toasts.forEach(function (toast) {
        let countdown = toast.match(/\d+/g);
        if (countdown !== null && countdown.length >= 2) {
          temp.push(countdown[0] * 60 - -countdown[1])
        } else {
          errorInfo('获取倒计时错误：' + countdown)
        }
      });
      _min_countdown = Math.min.apply(null, temp);
      _timestamp = new Date();
    } else {
      _min_countdown = null;
      warnInfo("无可收取能量");
    }
  }
  // 确定下一次收取倒计时
  const getMinCountdown = function () {
    let countDownNow = calculateMinCountdown()
    // 如果有收集过能量，那么先返回主页在进入排行榜，以获取最新的倒计时信息，避免收集过的倒计时信息不刷新，此过程可能导致执行过慢
    if (_collect_any) {
      if (!isFinite(countDownNow) || countDownNow >= 2) {
        debugInfo('收集过能量，重新获取倒计时列表, 当前获取的倒计时[' + countDownNow + ']')
        // 返回首页并重新进入好友列表 获取新刷新的倒计时数据
        clickBack()
        WidgetUtils.homePageWaiting()
        enterFriendList()
        WidgetUtils.friendListWaiting()
        WidgetUtils.loadFriendList()
        // 再次获取倒计时数据
        let newCountDown = calculateMinCountdown(countDownNow, new Date())
        debugInfo('二次获取倒计时数据[' + newCountDown + ']')
        if (isFinite(countDownNow)) {
          countDownNow = isFinite(newCountDown) && newCountDown < countDownNow ? newCountDown : countDownNow
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
    debugInfo('记录最终倒计时数据[' + _min_countdown + ']')
  }

  const calculateMinCountdown = function (lastMin, lastTimestamp) {
    let temp = []
    if (isFinite(_min_countdown) && _timestamp instanceof Date) {
      debugInfo('已记录自身倒计时：' + countdown_own + '分')
      let passedTime = Math.round((new Date() - _timestamp) / 60000)
      let countdown_own = _min_countdown - passedTime
      debugInfo('本次收集经过了：' + passedTime + '分，最终记录自身倒计时：' + countdown_own + '分')
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
    let min = Math.min.apply(null, temp)
    debugInfo('获取最小倒计时[' + min + ']分')
    return min
  }

  /***********************
   * 构建下次运行操作
   ***********************/

  // 构建下一次运行
  const _generate_next = function () {
    if (_config.get("is_cycle")) {
      if (_current_time < _config.get("cycle_times")) {
        _has_next = true;
      } else {
        _has_next = false;
      }
    } else {
      if (_config.get('never_stop')) {
        _has_next = true
        let reactiveTime = _config.get('reactive_time') || 30
        if (_min_countdown == null || _min_countdown == '' || _min_countdown >= reactiveTime) {
          warnInfo('获取倒计时时间[' + _min_countdown + ']大于设定的[' + reactiveTime + ']分钟')
          _min_countdown = reactiveTime
        }
      } else {
        let max_collect_wait_time = _config.get("max_collect_wait_time") || 20
        if (_min_countdown != null && _min_countdown <= max_collect_wait_time) {
          _has_next = true;
        } else {
          if (_min_countdown > max_collect_wait_time) {
            infoLog('倒计时等待时间[' + _min_countdown + ']大于配置的最大等待时间[' + max_collect_wait_time + ']')
          }
          _has_next = false;
        }
      }
    }
  }

  /***********************
   * 记录能量
   ***********************/

  // 记录当前能量
  const _get_current_energy = function () {
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
  const _get_pre_energy = function () {
    let cur = _get_current_energy()
    if (_fisrt_running) {
      _pre_energy = cur
    }
    logInfo("当前能量：" + cur, true);
    showCollectSummaryFloaty()

  }

  // 记录最终能量值
  const _get_post_energy = function () {
    clickBack()
    WidgetUtils.homePageWaiting()
    // 等待能量增加
    sleep(400)
    _post_energy = _get_current_energy();
    logInfo("当前能量：" + _post_energy);
    commonFunctions.showEnergyInfo()
    let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
    if (!_has_next) {
      _show_floaty("本次共收取：" + (_post_energy - _pre_energy) + "g 能量，今日累积收取" + energyInfo.totalIncrease + "g 能量");
    } else {
      showCollectSummaryFloaty()
    }
    if (!_config.get('is_cycle')) {
      clickClose()
      home();
    }
  }

  /***********************
   * 收取能量
   ***********************/

  // 收取能量
  const _collect = function (isOwn) {
    let regex = _config.get('collectable_energy_ball_content') || /.*克/
    let ballCheckContainer = WidgetUtils.widgetGetAll(regex, null, true)
    if (ballCheckContainer !== null) {
      debugInfo('能量球存在')
      ballCheckContainer.target
        .forEach(function (energy_ball) {
          debugInfo(ballCheckContainer.isDesc ? energy_ball.desc() : energy_ball.text())
          _automator.clickCenter(energy_ball)
          sleep(300)
          if (!isOwn) {
            _collect_any = true
          }
        })
    } else {
      debugInfo('无能量球可收取')
    }
  }

  // 收取能量同时帮好友收取
  const _collect_and_help = function (needHelp) {
    // 收取好友能量
    _collect();
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
      let energyBallColors = _config.get('help_energy_ball_color') || ['#f99236']
      energyBalls.forEach(function (ball) {
        let x = ball.bounds().left,
          y = ball.bounds().top,
          w = ball.bounds().width(),
          h = ball.bounds().height(),
          t = _config.get("color_offset");
        for (let i = 0; i < energyBallColors.length; i++) {
          let color = energyBallColors[i]
          if (images.findColor(screen, color, { region: [x, y, w, h], threshold: t })) {
            debugInfo('帮助好友收取能量球，匹配颜色:' + color)
            _automator.clickCenter(ball);
            helped = true
            _collect_any = true
            sleep(250);
            break;
          }
        }
      });
      if (!helped && needHelp) {
        warnInfo('未匹配到帮助收取能量球，建议增加颜色组，当前颜色组' + energyBallColors)
      }
      // 当数量大于等于6且帮助收取后，重新进入
      if (helped && length >= 6) {
        debugInfo('帮助好友收取过能量，且能量球有6个可以重新进入收取')
        return true
      }
    }

  }

  // 判断是否可收取
  const _is_obtainable = function (obj, screen) {
    let container = {
      fri: obj,
      isHelp: false,
      name: WidgetUtils.getFriendsName(obj),
      canDo: false
    }
    let len = obj.childCount();
    let x = obj.child(len - 3).bounds().right,
      y = obj.bounds().top,
      w = 5,
      h = obj.bounds().height() - 10,
      t = _config.get("color_offset");
    if (h > 0 && !obj.child(len - 2).childCount()) {
      if (_config.get("help_friend")) {
        if (
          images.findColor(screen, "#1da06a", { region: [x, y, w, h], threshold: t }) || images.findColor(screen, "#f99236", { region: [x, y, w, h], threshold: t })
        ) {
          // 可收取
          container.canDo = true
        }
      } else if (
        images.findColor(screen, "#1da06a", { region: [x, y, w, h], threshold: t })
      ) {
        // 可帮助收取
        container.canDo = true
        container.isHelp = true
      }
    }
    return container
  }

  // 记录好友信息
  const _record_avil_list = function (container) {
    let temp = {}
    // 记录可收取对象
    temp.target = container.bounds
    // 记录好友ID
    temp.name = container.name
    if (commonFunctions.checkIsProtected(temp.name)) {
      // 记录是否有保护罩
      temp.protect = true
      warnInfo('[' + temp.name + ']有记录保护罩，不将其放入待收取列表')
      return
    }
    // 记录是否是帮助收取
    temp.isHelp = container.isHelp
    // 不在白名单的 添加到可收取列表
    if (_config.get("white_list").indexOf(temp.name) < 0) {
      _avil_list.push(temp)
    }
  }

  // 判断并记录保护罩
  const _record_protected = function (toast) {
    if (toast.indexOf("能量罩") > 0) {
      let title = textContains("的蚂蚁森林").findOne(_config.get("timeout_findOne")).text();
      let name = title.substring(0, title.indexOf('的'))
      warnInfo('[' + name + ']有保护罩罩着，将信息记录今日不再收取ta')
      commonFunctions.addNameToProtect(name)
    }
  }

  // 检测能量罩
  const _protect_detect = function (filter) {
    filter = (typeof filter == null) ? "" : filter;
    // 在新线程中开启监听
    return threads.start(function () {
      events.onToast(function (toast) {
        if (toast.getPackageName().indexOf(filter) >= 0) _record_protected(toast.getText());
      });
    });
  }

  // 收集目标好友能量
  const _collect_target_friend = function (obj) {
    // 帮助好友后如果帮助前能量球有6个则重新进来检测收取，新能量球有可能刷新出来
    let rentery = false
    if (!obj.protect) {
      let temp = _protect_detect(_package_name);
      debugInfo('等待进入好友[' + obj.name + ']主页, bounds:' + obj.target)
      _automator.click(obj.target.centerX(), obj.target.centerY());
      let restartLoop = false
      let count = 1
      while (!WidgetUtils.friendHomeWaiting()) {
        debugInfo('未能进入主页，尝试再次进入 count:' + count++)
        _automator.click(obj.target.centerX(), obj.target.centerY())
        sleep(1000)
        let maxRetryTime = _config.get('maxRetryTime') || 5
        if (count > maxRetryTime) {
          warnInfo('重试超过' + maxRetryTime + '次，取消操作')
          restartLoop = true
          break
        }
      }
      if (restartLoop) {
        errorInfo('进入好友页面流程出错，重新开始', true)
        return false
      }
      debugInfo('准备开始收取好友能量')
      if (_config.get("help_friend")) {
        rentery = _collect_and_help(obj.isHelp);
      } else {
        _collect();
      }
      _automator.back();
      temp.interrupt();
      debugInfo('收取好友能量完毕，回到排行榜')
      let returnCount = 0
      while (!WidgetUtils.friendListWaiting()) {
        sleep(1000)
        if (returnCount++ === 2) {
          // 等待两秒后再次触发返回
          _automator.back();
        }
        if (returnCount > 5) {
          errorInfo('返回好友排行榜失败，重新开始')
          return false
        }
      }
      // 如果需要重进则再次调用收取好友
      if (rentery) {
        obj.isHelp = false
        return _collect_target_friend(obj)
      }
      return true
    }
  }

  // 根据可收取列表收取好友
  const _collect_avil_list = function () {
    while (_avil_list.length) {
      let obj = _avil_list.shift();
      if (!_collect_target_friend(obj)) {
        errorInfo('收集好友[' + obj.name + ']能量时出错, 重新开始')
        return false
      }

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
  const _find_and_collect = function () {
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
          let loadMoreContent = _config.get('load_more_ui_content') || '查看更多'
          let noMoreContent = _config.get('no_more_ui_content') || '没有更多了'
          if ((more.desc().match(noMoreContent) || more.text().match(noMoreContent))) {
            debugInfo('发现没有更多按钮，获取好友列表')
            // 加载完之后立即获取好友列表
            while (!gettingAtomic.compareAndSet(FREE_STATUS, GETTING_FRIENDS)) {
              // wait
              sleep(10)
            }
            friends_list = WidgetUtils.getFriendList()
            gettingAtomic.compareAndSet(GETTING_FRIENDS, FREE_STATUS)
            sleep(100)
            let listLength = whetherFriendListValidLength(friends_list)
            if (listLength) {
              // 设置当前状态为已加载完成
              debugInfo('找到了没有更多 old atomic status:[' + atomic.getAndSet(LOADED_STATUS) + ']')
              infoLog('预加载好友列表完成，耗时[' + (new Date().getTime() - preLoadStart) + ']ms 列表长度：' + listLength, true, true)
              // 动态修改预加载超时时间
              let dynamicTimeout = listLength * 30
              _config.put('timeoutLoadFriendList', dynamicTimeout)
              debugInfo('动态修改预加载超时时间为：' + dynamicTimeout + ' 设置完后缓存数据为：' + _config.get('timeoutLoadFriendList'))
            }
          } else if ((more.desc().match(loadMoreContent) || more.text().match(loadMoreContent))){
            debugInfo('点击加载更多，热身中 速度较慢')
            more.click()
          } else {
            debugInfo('find target j_rank_list_more but desc/text is :' + more.desc() + ', ' + more.text())
          }
        }

        if (!atomic.compareAndSet(LOADING_STATUS, FREE_STATUS)) {
          debugInfo('更新预加载状态失败old status：' + atomic.get())
        }
        sleep(150)
      }
    })
    let preGetFriendListThread = threads.start(function () {
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
          debugInfo('预获取好友列表线程发现列表已展开完毕 gettingAtomic.status:' + gettingAtomic.getAndSet(FREE_STATUS))
          break
        }
        friends_list = WidgetUtils.getFriendList()
        if (whetherFriendListValidLength(friends_list)) {
          friendListAtomic.compareAndSet(USED_STATUS, UPDATED_STATUS)
        }
        gettingAtomic.compareAndSet(GETTING_FRIENDS, FREE_STATUS)
        sleep(100)
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
                let container = _is_obtainable(fri, screen)
                if (container.canDo) {
                  container.bounds = bounds
                  _record_avil_list(container)
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
            //debugInfo('invisible 不在视野范围' + idx)
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
          if (false == _collect_avil_list()) {
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
      scrollDown0(_config.get('scroll_down_speed') || 200)
      debugInfo('进入下一页, 本页耗时：[' + (new Date().getTime() - pageStartPoint) + ']ms')
      debugInfo('add [' + lastCheckFriend + '] into queue')
      commonFunctions.pushQueue(queue, QUEUE_SIZE, lastCheckFriend)
    } while (
      atomic.get() !== LOADED_STATUS || lastCheckFriend < totalVaildLength && commonFunctions.getQueueDistinctSize(queue) > 1
    )
    commonFunctions.addClosePlacehold(">>>><<<<")
    logInfo('全部好友收集完成, last:' + lastCheckFriend + ' length:' + totalVaildLength + ' queueSize:' + commonFunctions.getQueueDistinctSize(queue))
    loadThread.interrupt()
    preGetFriendListThread.interrupt()
  }




  /*********控件操作***********/

  const scrollDown0 = function (speed) {
    let millis = speed || 500
    let deviceHeight = device.height || 1900
    let bottomHeight = _config.get('bottomHeight') || 100
    swipe(400, deviceHeight - bottomHeight, 600, 200, millis)
  }

  const clickBack = function () {
    let clicked = false
    if (descEndsWith('返回').exists()) {
      descEndsWith('返回')
        .findOne(_config.get("timeout_findOne"))
        .click()
      clicked = true
    } else if (textEndsWith('返回').exists()) {
      textEndsWith('返回')
        .findOne(_config.get("timeout_findOne"))
        .click()
      clicked = true
    }
    sleep(200)
    debugInfo(clicked ? '未点击返回' : '点击了返回')
    return clicked
  }


  const clickClose = function () {
    let clicked = false
    if (descEndsWith('关闭').exists()) {
      descEndsWith('关闭')
        .findOne(_config.get("timeout_findOne"))
        .click()
      clicked = true
    } else if (textEndsWith('关闭').exists()) {
      textEndsWith('关闭')
        .findOne(_config.get("timeout_findOne"))
        .click()
      clicked = true
    }
    sleep(200)
    debugInfo(clicked ? '未点击关闭' : '点击了关闭')
    return clicked
  }

  const enterFriendList = function () {
    if (descEndsWith('查看更多好友').exists()) {
      descEndsWith('查看更多好友')
        .findOne(_config.get("timeout_findOne"))
        .click()
    } else if (textEndsWith('查看更多好友').exists()) {
      textEndsWith('查看更多好友')
        .findOne(_config.get("timeout_findOne"))
        .click()
    }
    sleep(200)
  }
  /*********控件操作***********/
  /**
   * 显示mini悬浮窗
   * @param {*} increased
   */
  const showCollectSummaryFloaty = function (increased) {
    increased = increased || 0
    let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
    let runTimes = commonFunctions.getTodaysRuntimeStorage('runTimes')
    let content = '第 ' + runTimes.runTimes + ' 次运行, 累计已收集:' + ((energyInfo.totalIncrease || 0) + increased) + 'g'
    commonFunctions.showMiniFloaty(content)
  }

  // 监听音量上键结束脚本运行
  const _listen_stop = function () {
    threads.start(function () {
      toast("即将收取能量，按音量上键停止");
      events.observeKey();
      events.onceKeyDown("volume_up", function (event) {
        engines.stopAll();
        exit();
      });
    });
  };

  /***********************
   * 主要函数
   ***********************/

  // 收取自己的能量
  const _collect_own = function () {
    // 首先启动蚂蚁森林，然后开始等待背包
    _start_app();
    // 首次启动等待时间加长
    let firstDelay = 8000
    logInfo("开始收集自己能量");
    // 重试次数
    let retry = 0
    // 判断是否进入成功
    let enteredFlag
    while (!(enteredFlag = WidgetUtils.homePageWaiting(firstDelay)) && ++retry <= (_config.get('maxRetryTime') || 3)) {
      firstDelay = 6000
      warnInfo('进入个人主页失败, 关闭H5重进')
      if (!clickClose() && !clickBack()) {
        _automator.back()
      }
      sleep(1500)
      _start_app()
    }
    if (!enteredFlag && retry >= (_config.get('maxRetryTime') || 3)) {
      errorInfo('打开森林失败 退出脚本', true)
      exit()
    }
    _clear_popup();
    _get_pre_energy();
    _collect();
    if (!_config.get("is_cycle")) _get_min_countdown_own();
    _fisrt_running = false;
  }

  // 收取好友的能量
  const _collect_friend = function () {
    commonFunctions.addOpenPlacehold('开始收集好友能量')
    enterFriendList()
    let enterFlag = WidgetUtils.friendListWaiting()
    if (!enterFlag) {
      errorInfo('进入排行榜失败重新开始', true)
      return false
    }
    if (false == _find_and_collect()) {
      _min_countdown = 0
      _has_next = true
      _current_time = _current_time == 0 ? 0 : _current_time - 1
      errorInfo('收集好友能量失败，重新开始', true)
      // 重试次数+1
      reTry++
      return false
    } else {
      // 重置失败次数
      reTry = 0
    }
    if (!_config.get("is_cycle")) getMinCountdown();
    commonFunctions.addClosePlacehold("收集好友能量结束")
    _generate_next();
    _get_post_energy();
  }


  return {
    exec: function () {
      let thread = threads.start(function () {
        events.setMaxListeners(0);
        events.observeToast();
      });
      while (true) {
        _collect_any = false
        if (_min_countdown > 0) {
          commonFunctions.setUpAutoStart(_min_countdown)
          commonFunctions.commonDelay(_min_countdown)
        }
        commonFunctions.showEnergyInfo()
        let currentRunTime = commonFunctions.increaseRunTimes()
        // 内置运行次数统计
        ++_current_time
        _listen_stop();
        logInfo("今日第 " + currentRunTime + " 次运行, 本次执行第" + _current_time + "次");
        showCollectSummaryFloaty()
        _unlock.exec();
        _collect_own();
        _collect_friend();
        if (_config.get("is_cycle")) sleep(1000);
        events.removeAllListeners();
        if (_has_next == false || reTry > (_config.get('maxRetryTime') || 5)) {
          logInfo("收取结束");
          break;
        }
        logInfo('>>>>>>>>本轮结束<<<<<<<<')
      }
      thread.interrupt();
    }
  }
}

module.exports = Ant_forest;
