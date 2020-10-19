/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-10-09 15:15:03
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

if (config.base_on_image) {
  logInfo('======基于图像分析模式：加载dex=======')
  resolver()
  runtime.loadDex('./lib/color-region-center.dex')
  logInfo('=======加载dex完成=======')
}

let FloatyInstance = singletonRequire('FloatyUtil')
let FileUtils = singletonRequire('FileUtils')
let tryRequestScreenCapture = singletonRequire('TryRequestScreenCapture')
let callStateListener = config.enable_call_state_control ? singletonRequire('CallStateListener') : { exitIfNotIdle: () => { } }
let resourceMonitor = require('./lib/ResourceMonitor.js')(runtime, this)

let unlocker = require('./lib/Unlock.js')
let antForestRunner = require('./core/Ant_forest.js')
let formatDate = require('./lib/DateUtil.js')

callStateListener.exitIfNotIdle()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, true,
    () => {
      // 保存是否需要重新锁屏
      unlocker.saveNeedRelock()
      events.removeAllListeners()
      events.recycle()
      debugInfo('校验并移除已加载的dex')
      resolver()
      flushAllLogs()
      config.isRunning = false
      console.clear()
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
if (!commonFunctions.checkAccessibilityService()) {
  try {
    auto.waitFor()
  } catch (e) {
    warnInfo('auto.waitFor()不可用')
    auto()
  }
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
  config.auto_set_img_or_widget ? '自动分析基于图像还是控件分析' : (
    config.base_on_image ? '基于图像分析' + (config.useOcr || config.useTesseracOcr ? '-使用OCR识别倒计时 ' : '') : '基于控件分析'
  ),
  config.check_finger_by_pixels_amount ? '基于像素点个数判断是否可收取，阈值<=' + config.finger_img_pixels : '自动判断是否可收取',
  config.useCustomScrollDown ? '使用模拟滑动, 速度：' + config.scrollDownSpeed + 'ms 底部高度：' + config.bottomHeight : ''
])
logInfo(['设备分辨率：[{}, {}]', config.device_width, config.device_height])
// -------- WARING --------
if (config.auto_set_img_or_widget || !config.base_on_image) {
  warnInfo('支付宝基本去除了排行榜的控件，还请尽量直接使用图像分析模式，后续控件分析模式不再花精力维护')
}
if (config.base_on_image) {
  if (!config.direct_use_img_collect_and_help) {
    warnInfo('配置图像分析模式后尽量开启直接使用图像分析方式收取和帮助好友')
  }
  if (!config.useCustomScrollDown) {
    warnInfo('排行榜中控件不存在时无法使用自带的scrollDown，请开启模拟滑动并自行调试设置滑动速度和底部高度')
  }
  warnInfo('脚本会自动识别排行榜顶部和底部区域，首次运行时自动识别需要一定时间，请不要手动关闭脚本')
  warnInfo('以上配置的详细内容请见README.md')
}
// ------ WARING END ------
logInfo('======解锁并校验截图权限======')
try {
  unlocker.exec()
} catch (e) {
  errorInfo('解锁发生异常, 三分钟后重新开始' + e)
  commonFunctions.printExceptionStack(e)
  commonFunctions.setUpAutoStart(3)
  runningQueueDispatcher.removeRunningTask()
  exit()
}
logInfo('解锁成功')

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
  sleep(6000)
  runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
  exit()
} else {
  logInfo('请求截屏权限成功')
}
// 根据截图重新获取设备分辨率
let screen = commonFunctions.checkCaptureScreenPermission(3)
if (screen) {
  let width = screen.width
  let height = screen.height
  if (width > height) {
    errorInfo(['检测到截图的宽度大于高度，可能截图方法出现了问题，请尝试强制重启AutoJS，否则脚本无法正常运行! w:{} h:{}', width, height], true)
    runningQueueDispatcher.removeRunningTask()
    exit()
  }
  if (width !== config.device_width || height !== config.device_height) {
    config.device_height = height
    config.device_width = width
    warnInfo(['设备分辨率设置不正确，宽高已修正为：[{}, {}]', width, height])
    let configStorage = storages.create(storage_name)
    configStorage.put('device_height', height)
    configStorage.put('device_width', width)
    config.recalculateRegion()
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
