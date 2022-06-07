importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
importClass(com.stardust.autojs.core.graphics.ScriptCanvas)

let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(engine => {
    let compareEngine = engine
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop()
    }
  })
}

let args = engines.myEngine().execArgv
console.log('来源参数：' + JSON.stringify(args))
let executeByStroll = args.executeByStroll
let executeByTimeTask = args.executeByTimeTask
let executeByAccountChanger = args.executeByAccountChanger
let targetSendName = args.targetSendName
let autoStartCollect = executeByStroll || executeByTimeTask || executeByAccountChanger
let { config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let widgetUtils = sRequire('WidgetUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let FloatyInstance = sRequire('FloatyUtil')
let processShare = sRequire('ProcessShare')
let storage = storages.create(_storage_name)
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
let runningQueueDispatcher = sRequire('RunningQueueDispatcher')
commonFunction.autoSetUpBangOffset(true)
runningQueueDispatcher.addRunningTask()
let offset = config.bang_offset

let SCALE_RATE = config.scaleRate
let cvt = (v) => parseInt(v * SCALE_RATE)

let window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

ui.post(() => {
  window.setSize(config.device_width, config.device_height)
  window.setTouchable(false)
})

let threadPool = new ThreadPoolExecutor(4, 4, 60,
  TimeUnit.SECONDS, new LinkedBlockingQueue(16),
  new ThreadFactory({
    newThread: function (runnable) {
      let thread = Executors.defaultThreadFactory().newThread(runnable)
      thread.setName('energy-rain-' + thread.getName())
      return thread
    }
  })
)
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + (autoStartCollect ? 30000 : 120000)
let passwindow = 0
let canStart = true
let onFloatDisplay = false
let isRunning = true
let displayInfoZone = [config.device_width * 0.05, config.device_height * 0.65, config.device_width * 0.9, 150 * config.scaleRate]
let writeLock = threads.lock()
let ballsComplete = writeLock.newCondition()
let clickPoint = null

let clickGap = config.rain_click_gap || cvt(195)
let middlePoint = config.device_width / 2
// 暴力点击的区域
let violentClickPoints = [middlePoint - 2 * clickGap, middlePoint - clickGap, middlePoint, middlePoint + clickGap, middlePoint + 2 * clickGap].map(v => [v, config.rain_click_top || cvt(300)])
let VIOLENT_CLICK_TIME = config.rain_collect_debug_mode ? 13 : (config.rain_collect_duration || 18)

let startTimestamp = new Date().getTime()
let passedTime = 0

// 点击线程
threadPool.execute(function () {
  let pressDuration = config.rain_press_duration || 7
  let sleepTime = 5 * pressDuration + 10
  sleepTime = sleepTime > 120 ? 120 : sleepTime
  while (isRunning) {
    writeLock.lock()
    try {
      passedTime = (new Date().getTime() - startTimestamp) / 1000
    } finally {
      writeLock.unlock()
    }
    if (!canStart) {
      // 暴力点击方式执行
      if (passedTime <= VIOLENT_CLICK_TIME) {
        violentClickPoints.forEach(p => press(p[0], p[1], pressDuration))
        sleep(sleepTime)
      } else {
        infoLog('暴力点击完毕')
        canStart = true
        changeButtonInfo()
        sleep(1000)
        checkAndStartCollect()
      }
    }
  }
})

let clickButtonWindow = floaty.rawWindow(
  <horizontal>
    <vertical padding="1">
      <vertical>
        <button id="openRainPage" text="打开能量雨界面" />
      </vertical>
      <vertical>
        <button id="changeStatus" text="开始点击" />
      </vertical>
      <vertical>
        <button id="delayClose" text="续命(拖动)" />
      </vertical>
      <vertical>
        <button id="closeBtn" text="关闭" />
      </vertical>
      <seekbar id="zoom" progress="{{clickGap}}" max="500" w="*" h="*" />
    </vertical>
    <vertical h="*" w="40">
      <seekbar id="zoomClick" progress="{{clickGap}}" max="{{config.device_height/2}}" rotation="90" w="200" h="*" />
    </vertical>
  </horizontal>
);
let rainClickTop = config.rain_click_top || cvt(300)
ui.run(function () {
  clickButtonWindow.zoomClick.setTranslationX(-(clickButtonWindow.zoomClick.getWidth() / 2) + 40)
  clickButtonWindow.zoomClick.setProgress(rainClickTop)
  clickButtonWindow.zoom.setProgress(clickGap)
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

clickButtonWindow.openRainPage.click(function () {
  threadPool.execute(function () {
    openRainPage()
  })
})

clickButtonWindow.changeStatus.click(function () {
  if (onFloatDisplay) {
    return
  }
  if (canStart) {
    saveClickGap(clickGap)
    checkAndStartCollect()
  } else {
    canStart = true
  }
  changeButtonInfo()
})

clickButtonWindow.closeBtn.click(function () {
  exitAndClean()
})

// clickButtonWindow.delayClose.click(function () {
//   targetEndTime = new Date().getTime() + 120000
// })

let eventStartX, eventStartY
let windowStartX = clickButtonWindow.getX()
let windowStartY = clickButtonWindow.getY()
let eventKeep = false
let eventMoving = false
let touchDownTime = new Date().getTime()

/**
 * 数组所有值平方和开方 勾股定理计算距离
 * @param {*} dx 
 * @param {*} dy 
 * @returns 
 */
function getDistance (dx, dy) {
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

clickButtonWindow.delayClose.setOnTouchListener(new android.view.View.OnTouchListener((view, event) => {
  try {
    switch (event.getAction()) {
      case event.ACTION_DOWN:
        eventStartX = event.getRawX();
        eventStartY = event.getRawY();
        windowStartX = clickButtonWindow.getX();
        windowStartY = clickButtonWindow.getY();
        eventKeep = true; //按下,开启计时
        touchDownTime = new Date().getTime()
        break;
      case event.ACTION_MOVE:
        var sx = event.getRawX() - eventStartX;
        var sy = event.getRawY() - eventStartY;
        if (!eventMoving && eventKeep && getDistance(sx, sy) >= 10) {
          eventMoving = true;
        };
        if (eventMoving && eventKeep) {
          ui.post(() => {
            clickButtonWindow.setPosition(windowStartX + sx, windowStartY + sy);
          })
        };
        break;
      case event.ACTION_UP:
        if (!eventMoving && eventKeep && touchDownTime > new Date().getTime() - 1000) {
          targetEndTime = new Date().getTime() + 120000
        };
        eventKeep = false;
        touchDownTime = 0;
        eventMoving = false;
        break;
    };
  } catch (e) {
    console.error('异常' + e)
  }
  return true;
}))


function checkAndSendChance () {
  setDisplayText('正在校验是否存在 “更多好友”，请稍等')
  // 设置至少十秒的查找时间
  let endDateForCheck = new Date().getTime() + 10000 + (config.timeout_rain_find_friend || 3000)
  targetEndTime = endDateForCheck > targetEndTime ? endDateForCheck : targetEndTime
  let showMoreFriend = widgetUtils.widgetGetById('J_moreGrant', 1000)
  if (showMoreFriend && (targetSendName || config.send_chance_to_friend)) {
    threadPool.execute(function () {
      automator.clickCenter(showMoreFriend)
      infoLog(['点击了更多好友'])
      setDisplayText('点击了更多好友，校验是否存在目标好友', showMoreFriend.bounds().centerX(), showMoreFriend.bounds().centerY())
      sleep(2000)
      setDisplayText('查找目标好友中')
      let targetFriends = widgetUtils.widgetGetAll(targetSendName || config.send_chance_to_friend, config.timeout_rain_find_friend || 3000)
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
              setDisplayText('目标好友已被赠送，无法再次赠送:' + context)
              clearDisplayText()
              return false
            }
            infoLog(['送ta机会按钮：{}', send.text() || send.desc()], true)
            send.click()
            infoLog(['点击了送ta机会'])
            setDisplayText('点击了送ta机会')
            let newEnd = new Date().getTime() + 25000
            targetEndTime = newEnd > targetEndTime ? newEnd : targetEndTime
            sleep(1000)
            // 点击空白区域 触发关闭蒙层
            automator.click(violentClickPoints[0][0], violentClickPoints[0][1])
            sleep(2000)
            clearDisplayText()
            checkAndStartCollect()
            matched = true
          }
        })

      } else {
        warnInfo(['未找赠送对象'], true)
        setDisplayText('未找到赠送对象')
        sleep(1000)
        clearDisplayText()
        if (autoStartCollect) {
          targetEndTime = new Date().getTime()
        }
      }
    })
  } else {
    infoLog(['未找 更多好友 或者未配置赠送对象'], true)
    setDisplayText('未找 更多好友 或者未配置赠送对象')
    clearDisplayText()
    if (autoStartCollect) {
      targetEndTime = new Date().getTime()
    }
  }
  return false
}

