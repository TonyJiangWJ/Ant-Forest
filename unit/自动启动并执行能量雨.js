var { default_config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
var configStorage = storages.create(_storage_name)
let FileUtils = singletonRequire('FileUtils')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')

configStorage.put("auto_start_rain", true)
toastLog("配置完毕done")
let mainScriptPath = FileUtils.getRealMainScriptPath(true)
engines.execScriptFile(mainScriptPath + "/unit/能量雨收集.js", { path: mainScriptPath + "/unit/" })

setTimeout(function () {
  configStorage.put("auto_start_rain", false)
}, 3000)