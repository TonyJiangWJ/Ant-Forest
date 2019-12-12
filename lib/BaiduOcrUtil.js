/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-12 17:07:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-12 18:00:17
 * @Description: 
 */
importPackage(Packages["okhttp3"])
// importClass(okhttp3.OkHttpClient)
// importClass(okhttp3.Request)
// importClass(okhttp3.Response)

let _config = typeof config === 'undefined' ? require('../config.js').config : config
let _logUtils = typeof LogUtils === 'undefined' ? require('./LogUtils.js') : LogUtils
let _commonFunctions = typeof commonFunctions === 'undefined' ? require('./CommonFunction.js') : commonFunctions

module.exports = (() => {
  const BaiduOcrUtil = function () {
    this.apiKey = _config.apiKey
    this.secretKey = _config.secretKey
    this.imageRequestUrl = 'https://aip.baidubce.com/rest/2.0/ocr/v1/webimage'
    this.accessTokenUrl = 'https://aip.baidubce.com/oauth/2.0/token'
  }

  BaiduOcrUtil.prototype.getAccessToken = function () {
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
      return accessKey
    }
    return null
  }

  BaiduOcrUtil.prototype.recoginze = function (imgBase64) {
    let accessToken = this.getAccessToken()
    if (!accessToken) {
      _logUtil.errorInfo('获取AccessToken失败')
      return
    }
    let okHttpClient = new OkHttpClient()
    let formBody = new FormBody.Builder().add('image', imgBase64)
      .add('access_token', accessToken).build()
    _logUtils.debugInfo('请求体：' + formBody.toString())
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
      return result
    }
    return null
  }
  return new BaiduOcrUtil()
})()
