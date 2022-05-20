
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
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let logUtils = singletonRequire('LogUtils')
module.exports = new PushClient()

function PushClient () {

  /**
   * 发送文本消息
   * 
   * @param {*} title 
   * @param {*} content 
   * @returns 
   */
  this.pushText = function (title, content) {
    return this.pushContent(title, content, 'txt')
  }

  /**
   * 发送json消息
   * @param {*} title 
   * @param {*} content 
   * @returns 
   */
  this.pushJson = function (title, content) {
    return this.pushContent(title, content, 'json')
  }

  /**
   * 发送html消息
   * @param {*} title 
   * @param {*} content 
   * @returns 
   */
  this.pushHtml = function (title, content) {
    return this.pushContent(title, content, 'html')
  }

  /**
   * 发送markdown消息
   * @param {*} title 
   * @param {*} content 
   * @returns 
   */
  this.pushMarkdown = function (title, content) {
    return this.pushContent(title, content, 'markdown')
  }

  /**
   * 实际发送消息的请求
   *
   * @param {*} title 
   * @param {*} content 
   * @param {*} template 
   * @returns 
   */
  this.pushContent = function (title, content, template) {
    if (!config.pushplus_token) {
      logUtils.errorInfo(['推送加token不存在 无法发送消息'])
      return
    }
    let requestUrl = 'http://www.pushplus.plus/send'
    let requestBody = new FormBody.Builder()
      .add("token", config.pushplus_token)
      .add("title", title)
      .add("content", content)
      .add("template", template)
      .add("channel", "wechat")
      .build()
    let request = new Request.Builder()
      .addHeader("Content-Type", "application/json")
      .url(requestUrl)
      .post(requestBody)
      .build()
    let client = new OkHttpClient.Builder().build()
    let response = client.newCall(request).execute()
    if (response.isSuccessful()) {
      let responseBody = response.body()
      if (responseBody != null) {
        let resultJson = JSON.parse(responseBody.string())
        logUtils.debugInfo(['消息推送完成 返回结果：{}', JSON.stringify(resultJson)])
        return resultJson.code == 200
      }
    }
    return false
  }

}
