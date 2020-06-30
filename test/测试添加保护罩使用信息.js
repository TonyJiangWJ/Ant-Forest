/*
 * @Author: TonyJiangWJ
 * @Date: 2020-06-29 13:22:13
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-06-30 22:10:48
 * @Description: 
 */ 
let commonFunctions = require('../lib/prototype/CommonFunction.js')
commonFunctions.addNameToProtect('testUser' + (Math.random() * 1000).toFixed(0), new Date().getTime() + 3600000)