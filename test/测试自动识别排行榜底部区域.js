/*
 * @Author: TonyJiangWJ
 * @Date: 2020-07-29 14:39:26
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-07-30 20:26:28
 * @Description: 
 */
let { config: _config } = require('../config.js')(runtime, this)
_config.bottom_check_succeed = false
_config.show_debug_log = true
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let { debugInfo } = singletonRequire('LogUtils')
let widgetUtils = singletonRequire('WidgetUtils')
requestScreenCapture(false)
toastLog('两秒后开始识别' + _config.bottom_check_succeed)
sleep(2000)
let screen = captureScreen()
toastLog('获取截图进行识别')
widgetUtils.tryFindBottomRegion(images.grayscale(screen))
toastLog('识别完毕:' + _config.bottom_check_succeed)
