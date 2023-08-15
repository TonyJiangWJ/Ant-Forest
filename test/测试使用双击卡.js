let { config } = require('../config.js')(runtime, global)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunctions = sRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let widgetUtils = sRequire('WidgetUtils')
let localOcrUtil = require('../lib/LocalOcrUtil')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let warningFloaty = sRequire('WarningFloaty')
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
let force_ocr = false
commonFunctions.requestScreenCaptureOrRestart()
if (!checkIsUse()) {
  let target = findByGrayBase64()
  if (!target) {
    target = ocrCheckTarget(1)
  }
  if (target) {
    warningFloaty.addRectangle('用道具', boundsToRegion(target.bounds))
    automator.clickRandomRegion(boundsToRegion(target.bounds))
    sleep(500)
    let useConfirm = widgetUtils.widgetGetOne('立即使用')
    if (useConfirm) {
      warningFloaty.addRectangle('立即使用', boundsToRegion(useConfirm.bounds()))
    }
  } else {
    warningFloaty.addText('OCR未找到目标', { x: 300, y: 1000 })
    toastLog('OCR未找到目标位置')
  }
}
sleep(10000)

function findByGrayBase64 () {
  if (force_ocr) {
    return null
  }
  if (!config.image_config.use_item) {
    return null
  }
  let screen = commonFunctions.checkCaptureScreenPermission()
  let find = OpenCvUtil.findByGrayBase64(screen, config.image_config.use_item)
  if (find) {
    debugInfo(['通过找图找到了目标按钮'])
    return { bounds: find }
  }
  debugInfo(['找图方式未找到目标，尝试OCR'])
  return null
}

function ocrCheckTarget (tryTime) {
  tryTime = tryTime || 1
  let screen = commonFunctions.checkCaptureScreenPermission()
  let recognizeResult = localOcrUtil.recognizeWithBounds(screen,
    [0, config.device_height * 0.5, config.device_width * 0.5, config.device_height * 0.4], '用道具')
  if (recognizeResult && recognizeResult.length > 0) {
    return recognizeResult[0]
  } else if (tryTime <= 3) {
    sleep(300)
    return ocrCheckTarget(tryTime + 1)
  }
}

function boundsToRegion (bd) {
  return [bd.left, bd.top, bd.right - bd.left, (bd.bottom - bd.top)]
}

function checkIsUse () {
  let target = null
  if ((target = widgetUtils.widgetGetOne(/^\d{2}:\d{2}$/, 1000)) != null) {
    toastLog('双击卡已使用')
    warningFloaty.addRectangle('双击卡倒计时', boundsToRegion(target.bounds()))
    return true
  }
  return false
}