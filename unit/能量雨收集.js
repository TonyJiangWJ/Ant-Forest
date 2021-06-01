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
      compareEngine.forceStop()
    }
  })
}
let { config } = require('../config.js')(runtime, this)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let fileUtils = sRequire('FileUtils')
let commonFunction = sRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
if (!commonFunction.requestScreenCaptureOrRestart(true)) {
  toastLog('获取截图权限失败，无法执行')
  exit()
}
let runningQueueDispatcher = sRequire('RunningQueueDispatcher')
commonFunction.autoSetUpBangOffset(true)
runningQueueDispatcher.addRunningTask()
let offset = config.bang_offset

let SCALE_RATE = config.scaleRate
let cvt = (v) => parseInt(v * SCALE_RATE)

var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(config.device_width, config.device_height)
window.setTouchable(false)

function convertArrayToRect (a) {
  // origin array left top width height
  // left top right bottom
  return new android.graphics.Rect(a[0], a[1] + offset, (a[0] + a[2]), (a[1] + offset + a[3]))
}

function getPositionDesc (position) {
  return position[0] + ', ' + position[1] + ' w:' + position[2] + ',h:' + position[3]
}

function getRectCenter (position) {
  return {
    x: parseInt(position[0] + position[2] / 2),
    y: parseInt(position[1] + position[3] / 2)
  }
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
  // let center = getRectCenter(position)
  // canvas.drawText(getPositionDesc(position), center.x, center.y, paint)
}

function drawText (text, position, canvas, paint, colorStr) {
  colorStr = colorStr || '#0000ff'
  let color = colors.parseColor(colorStr)
  paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(text, position.x, position.y + offset, paint)
}



