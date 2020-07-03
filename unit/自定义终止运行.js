/*
 * @Author: TonyJiangWJ
 * @Date: 2020-07-01 16:50:24
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-07-01 16:50:56
 * @Description: 
 */ 
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
commonFunctions.killRunningScript()