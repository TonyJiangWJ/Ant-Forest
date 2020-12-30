/*
 * @Author: TonyJiangWJ
 * @Date: 2020-07-29 14:39:26
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-30 20:59:47
 * @Description: 
 */
let { config: _config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let { debugInfo } = singletonRequire('LogUtils')
requestScreenCapture(false)
toastLog('两秒后开始识别')
sleep(2000)
let screen = captureScreen()
let scaleRate = _config.scaleRate
let checkColors = ['#1d9f4e', '#198A44']
let found = false
for (let colorIdx = 0; !found && colorIdx < checkColors.length; colorIdx++) {
  let checkColor = checkColors[colorIdx]
  let points = []
  // 横向约200个像素点
  let limit = 200 * scaleRate / 3
  for (let i = 0; i < limit; i++) {
    points.push([i, 0, checkColor])
  }
  let offset = parseInt(180 * scaleRate)
  let point = images.findMultiColors(screen, checkColor, points, { region: [offset, 50, _config.device_width - offset * 2, _config.device_height * 0.3] })
  if (point) {
    _config.rank_check_left = point.x
    _config.rank_check_top = point.y - 10
    _config.rank_check_width = parseInt(200 * scaleRate * 3)
    _config.rank_check_height = 30
    checkRegion = [_config.rank_check_left, _config.rank_check_top, _config.rank_check_width, _config.rank_check_height]
    debugInfo(['自动识别的排行榜识别区域为：[{}]', JSON.stringify(checkRegion)], true)
    found = true
  } else {
    debugInfo('未找到', true)
  }
}