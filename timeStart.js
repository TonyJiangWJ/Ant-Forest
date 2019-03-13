/*
// vs code中测试时使用
let mockFunctions = require('./lib/mock/mockFunctions.js')
let log = mockFunctions.log
let toast = mockFunctions.toast
let sleep = mockFunctions.sleep
*/

let config = require("./config.js");
let CommonFunctions = require("./lib/CommonFunction.js")
let formatDate = require("./lib/DateUtil.js");
let DateCompare = require("./lib/DateCompare.js");
let sameDay = config.auto_start_same_day
let clockTime = new Date();

let commonFunctions = new CommonFunctions()

// 如果不是同一天，则将当前时间加24小时 获取第二天的日期
if (!sameDay) {
  clockTime = new Date(clockTime.getTime() + 24 * 3600000)
}
// 设置启动时间为第二天的6:40:00
clockTime.setHours(config.auto_start_hours)
clockTime.setMinutes(config.auto_start_minutes)
clockTime.setSeconds(config.auto_start_seconds)
let clockTimeCompare = new DateCompare(clockTime)
log("启动定时：" + formatDate(clockTimeCompare.originDate, "yyyy-MM-dd HH:mm:ss"))

let nowCompare = new DateCompare(new Date())
while (nowCompare.compareTo(clockTimeCompare) < 0) {
  nowCompare = new DateCompare(new Date())
  log("not now " + formatDate(nowCompare.originDate, "yyyy-MM-dd HH:mm:ss"));
  let gap = clockTime.getTime() - nowCompare.getTime();
  if (gap <= 0) {
    break;
  }
  log("当前时间" + formatDate(new Date(nowCompare.getTime())))
  log("剩余时间[" + gap + "]ms [" + (gap / 60000).toFixed(2) + "]分钟 [" + (gap / 3600000).toFixed(2) +"]小时")
  if (gap < 3600000) {
    // 当间隔时间小于40分钟时 睡眠5分钟，大于40分钟时 睡眠10分钟
    if (gap < 300000) {
      gap = gap / 60000
    } else {
      gap = gap / 4 < 600000 ? 5 : 10
    }
  } else if (gap > 4 * 3600000) {
    // 间隔时间大于四小时时睡眠一小时
    gap = 60
  } else {
    // 间隔时间1-4小时 睡眠二十分钟
    gap = 20
  }

  log("睡眠" + gap + "分钟")
  commonFunctions.common_delay(gap, "睡眠还有[")
}
log("start")
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
if (!requestScreenCapture()) {
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
var unlock = Unlock(automator, config);
var ant_forest = Ant_forest(automator, unlock, config);

/************************
 * 主程序
 ***********************/
ant_forest.exec();