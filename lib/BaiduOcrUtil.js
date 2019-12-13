/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-12 17:07:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-13 22:28:20
 * @Description: 
 */
importPackage(Packages["okhttp3"])

let _config = typeof config === 'undefined' ? require('../config.js').config : config
let _logUtils = typeof LogUtils === 'undefined' ? require('./LogUtils.js') : LogUtils
let _commonFunctions = typeof commonFunctions === 'undefined' ? require('./CommonFunction.js') : commonFunctions
let _storage_name = typeof storage_name === 'undefined' ? require('../config.js').storage_name : storage_name
let formatDate = require('./DateUtil.js')
module.exports = (() => {
  const accessTokenStorage = storages.create(_storage_name + '_access_token')
  const BaiduOcrUtil = function () {
    this.apiKey = _config.apiKey
    this.secretKey = _config.secretKey
    this.imageRequestUrl = 'https://aip.baidubce.com/rest/2.0/ocr/v1/webimage'
    this.accessTokenUrl = 'https://aip.baidubce.com/oauth/2.0/token'
  }

  BaiduOcrUtil.prototype.getAccessToken = function () {
    let tokenStorage = accessTokenStorage.get('access_token')
    if (tokenStorage && tokenStorage.expires_at > new Date().getTime() && tokenStorage.access_token) {
      _logUtils.debugInfo(['直接从缓存中获取accessToken，到期时间: {}', formatDate(new Date(tokenStorage.expires_at))])
      return tokenStorage.access_token
    }
    let okHttpClient = new OkHttpClient()
    let formBody = new FormBody.Builder().add('grant_type', 'client_credentials')
      .add('client_id', this.apiKey)
      .add('client_secret', this.secretKey).build()
    let request = new Request.Builder().url(this.accessTokenUrl).post(formBody).build()
    let response = okHttpClient.newCall(request).execute()
    if (response != null && response.body() != null) {
      let resultString = response.body().string()
      let result = JSON.parse(resultString)
      _logUtils.debugInfo('get access token result: ' + resultString)
      let accessKey = result['access_token']
      accessTokenStorage.put('access_token', {
        access_token: accessKey,
        // 设置过期时间 提前一小时结束
        expires_at: new Date().getTime() + result['expires_in'] * 1000 - 3600000
      })
      return accessKey
    }
    return null
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
    if (response != null && response.body() != null) {
      let resultString = response.body().string()
      _logUtils.debugInfo('识别请求结果：' + resultString)
      let result = JSON.parse(resultString)
      let totalCount = _commonFunctions.increaseInvokeCount()
      _logUtils.debugInfo('今日已经调用百度识别接口[' + totalCount + ']次')
      _logUtils.debugInfo(['请求OCR识别接口总耗时：{}ms', (new Date().getTime() - start)])
      return result
    }
    return null
  }
  return new BaiduOcrUtil()
})()
