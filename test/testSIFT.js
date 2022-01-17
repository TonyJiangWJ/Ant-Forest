let { config: _config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let original = './originImg.png'
let template = './templateImg.png'

let start = new Date().getTime()
let resultPoints = OpenCvUtil.findBySIFTPath(original, template)
console.verbose('找图耗时：' + (new Date().getTime() - start) + 'ms')
if (resultPoints) {
  toastLog('找到目标图片 位置：' + JSON.stringify(resultPoints))
} else {
  toastLog('未找到目标图片')
}

start = new Date().getTime()
resultPoints = OpenCvUtil.findBySimplePath(original, template)
console.verbose('普通找图耗时：' + (new Date().getTime() - start) + 'ms')
if (resultPoints) {
  toastLog('找到目标图片 位置：' + JSON.stringify(resultPoints))
} else {
  toastLog('未找到目标图片')
}
