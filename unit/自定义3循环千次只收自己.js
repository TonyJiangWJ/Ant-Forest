/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 22:59:25
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-14 00:04:28
 * @Description: 
 */
var {default_config,storage_name:_storage_name} = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
var configStorage = storages.create(_storage_name)
var FileUtils = singletonRequire('FileUtils')
var commonFunctions = singletonRequire('CommonFunction')
Object.keys(default_config).forEach((key)=>{
  log(key + ":" + configStorage.get(key))
})


configStorage.put("is_cycle", true)
configStorage.put("collect_self_only", true)
configStorage.put("cycle_times", 1000)
toastLog("配置完毕done")
commonFunctions.killRunningScript()
commonFunctions.setUpAutoStart(0.1)