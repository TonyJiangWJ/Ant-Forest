/*
 * @Author: NickHopps
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-03-05 14:16:30
 * @Description: 蚂蚁森林自动收能量
 */
let formatDate = require("./lib/DateUtil.js")
let CommonFunctions = require("./lib/CommonFunction.js")
let commonFunctions = new CommonFunctions()

commonFunctions.log("======校验是否重复运行=======")
// 检查脚本是否重复运行

engines.all().slice(1).forEach(script => {
  if (script.getSource().getName().indexOf(engines.myEngine().getSource())) {
    commonFunctions.log("脚本正在运行中");
    engines.myEngine().forceStop();
  }
});

/***********************
 * 初始化
 ***********************/
commonFunctions.log("======校验无障碍功能======")
// 检查手机是否开启无障碍服务
auto();

commonFunctions.log("---前置校验完成;启动系统--->>>>")

/************************
 * 依赖加载
 ***********************/
var Automator = require("./lib/Automator.js");
var Unlock = require("./lib/Unlock.js");
var Ant_forest = require("./core/Ant_forest.js");
var scheduler = require('./lib/scheduler.js')
let DateCompare = require("./lib/DateCompare.js");

var config = require("./config.js");

commonFunctions.clearLogFile()
if (config.auto_start) {
  scheduler(config)
}
var automator = Automator(config);
var unlock = Unlock(automator, config);
var ant_forest = Ant_forest(automator, unlock, config);
commonFunctions.log("======解锁并校验截图权限======")
unlock.exec()
commonFunctions.log("解锁成功")
// 请求截图权限
if (!requestScreenCapture()) {
  commonFunctions.og("请求截图失败");
  exit();
} else {
  commonFunctions.log("请求截图权限成功")
}
/************************
 * 主程序
 ***********************/
ant_forest.exec();
