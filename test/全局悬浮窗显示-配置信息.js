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
commonFunction.autoSetUpBangOffset(true)
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
let showAxis = false

let rankRegion = [config.rank_check_left, config.rank_check_top, config.rank_check_width, config.rank_check_height]
let strollButtonRegion = [config.stroll_button_left, config.stroll_button_top, config.stroll_button_width, config.stroll_button_height]
let bottomRegion = [config.bottom_check_left, config.bottom_check_top, config.bottom_check_width, config.bottom_check_height]
let validBallRegion = [config.tree_collect_left, config.tree_collect_top, config.tree_collect_width, config.tree_collect_height]

let scaleRate = config.scaleRate

let refreshThread = threads.start(function () {
  while (true) {
    // console.log('新获取的配置信息：' + JSON.stringify(config))
    rankRegion = [config.rank_check_left, config.rank_check_top, config.rank_check_width, config.rank_check_height]
    strollButtonRegion = [config.stroll_button_left, config.stroll_button_top, config.stroll_button_width, config.stroll_button_height]
    bottomRegion = [config.bottom_check_left, config.bottom_check_top, config.bottom_check_width, config.bottom_check_height]
    validBallRegion = [config.tree_collect_left, config.tree_collect_top, config.tree_collect_width, config.tree_collect_height]
    scaleRate = config.scaleRate
    sleep(100)
  }
})

function exitAndClean () {
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
if (files.exists(fileUtils.getCurrentWorkPath() + '/resources/region_check.jpg')) {
  back_img = images.read(fileUtils.getCurrentWorkPath() + '/resources/region_check.jpg')
}
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
    drawRectAndText('排行榜判断区域', rankRegion, '#FF00FF', canvas, paint)
    if (strollButtonRegion[0]) {
      drawRectAndText('逛一逛按钮区域', strollButtonRegion, '#FF00FF', canvas, paint)
    }
    drawRectAndText('底部判断区域', bottomRegion, '#FF00FF', canvas, paint)
    drawRectAndText('有效能量球所在区域', validBallRegion, '#FF00FF', canvas, paint)
    if (back_img) {
      let matrix = new android.graphics.Matrix()
      paint.setAlpha(50)
      canvas.drawImage(back_img, matrix, paint)
      paint.setAlpha(255)
    }


    paint.setTextSize(30)
    let countdown = (targetEndTime - new Date().getTime()) / 1000
    drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 100 + offset }, canvas, paint)

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