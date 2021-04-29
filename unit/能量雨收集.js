let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(engine => {
    let compareEngine = engine
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      engines.myEngine().forceStop()
    }
  })
}
let sRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let { config } = require('../config.js')(runtime, this)
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

function drawText (text, position, canvas, paint) {
  paint.setARGB(255, 0, 0, 255)
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


let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let showAxis = true
let rainBall = null
let isTest = false
let shouldClick = true
let clickPassed = 0
let lastClick = -100
let lastClickPoint = { x: 0, y: 0 }
let count = 0
let captureCount = 0
let clickCount = 0
const MIN_DISTANCE = 150
function checkDistance (p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

let recoZone = [config.device_width * 0.05, config.device_height * 0.3, config.device_width * 0.9, 150 * config.scaleRate]
let recoZone2 = [config.device_width * 0.05, config.device_height * 0.4, config.device_width * 0.9, 150 * config.scaleRate]

function getCurrentZone(clickCount) {
  return clickCount % 2 === 0 ? recoZone : recoZone2 
}

let refreshThread = threads.start(function () {
  while (true) {
    let screen = captureScreen()
    if (screen) {
      captureCount++
      let intervalImg = images.inRange(screen, '#1A8000', '#5FBC15')
      let point = images.findColor(intervalImg, '#FFFFFF', { region: getCurrentZone(clickCount) })
      if (point) {
        rainBall = {
          x: point.x, y: point.y
        }
        count++
        clickPassed = new Date().getTime() - lastClick
        if (clickPassed > 100) {
          if (checkDistance(rainBall, lastClickPoint) > MIN_DISTANCE) {
            shouldClick = true
          }
        }
      } else {
        rainBall = null
      }
    }
    sleep(20)
  }
})

function exitAndClean () {
  runningQueueDispatcher.removeRunningTask()
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
  }
  refreshThread.interrupt()
  exit()
}
let back_img = null
let clickOffset = 100
if (files.exists(fileUtils.getCurrentWorkPath() + '/resources/region_check.jpg')) {
  back_img = images.read(fileUtils.getCurrentWorkPath() + '/resources/region_check.jpg')
}

let clickLock = threads.lock()
window.canvas.on("draw", function (canvas) {
  try {
    // 清空内容
    canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR);
    let width = canvas.getWidth()
    let height = canvas.getHeight()
    if (!converted) {
      toastLog('画布大小：' + width + ', ' + height)
    }
    // let canvas = new com.stardust.autojs.core.graphics.ScriptCanvas(width, height)
    let Typeface = android.graphics.Typeface
    let paint = new Paint()
    paint.setStrokeWidth(1)
    paint.setTypeface(Typeface.DEFAULT_BOLD)
    paint.setTextAlign(Paint.Align.LEFT)
    paint.setAntiAlias(true)
    paint.setStrokeJoin(Paint.Join.ROUND)
    paint.setDither(true)
    // 打印排行榜判断区域

    if (rainBall) {
      // drawRectAndText('能量球', [rainBall.x, rainBall.y + 100, 50, 50], '#ff00ff', canvas, paint)
      // if (enableClick && shouldClick) {
      if (shouldClick) {
        let currentZone = getCurrentZone(clickCount)
        clickCount++
        if (isTest) {
          drawRectAndText('点击能量球', [rainBall.x + 50, rainBall.y + clickOffset, 50, 50], '#ff00ff', canvas, paint)
        } else {

          drawRectAndText('点击能量球', [rainBall.x, rainBall.y, 5, 5], '#ff00ff', canvas, paint)
          threads.start(function () {
            let newBall = { x: rainBall.x, y: rainBall.y }
            let down_off = newBall.y - currentZone[1]
            clickLock.lock()
            try {
              automator.click(newBall.x + 25 * config.scaleRate, currentZone[1] + down_off + 145 * config.scaleRate)
              sleep(10)
            } finally {
              clickLock.unlock()
            }
          })

        }
        shouldClick = false
        lastClick = new Date().getTime()
        lastClickPoint = rainBall
      }
    }
    if (isTest && lastClickPoint) {
      drawRectAndText('点击能量球', [lastClickPoint.x + 20, lastClickPoint.y + clickOffset, 50, 50], '#ff00ff', canvas, paint)
    }


    drawRectAndText((isTest ? '测试模式 ' : '') + '识别区域, 次数：' + count + '/' + captureCount + ' 点击次数：' + clickCount, recoZone, '#ff0000', canvas, paint)
    drawRectAndText('识别区域2', recoZone2, '#ff0000', canvas, paint)

    // 倒计时
    paint.setTextSize(30)
    let countdown = (targetEndTime - new Date().getTime()) / 1000
    drawText('请进入能量雨界面并手动开始，音量上键可关闭', { x: recoZone[0], y: recoZone[1] - 200 }, canvas, paint)
    drawText('将在' + countdown.toFixed(0) + 's后自动关闭', { x: recoZone[0], y: recoZone[1] - 150 }, canvas, paint)
    drawText('音量下键进入测试模式', { x: recoZone[0], y: recoZone[1] - 100 }, canvas, paint)
    passwindow = new Date().getTime() - startTime

    if (passwindow > 1000) {
      startTime = new Date().getTime()
      console.verbose('关闭倒计时：' + countdown.toFixed(2))
    }


    if (showAxis) {
      drawCoordinateAxis(canvas, paint)
    }
    converted = true
  } catch (e) {
    commonFunction.printExceptionStack(e)
    exitAndClean()
  }
});

let lastChangedTime = new Date().getTime()
threads.start(function () {
  toastLog('按音量上键关闭，音量下切换测试模式')
  events.observeKey()
  events.on("key_down", function (keyCode, event) {
    if (keyCode === 24) {
      exitAndClean()
    } else if (keyCode === 25) {
      // 设置最低间隔200毫秒，避免修改太快
      if (new Date().getTime() - lastChangedTime > 200) {
        lastChangedTime = new Date().getTime()
        showAxis = !showAxis
        isTest = !isTest
      }
    }
  })
})

setTimeout(function () { exitAndClean() }, 120000)