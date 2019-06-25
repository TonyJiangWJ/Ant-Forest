/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-04-01 14:15:55
 * @Description: 蚂蚁森林操作集
 */

function Ant_forest(automator, unlock, config) {
  const _automator = automator,
    _unlock = unlock,
    _config = config,
    _package_name = 'com.eg.android.AlipayGphone'

  let _pre_energy = 0, // 记录收取前能量值
    _post_energy = 0, // 记录收取后能量值
    _timestamp = 0, // 记录获取自身能量倒计时
    _min_countdown = 0, // 最小可收取倒计时
    _current_time = 0, // 当前收集次数
    _fisrt_running = true, // 是否第一次进入蚂蚁森林
    _has_next = true, // 是否下一次运行
    _avil_list = [], // 可收取好友列表
    _has_protect = [], // 开启能量罩好友
    _collect_any = false, // 收集过能量
    reTry = 0
  /***********************
   * 综合操作
   ***********************/

  // 进入蚂蚁森林主页
  const _start_app = function () {
    commonFunctions.log("启动支付宝应用")
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=60000002',
      packageName: _package_name
    })
  }

  // 关闭提醒弹窗
  const _clear_floty = function () {
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

      let buttons = className("android.widget.Button")
        .desc("关闭").findOne(
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
    commonFunctions.debug('关闭蒙层成功')
  }

  // 显示文字悬浮窗
  const _show_floaty = function (text) {
    floaty.closeAll()
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
      //engines.stopAll()
    })
    commonFunctions.log(text)
    setTimeout(() => {
      ui.run(function () {
        window.log.text(text)
      })
    }, 10)
    // 30秒后关闭，防止立即停止
    setTimeout(() => { }, 1000 * 30)
  }

  /***********************
   * 构建下次运行
   ***********************/

  // 同步获取 toast 内容
  const _get_toast_sync = function (filter, limit, exec) {
    filter = typeof filter == null ? '' : filter
    let messages = threads.disposable()
    // 在新线程中开启监听
    let thread = threads.start(function () {
      let temp = []
      let counter = 0
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
            messages.setAndNotify(temp)
          } else if (new Date().getTime() - startTimestamp > 5000) {
            commonFunctions.log('等待超过五秒钟，直接返回结果')
            messages.setAndNotify(temp)
          }
        } else {
          commonFunctions.log('无法获取toast内容，直接返回[]')
          messages.setAndNotify(temp)
        }
      })
      // 触发 toast
      exec()
    })
    // 获取结果
    commonFunctions.debug("阻塞等待toast结果")
    let result = messages.blockedGet()
    commonFunctions.debug("获取toast结果成功：" + result)
    thread.interrupt()
    return result
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
      let ball = target.untilFind()
      let temp = []
      commonFunctions.debug('待收取球数' + ball.length)
      let toasts = _get_toast_async(_package_name, ball.length, function () {
        ball.forEach(function (obj) {
          _automator.clickCenter(obj)
          sleep(500)
        })
      })
      toasts.forEach(function (toast) {
        let countdown = toast.match(/\d+/g)
        if (countdown !== null && countdown.length >= 2) {
          temp.push(countdown[0] * 60 - -countdown[1])
        } else {
          commonFunctions.debug("获取倒计时错误：" + countdown)
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
  const _get_min_countdown = function () {
    let countDownNow = calculateMinCountdown()
    // 如果有收集过能量，那么先返回主页在进入排行榜，以获取最新的倒计时信息，避免收集过的倒计时信息不刷新，此过程可能导致执行过慢
    if (_collect_any) {
      if (!countDownNow || countDownNow >= 2) {
        commonFunctions.debug("收集过能量，重新获取倒计时列表")
        _automator.clickBack()
        homePageWaiting()
        _automator.enterFriendList()
        friendListWaiting()
        quickScrollDown()
        // 再次获取倒计时数据
        countDownNow = calculateMinCountdown()
      } else {
        commonFunctions.debug("当前倒计时时间短，无需再次获取")
      }
    } else {
      commonFunctions.debug("未收集能量直接获取倒计时列表")
    }
    _min_countdown = countDownNow
  }

  const calculateMinCountdown = function () {
    let temp = []
    if (_min_countdown && _timestamp instanceof Date) {
      commonFunctions.debug("已记录自身倒计时：" + countdown_own + "分")
      let passedTime = Math.round((new Date() - _timestamp) / 60000)
      let countdown_own = _min_countdown - passedTime
      commonFunctions.debug("本次收集经过了：" + passedTime + "分，最终记录自身倒计时：" + countdown_own + "分")
      countdown_own >= 0 ? temp.push(countdown_own) : temp.push(0)
    }
    if (descEndsWith('’').exists()) {
      descEndsWith('’')
        .untilFind()
        .forEach(function (countdown) {
          let countdown_fri = parseInt(countdown.desc().match(/\d+/))
          temp.push(countdown_fri)
        })
    } else if (textEndsWith('’').exists()) {
      textEndsWith('’')
        .untilFind()
        .forEach(function (countdown) {
          let countdown_fri = parseInt(countdown.text().match(/\d+/))
          temp.push(countdown_fri)
        })
    }
    if (temp.length === 0) {
      return
    }
    return Math.min.apply(null, temp)
  }


  // 构建下一次运行
  const _generate_next = function () {
    // 循环模式，判断循环次数
    if (_config.is_cycle) {
      if (_current_time < _config.cycle_times) {
        _has_next = true
      } else {
        _has_next = false
      }
    } else {
      // 永不终止模式，判断倒计时不存在，直接等待配置的激活时间
      if (_config.never_stop) {
        if (commonFunctions.isEmpty(_min_countdown) || _min_countdown > _config.reactive_time) {
          _min_countdown = _config.reactive_time || 60
        }
        _has_next = true
        return
      }
      // 计时模式 超过最大循环次数 退出执行
      if (_current_time > _config.max_collect_repeat) {
        _has_next = false
        return
      }
      // 计时模式，超过最大等待时间 退出执行
      if (
        _min_countdown != null &&
        _min_countdown <= _config.max_collect_wait_time
      ) {
        _has_next = true
      } else {
        _has_next = false
      }
    }
  }

  // 按分钟延时
  const _delay = function (minutes) {
    commonFunctions.common_delay(minutes)
  }

  /***********************
   * 记录能量
   ***********************/

  // 记录当前能量
  const _get_current_energy = function () {
    let currentEnergy
    if (descEndsWith('背包').exists()) {
      currentEnergy = parseInt(
        descEndsWith('g')
          .findOne(_config.timeout_findOne)
          .desc()
          .match(/\d+/)
      )
    } else if (textEndsWith('背包').exists()) {
      currentEnergy = parseInt(
        textEndsWith('g')
          .findOne(_config.timeout_findOne)
          .text()
          .match(/\d+/)
      )
    }
    // 存储能量值数据
    commonFunctions.storeEnergy(currentEnergy)
    return currentEnergy
  }

  // 记录初始能量值
  const _get_pre_energy = function () {
    let currentEnergy = _get_current_energy()
    if (_fisrt_running && _has_next) {
      _pre_energy = currentEnergy
      commonFunctions.persitst_history_energy(currentEnergy)
      commonFunctions.log('当前能量：' + currentEnergy)
    } else {
      let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
      let runTimes = commonFunctions.getTodaysRuntimeStorage('runTimes')
      let sum = currentEnergy - energyInfo.startEnergy
      let content = "第 " + runTimes.runTimes + " 次运行, 累计收集:" + sum + "g"
      commonFunctions.log(content)
      commonFunctions.show_temp_floaty(content)
    }
  }

  // 记录最终能量值
  const _get_post_energy = function () {

    _automator.clickBack()
    homePageWaiting()
    _post_energy = _get_current_energy()
    commonFunctions.log('当前能量：' + _post_energy)
    commonFunctions.showEnergyInfo()
    let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
    if (!_fisrt_running && !_has_next) {
      _show_floaty('本次共收取：' + (_post_energy - _pre_energy) + 'g 能量，累积共收取' + (_post_energy - energyInfo.startEnergy) + 'g')
    }
    _automator.clickClose()
    home()
  }

  /***********************
   * 收取能量
   ***********************/

  /**
   * 收集目标能量球能量
   * 
   * @param {*} energy_ball 能量球对象
   * @param {boolean} isDesc 是否提取文本自desc
   * @param {boolean} isOwn 是否收集自身能量
   */
  const collectBallEnergy = function (energy_ball, isDesc, isOwn) {
    if (config.skip_five && !isOwn) {
      let execResult
      if (isDesc) {
        execResult = regexCheck.exec(energy_ball.desc())
      } else {
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
    _automator.clickCenter(energy_ball)
    if (!isOwn) {
      _collect_any = true
    }
    sleep(300)
  }

  // 收取能量
  const _collect = function (own) {
    let isOwn = own || false
    if (descEndsWith('克').exists()) {
      commonFunctions.debug('能量球存在')
      let regexCheck = /(\d+)克/
      descEndsWith('克')
        .untilFind()
        .forEach(function (energy_ball) {
          collectBallEnergy(energy_ball, true, isOwn)
        })
    } else if (textEndsWith('克').exists()) {
      commonFunctions.debug('能量球存在')
      let regexCheck = /(\d+)克/
      textEndsWith('克')
        .untilFind()
        .forEach(function (energy_ball) {
          collectBallEnergy(energy_ball, false, isOwn)
        })
    } else {
      commonFunctions.debug("无能量球可收取")
    }
  }

  // 收取能量同时帮好友收取
  const _collect_and_help = function () {
    let screen = captureScreen()
    // 收取好友能量
    _collect()
    // 帮助好友收取能量
    let energyBalls
    if (
      className('Button')
        .descMatches(/\s/)
        .exists()
    ) {
      energyBalls = className('Button')
        .descMatches(/\s/)
        .untilFind()
    } else if (
      className('Button')
        .textMatches(/\s/)
        .exists()
    ) {
      energyBalls = className('Button')
        .textMatches(/\s/)
        .untilFind()
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
          threshold = _config.color_offset
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
          _automator.clickCenter(energy_ball)
          helped = true
          _collect_any = true
          sleep(500)
        }
      })
      // 当数量大于等于6且帮助收取后，重新进入
      if (helped && length >= 6) {
        return true
      }
    }
  }

  // 判断是否可收取
  const _is_obtainable = function (obj, screen) {
    let len = obj.childCount()
    let o_x = obj.child(len - 3).bounds().right,
      o_y = obj.bounds().top,
      o_w = 5,
      o_h = obj.bounds().height() - 10,
      threshold = _config.color_offset
    if (o_h > 0 && !obj.child(len - 2).childCount()) {
      if (_config.help_friend) {
        return (
          images.findColor(screen, '#1da06a', {
            region: [o_x, o_y, o_w, o_h],
            threshold: threshold
          }) ||
          images.findColor(screen, '#f99236', {
            region: [o_x, o_y, o_w, o_h],
            threshold: threshold
          })
        )
      } else {
        return images.findColor(screen, '#1da06a', {
          region: [o_x, o_y, o_w, o_h],
          threshold: threshold
        })
      }
    } else {
      return false
    }
  }

  // 记录好友信息
  const _record_avil_list = function (fri) {
    let temp = {}
    // 记录可收取对象
    temp.target = fri.bounds()
    // 记录好友ID
    if (commonFunctions.isEmpty(fri.child(1).desc())) {
      temp.name = fri.child(2).desc()
    } else {
      temp.name = fri.child(1).desc()
    }
    if (commonFunctions.isEmpty(temp.name)) {
      if (commonFunctions.isEmpty(fri.child(1).text())) {
        temp.name = fri.child(2).text()
      } else {
        temp.name = fri.child(1).text()
      }
    }
    // 记录是否有保护罩
    temp.protect = false
    _has_protect.forEach(function (obj) {
      if (temp.name == obj) temp.protect = true
    })
    // 添加到可收取列表
    if (_config.white_list.indexOf(temp.name) < 0) _avil_list.push(temp)
  }

  // 判断并记录保护罩
  const _record_protected = function (toast) {
    if (toast.indexOf('能量罩') > 0) {
      let title = textContains('的蚂蚁森林')
        .findOne(_config.timeout_findOne)
        .text()
      _has_protect.push(title.substring(0, title.indexOf('的')))
    }
  }

  // 检测能量罩
  const _protect_detect = function (filter) {
    filter = typeof filter == null ? '' : filter
    // 在新线程中开启监听
    return threads.start(function () {
      events.onToast(function (toast) {
        if (toast.getPackageName().indexOf(filter) >= 0)
          _record_protected(toast.getText())
      })
    })
  }

  const _collect_target_friend = function (obj) {
    let rentery = false
    if (!obj.protect) {
      let temp = _protect_detect(_package_name)
      //_automator.click(obj.target.centerX(), obj.target.centerY())
      commonFunctions.debug('等待进入好友主页：' + obj.name)
      let restartLoop = false
      let count = 1
      _automator.click(obj.target.centerX(), obj.target.centerY())
      ///sleep(1000)
      while (!wateringWaiting()) {
        commonFunctions.debug(
          '未能进入主页，尝试再次进入 count:' + count++
        )
        _automator.click(obj.target.centerX(), obj.target.centerY())
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
      commonFunctions.debug("准备开始收取")
      if (_config.help_friend) {
        rentery = _collect_and_help()
      } else {
        _collect()
      }
      _automator.back()
      temp.interrupt()
      commonFunctions.debug('好友能量收取完毕, 回到好友排行榜')
      let returnCount = 0
      while (!friendListWaiting()) {
        sleep(1000)
        if (returnCount++ === 2) {
          // 等待两秒后再次触发
          _automator.back()
        }
        if (returnCount > 5) {
          commonFunctions.log('返回好友排行榜失败，重新开始')
          return false
        }
      }
      if (rentery) {
        _collect_target_friend(obj)
      }
    }
  }

  // 根据可收取列表收取好友
  const _collect_avil_list = function () {
    while (_avil_list.length) {
      let obj = _avil_list.shift()
      _collect_target_friend(obj)
    }
  }

  // 识别可收取好友并记录
  const _find_and_collect = function () {
    let count = 0
    do {
      sleep(800)
      let screen = captureScreen()
      commonFunctions.debug("获取好友列表")
      let friends_list = []
      if (idMatches('J_rank_list_append').exists()) {
        commonFunctions.debug('newAppendList')
        friends_list = idMatches('J_rank_list_append').findOne(
          _config.timeout_findOne
        )
      } else if (idMatches('J_rank_list').exists()) {
        commonFunctions.debug('oldList')
        friends_list = idMatches('J_rank_list').findOne(
          _config.timeout_findOne
        )
      }
      commonFunctions.debug("判断好友信息")
      if (friends_list && friends_list.children()) {
        commonFunctions.debug(
          '读取好友列表完成，开始检查可收取列表 列表长度:' + friends_list.children().length
        )
        friends_list.children().forEach(function (fri) {
          if (fri.visibleToUser()) {
            if (fri.childCount() >= 3) {
              if (_is_obtainable(fri, screen)) _record_avil_list(fri)
            } else {
              commonFunctions.debug("不符合好友列表条件 childCount:" + fri.childCount())
            }
          }
        })
        commonFunctions.debug(
          '可收取列表获取完成，开始收集 待收取列表长度:' + _avil_list.length
        )
        if (false == _collect_avil_list()) {
          commonFunctions.log('流程出错 向上抛出')
          return false
        }
      } else {
        commonFunctions.log('好友列表不存在')
      }
      if (!friendListWaiting()) {
        commonFunctions.log('崩了崩了 重新开始')
        return false
      }
      // 重置为空列表
      _avil_list = []
      commonFunctions.debug('收集完成，下滑进入下一页')
      _automator.scrollDown(200)
      commonFunctions.debug("进入下一页")
    } while (
      (count += foundNoMoreWidget() ? 1 : 0) < 2
    )
    commonFunctions.log('全部好友收集完成')
  }

  /***********************
   * 主要函数
   ***********************/

  // 收取自己的能量
  const _collect_own = function () {
    commonFunctions.log('开始收集自己能量')
    let restartCount = 0
    let waitFlag
    _start_app()
    // 首次启动等待久一点
    sleep(1500)
    while (!(waitFlag = homePageWaiting()) && restartCount++ < 5) {
      commonFunctions.log('程序未启动，尝试再次唤醒')
      _automator.clickClose()
      commonFunctions.debug('关闭H5')
      sleep(1500)
      // 解锁并启动
      _unlock.exec()
      _start_app()
    }
    if (!waitFlag && restartCount >= 5) {
      commonFunctions.log('退出脚本')
      engines.stopAll()
    }
    commonFunctions.log('进入个人首页成功')
    _clear_floty()
    _get_pre_energy()
    commonFunctions.debug('准备收集自己能量')
    _collect(true)
    commonFunctions.debug('准备计算最短时间')
    _get_min_countdown_own()
    _fisrt_running = false
  }

  // 收取好友的能量
  const _collect_friend = function () {
    commonFunctions.log('开始收集好友能量')
    _automator.enterFriendList()
    let enterFlag = friendListWaiting()
    if (!enterFlag) {
      return false
    }
    if (false == _find_and_collect()) {
      _min_countdown = 0
      _has_next = true
      _current_time = _current_time == 0 ? 0 : _current_time - 1
      commonFunctions.log('重新开始')
      reTry++
      return false
    }
    _get_min_countdown()
    _generate_next()
    _get_post_energy()
  }

  const quickScrollDown = function () {
    do {
      _automator.scrollDown(50)
      sleep(50)
    } while (
      !foundNoMoreWidget()
    )
  }

  const foundNoMoreWidget = function () {
    let height = device.height
    height = height < 10 ? 2300 : height
    let noMoreWidgetCenterY = 0

    if (descEndsWith('没有更多了').exists()) {
      noMoreWidgetCenterY = descEndsWith('没有更多了')
        .findOne(_config.timeout_findOne)
        .bounds()
        .centerY()
    } else if (textEndsWith('没有更多了').exists()) {
      noMoreWidgetCenterY = textEndsWith('没有更多了')
        .findOne(_config.timeout_findOne)
        .bounds()
        .centerY()
    }
    // todo 该校验并不完美，当列表已经加载过之后，明明没有在视野中的控件，位置centerY还是能够获取到，而且非0
    if (noMoreWidgetCenterY !== 0 && noMoreWidgetCenterY < height) {
      return true
    } else {
      return false
    }
  }

  /**
   * 校验控件是否存在，并打印相应日志
   * @param {String} contentVal 控件文本
   * @param {String} position 日志内容 当前所在位置是否成功进入
   * @param {Number} timeoutSetting 超时时间 默认6000 即6秒钟
   */
  const widgetWaiting = function (contentVal, position, timeoutSetting) {
    let waitingSuccess = widgetCheck(contentVal, timeoutSetting)

    if (waitingSuccess) {
      commonFunctions.debug('成功进入' + position)
      return true
    } else {
      commonFunctions.log('进入' + position + '失败')
      return false
    }
  }

  /**
   * 校验控件是否存在
   * @param {String} contentVal 控件文本
   * @param {Number} timeoutSetting 超时时间 不设置则为6秒
   * 超时返回false
   */
  const widgetCheck = function (contentVal, timeoutSetting) {
    let timeout = timeoutSetting || 6000
    countDown = new java.util.concurrent.CountDownLatch(1)
    let descThread = threads.start(function () {
      descEndsWith(contentVal).waitFor()
      commonFunctions.debug('find desc ' + contentVal)
      countDown.countDown()
    })

    let textThread = threads.start(function () {
      textEndsWith(contentVal).waitFor()
      commonFunctions.debug('find text ' + contentVal)
      countDown.countDown()
    })
    let timeoutFlag = false
    let timeoutThread = threads.start(function () {
      sleep(timeout)
      timeoutFlag = true
      countDown.countDown()
    })
    countDown.await()
    descThread.interrupt()
    textThread.interrupt()
    timeoutThread.interrupt()
    return !timeoutFlag
  }

  /**
   * 校验是否成功进入自己的首页
   */
  const homePageWaiting = function () {
    if (widgetCheck('浇水', 500)) {
      commonFunctions.debug('错误位置：当前所在位置为好友首页')
      return false;
    }
    if (widgetCheck('好友排行榜', 500)) {
      commonFunctions.debug('错误位置：当前所在位置为好友排行榜')
      return false;
    }
    return widgetWaiting('背包', '个人首页')
  }

  /**
   * 校验是否成功进入好友首页
   */
  const wateringWaiting = function () {
    return widgetWaiting('浇水', '好友首页')
  }

  /**
   * 校验是否成功进入好友排行榜
   */
  const friendListWaiting = function () {
    return widgetWaiting('好友排行榜', '好友排行榜')
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
          _delay(_min_countdown)
          commonFunctions.showEnergyInfo()
          let currentTime = commonFunctions.increaseRunTimes()
          let energyInfo = commonFunctions.getTodaysRuntimeStorage('energy')
          commonFunctions.show_temp_floaty('第 ' + currentTime + ' 次运行, 累计已收集' + energyInfo.totalIncrease + 'g')
          _current_time++
          _unlock.exec()
          try {
            _avil_list = []
            _collect_own()
            _collect_friend()
          } catch (e) {
            commonFunctions.log('发生异常 [' + e + '] [' + e.message + ']')
            _current_time = _current_time == 0 ? 0 : _current_time - 1
            _min_countdown = 0
            _has_next = true
            reTry = 0
          }
          if (_config.auto_lock === true && _unlock.needRelock() === true) {
            commonFunctions.debug("重新锁定屏幕")
            _automator.lockScreen()
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
      _has_protect = []
      thread.interrupt()
    }
  }
}

module.exports = Ant_forest
