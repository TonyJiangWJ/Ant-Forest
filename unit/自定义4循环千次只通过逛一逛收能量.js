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


configStorage.put("is_cycle", true)
configStorage.put("collect_self_only", false)
configStorage.put("cycle_times", 1000)
// 关闭识别倒计时，只通过逛一逛执行
configStorage.put("try_collect_by_stroll", true)
configStorage.put("disable_image_based_collect", 1000)
toastLog("配置完毕done")
commonFunctions.killRunningScript(true)
runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())