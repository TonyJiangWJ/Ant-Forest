/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-28 09:10:03
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-28 09:19:20
 * @Description: 
 */
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')

// 关闭运行中森林脚本
commonFunctions.killRunningScript()
// 取消自动设置的定时任务
commonFunctions.cancelAllTimedTasks()


let _km = context.getSystemService(context.KEYGUARD_SERVICE)
if (!_km.inKeyguardRestrictedInputMode()) {
  // 解锁状态下执行锁屏
  automator.lockScreen()
}
