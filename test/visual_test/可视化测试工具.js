/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 11:28:15
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-29 22:56:02
 * @Description: 
 */
"ui";

const resolver = require('../../lib/AutoJSRemoveDexResolver.js')
resolver()
runtime.loadDex('../../lib/webview-bridge.dex')
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

let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let { config } = require('../../config.js')(runtime, this)
config.develop_mode = true
config.async_save_log_file = false
let commonFunctions = singletonRequire('CommonFunction')
let resourceMonitor = require('../../lib/ResourceMonitor.js')(runtime, this)
let OpenCvUtil = require('../../lib/OpenCvUtil.js')
config.hasRootPermission = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su")
if (config.device_width < 10 || config.device_height < 10) {
  toastLog('设备分辨率信息不正确，可能无法正常运行脚本, 请先运行一遍main.js以便自动获取分辨率')
  exit()
}
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
let indexFilePath = "file://" + mainScriptPath + "/test/visual_test/index.html"

// 图片数据
let imageDataPath = FileUtils.getCurrentWorkPath() + '/logs/ball_image.data'
let testImagePath = FileUtils.getCurrentWorkPath() + '/test/visual_test/测试用图片.png'

let bridgeHandler = {
  toast: data => {
    toast(data.message)
  },
  toastLog: data => {
    toastLog(data.message)
  },
  // 测试回调
  callback: (data, callbackId) => {
    log('callback param:' + JSON.stringify(data))
    postMessageToWebView({ callbackId: callbackId, data: { message: 'hello,' + callbackId } })
  },
  loadImageInfo: (data, callbackId) => {
    threads.start(function () {
      if (files.exists(testImagePath)) {
        let countdown = new Countdown()
        let imageInfo = images.read(testImagePath)
        let grayImageInfo = images.grayscale(imageInfo)
        let intervalImageInfo = images.inRange(data.intervalByGray ? grayImageInfo : imageInfo
          , data.lowerRange || '#000000', data.higherRange || '#FFFFFF')
        countdown.summary('图片灰度二值化处理等')
        countdown.restart()
        let image = {
          intervalImageData: 'data:image/png;base64,' + images.toBase64(intervalImageInfo)
        }
        if (!data.intervalBase64Only) {
          image.originImageData = 'data:image/png;base64,' + images.toBase64(imageInfo)
          image.grayImageData = 'data:image/png;base64,' + images.toBase64(grayImageInfo)
        }
        countdown.summary('图片数据转Base64')
        postMessageToWebView({ callbackId: callbackId, data: { success: true, image: image } })
      } else {
        toastLog('图片数据不存在，无法执行')
        postMessageToWebView({ callbackId: callbackId, data: { success: false } })
      }
    })
  },
  loadMoreImageDatas: (data, callbackId) => {
    let fd = files.open(imageDataPath, 'r')
    let ballInfos = []
    let offset = data.offset || 0
    let limit = data.limit || 20
    let newOffset = offset
    // 耗时操作，创建线程进行处理
    threads.start(function () {
      let line = fd.readline()
      console.verbose(util.format('data.offset: %s offset: %s', JSON.stringify(data.offset), JSON.stringify(offset)))
      for (let i = 0; line != null && ballInfos.length < limit; i++) {
        if (i >= offset) {
          let ballInfo = convertToJson(line, data.filterOption)
          if (ballInfo != null) {
            let imageInfo = images.fromBase64(ballInfo.imageData)
            ballInfo.originImageData = ballInfo.imageData
            let grayImg = images.grayscale(imageInfo)
            ballInfo.grayImageData = 'data:image/png;base64,' + images.toBase64(grayImg)
            // let intervalImg = images.inRange(grayImg, data.lowerRange || '#a1a1a1', data.higherRange || '#b1b1b1')
            let intervalImg = null
            console.verbose('interval by gray: ' + data.filterOption.intervalByGray)
            if (data.filterOption.intervalByGray) {
              intervalImg = images.inRange(grayImg, data.lowerRange || '#a1a1a1', data.higherRange || '#b1b1b1')
            } else {
              intervalImg = images.inRange(imageInfo, data.lowerRange || '#a1a1a1', data.higherRange || '#b1b1b1')
            }
            ballInfo.oldAvg = ballInfo.avg
            ballInfo.avg = OpenCvUtil.getHistAverage(intervalImg)
            ballInfo.oldStd = ballInfo.std
            ballInfo.std = OpenCvUtil.getStandardDeviation(intervalImg)
            ballInfo.oldMedianBottom = ballInfo.medianBottom
            ballInfo.medianBottom = OpenCvUtil.getStandardDeviation(images.clip(intervalImg, 0, 160, intervalImg.width, intervalImg.height - 160))
            ballInfo.intervalImageData = 'data:image/png;base64,' + images.toBase64(intervalImg)
            ballInfos.push(ballInfo)/**/
          }
        }
        newOffset = i + 1
        line = fd.readline()
      }
      console.verbose(util.format('total valid balls: %d', ballInfos.length))
      fd.close()
      postMessageToWebView({ callbackId: callbackId, data: { ballInfos: ballInfos, offset: newOffset } })
    })
  },
  getPointColor: function (data, callbackId) {
    threads.start(function () {
      if (files.exists(testImagePath)) {
        let imageInfo = images.read(testImagePath)
        let grayImageInfo = images.grayscale(imageInfo)
        postMessageToWebView({
          callbackId: callbackId,
          data: {
            success: true,
            rgbColor: colors.toString(imageInfo.getBitmap().getPixel(data.x, data.y)),
            grayColor: colors.toString(grayImageInfo.getBitmap().getPixel(data.x, data.y))
          }
        })
      } else {
        toastLog('图片数据不存在，无法执行')
        postMessageToWebView({ callbackId: callbackId, data: { success: false } })
      }
    })
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
android.webkit.WebView.setWebContentsDebuggingEnabled(true)
// 注册bridge
ui.webview.addJavascriptInterface(webViewBridge, 'nativeWebviewBridge')
// 挂载index.html
ui.webview.loadUrl(indexFilePath)
// 挂载完成后变更js路径，挂载scripts
ui.webview.setWebViewClient(
  new JavaAdapter(WebViewClient, {
    onPageFinished: function (view, url) {
      // view.loadUrl('javascript:appendScripts("' + mainScriptPath + '")')
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
  // postMessageToWebView({ functionName: 'saveBasicConfigs' })
  // postMessageToWebView({ functionName: 'saveAdvanceConfigs' })
  // postMessageToWebView({ functionName: 'saveWidgetConfigs' })
})

let timeout = null
ui.emitter.on('back_pressed', (e) => {
  // toastLog('触发了返回')
  if (timeout == null || timeout < new Date().getTime()) {
    e.consumed = true
    toastLog('再按一次退出')
    postMessageToWebView({ functionName: 'clickBack' })
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

function convertToJson (line, filterOption) {
  filterOption = filterOption || {}
  if (line.indexOf('ballInfo:') == 0) {
    let data = line.split(/\}\s/)
    if (data.length > 1) {
      let ballStr = data[0].replace('ballInfo:', '') + '}'
      let imageData = data[1]
      let ballImageInfo = JSON.parse(ballStr)
      if (filterOption.invalidOnly && !ballImageInfo.invalid) {
        return null
      }
      if (filterOption.validOnly && ballImageInfo.invalid) {
        return null
      }
      if (filterOption.helpOnly && !ballImageInfo.isHelp) {
        return null
      }
      if (filterOption.collectedOnly && (ballImageInfo.invalid || ballImageInfo.isHelp)) {
        return null
      }
      if (filterOption.ownOnly && !ballImageInfo.isOwn) {
        return null
      }
      if (filterOption.notOwn && ballImageInfo.isOwn) {
        return null
      }
      if (filterOption.dayOnly && ballImageInfo.isNight) {
        return null
      }
      if (filterOption.nightOnly && !ballImageInfo.isNight) {
        return null
      }
      // if (!ballImageInfo.isWatering) {
      //   return null
      // }
      ballImageInfo.imageData = imageData
      return ballImageInfo
    }
  }
  return null
}


function Countdown () {
  this.start = new Date().getTime()
  this.getCost = function () {
    return new Date().getTime() - this.start
  }

  this.summary = function (content) {
    console.verbose(content + ' 耗时' + this.getCost() + 'ms')
  }

  this.restart = function () {
    this.start = new Date().getTime()
  }

}