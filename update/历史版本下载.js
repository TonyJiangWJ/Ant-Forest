
let resolver = require('../lib/AutoJSRemoveDexResolver.js')
resolver()
runtime.loadDex('../lib/download.dex')
let FileUtils = require('../lib/prototype/FileUtils.js')
let loadingDialog = null

try {
  importClass(com.tony.listener.DownloaderListener)
} catch (e) {
  let errorInfo = e + ''
  if (/importClass must be called/.test(errorInfo)) {
    toastLog('请强制关闭AutoJS并重新启动')
    exit()
  }
}

importClass(com.tony.listener.DownloaderListener)
importClass(com.tony.downloader.GithubHistoryTagDownloader)
resolver()
let apiUrl = 'https://api.github.com/repos/TonyJiangWJ/Ant-Forest/tags'
let downloader = new GithubHistoryTagDownloader(apiUrl)

let targetOutputDir = FileUtils.getRealMainScriptPath(true) + "/history_version"

downloader.setListener(new DownloaderListener({
  updateGui: function (string) {
    log(string)
  },
  updateError: function (string) {
    console.error(string)
  },
  updateProgress: function (progressInfo) { }
}))
log('下载并解压文件到目录：' + targetOutputDir)
// 设置尝试获取总大小的次数，默认5次，github的content-length偶尔会给 偶尔不会给，主要原因是服务端用了分块传输的缘故
downloader.setTryCount(2)
downloader.setOutputDir(targetOutputDir)
// 设置不需要解压覆盖的文件
// 请勿移除'lib/autojs-tools.dex' 否则引起报错
downloader.setUnzipSkipFiles(['.gitignore', 'lib/autojs-tools.dex', 'lib/download.dex'])
// 设置不需要备份的文件
downloader.setBackupIgnoreFiles([])

loadingDialog = dialogs.build({
  cancelable: false,
  negative: '取消',
  title: '正在从Github获取更新信息',
  content: '加载中，请稍等...'
})
.on('negative', () => {
  exit()
})
.show()

let tagInfosString = downloader.getTagInfoList()
console.log(tagInfosString)
let tagInfoList = JSON.parse(tagInfosString)
let choseTag = null
if (tagInfoList) {
  let chose = dialogs.singleChoice('请选择版本', tagInfoList.map(tagInfo => tagInfo.name), 0)
  choseTag = tagInfoList[chose]
  console.log('选择了下载版本：' + JSON.stringify(choseTag))
  loadingDialog.dismiss()
} else {
  loadingDialog.setContent('无法获取历史更新信息')
  sleep(2000)
  loadingDialog.dismiss()
  exit()
}

let localVersion = downloader.getLocalVersion()
let content = '本地版本：' + (localVersion === null ? '无法获取本地版本信息' : localVersion) + '\n'
  + '目标版本：' + choseTag.name + '\n'
  + '版本降级之后，如无法正常运行，请手动解压origin.zip之后使用\n\n'
  + '解压地址：' + targetOutputDir

loadingDialog.dismiss()

downloader.setTargetTagInfo(JSON.stringify(choseTag))

let downloadDialog = dialogs.build({
  title: '更新中...',
  content: '更新中',
  negative: '取消',
  cancelable: false,
  progress: {
    max: 100,
    horizontal: true,
    showMinMax: false
  }
})
.on('negative', () => {
  exit()
})

downloader.setListener(new DownloaderListener({
  updateGui: function (string) {
    log(string)
    downloadDialog.setContent(string)
  },
  updateError: function (string) {
    console.error(string)
  },
  updateProgress: function (progressInfo) {
    downloadDialog.setProgress(progressInfo.getProgress() * 100)
  }
}))
let downloadingExecutor = function (backup) {
  if (backup) {
    downloader.backup()
    sleep(1000)
  }
  downloader.downloadZip()

  // 覆盖新的dex到lib下
  let copy_result = files.copy(targetOutputDir + '/resources/for_update/download.dex', targetOutputDir + '/lib/download.dex')
  toastLog('复制新的dex文件' + (copy_result ? '成功' : '失败'))
  log('清理过时lib文件')
  let outdate_file_path = targetOutputDir + '/resources/for_update/OutdateFiles.js'
  if (files.exists(outdate_file_path)) {
    downloadDialog.setContent('清理过期文件...')
    let outdateFiles = require(outdate_file_path)
    outdateFiles && outdateFiles.length > 0 && outdateFiles.forEach(fileName => {
      let fullPath = targetOutputDir + '/' + fileName
      if (files.exists(fullPath)) {
        let deleteResult = false
        if (files.isDir(fullPath) && !files.isEmptyDir(fullPath)) {
          deleteResult = files.removeDir(fullPath)
        } else {
          deleteResult = files.remove(fullPath)
        }
        console.verbose('删除过期文件：' + fullPath + ' ' + (deleteResult ? '成功' : '失败'))
      }
    })
  }
  downloadDialog.setContent('下载完成')
  sleep(2000)
  downloadDialog.dismiss()
}
dialogs.build({
  title: '是否下载',
  content: content,
  cancelable: false,
  neutral: '备份后下载',
  negative: '取消',
  positive: '覆盖下载',

  negativeColor: 'red',
  positiveColor: '#f9a01c',
})
  .on('negative', () => {
    exit()
  })
  .on('neutral', () => {
    downloadDialog.show()
    threads.start(function () { downloadingExecutor(true) })
  })
  .on('positive', () => {
    downloadDialog.show()
    threads.start(function () { downloadingExecutor(false) })
  })
  .show()
