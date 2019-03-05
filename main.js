/*
 * @Author: NickHopps
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-03-05 14:16:30
 * @Description: 蚂蚁森林自动收能量
 */

/***********************
 * 初始化
 ***********************/
// 检查手机是否开启无障碍服务
auto();

// 请求截图权限
if (! requestScreenCapture()) {
  toast("请求截图失败");
  exit();
}

/************************
 * 依赖加载
 ***********************/
var Automator = require("./lib/Automator.js");
var Unlock = require("./lib/Unlock.js");
var Ant_forest = require("./core/Ant_forest.js");

var automator = Automator();
var config = require("./config.js");
var unlock = Unlock(automator, config);
var ant_forest = Ant_forest(automator, unlock, config);

/************************
 * 主程序
 ***********************/
ant_forest.exec();
