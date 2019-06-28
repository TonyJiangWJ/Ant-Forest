/**
 * 测试用模块
 */


let { WidgetUtils } = require('./WidgetUtils.js')
let { commonFunctions } = require('./CommonFunction.js')
let { config } = require('../config.js')
let { automator } = require('./Automator.js')

const getEnergy = function () {
  let currentEnergyWidgetContainer = WidgetUtils.widgetGetOne('\\d+g', null, true)
  let currentEnergy = undefined
  if (currentEnergyWidgetContainer) {
    let target = currentEnergyWidgetContainer.target
    let isDesc = currentEnergyWidgetContainer.isDesc
    if (isDesc) {
      currentEnergy = parseInt(target.desc().match(/\d+/))
    } else {
      currentEnergy = parseInt(target.text().match(/\d+/))
    }
    toastLog(currentEnergy)
  } else {
    toastLog('cant found energy')
  }
}

getEnergy()
automator.back()