function checkAndStartCollect () {
  let startBtn = widgetUtils.widgetGetOne(config.rain_start_content || '开始拯救绿色能量|再来一次|立即开启|开始能量.*', 1000)
  if (startBtn) {
    let ended = widgetUtils.widgetGetOne(config.rain_end_content || '.*去蚂蚁森林看看.*', 1000)
    if (ended) {
      warnInfo(['今日机会已用完或者需要好友助力'], true)
      checkAndSendChance()
      return
    }
    threadPool.execute(function () {
      writeLock.lock()
      try {
        canStart = false
        ui.post(() => {
          clickButtonWindow.setPosition(-cvt(150), config.device_height * 0.65)
        })
        sleep(250)
        automator.clickCenter(startBtn)
        startTimestamp = new Date().getTime()
        ballsComplete.signal()
        changeButtonInfo()
        targetEndTime = targetEndTime > new Date().getTime() + 30000 ? targetEndTime : new Date().getTime() + 30000
      } finally {
        writeLock.unlock()
      }
    })
  } else {
    warnInfo(['未能找到开始拯救按钮，可能已经没有机会了'], true)
    checkAndSendChance()
  }
}

ui.run(function () {
  changeButtonInfo()
})

executeByTimeTask && openRainPage()
executeByAccountChanger && openRainPage()
executeByStroll && checkAndStartCollect()

