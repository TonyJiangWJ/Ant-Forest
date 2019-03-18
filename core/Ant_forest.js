/*
 * @Author: NickHopps
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-03-07 14:25:21
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
    _has_protect = [] // 开启能量罩好友
    reTry = 0
  /***********************
   * 综合操作
   ***********************/

  // 进入蚂蚁森林主页
  const _start_app = function () {
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=60000002'
    })
  }

  // 关闭提醒弹窗
  const _clear_floty = function () {
    // 合种/添加快捷方式提醒
    threads.start(function () {
      let floty = idEndsWith('J_pop_treedialog_close')
        .findOne(_config.timeout_findOne)
      if (floty) {
        floty.click()
      }
    })
    threads.start(function () {
      let floty = descEndsWith("关闭蒙层")
        .findOne(_config.timeout_findOne);
      if (floty) {
        floty.click()
      }
    });
    commonFunctions.debug("关闭蒙层成功")
  }

  // 显示文字悬浮窗
  const _show_floaty = function (text) {
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
      engines.stopAll()
    })
    setInterval(() => {
      ui.run(function () {
        window.log.text(text)
      })
    }, 0)
  }

  const _temp_show = function (minutes) {
    floaty.closeAll()
    if (minutes === 0) {
      return
    }
    var w = floaty.rawWindow(
      <frame gravity="center" bg="#77ff0000">
        <text id="content" />
      </frame>
    )

    ui.run(function () {
      w.content.text('下一次执行在【' + minutes + '】分之后')
    })
    w.setSize(-2, -2)

    setTimeout(() => {
      w.close()
    }, 2000)
  }

  /***********************
   * 构建下次运行
   ***********************/

  // 同步获取 toast 内容
  const _get_toast_sync = function (filter, limit, exec) {
    filter = (typeof filter == null) ? "" : filter;
    let messages = threads.disposable();
    // 在新线程中开启监听
    let thread = threads.start(function () {
      let temp = [];
      let counter = 0;
      // 监控 toast
      events.onToast(function (toast) {
        if (toast) {
          if (toast.getPackageName().indexOf(filter) >= 0) {
            counter++;
            temp.push(toast.getText())
            if (counter == limit) messages.setAndNotify(temp);
          }
        }
      });
      // 触发 toast
      exec();
    });
    // 获取结果
    let result = messages.blockedGet();
    thread.interrupt();
    return result;
  }

  // 获取自己的能量球中可收取倒计时的最小值
  const _get_min_countdown_own = function () {
    let target = className("Button").descMatches(/\s/).filter(function (obj) {
      return obj.bounds().width() != obj.bounds().height()
    });
    if (target.exists()) {
      let ball = target.untilFind();
      let temp = [];
      let toasts = _get_toast_sync(_package_name, ball.length, function () {
        ball.forEach(function (obj) {
          _automator.clickCenter(obj);
          sleep(500);
        });
      });
      toasts.forEach(function (toast) {
        let countdown = toast.match(/\d+/g);
        temp.push(countdown[0] * 60 - (-countdown[1]));
      });
      _min_countdown = Math.min.apply(null, temp);
      _timestamp = new Date();
    } else {
      _min_countdown = null;
      log("无可收取能量");
    }
  }

  // 确定下一次收取倒计时
  const _get_min_countdown = function () {
    let temp = []
    if (_min_countdown && _timestamp instanceof Date) {
      let countdown_own =
        _min_countdown - Math.floor((new Date() - _timestamp) / 60000)
      countdown_own >= 0 ? temp.push(countdown_own) : temp.push(0)
    }
    if (descEndsWith('’').exists()) {
      descEndsWith('’')
        .untilFind()
        .forEach(function (countdown) {
          let countdown_fri = parseInt(countdown.desc().match(/\d+/))
          temp.push(countdown_fri)
        })
    }
    if (!temp.length) return
    _min_countdown = Math.min.apply(null, temp)
  }

  // 构建下一次运行
  const _generate_next = function () {
    if (_config.is_cycle) {
      if (_current_time < _config.cycle_times) _has_next = true
      else _has_next = false
    } else {
      if (
        _min_countdown != null &&
        _min_countdown <= _config.max_collect_wait_time
      )
        _has_next = true
      else _has_next = false
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
    if (descEndsWith('背包').exists()) {
      return parseInt(
        descEndsWith('g')
        .findOne(_config.timeout_findOne)
        .desc()
        .match(/\d+/)
      )
    }
  }

  // 记录初始能量值
  const _get_pre_energy = function () {
    if (_fisrt_running && _has_next) {
      _pre_energy = _get_current_energy()
      log('当前能量：' + _pre_energy)
    }
  }

  // 记录最终能量值
  const _get_post_energy = function () {
    if (!_fisrt_running && !_has_next) {
      if (descEndsWith('返回').exists())
        descEndsWith('返回')
        .findOne(_config.timeout_findOne)
        .click()
      descEndsWith('背包').waitFor()
      _post_energy = _get_current_energy()
      log('当前能量：' + _post_energy)
      _show_floaty('共收取：' + (_post_energy - _pre_energy) + 'g 能量')
    }
    if (descEndsWith('关闭').exists())
      descEndsWith('关闭')
      .findOne(_config.timeout_findOne)
      .click()
    home()
  }

  /***********************
   * 收取能量
   ***********************/

  // 收取能量
  const _collect = function () {
    if (descEndsWith('克').exists()) {
      commonFunctions.debug("能量球存在")
      descEndsWith('克')
        .untilFind()
        .forEach(function (energy_ball) {
          commonFunctions.debug("收集能量")
          _automator.clickCenter(energy_ball)

          sleep(500)
        })
    }
  }

  // 收取能量同时帮好友收取
  const _collect_and_help = function () {
    let screen = captureScreen()
    // 收取好友能量
    _collect()
    // 帮助好友收取能量
    if (
      className('Button')
      .descMatches(/\s/)
      .exists()
    ) {
      className('Button')
        .descMatches(/\s/)
        .untilFind()
        .forEach(function (energy_ball) {
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
            sleep(500)
          }
        })
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
    if (fri.child(1).desc() == '') {
      temp.name = fri.child(2).desc()
    } else {
      temp.name = fri.child(1).desc()
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

  // 根据可收取列表收取好友
  const _collect_avil_list = function () {
    while (_avil_list.length) {
      let obj = _avil_list.shift()
      if (!obj.protect) {
        let temp = _protect_detect(_package_name)
        //_automator.click(obj.target.centerX(), obj.target.centerY())
        commonFunctions.debug("等待进入好友主页")
        let restartLoop = false
        let lock = threads.lock()
        let complete = lock.newCondition()
        let checkThread = threads.start(function () {
          lock.lock()
          commonFunctions.debug('子线程获得锁')
          let count = 1
          let running = true
          _automator.click(obj.target.centerX(), obj.target.centerY())
          ///sleep(1000)
          while (running) {
            if (count > 5) {
              log('重试超过5次，取消操作')
              restartLoop = true
              break
            }
            if (!descContains("浇水").exists()) {
              commonFunctions.debug('未能进入主页，尝试再次进入 count:' + count++)
              _automator.click(obj.target.centerX(), obj.target.centerY())
              sleep(1000)
            } else {
              running = false
              commonFunctions.debug("进入好友主页成功")
            }
          }
          complete.signal()
          lock.unlock()
          commonFunctions.debug('子线程发送信号并释放锁')
        })
        lock.lock()
        commonFunctions.debug('主线程获得锁并等待')
        complete.await()
        lock.unlock()
        checkThread.interrupt()
        if (restartLoop) {
          log('页面流程出错，重新开始')
          return false
        }

        if (_config.help_friend) _collect_and_help()
        else _collect()
        _automator.back()
        temp.interrupt()
        commonFunctions.debug('回到好友排行榜')
        while (!textContains('好友排行榜').exists()) sleep(1000)
      }
    }
  }

  // 识别可收取好友并记录
  const _find_and_collect = function () {
    while (
      !(
        descEndsWith('没有更多了').exists() &&
        descEndsWith('没有更多了')
        .findOne(_config.timeout_findOne)
        .bounds()
        .centerY() < device.height
      )
    ) {
      let screen = captureScreen()
      let friends_list = idEndsWith('J_rank_list').findOne(
        _config.timeout_findOne
      )
      if (friends_list) {
        commonFunctions.debug("读取好友列表完成，开始检查可收取列表")
        friends_list.children().forEach(function (fri) {
          if (fri.visibleToUser() && fri.childCount()) {
            if (_is_obtainable(fri, screen)) _record_avil_list(fri)
          }
        })
        commonFunctions.debug("可收取列表获取完成，开始收集")
        if (false == _collect_avil_list()) {
          log('流程出错 向上抛出')
          return false
        }
      }
      if (!textContains('好友排行榜').exists()) {
        log("崩了崩了 重新开始")
        return false
      }

      commonFunctions.debug("收集完成，下滑进入下一页")
      scrollDown()
      sleep(1000)
    }
    log("全部好友收集完成")
  }

  /***********************
   * 主要函数
   ***********************/

  // 收取自己的能量
  const _collect_own = function () {
    log('开始收集自己能量')
    let lock = threads.lock()
    let complete = lock.newCondition()
    let checkThread = threads.start(function () {
      lock.lock()
      commonFunctions.debug('子线程获得锁')
      let running = true
      let restartCount = 1
      let waitCount = 0
      if (!textContains('蚂蚁森林').exists()) {
        log('程序未启动，尝试唤醒')
        _unlock.exec()
        _start_app()
      }
      while (running) {
        if (restartCount > 10) {
          log('重试超过十次，取消操作')
          break
        }
        sleep(500)
        let closeAndReopen = false
        // 等待载入蚂蚁森林界面，等待超过三次继续重新打开
        if (!textContains('蚂蚁森林').exists()) {
          closeAndReopen = true
        } else {
          if (descContains('背包').exists()) {
            commonFunctions.debug('进入个人主页成功')
            running = false
          } else {
            if (descContains('浇水').exists()) {
              commonFunctions.debug('进错页面啦，好友的主页！')
              closeAndReopen = true
            } else {
              if (waitCount >= 3) {
                waitCount = 0
                closeAndReopen = true
                commonFunctions.debug("等待超过3次，重新打开")
              } else {
                commonFunctions.debug("已启动蚂蚁森林，等待载入界面，第" + (++waitCount) + "次等待")
              }
            }
          }
        }
        if (closeAndReopen) {
          if (descEndsWith('关闭').exists()) {
            descEndsWith('关闭')
              .findOne(_config.timeout_findOne)
              .click()
            commonFunctions.debug('关闭H5')
            sleep(1000)
          }
          log('程序未启动，尝试再次唤醒 count:' + restartCount++)
          _unlock.exec()
          _start_app()
        }
        if (running) {
          sleep(2500)
        }
      }
      commonFunctions.debug('子线程发送信号并释放锁')
      complete.signal()
      lock.unlock()
    })
    lock.lock()
    commonFunctions.debug('主线程获得锁并等待信号')
    complete.await()
    lock.unlock()
    log('关闭检测线程')
    _clear_floty()
    _get_pre_energy()
    commonFunctions.debug("准备收集自己能量")
    _collect()
    commonFunctions.debug("准备计算最短时间")
    _get_min_countdown_own()
    _fisrt_running = false
  }

  // 收取好友的能量
  const _collect_friend = function () {
    log('开始收集好友能量')
    descEndsWith('查看更多好友')
      .findOne(_config.timeout_findOne)
      .click()
    while (!textContains('好友排行榜').exists()) sleep(1000)
    log("进入好友排行榜")
    if (false == _find_and_collect()) {
      _min_countdown = 0
      _has_next = true
      _current_time = _current_time == 0 ? 0 : --_current_time
      log('重新开始')
      reTry++
      return false
    }
    _get_min_countdown()
    _generate_next()
    _get_post_energy()
  }


  return {
    exec: function () {
      let thread = threads.start(function () {
        events.setMaxListeners(0)
        events.observeToast()
      })
      try {
        while (true) {
          _delay(_min_countdown)
          log('第 ' + ++_current_time + ' 次运行')
          _unlock.exec()
          try {
            _collect_own()
            _collect_friend()
          } catch (e) {
            log("发生异常")
            _min_countdown = 0
            _has_next = true
            reTry = 0
          }
          events.removeAllListeners()
          if (
            (!_config.is_cycle && _current_time > _config.max_collect_repeat) ||
            _has_next == false || reTry > 5
          ) {
            log('收取结束')
            break
          }
        }
      } catch (e) {
        log("发生异常，终止程序")
      }
      thread.interrupt()
    }
  }
}

module.exports = Ant_forest