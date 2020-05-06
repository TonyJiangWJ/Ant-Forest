
let { config } = require('./config.js')(runtime, this)
let sRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')

config.show_debug_log = true
requestScreenCapture(false)
var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(1080, 2160)
window.setTouchable(false)

function convertArrayToRect (a) {
  // origin array left top width height
  // left top right bottom
  return new android.graphics.Rect(a[0], a[1], (a[0] + a[2]), (a[1] + a[3]))
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
  canvas.drawText(desc, position[0], position[1], paint)
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
  canvas.drawText(text, position.x, position.y, paint)
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
    canvas.drawText(x, x, 10, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(x, 0, x, height, paint)
  }

  for (let y = 50; y < height; y += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(y, 0, y, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(0, y, width, y, paint)
  }
}


let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let count = 0
let drawPoint = null
let detectRegion = [150, 500, 750, 350]
let grayImgInfo = null
let birthTime = new Date().getTime()
let threshold = 0
let flag = 1
let clickPoints = []

let helpGrayImg = null

let detectHelpThread = threads.start(function (){
  while(true) {
    let start = new Date().getTime()
    let screen = captureScreen()
    if (screen) {
      let copyImg = images.grayscale(screen)
      let intervalImg = null
      if (new Date().getTime() - birthTime > 1500) {

        intervalImg = images.inRange(copyImg, '#838383', '#9a9a9a')
        if (flag == 1) {
          intervalImg = images.medianBlur(intervalImg, 5)
        } else {
          intervalImg = images.gaussianBlur(intervalImg, 5)
        }
        helpGrayImg = images.clip(intervalImg, detectRegion[0], detectRegion[1], detectRegion[2], detectRegion[3])
        birthTime = new Date().getTime()
      }
      copyImg.recycle()
      if (intervalImg !== null) {
        intervalImg.recycle()
      }
      logInfo(['寻找可收取点耗时:{}ms', new Date().getTime() - start])
    } else {
      warnInfo(['重新申请截图权限:{}', requestScreenCapture(false)])
    }
    sleep(1000)
  }
})

let detectThread = threads.start(function () {
  while (true) {
    let start = new Date().getTime()
    let screen = commonFunction.checkCaptureScreenPermission()
    if (screen) {
      let copyImg = images.grayscale(screen)
      let intervalImg = null
      if (new Date().getTime() - birthTime > 1500) {

        intervalImg = images.inRange(copyImg, '#c8c8c8', '#cacaca')
        if (flag == 1) {
          intervalImg = images.medianBlur(intervalImg, 5)
        } else {
          intervalImg = images.gaussianBlur(intervalImg, 5)
        }
        grayImgInfo = images.clip(intervalImg, detectRegion[0], detectRegion[1], detectRegion[2], detectRegion[3])
        birthTime = new Date().getTime()
      }
      copyImg.recycle()
      if (intervalImg !== null) {
        intervalImg.recycle()
      }
      logInfo(['寻找可收取点耗时:{}ms', new Date().getTime() - start])
    } else {
      warnInfo(['重新申请截图权限:{}', requestScreenCapture(false)])
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
  }
  // if (detectThread) {
  //   detectThread.interrupt()
  // }
  exit()
}

let getDistance = function (p, lpx, lpy) {
  return Math.sqrt(Math.pow(p.x - lpx, 2) + Math.pow(p.y - lpy, 2))
}
window.canvas.on("draw", function (canvas) {
  try {
    // 清空内容
    canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR);
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
    drawRectAndText('检测区域', detectRegion, '#ffffff', canvas, paint)
    paint.setTextSize(30)
    let countdown = (targetEndTime - new Date().getTime()) / 1000
    drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 100 }, canvas, paint)
    // drawText('当前相似度' + threshold, { x: 100, y: 500 }, canvas, paint)
    drawText('滤波方式：' + (flag == 1 ? '中值滤波' : '高斯滤波'), { x: 100, y: 400 }, canvas, paint)
    if (drawPoint) {
      drawRectAndText('Matched', [drawPoint.x - 50, drawPoint.y - 50, 100, 100], '#00ff00', canvas, paint)
    }
    if (grayImgInfo) {
      canvas.drawImage(grayImgInfo, detectRegion[0], detectRegion[1], paint)
      clickPoints = []
      let lastPx = -130
      let lastPy = -130
      let o = 225
      for (let x = 0; x <= 625; x += 125) {
        let offset = x == 375 ? o : Math.abs(o -= 75)
        if (offset == 75) {
          offset = 90
        }
        let iiimg = images.copy(grayImgInfo)
        let p = images.findMultiColors(iiimg, "#ffffff", [[-25, 0, "#ffffff"],[25, 0, "#ffffff"]], { region: [x, offset, 125, 350 - offset]})
        // let p = images.findColor(iiimg, '#ffffff',
        //   { region: [x, offset, 125, 350 - offset], threshold: 0 })
        if (p && getDistance(p, lastPx, lastPy) >= 100) {
          clickPoints.push(p)
          lastPx = p.x
          lastPy = p.y
        }
        iiimg.recycle()
      }
    }
    if (helpGrayImg) {
      canvas.drawImage(helpGrayImg, detectRegion[0], detectRegion[1], paint)
    }

    if (clickPoints && clickPoints.length > 0) {
      drawText("可点击数: " + clickPoints.length, { x: 100, y: 450 }, canvas, paint)

      clickPoints.forEach((p) => {
        drawRectAndText('', [p.x + 145, p.y + 500 - 5, 10, 10], '#00ffff', canvas, paint)
        drawRectAndText('', [p.x + 150 - 25 - 2, p.y + 500 - 2, 4, 4], '#ff00ff', canvas, paint)
        drawRectAndText('', [p.x + 150 + 25 - 2, p.y + 500 - 2, 4, 4], '#ff00ff', canvas, paint)
      })
    }

    if (new Date().getTime() - birthTime > 1500) {
      grayImgInfo = null
      helpGrayImg = null
    }
    passwindow = new Date().getTime() - startTime

    if (passwindow > 1000) {
      startTime = new Date().getTime()
      // console.verbose('关闭倒计时：' + countdown.toFixed(2))
    }
    let o = 225
    for (let x = 150; x <= 775; x += 125) {
      let offset = x == 525 ? o : Math.abs(o -= 75)
      if (offset == 75) {
        offset = 90
      }
      drawRectAndText('' + offset, [x, 500 + offset, 125, 350 - offset], '#00ff00', canvas, paint)
    }
    drawCoordinateAxis(canvas, paint)
    converted = true
  } catch (e) {
    toastLog(e)
    exitAndClean()
  }
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