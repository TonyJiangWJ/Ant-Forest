let bounds = {
  left: 181,
  top: 398,
  right: 343,
  bottom: 577
}
toast('please wait')
sleep(1000)

requestScreenCapture()
let screen = captureScreen()
let center_h = parseInt((bounds.bottom - bounds.top) / 2)
let width = bounds.right - bounds.left + 5
let ball = images.clip(screen, bounds.left, bounds.top + parseInt(center_h / 2), width, center_h)
let content = 'data:image/png;base64,' + images.toBase64(ball)
log(content)
console.show()
ball.recycle()
screen.recycle()