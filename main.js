/*
 * @Author: NickHopps
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-03-05 14:16:30
 * @Description: 蚂蚁森林自动收能量
 */

let { config } = require('./config.js')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo
} = require('./lib/LogUtils.js')
let { commonFunctions } = require('./lib/CommonFunction.js')
let { unlocker } = require('./lib/Unlock.js')
let { antForestRunner } = require('./core/Ant_forest.js')
let { scheduler } = require('./lib/scheduler.js')

logInfo('======校验是否重复运行=======')
// 检查脚本是否重复运行
commonFunctions.checkDuplicateRunning()

/***********************
 * 初始化
 ***********************/
logInfo('======校验无障碍功能======')
// 检查手机是否开启无障碍服务
try {
  auto.waitFor()
} catch (e) {
  warnInfo('auto.waitFor()不可用')
  auto()
}
logInfo('---前置校验完成;启动系统--->>>>')
if (config.auto_start) {
  scheduler()
}
logInfo('======解锁并校验截图权限======')
unlocker.exec()
logInfo('解锁成功')
// 请求截图权限
if (!requestScreenCapture()) {
  errorInfo('请求截图失败')
  exit()
} else {
  logInfo('请求截图权限成功')
}
/************************
 * 主程序
 ***********************/
antForestRunner.exec()
