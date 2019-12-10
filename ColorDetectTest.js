/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-04 18:09:36
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-06 15:25:49
 * @Description: 
 */
runtime.loadDex('./lib/autojs-tools.dex')
let FloatyInstance = require('./lib/FloatyUtil.js')
let ImgBasedFriendListScanner = require('./core/ImgBasedFriendListScanner')

FloatyInstance.init()
requestScreenCapture(false)
let scanner = new ImgBasedFriendListScanner()
scanner.start()

sleep(2000)
log('再见') 

