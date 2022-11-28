let { config } = require('../../config.js')(runtime, global)

let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let LogUtils = singletonRequire('LogUtils')
let commonFunctions = singletonRequire('CommonFunction')
let autoJsSupport = false
if (typeof $mlKitOcr !== 'undefined') {
  autoJsSupport = true
}

function MlkitOCR () {
  let pluginOcr = autoJsSupport ? null : (() => {
    try {
      return plugins.load('com.tony.mlkit.ocr')
    } catch (e) {
      LogUtils.warnInfo('未安装插件 请通过此链接下载MlkitOCR插件：https://github.com/TonyJiangWJ/Auto.js/releases/download/v4.1.1/mlkit-ocr-plugin-1.0-20220924.apk')
    }
  })()
  this.enabled = autoJsSupport || !!pluginOcr
  if (pluginOcr && typeof pluginOcr.release !== 'undefined') {
    commonFunctions.registerOnEngineRemoved(function () {
      pluginOcr.release()
    }, 'release mlkit-plugin resource')
  }
  this.type = 'mlkit'
  if (!this.enabled) {
    LogUtils.warnInfo(['当前版本AutoJS不支持mlKitOcr且同时未安装MlkitOCR插件，自动禁用mlKitOcr功能'])
    return
  }
  this.ocr = autoJsSupport ? $mlKitOcr : pluginOcr
}


/**
 * 识别图片上的文字
 * 
 * @param {imageWrapper} img 待识别图片
 */
MlkitOCR.prototype.recognize = function (img, region) {
  if (!this.enabled) {
    return ''
  }
  let start = new Date()
  let ocrResults = this.ocr.detect(img, { region: region }).filter(v => v.confidence > 0.5)
  LogUtils.debugInfo(['mklit识别文本耗时：{}ms', new Date() - start])
  LogUtils.debugInfo(['mklit识别文本信息：{}', JSON.stringify(ocrResults)])
  return ocrResults.map(v => v.label).join('\n')
}

/**
 * 识别图片上的文字 并返回位置信息
 * 
 * @param {imageWrapper} img 待识别图片
 * @param {Array} region 待识别区域
 * @param {string} regex 查找文本
 */
MlkitOCR.prototype.recognizeWithBounds = function (img, region, regex) {
  if (!this.enabled) {
    return []
  }
  let start = new Date()
  let resultLines = this.ocr.detect(img, { region: region }).filter(v => v.confidence > 0.5)
  let result = resultLines.map(line => line.elements).reduce((a, b) => a = a.concat(b), [])
  LogUtils.debugInfo(['mlkit识别文本耗时：{}ms', new Date() - start])
  LogUtils.debugInfo(['mlkit识别文本信息：{}', JSON.stringify(result)])
  if (regex) {
    regex = new RegExp(regex)
    result = result.filter(r => regex.test(r.label))
  }
  return result
}

module.exports = new MlkitOCR()
