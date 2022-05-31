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
let { config, default_config, storage_name } = require('./config.js')(runtime, global)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')

config.hasRootPermission = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su")
if (config.device_width < 10 || config.device_height < 10) {
  toastLog('设备分辨率信息不正确，可能无法正常运行脚本, 请先运行一遍main.js以便自动获取分辨率')
  exit()
}

ui.layout(
  <vertical>
    <webview id="webview" margin="0 0" h="*" w="*" />
  </vertical>
)
let mainScriptPath = FileUtils.getRealMainScriptPath(true)
let indexFilePath = "file://" + mainScriptPath + "/vue_configs/log-read.html"

let postMessageToWebView = () => { console.error('function not ready') }

/**/

let bridgeHandlerBuilder = require('./lib/BridgeHandler.js')
// let logPath = '/storage/emulated/0/脚本/.logs/autojs-log4j.txt'
// let logPath = '/storage/emulated/0/脚本/energy_store/logs/for-read.log'
let logPath = mainScriptPath + '/logs/log-verboses.log'
function logHandler(BaseHandler) {
  // 扩展方法 
  console.verbose('注册方法 loadLogs')
  BaseHandler.loadLogs = (data, callbackId) => {
    let readResult = FileUtils.readLastLines(data.logPath || logPath, data.num || 200, data.start)
    postMessageToWebView({ callbackId: callbackId, data: { readResult: readResult } })
  }
  BaseHandler.listLogFiles = (data, callbackId) => {
    let logFileMatcher = new RegExp(data.logFileMatcher || /\.(log|txt)(\.\d+)?$/)
    let fileResult = FileUtils.listDirs(data.filePath, (file) => {
      return file.isDirectory() || logFileMatcher.test(file.getName())
    })
    console.verbose('加载文件列表：' + JSON.stringify(fileResult))
    postMessageToWebView({ callbackId: callbackId, data: { fileResult: fileResult, currentPath: data.filePath } })
  }
  return BaseHandler
}

/**/
postMessageToWebView = prepareWebView(ui.webview, {
  enable_log: true,
  mainScriptPath: mainScriptPath,
  indexFilePath: indexFilePath,
  // 延迟注册
  bridgeHandler: () => logHandler(bridgeHandlerBuilder(postMessageToWebView)),
  onPageFinished: () => { }
})


// ---------------------

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
    toastLog('再见~')
  }
})
