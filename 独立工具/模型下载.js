let { config } = require('../config.js')(runtime, global)

let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let YoloDetection = singletonRequire('YoloDetectionUtil')

let cancel = false
let failed = false
let downloadDialog = dialogs.build({
  title: '下载模型中...',
  content: '获取文件大小中',
  negative: '取消',
  cancelable: false,
  progress: {
    max: 100,
    horizontal: true,
    showMinMax: false
  }
})
  .on('negative', () => {
    cancel = true
    downloadDialog.dismiss()
  })
downloadDialog.show()

let call = http
  .client()
  .newCall(
    http.buildRequest('https://tonyjiang.hatimi.top/autojs/onnx_model/forest_lite_v2.onnx', {
      method: "GET",
    })
  )
  .execute();


let fs = null
try {
  fs = new java.io.FileOutputStream(files.path("../config_data/forest_lite.onnx.tmp"));
  let buffer = util.java.array("byte", 1024); //byte[]
  let byteSum = 0; //总共读取的文件大小
  let byteRead; //每次读取的byte数
  let is = call.body().byteStream();
  let fileSize = call.body().contentLength();
  toastLog("开始下载, 总大小：" + fileSize)
  let last = 0
  while ((byteRead = is.read(buffer)) != -1 && !cancel) {
    byteSum += byteRead;
    fs.write(buffer, 0, byteRead); //读取
    let progress = (byteSum / fileSize) * 100
    if (progress - last > 1) {
      last = progress
      downloadDialog.setContent('下载进度：' + progress.toFixed(2) + '%')
      downloadDialog.setProgress(progress)
    }
  }
} catch (e) {
  failed = true
  toastLog('文件下载异常：' + e)
  downloadDialog.setContent('下载异常')
} finally {
  if (fs != null) {
    fs.flush()
    fs.close()
  }
}
if (!failed && !cancel) {
  toastLog("下载完成");
  downloadDialog.setContent('下载完成')
  let labelList = YoloDetection.checkYoloModelValid(files.path("../config_data/forest_lite.onnx.tmp"))
  if (!labelList) {
    toastLog('模型格式不正确，请检查日志 或者手动下载')
  } else {
    if (!YoloDetection.validLabels(labelList)) {
      toastLog('模型标签不匹配，请检查日志')
    }
    files.move(files.path("../config_data/forest_lite.onnx.tmp"), files.path("../config_data/forest_lite.onnx"))
  }
}
sleep(1000)
downloadDialog.dismiss()