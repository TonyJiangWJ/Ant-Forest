let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')
let AntForestDao = singletonRequire('AntForestDao')
let floatyInstance = singletonRequire('FloatyUtil')
let formatDate = require('../lib/DateUtil.js')
let changeAccount = require('../lib/AlipayAccountManage.js')

module.exports = function (BaseHandler) {
  // 扩展方法 
  BaseHandler.loadProtectedList = (data, callbackId) => {
    let protectList = commonFunctions.getFullTimeRuntimeStorage('protectList').protectList || []
    protectList.forEach(protectInfo => protectInfo.timeout = formatDate(new Date(protectInfo.timeout)))
    postMessageToWebView({ callbackId: callbackId, data: { protectList: protectList } })
  }
  BaseHandler.removeFromProtectList = (data, callbackId) => {
    log('移除保护罩使用记录：' + data.name)
    commonFunctions.removeFromProtectList(data.name)
    postMessageToWebView({ callbackId: callbackId, data: { success: true } })
  }
  BaseHandler.updateProtectList = (data, callbackId) => {
    log('更新保护罩使用信息:' + data.protectList)
    if (!data.protectList) {
      return
    }
    commonFunctions.updateProtectList(data.protectList.map(v => {
      v.timeout = new Date(v.timeout.replace(/-/g, '/')).getTime()
      return v
    }))
    postMessageToWebView({ callbackId: callbackId, data: { success: true } })
  }
  BaseHandler.startRainCollect = () => {
    BaseHandler.executeTargetScript("/unit/能量雨收集.js")
  }
  BaseHandler.checkIfInCooldown = (data, callbackId) => {
    postMessageToWebView({ callbackId: callbackId, data: { coolDownInfo: commonFunctions.checkIfNeedCoolDown() } })
  }
  BaseHandler.showRealtimeVisualConfig = () => {
    BaseHandler.executeTargetScript('/test/全局悬浮窗显示-配置信息.js')
  }
  BaseHandler.ocrInvokeCount = (data, callbackId) => {
    let invokeStorage = commonFunctions.getBaiduInvokeCountStorage()
    console.log(JSON.stringify(invokeStorage))
    postMessageToWebView({ callbackId: callbackId, data: '今日已调用次数:' + invokeStorage.count + (' 剩余:' + (500 - invokeStorage.count)) })
  }

  BaseHandler.pageCollectInfo = (data, callbackId) => {
    let pageResult = null
    if (data.groupByFriend) {
      pageResult = AntForestDao.pageGroupedCollectInfo(data)
    } else {
      pageResult = AntForestDao.pageCollectInfo(data)
      if (pageResult.result && pageResult.result.length > 0) {
        pageResult.result.forEach(collect => collect.createTime = formatDate(collect.createTime))
      }
    }
    postMessageToWebView({ callbackId: callbackId, data: pageResult })
  }

  BaseHandler.getCollectSummary = (data, callbackId) => {
    let result = AntForestDao.getCollectSummary(data)
    postMessageToWebView({ callbackId: callbackId, data: result })
  }

  BaseHandler.getMyEnergyIncreased = (data, callbackId) => {
    let result = AntForestDao.getMyEnergyIncreased(data)
    postMessageToWebView({ callbackId: callbackId, data: { totalIncreased: result } })
  }

  BaseHandler.getMyEnergyByDate = (data, callbackId) => {
    let result = AntForestDao.getMyEnergyByDate(data)
    postMessageToWebView({ callbackId: callbackId, data: result })
  }

  BaseHandler.queryDailyCollectByDate = (data, callbackId) => {
    let result = AntForestDao.queryDailyCollectByDate(data.startDate, data.endDate)
    postMessageToWebView({ callbackId: callbackId, data: result })
  }

  BaseHandler.queryMyDailyEnergyByDate = (data, callbackId) => {
    let result = AntForestDao.queryMyDailyEnergyByDate(data.startDate, data.endDate)
    postMessageToWebView({ callbackId: callbackId, data: result })
  }


  BaseHandler.changeAlipayAccount = (data, callbackId) => {
    threads.start(function () {
      changeAccount(data.account)
      floatyInstance.close()
      commonFunctions.minimize()
    })
  }

  BaseHandler.getCurrentIncreased = (data, callbackId) => {

    let date = formatDate(new Date(), 'yyyy-MM-dd')
    let timeStart = formatDate(new Date(new Date().getTime() - 3600000))
    let timeEnd = formatDate(new Date())
    // 获取1小时内收集的能量总数
    let { increased } = AntForestDao.getCollectInTimeRange(date, timeStart)
    let { increased:energyIncreased } = AntForestDao.getIncreasedInTimeRange(date, timeStart, timeEnd)

    postMessageToWebView({ callbackId: callbackId, data: { collected: increased, energyIncreased: energyIncreased }})
  }

  return BaseHandler
}
