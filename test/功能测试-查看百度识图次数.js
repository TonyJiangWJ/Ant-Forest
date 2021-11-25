/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-12 21:44:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-12 21:46:07
 * @Description: 
 */
let commonFunctions = require('../lib/prototype/CommonFunction.js')

let storageInfo = commonFunctions.getTodaysRuntimeStorage('baiduInvokeCount')
log(JSON.stringify(storageInfo))
log('今日已调用次数：' + storageInfo.count)
log('剩余次数：' + (500 - storageInfo.count))