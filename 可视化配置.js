/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 11:28:15
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-30 20:00:45
 * @Description: 
 */
"ui";
const prepareWebView = require('./lib/PrepareWebView.js')
importClass(android.view.View)
importClass(android.view.WindowManager)

// ---修改状态栏颜色 start--
// clear FLAG_TRANSLUCENT_STATUS flag:
activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
// add FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS flag to the window
activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
activity.getWindow().setStatusBarColor(android.R.color.white)
activity.getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR)
// ---修改状态栏颜色 end--

let dateFormat = require('./lib/DateUtil.js')
let { config, default_config, storage_name } = require('./config.js')(runtime, this)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')

config.hasRootPermission = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su")
if (config.device_width < 10 || config.device_height < 10) {
  toastLog('设备分辨率信息不正确，可能无法正常运行脚本, 请先运行一遍main.js以便自动获取分辨率')
  exit()
}

ui.layout(
  <vertical>
    <webview id="loadingWebview" margin="0 10" />
    <webview id="webview" margin="0 10" />
  </vertical>
)
let mainScriptPath = FileUtils.getRealMainScriptPath(true)
let indexFilePath = "file://" + mainScriptPath + "/vue_configs/index.html"
let loadingFilePath = "file://" + mainScriptPath + "/vue_configs/loading.html"

let postMessageToWebView = () => { console.error('function not ready') }

ui.webview.setVisibility(View.GONE)

prepareWebView(ui.loadingWebview, {
  mainScriptPath: mainScriptPath,
  indexFilePath: loadingFilePath,
  // 延迟注册
  bridgeHandler: () => { },
  onPageFinished: () => {
    const getLocalVersion = function () {
      let mainPath = FileUtils.getCurrentWorkPath()
      let versionFile = files.join(mainPath, 'version.json')
      let projectFile = files.join(mainPath, 'project.json')
      let versionName = ''
      if (files.exists(versionFile)) {
        versionName = JSON.parse(files.read(versionFile)).version
      } else if (files.exists(projectFile)) {
        versionName = JSON.parse(files.read(projectFile)).versionName
      }
      return versionName
    }
    ui.loadingWebview.loadUrl('javascript:setVersion("' + getLocalVersion() + '")')
  }
})

/**/
let params = ui.loadingWebview.getLayoutParams();
params.height = config.device_height;
params.width = config.device_width;
ui.loadingWebview.setLayoutParams(params);
let bridgeHandlerBuilder = require('./lib/BridgeHandler.js')
/**/
postMessageToWebView = prepareWebView(ui.webview, {
  mainScriptPath: mainScriptPath,
  indexFilePath: indexFilePath,
  // 延迟注册
  bridgeHandler: () => bridgeHandlerBuilder(postMessageToWebView),
  onPageFinished: () => {
    log('页面加载完毕')
    registerSensors()
    setTimeout(function () {
      ui.loadingWebview.setVisibility(View.GONE)
      ui.webview.setVisibility(View.VISIBLE)
      log('切换webview')
      setTimeout(function () {
        console.log('loadingWebview height:', ui.loadingWebview.getHeight())
        console.log('webview height:', ui.webview.getHeight())
        postMessageToWebView({ functionName: 'resizeWindow', data: { height: ui.loadingWebview.getHeight(), width: ui.webview.getWidth()} })
      }, 100)
      ui.loadingWebview.clearView()
    }, 1000)
  }
})


// ---------------------

ui.emitter.on('pause', () => {
  postMessageToWebView({ functionName: 'saveBasicConfigs' })
  postMessageToWebView({ functionName: 'saveAdvanceConfigs' })
  postMessageToWebView({ functionName: 'saveWidgetConfigs' })
})

let timeout = null
ui.emitter.on('back_pressed', (e) => {
  if (ui.webview.canGoBack()) {
    ui.webview.goBack()
    e.consumed = true
    return
  }
  // toastLog('触发了返回')
  if (timeout == null || timeout < new Date().getTime()) {
    e.consumed = true
    toastLog('再按一次退出')
    // 一秒内再按一次
    timeout = new Date().getTime() + 1000
  } else {
    sensors.unregisterAll()
    toastLog('再见~')
  }
})

let gravitySensor = null
let distanceSensor = null
function registerSensors () {
  gravitySensor = sensors.register('gravity', sensors.delay.ui)
  if (gravitySensor) {
    gravitySensor.on('change', (event, x, y, z) => {
      postMessageToWebView({ functionName: 'gravitySensorChange', data: { x: x, y: y, z: z } })
    })
  }
  distanceSensor = sensors.register('proximity', sensors.delay.ui)
  if (!distanceSensor) {
    distanceSensor.on('change', (event, d) => {
      postMessageToWebView({ functionName: 'distanceSensorChange', data: { distance: d } })
    })
  }
}
