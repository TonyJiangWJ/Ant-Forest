/*
 * @Author: TonyJiangWJ
 * @Date: 2023-07-05 15:54:16
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2024-04-17 18:51:21
 * @Description: 
 */

let { config } = require('../../config.js')(runtime, global)
let sRequire = require('../SingletonRequirer.js')(runtime, global)
let LogUtils = sRequire('LogUtils')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = LogUtils
let printExceptionStack = require('../PrintExceptionStack')
let CanvasDrawer = require('../CanvasDrawer.js')

function WarningFloaty () {
  let self = this
  this.window = null
  this.toDrawList = []
  this.drawer = null
  this.disableTips = false
  this.inited = false
  this.initing = false
  // 临时取消debugInfo日志
  this.disableDebugInfo = false

  this.init = function () {
    if (this.inited || this.initing) {
      return
    }
    this.initing = true
    this.window = floaty.rawWindow(
      <canvas id="canvas" layout_weight="1" />
    )

    this.window.setSize(config.device_width, config.device_height)
    this.window.setTouchable(false)

    this.window.canvas.on("draw", function (canvas) {
      if (self.disableTips || self.toDrawList.length == 0) {
        canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)
        ui.run(function () {
          self.window.setPosition(config.device_width, 0)
        })
        return
      }
      if (self.drawer == null) {
        debugInfo(['初始化drawer，offset: {}', config.bang_offset])
        self.drawer = new CanvasDrawer(canvas, null, config.bang_offset)
      }
      ui.run(function () {
        self.window.setPosition(0, 0)
      })

      canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)
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
                self.drawer.drawText(drawInfo.text, drawInfo.position, drawInfo.color || '#00ff00', drawInfo.textSize)
                break
              default:
                debugInfo(['no match draw event for {}', drawInfo.type], true)
            }
          } catch (e) {
            errorInfo('执行异常' + e + e.stack)
            printExceptionStack(e, LogUtils)
          }
        })
      }
    })
    this.initing = false
    this.inited = true
  }

  this.disableTip = function () {
    this.disableTips = true
  }

  this.enableTip = function () {
    this.disableTips = false
  }

  this.closeDialog = function () {
    debugInfo('关闭悬浮窗')
    if (this.window !== null) {
      this.window.canvas.removeAllListeners()
      this.window.close()
      this.window = null
    }
  }

  this.clearAll = function (clearType) {
    this.toDrawList = this.toDrawList.filter(v => v.drawType != clearType)
    return this
  }

  this.addRectangle = function (text, rectRegion, color, drawType) {
    this.init()
    if (!validRegion(rectRegion)) {
      errorInfo(['区域信息无效: {}', JSON.stringify(rectRegion)])
      return this
    }
    ui.run(function () {
      !self.disableDebugInfo && debugInfo(['添加方形区域 {} {}', text, JSON.stringify(rectRegion)])
      self.toDrawList.push({
        drawType: drawType,
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

  this.addCircle = function (text, circleInfo, color, drawType) {
    this.init()
    ui.run(function () {
      !self.disableDebugInfo && debugInfo(['添加圆形区域 {} {}', text, JSON.stringify(circleInfo)])
      self.toDrawList.push({
        drawType: drawType,
        type: 'circle',
        text: text,
        circle: circleInfo,
        color: color,
      })
    })
    return this
  }

  this.addText = function (text, position, color, textSize, drawType) {
    this.init()
    ui.run(function () {
      !self.disableDebugInfo && debugInfo(['添加文本区域 {} {}', text, JSON.stringify(position)])
      self.toDrawList.push({
        drawType: drawType,
        type: 'text',
        text: text,
        position: position,
        color: color,
        textSize: textSize,
      })
    })
    return this
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
module.exports = new WarningFloaty()