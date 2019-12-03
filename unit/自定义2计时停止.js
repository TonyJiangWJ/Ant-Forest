var {default_config, storage_name} = require('../config.js')
var configStorage = storages.create(storage_name)
var FileUtils = require("../lib/FileUtils.js")
var commonFunctions = require("../lib/CommonFunction.js")
Object.keys(default_config).forEach((key)=>{
  log(key + ":" + configStorage.get(key))
})

configStorage.put("never_stop", false)
configStorage.put("is_cycle", false)
toastLog("配置完毕done")
commonFunctions.killRunningScript()
commonFunctions.setUpAutoStart(0.1)