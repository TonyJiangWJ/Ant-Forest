/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-02 19:27:26
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-02 20:35:07
 * @Description: 
 */
// let { floatyUtil } = require('../lib/FloatyUtil.js')
let FloatyInstance = require('../lib/FloatyUtil.js')
let FloatyInstance2 = require('../lib/FloatyUtil.js')

FloatyInstance.setFloatyInfo({x: 200, y: 1500}, 'Hello. World!')
sleep(1000)
FloatyInstance.setFloatyTextColor('#ff0000')
FloatyInstance.setFloatyInfo({x: 200, y: 1500}, 'Ready For Test!')
sleep(1000)
// floaty.closeAll()
// FloatyInstance.close()
sleep(2000)
FloatyInstance2.setFloatyTextColor('#00ff00')
FloatyInstance2.setFloatyInfo({x: 200, y: 1500}, 'Test Instance2!')
setTimeout(function () {
  exit()
}, 10000)