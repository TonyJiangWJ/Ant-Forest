/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 15:53:42
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-30 23:38:21
 * @Description: 
 */
(function () {
  let id = 1
  let callbacks = {}
  let functions = {}
  window.$app = {
    invoke: function (bridgeName, data, callback) {
      let callbackId = id++
      callbacks[callbackId] = callback
      let params = {
        bridgeName: bridgeName,
        data: data,
        callbackId: callbackId
      }
      typeof nativeWebviewBridge !== 'undefined' && nativeWebviewBridge.postMessage(JSON.stringify(params))
    },
    receiveMessage: function (params) {
      // console.log('得到回调参数：' + JSON.stringify(params))
      // params = JSON.parse(params)
      let callbackId = params.callbackId
      let data = params.data || {}
      let callback = callbacks[callbackId]
      if (callback) {
        callback(data)
        delete callbacks[callbackId]
      } else {
        // console.log('native调用方法：' + params.functionName)
        let func = functions[params.functionName]
        if (func) {
          func(data)
        }
      }
    },
    registerFunction: function(functionName, func) {
      let existFunc = functions[functionName]
      if (existFunc) {
        return false
      }
      functions[functionName] = func
    }
  }
})()