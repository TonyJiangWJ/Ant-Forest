/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-28 00:30:49
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-28 00:34:25
 * @Description: 
 */
let is_pro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
let is_modify = Object.prototype.toString.call(org.autojs.autojsm.timing.TimedTask).match(/Java(Class|Object)/)
let timing = is_pro ? com.stardust.autojs.core.timing : (is_modify ? org.autojs.autojsm.timing : org.autojs.autojs.timing);
var TimedTaskManager = is_pro ? timing.TimedTaskManager.Companion.getInstance() : timing.TimedTaskManager.getInstance();
var bridges = require("__bridges__");
console.log(JSON.stringify(bridges.toArray(TimedTaskManager.getAllIntentTasksAsList())))