function drawCoordinateAxis (canvas, paint) {
  let width = canvas.width
  let height = canvas.height
  paint.setStyle(Paint.Style.FILL)
  paint.setTextSize(10)
  let colorVal = colors.parseColor('#65f4fb')
  paint.setARGB(255, colorVal >> 16 & 0xFF, colorVal >> 8 & 0xFF, colorVal & 0xFF)
  for (let x = 50; x < width; x += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(x, x + offset, 10, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(x, 0 + offset, x, height + offset, paint)
  }

  for (let y = 50; y < height; y += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(y, 0 + offset, y, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(0, y + offset, width, y + offset, paint)
  }
}

let threadPool = new ThreadPoolExecutor(2, 4, 60,
  TimeUnit.SECONDS, new LinkedBlockingQueue(16),
  new ThreadFactory({
    newThread: function (runnable) {
      let thread = Executors.defaultThreadFactory().newThread(runnable)
      thread.setName('energy-rain-' + thread.getName())
      return thread
    }
  })
)
let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let isTest = true
let isRunning = true
let recoZone = [config.device_width * 0.05, config.device_height * 0.3, config.device_width * 0.9, 150 * config.scaleRate]
let writeLock = threads.lock()
let clickComplete = writeLock.newCondition()
let ballsComplete = writeLock.newCondition()
let findBalls = null


let recognize_region = null
let lost_recognize_region = null

threadPool.execute(function () {
  while (isRunning) {
    let start = new Date().getTime()
    debugInfo(['开始请求截图'])
    let screen = captureScreen()
    if (screen) {
      debugInfo(['请求截图成功：{}ms', new Date().getTime() - start])
      try {
        let originImg = images.copy(screen, true)
        if (recognize_region === null) {
          recognize_region = [0, originImg.height * 0.1, originImg.width, originImg.height * 0.2]
          lost_recognize_region = [0, originImg.height * 0.5, originImg.width, originImg.height * 0.2]
        }
        let balls = doRecognizeBalls(originImg, recognize_region)
        if (balls && balls.length > 0) {
          debugInfo(['find balls cost time: {}ms count: {} {}', new Date().getTime() - start, balls.length, JSON.stringify(balls)])
          writeLock.lock()
          try {
            findBalls = balls
            ballsComplete.signal()
            // 等待点击完毕
            clickComplete.await()
          } finally {
            writeLock.unlock()
          }
        } else {
          debugInfo(['no ball found cost: {}', new Date().getTime() - start])
        }
        originImg.recycle()
      } catch (e) {
        errorInfo('识别线程执行异常' + e)
        commonFunction.printExceptionStack(e)
      }
    } else {
      debugInfo(['请求截图失败：{}ms', new Date().getTime() - start])
    }
  }
})

function doRecognizeBalls (originImg, region) {
  return images.findCircles(images.grayscale(images.medianBlur(originImg, 5)), {
    param1: config.hough_param1 || 30,
    param2: config.hough_param2 || 30,
    minRadius: config.hough_min_radius || cvt(65),
    maxRadius: config.hough_max_radius || cvt(75),
    minDst: config.hough_min_dst || cvt(100),
    // 点5次校验一次遗漏
    region: region
  })
}


// 点击线程
threadPool.execute(function () {
  while (isRunning) {
    writeLock.lock()
    if (findBalls == null) {
      debugInfo(['图片未识别完成，等待'])
      ballsComplete.await()
    }
    try {
      debugInfo(['图片识别识别完成，得到球个数：{}', findBalls.length])
      let start = new Date().getTime()
      // 只点击最后一个
      clickLastBall(findBalls)
      debugInfo(['点击完毕 耗时：{}ms', new Date().getTime() - start])
      findBalls = null
      clickComplete.signal()
    } catch (e) {
      errorInfo('点击线程执行异常：' + e)
      commonFunction.printExceptionStack(e)
    } finally {
      writeLock.unlock()
    }
  }
})

function clickLastBall (balls) {
  if (balls && balls.length > 0) {
    if (isTest) {
      // 模拟点击耗时
      sleep(150)
    } else {
      let clickBall = balls.sort((a, b) => b.y - a.y)[0]
      automator.click(clickBall.x, recognize_region[1] + clickBall.y + clickBall.radius * 2.5)
    }
  }
}

function exitAndClean () {
  if (!isRunning) {
    return
  }
  runningQueueDispatcher.removeRunningTask()
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
  }
  isRunning = false
  threadPool.shutdown()
  debugInfo(['等待线程池关闭:{}', threadPool.awaitTermination(5, TimeUnit.SECONDS)])
  exit()
}

window.canvas.on("draw", function (canvas) {
  if (!isRunning) {
    return
  }
  try {
    // 清空内容
    canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)
    if (!converted) {
      toastLog('画布大小：' + canvas.getWidth() + ', ' + canvas.getHeight())
    }
    let Typeface = android.graphics.Typeface
    let paint = new Paint()
    paint.setStrokeWidth(1)
    paint.setTypeface(Typeface.DEFAULT_BOLD)
    paint.setTextAlign(Paint.Align.LEFT)
    paint.setAntiAlias(true)
    paint.setStrokeJoin(Paint.Join.ROUND)
    paint.setDither(true)

    if (findBalls && findBalls.length > 0) {
      let forClickBalls = findBalls
      forClickBalls && forClickBalls.forEach(ball => {
        drawRectAndText('能量球', [ball.x - ball.radius, recognize_region[1] + ball.y - ball.radius, ball.radius * 2, ball.radius * 2], '#ff00ff', canvas, paint)
      })
    }

    recognize_region != null && drawRectAndText('识别区域', recognize_region, '#888888', canvas, paint)

    // 倒计时
    paint.setTextSize(30)
    let countdown = (targetEndTime - new Date().getTime()) / 1000
    drawText('请进入能量雨界面并手动开始，音量上键可关闭', { x: recoZone[0], y: recoZone[1] - 200 }, canvas, paint)
    drawText('将在' + countdown.toFixed(0) + 's后自动关闭', { x: recoZone[0], y: recoZone[1] - 150 }, canvas, paint)
    drawText('音量下键进入' + (isTest ? '点击模式' : '识别模式'), { x: recoZone[0], y: recoZone[1] - 100 }, canvas, paint, '#ff0000')
    passwindow = new Date().getTime() - startTime

    if (passwindow > 1000) {
      startTime = new Date().getTime()
      console.verbose('关闭倒计时：' + countdown.toFixed(2))
    }

    converted = true
  } catch (e) {
    commonFunction.printExceptionStack(e)
    exitAndClean()
  }
});

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
        isTest = !isTest
      }
    }
  })
})

setTimeout(function () { exitAndClean() }, 120000)