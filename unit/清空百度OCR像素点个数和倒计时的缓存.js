/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-01 12:17:50
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-01 12:20:36
 * @Description: 
 */
let sRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _logUtils = sRequire('LogUtils')
let baiduOcrUtil = require('../lib/BaiduOcrUtil.js')
_logUtils.logInfo('当前缓存的数据：')
baiduOcrUtil.showAllCached()

_logUtils.logInfo('清空缓存信息')
baiduOcrUtil.clearAllCached()
baiduOcrUtil.showAllCached()
_logUtils.logInfo('done', true)