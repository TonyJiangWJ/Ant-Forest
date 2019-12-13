/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 22:59:25
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-14 00:04:28
 * @Description: 
 */
var {default_config} = require('../config.js')
let _storage_name = typeof storage_name === 'undefined' ? require('../config.js').storage_name : storage_name
var configStorage = storages.create(_storage_name)
var FileUtils = require("../lib/FileUtils.js")
var commonFunctions = require("../lib/CommonFunction.js")
Object.keys(default_config).forEach((key)=>{
  log(key + ":" + configStorage.get(key))
})


configStorage.put("is_cycle", true)
configStorage.put("collect_self_only", true)
configStorage.put("cycle_times", 1000)
toastLog("配置完毕done")
commonFunctions.killRunningScript()
commonFunctions.setUpAutoStart(0.1)