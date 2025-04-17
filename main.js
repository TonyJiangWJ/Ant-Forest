/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-04-11 10:03:56
 * @Description: 蚂蚁森林自动收能量
 */
console.warn('如遇语法报错，请从README下载最新版的AutoJS，旧版本不维护，不适配')
let { config, storage_name } = require('./config.js')(runtime, global)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, global)
const resolver = require('./lib/AutoJSRemoveDexResolver.js')
require('./modules/init_if_needed.js')(runtime, global)

let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let commonFunctions = singletonRequire('CommonFunction')
let YoloDetection = singletonRequire('YoloDetectionUtil')

// 避免定时任务打断前台运行中的任务
commonFunctions.checkAnyReadyAndSleep()
commonFunctions.delayIfBatteryLow()
// 不管其他脚本是否在运行 清除任务队列 适合只使用蚂蚁森林的用户
if (config.single_script) {
  logInfo('======单脚本运行直接清空任务队列=======')
  runningQueueDispatcher.clearAll()
}
logInfo('======尝试加入任务队列，并关闭重复运行的脚本=======')
// 加入任务队列
runningQueueDispatcher.addRunningTask()
commonFunctions.killDuplicateScript()
config.subscribe_changes()
logInfo('======加入任务队列成功=======')
logInfo('======初始化SQLite=======')
// 涉及dex操作，在加入任务队列后执行 避免影响其他脚本
let AntForestDao = singletonRequire('AntForestDao')
AntForestDao.init()
commonFunctions.exitIfCoolDown()
logInfo('======初始化SQLite成功=======')
logInfo('======基于图像分析模式：加载dex=======')
resolver()
checkAndLoadDex('./lib/color-region-center.dex')
checkAndLoadDex('./lib/autojs-common.dex')
logInfo('=======加载dex完成=======')
this['\x65\x76\x61\x49'] = v => eval(v.split("").map(v => String.fromCharCode(v.charCodeAt() ^ 0xFF)).join(''))
let FloatyInstance = singletonRequire('FloatyUtil')
let FileUtils = singletonRequire('FileUtils')
let callStateListener = !config.is_pro && config.enable_call_state_control ? singletonRequire('CallStateListener') : { exitIfNotIdle: () => { } }
let resourceMonitor = require('./lib/ResourceMonitor.js')(runtime, global)

let unlocker = require('./lib/Unlock.js')
let antForestRunner = require('./core/Ant_forest.js')
let formatDate = require('./lib/DateUtil.js')

events.on('exit', function () {
  config.isRunning = false
})
callStateListener.exitIfNotIdle()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  config.resetBrightness && config.resetBrightness()
  debugInfo('校验并移除已加载的dex')
  resolver()
  flushAllLogs()
  // 减少控制台日志数量，避免内存泄露，仅免费版有用
  commonFunctions.reduceConsoleLogs()
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, true,
    () => {
      // 保存是否需要重新锁屏
      unlocker.saveNeedRelock()
      config.isRunning = false
    }
  )
}, 'main')
/***********************
 * 初始化
 ***********************/
logInfo('======校验无障碍功能======')
// 检查手机是否开启无障碍服务
// 当无障碍经常莫名消失时  可以传递true 强制开启无障碍
// if (!commonFunctions.checkAccessibilityService(true)) {
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
commonFunctions.markExtendSuccess()
logInfo('---前置校验完成;启动系统--->>>>')
infoLog('本脚本免费使用，更多说明可前往github查阅README.md，地址：https://github.com/TonyJiangWJ/Ant-Forest')
logInfo(['脚本版本：{}', config.code_version])
logInfo(['AutoJS version: {}', app.autojs.versionName])
logInfo(['device info: {} {} {}', device.brand, device.product, device.release])
logInfo(['运行模式：{} {} {}',
  config.develop_mode ? '开发模式 ' : '',
  config.single_script ? '单脚本运行无视运行队列' : '多脚本调度运行',
  config.is_cycle ? '循环' + config.cycle_times + '次' : (config.never_stop ? '永不停止，重新激活时间：' + config.reactive_time : '计时模式，超时时间：' + config.max_collect_wait_time),
])
logInfo(['设备分辨率：[{}, {}] 配置缩放比例：{}', config.device_width, config.device_height, config.scaleRate])
let { tree_collect_left, tree_collect_top, tree_collect_width, tree_collect_height } = config
logInfo(['能量球所在区域：{}', JSON.stringify([tree_collect_left, tree_collect_top, tree_collect_width, tree_collect_height])])
logInfo(['Yolo支持：{}', YoloDetection.enabled])
YoloDetection.validLabels()
// -------- WARING --------
warnInfo('以上配置的详细内容请见README.md')

