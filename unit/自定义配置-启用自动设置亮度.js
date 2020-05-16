/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 19:41:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-15 10:12:48
 * @Description: 
 */
var { default_config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
var configStorage = storages.create(_storage_name)

configStorage.put("auto_set_brightness", true)
toastLog("配置完毕done")