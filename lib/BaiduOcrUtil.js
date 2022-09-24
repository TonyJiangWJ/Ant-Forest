/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-12 17:07:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-09-24 15:43:46
 * @Description: 
 */

let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let _commonFunctions = singletonRequire('CommonFunction')
let formatDate = require('./DateUtil.js')
let _BaseOcrUtil = require('./BaseOcrUtil.js')
module.exports = (() => {
  const accessTokenStorage = storages.create(_storage_name + '_access_token')
  const BaiduOcrUtil = function () {
    _BaseOcrUtil.call(this)
    this.apiKey = _config.apiKey
    this.secretKey = _config.secretKey
    this.imageRequestUrl = 'https://aip.baidubce.com/rest/2.0/ocr/v1/webimage'
    this.generalTextRequestUrl = 'https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic'
    this.accessTokenUrl = 'https://aip.baidubce.com/oauth/2.0/token'
    if (_config.useBaiduOcr) {
      this.logUtils.logInfo(['BaiduOCR当前apiKey：{}', this.apiKey])
    }
  }

  BaiduOcrUtil.prototype = Object.create(_BaseOcrUtil.prototype)
  BaiduOcrUtil.prototype.constructor = BaiduOcrUtil

  BaiduOcrUtil.prototype.getAccessToken = function () {
    let tokenStorage = accessTokenStorage.get('access_token')
    if (tokenStorage && tokenStorage.api_key === this.apiKey && tokenStorage.expires_at > new Date().getTime() && tokenStorage.access_token) {
      this.logUtils.debugInfo(['直接从缓存中获取accessToken，到期时间: {}', formatDate(new Date(tokenStorage.expires_at))])
      return tokenStorage.access_token
    }
    let response = null
    let accessKey = null
    try {
      let okHttpClient = new OkHttpClient()
      let formBody = new FormBody.Builder().add('grant_type', 'client_credentials')
        .add('client_id', this.apiKey)
        .add('client_secret', this.secretKey).build()
      let request = new Request.Builder().url(this.accessTokenUrl).post(formBody).build()

      response = okHttpClient.newCall(request).execute()
      if (response != null && response.body() != null) {
        let resultString = response.body().string()
        let result = JSON.parse(resultString)
        this.logUtils.debugInfo('get access token result: ' + resultString)
        accessKey = result['access_token']
        accessTokenStorage.put('access_token', {
          api_key: this.apiKey,
          access_token: accessKey,
          // 设置过期时间 提前一小时结束
          expires_at: new Date().getTime() + result['expires_in'] * 1000 - 3600000
        })
      }
    } catch (e) {
      this.logUtils.errorInfo('请求百度accessToken接口异常' + e)
    } finally {
      if (response !== null) {
        response.close()
      }
    }

    return accessKey
  }

  BaiduOcrUtil.prototype.recognizeGeneralText = function (imgBase64) {
    let start = new Date().getTime()
    let accessToken = this.getAccessToken()
    if (!accessToken) {
      this.logUtils.errorInfo('获取AccessToken失败')
      return
    }
    let response = null
    let result = null
    try {
      let okHttpClient = new OkHttpClient()
      let formBody = new FormBody.Builder().add('image', imgBase64)
        .add('access_token', accessToken).build()
      let request = new Request.Builder()
        .addHeader('Content-Type', 'application/x-www-form-urlencoded')
        .url(this.generalTextRequestUrl)
        .post(formBody)
        .build()

      response = okHttpClient.newCall(request).execute()
      if (response != null && response.body() != null) {
        let resultString = response.body().string()
        this.logUtils.debugInfo('识别请求结果：' + resultString)
        result = JSON.parse(resultString)
        if (result.words_result_num > 0) {
          result = result.words_result.map(r => r.words).reduce((a, b) => { a = a + b; return a }, '')
        } else {
          result = ''
        }
        this.logUtils.debugInfo(['请求通用文字识别接口总耗时：{}ms', (new Date().getTime() - start)])
      }
    } catch (e) {
      this.logUtils.errorInfo('百度通用文字识别接口请求异常' + e)
    } finally {
      if (response !== null) {
        response.close()
      }
    }

    return result
  }

  BaiduOcrUtil.prototype.buildRecognizeRequest = function (imgBase64) {
    let accessToken = this.getAccessToken()
    if (!accessToken) {
      this.logUtils.errorInfo('获取AccessToken失败')
      return null
    }
    let formBody = new FormBody.Builder().add('image', imgBase64)
      .add('access_token', accessToken).build()
    return new Request.Builder()
      .addHeader('Content-Type', 'application/x-www-form-urlencoded')
      .url(this.imageRequestUrl)
      .post(formBody)
      .build()
  }

  BaiduOcrUtil.prototype.resolveResultNumber = function (result) {
    if (result && result.words_result_num > 0) {
      let filter = result.words_result.filter(r => isFinite(parseInt(r.words)))
      if (filter && filter.length > 0) {
        this.logUtils.debugInfo('百度识图结果：' + JSON.stringify(filter))
        return parseInt(filter[0].words)
      }
    }
    return null
  }

  BaiduOcrUtil.prototype.invokeIncreaseOcrCount = function () {
    let totalCount = _commonFunctions.increaseInvokeCount()
    this.logUtils.debugInfo(['今日已经调用baidu_ocr识别接口[{}]次 剩余: {} 次', totalCount, (500 - totalCount)])
  }

  BaiduOcrUtil.prototype.getPrefix = function () {
    return '_baidu'
  }

  return new BaiduOcrUtil()
})()
