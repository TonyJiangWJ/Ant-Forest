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
let { storage_name: _storage_name } = require('../config.js')(runtime, global)
module.exports = function (currentVersion) {
  if (touchedRecently(currentVersion)) {
    return
  }
  let deviceId = aesUtil.md5(device.getAndroidId() + 'forest_salt').toString()
  console.verbose('上报当前版本：', currentVersion, 'deviceId(md5):', deviceId)

  threads.start(function () {
    let response = null
    try {
      let okHttpClient = new OkHttpClient()
      let formBody = new FormBody.Builder()
        .add('currentVersion', currentVersion)
        .add('deviceId', deviceId).build()
      let request = new Request.Builder().url('https://tonyjiang.hatimi.top/device-info/touch').post(formBody).build()

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

function touchedRecently(version) {
  let touchStorage = storages.create(_storage_name + "_th")
  let storeStamp = touchStorage.get(version, 0)
  if (new Date().getTime() - storeStamp > 60000) {
    touchStorage.put(version, new Date().getTime())
    return false
  }
  console.verbose('一分钟内已请求过，跳过上报')
  return true
}