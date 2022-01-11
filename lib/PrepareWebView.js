const resolver = require('./AutoJSRemoveDexResolver.js')
let printExceptionStack = require('./PrintExceptionStack')
/**
 * 初始化webview
 * @param {*} webview 
 * @param {*} options 
 */
module.exports = function (webview, options) {
  options = options || {}
  let bridgeHandler = null
  let mainScriptPath = options.mainScriptPath
  if (!mainScriptPath) {
    console.error('mainScriptPath为空，无法加载')
    return
  }
  if (!options.indexFilePath) {
    console.error('indexFilePath为空，无法加载')
    return
  }
  resolver()
  runtime.loadDex(mainScriptPath + '/lib/webview-bridge.dex')
  importClass(android.webkit.ValueCallback)
  importClass(android.webkit.WebChromeClient)
  importClass(android.webkit.WebViewClient)
  importClass(com.tony.BridgeHandler)
  importClass(com.tony.WebViewBridge)

  webview.getSettings().setJavaScriptEnabled(true)
  // 禁用缩放
  webview.getSettings().setTextZoom(100)
  // 防止出现黑色背景
  webview.setBackgroundColor(android.graphics.Color.TRANSPARENT)

  // 创建自定义的WebViewBridge，实现js交互
  let webViewBridge = new WebViewBridge(new BridgeHandler({
    exec: function (params) {
      log('bridge handler exec: ' + params)
      try {
        if (params) {
          if (!bridgeHandler) {
            bridgeHandler = options.bridgeHandler() || {}
          }
          params = JSON.parse(params)
          let { bridgeName, callbackId, data } = params
          let handlerFunc = bridgeHandler[bridgeName]
          if (handlerFunc) {
            try {
              handlerFunc(data, callbackId)
            } catch (e) {
              printExceptionStack(e)
            }
          } else {
            toastLog('no match bridge for name: ' + bridgeName)
          }
        }
      } catch (e) {
        printExceptionStack(e)
      }
    }
  }))
  // 注册bridge
  webview.addJavascriptInterface(webViewBridge, 'nativeWebviewBridge')
  // 启用调试模式
  if (options.enableDebug) {
    android.webkit.WebView.setWebContentsDebuggingEnabled(true)
  }
  // 挂载index.html
  webview.loadUrl(options.indexFilePath)

  // 日志打印到控制台
  webview.setWebChromeClient(
    new JavaAdapter(WebChromeClient, {
      onConsoleMessage: function (message) {
        message.message && log('h5:' + message.message())
      }
    })
  )

  let pageFinished = false
  webview.setWebViewClient(
    new JavaAdapter(WebViewClient, {
      onPageStarted: function (view, url) {
        view.post(function () {
          // 注入webview_bridge
          webview.evaluateJavascript(
            files.read(mainScriptPath + "/lib/webview_bridge.js"),
            new ValueCallback({
              onReceiveValue: function (value) { }
            }))
        })
      },
      onPageFinished: function (view, url) {
        if (webview.getProgress() == 100 && !pageFinished) {
          console.log('pageFinished?', pageFinished)
          pageFinished = true
          // 延迟注册耗时操作
          setTimeout(function () {
            console.log('页面加载完毕执行 onPageFinished', url, 'view', view)
            options.onPageFinished && options.onPageFinished()
          }, 500)
        }
      },
      // 挂载完成后变更资源路径，自动替换scripts等内容
      shouldInterceptRequest: function (view, request) {
        let url = request.getUrl() + ''
        console.verbose('拦截请求：' + url)
        if (url.startsWith('file://')) {
          let relativePath = decodeURI(url.replace('file://', ''))
          let absolutePath = ''
          if (relativePath.indexOf(mainScriptPath) > -1) {
            absolutePath = relativePath
          } else {
            absolutePath = mainScriptPath + (options.resourcePrefix || '') + relativePath
          }
          console.verbose(absolutePath)
          if (!files.exists(absolutePath)) {
            console.error(absolutePath + ' 不存在，无法执行替换 mainPath:' + mainScriptPath)
            return null
          }
          console.verbose('准备执行替换：' + absolutePath)
          try {
            let inputStream = new java.io.FileInputStream(absolutePath)
            let mimeType = ''
            let extendName = url.substring(url.lastIndexOf('.'))
            switch (extendName) {
              case '.js':
                mimeType = 'application/x-javascript'
                break;
              case '.css':
                mimeType = 'text/css'
                break;
              case '.html':
                mimeType = 'text/html'
                break;
              case '.json':
                mimeType = 'application/json'
                break;
              case '.ico':
                mimeType = 'image/x-icon'
                break;
              case '.svg':
                mimeType = 'image/svg+xml'
                break;
              case '.jpg':
              case '.jpeg':
                mimeType = 'image/jpeg'
                break;
              case '.gif':
                mimeType = 'image/gif'
                break;
              case '.png':
                mimeType = 'image/png'
                break;
              default:
                // ...只增加了常用的 如有需要可上网查找 参考链接 https://tool.oschina.net/commons/_contenttype.dea
            }
            if (mimeType !== '') {
              return new android.webkit.WebResourceResponse(mimeType, 'UTF-8', inputStream)
            } else {
              console.warn('无法确定mimeType: ' + absolutePath, 'extend name', extendName)
            }
          } catch (e) {
            return null
          }
        }
        return null
      }
    })
  )

  return function (callbackParams, callback) {
    // 回调必须在ui线程执行
    ui.run(function () {
      try {
        webview.evaluateJavascript(
          '$app.receiveMessage(' + JSON.stringify(callbackParams) + ');',
          new ValueCallback({
            onReceiveValue: function (value) { callback && callback(value) }
          }))
      } catch (e) {
        console.log('error:' + e)
        printExceptionStack(e)
      }
    })
  }
}
