let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')

// 关闭运行中森林脚本
commonFunctions.killRunningScript(true)
// 取消自动设置的定时任务
commonFunctions.cancelAllTimedTasks(true)