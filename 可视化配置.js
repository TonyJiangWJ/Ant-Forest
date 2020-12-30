/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 11:28:15
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-30 20:00:45
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
activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
// add FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS flag to the window
activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
activity.getWindow().setStatusBarColor(android.R.color.white)
activity.getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR)
// ---修改状态栏颜色 end--

let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let AesUtil = require('./lib/AesUtil.js')
let { config, default_config, storage_name } = require('./config.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
config.hasRootPermission = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su")
if (config.device_width < 10 || config.device_height < 10) {
  toastLog('设备分辨率信息不正确，可能无法正常运行脚本, 请先运行一遍main.js以便自动获取分辨率')
  exit()
}
let local_config_path = files.cwd() + '/local_config.cfg'
let runtime_store_path = files.cwd() + '/runtime_store.cfg'
let aesKey = device.getAndroidId()
ui.layout(
  <vertical>
    <webview id="webview" margin="0 10" />
  </vertical>
)
ui.webview.getSettings().setJavaScriptEnabled(true)
// 禁用缩放
ui.webview.getSettings().setTextZoom(100)
// 防止出现黑色背景
ui.webview.setBackgroundColor(android.graphics.Color.TRANSPARENT)
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
        config[key] = newVal
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
  // 加载已安装的应用
  loadInstalledPackages: (data, callbackId) => {
    let pm = context.getPackageManager()
    // Return a List of all packages that are installed on the device.
    let packages = pm.getInstalledPackages(0)
    let installedPackage = []
    for (let i = 0; i < packages.size(); i++) {
      let packageInfo = packages.get(i)
      // 判断系统/非系统应用
      if ((packageInfo.applicationInfo.flags & android.content.pm.ApplicationInfo.FLAG_SYSTEM) == 0) {
        // 非系统应用
        let appInfo = pm.getApplicationInfo(packageInfo.packageName, android.content.pm.PackageManager.GET_META_DATA)
        let appName = appInfo.loadLabel(pm) + ""
        installedPackage.push({ packageName: packageInfo.packageName, appName: appName })
      } else {
        // 系统应用
        // console.verbose("system packageInfo: " + packageInfo.packageName)
      }
    }
    postMessageToWebView({ callbackId: callbackId, data: installedPackage })
  },
  // 重置配置为默认
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
  exportConfigs: () => {
    // 触发重载配置，异步操作 但是应该很快
    postMessageToWebView({ functionName: 'saveBasicConfigs' })
    postMessageToWebView({ functionName: 'saveAdvanceConfigs' })
    postMessageToWebView({ functionName: 'saveWidgetConfigs' })
    ui.run(function () {
      confirm('确定要将配置导出到local_config.cfg吗？此操作会覆盖已有的local_config数据').then(ok => {
        if (ok) {
          Object.keys(default_config).forEach(key => {
            console.verbose(key + ': ' + config[key])
          })
          try {
            let configString = AesUtil.encrypt(JSON.stringify(config), aesKey)
            files.write(local_config_path, configString)
            toastLog('配置信息导出成功，刷新目录即可，local_config.cfg内容已加密仅本机可用，除非告知秘钥')
          } catch (e) {
            toastLog(e)
          }

        }
      })
    })
  },
  restoreConfigs: () => {
    ui.run(function () {
      confirm('确定要从local_config.cfg中读取配置吗？').then(ok => {
        if (ok) {
          try {
            if (files.exists(local_config_path)) {
              let refillConfigs = function (configStr) {
                let local_config = JSON.parse(configStr)
                Object.keys(default_config).forEach(key => {
                  let defaultValue = local_config[key]
                  if (typeof defaultValue === 'undefined') {
                    defaultValue = default_config[key]
                  }
                  config[key] = defaultValue
                  storageConfig.put(key, defaultValue)
                })
                // 触发页面重载
                postMessageToWebView({ functionName: 'reloadBasicConfigs' })
                postMessageToWebView({ functionName: 'reloadAdvanceConfigs' })
                postMessageToWebView({ functionName: 'reloadWidgetConfigs' })
                toastLog('重新导入配置成功')
              }
              let configStr = AesUtil.decrypt(files.read(local_config_path), aesKey)
              if (!configStr) {
                toastLog('local_config.cfg解密失败, 请尝试输入秘钥')
                dialogs.rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                  .then(key => {
                    if (key) {
                      key = key.trim()
                      configStr = AesUtil.decrypt(files.read(local_config_path), key)
                      if (configStr) {
                        refillConfigs(configStr)
                      } else {
                        toastLog('秘钥不正确，无法解析')
                      }
                    }
                  })
              } else {
                refillConfigs(configStr)
              }
            } else {
              toastLog('local_config.cfg不存在无法导入')
            }
          } catch (e) {
            toastLog(e)
          }
        }
      })
    })
  },
  exportRuntimeStorage: function () {
    ui.run(function () {
      confirm('确定要将运行时数据导出到runtime_store.cfg吗？此操作会覆盖已有的数据').then(ok => {
        if (ok) {
          try {
            let runtimeStorageStr = AesUtil.encrypt(commonFunctions.exportRuntimeStorage(), aesKey)
            files.write(runtime_store_path, runtimeStorageStr)
          } catch (e) {
            toastLog(e)
          }
        }
      })
    })
  },
  restoreRuntimeStorage: function () {
    ui.run(function () {
      confirm('确定要将从runtime_store.cfg导入运行时数据吗？此操作会覆盖已有的数据').then(ok => {
        if (ok) {
          if (files.exists(runtime_store_path)) {
            let encrypt_content = files.read(runtime_store_path)
            let resetRuntimeStore = function (runtimeStorageStr) {
              if (commonFunctions.importRuntimeStorage(runtimeStorageStr)) {
                toastLog('导入运行配置成功')
                return true
              }
              toastLog('导入运行配置失败，无法读取正确信息')
              return false
            }
            try {
              let decrypt = AesUtil.decrypt(encrypt_content, aesKey)
              if (!decrypt) {
                toastLog('runtime_store.cfg解密失败, 请尝试输入秘钥')
                dialogs.rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                  .then(key => {
                    if (key) {
                      key = key.trim()
                      decrypt = AesUtil.decrypt(encrypt_content, key)
                      if (decrypt) {
                        resetRuntimeStore(decrypt)
                      } else {
                        toastLog('秘钥不正确，无法解析')
                      }
                    }
                  })
              } else {
                resetRuntimeStore(decrypt)
              }
            } catch (e) {
              toastLog(e)
            }
          } else {
            toastLog('配置信息不存在，无法导入')
          }
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
// 启用调试模式
// android.webkit.WebView.setWebContentsDebuggingEnabled(true)
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


ui.emitter.on('pause', () => {
  postMessageToWebView({ functionName: 'saveBasicConfigs' })
  postMessageToWebView({ functionName: 'saveAdvanceConfigs' })
  postMessageToWebView({ functionName: 'saveWidgetConfigs' })
})

let timeout = null
ui.emitter.on('back_pressed', (e) => {
  // toastLog('触发了返回')
  if (timeout == null || timeout < new Date().getTime()) {
    e.consumed = true
    toastLog('再按一次退出')
    // 一秒内再按一次
    timeout = new Date().getTime() + 1000
  } else {
    toastLog('再见~')
  }
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
