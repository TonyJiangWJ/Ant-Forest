/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-10 12:13:45
 * @Description: 蚂蚁森林自动收能量
 */
let { config, storage_name } = require('./config.js')(runtime, this)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)
const resolver = require('./lib/AutoJSRemoveDexResolver.js')

let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let commonFunctions = singletonRequire('CommonFunction')
// 避免定时任务打断前台运行中的任务
commonFunctions.checkAnyReadyAndSleep()
// 不管其他脚本是否在运行 清除任务队列 适合只使用蚂蚁森林的用户
if (config.single_script) {
  logInfo('======单脚本运行直接清空任务队列=======')
  runningQueueDispatcher.clearAll()
}
logInfo('======尝试加入任务队列，并关闭重复运行的脚本=======')
// 加入任务队列
runningQueueDispatcher.addRunningTask()
commonFunctions.killDuplicateScript()
logInfo('======加入任务队列成功=======')


logInfo('======基于图像分析模式：加载dex=======')
resolver()
runtime.loadDex('./lib/color-region-center.dex')
logInfo('=======加载dex完成=======')


let FloatyInstance = singletonRequire('FloatyUtil')
let FileUtils = singletonRequire('FileUtils')
let callStateListener = !config.is_pro && config.enable_call_state_control ? singletonRequire('CallStateListener') : { exitIfNotIdle: () => { } }
let resourceMonitor = require('./lib/ResourceMonitor.js')(runtime, this)

let unlocker = require('./lib/Unlock.js')
let antForestRunner = require('./core/Ant_forest.js')
let formatDate = require('./lib/DateUtil.js')

callStateListener.exitIfNotIdle()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  config.resetBrightness && config.resetBrightness()
  events.removeAllListeners()
  events.recycle()
  debugInfo('校验并移除已加载的dex')
  resolver()
  flushAllLogs()
  !config.is_pro && console.clear()
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
logInfo('---前置校验完成;启动系统--->>>>')
// 打印运行环境信息
if (files.exists('version.json')) {
  let content = JSON.parse(files.read('version.json'))
  logInfo(['版本信息：{} nodeId:{}', content.version, content.nodeId])
} else if (files.exists('project.json')) {
  let content = JSON.parse(files.read('project.json'))
  logInfo(['版本信息：{}', content.versionName])
} else {
  logInfo('无法获取脚本版本信息')
}
infoLog('本脚本免费使用，更多说明可前往github查阅README.md，地址：https://github.com/TonyJiangWJ/Ant-Forest')
logInfo(['AutoJS version: {}', app.autojs.versionName])
logInfo(['device info: {} {} {}', device.brand, device.product, device.release])
logInfo(['运行模式：{}{} {} {} 排行榜可收取判定方式：{} {}',
  config.develop_mode ? '开发模式 ' : '',
  config.single_script ? '单脚本运行无视运行队列' : '多脚本调度运行',
  config.is_cycle ? '循环' + config.cycle_times + '次' : (config.never_stop ? '永不停止，重新激活时间：' + config.reactive_time : '计时模式，超时时间：' + config.max_collect_wait_time),
  '基于图像分析' + (config.useOcr || config.useTesseracOcr ? '-使用OCR识别倒计时 ' : ''),
  config.check_finger_by_pixels_amount ? '基于像素点个数判断是否可收取，阈值<=' + config.finger_img_pixels : '自动判断是否可收取',
  config.useCustomScrollDown ? '使用模拟滑动, 速度：' + config.scrollDownSpeed + 'ms 底部高度：' + config.bottomHeight : ''
])
logInfo(['设备分辨率：[{}, {}]', config.device_width, config.device_height])
// -------- WARING --------
if (!config.useCustomScrollDown) {
  warnInfo('排行榜中控件不存在时无法使用自带的scrollDown，请开启模拟滑动并自行调试设置滑动速度和底部高度')
}
warnInfo('脚本会自动识别排行榜顶部和底部区域，首次运行时自动识别需要一定时间，请不要手动关闭脚本')
warnInfo('以上配置的详细内容请见README.md')

// ------ WARING END ------
logInfo('======解锁并校验截图权限======')
try {
  unlocker.exec()
} catch (e) {
  if (!config.forceStop) {
    errorInfo('解锁发生异常, 三分钟后重新开始' + e)
    commonFunctions.printExceptionStack(e)
    commonFunctions.setUpAutoStart(3)
    runningQueueDispatcher.removeRunningTask()
    exit()
  }
}
logInfo('解锁成功')

commonFunctions.requestScreenCaptureOrRestart()
commonFunctions.ensureDeviceSizeValid()
// 初始化悬浮窗
if (!FloatyInstance.init()) {
  runningQueueDispatcher.removeRunningTask()
  // 悬浮窗初始化失败，6秒后重试
  sleep(6000)
  runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
  exit()
}
// 自动设置刘海偏移量
commonFunctions.autoSetUpBangOffset()
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
    commonFunctions.printExceptionStack(e)
  }
}
flushAllLogs()
runningQueueDispatcher.removeRunningTask(true)
// 30秒后关闭，防止立即停止
setTimeout(() => { exit() }, 1000 * 30)
