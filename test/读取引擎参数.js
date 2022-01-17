let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let { debugInfo } = singletonRequire('LogUtils')
let commonFunctions = singletonRequire('CommonFunction')

let executeArguments = engines.myEngine().execArgv
debugInfo(['启动参数：{}', JSON.stringify(executeArguments)])

if (!executeArguments.intent) {
  config._auto_start_with_current_engine = true
  commonFunctions.setUpAutoStart(0.2, true)
}
