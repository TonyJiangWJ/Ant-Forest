/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-27 23:41:15
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-07 11:03:02
 * @Description: 测试排行榜
 */
importClass(java.lang.Thread)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let widgetUtils = singletonRequire('WidgetUtils')

toastLog('thread:' + Thread.currentThread().getId())
if (requestScreenCapture(false)) {
  if (widgetUtils.friendListWaiting()) {
    toastLog('yes')
  } else {
    toastLog('no')
  }
} else {
  toastLog('获取截图权限失败')
}