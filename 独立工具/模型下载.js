importClass(com.tony.autojs.common.OkHttpDownloader)
let { config } = require('../config.js')(runtime, global)


let downloadDialog = dialogs.build({
  title: '下载模型中...',
  content: '获取文件大小中',
  cancelable: false,
  progress: {
    max: 100,
    horizontal: true,
    showMinMax: false
  }
})
downloadDialog.show()

let call = http
  .client()
  .newCall(
    http.buildRequest(config.yolo_onnx_model_url, {
      method: "GET",
    })
  )
  .execute();


let fs = null
let failed = false
try {
  fs = new java.io.FileOutputStream(files.path("../config_data/forest_lite.onnx"));
  let buffer = util.java.array("byte", 1024); //byte[]
  let byteSum = 0; //总共读取的文件大小
  let byteRead; //每次读取的byte数
  let is = call.body().byteStream();
  let fileSize = call.body().contentLength();
  toastLog("开始下载, 总大小：" + fileSize);
  let last = 0
  while ((byteRead = is.read(buffer)) != -1) {
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
if (!failed) {
  toastLog("下载完成");
  downloadDialog.setContent('下载完成')
  config.detect_ball_by_yolo = true
  let yoloDetection = require('../lib/prototype/YoloDetectionUtil.js')
  yoloDetection.validLabels()
}
sleep(1000)
downloadDialog.dismiss()