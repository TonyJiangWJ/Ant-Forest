let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let logUtils = singletonRequire('LogUtils')
let paddleOcrUtil = singletonRequire('PaddleOcrUtil')
let mlkitOcrUtil = singletonRequire('MlkitOcrUtil')
let localOcr = null
logUtils.debugInfo(['当前本地OCR优先级为：{}', config.local_ocr_priority])
if (config.local_ocr_priority == 'mlkit' || config.local_ocr_priority == 'auto') {
  localOcr = mlkitOcrUtil.enabled ? mlkitOcrUtil : paddleOcrUtil.enabled ? paddleOcrUtil : null
} else if (config.local_ocr_priority == 'paddle') {
  localOcr = paddleOcrUtil.enabled ? paddleOcrUtil : mlkitOcrUtil.enabled ? mlkitOcrUtil : null
}
if (localOcr == null) {
  localOcr = {
    enabled: false,
    type: '不受支持',
    recognize: () => '',
    recognizeWithBounds: () => []
  }
}

logUtils.debugInfo(['当前启用的OCR为：{} 是否支持：{}', localOcr.type, localOcr.enabled])

module.exports = localOcr