window.canvas.on("draw", function (canvas) {
  if (!isRunning) {
    return
  }
  try {
    // 清空内容
    canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)
    let Typeface = android.graphics.Typeface
    let paint = new Paint()
    paint.setStrokeWidth(1)
    paint.setTypeface(Typeface.DEFAULT_BOLD)
    paint.setTextAlign(Paint.Align.LEFT)
    paint.setAntiAlias(true)
    paint.setStrokeJoin(Paint.Join.ROUND)
    paint.setDither(true)

    violentClickPoints.forEach(v => drawRectAndText('click', [v[0] - 5, v[1] - 5, 10, 10], '#ff0000', canvas, paint))

    // 倒计时
    paint.setTextSize(30)
    let countdown = (targetEndTime - new Date().getTime()) / 1000
    drawText('请进入能量雨界面后手动开始，音量上键可关闭脚本，音量下停止点击', { x: displayInfoZone[0], y: displayInfoZone[1] - 200 }, canvas, paint, '#00ff00')
    drawText('将在' + countdown.toFixed(0) + 's后自动关闭', { x: displayInfoZone[0], y: displayInfoZone[1] - 150 }, canvas, paint, '#00ff00')
    drawText('点击倒计时：' + (VIOLENT_CLICK_TIME - passedTime).toFixed(1) + 's', { x: displayInfoZone[0], y: displayInfoZone[1] - 100 }, canvas, paint, '#00ff00')

    passwindow = new Date().getTime() - startTime

    if (canStart) {
      let displayBallPoint = clickPoint
      if (displayBallPoint) {
        let radius = cvt(60)
        drawRectAndText('能量球', [displayBallPoint.x - radius, displayBallPoint.y - radius, radius * 2, radius * 2], '#00ff00', canvas, paint)
      }
    }
    if (passwindow > 1000) {
      startTime = new Date().getTime()
      console.verbose('关闭倒计时：' + countdown.toFixed(2))
    }
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
        canStart = !canStart
        changeButtonInfo()
      }
    }
  })
})

setInterval(function () {
  if (targetEndTime < new Date().getTime()) {
    exitAndClean()
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
    processShare.postInfo('能量雨执行完毕')
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
  threadPool.shutdown()
  debugInfo(['等待线程池关闭:{}', threadPool.awaitTermination(5, TimeUnit.SECONDS)])
})

// ---------------------
function changeButtonInfo () {
  isWaiting = false
  ui.post(() => {
    clickButtonWindow.changeStatus.setText(canStart ? '点我开始！' : '音量下停止点击')
    clickButtonWindow.changeStatus.setBackgroundColor(canStart ? colors.parseColor('#9ed900') : colors.parseColor('#f36838'))
    if (canStart) {
      clickButtonWindow.setPosition(config.device_width / 2 - ~~(clickButtonWindow.getWidth() / 2), config.device_height * 0.65)
    }
  })
}

function convertArrayToRect (a) {
  // origin array left top width height
  // left top right bottom
  return new android.graphics.Rect(a[0], a[1] + offset, (a[0] + a[2]), (a[1] + offset + a[3]))
}

function drawRectAndText (desc, position, colorStr, canvas, paint) {
  let color = colors.parseColor(colorStr)

  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.STROKE)
  // 反色
  paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
  canvas.drawRect(convertArrayToRect(position), paint)
  paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  paint.setStrokeWidth(1)
  paint.setTextSize(20)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(desc, position[0], position[1] + offset, paint)
  paint.setTextSize(10)
  paint.setStrokeWidth(1)
  paint.setARGB(255, 0, 0, 0)
}

function drawText (text, position, canvas, paint, colorStr) {
  colorStr = colorStr || '#0000ff'
  let color = colors.parseColor(colorStr)
  paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(text, position.x, position.y + offset, paint)
}
let starting = false
function openRainPage () {
  if (starting) {
    return
  }
  ui.run(function () {
    clickButtonWindow.openRainPage.setText('正在打开能量雨界面')
  })
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
  widgetUtils.widgetWaiting('.*返回蚂蚁森林.*')
  if (executeByTimeTask || executeByAccountChanger) {
    checkAndStartCollect()
  }
  ui.run(function () {
    clickButtonWindow.openRainPage.setText('打开能量雨界面')
  })
  starting = false
}

function setDisplayText (textContent, x, y) {
  onFloatDisplay = true
  x = x || config.device_width / 3
  y = y || config.device_height / 2
  debugInfo(['设置悬浮窗文本：{}, ({},{})', textContent, x, y])
  FloatyInstance.setFloatyInfo({
    x: x, y: y
  }, textContent)
}

function clearDisplayText () {
  ui.run(function () {
    setTimeout(function () {
      debugInfo('隐藏悬浮窗')
      FloatyInstance.setFloatyPosition(-100, -100)
      onFloatDisplay = false
    }, 1000)
  })
}