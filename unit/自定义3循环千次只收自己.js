var {default_config, storage_name} = require('../config.js')
var configStorage = storages.create(storage_name)
var FileUtils = require("../lib/FileUtils.js")
var commonFunctions = require("../lib/CommonFunction.js")
let runningQueueDispatcher = require('../lib/RunningQueueDispatcher.js')
Object.keys(default_config).forEach((key)=>{
  log(key + ":" + configStorage.get(key))
})


configStorage.put("is_cycle", true)
configStorage.put("collect_self_only", true)
configStorage.put("cycle_times", 1000)
toastLog("配置完毕done")
runningQueueDispatcher.clearAll()
commonFunctions.killRunningScript()
commonFunctions.setUpAutoStart(0.1)