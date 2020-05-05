/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 19:41:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-02 09:41:43
 * @Description: 
 */
var {default_config,storage_name:_storage_name} = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
var configStorage = storages.create(_storage_name)
var FileUtils = singletonRequire('FileUtils')
var commonFunctions = singletonRequire('CommonFunction')
var runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
Object.keys(default_config).forEach((key)=>{
  log(key + ":" + configStorage.get(key))
})

configStorage.put("never_stop", true)
configStorage.put("is_cycle", false)
configStorage.put("reactive_time", 1)
configStorage.put("collect_self_only", false)
toastLog("配置完毕done")
commonFunctions.killRunningScript()
runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())