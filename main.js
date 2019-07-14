/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-07-04 00:14:22
 * @Description: 蚂蚁森林自动收能量
 */
let {
  debugInfo,
  logInfo,
  infoLog,
  warnInfo,
  errorInfo,
  clearLog
} = require('./lib/LogUtils.js')
let { commonFunctions } = require('./lib/CommonFunctions.js')
let { WidgetUtils } = require('./lib/WidgetUtils.js')
let { formatDate } = require('./lib/DateUtil.js')
/***********************
 * 初始化
 ***********************/
logInfo('======校验是否重复运行=======')
// 检查脚本是否重复运行
commonFunctions.checkDuplicateRunning()
clearLog()
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

/************************
 * 依赖加载
 ***********************/
logInfo('======检查更新======')
// 检查更新
//engines.execScriptFile('./update.js')

// 加载本地配置
var config = storages.create('ant_forest_config')
if (!config.contains('color_offset') || !config.contains('home_ui_content')) {
  warnInfo('请完善配置后再运行', true)
  engines.execScriptFile('./config.js')
  engines.myEngine().forceStop()
}

var Automator = require('./lib/Automator.js')
var Unlock = require('./lib/Unlock.js')
var Ant_forest = require('./core/Ant_forest.js')

var automator = Automator()
var unlock = Unlock(automator)
var ant_forest = Ant_forest(automator, unlock)

logInfo('======解锁并校验截图权限======')
unlock.exec()
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
infoLog('执行主程序')
ant_forest.exec()
