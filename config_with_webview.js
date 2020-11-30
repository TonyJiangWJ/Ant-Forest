/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 11:28:15
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-30 23:41:02
 * @Description: 
 */
"ui";

const resolver = require('./lib/AutoJSRemoveDexResolver.js')
resolver()
runtime.loadDex('./lib/webview-bridge.dex')
importClass(android.view.View)
importClass(android.view.WindowManager)
importClass(android.webkit.ValueCallback)
importClass(android.webkit.WebChromeClient)
importClass(android.webkit.WebViewClient)
importClass(com.tony.BridgeHandler)
importClass(com.tony.WebViewBridge)

// ---修改状态栏颜色 start--
// clear FLAG_TRANSLUCENT_STATUS flag:
activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
// add FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS flag to the window
activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
activity.getWindow().setStatusBarColor(android.R.color.white);
activity.getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
// ---修改状态栏颜色 end--

let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let { config, default_config, storage_name } = require('./config.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
config.hasRootPermission = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su")

ui.layout(
  <vertical>
    <webview id="webview" margin="0 10" />
  </vertical>
)
ui.webview.getSettings().setJavaScriptEnabled(true);
let mainScriptPath = FileUtils.getRealMainScriptPath(true)
let indexFilePath = "file://" + mainScriptPath + "/vue_configs/index.html"

let storageConfig = storages.create(storage_name)

let bridgeHandler = {
  toast: data => {
    toast(data.message)
  },
  toastLog: data => {
    toastLog(data.message)
  },
  loadConfigs: (data, callbackId) => {
    postMessageToWebView({ callbackId: callbackId, data: config })
  },
  saveConfigs: data => {
    let newVal = undefined
    Object.keys(data).forEach(key => {
      newVal = data[key]
      if (typeof newVal !== 'undefined') {
        storageConfig.put(key, newVal)
      }
    })
    sendConfigChangedBroadcast(data)
  },
  showRealtimeVisualConfig: () => {
    // 不在ui线程启动的话会丢失线程上下文，导致执行异常
    ui.run(function () {
      let source = FileUtils.getCurrentWorkPath() + '/test/全局悬浮窗显示-配置信息.js'
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
    })
  },
  resetConfigs: (data, callbackId) => {
    ui.run(function () {
      confirm('确定要将所有配置重置为默认值吗？').then(ok => {
        if (ok) {
          Object.keys(default_config).forEach(key => {
            let defaultValue = default_config[key]
            config[key] = defaultValue
            storageConfig.put(key, defaultValue)
          })
          toastLog('重置默认值')
          postMessageToWebView({ functionName: 'reloadBasicConfigs' })
          postMessageToWebView({ functionName: 'reloadAdvanceConfigs' })
          postMessageToWebView({ functionName: 'reloadWidgetConfigs' })
        }
      })
    })
  },
  // 测试回调
  callback: (data, callbackId) => {
    log('callback param:' + JSON.stringify(data))
    postMessageToWebView({ callbackId: callbackId, data: { message: 'hello,' + callbackId } })
  }
}

// 创建自定义的WebViewBridge，实现js交互
let webViewBridge = new WebViewBridge(new BridgeHandler({
  exec: function (params) {
    log('bridge handler exec: ' + params)
    if (params) {
      params = JSON.parse(params)
      let { bridgeName, callbackId, data } = params
      let handlerFunc = bridgeHandler[bridgeName]
      if (handlerFunc) {
        handlerFunc(data, callbackId)
      } else {
        toastLog('no match bridge for name: ' + bridgeName)
      }
    }
  }
}))
// 注册bridge
ui.webview.addJavascriptInterface(webViewBridge, 'nativeWebviewBridge')
// 挂载index.html
ui.webview.loadUrl(indexFilePath)
// 挂载完成后变更js路径，挂载scripts
ui.webview.setWebViewClient(
  new JavaAdapter(WebViewClient, {
    onPageFinished: function (view, url) {
      // view.loadUrl('javascript:appendScripts("' + mainScriptPath + '")')
      // 延迟注册耗时操作
      setTimeout(function () {
        registerSensors()
        let invokeStorage = config.useTesseracOcr ? commonFunctions.getTesseracInvokeCountStorage() : commonFunctions.getBaiduInvokeCountStorage()
        postMessageToWebView({ functionName: 'ocr_invoke_count', data: invokeStorage.date + '已调用次数:' + invokeStorage.count + (config.useTesseracOcr ? '' : ' 剩余:' + (500 - invokeStorage.count)) })
      }, 500)
    }
  })
)
// 日志打印到控制台
ui.webview.setWebChromeClient(
  new JavaAdapter(WebChromeClient, {
    onConsoleMessage: function (message) {
      message.message && log('h5:' + message.message())
    }
  })
)


// ---------------------
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
      let scriptTrace = new StringBuilder(e.message == null ? '' : e.message + '\n');
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


ui.emitter.on('pause', () => {
  postMessageToWebView({ functionName: 'saveBasicConfigs' })
  postMessageToWebView({ functionName: 'saveAdvanceConfigs' })
  postMessageToWebView({ functionName: 'saveWidgetConfigs' })
})


function postMessageToWebView (callbackParams, callback) {
  // 回调必须在ui线程执行
  ui.run(function () {
    try {
      // ui.webview.loadUrl('javascript:')
      ui.webview.evaluateJavascript(
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
let gravitySensor = null
let distanceSensor = null
function registerSensors () {
  if (!gravitySensor) {
    gravitySensor = sensors.register('gravity', sensors.delay.ui).on('change', (event, x, y, z) => {
      postMessageToWebView({ functionName: 'gravitySensorChange', data: { x: x, y: y, z: z } })
    })
  }
  if (!distanceSensor) {
    distanceSensor = sensors.register('proximity', sensors.delay.ui).on('change', (event, d) => {
      postMessageToWebView({ functionName: 'distanceSensorChange', data: { distance: d } })
    })
  }
}

function sendConfigChangedBroadcast (newConfig) {
  newConfig = newConfig || config
  console.verbose(engines.myEngine().id + ' 发送广播 通知配置变更')
  events.broadcast.emit(storage_name + 'config_changed', { config: newConfig, id: engines.myEngine().id })
}