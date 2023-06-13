let { config, default_config, storage_name, securityFields } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')
let myEngines = singletonRequire('MyEngines')
let timers = singletonRequire('Timers')
let { updateDownloader } = require('./UpdateChecker')
let AesUtil = require('./AesUtil.js')
let ProcessShare = singletonRequire('ProcessShare')
let ProjectBridgeHandler = require('./ProjectBridgeHandler.js')

module.exports = (postMessageToWebView) => {
  let rootPath = FileUtils.getCurrentWorkPath()
  let storageConfig = storages.create(storage_name)
  let local_config_path = files.cwd() + '/local_config.cfg'
  let runtime_store_path = files.cwd() + '/runtime_store.cfg'
  let aesKey = device.getAndroidId()
  let bridgeHandler = {
    toast: data => {
      toast(data.message)
    },
    toastLog: data => {
      toastLog(data.message)
    },
    loadConfigs: (data, callbackId) => {
      postMessageToWebView({ callbackId: callbackId, data: config })
    },
    saveConfigs: data => {
      let newVal = undefined
      let changedConfig = {}
      let changed = false
      Object.keys(data).forEach(key => {
        newVal = data[key]
        if (typeof config[key] !== 'undefined' && typeof newVal !== 'undefined' && newVal !== config[key]) {
          config[key] = newVal
          changed = true
          if (securityFields.indexOf(key) > -1) {
            try {
              if (typeof newVal === 'object') {
                newVal = JSON.stringify(newVal)
              }
              newVal = AesUtil.encrypt(newVal, aesKey)
              console.log('加密key', key, '结果', newVal)
            } catch (e) {
              console.error('加密失败' + e)
            }
          }
          changedConfig[key] = newVal
          config.overwrite(key, newVal)
        }
      })
      changed && sendConfigChangedBroadcast(changedConfig)
    },
    saveExtendConfigs: data => {
      // 针对旧版本AutoJS兼容
      let { configs, prepend } = data
      Object.keys(configs).forEach(key => {
        config.overwrite(prepend + '.' + key, configs[key])
      })
    },
    // 加载已安装的应用
    loadInstalledPackages: (data, callbackId) => {
      let pm = context.getPackageManager()
      // Return a List of all packages that are installed on the device.
      let packages = pm.getInstalledPackages(0)
      let installedPackage = []
      for (let i = 0; i < packages.size(); i++) {
        let packageInfo = packages.get(i)
        // 判断系统/非系统应用
        if ((packageInfo.applicationInfo.flags & android.content.pm.ApplicationInfo.FLAG_SYSTEM) == 0) {
          // 非系统应用
          let appInfo = pm.getApplicationInfo(packageInfo.packageName, android.content.pm.PackageManager.GET_META_DATA)
          let appName = appInfo.loadLabel(pm) + ""
          installedPackage.push({ packageName: packageInfo.packageName, appName: appName })
        } else {
          // 系统应用
          // console.verbose("system packageInfo: " + packageInfo.packageName)
        }
      }
      postMessageToWebView({ callbackId: callbackId, data: installedPackage })
    },
    // 重置配置为默认
    resetConfigs: (data, callbackId) => {
      ui.run(function () {
        confirm('确定要将所有配置重置为默认值吗？').then(ok => {
          if (ok) {
            Object.keys(default_config).forEach(key => {
              let defaultValue = default_config[key]
              config.overwrite(key, defaultValue)
            })
            toastLog('重置默认值')
            sendConfigChangedBroadcast(config)
            postMessageToWebView({ callbackId: callbackId, data: { success: true } })
          }
        })
      })
    },
    resetPageConfigs: (data, callbackId) => {
      ui.run(function () {
        confirm('确定重置当前页配置为默认值吗？').then(ok => {
          if (ok) {
            let prepend = data.prepend
            let current_default = default_config
            if (prepend) {
              current_default = default_config[prepend + '_config']
            }
            data.resetFields.forEach(key => {
              let defaultValue = current_default[key]
              if (typeof defaultValue != 'undefined') {
                config.overwrite(prepend ? prepend + '.' + key : key, defaultValue)
              }
            })
            toastLog('重置默认值')
            sendConfigChangedBroadcast(config)
            postMessageToWebView({ callbackId: callbackId, data: { success: true } })
          }
        })
      })
    },
    exportConfigs: () => {
      ui.run(function () {
        confirm('确定要将配置导出到local_config.cfg吗？此操作会覆盖已有的local_config数据').then(ok => {
          if (ok) {
            doAsyncOperationWithDialog('导出', () => {
              Object.keys(default_config).forEach(key => {
                console.verbose(key + ': ' + JSON.stringify(config[key]))
              })
              let configString = AesUtil.encrypt(JSON.stringify(config), aesKey)
              files.write(local_config_path, configString)
              return true
            },
              '配置信息导出成功，刷新目录即可，local_config.cfg内容已加密仅本机可用，除非告知秘钥')
          }
        })
      })
    },
    restoreConfigs: () => {
      ui.run(function () {
        confirm('确定要从local_config.cfg中读取配置吗？').then(ok => {
          if (ok) {
            doAsyncOperationWithDialog('导入', (dialog) => {
              if (files.exists(local_config_path)) {
                let configStr = AesUtil.decrypt(files.read(local_config_path), aesKey)
                if (!configStr) {
                  toastLog('local_config.cfg解密失败, 请尝试输入秘钥')
                  let key = rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                  if (key) {
                    key = key.trim()
                    configStr = AesUtil.decrypt(files.read(local_config_path), key)
                    if (configStr) {
                      refillConfigs(configStr)
                      return true
                    } else {
                      toastLog('秘钥不正确，无法解析')
                      dialog.setContent('秘钥不正确，无法解析')
                    }
                  }
                } else {
                  refillConfigs(configStr)
                  return true
                }
              } else {
                toastLog('local_config.cfg不存在无法导入')
                dialog.setContent('local_config.cfg不存在无法导入')
              }
              // ...
              function refillConfigs (configStr) {
                let local_config = JSON.parse(configStr)
                Object.keys(default_config).forEach(key => {
                  let currentValue = local_config[key]
                  if (key.endsWith('_config')) {
                    let prepend = key.replace('_config', '')
                    let defaultExtendConfig = default_config[key]
                    if (defaultExtendConfig) {
                      Object.keys(defaultExtendConfig).forEach(extKey => {
                        let extendValue = currentValue[extKey]
                        if (typeof extendValue === 'undefined') {
                          extendValue = defaultExtendConfig[extKey]
                        }
                        config.overwrite(prepend + '.' + extKey, extendValue)
                      })
                    }
                    return
                  }
                  if (typeof currentValue !== 'undefined') {
                    currentValue = default_config[key]
                  }
                  config.overwrite(key, currentValue)
                })
                // 触发页面重载
                toastLog('重新导入配置成功')
              }
            }, '执行完毕')
          }
        })
      })
    },
    exportRuntimeStorage: function () {
      ui.run(function () {
        confirm('确定要将运行时数据导出到runtime_store.cfg吗？此操作会覆盖已有的数据').then(ok => {
          if (ok) {
            doAsyncOperationWithDialog('导出运行时数据', () => {
              let runtimeStorageStr = AesUtil.encrypt(commonFunctions.exportRuntimeStorage(), aesKey)
              files.write(runtime_store_path, runtimeStorageStr)
              return true
            }, '导出完成')
          }
        })
      })
    },
    restoreRuntimeStorage: function () {
      ui.run(function () {
        confirm('确定要将从runtime_store.cfg导入运行时数据吗？此操作会覆盖已有的数据').then(ok => {
          if (ok) {
            doAsyncOperationWithDialog('导入运行时数据', (dialog) => {
              if (files.exists(runtime_store_path)) {
                let encrypt_content = files.read(runtime_store_path)
                try {
                  let decrypt = AesUtil.decrypt(encrypt_content, aesKey)
                  if (!decrypt) {
                    toastLog('runtime_store.cfg解密失败, 请尝试输入秘钥')
                    let key = rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                    if (key) {
                      key = key.trim()
                      decrypt = AesUtil.decrypt(encrypt_content, key)
                      if (decrypt) {
                        resetRuntimeStore(decrypt)
                        return true
                      } else {
                        toastLog('秘钥不正确，无法解析')
                        dialog.setContent('秘钥不正确，无法解析')
                      }
                    }
                  } else {
                    resetRuntimeStore(decrypt)
                    return true
                  }
                } catch (e) {
                  toastLog(e)
                  dialog.setContent(e + '')
                }
              } else {
                toastLog('配置信息不存在，无法导入')
                dialog.setContent('配置信息不存在，无法导入')
              }
              // ...
              function resetRuntimeStore (runtimeStorageStr) {
                if (commonFunctions.importRuntimeStorage(runtimeStorageStr)) {
                  toastLog('导入运行配置成功')
                  return true
                }
                toastLog('导入运行配置失败，无法读取正确信息')
                return false
              }
            }, '执行完毕')
          }
        })
      })
    },
    downloadUpdate: () => {
      threads.start(function () {
        updateDownloader.downloadUpdate()
      })
    },
    hasAdbPermission: (data, callbackId) => {
      postMessageToWebView({ callbackId: callbackId, data: { hasPermission: commonFunctions.hasAdbPermission() } })
    },
    getLocalVersion: (data, callbackId) => {
      let mainPath = FileUtils.getCurrentWorkPath()
      let versionFile = files.join(mainPath, 'version.json')
      let projectFile = files.join(mainPath, 'project.json')
      let versionName = ''
      if (files.exists(versionFile)) {
        versionName = JSON.parse(files.read(versionFile)).version
      } else if (files.exists(projectFile)) {
        versionName = JSON.parse(files.read(projectFile)).versionName
      }
      postMessageToWebView({ callbackId: callbackId, data: { versionName: versionName } })
    },
    openUrl: (data, callbackId) => {
      app.openUrl(data.url)
    },
    showLogs: () => {
      ui.run(function () {
        myEngines.execScriptFile(FileUtils.getCurrentWorkPath() + '/查看日志.js', { path: FileUtils.getCurrentWorkPath() })
      })
    },
    openGrayDetector: () => {
      ui.run(function () {
        engines.execScriptFile(FileUtils.getCurrentWorkPath() + '/独立工具/灰度取色.js', { path: FileUtils.getCurrentWorkPath() + '/独立工具/' })
      })
    },
    getEnabledServices: (data, callbackId) => {
      postMessageToWebView({ callbackId: callbackId, data: { enabledServices: commonFunctions.getEnabledAccessibilityServices() } })
    },
    copyText: data => {
      setClip(data.text)
      toast('内容已经复制到剪切板')
    },
    doAuthADB: () => {
      if (!commonFunctions.hasAdbPermission()) {
        toastLog('无ADB授权 无法执行')
        return
      }
      ui.run(function () {
        engines.execScriptFile(FileUtils.getCurrentWorkPath() + '/unit/授权无障碍权限.js', { path: FileUtils.getCurrentWorkPath() + '/unit/' })
      })
    },
    openConsole: () => {
      app.startActivity('console')
    },
    // 测试回调
    callback: (data, callbackId) => {
      log('callback param:' + JSON.stringify(data))
      postMessageToWebView({ callbackId: callbackId, data: { message: 'hello,' + callbackId } })
    },
    executeTargetScript: (path) => {
      executeScript(path)
    },
    queryTargetTimedTaskInfo: (data, callbackId) => {
      postMessageToWebView({ callbackId: callbackId, data: queryTargetTimedTaskInfo(rootPath + data.path) })
    },
    listLogFiles: (data, callbackId) => {
      let logFileMatcher = new RegExp(data.logFileMatcher || /\.(log|txt)(\.\d+)?$/)
      let fileResult = FileUtils.listDirs(data.filePath || rootPath + '/logs', (file) => {
        return file.isDirectory() || logFileMatcher.test(file.getName())
      })
      console.verbose('加载文件列表：' + JSON.stringify(fileResult))
      postMessageToWebView({ callbackId: callbackId, data: { fileResult: fileResult, currentPath: data.filePath } })
    },
    loadFileContent: (data, callbackId) => {
      if (data.filePath && files.exists(data.filePath)) {
        console.verbose('加载文件内容：' + data.filePath)
        let fileContent = files.read(data.filePath)
        postMessageToWebView({ callbackId: callbackId, data: { fileContent: fileContent } })
      }
    }
  }
  return ProjectBridgeHandler(bridgeHandler)


  function executeScript (subPath) {
    // 不在ui线程启动的话会丢失线程上下文，导致执行异常
    ui.run(function () {
      let source = rootPath + subPath
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
    })
  }


  function queryTargetTimedTaskInfo (targetScriptPath) {
    console.log('查找目标：' + targetScriptPath)
    let resultList = timers.queryTimedTasks({ path: targetScriptPath })
    console.log('result: ' + JSON.stringify(resultList))
    if (resultList && resultList.length > 0) {
      return resultList.map(task => {
        let desc = checkAll(task.getTimeFlag())
        let time = format(Math.floor(task.getMillis() / 3600000)) + ':' + format(task.getMillis() % 3600000 / 60000)
        if (0x0 == task.getTimeFlag()) {
          time = new java.text.SimpleDateFormat('yyyy-MM-dd HH:mm:ss').format(new java.util.Date(task.getMillis()))
        }
        return desc + ' ' + time
      }).join(';')
    }
    return ''
  }

  function format (val) {
    if (val.length < 2) {
      return '0' + val
    }
    return val
  }

  function checkAll (timeFlag) {

    let flagMap = {
      '_0': { code: 'FLAG_DISPOSABLE', desc: '执行一次' },
      '1': { code: 'FLAG_SUNDAY', desc: '每周日' },
      '2': { code: 'FLAG_MONDAY', desc: '每周日一' },
      '4': { code: 'FLAG_TUESDAY', desc: '每周二' },
      '8': { code: 'FLAG_WEDNESDAY', desc: '每周三' },
      '16': { code: 'FLAG_THURSDAY', desc: '每周四' },
      '32': { code: 'FLAG_FRIDAY', desc: '每周五' },
      '64': { code: 'FLAG_SATURDAY', desc: '每周六' },
      '_127': { code: 'FLAG_EVERYDAY', desc: '每天' }
    }
    let result = []
    if (0x0 === timeFlag || 0x7F === timeFlag) {
      timeFlag = '_' + timeFlag
      result = [flagMap[timeFlag]]
    } else {
      result.push(flagMap[0x01 & timeFlag])
      result.push(flagMap[0x02 & timeFlag])
      result.push(flagMap[0x04 & timeFlag])
      result.push(flagMap[0x08 & timeFlag])
      result.push(flagMap[0x10 & timeFlag])
      result.push(flagMap[0x20 & timeFlag])
      result.push(flagMap[0x40 & timeFlag])
    }
    result = result.filter(v => typeof v !== 'undefined').map(v => v.desc).join(',')
    if (/(每(\S+,)){2,}/.test(result)) {
      result = '每' + result.replace(/每/g, '')
    }
    return result
  }

  // 内部方法
  function sendConfigChangedBroadcast (changedConfig) {
    console.verbose(engines.myEngine().id + ' 发送广播 通知配置变更')
    ProcessShare
      // 设置缓冲区大小为2MB
      .setBufferSize(2048 * 1024)
      .postInfo(JSON.stringify(changedConfig), '.configShare')
  }

  function doAsyncOperationWithDialog (desc, operation, operateSuccessContent) {
    let executingDialog = dialogs.build({
      title: desc + '执行中',
      content: '请稍等',
      cancelable: false,
    })
    let executing = true
    threads.start(function () {
      let count = 1
      while (executing) {
        executingDialog.setTitle(desc + '执行中' + (new Array(count++ % 4 + 1).join('.')))
        sleep(1000)
      }
    })
    threads.start(function () {
      executingDialog.show()
      try {
        if (operation(executingDialog)) {
          executingDialog.setContent(operateSuccessContent)
        }
        executing = false
        sleep(1000)
        executingDialog.dismiss()
      } catch (e) {
        toastLog(e)
        executingDialog.setContent(desc + '异常:' + e)
        executing = false
        sleep(1000)
        executingDialog.dismiss()
      }
    })

  }
}
