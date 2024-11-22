
try {
  importPackage(Packages["okhttp3"])
} catch (e) {
  //
}
try {
  importClass(java.util.concurrent.TimeUnit)
  importClass(java.io.File)
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

let deleteUploaded = false
let executeUpload = false

let lock = threads.lock()
let complete = lock.newCondition()
lock.lock()

threads.start(function () {
  let confirmDialog = dialogs.build({
    title: '上传完毕后是否删除',
    content: '是否将上传成功的文件进行删除',
    positive: '删除',
    positiveColor: '#f9a01c',
    negative: '不删除',
    negativeColor: 'red',
    neutral: '只删除，不上传',
    cancelable: false
  })
    .on('positive', () => {
      lock.lock()
      try {
        complete.signal()
      } finally {
        lock.unlock()
      }
      deleteUploaded = true
      executeUpload = true
      confirmDialog.dismiss()
    })
    .on('negative', () => {
      deleteUploaded = false
      executeUpload = true
      lock.lock()
      try {
        complete.signal()
      } finally {
        lock.unlock()
      }
      confirmDialog.dismiss()
    })
    .on('neutral', () => {
      deleteUploaded = true
      executeUpload = false
      lock.lock()
      try {
        complete.signal()
      } finally {
        lock.unlock()
      }
      confirmDialog.dismiss()
    })
    .show()
})
try {
  complete.await()
} finally {
  lock.unlock()
}

let rootFilePath = files.listDir(dataPath, (file) => {
  console.log('find file: ' + file)
  return files.isDir(files.join(dataPath, file))
})

let dataUploader = new DataUploader()
if (executeUpload) {
  // dataUploader.getDirectIp()
  // dataUploader.validDirectIp()
}
console.log('dir list:' + JSON.stringify(rootFilePath))
let allUploadFiles = []
rootFilePath.forEach((dir) => {
  if (executeUpload) {
    findUploadFileInDir(files.join(dataPath, dir), dir, allUploadFiles)
  }
})

if (allUploadFiles.length > 0) {
  let total = allUploadFiles.length
  let done = 0, failed = 0
  let totalSize = allUploadFiles.map(file => file.length).reduce((a, b) => a += b, 0) / 1024 / 1024
  let startTime = new Date().getTime()
  function formatTime (time) {
    if (time < 120) {
      return time.toFixed(2) + '秒'
    } else if (time > 3600) {
      return Math.ceil(time / 3600) + '小时' + Math.ceil(time % 3600 / 60) + '分' + (time % 60) + '秒'
    } else {
      return Math.ceil(time % 3600 / 60) + '分' + (time % 60).toFixed(0) + '秒'
    }
  }
  allUploadFiles.forEach((file) => {
    if (!dataUploader.upload(file.file, file.subPath, deviceId)) {
      failed++
    }
    done++
    let passTime = (new Date() - startTime) / 1000
    console.log('龟速上传中 耗时：' + formatTime(passTime))
    console.log('预计剩余时间：' + formatTime((total - done) * (passTime / done)))
    console.log('进度：' + done + '/' + total + '(' + (done / total * 100).toFixed(2) + '%) 失败总数：' + failed + ' 总大小：' + totalSize.toFixed(2) + 'MB')
  })
} else {
  console.log('当前无待上传数据')
}

if (deleteUploaded) {
  let removeFileList = []
  rootFilePath.forEach(dir => {
    findRemoveFiles(files.join(dataPath, dir), removeFileList)
  })
  removeUploadedFiles(removeFileList)
  rootFilePath.forEach(dir => {
    // 删除完毕后清除空目录
    removeEmptyDirs(files.join(dataPath, dir))
  })
}
console.log('上传结束')


function findUploadFileInDir (filePath, subPath, allUploadFiles) {
  files.listDir(filePath, file => {
    let subFile = files.join(filePath, file)
    if (files.isDir(subFile)) {
      findUploadFileInDir(files.join(filePath, file), subPath + '/' + file, allUploadFiles)
    } else {
      if (file.endsWith('.uploaded')) {
        return false
      }
      let uploadedFile = subFile + '.uploaded'
      if (files.exists(uploadedFile)) {
        return false
      }
      allUploadFiles.push({ file: subFile, subPath: subPath, length: new File(subFile).length() })
    }
    return true
  })
}

function findRemoveFiles (filePath, removeFileList) {
  files.listDir(filePath, file => {
    let subFile = files.join(filePath, file)
    if (files.isDir(subFile)) {
      findRemoveFiles(subFile, removeFileList)
    } else {
      if (file.endsWith('.uploaded')) {
        removeFileList.push({ path: subFile, length: new File(subFile).length() })
        return false
      }
      let uploadedFile = subFile + '.uploaded'
      if (files.exists(uploadedFile)) {
        removeFileList.push({ path: subFile, length: new File(subFile).length() })
      }
    }
    return true
  })
}

function removeUploadedFiles (fileList) {
  let total = fileList.length
  if (total <= 0) {
    return
  }
  let current = 0
  let totalSize = fileList.map(file => file.length).reduce((a, b) => a += b, 0) / 1024 / 1024
  fileList.forEach(file => {
    let removeFile = file.path
    if (files.exists(removeFile)) {
      console.verbose('删除文件：' + removeFile)
      files.remove(removeFile)
      current++
      if (current % 10 == 0) {
        console.log('删除进度：', (current / total * 100).toFixed(2) + '%' + ' 总大小：' + totalSize.toFixed(2) + 'MB')
      }
    }
  })
  console.log('删除进度：100%')
}

function removeEmptyDirs (filePath) {
  let subFiles = []
  let hasSubDir = false
  files.listDir(filePath, file => {
    let subFile = files.join(filePath, file)
    if (files.isDir(subFile)) {
      hasSubDir = true
      removeEmptyDirs(subFile)
    } else {
      subFiles.push(file)
    }
    return true
  })
  if (subFiles.length == 0 && !hasSubDir) {
    console.verbose('删除空目录：', filePath)
    files.remove(filePath)
  }
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
    return 'https://hatimi.top/yolo/upload'
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