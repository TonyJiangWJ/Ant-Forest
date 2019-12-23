/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-04 18:09:36
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-04 21:39:34
 * @Description: 
 */
let ImgBasedFriendListScanner = require('../core/ImgBasedFriendListScanner')
requestScreenCapture(false)
let scanner = new ImgBasedFriendListScanner()
scanner.start()
sleep(2000)
log('再见') 