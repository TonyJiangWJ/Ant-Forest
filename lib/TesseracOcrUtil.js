/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-04 08:22:11
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-05 23:59:47
 * @Description: 
 */
importPackage(Packages["okhttp3"])

let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let _logUtils = singletonRequire('LogUtils')
let _commonFunctions = singletonRequire('CommonFunction')
let aesUtil = require('./AesUtil.js')
let formatDate = require('./DateUtil.js')
module.exports = (() => {
  const pointNumberStorage = storages.create(_storage_name + '_tesserac_point_num')
  const TesseracOcrUtil = function () {
    this.apiKey = _config.apiKey
    this.secretKey = _config.secretKey
    this.imageRequestUrl = 'http://47.110.40.234/ocr'
  }

  TesseracOcrUtil.prototype.recognize = function (imgBase64) {
    let start = new Date().getTime()

    let okHttpClient = new OkHttpClient()
    let formBody = new FormBody.Builder()
      .add('androidId', device.getAndroidId())
      .add('base64', imgBase64).build()
    let request = new Request.Builder()
      .addHeader('Content-Type', 'application/x-www-form-urlencoded')
      .url(this.imageRequestUrl)
      .post(formBody)
      .build()
    let response = okHttpClient.newCall(request).execute()
    let result = null
    if (response != null) {
      if (response.body() != null) {
        let resultString = response.body().string()
        _logUtils.debugInfo('识别请求结果：' + resultString)
        result = JSON.parse(resultString)
        let totalCount = _commonFunctions.increaseTesseracInvokeCount()
        _logUtils.debugInfo('今日已经调用tesserac识别接口[' + totalCount + ']次')
        _logUtils.debugInfo(['请求OCR识别接口总耗时：{}ms', (new Date().getTime() - start)])
      }
      response.close()
    }
    return result
  }


  TesseracOcrUtil.prototype.tryGetByCache = function (imgBase64, pointNum) {
    let existNumberMap = pointNumberStorage.get("point_number_map") || {}

    if (existNumberMap && existNumberMap[pointNum]) {
      let cachedValue = existNumberMap[pointNum]
      _logUtils.debugInfo(['像素点个数:{} 从缓存中获取倒计时数据：{}', pointNum, cachedValue])
      // 随机校验缓存是否有效，实时更新 约十分之一的概率
      if (parseInt(Math.random() * 10 + 1) % 7 == 0) {
        let countdown = this.getDirectly(imgBase64)
        if (cachedValue !== countdown) {
          existNumberMap[pointNum] = countdown
          pointNumberStorage.put("point_number_map", existNumberMap)
          _logUtils.debugInfo(['{} 对应的原始缓存数据无效，old:{} new:{}', pointNum, cachedValue, countdown])
          cachedValue = countdown
        }
      }
      return cachedValue
    }
    _logUtils.debugInfo('缓存中不存在倒计时数据')
    let countdown = this.getDirectly(imgBase64)
    if (countdown > 0) {
      existNumberMap[pointNum] = countdown
      pointNumberStorage.put("point_number_map", existNumberMap)
    }
    return countdown
  }

  TesseracOcrUtil.prototype.getDirectly = function (imgBase64) {
    let md5Str = aesUtil.md5(imgBase64)
    let existNumberMap = pointNumberStorage.get("md5_number_map") || {}
    let existNumber = existNumberMap[md5Str]
    if (existNumber && existNumber !== '') {
      _logUtils.debugInfo(['已通过md5:[{}]获取缓存的倒计时时间：{}', md5Str, existNumber])
      return existNumber
    }
    let result = this.recognize(imgBase64)
    if (result && result.code === 'success') {
      _logUtils.debugInfo('tesserac识图结果：' + JSON.stringify(result))
      result = parseInt(result.word)
      if (result && isFinite(result)) {
        existNumberMap[md5Str] = result
        pointNumberStorage.put("md5_number_map", existNumberMap)
        return result
      }
    } else {
      _logUtils.debugInfo('tesserac_ocr请求失败')
    }
    _logUtils.debugInfo('tesserac未识别到数字结果')
    return null
  }

  TesseracOcrUtil.prototype.showAllCached = function () {
    let existNumberMap = pointNumberStorage.get("point_number_map") || {}
    _logUtils.logInfo(JSON.stringify(existNumberMap))
    return existNumberMap
  }

  TesseracOcrUtil.prototype.clearAllCached = function () {
    pointNumberStorage.clear()
  }

  return new TesseracOcrUtil()
})()
