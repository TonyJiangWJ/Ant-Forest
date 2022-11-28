let { config: _config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunction = singletonRequire('CommonFunction')
// 李跳跳 AutoJSPro
// _config.other_accessisibility_services = 'com.whatsbug.litiaotiao/com.whatsbug.litiaotiao.MyAccessibilityService:org.autojs.autojspro:com.stardust.autojs.core.accessibility.AccessibilityService'
log('当前已启用的无障碍服务：', commonFunction.getEnabledAccessibilityServices())
commonFunction.disableAccessibilityAndRestart(true)
toastLog(commonFunction.checkAccessibilityService(true))