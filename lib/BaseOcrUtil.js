/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-06 19:16:06
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-21 09:17:20
 * @Description: 
 */
try {
  importPackage(Packages["okhttp3"])
} catch (e) {
  //
}
try {
  importClass("okhttp3.OkHttpClient")
  importClass("okhttp3.FormBody")
  importClass("okhttp3.Request")
} catch (e) {
  //
}

let { storage_name: _storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)

let aesUtil = require('./AesUtil.js')

const BaseOcrUtil = function () {
  this.pointNumberStorage = storages.create(_storage_name + '_' + this.getPrefix() + '_md5_cache')
  this.logUtils = singletonRequire('LogUtils')
}

BaseOcrUtil.prototype.recognize = function (imgBase64) {
  let start = new Date().getTime()

  let request = this.buildRecognizeRequest(imgBase64)
  if (!request) {
    return
  }
  let response = null
  let result = null
  try {
    let okHttpClient = new OkHttpClient()
    response = okHttpClient.newCall(request).execute()
    if (response != null && response.body() != null) {
      let resultString = response.body().string()
      this.logUtils.debugInfo('识别请求结果：' + resultString)
      result = JSON.parse(resultString)
      this.invokeIncreaseOcrCount()
      this.logUtils.debugInfo(['请求OCR识别接口总耗时：{}ms', (new Date().getTime() - start)])
    }
  } catch (e) {
    this.logUtils.errorInfo('请求ocr接口异常' + e)
  } finally {
    if (response !== null) {
      response.close()
    }
  }

  return result
}

BaseOcrUtil.prototype.getImageNumber = function (imgBase64) {
  let md5Str = aesUtil.md5(imgBase64)
  let existNumberMap = this.pointNumberStorage.get("md5_number_map") || {}
  let existNumber = existNumberMap[md5Str]
  let cachedNumber = null
  if (existNumber && existNumber !== '' && parseInt(existNumber) <= 61) {
    this.logUtils.debugInfo(['已通过md5:[{}]获取缓存的倒计时时间：{}', md5Str, existNumber])
    if (parseInt(Math.random() * 10 + 1) % 7 == 0) {
      this.logUtils.debugInfo('随机进行校验，放弃缓存中的数据')
      cachedNumber = existNumber
    } else {
      return existNumber
    }
  }
  let result = this.resolveResultNumber(this.recognize(imgBase64))
  if (result && isFinite(result)) {
    existNumberMap[md5Str] = result
    this.pointNumberStorage.put("md5_number_map", existNumberMap)
    return result
  }
  this.logUtils.debugInfo('ocr未识别到数字结果')
  // 请求失败时返回缓存中的数据
  return cachedNumber
}

BaseOcrUtil.prototype.showAllCached = function () {
  let existNumberMap = this.pointNumberStorage.get("md5_number_map") || {}
  this.logUtils.logInfo(JSON.stringify(existNumberMap))
  return existNumberMap
}

BaseOcrUtil.prototype.clearAllCached = function () {
  this.pointNumberStorage.clear()
}

module.exports = BaseOcrUtil