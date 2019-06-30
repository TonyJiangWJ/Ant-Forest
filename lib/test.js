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

const getRankListBottom = function () {
  toastLog(idMatches(/.*J_rank_list_self/).findOnce().bounds().bottom)
}
/*
const getFriendEnergy = function () {
  let energyWidget = WidgetUtils.widgetGetOne(/\d+g/)
  if (energyWidget) {
    if (energyWidget.desc()) {
      return energyWidget.desc().match(/\d+/)
    } else {
      return energyWidget.text().match(/\d+/)
    }
  }
  return null
}
*/
const wateringFriends = function () {
  let wateringWidget = WidgetUtils.widgetGetOne("浇水")
  if (wateringWidget) {
    let bounds = wateringWidget.bounds()
    automator.click(bounds.centerX(), bounds.centerY())
    toastLog("found wateringWidget:" + wateringWidget.bounds())
  } else {
    toastLog("not found")
  }

}
let count = 5
while (count-- > 0) {

  wateringFriends()
  sleep(2000)
}
toastLog("done")
//toastLog(getFriendEnergy())
//toast(WidgetUtils.getYouCollectEnergy())
/*
 try {
      let postGet = WidgetUtils.getYouCollectEnergy()
      let preGot=1
      if (postGet && preGot) {
        let gotEnergy = postGet - preGot
        toastLog("开始收集前:"+preGot+"收集后:"+postGet)
        toastLog("收取好友能量 " + gotEnergy + "g")
      } else {
          toastLog("获取数据失败，开始收集前:"+preGot+"收集后:"+postGet)

       }
      }catch(e){
          console.error(e)
       }*/