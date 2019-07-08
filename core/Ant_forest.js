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
    reTry = 0              // 重试次数

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
  const _get_min_countdown = function () {
    let temp = [];
    if (_min_countdown && _timestamp instanceof Date) {
      let countdown_own = _min_countdown - Math.floor((new Date() - _timestamp) / 60000);
      countdown_own >= 0 ? temp.push(countdown_own) : temp.push(0);
    }
    if (descEndsWith("’").exists()) {
      descEndsWith("’").untilFind().forEach(function (countdown) {
        let countdown_fri = parseInt(countdown.desc().match(/\d+/));
        temp.push(countdown_fri);
      });
    } else if (textEndsWith('’').exists()) {
      textEndsWith('’')
        .untilFind()
        .forEach(function (countdown) {
          let countdown_fri = parseInt(countdown.text().match(/\d+/))
          temp.push(countdown_fri)
        })
    }
    if (!temp.length) return;
    _min_countdown = Math.min.apply(null, temp);
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
          warnInfo('获取倒计时时间[' + _min_countdown + ']大于设定的[' + _min_countdown + ']分钟')
          _min_countdown = reactiveTime
        }
      } else {
        if (_min_countdown != null && _min_countdown <= _config.get("max_collect_wait_time")) {
          _has_next = true;
        } else {
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
  const _collect = function () {
    let ballCheckContainer = WidgetUtils.widgetGetAll(config.collectable_energy_ball_content || /.*克/, null, true)
    if (ballCheckContainer !== null) {
      debugInfo('能量球存在')
      ballCheckContainer.target
        .forEach(function (energy_ball) {
          debugInfo(ballCheckContainer.isDesc ? energy_ball.desc() : energy_ball.text())
          _automator.clickCenter(energy_ball)
          sleep(300)
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
        let maxRetryTime = config.get('maxRetryTime') || 5
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

  // 识别可收取好友并记录
  const _find_and_collect = function () {
    let lastCheckFriend = -1
    let friendListLength = -2
    let totalVaildLength = 0
    debugInfo('加载好友列表')
    let isPreloadTimeout = WidgetUtils.loadFriendList()
    if (!WidgetUtils.friendListWaiting()) {
      errorInfo('崩了 当前不在好友列表 重新开始')
      return false
    }
    commonFunctions.addOpenPlacehold("<<<<>>>>")
    let errorCount = 0
    let friends_list = null
    if (!isPreloadTimeout) {
      debugInfo('预加载成功，获取好友列表')
      friends_list = WidgetUtils.getFriendList()
    }
    do {
      WidgetUtils.waitRankListStable()
      let screen = null
      commonFunctions.waitFor(function () {
        screen = captureScreen()
      }, 500)
      if (!screen) {
        errorCount++
        if (errorCount >= 5) {
          errorInfo('获取截图失败多次, 操作失败')
          return false
        }
        warnInfo('获取截图失败 再试一次')
        continue
      }
      if (isPreloadTimeout || !friends_list) {
        debugInfo((isPreloadTimeout ? '预加载失败' : '获取好友列表失败') + ', 在循环中获取好友列表')
        friends_list = WidgetUtils.getFriendList()
      }
      debugInfo('判断好友信息')
      if (friends_list && friends_list.children) {
        friendListLength = friends_list.children().length
        debugInfo(
          '读取好友列表完成，开始检查可收取列表 列表长度:' + friendListLength
        )
        friends_list.children().forEach(function (fri, idx) {
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
              } else {
                debugInfo('不在视野范围' + idx + ' name:' + WidgetUtils.getFriendsName(fri))
                totalVaildLength = idx + 1
              }
            } else {
              debugInfo('不符合好友列表条件 childCount:' + fri.childCount() + ' index:' + idx)
            }
          } else {
            //debugInfo('invisible 不在视野范围' + idx)
            totalVaildLength = idx + 1
          }
        })
        debugInfo(
          '可收取列表获取完成 校验数量' + lastCheckFriend + '，开始收集 待收取列表长度:' + _avil_list.length
        )
        if (false == _collect_avil_list()) {
          errorInfo('流程出错 向上抛出')
          return false
        }
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
      scrollDown0(200)
      debugInfo('进入下一页')
    } while (
      lastCheckFriend < totalVaildLength
    )
    commonFunctions.addClosePlacehold(">>>><<<<")
    logInfo('全部好友收集完成, last:' + lastCheckFriend + ' length:' + totalVaildLength)
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
    logInfo("开始收集自己能量");
    // 重试次数
    let retry = 0
    // 判断是否进入成功
    let enteredFlag
    while (!(enteredFlag = WidgetUtils.homePageWaiting()) && ++retry <= (_config.get('maxRetryTime') || 3)) {
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
    if (!_config.get("is_cycle")) _get_min_countdown();
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
      }
      thread.interrupt();
    }
  }
}

module.exports = Ant_forest;
