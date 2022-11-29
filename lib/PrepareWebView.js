const resolver = require('./AutoJSRemoveDexResolver.js')
let printExceptionStack = require('./PrintExceptionStack')
/**
 * 初始化webview
 * @param {*} webview 
 * @param {*} options 
 */
module.exports = function (webview, options) {
  options = options || {}
  let enable_log = options.enable_log
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
  runtime.loadDex(mainScriptPath + '/lib/autojs-common.dex')
  importClass(android.webkit.ValueCallback)
  importClass(android.webkit.WebChromeClient)
  importClass(android.webkit.WebViewClient)
  importClass(com.tony.BridgeHandler)
  importClass(com.tony.WebViewBridge)
  importClass(com.tony.autojs.common.OkHttpDownloader)

  importClass(java.util.concurrent.LinkedBlockingQueue)
  importClass(java.util.concurrent.ThreadPoolExecutor)
  importClass(java.util.concurrent.TimeUnit)

  let threadPool = new ThreadPoolExecutor(4, 4, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(128))
  // webview.clearCache(true)
  webview.getSettings().setJavaScriptEnabled(true)
  webview.getSettings().setAllowFileAccess(true)
  webview.getSettings().setAllowContentAccess(true)
  // 禁用缩放
  webview.getSettings().setTextZoom(100)
  webview.getSettings().setBuiltInZoomControls(false)
  webview.getSettings().setSupportZoom(false)
  webview.getSettings().setDisplayZoomControls(false)
  // 防止出现黑色背景
  webview.setBackgroundColor(android.graphics.Color.TRANSPARENT)

  // 创建自定义的WebViewBridge，实现js交互
  let webViewBridge = new WebViewBridge(new BridgeHandler({
    exec: function (params) {
      if (enable_log) {
        let printParams = params
        _debug('bridge handler exec: ' + printParams.replace(/(:"?\w{40})[^"]+/g, "$1"))
      }
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
        message.message && _log('h5:' + message.message())
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
          _log('pageFinished?', pageFinished)
          pageFinished = true
          // 延迟注册耗时操作
          setTimeout(function () {
            _log('页面加载完毕执行 onPageFinished', url, 'view', view)
            options.onPageFinished && options.onPageFinished()
            webview.evaluateJavascript(
              'window.enable_log=' + enable_log + ';',
              new ValueCallback({
                onReceiveValue: function (value) { }
              }))
          }, 500)
        }
      },
      // 拦截内部跳转的链接 使用系统浏览器打开
      shouldOverrideUrlLoading: function (view, request) {
        let url = request.getUrl() + ''
        _log('override url:', url, 'redirect:', request.isRedirect(), 'isForMainFrame:', request.isForMainFrame(), 'hasGesture:', request.hasGesture(), 'getMethod:' + request.getMethod())
        app.openUrl(url)
        return true
      },
      // 挂载完成后变更资源路径，自动替换scripts等内容
      shouldInterceptRequest: function (view, request) {
        let url = request.getUrl() + ''
        _debug('拦截请求：' + url)
        if (url.startsWith('http')) {
          return checkIfCacheExists(mainScriptPath, url, threadPool)
        } else if (url.startsWith('file://')) {
          let relativePath = decodeURI(url.replace('file://', ''))
          let absolutePath = ''
          if (relativePath.indexOf(mainScriptPath) > -1) {
            absolutePath = relativePath
          } else {
            absolutePath = mainScriptPath + (options.resourcePrefix || '') + relativePath
          }
          _debug(absolutePath)
          if (!files.exists(absolutePath)) {
            _error(absolutePath + ' 不存在，无法执行替换 mainPath:' + mainScriptPath)
            return null
          }
          _debug('准备执行替换：' + absolutePath)
          try {
            let result = getMimeTypeByUrl(url)
            let mimeType = result.mimeType
            if (mimeType !== '') {
              let inputStream = new java.io.FileInputStream(absolutePath)
              return new android.webkit.WebResourceResponse(mimeType, 'UTF-8', inputStream)
            } else {
              _warn('无法确定mimeType: ' + absolutePath, 'extend name', result.extendName)
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
        _error('error:' + e)
        printExceptionStack(e)
      }
    })
  }

  function checkIfCacheExists (mainScriptPath, url, threadPool) {
    _debug('检查url 是否存在本地缓存', url)
    let regex = /^http(s)?:\/\/(\w+\.){1,}\w+\/(.*)$/
    let result = regex.exec(url)
    if (result && result.length >= 4) {
      let filePath = mainScriptPath + '/vue_configs/cache/' + result[3]
      _debug('缓存文件名称：', filePath)
      if (files.exists(filePath)) {
        _warn('缓存文件 已存在:', url)
        let result = getMimeTypeByUrl(url)
        let mimeType = result.mimeType
        if (mimeType !== '') {
          let inputStream = new java.io.FileInputStream(filePath)
          return new android.webkit.WebResourceResponse(mimeType, 'UTF-8', inputStream)
        } else {
          _warn('缓存文件 无法确定mimeType: ' + filePath, 'extend name', result.extendName)
        }
      } else {
        _debug('本地缓存不存在', filePath)
      }
      threadPool.execute(function () {
        _debug('下载文件：', url, ' path:', filePath, files.ensureDir(filePath))
        OkHttpDownloader.download(url, filePath)
      })
    } else {
      _warn('解析url中的文件名称失败 url:', url)
    }
    return null
  }

  function getMimeTypeByUrl (url) {
    let extendName = url.substring(url.lastIndexOf('.'))
    let mimeType = ''
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
    return { mimeType: mimeType, extendName: extendName }
  }

  function _debug() {
    enable_log && console.verbose.apply(null, arguments)
  }
  function _log() {
    enable_log && console.log.apply(null, arguments)
  }
  function _warn() {
    enable_log && console.warn.apply(null, arguments)
  }
  function _error() {
    enable_log && console.error.apply(null, arguments)
  }
}
