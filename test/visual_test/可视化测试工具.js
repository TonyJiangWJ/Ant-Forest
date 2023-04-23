/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 11:28:15
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2023-03-30 13:44:22
 * @Description: 
 */
"ui";
const prepareWebView = require('../../lib/PrepareWebView.js')

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

let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let { config } = require('../../config.js')(runtime, global)
let _config = config
config.develop_mode = true
config.show_debug_log = true
config.async_save_log_file = false
let commonFunctions = singletonRequire('CommonFunction')
let resourceMonitor = require('../../lib/ResourceMonitor.js')(runtime, global)
let OpenCvUtil = require('../../lib/OpenCvUtil.js')
let _BaseScanner = require('../../core/BaseScanner.js')
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
ui.webview.clearCache(true)
let mainScriptPath = FileUtils.getRealMainScriptPath(true)
let indexFilePath = "file://" + mainScriptPath + "/test/visual_test/index.html"
let postMessageToWebView = () => { console.error('function not ready') }
// 图片数据
let imageDataPath = FileUtils.getCurrentWorkPath() + '/logs/ball_image.data'
let testImagePath = FileUtils.getCurrentWorkPath() + '/test/visual_test/测试用图片.png'
let testBallImagePath = FileUtils.getCurrentWorkPath() + '/test/visual_test/图片/'
// let testBallImagePath = FileUtils.getCurrentWorkPath() + '/resources/tree_collect/'
let BASE64_PREFIX = 'data:image/png;base64,'
let scanner = new _BaseScanner()
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
  loadDefaultHelpRange: (data, callbackId) => {
    postMessageToWebView({ callbackId: callbackId, data: { lower: config.helpable_lower, upper: config.helpable_upper } })
  },
  loadImageInfo: (data, callbackId) => {
    threads.start(function () {
      let readPath = testImagePath
      if (data.imagePath) {
        readPath = data.imagePath
        if (!readPath.startsWith('/storage')) {
          readPath = mainScriptPath + '/' + readPath
        }
      }
      if (files.exists(readPath)) {
        let countdown = new Countdown()
        let imageInfo = images.read(readPath)
        let grayImageInfo = images.grayscale(imageInfo)
        let intervalImageInfo = images.inRange(data.intervalByGray ? grayImageInfo : imageInfo
          , data.lowerRange || '#000000', data.upperRange || '#FFFFFF')
        countdown.summary('图片灰度二值化处理等')
        countdown.restart()
        let image = {
          intervalImageData: BASE64_PREFIX + images.toBase64(intervalImageInfo)
        }
        if (!data.intervalBase64Only) {
          image.originImageData = BASE64_PREFIX + images.toBase64(imageInfo)
          image.grayImageData = BASE64_PREFIX + images.toBase64(grayImageInfo)
        }
        countdown.summary('图片数据转Base64')
        console.verbose('图片base64:', image.intervalImageData)
        postMessageToWebView({ callbackId: callbackId, data: { success: true, image: image } })
      } else {
        toastLog('图片数据不存在，无法执行')
        postMessageToWebView({ callbackId: callbackId, data: { success: false } })
      }
    })
  },
  listImageFiles: (data, callbackId) => {
    let imageFileMatcher = new RegExp(data.imageFileMatcher || /\.(png|jpg|jpeg)$/)
    let readPath = data.filePath || ''
    if (!readPath.startsWith('/storage')) {
      readPath = mainScriptPath + '/' + readPath
    }
    let fileResult = FileUtils.listDirs(readPath, (file) => {
      return file.isDirectory() || imageFileMatcher.test(file.getName())
    })
    console.verbose('加载文件列表：' + JSON.stringify(fileResult))
    postMessageToWebView({ callbackId: callbackId, data: { fileResult: fileResult, currentPath: data.filePath } })
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
            ballInfo.grayImageData = BASE64_PREFIX + images.toBase64(grayImg)
            // let intervalImg = images.inRange(grayImg, data.lowerRange || '#a1a1a1', data.upperRange || '#b1b1b1')
            let intervalImg = null
            console.verbose('interval by gray: ' + data.filterOption.intervalByGray)
            if (data.filterOption.intervalByGray) {
              intervalImg = images.inRange(grayImg, data.lowerRange || '#a1a1a1', data.upperRange || '#b1b1b1')
            } else {
              intervalImg = images.inRange(imageInfo, data.lowerRange || '#a1a1a1', data.upperRange || '#b1b1b1')
            }
            ballInfo.oldAvg = ballInfo.avg
            ballInfo.avg = OpenCvUtil.getHistAverage(intervalImg)
            ballInfo.oldStd = ballInfo.std
            ballInfo.std = OpenCvUtil.getStandardDeviation(intervalImg)
            ballInfo.oldAvgBottom = ballInfo.avgBottom
            ballInfo.avgBottom = OpenCvUtil.getHistAverage(images.clip(intervalImg, 0, 2 * parseInt(ballInfo.ball.radius), intervalImg.width, intervalImg.height - 2 * parseInt(ballInfo.ball.radius)))
            ballInfo.intervalImageData = BASE64_PREFIX + images.toBase64(intervalImg)
            ballInfos.push(ballInfo)/**/
          }
          newOffset = i + 1
        }
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
  },
  loadTestImageByIndex: function (data, callbackId) {
    if (files.exists(testBallImagePath)) {
      let imageFiles = files.listDir(testBallImagePath, function (fileName) { return fileName.endsWith('.png') })
      if (!imageFiles || imageFiles.length === 0) {
        toastLog('图片数据不存在，无法执行')
        postMessageToWebView({ callbackId: callbackId, data: { success: false, path: testBallImagePath } })
        return
      }
      let index = data.fileIndex || 0
      let targetFilePath = testBallImagePath + imageFiles[index % imageFiles.length]
      postMessageToWebView({
        callbackId: callbackId,
        data: {
          success: true,
          filePath: targetFilePath
        }
      })
    } else {
      console.error('图片路径不存在：', testBallImagePath)
    }
  },
  doDetectBalls: (data, callbackId) => {
    threads.start(function () {
      // if (files.exists(testBallImagePath)) {
      let targetFilePath = data.filePath
      let imageInfo = images.read(targetFilePath)
      if (!imageInfo) {
        toastLog('读取图片失败，path: ' + targetFilePath)
        postMessageToWebView({ callbackId: callbackId, data: { success: false, path: targetFilePath } })
        return
      }
      // let SCALE_RATE = imageInfo.width / 1080
      let SCALE_RATE = (() => {
        let width = imageInfo.width
        if (width >= 1440) {
          return 1440 / 1080
        } else if (width < 1000) {
          return 720 / 1080
        } else {
          return 1
        }
      })()
      let cvt = (v) => parseInt(v * SCALE_RATE)
      let grayImageInfo = images.grayscale(images.medianBlur(imageInfo, 5))
      let findBalls = images.findCircles(
        grayImageInfo,
        {
          param1: config.hough_param1 || 30,
          param2: config.hough_param2 || 30,
          minRadius: config.hough_min_radius || cvt(65),
          maxRadius: config.hough_max_radius || cvt(75),
          minDst: config.hough_min_dst || cvt(100),
          // region: detectRegion
        }
      )
      console.verbose('找到的球: ' + JSON.stringify(findBalls))
      let ballInfos = []
      let clickableBalls = []
      let invalidBalls = []
      scanner.detectCollectableBalls(rgbImg, findBalls, points => clickableBalls = points,
        ball => {
          invalidBalls.push(ball)
          console.verbose('添加无效球：' + JSON.stringify(ball))
        })
      postMessageToWebView({
        callbackId: callbackId,
        data: {
          success: true,
          path: testBallImagePath,
          size: {
            width: imageInfo.width,
            height: imageInfo.height
          },
          ballInfos: invalidBalls.concat(clickableBalls),
          originImageData: BASE64_PREFIX + images.toBase64(imageInfo)
        }
      })
      // } else {
      //   toastLog('图片数据不存在，无法执行')
      //   postMessageToWebView({ callbackId: callbackId, data: { success: false } })
      // }
    })
  },
}
let handlerBuilder = () => bridgeHandler
postMessageToWebView = prepareWebView(ui.webview, {
  enable_log: true,
  indexFilePath: indexFilePath,
  mainScriptPath: mainScriptPath,
  bridgeHandler: handlerBuilder
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