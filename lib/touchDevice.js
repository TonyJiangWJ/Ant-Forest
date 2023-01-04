try {
  importPackage(Packages["okhttp3"])
} catch (e) {
  //
}
try {
  importClass("okhttp3.OkHttpClient")
  importClass("okhttp3.FormBody")
  importClass("okhttp3.Request")
} catch (e) {
  //
}
let aesUtil = require('./AesUtil.js')
module.exports = function (currentVersion) {
  let deviceId = aesUtil.md5(device.getAndroidId() + 'forest_salt').toString()
  console.verbose('上报当前版本：', currentVersion, 'deviceId(md5):', deviceId)

  threads.start(function () {
    let response = null
    try {
      let okHttpClient = new OkHttpClient()
      let formBody = new FormBody.Builder()
        .add('currentVersion', currentVersion)
        .add('deviceId', deviceId).build()
      let request = new Request.Builder().url('http://tonyjiangwj.natapp1.cc/device-info/touch').post(formBody).build()

      response = okHttpClient.newCall(request).execute()
      if (response != null && response.body() != null) {
        let resultString = response.body().string()
        console.verbose('上报结果', resultString)
      }
    } catch (e) {
      console.error('上报版本异常', e)
    } finally {
      if (response !== null) {
        response.close()
      }
    }
  })
}