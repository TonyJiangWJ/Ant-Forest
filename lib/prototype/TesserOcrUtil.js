let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let LogUtils = singletonRequire('LogUtils')

function TesserOcrUtil() {
  this.enabled = false
  this.tessBaseAPI = null
  this.init()
}

TesserOcrUtil.prototype.init = function () {
  let trainDataPath = FileUtils.getCurrentWorkPath() + '/resources/'
  if (files.exists(trainDataPath + '/tessdata/chi_sim.traineddata')) {
    try {
      importClass(com.googlecode.tesseract.android.TessBaseAPI)
    } catch (e) {
      LogUtils.warnInfo(['当前版本的AutoJS不支持tesser-two'])
      return
    }
    
    this.tessBaseAPI = new TessBaseAPI()
    LogUtils.debugInfo(['trained data path: {}', trainDataPath])
    this.tessBaseAPI.init(trainDataPath, 'chi_sim')
    this.enabled = true
    let commonFunctions = singletonRequire('CommonFunction')
    let _this = this
    commonFunctions.registerOnEngineRemoved(function () {
      _this.recycle()
    }, '回收tesser-two资源')
  } else {
    LogUtils.warnInfo('训练数据不存在，无法启动识别')
  }
}

/**
 * 识别图片上的文字
 * 
 * @param {imageWrapper} img 待识别图片，尽量进行二值化并裁切好
 */
TesserOcrUtil.prototype.recognize = function (img) {
  if (this.enabled) {
    this.tessBaseAPI.setImage(img.getBitmap())
    return this.tessBaseAPI.getUTF8Text()
  }
  return null
}

TesserOcrUtil.prototype.recycle = function () {
  if (this.enabled && this.tessBaseAPI) {
    this.tessBaseAPI.end()
  }
}

module.exports = new TesserOcrUtil()