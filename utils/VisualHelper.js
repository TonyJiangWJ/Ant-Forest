/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-20 16:55:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-20 17:07:37
 * @Description: 
 */

let { config } = require('../config.js')(runtime, this)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
commonFunction.autoSetUpBangOffset()
let offset = config.bang_offset

function VisualHelper () {
  let self = this

  this.window = floaty.rawWindow(
    <canvas id="canvas" layout_weight="1" />
  );

  this.window.setSize(config.device_width, config.device_height)
  this.window.setTouchable(false)

  this.window.canvas.on("draw", function (canvas) {
    // try {
    // 清空内容
    canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)

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

    if (self.toDrawList && self.toDrawList.length > 0) {
      self.toDrawList.forEach(drawInfo => {
        switch(drawInfo.type) {
          case 'rect':
            drawRectAndText(drawInfo.text, drawInfo, rect, '#00ff00', canvas, paint)
            break
          default:
            debugInfo(['no match draw event for {}', drawInfo.type])
        }
      })
    }
  })

  this.toDrawList = []

  this.exitAndClean = function () {
    if (this.window !== null) {
      this.window.canvas.removeAllListeners()
      toastLog('close in 1 seconds')
      sleep(1000)
      this.window.close()
      this.window = null
    }
  }

  this.addRectangle = function (text, rectRegion) {
    this.toDrawList.push({
      type: 'rect',
      text: text,
      rect: rectRegion
    })
  }
}


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
  if (colorStr) {
    let color = colors.parseColor(colorStr)
    paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  } else {
    paint.setARGB(255, 0, 0, 255)
  }
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