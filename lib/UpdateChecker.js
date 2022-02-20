let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let fileUtils = singletonRequire('FileUtils')
let logUtils = singletonRequire('LogUtils')
let storageFactory = singletonRequire('StorageFactory')
let UPDATE_STORAGE = "update_info"
let DAILY_UPDATE_CHECK_STORAGE = "daily_update_check"
importPackage(Packages["okhttp3"])
module.exports = (() => {

  function BaseDownloader () {
    let _this = this

    this.doDownload = function () {

      let downloadDialog = dialogs.build({
        title: '更新中...',
        content: '更新中',
        cancelable: false,
        progress: {
          max: 100,
          horizontal: true,
          showMinMax: false
        }
      })
      this.downloadDialog = downloadDialog
      this.downloader.setListener(new DownloaderListener({
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

      dialogs.build({
        title: '是否下载更新',
        content: _this.content,
        cancelable: false,
        neutral: '备份后更新',
        negative: '取消',
        positive: '覆盖更新',

        negativeColor: 'red',
        positiveColor: '#f9a01c',
      })
        .on('negative', () => {
          // exit()
        })
        .on('neutral', () => {
          downloadDialog.show()
          threads.start(function () { _this.downloadingExecutor(true) })
        })
        .on('positive', () => {
          downloadDialog.show()
          threads.start(function () { _this.downloadingExecutor(false) })
        })
        .show()
    }

    this.loadReleaseInfo = () => { }

    this.downloadUpdate = function () {
      this.init()
      this.loadReleaseInfo()
      this.doDownload()
    }
  }

  BaseDownloader.prototype.basePrepareDownloader = function (downloader, targetOutputDir) {
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
    prepareDownloaderForPro(downloader)
    this.downloader = downloader
    let _this = this
    this.downloadingExecutor = function (backup) {
      if (backup) {
        _this.downloader.backup()
        sleep(1000)
      }
      _this.downloader.downloadZip()

      // 覆盖新的dex到lib下
      let copy_result = files.copy(targetOutputDir + '/resources/for_update/download.dex', targetOutputDir + '/lib/download.dex')
      toastLog('复制新的dex文件' + (copy_result ? '成功' : '失败'))
      log('清理过时lib文件')
      let outdate_file_path = targetOutputDir + '/resources/for_update/OutdateFiles.js'
      if (files.exists(outdate_file_path)) {
        _this.downloadDialog.setContent('清理过期文件...')
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
      // 更新后刷新webview缓存
      config.overwrite('clear_webview_cache', true)
      _this.downloadDialog.setContent('更新完成')
      sleep(2000)
      _this.downloadDialog.dismiss()
    }
  }

  BaseDownloader.prototype.init = function () {
    let rootPath = fileUtils.getCurrentWorkPath()
    this.rootPath = rootPath
    let resolver = require(rootPath + '/lib/AutoJSRemoveDexResolver.js')
    resolver()
    let dexPath = rootPath + '/lib/download.dex'
    if (!files.exists(dexPath)) {
      let copy_result = files.copy(rootPath + '/resources/for_update/download.dex', dexPath)
      logUtils.warnInfo(['download.dex文件不存在，重新复制备份文件，执行结果：{}', copy_result ? '成功' : '失败'])
    }
    runtime.loadDex(dexPath)
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
    importClass(com.tony.downloader.GithubHistoryTagDownloader)
    resolver()
    this.basePrepareDownloader(this.prepareDownloader(), this.rootPath)
  }

  function UpdateDownloader (github_latest_url, gitee_relase_url, gitee_package_prefix, gitee_package_url) {
    BaseDownloader.call(this)
    let _this = this
    this.githubReleaseUrl = github_latest_url
    this.giteeReleaseUrl = gitee_relase_url
    this.giteePackagePrefix = gitee_package_prefix
    this.giteePackageUrl = gitee_package_url
    this.chose = 0

    this.prepareDownloader = function () {
      let apiUrl = null
      let downloader = null
      if (this.giteeReleaseUrl) {
        this.chose = dialogs.singleChoice('请选择更新源', ['Github Release(推荐)', 'Gitee Release(备用)'], 0)

        if (this.chose === 0) {
          toastLog('使用Github Release 作为更新源')
          apiUrl = this.githubReleaseUrl
          downloader = new GithubReleaseDownloader()
        } else {
          toastLog('使用Gitee Release 作为更新源')
          apiUrl = this.giteeReleaseUrl
          // 设置包前缀，更新包所在的仓库 
          downloader = new GiteeReleaseDownloader(this.giteePackagePrefix, this.giteePackageUrl)
        }
      } else {
        apiUrl = this.githubReleaseUrl
        downloader = new GithubReleaseDownloader()
      }
      downloader.setTargetReleasesApiUrl(apiUrl)
      return downloader
    }

    this.loadReleaseInfo = function () {

      let loadingDialog = dialogs.build({
        cancelable: false,
        negative: '取消',
        title: '正在从' + (_this.chose == 0 ? 'Github' : 'Gitee') + '获取更新信息',
        content: '加载中，请稍等...'
      })
        .on('negative', () => {
          // exit()
        })
        .show()
      let summary = this.downloader.getUpdateSummary()
      if (summary === null) {
        loadingDialog.setContent('无法获取release版本信息，请多试几次或者切换更新源')
        sleep(1000)
        loadingDialog.dismiss()
        // exit()
      }
      summary = JSON.parse(summary)
      let localVersion = this.downloader.getLocalVersion()
      this.content = '线上版本：' + summary.tagName + '\n'
      this.content += '本地版本：' + (localVersion === null ? '无法获取本地版本信息' : localVersion) + '\n'
      this.content += '更新内容：\n' + summary.body
      loadingDialog.dismiss()
    }
  }

  UpdateDownloader.prototype = Object.create(BaseDownloader.prototype)
  UpdateDownloader.prototype.constructor = UpdateDownloader
  function HistoryDownloader (historyTagUrl) {
    BaseDownloader.call(this)
    this.apiUrl = historyTagUrl
    this.prepareDownloader = function () {
      return new GithubHistoryTagDownloader(this.apiUrl)
    }


    this.loadReleaseInfo = function () {

      let loadingDialog = dialogs.build({
        cancelable: false,
        negative: '取消',
        title: '正在从Github获取更新信息',
        content: '加载中，请稍等...'
      })
        .on('negative', () => {
          exit()
        })
        .show()

      let tagInfosString = this.downloader.getTagInfoList()
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
      }

      let localVersion = this.downloader.getLocalVersion()
      this.content = '本地版本：' + (localVersion === null ? '无法获取本地版本信息' : localVersion) + '\n'
        + '目标版本：' + choseTag.name + '\n'
        + '版本降级之后，如无法正常运行，请手动解压origin.zip之后使用\n\n'
        + '解压地址：' + this.rootPath

      loadingDialog.dismiss()

      this.downloader.setTargetTagInfo(JSON.stringify(choseTag))
    }

  }

  HistoryDownloader.prototype = Object.create(BaseDownloader.prototype)
  HistoryDownloader.prototype.constructor = HistoryDownloader


  return {
    updateChecker: new UpdateChecker(config.github_latest_url),
    updateDownloader: new UpdateDownloader(config.github_latest_url, config.gitee_relase_url, config.gitee_package_prefix, config.gitee_package_url),
    historyDownloader: new HistoryDownloader(config.history_tag_url)
  }
})()

// -----
function UpdateChecker (latestUrl) {
  storageFactory.initFactoryByKey(UPDATE_STORAGE, { latestVersion: '' })
  storageFactory.initFactoryByKey(DAILY_UPDATE_CHECK_STORAGE, { checked: false })
  this.latestUrl = latestUrl
  this.getLocalVersion = function () {
    let mainPath = fileUtils.getCurrentWorkPath()
    let versionFile = files.join(mainPath, 'version.json')
    let projectFile = files.join(mainPath, 'project.json')
    let versionName = ''
    if (files.exists(versionFile)) {
      versionName = JSON.parse(files.read(versionFile)).version
    } else if (files.exists(projectFile)) {
      versionName = JSON.parse(files.read(projectFile)).versionName
    }
    return versionName
  }

  this.requestLatestInfo = function (disablePersonalToken) {
    if (this.latestUrl === '') {
      return null
    }
    let request = new Request.Builder()
      .url(this.latestUrl)
      .get()
    if (config.release_access_token && !disablePersonalToken) {
      request.addHeader('authorization', 'token ' + config.release_access_token)
    }
    request = request.build()
    let response = null
    let result = null
    try {
      let okHttpClient = new OkHttpClient()
      response = okHttpClient.newCall(request).execute()
      if (response != null && response.body() != null) {
        let resultString = response.body().string()
        logUtils.debugInfo('请求结果：' + resultString)
        result = JSON.parse(resultString)
      }
    } catch (e) {
      logUtils.errorInfo('请求更新信息接口异常' + e)
    } finally {
      if (response !== null) {
        response.close()
      }
    }
    return result
  }

  this.getLatestInfo = function () {
    if (!config.auto_check_update) {
      return null
    }
    let dailyCheckStorage = storageFactory.getValueByKey(DAILY_UPDATE_CHECK_STORAGE)
    if (dailyCheckStorage.checked) {
      logUtils.debugInfo(['今日已经检测过版本更新，当前最新版本为：「{}」', dailyCheckStorage.latestVersion])
      return dailyCheckStorage.latestVersion
    }
    if (this.latestUrl === '') {
      return null
    }
    let result = this.requestLatestInfo()
    if (result == null) {
      return null
    } else if ("Bad credentials" == result.message) {
      // 可能access_token挂了，取消验证，但是可能会被限流
      result = this.requestLatestInfo(true)
    }
    if (result.tag_name) {
      storageFactory.updateValueByKey(UPDATE_STORAGE, {
        latestVersion: result.tag_name,
        updateNotes: result.body
      })
      storageFactory.updateValueByKey(DAILY_UPDATE_CHECK_STORAGE, { checked: true, latestVersion: result.tag_name })
      return result.tag_name
    }
    return null
  }

  this.hasNewVersion = function () {
    if (!config.auto_check_update) {
      return null
    }
    let dailyCheckStorage = storageFactory.getValueByKey(DAILY_UPDATE_CHECK_STORAGE)
    if (dailyCheckStorage.checked) {
      if (this.getLocalVersion() < this.getLatestInfo()) {
        return this.getLatestInfo()
      }
    }
    return null
  }
}




// -- support func --
function prepareDownloaderForPro (downloader) {
  let is_pro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
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
        if (arguments.length === 2) {
          let v = JSON.parse(jsonString)[name]
          return v ? v.toString() : ''
        } else {
          let v = origin[arguments[0]]
          return v ? v.toString() : ''
        }
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
        if (arguments.length === 2) {
          let jsonString = arguments[0]
          name = arguments[1]
          let v = JSON.parse(jsonString)[name]
          return v ? v.toString() : ''
        } else {
          let v = origin[name]
          return v ? v.toString() : ''
        }
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
}

