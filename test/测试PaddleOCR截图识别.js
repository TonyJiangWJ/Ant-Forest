let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let paddleOcr = singletonRequire('PaddleOcrUtil')
let commonFunction = singletonRequire('CommonFunction')
let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let currentSource = currentEngine.getSource() + ''
if (runningEngines.length > 1) {
  runningEngines.forEach(compareEngine => {
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop()
    }
  })
}
if (!paddleOcr.enabled) {
  toastLog('当前版本的AutoJS不支持PaddleOcr')
  exit()
}

if (!requestScreenCapture()) {
  toastLog('请求截图权限失败')
  exit()
}

sleep(1000)

// 识别结果和截图信息
let result = []
let img = null
let running = true

/**
 * 截图并识别OCR文本信息
 */
function captureAndOcr() {
  img && img.recycle()
  img = captureScreen()
  if (!img) {
    toastLog('截图失败')
  }
  let start = new Date()
  result = paddleOcr.recognizeWithBounds(img)
  toastLog('耗时' + (new Date() - start) + 'ms')
}

captureAndOcr()

// 获取状态栏高度
let offset = config.bang_offset

// 绘制识别结果
let window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

// 设置悬浮窗位置
ui.post(() => {
  window.setPosition(0, offset)
  window.setSize(device.width, device.height)
  window.setTouchable(false)
})

// 操作按钮
let clickButtonWindow = floaty.rawWindow(
  <vertical>
    <button id="captureAndOcr" text="截图识别" />
    <button id="closeBtn" text="退出" />
  </vertical>
);
ui.run(function () {
  clickButtonWindow.setPosition(device.width / 2 - ~~(clickButtonWindow.getWidth() / 2), device.height * 0.65)
})

// 点击识别
clickButtonWindow.captureAndOcr.click(function () {
  result = []
  ui.run(function () {
    clickButtonWindow.setPosition(device.width, device.height)
  })
  setTimeout(() => {
    captureAndOcr()
    ui.run(function () {
      clickButtonWindow.setPosition(device.width / 2 - ~~(clickButtonWindow.getWidth() / 2), device.height * 0.65)
    })
  }, 500)
})

// 点击关闭
clickButtonWindow.closeBtn.click(function () {
  running = false
  exit()
})

let Typeface = android.graphics.Typeface
let paint = new Paint()
paint.setStrokeWidth(1)
paint.setTypeface(Typeface.DEFAULT_BOLD)
paint.setTextAlign(Paint.Align.LEFT)
paint.setAntiAlias(true)
paint.setStrokeJoin(Paint.Join.ROUND)
paint.setDither(true)
window.canvas.on('draw', function (canvas) {
  if (!running) {
    return
  }
  // 清空内容
  canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)
  if (result && result.length > 0) {
    for (let i = 0; i < result.length; i++) {
      let ocrResult = result[i]
      drawRectAndText(ocrResult.label, ocrResult.bounds, '#00ff00', canvas, paint)
    }
  }
})

setInterval(() => { }, 10000)
commonFunction.registerOnEngineRemoved(() => {
  // 回收图片
  img && img.recycle()
  running = false
})

/**
 * 绘制文本和方框
 * 
 * @param {*} desc 
 * @param {*} rect 
 * @param {*} colorStr 
 * @param {*} canvas 
 * @param {*} paint 
 */
function drawRectAndText (desc, rect, colorStr, canvas, paint) {
  let color = colors.parseColor(colorStr)

  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.STROKE)
  // 反色
  paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
  canvas.drawRect(rect, paint)
  paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  paint.setStrokeWidth(1)
  paint.setTextSize(20)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(desc, rect.left, rect.top, paint)
  paint.setTextSize(10)
  paint.setStrokeWidth(1)
  paint.setARGB(255, 0, 0, 0)
}
