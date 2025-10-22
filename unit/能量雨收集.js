importClass(android.view.View)

let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(compareEngine => {
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop()
    }
  })
}
let { config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let args = config.parseExecArgv()

let executeByStroll = args.executeByStroll
let executeByTimeTask = args.executeByTimeTask
let executeByAccountChanger = args.executeByAccountChanger
let autoStartCollect = executeByStroll || executeByTimeTask || executeByAccountChanger

let targetSendName = args.targetSendName || config.send_chance_to_friend
let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let widgetUtils = sRequire('WidgetUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let FloatyInstance = sRequire('FloatyUtil')
let NotificationHelper = sRequire('Notification')
let LogFloaty = sRequire('LogFloaty')
let processShare = sRequire('ProcessShare')
let storage = storages.create(_storage_name)

let runningQueueDispatcher = sRequire('RunningQueueDispatcher')
runningQueueDispatcher.addRunningTask()

let TTSUtil = sRequire('TTSUtil')
let CanvasDrawer = require('../lib/CanvasDrawer.js')
let FloatyButtonSimple = require('../lib/FloatyButtonSimple.js')
if (!FloatyInstance.init()) {
  toastLog('初始化悬浮窗失败')
  exit()
}
FloatyInstance.enableLog()
if (!commonFunction.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
config.show_debug_log = true
commonFunction.autoSetUpBangOffset(true)
let offset = config.bang_offset
let RUNNING_CONTEXT = { success: true }
let SCALE_RATE = config.scaleRate
let cvt = (v) => parseInt(v * SCALE_RATE)

let window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

ui.post(() => {
  window.setSize(config.device_width, config.device_height)
  window.setTouchable(false)
})

// 功能验证
const mock_verify = false
// 两分钟后自动关闭
let targetEndTime = new Date().getTime() + (autoStartCollect ? 30000 : 120000)
let passwindow = 0
// 是否点击中
let clickRunning = false
let isRunning = true
let displayInfoZone = [config.device_width * 0.05, config.device_height * 0.65, config.device_width * 0.9, 150 * config.scaleRate]
let writeLock = threads.lock()
let ballsComplete = writeLock.newCondition()

let clickGap = config.rain_click_gap || cvt(195)
let maxGap = config.device_width / 4 - 5
let middlePoint = config.device_width / 2
// 暴力点击的区域
let violentClickPoints = [middlePoint - 2 * clickGap, middlePoint - clickGap, middlePoint, middlePoint + clickGap, middlePoint + 2 * clickGap].map(v => [v, config.rain_click_top || cvt(300)])
// 控制当前是开发调试还是正常模式，调试模式控制点击时间短于实际时间，将退出点击避免浪费机会。但需要人为控制结束
let VIOLENT_CLICK_TIME = config.rain_collect_debug_mode ? 13 : (config.rain_collect_duration || 18)

let startTimestamp = new Date().getTime()
let passedTime = 0

// 点击线程
let clickThread = threads.start(function () {
  let pressDuration = config.rain_press_duration || 7
  let sleepTime = 5 * pressDuration + 10
  sleepTime = sleepTime > 120 ? 120 : sleepTime
  while (isRunning) {
    writeLock.lock()
    try {
      if (!clickRunning) {
        LogFloaty.pushLog('等待开始点击')
        ballsComplete.await()
        LogFloaty.pushLog('开始暴力点击')
      }
    } finally {
      writeLock.unlock()
    }
    while (clickRunning) {
      passedTime = (new Date().getTime() - startTimestamp) / 1000
      // 暴力点击方式执行，当前点击持续时间小于等于设定时间继续点击，超过后便停止
      if (passedTime <= VIOLENT_CLICK_TIME) {
        violentClickPoints.forEach(p => press(p[0], p[1], pressDuration))
        sleep(sleepTime)
      } else {
        LogFloaty.pushLog('暴力点击完毕')
        clickRunning = false
        floatyBtnInstance.changeButtonText('changeStatus', '检查是否还有机会')
        sleep(1000)
        checkAndStartCollect()
        changeButtonInfo()
      }
    }
  }
})
let btns = [
  {
    id: 'openRainPage',
    text: '打开能量雨界面',
    onClick: function () {
      openRainPage()
    }
  },
  {
    id: 'changeStatus',
    text: '开始点击',
    // 允许二次点击时停止运行
    clickExecuting: true,
    handleExecuting: function () {
      handleStartClick()
    },
    onClick: function () {
      handleStartClick()
    }
  },
  {
    id: 'delayClose',
    text: '延迟关闭',
    onClick: function () {
      targetEndTime = new Date().getTime() + 120000
      config._has_vibrated = false
    }
  },
  {
    id: 'changeClickPosition',
    text: '修改点击位置',
    onClick: function () {
      ui.run(function () {
        if (config._zoom_show) {
          config._zoom_show = false
          clickButtonWindow.zoom.setVisibility(View.GONE)
          clickButtonWindow.zoomClick.setVisibility(View.GONE)
          clickButtonWindow.changeClickPosition.setText('修改点击位置')
        } else {
          config._zoom_show = true
          clickButtonWindow.zoom.setVisibility(View.VISIBLE)
          clickButtonWindow.zoomClick.setVisibility(View.VISIBLE)
          clickButtonWindow.changeClickPosition.setText('隐藏拖动控件')
        }
      })
    }
  }
]
if (mock_verify) {
  btns.push({
    id: 'mockVerify',
    text: '开启模拟验证',
    onClick: function () {
      if (config._mock_verify) {
        config._mock_verify = false
        floatyBtnInstance.changeButtonText('mockVerify', '开启模拟验证')
      } else {
        config._mock_verify = true
        floatyBtnInstance.changeButtonText('mockVerify', '关闭模拟验证')
        config.suspend_rain_while_verify = true
        config.alert_by_tts_while_verify = true
      }
    }
  })
}

let floatyBtnInstance = new FloatyButtonSimple('rain-collect', btns, (btns) => {
  return `<horizontal>
    <vertical padding="1">
   ${btns.map(btn => {
    return `<vertical padding="1" id="${btn.id}_container"><button id="${btn.id}" text="${btn.text}" textSize="${btn.textSize ? btn.textSize : 12}sp" w="*" h="30" marginTop="5" marginBottom="5" /></vertical>`
  }).join('\n')
    }
    <seekbar id="zoom" progress="{{clickGap}}" max="{{maxGap}}" w="*" h="*"/>
    </vertical>
    <vertical h="*" w="40">
      <seekbar id="zoomClick" progress="{{clickGap}}" max="{{config.device_height/2}}" rotation="90" w="200" h="*" />
    </vertical>
  </horizontal>`
}, () => { exitAndClean() })
let clickButtonWindow = floatyBtnInstance.window
let rainClickTop = config.rain_click_top || cvt(300)
ui.run(function () {
  clickButtonWindow.zoomClick.setTranslationX(-(clickButtonWindow.zoomClick.getWidth() / 2) + 40)
  clickButtonWindow.zoomClick.setProgress(rainClickTop)
  clickButtonWindow.zoom.setProgress(clickGap)
  // 隐藏按钮 避免错误点击
  clickButtonWindow.zoom.setVisibility(View.GONE)
  clickButtonWindow.zoomClick.setVisibility(View.GONE)
})
clickButtonWindow.zoomClick.setOnSeekBarChangeListener({
  onProgressChanged: function (seekbar, p, fromUser) {
    if (!fromUser) return
    rainClickTop = Number(clickButtonWindow.zoomClick.getProgress().toString()) + 100
    violentClickPoints = [middlePoint - 2 * clickGap, middlePoint - clickGap, middlePoint, middlePoint + clickGap, middlePoint + 2 * clickGap].map(v => [v, rainClickTop || config.rain_click_top || cvt(300)])
  }
});
clickButtonWindow.zoom.setOnSeekBarChangeListener({
  onProgressChanged: function (seekbar, p, fromUser) {
    if (!fromUser) return
    clickGap = Number(clickButtonWindow.zoom.getProgress().toString())
    violentClickPoints = [middlePoint - 2 * clickGap, middlePoint - clickGap, middlePoint, middlePoint + clickGap, middlePoint + 2 * clickGap].map(v => [v, rainClickTop || config.rain_click_top || cvt(300)])
  }
});

/**
 * 保存点击信息
 */
function saveClickGap () {
  storage.put('rain_click_gap', clickGap)
  storage.put('rain_click_top', rainClickTop)
}

function checkAndSendChance () {
  if (checkHasValidation()) {
    return false
  }
  LogFloaty.pushLog('正在校验是否存在 “更多好友”，请稍等')
  // 设置至少十秒的查找时间
  let endDateForCheck = new Date().getTime() + 10000 + (config.timeout_rain_find_friend || 3000)
  targetEndTime = endDateForCheck > targetEndTime ? endDateForCheck : targetEndTime
  let showMoreFriend = widgetUtils.widgetGetById('J_moreGrant', 1000)
  if (showMoreFriend && targetSendName) {
    // 尝试获取目标好友
    let targetFriend = widgetUtils.widgetGetOne(targetSendName, config.timeout_rain_find_friend || 3000)
    if (targetFriend) {
      LogFloaty.pushLog('快捷界面找到了目标好友')
      targetFriend.parent().child(1).click()
      infoLog(['点击了送ta机会'])
      LogFloaty.pushLog('点击了送ta机会')
      let newEnd = new Date().getTime() + 25000
      targetEndTime = newEnd > targetEndTime ? newEnd : targetEndTime
      sleep(1000)
      // 点击空白区域 触发关闭蒙层
      automator.click(violentClickPoints[0][0], violentClickPoints[0][1])
      sleep(2000)
      checkAndStartCollect()
      return true
    }
    automator.clickCenter(showMoreFriend)
    LogFloaty.pushLog('点击了更多好友')
    LogFloaty.pushLog('点击了更多好友，校验是否存在目标好友:' + targetSendName)
    setDisplayText('点击了更多好友，校验是否存在目标好友:' + targetSendName, showMoreFriend.bounds().centerX(), showMoreFriend.bounds().centerY())
    sleep(2000)
    LogFloaty.pushLog('查找目标好友中:' + targetSendName)
    let targetFriends = widgetUtils.widgetGetAll(targetSendName, config.timeout_rain_find_friend || 3000, false, null, { algorithm: 'PDFS' })
    if (targetFriends) {
      let matched = false
      // 从尾部开始 避开默认显示的值
      targetFriends.reverse().forEach(targetFriend => {
        if (matched) return
        infoLog(['找到了目标好友{} index{}', targetFriend.text(), targetFriend.indexInParent()])
        let send = targetFriend.parent().child(targetFriend.indexInParent() + 1)
        if (send) {
          let context = send.text() || send.desc()
          if (!/送TA机会/.test(context)) {
            warnInfo(['目标好友已被赠送，无法再次赠送 {}', context], true)
            LogFloaty.pushLog('目标好友已被赠送，无法再次赠送:' + context)
            return false
          }
          infoLog(['送ta机会按钮：{}', send.text() || send.desc()], true)
          send.click()
          infoLog(['点击了送ta机会'])
          LogFloaty.pushLog('点击了送ta机会')
          let newEnd = new Date().getTime() + 25000
          targetEndTime = newEnd > targetEndTime ? newEnd : targetEndTime
          sleep(1000)
          // 点击空白区域 触发关闭蒙层
          automator.click(violentClickPoints[0][0], violentClickPoints[0][1])
          sleep(2000)
          checkAndStartCollect()
          matched = true
        }
      })

    } else {
      warnInfo(['未找到赠送对象'], true)
      LogFloaty.pushWarningLog('未找到赠送对象')
      sleep(1000)
      if (autoStartCollect) {
        targetEndTime = new Date().getTime()
      }
    }
  } else {
    infoLog(['未找到 更多好友 或者未配置赠送对象'], true)
    LogFloaty.pushWarningLog('未找到 更多好友 或者未配置赠送对象')
    if (autoStartCollect) {
      targetEndTime = new Date().getTime()
    }
  }
  return false
}

function checkAndStartCollect () {
  config._execute_finding = true
  let startBtn = widgetUtils.widgetGetOne(config.rain_start_content || '开始拯救绿色能量|再来一次|立即开启|开始能量.*', 1000)
  if (startBtn) {
    let ended = widgetUtils.widgetGetOne(config.rain_end_content || '.*去蚂蚁森林看看.*', 1000)
    if (ended) {
      warnInfo(['今日机会已用完或者需要好友助力'], true)
      checkAndSendChance()
      config._execute_finding = false
      return
    }
    config._execute_finding = false
    writeLock.lock()
    try {
      LogFloaty.pushLog('点击音量下键可以停止运行')
      ui.post(() => {
        clickButtonWindow.setPosition(-cvt(150), config.device_height * 0.65)
      })
      sleep(250)
      automator.clickCenter(startBtn)
      startTimestamp = new Date().getTime()
      clickRunning = true
      ballsComplete.signal()
      changeButtonInfo()
      // 可以执行下一次，直接延迟至少30秒
      targetEndTime = targetEndTime > new Date().getTime() + 30000 ? targetEndTime : new Date().getTime() + 30000
    } finally {
      writeLock.unlock()
    }
  } else {
    warnInfo(['未能找到开始拯救按钮，可能已经没有机会了'], true)
    checkAndSendChance()
    config._execute_finding = false
  }
}

ui.run(function () {
  changeButtonInfo()
})

let drawer = null
window.canvas.on("draw", function (canvas) {
  if (!isRunning) {
    return
  }
  try {
    // 清空内容
    canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)
    if (!drawer) {
      drawer = new CanvasDrawer(canvas, null, config.bang_offset)
    }

    violentClickPoints.forEach(v => drawer.drawRectAndText('click', [v[0] - 5, v[1] - 5, 10, 10], '#ff0000'))
    // 倒计时
    let countdown = (targetEndTime - new Date().getTime()) / 1000
    drawer.drawText('请进入能量雨界面后手动开始，音量上键可关闭脚本，音量下停止点击', { x: displayInfoZone[0], y: displayInfoZone[1] - 200 }, '#00ff00', 30)
    drawer.drawText('将在' + countdown.toFixed(0) + 's后自动关闭', { x: displayInfoZone[0], y: displayInfoZone[1] - 150 }, '#00ff00', 30)
    drawer.drawText('点击倒计时：' + (VIOLENT_CLICK_TIME - passedTime).toFixed(1) + 's', { x: displayInfoZone[0], y: displayInfoZone[1] - 100 }, '#00ff00', 30)
    drawer.drawText('如果无法点击，请见常见问题中的解决方案', { x: displayInfoZone[0], y: displayInfoZone[1] + 50 }, '#00ff00', 30)
  } catch (e) {
    commonFunction.printExceptionStack(e)
    exitAndClean()
  }
})

let lastChangedTime = new Date().getTime()
threads.start(function () {
  toastLog('按音量上键关闭，音量下切换模式')
  events.observeKey()
  events.on("key_down", function (keyCode, event) {
    if (keyCode === 24) {
      exitAndClean()
    } else if (keyCode === 25) {
      // 设置最低间隔200毫秒，避免修改太快
      if (new Date().getTime() - lastChangedTime > 200) {
        lastChangedTime = new Date().getTime()
        clickRunning = !clickRunning
        changeButtonInfo()
      }
    }
  })
})

setInterval(function () {
  if (targetEndTime < new Date().getTime()) {
    exitAndClean()
  } else if (targetEndTime - new Date().getTime() < 10000 && !config._has_vibrated) {
    device.vibrate(1000)
    config._has_vibrated = true
  }
}, 1000)

function exitAndClean () {
  if (!isRunning) {
    return
  }

  if (executeByTimeTask) {
    commonFunction.minimize()
    if (config.auto_lock && (args.needRelock == true)) {
      debugInfo('重新锁定屏幕')
      automator.lockScreen()
    }
  } else if (executeByStroll || executeByAccountChanger) {
    // 发送消息，能量雨执行完毕
    debugInfo('发送消息，能量雨执行完毕', true)
    processShare.postInfo(JSON.stringify({ message: '能量雨执行完毕', code: RUNNING_CONTEXT.success ? 'success' : 'fail', failMessage: !RUNNING_CONTEXT.success ? RUNNING_CONTEXT.message : '' }),)
    if (args.executorSource) {
      let find = engines.all().filter(engine => engine.getSource() + '' == args.executorSource)
      if (find.length >= 1) {
        debugInfo(['将脚本[{}]设置为执行中', args.executorSource])
        runningQueueDispatcher.doAddRunningTask({ source: args.executorSource })
      }
    }
  }
  isRunning = false
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    setTimeout(function () {
      window.close()
      exit()
    }, 1000)
  } else {
    exit()
  }
}

commonFunction.registerOnEngineRemoved(function () {
  runningQueueDispatcher.removeRunningTask()
  isRunning = false
  clickThread.interrupt()
})

// ---------------------
function changeButtonInfo () {
  floatyBtnInstance.changeButtonStyle('changeStatus', null, !clickRunning ? '#9ed900' : '#f36838')
  floatyBtnInstance.changeButtonText('changeStatus', !clickRunning ? '点我开始！' : '音量下停止点击')
  ui.post(() => {
    if (!clickRunning) {
      clickButtonWindow.setPosition(config.device_width / 2 - ~~(clickButtonWindow.getWidth() / 2), config.device_height * 0.65)
    }
  })
}

let starting = false
function openRainPage (reopen) {
  if (starting) {
    return
  }
  LogFloaty.pushLog('正在打开能量雨界面')
  commonFunction.backHomeIfInVideoPackage()
  floatyBtnInstance.changeButtonText('openRainPage', '正在打开能量雨界面')
  floatyBtnInstance.changeButtonStyle('openRainPage', null, '#f36838')
  starting = true
  app.startActivity({
    action: 'VIEW',
    data: 'alipays://platformapi/startapp?appId=20000067&url=' + encodeURIComponent('https://68687791.h5app.alipay.com/www/index.html'),
    packageName: config.package_name
  })
  let confirm = widgetUtils.widgetGetOne(/^打开$/, 3000)
  if (confirm) {
    automator.clickCenter(confirm)
  }
  if (!widgetUtils.widgetWaiting('.*(返回蚂蚁森林|本场机会由好友|去蚂蚁森林看看).*') || !commonFunction.myCurrentPackage() == config.package_name) {
    errorInfo(['打开能量雨界面失败'], true)
    LogFloaty.pushWarningLog('打开能量雨界面失败')
    if (reopen) {
      errorInfo('二次打开能量雨界面失败')
      LogFloaty.pushErrorLog('打开能量雨界面失败，退出执行')
      RUNNING_CONTEXT.success = false
      RUNNING_CONTEXT.message = '打开能量雨界面失败'
      return
    }
    LogFloaty.pushLog('关闭支付宝，再次打开能量雨界面')
    app.launch(config.package_name)
    sleep(1000)
    commonFunction.killCurrentApp()
    sleep(1000)
    starting = false
    return openRainPage(true)
  }
  checkAndCloseVibrate()
  if (executeByTimeTask || executeByAccountChanger) {
    checkAndStartCollect()
  }
  floatyBtnInstance.changeButtonText('openRainPage', '打开能量雨界面')
  floatyBtnInstance.changeButtonStyle('openRainPage', null, '#3FBE7B')
  starting = false
}

function setDisplayText (textContent, x, y) {
  x = x || config.device_width / 3
  y = y || config.device_height / 2
  debugInfo(['设置悬浮窗文本：{}, ({},{})', textContent, x, y])
  FloatyInstance.setFloatyInfo({
    x: x, y: y
  }, textContent)
  setTimeout(function () {
    debugInfo('隐藏悬浮窗')
    FloatyInstance.setFloatyPosition(-100, -100)
  }, 1000)
}

function checkHasValidation () {
  let validationWidget = widgetUtils.widgetGetOne('.*请进行验证|服务器开小差了.*', 1000)
  if (validationWidget || config._mock_verify) {
    LogFloaty.pushWarningLog('有验证，请手动执行')
    NotificationHelper.createNotification('能量雨执行异常', '存在人机验证，请手动执行')
    device.vibrate(1000)
    if (config.alert_by_tts_while_verify) {
      TTSUtil.initTTS()
      let currentVolume = device.getMusicVolume()
      if (currentVolume < 50) {
        device.setMusicVolume(50)
      }
      try {
        TTSUtil.speak(config.alert_by_tts_while_verify_content || '存在人机验证，请手动验证')
      } finally {
        device.setMusicVolume(currentVolume)
      }
    }
    // 开启了验证延迟 此时交给用户手动处理 增加延迟关闭时间
    if (config.suspend_rain_while_verify) {
      targetEndTime = new Date().getTime() + (config.suspend_rain_while_verify_timeout || 120) * 1000
    }
    return true
  }
  return false
}

// 关闭震动
function checkAndCloseVibrate () {
  LogFloaty.pushLog('准备检查并关闭震动')
  let moreIcon = widgetUtils.widgetGetById('com.alipay.multiplatform.phone.xriver_integration:id/imageButton_rightButton1', 1000)
  if (moreIcon) {
    moreIcon.click()
    let closedOrOpen = widgetUtils.alternativeWidget('关闭震动', '打开震动', 1000, true)
    if (closedOrOpen.value == 1) {
      LogFloaty.pushLog('关闭震动')
      automator.clickCenter(closedOrOpen.target)
    } else {
      LogFloaty.pushLog('已关闭震动')
      automator.clickCenter(moreIcon)
    }
  }
}

function handleStartClick () {
  if (config._execute_finding) {
    LogFloaty.pushWarningLog('正在查找控件中，请稍等')
    return
  }
  if (!clickRunning) {
    saveClickGap(clickGap)
    checkAndStartCollect()
  } else {
    clickRunning = false
  }
  changeButtonInfo()
}


// 当定时任务触发 或者大小号切换时触发
if (executeByTimeTask || executeByAccountChanger) {
  openRainPage()
} else if (executeByStroll) {
  // 当通过逛一逛触发
  checkAndStartCollect()
}