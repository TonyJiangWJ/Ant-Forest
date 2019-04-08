/*
 * @Author: NickHopps
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-04-08 08:44:22
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

// 检查脚本是否重复运行
engines.all().slice(1).forEach(script => {
  if (script.getSource().getName().indexOf(engines.myEngine().getSource())) {
    toastLog("脚本正在运行中");
    engines.myEngine().forceStop();
  }
});

/************************
 * 依赖加载
 ***********************/
// 检查更新
engines.execScriptFile("./update.js");

// 加载本地配置
var config = storages.create("ant_forest_config");
if (!config.contains("color_offset")) {
  toastLog("请完善配置后再运行");
  engines.execScriptFile("./config.js");
  engines.myEngine().forceStop();
}

var Automator = require("./lib/Automator.js");
var Unlock = require("./lib/Unlock.js");
var Ant_forest = require("./core/Ant_forest.js");

var automator = Automator();
var unlock = Unlock(automator);
var ant_forest = Ant_forest(automator, unlock);

/************************
 * 主程序
 ***********************/
ant_forest.exec();
