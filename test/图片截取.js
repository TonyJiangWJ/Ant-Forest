/*
 * @Author: TonyJiangWJ
 * @Date: 2020-01-13 17:05:34
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-01-16 23:21:59
 * @Description: 
 */
let bounds = {
  left: 233,
  top: 522,
  right: 396,
  bottom: 701
}
toast('please wait')
sleep(1000)

requestScreenCapture()
let screen = captureScreen()
let center_h = parseInt((bounds.bottom - bounds.top) * 1.5 / 2)
let width = bounds.right - bounds.left + 5
let ball = images.clip(screen, bounds.left, bounds.top + center_h, width, center_h)
let content = 'data:image/png;base64,' + images.toBase64(ball)
log(content)
console.show()
ball.recycle()
screen.recycle()