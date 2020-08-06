/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-04 08:22:11
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-06 20:04:08
 * @Description: 
 */

let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let _commonFunctions = singletonRequire('CommonFunction')
let fileUtils = singletonRequire('FileUtils')
let projectInfo = JSON.parse(files.read(fileUtils.getCurrentWorkPath() + '/project.json')) || { versionName: 'unknown' }
let _BaseOcrUtil = require('./BaseOcrUtil.js')

module.exports = (() => {

  const TesseracOcrUtil = function () {
    _BaseOcrUtil.call(this)
    this.imageRequestUrl = 'http://47.110.40.234/ocr'
  }

  TesseracOcrUtil.prototype = Object.create(_BaseOcrUtil.prototype)
  TesseracOcrUtil.prototype.constructor = _BaseOcrUtil

  TesseracOcrUtil.prototype.buildRecognizeRequest = function (imgBase64) {
    let formBody = new FormBody.Builder()
      .add('androidId', device.getAndroidId())
      .add('base64', imgBase64).build()
    return new Request.Builder()
      .addHeader('Content-Type', 'application/x-www-form-urlencoded')
      .addHeader('scriptversion', projectInfo.versionName)
      .url(this.imageRequestUrl)
      .post(formBody)
      .build()
  }


  TesseracOcrUtil.prototype.resolveResultNumber = function (result) {
    if (result && result.code === 'success') {
      this.logUtils.debugInfo('tesserac识图结果：' + JSON.stringify(result))
      return parseInt(result.word)
    }
    return null
  }


  TesseracOcrUtil.prototype.invokeIncreaseOcrCount = function () {
    let totalCount = _commonFunctions.increaseTesseracInvokeCount()
    this.logUtils.debugInfo('今日已经调用tesserac识别接口[' + totalCount + ']次')
  }

  TesseracOcrUtil.prototype.getPrefix = function () {
    return '_tesserac'
  }

  return new TesseracOcrUtil()
})()
