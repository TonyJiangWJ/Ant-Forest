let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')

module.exports = function (BaseHandler) {
  // 扩展方法 
  BaseHandler.loadProtectedList = (data, callbackId) => {
    let protectList = commonFunctions.getFullTimeRuntimeStorage('protectList').protectList || []
    protectList.forEach(protectInfo => protectInfo.timeout = dateFormat(new Date(protectInfo.timeout)))
    postMessageToWebView({ callbackId: callbackId, data: { protectList: protectList } })
  }
  BaseHandler.removeFromProtectList = (data, callbackId) => {
    log('移除保护罩使用记录：' + data.name)
    commonFunctions.removeFromProtectList(data.name)
    postMessageToWebView({ callbackId: callbackId, data: { success: true } })
  }
  BaseHandler.updateProtectList = (data, callbackId) => {
    log('更新保护罩使用信息:' + data.protectList)
    if (!data.protectList) {
      return
    }
    commonFunctions.updateProtectList(data.protectList.map(v => {
      v.timeout = new Date(v.timeout.replace(/-/g,'/')).getTime()
      return v
    }))
    postMessageToWebView({ callbackId: callbackId, data: { success: true } })
  }
  BaseHandler.startRainCollect = () => {
    postMessageToWebView({ functionName: 'saveBasicConfigs' })
    ui.run(function () {
      engines.execScriptFile(mainScriptPath + "/unit/能量雨收集.js", { path: mainScriptPath + "/unit/" })
    })
  }
  BaseHandler.cancelCurrentCoolDown = () => {
    commonFunctions.cancelCurrentCoolDown()
    toastLog('撤销成功')
  }
  BaseHandler.checkIfInCooldown = (data, callbackId) => {
    postMessageToWebView({ callbackId: callbackId, data: { coolDownInfo: commonFunctions.checkIfNeedCoolDown() } })
  }
  BaseHandler.showRealtimeVisualConfig = () => {
    // 不在ui线程启动的话会丢失线程上下文，导致执行异常
    ui.run(function () {
      let source = FileUtils.getCurrentWorkPath() + '/test/全局悬浮窗显示-配置信息.js'
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
    })
  }
  BaseHandler.ocrInvokeCount = (data, callbackId) => {
    let invokeStorage = commonFunctions.getBaiduInvokeCountStorage()
    console.log(JSON.stringify(invokeStorage))
    postMessageToWebView({ callbackId: callbackId, data: '今日已调用次数:' + invokeStorage.count + (' 剩余:' + (500 - invokeStorage.count)) })
  }

  return BaseHandler
}