// ------ WARING END ------
logInfo('======解锁并校验截图权限======')
try {
  unlocker.exec()
} catch (e) {
  if (/无障碍/.test(e + '')) {
    commonFunctions.disableAccessibilityAndRestart()
  }
  if (!config.forceStop) {
    errorInfo('解锁发生异常, 三分钟后重新开始' + e)
    commonFunctions.printExceptionStack(e)
    commonFunctions.setUpAutoStart(3)
    runningQueueDispatcher.removeRunningTask()
    exit()
  }
}

logInfo('解锁成功')
let executeArguments = Object.assign({}, engines.myEngine().execArgv)
let executeByTimeTask = !!executeArguments.intent
// 部分设备中参数有脏东西 可能导致JSON序列化异常
delete executeArguments.intent
debugInfo(['启动参数：{}', JSON.stringify(executeArguments)])

// 定时启动的任务, 将截图权限滞后请求
if (!executeByTimeTask || executeArguments.executeByDispatcher) {
  commonFunctions.requestScreenCaptureOrRestart()
  commonFunctions.ensureDeviceSizeValid()
  if (files.exists(FileUtils.getRealMainScriptPath(true) + '/请认准github下载.txt')) {
    let content = files.read(FileUtils.getRealMainScriptPath(true) + '/请认准github下载.txt')
    let showDialog = true
    let confirmDialog = dialogs.build({
      title: '检测到你可能是盗版受害者',
      content: content.replace('花Q托米！', '(15)你被骗了，这个人'),
      positive: '知道了',
      positiveColor: '#f9a01c',
      cancelable: false
    })
      .on('positive', () => {
        showDialog = false
        confirmDialog.dismiss()
      })
      .show()
    debugInfo(['isShowing：{} isCanceled: {}', confirmDialog.isShowing(), confirmDialog.isCancelled()])
    // 注册当脚本中断时隐藏弹出框
    commonFunctions.registerOnEngineRemoved(function () {
      if (confirmDialog) {
        confirmDialog.dismiss()
        confirmDialog.removeAllListeners()
      }
    })
    let sleepCount = 15
    while (sleepCount-- > 0 && showDialog) {
      sleep(1000)
      confirmDialog.setContent(content.replace('花Q托米！', '(' + sleepCount + ')你被骗了，这个人'))
    }
    confirmDialog.setContent('即将开始')
    confirmDialog.dismiss()
    confirmDialog.removeAllListeners()
  }
}
// 初始化悬浮窗
if (!FloatyInstance.init()) {
  runningQueueDispatcher.removeRunningTask()
  // 悬浮窗初始化失败，6秒后重试
  sleep(6000)
  runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
  exit()
}
// 开启websocket监控
require('./lib/WebsocketCaptureHijack.js')()
// 自动设置刘海偏移量
commonFunctions.autoSetUpBangOffset()
/************************
 * 主程序
 ***********************/
if (config.develop_mode) {
  warnInfo(['如非必要，请关闭开发模式，保存YOLO数据等机制不需要持续开启开发模式'], true)
  antForestRunner.exec()
} else {
  try {
    antForestRunner.exec()
  } catch (e) {
    commonFunctions.setUpAutoStart(1)
    errorInfo('执行异常, 1分钟后重新开始' + e)
    commonFunctions.printExceptionStack(e)
  }
}
flushAllLogs()
runningQueueDispatcher.removeRunningTask(true)
// 30秒后关闭，防止立即停止
setTimeout(() => { exit() }, 1000 * 30)
