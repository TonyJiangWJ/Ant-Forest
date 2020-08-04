/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-23 22:54:22
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-04 20:28:06
 * @Description: 
 */
let resolver = require('../lib/AutoJSRemoveDexResolver.js')
resolver()
runtime.loadDex('../lib/download.dex')
let FileUtils = require('../lib/prototype/FileUtils.js')
let loadingDialog = null
let is_pro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
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
importClass(com.tony.resolver.JSONResolver)
importClass(com.tony.downloader.GithubReleaseDownloader)
importClass(com.tony.downloader.GiteeReleaseDownloader)
resolver()
let chose = dialogs.singleChoice('请选择更新源', ['Github Release(推荐)', 'Gitee Release(备用)'], 0)

let apiUrl = null
let downloader = null
if (chose === 0) {
  toastLog('使用Github Release 作为更新源')
  apiUrl = 'https://api.github.com/repos/TonyJiangWJ/Ant-Forest/releases/latest'
  downloader = new GithubReleaseDownloader()
} else {
  toastLog('使用Gitee Release 作为更新源')
  apiUrl = 'https://gitee.com/api/v5/repos/TonyJiangWJ/Ant-Forest/releases/latest'
  // 设置包前缀，更新包所在的仓库 
  downloader = new GiteeReleaseDownloader('Ant-Forest-', 'https://gitee.com/TonyJiangWJ/for-ant-update/raw/master/')
}
if (is_pro) {
  let origin = {}
  let new_object = {}
  downloader.setJsonResolver(new JSONResolver({
    /**
     * 将对象转换成 JSON字符串
     *
     * @param obj
     * @return jsonString
     */
    toJSONString (obj) {
      return JSON.stringify(obj)
    },

    /**
     * 根据json字符串获取 指定json key内容 并转为String
     *
     * @param jsonString
     * @param name       key
     * @return
     */
    getString: function (jsonString, name) {
      let v = JSON.parse(jsonString)[name]
      return v ? v.toString() : ''
    },

    /**
     * 可以嵌套调用 获取对象，不转为String
     *
     * @param jsonString
     * @param name
     * @return
     */
    getObject (jsonString, name) {
      return JSON.parse(jsonString)[name]
    },

    //---------------

    /**
     * 设置原始JSONString
     *
     * @param jsonString
     * @return
     */
    setOrigin: function (jsonString) {
      origin = JSON.parse(jsonString)
      return this
    },

    getString: function (name) {
      let v = origin[name]
      return v ? v.toString() : ''
    },

    getObject: function (name) {
      return origin[name]
    },

    //---------------

    /**
     * 创建新的封装 内部new一个Map 创建JSON对象
     *
     * @return
     */
    newObject: function () {
      new_object = {}
      return this
    },
    put: function (name, value) {
      new_object[name] = value
      return this
    },

    /**
     * 将创建的JSON对象转换成字符串
     *
     * @return
     */
    toJSONString: function () {
      return JSON.stringify(new_object)
    }
  })
  )
}

let targetOutputDir = FileUtils.getRealMainScriptPath(true)

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
downloader.setTargetReleasesApiUrl(apiUrl)
downloader.setOutputDir(targetOutputDir)
// 设置不需要解压覆盖的文件
// 请勿移除'lib/autojs-tools.dex' 否则引起报错
downloader.setUnzipSkipFiles(['.gitignore', 'lib/autojs-tools.dex', 'lib/download.dex'])
// 设置不需要备份的文件
downloader.setBackupIgnoreFiles([])

loadingDialog = dialogs.build({
  cancelable: false,
  negative: '取消',
  title: '正在从' + (chose == 0 ? 'Github' : 'Gitee') + '获取更新信息',
  content: '加载中，请稍等...'
})
  .on('negative', () => {
    exit()
  })
  .show()
let summary = downloader.getUpdateSummary()
if (summary === null) {
  loadingDialog.setContent('无法获取release版本信息，请多试几次或者切换更新源')
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
  cancelable: false,
  negative: '取消',
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
  cancelable: false,
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
