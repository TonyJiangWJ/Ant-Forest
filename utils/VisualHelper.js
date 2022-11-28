/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-20 16:55:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-11-13 14:01:31
 * @Description: 
 */

let { config } = require('../config.js')(runtime, global)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let offset = config.bang_offset

function VisualHelper () {
  let self = this
  this.window = null
  this.toDrawList = []
  this.drawer = null
  this.disableTips = false

  this.init = function () {
    if (!config.enable_visual_helper) {
      return
    }
    commonFunction.autoSetUpBangOffset()
    this.window = floaty.rawWindow(
      <canvas id="canvas" layout_weight="1" />
    )

    this.window.setSize(config.device_width, config.device_height)
    this.window.setTouchable(false)

    let Typeface = android.graphics.Typeface
    var paint = new Paint()
    paint.setStrokeWidth(1)
    paint.setTypeface(Typeface.DEFAULT_BOLD)
    paint.setTextAlign(Paint.Align.LEFT)
    paint.setAntiAlias(true)
    paint.setStrokeJoin(Paint.Join.ROUND)
    paint.setDither(true)
    paint.setTextSize(30)
    this.window.canvas.on("draw", function (canvas) {
      // try {
      // 清空内容
      canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)
      if (self.drawer == null) {
        self.drawer = new Drawer(canvas, paint)
      }

      // let canvas = new com.stardust.autojs.core.graphics.ScriptCanvas(width, height)

      !self.disableTips && drawText('可视化辅助工具运行中', { x: 100, y: 300 + offset }, canvas, paint, null, 30)
      let toDrawList = self.toDrawList
      if (toDrawList && toDrawList.length > 0) {
        toDrawList.forEach(drawInfo => {
          try {
            switch (drawInfo.type) {
              case 'rect':
                self.drawer.drawRectAndText(drawInfo.text, drawInfo.rect, drawInfo.color || '#00ff00')
                break
              case 'circle':
                self.drawer.drawCircleAndText(drawInfo.text, drawInfo.circle, drawInfo.color || '#00ff00')
                break
              case 'text':
                self.drawer.drawText(drawInfo.text, drawInfo.position, drawInfo.color || '#00ff00')
                break
              default:
                debugInfo(['no match draw event for {}', drawInfo.type], true)
            }
          } catch (e) {
            errorInfo('执行异常' + e)
            commonFunction.printExceptionStack(e)
          }
        })
      }
    })
  }

  this.disableTip = function () {
    this.disableTips = true
  }

  this.closeDialog = function () {
    if (!config.enable_visual_helper) {
      return
    }
    debugInfo('关闭悬浮窗')
    if (this.window !== null) {
      this.window.canvas.removeAllListeners()
      this.window.close()
      this.window = null
    }
  }

  this.displayAndClearAll = function (timeout) {
    if (!config.enable_visual_helper) {
      return this
    }
    timeout = timeout || 1000
    if (this.toDrawList && this.toDrawList.length > 0) {
      debugInfo(['展示所有元素并等待{}秒 总数：{}', timeout / 1000, this.toDrawList.length])
      sleep(timeout)
      this.toDrawList = []
    }
    return this
  }

  this.addRectangle = function (text, rectRegion, color) {
    if (!config.enable_visual_helper) {
      return this
    }
    if (!validRegion(rectRegion)) {
      errorInfo(['区域信息无效: {}', JSON.stringify(rectRegion)])
      return this
    }
    ui.run(function () {
      debugInfo(['添加方形区域 {} {}', text, JSON.stringify(rectRegion)])
      self.toDrawList.push({
        type: 'rect',
        text: text,
        rect: rectRegion,
        color: color,
      })
    })
    return this
  }

  this.isValidRectangle = function (r) {
    return validRegion(r)
  }

  this.addCircle = function (text, circleInfo, color) {
    if (!config.enable_visual_helper) {
      return this
    }
    ui.run(function () {
      debugInfo(['添加圆形区域 {} {}', text, JSON.stringify(circleInfo)])
      self.toDrawList.push({
        type: 'circle',
        text: text,
        circle: circleInfo,
        color: color,
      })
    })
    return this
  }

  this.addText = function (text, position, color) {
    if (!config.enable_visual_helper) {
      return this
    }
    ui.run(function () {
      debugInfo(['添加文本区域 {} {}', text, JSON.stringify(position)])
      self.toDrawList.push({
        type: 'text',
        text: text,
        position: position,
        color: color,
      })
    })
    return this
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
  paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  canvas.drawRect(convertArrayToRect(position), paint)
  paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
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

function drawCircleAndText (desc, circleInfo, colorStr, canvas, paint) {
  let color = colors.parseColor(colorStr)
  // 文字反色
  paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
  drawText(desc, { x: circleInfo.x, y: circleInfo.y }, canvas, paint)
  paint.setStrokeWidth(3)
  paint.setStyle(Paint.Style.STROKE)
  paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  canvas.drawCircle(circleInfo.x, circleInfo.y + offset, circleInfo.radius, paint)
}

function drawText (text, position, canvas, paint, colorStr, textSize) {
  textSize = textSize || 20
  if (colorStr) {
    let color = colors.parseColor(colorStr)
    paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  } else {
    paint.setARGB(255, 0, 0, 255)
  }
  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.FILL)
  paint.setTextSize(textSize)
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

function validRegion (region) {
  if (!region || region.length !== 4) {
    return false
  }
  if (region.filter(v => v < 0).length > 0) {
    return false
  }
  if (region[2] == 0 || region[3] == 0) {
    return false
  }
  return true
}

function Drawer (canvas, paint) {
  this.canvas = canvas
  this.paint = paint
  this.color = '#ffffff'
  this.textSize = 20
  this.drawText = function (text, position, color, textSize) {
    this.color = color || this.color
    this.textSize = textSize || this.textSize
    drawText(text, position, this.canvas, this.paint, this.color, this.textSize)
  }

  this.drawRectAndText = function (text, position, color, textSize) {
    this.color = color || this.color
    this.textSize = textSize || this.textSize
    this.paint.setTextSize(this.textSize)
    drawRectAndText(text, position, this.color, this.canvas, this.paint)
  }

  this.drawCircleAndText = function (text, circleInfo, color, textSize) {
    this.color = color || this.color
    this.textSize = textSize || this.textSize
    this.paint.setTextSize(this.textSize)
    drawCircleAndText(text, circleInfo, this.color, this.canvas, this.paint)
  }
}

module.exports = VisualHelper