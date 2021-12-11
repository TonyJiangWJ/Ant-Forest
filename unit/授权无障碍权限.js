let { config: _config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let commonFunction = singletonRequire('CommonFunction')
// 李跳跳
// _config.other_accessisibility_services = 'com.whatsbug.litiaotiao/com.whatsbug.litiaotiao.MyAccessibilityService'
log('当前已启用的无障碍服务：', commonFunction.getEnabledAccessibilityServices())
toastLog(commonFunction.checkAccessibilityService(true))