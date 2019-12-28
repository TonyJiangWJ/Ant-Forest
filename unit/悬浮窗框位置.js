/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-28 11:42:07
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-28 14:25:58
 * @Description: 
 */
let window = floaty.window(
  <frame id="container" gravity="center" bg="#FFFF00" alpha="0.4">
    <text id="id" text="TEXT FLOATY" />
  </frame>
)
window.setPosition(190, 170)
// window.setSize(800, 100)
window.exitOnClose()
window.container.click(() => {
  window.setAdjustEnabled(!window.isAdjustEnabled())
})
setInterval(() => {
  ui.run(function (){
    // window.id.setText(window.getX() + ',' + window.getY() + ',' + window.getWidth() + ',' + window.getHeight())
    window.id.setText(window.getX() + ',' + (window.getY() + 75) + ',' + window.container.getWidth() + ',' + window.container.getHeight())
  })
}, 500)