/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 15:53:42
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-11-29 15:22:09
 * @Description: 
 */
(function () {
  let id = 1
  let callbacks = {}
  let functions = {}
  window.$app = {
    /**
     * webview内调用外部方法
     * 
     * @param {string} bridgeName 方法名
     * @param {object} data 请求参数
     * @param {function} callback 回调方法
     */
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
    /**
     * 在AutoJS中调用
     * 
     * @param {object} params 
     * @returns 
     */
    receiveMessage: function (params) {
      if (window.enable_log && !/SensorChange/.test(params.functionName)) {
        let printParams = JSON.stringify(params)
        console.log('得到回调参数：' + printParams.replace(/(:"?\w{40})[^"]+/g, "$1"))
      }
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
          return func(data)
        }
      }
    },
    /**
     * 注册服务
     * 
     * @param {string} functionName 方法名
     * @param {function} func 具体回调函数
     * @param {boolean} replace 是否替换
     * @returns 
     */
    registerFunction: function (functionName, func, replace) {
      console.log('注册function：', functionName)
      let existFunc = functions[functionName]
      if (existFunc && !replace) {
        return false
      }
      functions[functionName] = func
    },
    /**
     * 撤销注册
     * 
     * @param {string} functionName 方法名
     */
    unregisterFunction: function (functionName) {
      let existFunc = functions[functionName]
      if (existFunc) {
        delete functions[functionName]
      }
    }
  }

  window.$nativeApi = {

    /**
     * 异步请求耗时方法 触发invoke
     * 
     * @param {string} bridgeName 方法名
     * @param {object} data 请求参数
     * @returns {Promise}
     */
    request: function (bridgeName, data) {
      return new Promise(resolve => {
        // 触发异步请求
        setTimeout(() => $app.invoke(bridgeName, data, resp => resolve(resp)), 20)
      })
    }
  }
})()