/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-28 20:34:34
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-28 20:40:38
 * @Description: 
 */
requestScreenCapture(false)
let _BaseScanner = require('../core/BaseScanner.js')
let _base_scanner = new _BaseScanner()
sleep(1300)
let nightBall = _base_scanner.checkByImg('#a0a0a0', '#a3a3a3', '夜间倒计时')
let daytimeBall = _base_scanner.checkByImg('#dadada', '#dedede', '白天倒计时')
log('夜间倒计时能量球：' + JSON.stringify(nightBall))
log('白天倒计时能量球：' + JSON.stringify(daytimeBall))
sleep(300)
console.show()