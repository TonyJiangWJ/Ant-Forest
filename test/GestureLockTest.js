/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-23 09:09:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-23 09:14:57
 * @Description: 
 */
let config = {
  alipay_lock_password: ''
}
let alipayUnlocker = require('../lib/AlipayUnlocker.js')

alipayUnlocker.drawGestureByPassword({
  left: 270,
  top: 400,
  right: 870,
  bottom: 1000
})