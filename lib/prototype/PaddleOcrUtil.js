let { config } = require('../../config.js')(runtime, global)
require('../../modules/init_if_needed.js')(runtime, global)
let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let LogUtils = singletonRequire('LogUtils')
let commonFunctions = singletonRequire('CommonFunction')
const check_model_base64 = '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'
function PaddleOcrUtil () {
  this.enabled = false
  this.useSlim = false
  this.predictor = null
  this.type = 'paddle'
  this.use_customize_model = false
  this.customize_model_path = ''
  this.customize_lable_path = ''
  this.initialized = false

  importClass(org.opencv.imgcodecs.Imgcodecs)
  importClass(org.opencv.android.Utils)
  importClass(org.opencv.core.Mat)
  importClass(android.graphics.Bitmap)
  if (!$power_manager.isIgnoringBatteryOptimizations()) {
    LogUtils.warnInfo(['未开启电量无限制，PaddleOCR可能会闪退，自动禁用PaddleOCR。请主动开启或运行unit/关闭电量限制.js 选择无限制'], true)
    return
  }
  // this.init()
}

PaddleOcrUtil.prototype.checkInited = function (loading) {
  this.enabled = loading.blockedGet() == true
  if (!this.enabled) {
    LogUtils.errorInfo('初始化PaddleOcr失败')
    if (config.force_init_paddle) {
      LogUtils.errorInfo('重启脚本，重新初始化Paddle', true)
      commonFunctions.setUpAutoStart(3, true)
      exit()
    }
  } else {
    LogUtils.debugInfo('初始化PaddleOcr成功')
  }
}

PaddleOcrUtil.prototype.init = function () {
  try {
    importClass(com.baidu.paddle.lite.ocr.Predictor)
  } catch (e) {
    LogUtils.warnInfo(['当前版本的AutoJS不支持PaddleOcr'])
    this.initialized = true
    return
  }
  this.use_customize_model = false
  this.predictor = new Predictor()
  let loading = threads.disposable()
  let _this = this
  // 建议在新线程中初始化模型
  threads.start(function () {
    LogUtils.debugInfo('初始化PaddleOcr')
    _this.predictor.releaseModel()
    sleep(50)
    _this.predictor.init(context, _this.useSlim)
    loading.setAndNotify(true)
  })
  this.checkInited(loading)
  this.initialized = true
  this.ensureModelLoaded()
}

/**
 * 使用自定义模型初始化
 * 
 * @param {object} options { modelPath: 模型所在路径, labelPath: 文本映射表所在路径, detModelFilename: det模型文件名, recModelFilename: rec模型文件名, clsModelFilename: cls模型文件名 }
 * @returns 
 */
PaddleOcrUtil.prototype.initWithCustomizeModel = function (options) {
  options = options || {}
  try {
    importClass(com.baidu.paddle.lite.ocr.Predictor)
  } catch (e) {
    LogUtils.warnInfo(['当前版本的AutoJS不支持PaddleOcr'])
    return
  }
  this.predictor = new Predictor()
  let loading = threads.disposable()
  let _this = this
  // 建议在新线程中初始化模型
  threads.start(function () {
    LogUtils.debugInfo(['使用自定义模型初始化PaddleOcr {}', JSON.stringify(options)])
    _this.use_customize_model = true
    let modelPath = options.modelPath ? files.path(options.modelPath) : 'models/ocr_v2_for_cpu' // 指定自定义模型路径
    let labelPath = options.labelPath ? files.path(options.labelPath) : 'labels/ppocr_keys_v1.txt' // 指定自定义label路径
    // 使用自定义模型时det rec cls三个模型文件名称需要手动指定
    _this.predictor.detModelFilename = options.detModelFilename || 'ch_ppocr_mobile_v2.0_det_opt.nb'
    _this.predictor.recModelFilename = options.recModelFilename || 'ch_ppocr_mobile_v2.0_rec_opt.nb'
    _this.predictor.clsModelFilename = options.clsModelFilename || 'ch_ppocr_mobile_v2.0_cls_opt.nb'

    _this.predictor.releaseModel()
    _this.predictor.init(context, modelPath, labelPath)
    _this.customize_lable_path = labelPath
    _this.customize_model_path = modelPath
    loading.setAndNotify(true)
  })
  this.checkInited(loading)
}

