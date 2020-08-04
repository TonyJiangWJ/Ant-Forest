/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-04 14:35:59
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-04 20:27:09
 * @Description: 
 */
let resolver = require('./lib/AutoJSRemoveDexResolver.js')
resolver()
runtime.loadDex('./lib/color-region-center.dex')

importClass(com.tony.ColorCenterCalculator)
importClass(com.tony.ColorCenterCalculatorWithInterval)
importClass(com.tony.ScriptLogger)
resolver()

let { config } = require('./config.js')(runtime, this)
let sRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let SCRIPT_LOGGER = new ScriptLogger({
  log: function (message) {
    logInfo(message)
  },
  debug: function (message) {
    debugInfo(message)
  },
  error: function (message) {
    errorInfo(message)
  }
})
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
  let colorVal = colors.parseColor('#888888')
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
let grayImgInfo = null
let birthTime = new Date().getTime()
let threshold = 0
let flag = 1
let centerPoint = null

threads.start(function () {
  while (grayImgInfo === null || centerPoint === null) {
    let screen = captureScreen()
    if (screen) {
      let tmp = images.copy(screen)
      let tmp2 = images.grayscale(tmp)
      tmp.recycle()
      tmp=images.interval(tmp2, '#828282', 1)
      tmp2.recycle()
      let intervalImg = images.medianBlur(tmp, 5)
      tmp.recycle()
      let point = images.findColor(
        intervalImg, '#FFFFFF',
        { region: [1080 - 200, 0, 200, 2000] }
      )
      if (point) {
        console.log('find point：' + JSON.stringify(point))
        let calculator = new ColorCenterCalculatorWithInterval(
          intervalImg,
          config.device_width - 200, point.x, point.y
        )
        calculator.setScriptLogger(SCRIPT_LOGGER)
        calculator.setUseBfs(flag == 1)
        centerPoint = calculator.getCenterPoint()
        if (centerPoint) {
          calculator.getImg().recycle()
          console.info('find centerPoint: ' + JSON.stringify(centerPoint))
        }
      }
      screen.recycle()
      birthTime = new Date().getTime()
    }
    sleep(20)
  }
})

function exitAndClean () {
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
  }
  exit()
}
window.canvas.on("draw", function (canvas) {
  // try {
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
  paint.setTextSize(30)
  let countdown = (targetEndTime - new Date().getTime()) / 1000
  drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 100 }, canvas, paint)



  if (centerPoint) {
    drawText('' + centerPoint.regionSame, {x: centerPoint.x - 50, y: centerPoint.y - 50}, canvas, paint)
    drawRectAndText('', [parseInt(centerPoint.x) - 5, parseInt(centerPoint.y - 5), 10, 10], '#00ff00', canvas, paint)
  }
  paint.setTextSize(20)
  if (flag == 1) {
    drawText('使用BFS', { x: 100, y: 300 }, canvas, paint)
  } else {
    drawText('使用DFS', { x: 100, y: 300 }, canvas, paint)
  }
  // if (new Date().getTime() - birthTime > 1500) {
  //   grayImgInfo = null
  //   helpGrayImg = null
  // }
  passwindow = new Date().getTime() - startTime

  if (passwindow > 1000) {
    startTime = new Date().getTime()
  }
  // drawCoordinateAxis(canvas, paint)
  converted = true
  // } finally {
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