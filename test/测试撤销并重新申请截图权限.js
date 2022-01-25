let { config: _config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let capturePermissionResolver = singletonRequire('CapturePermissionResolver')
_config.request_capture_permission = false
console.show()
let result = requestScreenCapture(false)
log('请求截图权限：' + result)

let screen = captureScreen()
log('请求截图：' + screen.width)


let requestResult = capturePermissionResolver.releaseAndRequestScreenCapture()
log('重新获取截图权限：' + requestResult)

screen = captureScreen()
log('请求截图：' + screen.width)

screen = captureScreen()
log('请求截图：' + screen.width)

toastLog('结束')