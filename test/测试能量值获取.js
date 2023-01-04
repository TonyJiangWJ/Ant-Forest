/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-30 17:17:27
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-26 22:47:51
 * @Description: 
 */
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let { debugInfo, logInfo, errorInfo, warnInfo, infoLog } = singletonRequire('LogUtils')
let widgetUtils = singletonRequire('WidgetUtils')
let start = new Date().getTime()
let _VisualHelper = require('../utils/VisualHelper.js')

config.enable_visual_helper = true
let visualHelper = new _VisualHelper()
visualHelper.init()
visualHelper.disableTip()
let youGet = widgetUtils.widgetGetOne('你收取TA.*')
if (youGet) {
  let bd = youGet.bounds()
  let region = [bd.left - 5, bd.top - 5, bd.right - bd.left + 10, (bd.bottom - bd.top) * 2.2]
  visualHelper.addRectangle('查找收取能量范围', region)
  let energySum = widgetUtils.widgetGetOne(/.*\d+g/, null, null, false, matcher => matcher.boundsInside(region[0], region[1], region[0] + region[2], region[1] + region[3]))
  if (energySum) {
    if (energySum.desc()) {
      toastLog('能量值：' + energySum.desc().match(/\d+/))
    } else if (energySum.text()) {
      toastLog('能量值：' + energySum.text().match(/\d+/))
    }
  }
}
console.show()
setTimeout(() => {}, 5000)