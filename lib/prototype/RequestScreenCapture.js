/*
 * @Author: TonyJiangWJ
 * @Date: 2020-12-30 20:16:48
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-05-29 10:22:15
 * @Description: 
 */
let { config } = require('../../config.js')(runtime, global)
let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let widgetUtils = singletonRequire('WidgetUtils')
let logUtils = singletonRequire('LogUtils')
let automator = singletonRequire('Automator')
module.exports = function (landscape) {
  let countDown = new java.util.concurrent.CountDownLatch(1)
  let requestSuccess = false
  let confirmWaitingThread = threads.start(function () {
    sleep(500)
    if (requestSuccess) {
      return
    }
    logUtils.warnInfo(['建议通过ADB授权截图权限，具体见常见问题，授权命令：adb shell appops set {} PROJECT_MEDIA allow', context.packageName])
    let confirmWidget = widgetUtils.widgetGetOne(config.capture_permission_button || 'START NOW|立即开始|允许')
    if (confirmWidget) {
      sleep(200)
      let remember = widgetUtils.widgetGetById("android:id/checkbox", 200)
      if (!remember) {
        remember = widgetUtils.widgetGetById("com.android.systemui:id/remember", 200)
      }
      if (remember) {
        logUtils.debugInfo('找到了记住按钮，点击记住')
        automator.clickCenter(remember)
        sleep(200)
      } else {
        logUtils.warnInfo('未找到记住按钮')
      }
      logUtils.debugInfo('点击允许截图权限')
      // 二次获取，理论上不会取不到
      confirmWidget = widgetUtils.widgetGetOne(config.capture_permission_button || 'START NOW|立即开始|允许', 200) || confirmWidget
      automator.clickCenter(confirmWidget)
    } else {
      logUtils.warnInfo(['未找到允许截图按钮，查找内容为：{}', config.capture_permission_button || 'START NOW|立即开始|允许'], true)
      countDown.countDown()
    }
  })
  let requestThread = threads.start(function () {
    requestSuccess = requestScreenCapture(landscape)
    countDown.countDown()
  })
  let waitResult = countDown.await(15, java.util.concurrent.TimeUnit.SECONDS)
  if (!waitResult) {
    logUtils.warnInfo('请求截屏权限超时')
  }
  logUtils.debugInfo('请求截屏权限结束：' + requestSuccess)
  if (!requestSuccess) {
    logUtils.warnInfo('请求截屏权限失败，如果显示选择应用范围，请在开发者选项中开启 停用屏幕共享防护 具体见常见问题', true)
  }
  confirmWaitingThread.interrupt()
  requestThread.interrupt()
  return requestSuccess
}