/**
 * 验证模型是否加载正确
 */
 PaddleOcrUtil.prototype.ensureModelLoaded = function () {
  let _this = this
  let ocrResults = runtime.bridges.bridges.toArray(_this.predictor.runOcr(images.fromBase64(check_model_base64).getBitmap()))
  let checkResult = ocrResults.map(v => v.label).join('')
  let limit = 3
  let loading = threads.disposable()
  threads.start(function () {
    while (checkResult != '测试' && limit-- > 0) {
      LogUtils.debugInfo(['校验模型初始化失败，第{}次重新初始化PaddleOcr', (3 - limit)], true)
      _this.predictor.releaseModel()
      sleep(50)
      if (_this.use_customize_model) {
        _this.predictor.init(context, _this.customize_lable_path, _this.customize_model_path)
      } else {
        _this.predictor.init(context, _this.useSlim)
      }
      ocrResults = runtime.bridges.bridges.toArray(_this.predictor.runOcr(images.fromBase64(check_model_base64).getBitmap()))
      checkResult = ocrResults.map(v => v.label).join('')
    }
    if (checkResult != '测试') {
      LogUtils.warnInfo('校验初始化PaddleOcr模型失败，识别结果可能不正确')
    } else {
      LogUtils.debugInfo('校验初始化PaddleOcr模型成功')
    }
    loading.setAndNotify(checkResult != '测试')
  })
  loading.blockedGet()
}

/**
 * 识别图片上的文字
 * 
 * @param {imageWrapper} img 待识别图片
 */
PaddleOcrUtil.prototype.recognize = function (img, region) {
  if (!this.initialized) {
    this.init()
  }
  if (this.enabled) {
    let start = new Date()
    let bitmapToRelease = []
    let bitmap = Bitmap.createBitmap(img.getWidth(), img.getHeight(), Bitmap.Config.ARGB_8888)
    Utils.matToBitmap(img.mat, bitmap)
    bitmapToRelease.push(bitmap)
    if (region) {
      let imgMat = new Mat(img.mat, buildRegion(region, img))
      bitmap = Bitmap.createBitmap(imgMat.cols(), imgMat.rows(), Bitmap.Config.ARGB_8888)
      Utils.matToBitmap(imgMat, bitmap)
      bitmapToRelease.push(bitmap)
      imgMat.release()
    }
    LogUtils.debugInfo(['图片转换耗时：{}ms', new Date() - start])
    start = new Date()
    let ocrResults = runtime.bridges.bridges.toArray(this.predictor.runOcr(bitmap)).filter(v => v.confidence > 0.5)
    LogUtils.debugInfo(['paddle识别文本耗时：{}ms', new Date() - start])
    LogUtils.debugInfo(['paddle识别文本信息：{}', JSON.stringify(ocrResults)])
    bitmapToRelease.forEach(bitmap => bitmap.recycle())
    return ocrResults.sort((a, b) => {
      if (Math.abs(a.bounds.bottom - b.bounds.bottom) < a.bounds.height() / 2) {
        return a.bounds.left - b.bounds.left
      } else {
        return a.bounds.bottom - b.bounds.bottom
      }
    }).map(v => v.label).join('\n')
  }
  return null
}

/**
 * 识别图片上的文字 并返回位置信息
 * 
 * @param {imageWrapper} img 待识别图片
 * @param {Array} region 待识别区域
 * @param {string} regex 查找文本
 */
PaddleOcrUtil.prototype.recognizeWithBounds = function (img, region, regex) {
  if (!this.initialized) {
    this.init()
  }
  if (this.enabled) {
    let start = new Date()
    let bitmapToRelease = []
    let bitmap = Bitmap.createBitmap(img.getWidth(), img.getHeight(), Bitmap.Config.ARGB_8888)
    Utils.matToBitmap(img.mat, bitmap)
    bitmapToRelease.push(bitmap)
    if (region) {
      let imgMat = new Mat(img.mat, buildRegion(region, img))
      bitmap = Bitmap.createBitmap(imgMat.cols(), imgMat.rows(), Bitmap.Config.ARGB_8888)
      Utils.matToBitmap(imgMat, bitmap)
      bitmapToRelease.push(bitmap)
      imgMat.release()
    }
    LogUtils.debugInfo(['图片转换耗时：{}ms', new Date() - start])
    start = new Date()
    let result = runtime.bridges.bridges.toArray(this.predictor.runOcr(bitmap)).filter(v => v.confidence > 0.5)
    LogUtils.debugInfo(['paddle识别文本耗时：{}ms', new Date() - start])
    if (regex) {
      regex = new RegExp(regex)
      result = result.filter(r => regex.test(r.label))
    }
    if (region && region.length > 1) {
      result.forEach(r => r.bounds.offset(region[0], region[1]))
    }
    bitmapToRelease.forEach(bitmap => bitmap.recycle())
    return result
  }
  return []
}


module.exports = new PaddleOcrUtil()



function buildRegion (region, img) {
  if (region == undefined) {
    region = [];
  }
  var x = region[0] === undefined ? 0 : region[0];
  var y = region[1] === undefined ? 0 : region[1];
  var width = region[2] === undefined ? img.getWidth() - x : region[2];
  var height = region[3] === undefined ? (img.getHeight() - y) : region[3];
  var r = new org.opencv.core.Rect(x, y, width, height);
  if (x < 0 || y < 0 || x + width > img.width || y + height > img.height) {
    throw new Error("out of region: region = [" + [x, y, width, height] + "], image.size = [" + [img.width, img.height] + "]");
  }
  return r;
}