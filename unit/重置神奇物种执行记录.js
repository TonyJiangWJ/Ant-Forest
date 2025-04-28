/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 19:41:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-17 23:01:44
 * @Description: 
 */
var {default_config,storage_name:_storage_name} = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
var commonFunctions = singletonRequire('CommonFunction')

commonFunctions.resetMagicCollected()