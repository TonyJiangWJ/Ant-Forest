/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-30 17:17:27
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-07-29 15:05:41
 * @Description: 
 */

let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let { debugInfo, logInfo, errorInfo, warnInfo, infoLog } = singletonRequire('LogUtils')
let _BaseScanner = require('../core/BaseScanner.js')
let scanner = new _BaseScanner()
let start = new Date().getTime()

scanner.multiTouchToCollect()

toastLog('点击完毕 耗时：' + (new Date().getTime() - start) + "ms")