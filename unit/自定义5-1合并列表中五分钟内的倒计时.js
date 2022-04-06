/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 22:59:25
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-02 09:43:00
 * @Description: 
 */
var {default_config,storage_name:_storage_name} = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
var configStorage = storages.create(_storage_name)
var FileUtils = singletonRequire('FileUtils')
var commonFunctions = singletonRequire('CommonFunction')
var runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
Object.keys(default_config).forEach((key)=>{
  log(key + ":" + configStorage.get(key))
})



configStorage.put("is_cycle", false)
configStorage.put("collect_self_only", false)
configStorage.put("merge_countdown_by_gaps", true)
configStorage.put("countdown_gaps", 5)
toastLog("配置完毕done")
commonFunctions.killRunningScript(true)
runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())