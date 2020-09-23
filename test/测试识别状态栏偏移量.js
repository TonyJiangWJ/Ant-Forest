/*
 * @Author: TonyJiangWJ
 * @Date: 2020-09-17 18:58:30
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-09-23 23:30:42
 * @Description: 
 */
requestScreenCapture()
let DETECT_COLOR = '#10FF1F'
let window = floaty.rawWindow(
  <frame id="container" gravity="center" bg="#10FF1F">
    <horizontal margin="10 0" gravity="center">
      <text id="text" text="TEXT FLOATY" textSize="10sp" />
    </horizontal>
  </frame>
)
let offset = null
window.setPosition(100, 0)
window.exitOnClose()

setInterval(() => {
  // 啥也不干 防止退出
}, 500)
// 等待悬浮窗初始化
sleep(300)
let limit = 3
while (!offset && offset !== 0) {
  let screen = captureScreen()
  if (screen) {
    let point = images.findColor(screen, DETECT_COLOR, { region: [80, 0, 100, 300], threshold: 1 })
    if (point && images.detectsColor(screen, DETECT_COLOR, point.x + 20, point.y) && images.detectsColor(screen, DETECT_COLOR, point.x + 30, point.y)) {
      offset = point.y
      toastLog('find offset info:' + offset + "," + point.x)
      ui.run(function () {
        if (offset) {
          window.text.setText('刘海偏移量为：' + offset + ' ' + limit + '秒后退出')
        }
      })
      setTimeout(() => {
        window.close()
      }, limit * 1000)
    }
  }
}