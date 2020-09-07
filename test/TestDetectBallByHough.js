
let { config } = require('../config.js')(runtime, this)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)

let offset = -90

config.show_debug_log = true
requestScreenCapture(false)
var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(config.device_width, config.device_height)
window.setTouchable(false)


let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let grayImgInfo = null
let birthTime = new Date().getTime()
let threshold = 0
let flag = 1
let clickPoints = []
let findBalls = []

let rgbImg = null

let scaleRate = config.device_width / 1080
let lock = threads.lock()
let condition = lock.newCondition()

let detectThread = threads.start(function () {

  while (true) {
    let start = new Date().getTime()
    if (new Date().getTime() - birthTime > 1500) {
      findBalls = []
      lock.lock()
      condition.await()
      lock.unlock()
      sleep(200)
      let screen = checkCaptureScreenPermission()
      if (screen) {
        rgbImg = images.copy(screen, true)
        if (rgbImg != null)
          log('copy rgbImg')
        else
          log('copy rgbImg failed')
        if (flag == 1) {
          screen = images.medianBlur(screen, 5)
        } else {
          screen = images.gaussianBlur(screen, 5)
        }
        grayImgInfo = images.grayscale(screen)
        birthTime = new Date().getTime()
        findBalls = images.findCircles(
          grayImgInfo,
          {
            param1: 100,
            param2: 30,
            minRadius: 65 * scaleRate,
            maxRadius: 75 * scaleRate,
            minDst: 100 * scaleRate,
            // region: detectRegion
          }
        )
        debugInfo(['grayImage: [data:image/png,base64 {}]', images.toBase64(grayImgInfo)])
        debugInfo(['找到的球:{}', JSON.stringify(findBalls)])
        clickPoints = []
        findBalls.forEach(b => {
          if (!(b.x > 40 && b.y > 40 && b.x < config.device_width - 80 && b.y < config.device_height - 40)) {
            return
          }
          let p = null
          let region = [b.x - 40, b.y + 70, 60, 50]
          if (rgbImg != null) {
            log('rgbImg is not null')
            p = images.findColor(rgbImg, '#f2a45a', { region: region, threshold: 30 }) || images.findColor(rgbImg, '#e6cca6', { region: region, threshold: 30 })
            if (p && (!true || images.findColor(rgbImg, '#2dad39', { region: [b.x - 40, b.y - 40, 80, 80], threshold: 30 }) || images.findColor(rgbImg, '#278a70', { region: [b.x - 40, b.y - 40, 80, 80], threshold: 30 }))) {
              clickPoints.push({ ball: p, isHelp: true, color: colors.toString(rgbImg.getBitmap().getPixel(p.x, p.y)) })
              return
            }
          } else {
            log('rgbImg is null')
          }
          // drawRectAndText('', region , '#808080', canvas, paint)
          p = images.findColor(rgbImg, '#2dad39', { region: region, threshold: 6 }) || images.findColor(rgbImg, '#0fe4ff', { region: region, threshold: 6 })
          if (p) {
            clickPoints.push({ ball: p, isHelp: false, color: colors.toString(rgbImg.getBitmap().getPixel(p.x, p.y)) })
          }
          /* else if ((p = images.findColor(grayImgInfo, '#c6c6c6', { region: [b.x - 40, b.y - 40, 80, 80], threshold: 16 })) !== null) {
            clickPoints.push({ ball: p, isHelp: true, color: colors.toString(grayImgInfo.getBitmap().getPixel(p.x, p.y)) })
          }*/
        })
        rgbImg && rgbImg.recycle()
        logInfo(['寻找可收取点耗时:{}ms', new Date().getTime() - start])
      } else {
        warnInfo(['重新申请截图权限:{}', requestScreenCapture(false)])
      }
    }
    sleep(1000)
  }
})

function exitAndClean () {
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
    window = null
  }
  if (detectThread) {
    detectThread.interrupt()
    detectThread = null
  }
  resourceMonitor.releaseAll()
  exit()
}

commonFunction.registerOnEngineRemoved(function () {
  exitAndClean()
})

