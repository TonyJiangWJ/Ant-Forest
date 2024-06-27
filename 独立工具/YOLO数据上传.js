
try {
  importPackage(Packages["okhttp3"])
} catch (e) {
  //
}
try {
  importClass(java.util.concurrent.TimeUnit)
  importClass("okhttp3.MediaType")
  importClass("okhttp3.MultipartBody")
  importClass("okhttp3.OkHttpClient")
  importClass("okhttp3.FormBody")
  importClass("okhttp3.Request")
  importClass("okhttp3.RequestBody")
} catch (e) {
  //
}
let aesUtil = require('../lib/AesUtil.js')
let deviceId = aesUtil.md5(device.getAndroidId() + 'forest_salt').toString()
let dataPath = files.path('../resources/trainData')
console.show()
let dataUploader = new DataUploader()
dataUploader.getDirectIp()
dataUploader.validDirectIp()

let rootFilePath = files.listDir(dataPath, (file) => {
  console.log('find file: ' + file)
  return files.isDir(files.join(dataPath, file))
})

console.log('dir list:' + JSON.stringify(rootFilePath))
let allUploadFiles = []
rootFilePath.forEach((dir) => {
  uploadSubFileInDir(files.join(dataPath, dir), dir)
})

if (allUploadFiles.length > 0) {
  let total = allUploadFiles.length
  let done = 0, failed = 0
  allUploadFiles.forEach((file) => {
    if (!dataUploader.upload(file.file, file.subPath, deviceId)) {
      failed++
    }
    done++
    console.log('上传进度：' + (done / total * 100).toFixed(2) + '% 失败总数：' + failed)
  })
} else {
  console.log('当前无待上传数据')
}

console.log('上传结束')


function uploadSubFileInDir (filePath, subPath) {
  files.listDir(filePath, file => {
    let subFile = files.join(filePath, file)
    if (files.isDir(subFile)) {
      uploadSubFileInDir(files.join(filePath, file), subPath + '/' + file)
    } else {
      if (file.endsWith('.uploaded')) {
        return false
      }
      let uploadedFile = subFile + '.uploaded'
      if (files.exists(uploadedFile)) {
        return false
      }
      allUploadFiles.push({ file: subFile, subPath: subPath })
    }
    return true
  })
}

function removeUploadedFiles (filePath) {
  files.listDir(filePath, file => {
    let subFile = files.join(filePath, file)
    if (files.isDir(subFile)) {
      removeUploadedFiles(subFile)
    } else {
      if (file.endsWith('.uploaded')) {
        return false
      }
      let uploadedFile = subFile + '.uploaded'
      if (files.exists(uploadedFile)) {
        files.remove(subFile)
        files.remove(uploadedFile)
      }
    }
    return true
  })

}


function DataUploader () {
  this.directIp = null

  this.getDirectIp = function () {
    let okHttpClient = new OkHttpClient()
    console.log('准备获取直连ip')
    let request = new Request.Builder().url('https://tonyjiang.hatimi.top/device-info/direct-ip?deviceId=' + deviceId).build()
    let response = null
    try {
      response = okHttpClient.newCall(request).execute()
      if (response != null && response.isSuccessful() && response.body() != null) {
        let resultString = response.body().string()
        let resultJson = JSON.parse(resultString)
        if (resultJson.code == '1000') {
          this.directIp = resultJson.data
          console.log('获取直连ip成功')
        } else {
          console.log('获取直连ip失败')
        }
      }
    } catch (e) {
      console.error('请求异常', e)
    } finally {
      if (response != null) {
        response.close()
      }
    }
  }

  this.validDirectIp = function () {
    if (this.directIp == null) {
      return
    }
    let okHttpClient = new OkHttpClient.Builder()
      .connectTimeout(5, TimeUnit.SECONDS) // 设置连接超时时间为5秒
      .readTimeout(5, TimeUnit.SECONDS)     // 设置读取超时时间为5秒
      .writeTimeout(5, TimeUnit.SECONDS)    // 设置写入超时时间为5秒
      .build();
    let request = new Request.Builder().url('http://' + this.directIp + '/device-info/direct-ip?deviceId=' + deviceId).build()
    let response = null
    try {
      response = okHttpClient.newCall(request).execute()
      if (!(response != null && response.isSuccessful() && response.body() != null)) {
        console.error('请求异常，设置直连ip为无效')
        this.directIp = null
      }
    } catch (e) {
      console.error('请求异常 设置直连ip为无效', e)
      this.directIp = null
    } finally {
      if (response != null) {
        response.close()
      }
    }
  }

  this.getHost = function () {
    if (this.directIp != null) {
      return 'http://' + this.directIp
    }
    return 'https://tonyjiang.hatimi.top'
  }

  this.upload = function (file, subPath, deviceId) {
    let uploadedFile = file + '.uploaded'
    if (files.exists(uploadedFile)) {
      return true
    }
    console.log('上传文件：', file, '子目录：', subPath)
    file = new java.io.File(file)
    let response = null
    try {
      let okHttpClient = new OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS) // 设置连接超时时间为10秒
        .readTimeout(120, TimeUnit.SECONDS)     // 设置读取超时时间为120秒
        .writeTimeout(120, TimeUnit.SECONDS)    // 设置写入超时时间为120秒
        .build();
      let formBody = new MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart('deviceId', deviceId)
        .addFormDataPart('subPath', subPath)
        .addFormDataPart("file", file.getName(),
          RequestBody.create(MediaType.parse("application/octet-stream"), file)) // 添加文件

        .build()
      // let request = new Request.Builder().url('https://tonyjiang.hatimi.top/device-info/train-data/upload')
      let request = new Request.Builder().url(this.getHost() + '/device-info/train-data/upload')
        .post(formBody).build()

      response = okHttpClient.newCall(request).execute()
      if (response != null && response.body() != null) {
        let resultString = response.body().string()
        console.verbose('上传结果', resultString)
        let resultJson = JSON.parse(resultString)
        if (resultJson.code == '1000') {
          files.write(uploadedFile, 's')
          return true
        }
      }
    } catch (e) {
      console.error('上传异常', e)
    } finally {
      if (response !== null) {
        response.close()
      }
    }
    return false
  }
}