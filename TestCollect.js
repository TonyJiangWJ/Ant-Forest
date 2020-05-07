/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-08 00:27:48
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-08 00:32:22
 * @Description: 
 */
let { config } = require('./config.js')(runtime, this)
let _BaseScanner = require('./core/BaseScanner.js')

requestScreenCapture(false)
config.help_friend = false
let scanner = new _BaseScanner()
scanner.checkAndCollectByImg()
config.help_friend = true