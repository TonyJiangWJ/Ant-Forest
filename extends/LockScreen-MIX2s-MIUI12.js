/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-27 23:46:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-29 15:16:23
 * @Description: 
 */
let { config: _config } = require('../config.js')(runtime, this)

module.exports = function () {
  // MIUI 12 新控制中心
  swipe(800, 10, 800, 500, 230)
  sleep(1000)
  // 点击锁屏按钮
  click(parseInt(_config.lock_x), parseInt(_config.lock_y))
}