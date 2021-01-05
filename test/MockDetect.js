/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-12 20:33:18
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-05 23:01:02
 * @Description: 
 */
let resolver = require('../lib/AutoJSRemoveDexResolver.js')
resolver()
runtime.loadDex('../lib/color-region-center.dex')
importClass(com.tony.ColorCenterCalculatorWithInterval)
importClass(com.tony.ScriptLogger)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
resolver()

let { config: _config } = require('../config.js')(runtime, this)
_config.show_debug_log = true
_config.develop_mode = true
_config.save_log_file = false
_config.useTesseracOcr = false
_config.useOcr = false
_config.help_friend = true
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _commonFunctions = singletonRequire('CommonFunction')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile } = singletonRequire('LogUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let _ImgBasedFriendListScanner = require('../core/ImgBasedFriendListScanner.js')
const _checkPoints = []
for (let i = 0; i < 30 * _config.scaleRate; i++) {
  for (let j = 0; j < 30 * _config.scaleRate; j++) {
    if (i === j) {
      if (i <= 5) {
        _checkPoints.push([i, j, "#ffffff"])
      } else {
        _checkPoints.push([i, j, "#000000"])
      }
    }
  }
}
for (let i = 20; i < 30 * _config.scaleRate; i++) {
  for (let j = 30; j > 20 * _config.scaleRate; j--) {
    if (i - 20 === (30 - j)) {
      _checkPoints.push([i, j, "#000000"])
    }
  }
}
const MockFriendListScanner = function () {
  _ImgBasedFriendListScanner.call(this)
  this.collectOrHelpList = []

  this.checkBottomAndRecycle = function (grayScreen) {
    this.has_next = false
    grayScreen && grayScreen.recycle()
  }

  this.operateCollectIfNeeded = function (collectOrHelpList) {
    this.collectOrHelpList = collectOrHelpList
  }

  this.checkRunningCountdown = function (countingDownContainers) {
    this.collectOrHelpList = this.collectOrHelpList.concat(countingDownContainers)
  }
}
MockFriendListScanner.prototype = Object.create(_ImgBasedFriendListScanner.prototype)
MockFriendListScanner.prototype.constructor = _ImgBasedFriendListScanner

requestScreenCapture(false)

_commonFunctions.autoSetUpBangOffset(true)
let offset = _config.bang_offset


let scanner = new MockFriendListScanner()
scanner.init()
let points = null
let collecting = false
let scannerThread = threads.start(function () {
  while (true) {
    collecting = true
    scanner.collecting(true)
    points = scanner.collectOrHelpList
    collecting = false
    sleep(50)
  }
})


var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(1080, 2160)
window.setTouchable(false)

// function convertArrayToRect (a) {
//   // origin array left top width height
//   // left top right bottom
//   return new android.graphics.Rect(a[0], a[1], (a[0] + a[2]), (a[1] + a[3]))
// }
function convertArrayToRect (a) {
  // origin array left top right bottom
  return new android.graphics.Rect(a[0], a[1] + offset, a[2], a[3] + offset)
}

function convertRectShapeArray (a) {
  return [a[0], a[1], a[0] + a[2], a[1] + a[3]]
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
  let colorVal = colors.parseColor('#888888')
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

function drawPoints (x, y, points, canvas, paint) {
  points.forEach(p => {
    let px = p[0] + x, py = p[1] + y + offset
    canvas.drawPoint(px, py, paint)
  })
}

function exitAndClean () {
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
  }
  scannerThread.interrupt()
  scanner.destory()
  exit()
}

let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let threshold = 0

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
  drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 200 }, canvas, paint)

  if (points && points.length > 0) {
    points.forEach(pointData => {
      let point = pointData.point
      let height = point.bottom - point.top
      let width = point.right - point.left
      drawRectAndText('',
        convertRectShapeArray([
          point.left + width - width / Math.sqrt(2),
          point.top,
          width / Math.sqrt(2) / 2,
          height / Math.sqrt(2) / 2
        ]),
        '#ff0000', canvas, paint)
      if (pointData.isCountdown) {
        drawRectAndText('倒计时:' + pointData.countdown, [point.left - 10, point.top - 10, point.right + 10, point.bottom + 10], '#ff0000', canvas, paint)
        !collecting && drawPoints(point.left + width - width / Math.sqrt(2), point.top + 5, _checkPoints, canvas, paint)
      } else {
        drawRectAndText(pointData.isHelp ? '帮收' : '可收', [point.left - 10, point.top - 10, point.right + 10, point.bottom + 10], '#ff0000', canvas, paint)
        if (!pointData.isHelp && pointData.matchPoint && !collecting) {
          let matchPoint = pointData.matchPoint
          drawPoints(matchPoint.x, matchPoint.y, _checkPoints, canvas, paint)
        }
      }
      drawText(point.same, { x: point.left, y: point.top - 30 }, canvas, paint)
    })
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
        save_img = true
        toastLog('准备保存图片')
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
toastLog('done')