window.canvas.on("draw", function (canvas) {
  // try {
  // 清空内容
  canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR);
  try {
    lock.lock()
    condition.signal()
    lock.unlock()
  } catch (e) { }

  var width = canvas.getWidth()
  var height = canvas.getHeight()
  if (!converted) {
    toastLog('画布大小：' + width + ', ' + height)
  }

  // let canvas = new com.stardust.autojs.core.graphics.ScriptCanvas(width, height)
  let Typeface = android.graphics.Typeface
  var paint = new Paint()
  paint.setStrokeWidth(1)
  paint.setTypeface(Typeface.DEFAULT_BOLD)
  paint.setTextAlign(Paint.Align.LEFT)
  paint.setAntiAlias(true)
  paint.setStrokeJoin(Paint.Join.ROUND)
  paint.setDither(true)
  // drawRectAndText('检测区域', detectRegion, '#ffffff', canvas, paint)
  paint.setTextSize(30)
  let countdown = (targetEndTime - new Date().getTime()) / 1000
  drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 200 }, canvas, paint)
  // drawText('当前相似度' + threshold, { x: 100, y: 500 }, canvas, paint)
  drawText('滤波方式：' + (flag == 1 ? '中值滤波' : '高斯滤波'), { x: 100, y: 400 }, canvas, paint)
  // if (drawPoint) {
  //   drawRectAndText('Matched', [drawPoint.x - 50, drawPoint.y - 50, 100, 100], '#00ff00', canvas, paint)
  // }
  if (findBalls && findBalls.length > 0) {
    // canvas.drawImage(grayImgInfo, 0, 0, paint)
    findBalls.forEach(b => {
      let region = [b.x - 40, b.y + 70, 60, 50]
      drawRectAndText('', region, '#808080', canvas, paint)
      // drawRectAndText('', [b.x + detectRegion[0], b.y + detectRegion[1], b.radius, b.radius], '#00ffff', canvas, paint)
      paint.setStrokeWidth(3)
      paint.setStyle(Paint.Style.STROKE)
      canvas.drawCircle(b.x, b.y + offset, b.radius, paint)
    })
  }

  //******* */
  if (clickPoints && clickPoints.length > 0) {
    drawText("可点击数: " + clickPoints.length, { x: 100, y: 450 }, canvas, paint)

    let startX = 0
    let startY = 0
    clickPoints.forEach((s) => {
      let p = s.ball
      drawRectAndText('', [p.x + startX - 5, p.y + startY - 5, 10, 10], '#808080', canvas, paint)
      drawRectAndText((s.isHelp ? 'help' : 'collect') + ' ' + s.color, [p.x + startX - 25 - 2, p.y + startY - 2, 4, 4], '#000000', canvas, paint)
      drawRectAndText('', [p.x + startX + 25 - 2, p.y + startY - 2, 4, 4], '#808080', canvas, paint)
    })
  }
  passwindow = new Date().getTime() - startTime

  if (passwindow > 1000) {
    // console.verbose('可点击点：' + JSON.stringify(clickPoints))
    startTime = new Date().getTime()
    // console.verbose('关闭倒计时：' + countdown.toFixed(2))
  }

  // drawCoordinateAxis(canvas, paint)
  converted = true
  // } catch (e) {
  //   toastLog(e)
  //   exitAndClean()
  // }
});

let lastChangedTime = new Date().getTime()
threads.start(function () {
  toastLog('按音量上键关闭，音量下切换')
  events.observeKey()
  events.on("key_down", function (keyCode, event) {
    if (keyCode === 24) {
      // 设置最低间隔200毫秒，避免修改太快
      exitAndClean()
    } else if (keyCode === 25) {
      // 设置最低间隔200毫秒，避免修改太快
      if (new Date().getTime() - lastChangedTime > 200) {
        flag = (flag + 1) % 2
      }
    }

    if (threshold < 0) {
      threshold = 0
    } else if (threshold > 255) {
      threshold = 255
    }
  })
})

setTimeout(function () { exitAndClean() }, 120000)




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
    canvas.drawText(x, x, 10 + offset, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(x, 0, x + offset, height, paint)
  }

  for (let y = 50; y < height; y += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(y, 0, y + offset, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(0, y + offset, width, y + offset, paint)
  }
}


function checkCaptureScreenPermission (errorLimit) {
  errorLimit = errorLimit || 3
  // 获取截图 用于判断是否可收取
  let screen = null
  let errorCount = 0
  let start = new Date().getTime()
  do {
    commonFunction.waitFor(function () {
      let max_try = 10
      while (!screen && max_try-- > 0) {
        screen = captureScreen()
      }
    }, config.capture_waiting_time || 500)
    if (!screen) {
      debugInfo('获取截图失败 再试一次 count:' + (++errorCount))
    }
  } while (!screen && errorCount < errorLimit)
  if (!screen) {
    errorInfo(['获取截图失败多次[{}], 可能已经没有了截图权限，重新执行脚本', errorCount], true)
    requestScreenCapture()
  }
  debugInfo(['获取截图耗时：{}ms', new Date().getTime() - start])
  return screen
}