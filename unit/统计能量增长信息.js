/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-27 19:54:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-27 22:23:29
 * @Description: 
 */
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
function isEmpty(val) {
  return val === null || typeof val === 'undefined' || val === ''
}
let historyInfoLogPath = FileUtils.getRealMainScriptPath(true) + '/history-energy.log'
if (files.exists(historyInfoLogPath)) {
  let historyFile = open(historyInfoLogPath)
  let line = null
  while (!isEmpty(line = historyFile.readline())) {
    log(line)
  }
} else {
  toastLog('能量数据历史信息不存在')
}