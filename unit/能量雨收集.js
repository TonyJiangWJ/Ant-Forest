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
let { config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let widgetUtils = sRequire('WidgetUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
if (!commonFunction.requestScreenCaptureOrRestart(true)) {
  toastLog('获取截图权限失败，无法执行')
  exit()
}
config.show_debug_log = false
let runningQueueDispatcher = sRequire('RunningQueueDispatcher')
commonFunction.autoSetUpBangOffset(true)
runningQueueDispatcher.addRunningTask()
let offset = config.bang_offset

let SCALE_RATE = config.scaleRate
let cvt = (v) => parseInt(v * SCALE_RATE)

let window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(config.device_width, config.device_height)
window.setTouchable(false)

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
let targetEndTime = startTime + (config.auto_start_rain ? 30000 : 120000)
let passwindow = 0
let disableClick = true
let isRunning = true
let displayInfoZone = [config.device_width * 0.05, config.device_height * 0.65, config.device_width * 0.9, 150 * config.scaleRate]
let writeLock = threads.lock()
let ballsComplete = writeLock.newCondition()
let clickPoint = null

// 是否启用暴力点击
let enableViolent = true
// 暴力点击的区域
let violentClickPoints = [200, 350, 550, 750, 900].map(v => [cvt(v), config.rain_click_top || cvt(300)])
let VIOLENT_CLICK_TIME = config.rain_collect_debug_mode ? 13 : 18

let startTimestamp = new Date().getTime()
let passedTime = 0

// 点击线程
threadPool.execute(function () {
  while (isRunning) {
    writeLock.lock()
    try {
      passedTime = (new Date().getTime() - startTimestamp) / 1000
    } finally {
      writeLock.unlock()
    }
    if (!disableClick) {
      // 暴力点击方式执行
      if (passedTime <= VIOLENT_CLICK_TIME) {
        violentClickPoints.forEach(p => press(p[0], p[1], 7))
      } else {
        infoLog('暴力点击完毕')
        disableClick = true
        changeButtonInfo()
        sleep(1000)
        checkAndStartCollect()
      }
    }
  }
})

let clickButtonWindow = floaty.rawWindow(
  <vertical padding="1">
    <vertical>
      <button id="openRainPage" text="打开能量雨界面" />
    </vertical>
    <vertical>
      <button id="changeStatus" text="开始点击" />
    </vertical>
    <vertical>
      <button id="delayClose" text="续命" />
    </vertical>
    <vertical>
      <button id="closeBtn" text="关闭" />
    </vertical>
  </vertical>
);
clickButtonWindow.openRainPage.click(function () {
  threadPool.execute(function () {
    openRainPage()
  })
})

clickButtonWindow.changeStatus.click(function () {
  if (disableClick) {
    checkAndStartCollect()
  } else {
    disableClick = true
  }
  changeButtonInfo()
})

clickButtonWindow.closeBtn.click(function () {
  exitAndClean()
})

clickButtonWindow.delayClose.click(function () {
  targetEndTime = new Date().getTime() + 120000
})

function checkAndSendChance () {
  let showMoreFriend = widgetUtils.widgetGetOne('更多好友', 1000)
  if (showMoreFriend && config.send_chance_to_friend) {
    threadPool.execute(function () {
      automator.clickCenter(showMoreFriend)
      infoLog(['点击了更多好友'])
      sleep(2000)
      let targetFriend = widgetUtils.widgetGetOne(config.send_chance_to_friend, 1000)
      if (targetFriend) {
        infoLog(['找到了目标好友{} index{}', targetFriend.text(), targetFriend.indexInParent()])
        let send = targetFriend.parent().child(targetFriend.indexInParent() + 1)
        if (send) {
          let context = send.text() || send.desc()
          if (!/送TA机会/.test(context)) {
            warnInfo(['目标好友已被赠送，无法再次赠送'], true)
            return false
          }
          infoLog(['送ta机会按钮：{}', send.text() || send.desc()], true)
          send.click()
          infoLog(['点击了送ta机会'])
          let newEnd = new Date().getTime() + 25 * 60
          targetEndTime = newEnd > targetEndTime ? newEnd : targetEndTime
          sleep(1000)
          // 点击空白区域 触发关闭蒙层
          automator.click(violentClickPoints[0][0], violentClickPoints[0][1])
          sleep(2000)
          checkAndStartCollect()
        }
      } else {
        warnInfo(['未找赠送对象'], true)
      }
    })
  } else {
    infoLog(['未找 更多好友 或者未配置赠送对象'], true)
  }
  return false
}

function checkAndStartCollect () {
  let startBtn = widgetUtils.widgetGetOne(config.rain_start_content || '开始拯救绿色能量|再来一次|立即开启', 1000)
  if (startBtn) {
    let ended = widgetUtils.widgetGetOne(config.rain_end_content || '.*去蚂蚁森林看看.*', 1000)
    if (ended) {
      warnInfo(['今日机会已用完或者需要好友助力'], true)
      checkAndSendChance()
      if (config.auto_start_rain) {
        targetEndTime = new Date().getTime()
      }
      return
    }
    threadPool.execute(function () {
      writeLock.lock()
      try {
        disableClick = false
        clickButtonWindow.setPosition(-cvt(150), config.device_height * 0.65)
        sleep(50)
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

config.auto_start_rain && openRainPage()

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
    drawText('请进入能量雨界面并手动开始，音量上键可关闭', { x: displayInfoZone[0], y: displayInfoZone[1] - 200 }, canvas, paint)
    drawText('将在' + countdown.toFixed(0) + 's后自动关闭', { x: displayInfoZone[0], y: displayInfoZone[1] - 150 }, canvas, paint)
    drawText('点击倒计时：' + (VIOLENT_CLICK_TIME - passedTime).toFixed(1) + 's', { x: displayInfoZone[0], y: displayInfoZone[1] - 100 }, canvas, paint, '#00ff00')

    passwindow = new Date().getTime() - startTime

    if (disableClick) {
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
        disableClick = !disableClick
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
  if (config.auto_start_rain) {
    // 执行结束后关闭自动启动
    var configStorage = storages.create(_storage_name)
    configStorage.put("auto_start_rain", false)
  }
})

// ---------------------
function changeButtonInfo () {
  isWaiting = false
  clickButtonWindow.changeStatus.setText(disableClick ? '开始点击' : enableViolent ? '音量下停止点击' : '停止点击')
  clickButtonWindow.changeStatus.setBackgroundColor(disableClick ? colors.parseColor('#9ed900') : colors.parseColor('#f36838'))
  if (disableClick) {
    clickButtonWindow.setPosition(cvt(100), config.device_height * 0.65)
  }
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
  widgetUtils.widgetWaiting('.*返回蚂蚁森林.*') && config.auto_start_rain && checkAndStartCollect()
  ui.run(function () {
    clickButtonWindow.openRainPage.setText('打开能量雨界面')
  })
  starting = false
}