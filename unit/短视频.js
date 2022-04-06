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
let isRunning = true

let clickButtonWindow = floaty.window(
  <frame id="container" gravity="center" >
    <vertical padding="1">
      <vertical>
        <button id="waitForClose" text="点击跳过或者关闭" />
      </vertical>
      <vertical>
        <button id="mute" text="关闭音量" />
      </vertical>
      <vertical>
        <button id="adjust" text="调整悬浮窗位置" />
      </vertical>
      <vertical>
        <button id="seeVideo" text="自动看10个视频" />
      </vertical>
      <vertical>
        <button id="watchBubbleAuto" text="自动点泡泡看广告" />
      </vertical>
      <vertical>
        <button id="fullAuto" text="自动看视频点泡泡" />
      </vertical>
      <vertical>
        <button id="closeBtn" text="关闭" />
      </vertical>
    </vertical>
  </frame>
);

/**
 * 等待跳过按钮
 */
function waitForCloseAndReturn () {
  let limit = 10
  let targetIdRegex = '.*(view_skip|close_btn)'
  let skipBtnRegex = '.*close_tip'
  while (!widgetUtils.idWaiting(targetIdRegex) && limit-- > 0) {
    toastLog('暂未找到按钮，等待')
    let skipTip = widgetUtils.widgetGetById(skipBtnRegex, 1000)
    if (skipTip) {
      automator.clickCenter(skipTip)
      randomSleep(2000)
    }
  }
  let skipBtn = widgetUtils.widgetGetById(targetIdRegex)
  if (skipBtn) {
    randomSleep(2000)
    automator.clickCenter(skipBtn)
  } else {
    toastLog('未找到可点击按钮')
  }
}
/**
 * 点击我知道了
 */
function clickIKnow () {
  let targetIdRegex = '.*flCancel'
  let skipBtn = widgetUtils.widgetGetById(targetIdRegex)
  if (skipBtn) {
    randomSleep(1000)
    automator.clickCenter(skipBtn)
  } else {
    toastLog('未找到可点击按钮')
  }
}

/**
 * 自动点泡泡并看广告
 */
function clickBubbleAndWatchAD () {
  let limit = 10
  let regex = '^\\+\\d+$'
  let doubleRegexId = '.*double.*'
  try {
    while (limit-- > 0 && widgetUtils.widgetGetOne(regex)) {
      let bubble = widgetUtils.widgetGetOne(regex)
      if (bubble) {
        automator.clickCenter(bubble)
        randomSleep(2000)
        let double = widgetUtils.widgetGetById(doubleRegexId)
        if (double) {
          automator.clickCenter(double)
          waitForCloseAndReturn()
          randomSleep(2000)
          clickIKnow()
        } else {
          toastLog('未找到广告，退出')
          return
        }
      }
      randomSleep(2000)
    }
    toastLog('结束泡泡')
  } catch (e) {
    errorInfo(['执行异常' + e], true)
  }
}
/**
 * 自动看10个视频
 */
function autoSeeVideo (limit) {
  limit = limit || 10
  while (limit-- > 0) {
    ui.run(function () {
      clickButtonWindow.seeVideo.setText('剩余' + limit + '个')
    })
    sleep(5000)
    automator.scrollDown()
  }
  ui.run(function () {
    clickButtonWindow.seeVideo.setText('自动看10个视频')
  })
}
let isAdjustEnabled = false
let waitForBtn = false
let watchBubble = false
resetFloaty()
function resetFloaty () {
  ui.run(function () {
    clickButtonWindow.setPosition(cvt(10), config.device_height * 0.5)
  })
}
function hideFloaty () {
  ui.run(function () {
    clickButtonWindow.setPosition(-~~(clickButtonWindow.getWidth() / 2), config.device_height * 0.5)
  })
}
clickButtonWindow.watchBubbleAuto.click(function () {
  if (watchBubble) {
    return
  }
  threadPool.execute(function () {
    watchBubble = true
    ui.run(function () {
      clickButtonWindow.watchBubbleAuto.setText('执行中...')
    })
    hideFloaty()
    randomSleep(1000)
    clickBubbleAndWatchAD()
    watchBubble = false
    ui.run(function () {
      clickButtonWindow.watchBubbleAuto.setText('自动点泡泡看广告')
    })
    resetFloaty()
  })
})
clickButtonWindow.waitForClose.click(function () {
  if (watchBubble || waitForBtn) {
    return
  }
  threadPool.execute(function () {
    waitForBtn = true
    ui.run(function () {
      clickButtonWindow.waitForClose.setText('等待中...')
    })
    hideFloaty()
    waitForCloseAndReturn()
    randomSleep(2000)
    clickIKnow()
    resetFloaty()
    waitForBtn = false
    ui.run(function () {
      clickButtonWindow.waitForClose.setText('点击跳过或者关闭')
    })
  })
})

clickButtonWindow.mute.click(function () {
  threadPool.execute(function () {
    let skipBtn = widgetUtils.widgetGetById('.*(sound_switch)')
    if (skipBtn) {
      automator.clickCenter(skipBtn)
    } else {
      toastLog('未找到可点击按钮')
    }
  })
})

clickButtonWindow.adjust.click(function () {
  isAdjustEnabled = !isAdjustEnabled
  clickButtonWindow.setAdjustEnabled(isAdjustEnabled)
  ui.run(function () {
    clickButtonWindow.adjust.setText(isAdjustEnabled ? '隐藏调整按钮' : '调整悬浮窗位置')
  })
})


let watching = false
clickButtonWindow.seeVideo.click(function () {
  if (watchBubble || watching) {
    return
  }
  threadPool.execute(function () {
    watching = true
    hideFloaty()
    autoSeeVideo()
    resetFloaty()
    watching = false
  })
})

let fullAutoOperating = false
clickButtonWindow.fullAuto.click(function () {
  if (watchBubble || watching || fullAutoOperating) {
    return
  }
  threadPool.execute(function () {
    fullAutoOperating = true
    hideFloaty()
    let limit = 10
    try {
      ui.run(function () {
        clickButtonWindow.fullAuto.setText('执行中，剩余' + limit + '次循环')
      })
      while (limit-- > 0) {
        autoSeeVideo(getRandom(6, 12))
        clickBubbleAndWatchAD()
        ui.run(function () {
          clickButtonWindow.fullAuto.setText('执行中，剩余' + limit + '次循环')
        })
      }
    } catch (e) {
      errorInfo(['自动执行异常' + e], true)
    }
    resetFloaty()
    ui.run(function () {
      clickButtonWindow.fullAuto.setText('自动看视频点泡泡')
    })
    fullAutoOperating = false
  })
})

clickButtonWindow.closeBtn.click(function () {
  exitAndClean()
})


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
      }
    }
  })
})

setInterval(function () {
  // 保持启动 半分钟一次设置当前脚本的前台运行
  runningQueueDispatcher.renewalRunningTask()
}, 30000)

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

function randomSleep (sleepTime) {
  sleep(1000 + ~~(Math.random() * sleepTime))
}

function getRandom (min, max) {
  return min + ~~(Math.random() * max * 10 % (max - min))
}