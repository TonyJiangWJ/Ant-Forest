/*
 * @Author: TonyJiangWJ
 * @Date: 2020-01-13 17:05:34
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-01-19 23:16:11
 * @Description: 
 */
let bounds = null
bounds = {
  left: 126,
  top: 607,
  right: 288,
  bottom: 786
}
// bounds = {
//   left: 181,
//   top: 398,
//   right: 343,
//   bottom: 577
// }
toast('please wait')
sleep(1000)

requestScreenCapture()
let screen = captureScreen()
let center_h = parseInt((bounds.bottom - bounds.top) * 1.5 / 2)
let width = bounds.right - bounds.left + 5
let ball = images.clip(screen, bounds.left + parseInt(width * 0.2), bounds.top + parseInt(center_h / 2), parseInt(0.6 * width), parseInt(0.5 * center_h))
ball = images.interval(ball, "#61a075", 30)
let content = 'data:image/png;base64,' + images.toBase64(ball)
log(content)
// console.show()
toastLog(images.findColor(ball, '#FFFFFF') ? 'found' : 'not found')
ball.recycle()
screen.recycle()