/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-12 17:07:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-01-16 10:48:45
 * @Description: 
 */
importPackage(Packages["okhttp3"])

let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let singletoneRequire = require('./SingletonRequirer.js')(runtime, this)
let _logUtils = singletoneRequire('LogUtils')
let _commonFunctions = singletoneRequire('CommonFunction')
let formatDate = require('./DateUtil.js')
module.exports = (() => {
  const accessTokenStorage = storages.create(_storage_name + '_access_token')
  const pointNumberStorage = storages.create(_storage_name + '_point_num')
  const BaiduOcrUtil = function () {
    this.apiKey = _config.apiKey
    this.secretKey = _config.secretKey
    this.imageRequestUrl = 'https://aip.baidubce.com/rest/2.0/ocr/v1/webimage'
    this.accessTokenUrl = 'https://aip.baidubce.com/oauth/2.0/token'
    if (_config.useOcr) {
      _logUtils.logInfo(['BaiduOCR当前apiKey：{}', this.apiKey])
    }
  }

  BaiduOcrUtil.prototype.getAccessToken = function () {
    let tokenStorage = accessTokenStorage.get('access_token')
    if (tokenStorage && tokenStorage.api_key === this.apiKey && tokenStorage.expires_at > new Date().getTime() && tokenStorage.access_token) {
      _logUtils.debugInfo(['直接从缓存中获取accessToken，到期时间: {}', formatDate(new Date(tokenStorage.expires_at))])
      return tokenStorage.access_token
    }
    let okHttpClient = new OkHttpClient()
    let formBody = new FormBody.Builder().add('grant_type', 'client_credentials')
      .add('client_id', this.apiKey)
      .add('client_secret', this.secretKey).build()
    let request = new Request.Builder().url(this.accessTokenUrl).post(formBody).build()
    let response = okHttpClient.newCall(request).execute()
    let accessKey = null
    if (response != null) {
      if (response.body() != null) {
        let resultString = response.body().string()
        let result = JSON.parse(resultString)
        _logUtils.debugInfo('get access token result: ' + resultString)
        accessKey = result['access_token']
        accessTokenStorage.put('access_token', {
          api_key: this.apiKey,
          access_token: accessKey,
          // 设置过期时间 提前一小时结束
          expires_at: new Date().getTime() + result['expires_in'] * 1000 - 3600000
        })
      }
      response.close()
    }
    return accessKey
  }

  BaiduOcrUtil.prototype.recoginze = function (imgBase64) {
    let start = new Date().getTime()
    let accessToken = this.getAccessToken()
    if (!accessToken) {
      _logUtil.errorInfo('获取AccessToken失败')
      return
    }
    let okHttpClient = new OkHttpClient()
    let formBody = new FormBody.Builder().add('image', imgBase64)
      .add('access_token', accessToken).build()
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
        let totalCount = _commonFunctions.increaseInvokeCount()
        _logUtils.debugInfo('今日已经调用百度识别接口[' + totalCount + ']次')
        _logUtils.debugInfo(['请求OCR识别接口总耗时：{}ms', (new Date().getTime() - start)])
      }
      response.close()
    }
    return result
  }

  BaiduOcrUtil.prototype.tryGetByCache = function (imgBase64, pointNum) {
    let existNumberMap = pointNumberStorage.get("point_number_map") || {}
    
    if (existNumberMap && existNumberMap[pointNum]) {
      return existNumberMap[pointNum]
    }
    let result = this.recoginze(imgBase64)
    if (result && result.words_result_num > 0) {
      let filter = result.words_result.filter(r => isFinite(parseInt(r.words)))
      if (filter && filter.length > 0) {
        _logUtils.debugInfo('百度识图结果：' + JSON.stringify(filter))
        let countdown = parseInt(filter[0].words)
        existNumberMap[pointNum] = countdown
        pointNumberStorage.put("point_number_map", existNumberMap)
        return countdown
      }
    }
  }

  BaiduOcrUtil.prototype.showAllCached = function() {
    let existNumberMap = pointNumberStorage.get("point_number_map") || {}
    _logUtils.logInfo(JSON.stringify(existNumberMap))
  }
  return new BaiduOcrUtil()
})()
