const resolver = require('./AutoJSRemoveDexResolver.js')
/**
 * 初始化webview
 * @param {*} webview 
 * @param {*} options 
 */
module.exports = function (webview, options) {
  options = options || {}
  let bridgeHandler = options.bridgeHandler || {}
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
      if (params) {
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

  webview.setWebViewClient(
    new JavaAdapter(WebViewClient, {
      onPageStarted: function (view, url) {
        view.post(function () {
          // 注入webview_bridge
          ui.webview.evaluateJavascript(
            files.read(mainScriptPath + "/lib/webview_bridge.js"),
            new ValueCallback({
              onReceiveValue: function (value) { }
            }))
        })
      },
      onPageFinished: function (view, url) {
        // 延迟注册耗时操作
        setTimeout(function () {
          options.onPageFinished && options.onPageFinished()
        }, 500)
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
            if (url.endsWith('.js')) {
              mimeType = 'application/x-javascript'
            } else if (url.endsWith('.css')) {
              mimeType = 'text/css'
            } else if (url.endsWith('.json')) {
              mimeType = 'application/json'
            } else if (url.endsWith('.ico')) {
              mimeType = 'image/x-icon'
            } else if (url.endsWith('.svg')) {
              mimeType = 'image/svg+xml'
            }
            if (mimeType !== '') {
              return new android.webkit.WebResourceResponse(mimeType, 'UTF-8', inputStream)
            } else {
              console.warn('无法确定mimeType: ' + absolutePath)
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


function printExceptionStack (e) {
  if (e) {
    console.error(util.format('fileName: %s line:%s typeof e:%s', e.fileName, e.lineNumber, typeof e))
    let throwable = null
    if (e.javaException) {
      throwable = e.javaException
    } else if (e.rhinoException) {
      throwable = e.rhinoException
    }
    if (throwable) {
      let scriptTrace = new StringBuilder(e.message == null ? '' : e.message + '\n')
      let stringWriter = new StringWriter()
      let writer = new PrintWriter(stringWriter)
      throwable.printStackTrace(writer)
      writer.close()
      let bufferedReader = new BufferedReader(new StringReader(stringWriter.toString()))
      let line
      while ((line = bufferedReader.readLine()) != null) {
        scriptTrace.append("\n").append(line)
      }
      console.error(scriptTrace.toString())
    } else {
      let funcs = Object.getOwnPropertyNames(e)
      for (let idx in funcs) {
        let func_name = funcs[idx]
        console.verbose(func_name)
      }
    }
  }
}