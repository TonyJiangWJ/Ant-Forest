/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-12 19:18:10
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-12 19:24:48
 * @Description: 
 */
requestScreenCapture()

const reachBottom = function (grayImg) {
  let height = device.height
  log('设备高度：' + height)
  for (let startY = 1; startY < 50; startY++) {
    let colorGreen = grayImg.getBitmap().getPixel(10, height - startY) >> 8 & 0xFF
    if (Math.abs(colorGreen - 245) > 4) {
      log('[10,' + (height - startY) + ']颜色不匹配：' + colors.toString(colorGreen))
      return false
    }
  }
  return true
}
console.show()
let img = captureScreen()
let grayImg = images.grayscale(img)
if (reachBottom(grayImg)) {
  toastLog('到达底部')
} else {
  toastLog('未到达底部')
}