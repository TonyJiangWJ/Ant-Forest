/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-02 19:27:26
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-02 20:29:47
 * @Description: 
 */
// let { floatyUtil } = require('../lib/FloatyUtil.js')
let FloatyInstance = require('../lib/FloatyUtil.js')
let { tester } =  require('./FloatyTest2.js')

FloatyInstance.setFloatyInfo({x: 200, y: 1500}, 'Hello. World!')
sleep(1000)
FloatyInstance.setFloatyTextColor('#ff0000')
FloatyInstance.setFloatyInfo({x: 200, y: 1500}, 'Ready For Test!')
sleep(2000)
tester.run()
setTimeout(function () {
  exit()
}, 10000)