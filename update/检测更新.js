/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-23 22:54:22
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-01 17:39:32
 * @Description: 
 */

runtime.loadDex('../lib/autojs-tools.dex')
let FileUtils = require('../lib/prototype/FileUtils.js')
let loadingDialog = null

importClass(com.tony.Downloader)
importClass(com.tony.DownloaderListener)

let apiUrl = 'https://api.github.com/repos/TonyJiangWJ/Ant-Forest/releases/latest'
let targetOutputDir = FileUtils.getRealMainScriptPath(true)
let downloader = new Downloader()
downloader.setListener(new DownloaderListener({
  updateGui: function (string) {
    log(string)
  },
  updateProgress: function (progressInfo) { }
}))
log('下载并解压文件到目录：' + targetOutputDir)
// 设置尝试获取总大小的次数，默认5次，github的content-length偶尔会给 偶尔不会给，主要原因是服务端用了分块传输的缘故
// downloader.setTryCount(5)
downloader.setTargetReleasesApiUrl(apiUrl)
downloader.setOutputDir(targetOutputDir)
// 设置不需要解压覆盖的文件
// 请勿移除'lib/autojs-tools.dex' 否则引起报错
downloader.setUnzipSkipFiles(['.gitignore', 'lib/autojs-tools.dex'])
// 设置不需要备份的文件
downloader.setBackupIgnoreFiles([])

loadingDialog = dialogs.build({
  title: '正在请求网络',
  content: '加载中，请稍等...'
}).show()
let summary = downloader.getUpdateSummary()
if (summary === null) {
  loadingDialog.setContent('无法获取release版本信息')
  sleep(1000)
  loadingDialog.dismiss()
  exit()
}
summary = JSON.parse(summary)
let localVersion = downloader.getLocalVersion()
let content = '线上版本：' + summary.tagName + '\n'
content += '本地版本：' + (localVersion === null ? '无法获取本地版本信息' : localVersion) + '\n'
content += '更新内容：\n' + summary.body

loadingDialog.dismiss()


let downloadDialog = dialogs.build({
  title: '更新中...',
  content: '更新中',
  progress: {
    max: 100,
    horizontal: true,
    showMinMax: false
  }
})
let setMaxProgress = false
downloader.setListener(new DownloaderListener({
  updateGui: function (string) {
    log(string)
    downloadDialog.setContent(string)
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
  let copy_result = files.copy(targetOutputDir + '/resources/for_update/autojs-tools.dex', targetOutputDir + '/lib/autojs-tools.dex')
  toastLog('复制新的dex文件' + (copy_result ? '成功' : '失败'))
  log('清理过时lib文件')
  downloadDialog.setContent('清理过期文件...')
  let outdateFiles = require(targetOutputDir + '/resources/for_update/OutdateFiles.js')
  outdateFiles && outdateFiles.length > 0 && outdateFiles.forEach(fileName => {
    let fullPath = targetOutputDir + '/' + fileName
    if (files.exists(fullPath)) {
      files.remove(fullPath)
      console.verbose('删除过期文件：' + fullPath)
    }
  })
  let extendMultiTouchPath = targetOutputDir + '/extends/MuiltiTouchCollect.js'
  if (files.exists(extendMultiTouchPath)) {
    let newName = targetOutputDir + '/extends/MultiTouchCollect.js'
    log('重命名已存在的扩展：' + extendMultiTouchPath)
    files.move(extendMultiTouchPath, newName)
  }
  downloadDialog.setContent('更新完成')
  sleep(2000)
  downloadDialog.dismiss()
}
dialogs.build({
  title: '是否下载更新',
  content: content,

  neutral: '备份后更新',
  negative: '取消',
  positive: '覆盖更新',

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
