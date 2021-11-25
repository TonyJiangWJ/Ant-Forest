let { config, default_config, storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')
let { updateDownloader } = require('./UpdateChecker')
let AesUtil = require('./AesUtil.js')

module.exports = (postMessageToWebView) => {
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
      Object.keys(data).forEach(key => {
        newVal = data[key]
        if (typeof newVal !== 'undefined') {
          storageConfig.put(key, newVal)
          config[key] = newVal
        }
      })
      sendConfigChangedBroadcast(data)
    },
    showRealtimeVisualConfig: () => {
      // 不在ui线程启动的话会丢失线程上下文，导致执行异常
      ui.run(function () {
        let source = FileUtils.getCurrentWorkPath() + '/test/全局悬浮窗显示-配置信息.js'
        engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
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
              config[key] = defaultValue
              storageConfig.put(key, defaultValue)
            })
            toastLog('重置默认值')
            postMessageToWebView({ functionName: 'reloadBasicConfigs' })
            postMessageToWebView({ functionName: 'reloadAdvanceConfigs' })
            postMessageToWebView({ functionName: 'reloadWidgetConfigs' })
          }
        })
      })
    },
    exportConfigs: () => {
      // 触发重载配置，异步操作 但是应该很快
      postMessageToWebView({ functionName: 'saveBasicConfigs' })
      postMessageToWebView({ functionName: 'saveAdvanceConfigs' })
      postMessageToWebView({ functionName: 'saveWidgetConfigs' })
      ui.run(function () {
        confirm('确定要将配置导出到local_config.cfg吗？此操作会覆盖已有的local_config数据').then(ok => {
          if (ok) {
            Object.keys(default_config).forEach(key => {
              console.verbose(key + ': ' + config[key])
            })
            try {
              let configString = AesUtil.encrypt(JSON.stringify(config), aesKey)
              files.write(local_config_path, configString)
              toastLog('配置信息导出成功，刷新目录即可，local_config.cfg内容已加密仅本机可用，除非告知秘钥')
            } catch (e) {
              toastLog(e)
            }

          }
        })
      })
    },
    restoreConfigs: () => {
      ui.run(function () {
        confirm('确定要从local_config.cfg中读取配置吗？').then(ok => {
          if (ok) {
            try {
              if (files.exists(local_config_path)) {
                let refillConfigs = function (configStr) {
                  let local_config = JSON.parse(configStr)
                  Object.keys(default_config).forEach(key => {
                    let defaultValue = local_config[key]
                    if (typeof defaultValue === 'undefined') {
                      defaultValue = default_config[key]
                    }
                    config[key] = defaultValue
                    storageConfig.put(key, defaultValue)
                  })
                  // 触发页面重载
                  postMessageToWebView({ functionName: 'reloadBasicConfigs' })
                  postMessageToWebView({ functionName: 'reloadAdvanceConfigs' })
                  postMessageToWebView({ functionName: 'reloadWidgetConfigs' })
                  toastLog('重新导入配置成功')
                }
                let configStr = AesUtil.decrypt(files.read(local_config_path), aesKey)
                if (!configStr) {
                  toastLog('local_config.cfg解密失败, 请尝试输入秘钥')
                  dialogs.rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                    .then(key => {
                      if (key) {
                        key = key.trim()
                        configStr = AesUtil.decrypt(files.read(local_config_path), key)
                        if (configStr) {
                          refillConfigs(configStr)
                        } else {
                          toastLog('秘钥不正确，无法解析')
                        }
                      }
                    })
                } else {
                  refillConfigs(configStr)
                }
              } else {
                toastLog('local_config.cfg不存在无法导入')
              }
            } catch (e) {
              toastLog(e)
            }
          }
        })
      })
    },
    exportRuntimeStorage: function () {
      ui.run(function () {
        confirm('确定要将运行时数据导出到runtime_store.cfg吗？此操作会覆盖已有的数据').then(ok => {
          if (ok) {
            try {
              let runtimeStorageStr = AesUtil.encrypt(commonFunctions.exportRuntimeStorage(), aesKey)
              files.write(runtime_store_path, runtimeStorageStr)
            } catch (e) {
              toastLog(e)
            }
          }
        })
      })
    },
    restoreRuntimeStorage: function () {
      ui.run(function () {
        confirm('确定要将从runtime_store.cfg导入运行时数据吗？此操作会覆盖已有的数据').then(ok => {
          if (ok) {
            if (files.exists(runtime_store_path)) {
              let encrypt_content = files.read(runtime_store_path)
              let resetRuntimeStore = function (runtimeStorageStr) {
                if (commonFunctions.importRuntimeStorage(runtimeStorageStr)) {
                  toastLog('导入运行配置成功')
                  return true
                }
                toastLog('导入运行配置失败，无法读取正确信息')
                return false
              }
              try {
                let decrypt = AesUtil.decrypt(encrypt_content, aesKey)
                if (!decrypt) {
                  toastLog('runtime_store.cfg解密失败, 请尝试输入秘钥')
                  dialogs.rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                    .then(key => {
                      if (key) {
                        key = key.trim()
                        decrypt = AesUtil.decrypt(encrypt_content, key)
                        if (decrypt) {
                          resetRuntimeStore(decrypt)
                        } else {
                          toastLog('秘钥不正确，无法解析')
                        }
                      }
                    })
                } else {
                  resetRuntimeStore(decrypt)
                }
              } catch (e) {
                toastLog(e)
              }
            } else {
              toastLog('配置信息不存在，无法导入')
            }
          }
        })
      })
    },
    downloadUpdate: () => {
      threads.start(function () {
        updateDownloader.downloadUpdate()
      })
    },
    // 测试回调
    callback: (data, callbackId) => {
      log('callback param:' + JSON.stringify(data))
      postMessageToWebView({ callbackId: callbackId, data: { message: 'hello,' + callbackId } })
    },
    loadProtectedList: (data, callbackId) => {
      let protectList = commonFunctions.getFullTimeRuntimeStorage('protectList').protectList || []
      protectList.forEach(protectInfo => protectInfo.timeout = dateFormat(new Date(protectInfo.timeout)))
      postMessageToWebView({ callbackId: callbackId, data: { protectList: protectList } })
    },
    removeFromProtectList: (data, callbackId) => {
      log('移除保护罩使用记录：' + data.name)
      commonFunctions.removeFromProtectList(data.name)
      postMessageToWebView({ callbackId: callbackId, data: { success: true } })
    },
    updateProtectList: (data, callbackId) => {
      log('更新保护罩使用信息:' + data.protectList)
      commonFunctions.updateProtectList(data.protectList.map(v => {
        v.timeout = new Date(v.timeout.replace(/-/g,'/')).getTime()
        return v
      }))
      postMessageToWebView({ callbackId: callbackId, data: { success: true } })
    },
    startRainCollect: () => {
      postMessageToWebView({ functionName: 'saveBasicConfigs' })
      ui.run(function () {
        engines.execScriptFile(mainScriptPath + "/unit/能量雨收集.js", { path: mainScriptPath + "/unit/" })
      })
    },
    cancelCurrentCoolDown: () => {
      commonFunctions.cancelCurrentCoolDown()
      toastLog('撤销成功')
    },
    checkIfInCooldown: (data, callbackId) => {
      postMessageToWebView({ callbackId: callbackId, data: { coolDownInfo: commonFunctions.checkIfNeedCoolDown() } })
    }
  }
  return bridgeHandler
}

// 内部方法
function sendConfigChangedBroadcast (newConfig) {
  newConfig = newConfig || config
  console.verbose(engines.myEngine().id + ' 发送广播 通知配置变更')
  events.broadcast.emit(storage_name + 'config_changed', { config: newConfig, id: engines.myEngine().id })
}
