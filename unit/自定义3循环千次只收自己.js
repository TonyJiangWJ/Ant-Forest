/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 22:59:25
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-02 09:43:00
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


configStorage.put("is_cycle", true)
configStorage.put("collect_self_only", true)
configStorage.put("cycle_times", 1000)
toastLog("配置完毕done")
commonFunctions.killRunningScript()
runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())