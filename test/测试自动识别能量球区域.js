/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-17 22:14:39
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-10-22 23:21:08
 * @Description: 
 */

let { config } = require('../config.js')(runtime, this)
let offset = config.bang_offset
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let { debugInfo, errorInfo, warnInfo, logInfo, infoLog } = singletonRequire('LogUtils')
let WidgetUtil = singletonRequire('WidgetUtils')

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

function exitAndClean () {
  running = false
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
  }
  exit()
}

let detectRegion = null
let running = true

let scaleRate = config.scaleRate
threads.start(function () {
  while (running) {
    let treeDialog = WidgetUtil.widgetGetById('J_tree_dialog_wrap', 1000)
    let plantTree = WidgetUtil.widgetGetOne(/^\s*种树\s*$/, 1000)
    if (treeDialog && plantTree) {
      let anchorTop = plantTree.bounds().bottom
      let anchorBottom = treeDialog.bounds().top
      let marginBorder = plantTree.bounds().width()
      config.tree_collect_left = marginBorder
      config.tree_collect_top = parseInt(0.6 * (anchorBottom - anchorTop) + anchorTop)
      config.tree_collect_width = parseInt(config.device_width - 2 * marginBorder)
      config.tree_collect_height = parseInt((anchorBottom - anchorTop) * 1.25)
      detectRegion = [config.tree_collect_left, config.tree_collect_top, config.tree_collect_width, config.tree_collect_height]
      log('自动识别能量球区域：' + JSON.stringify(detectRegion))
    } else {
      log('自动识别能量球识别区域失败，未识别到对象：' + (treeDialog ? '' : '种树 ') + (plantTree ? '' : 'J_tree_dialog_wrap'))
    }
    sleep(2000)
  }
})


let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let showAxis = false



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


    paint.setTextSize(30)
    let countdown = (targetEndTime - new Date().getTime()) / 1000
    drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 300 }, canvas, paint)

    passwindow = new Date().getTime() - startTime

    if (passwindow > 1000) {
      startTime = new Date().getTime()
      console.verbose('关闭倒计时：' + countdown.toFixed(2))
    }




    if (detectRegion && detectRegion.length === 4) {
      let step = parseInt(75 * scaleRate)
      let o = step * 3
      drawRectAndText('能量球判断区域', detectRegion, '#FF00FF', canvas, paint)
    }
    if (showAxis) {
      drawCoordinateAxis(canvas, paint)
    }
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
      exitAndClean()
    } else if (keyCode === 25) {
      // 设置最低间隔200毫秒，避免修改太快
      if (new Date().getTime() - lastChangedTime > 200) {
        lastChangedTime = new Date().getTime()
        showAxis = !showAxis
      }
    }
  })
})

setTimeout(function () { exitAndClean() }, 120000)