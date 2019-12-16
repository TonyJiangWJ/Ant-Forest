/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-16 13:38:16
 * @Description: 蚂蚁森林自动收能量
 */
let { config } = require('./config.js')
if (config.base_on_image) {
  runtime.loadDex('./lib/autojs-tools.dex')
}
let runningQueueDispatcher = require('./lib/RunningQueueDispatcher.js')
let LogUtils = require('./lib/LogUtils.js')
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo, clearLogFile, appendLog, removeOldLogFiles
} = LogUtils
let FloatyInstance = require('./lib/FloatyUtil.js')
let commonFunctions = require('./lib/CommonFunction.js')
let unlocker = require('./lib/Unlock.js')
let antForestRunner = require('./core/Ant_forest.js')
let formatDate = require('./lib/DateUtil.js')
let { tryRequestScreenCapture } = require('./lib/TryRequestScreenCapture.js')
// let automator = require('./lib/Automator.js')
// automator.scrollDown()
// exit()
logInfo('======校验是否重复运行=======')
// 检查脚本是否重复运行
commonFunctions.checkDuplicateRunning()
// 不管其他脚本是否在运行 清除任务队列 适合只使用蚂蚁森林的用户
if (config.single_script) {
  runningQueueDispatcher.clearAll()
}
runningQueueDispatcher.addRunningTask()
/***********************
 * 初始化
 ***********************/
logInfo('======校验无障碍功能======')
// 检查手机是否开启无障碍服务
// 当无障碍经常莫名消失时  可以传递true 强制开启无障碍
// if (!commonFunctions.checkAccessibilityService(true)) {
if (!commonFunctions.checkAccessibilityService()) {
  try {
    auto.waitFor()
  } catch (e) {
    warnInfo('auto.waitFor()不可用')
    auto()
  }
}
logInfo('---前置校验完成;启动系统--->>>>')
if (files.exists('version.json')) {
  let content = JSON.parse(files.read('version.json'))
  logInfo(['版本信息：{} nodeId:{}', content.version, content.nodeId])
} else {
  logInfo('无法获取脚本版本信息')
}
logInfo('======解锁并校验截图权限======')
try {
  unlocker.exec()
} catch (e) {
  errorInfo('解锁发生异常, 三分钟后重新开始' + e)
  commonFunctions.setUpAutoStart(3)
  runningQueueDispatcher.removeRunningTask()
  exit()
}
logInfo('解锁成功')
if (config.fuck_miui11) {
  commonFunctions.showDialogAndWait()
  commonFunctions.launchAutoJs()
}

// 请求截图权限
let screenPermission = false
let actionSuccess = commonFunctions.waitFor(function () {
  if (config.request_capture_permission) {
    screenPermission = tryRequestScreenCapture()
  } else {
    screenPermission = requestScreenCapture(false)
  }
}, 15000)
if (!actionSuccess || !screenPermission) {
  errorInfo('请求截图失败, 设置6秒后重启')
  runningQueueDispatcher.removeRunningTask()
  commonFunctions.setUpAutoStart(0.1)
  exit()
} else {
  logInfo('请求截屏权限成功')
}
// 初始化悬浮窗
if (!FloatyInstance.init()) {
  runningQueueDispatcher.removeRunningTask()
  // 悬浮窗初始化失败，6秒后重试
  commonFunctions.setUpAutoStart(0.1)
}
/************************
 * 主程序
 ***********************/
if (config.develop_mode) {
  antForestRunner.exec()
} else {
  try {
    antForestRunner.exec()
  } catch (e) {
    commonFunctions.setUpAutoStart(1)
    errorInfo('执行异常, 1分钟后重新开始' + e)
  } finally {
    runningQueueDispatcher.removeRunningTask(true)
    exit()
  }
}
