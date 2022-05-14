let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')
let AntForestDao = singletonRequire('AntForestDao')
let floatyInstance = singletonRequire('FloatyUtil')
let timers = singletonRequire('Timers')
let dateFormat = require('../lib/DateUtil.js')
let changeAccount = require('../lib/AlipayAccountManage.js')

module.exports = function (BaseHandler) {
  let rootPath = FileUtils.getCurrentWorkPath()
  // 扩展方法 
  BaseHandler.loadProtectedList = (data, callbackId) => {
    let protectList = commonFunctions.getFullTimeRuntimeStorage('protectList').protectList || []
    protectList.forEach(protectInfo => protectInfo.timeout = dateFormat(new Date(protectInfo.timeout)))
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
    executeScript("/unit/能量雨收集.js")
  }
  BaseHandler.cancelCurrentCoolDown = () => {
    commonFunctions.cancelCurrentCoolDown()
    toastLog('撤销成功')
  }
  BaseHandler.checkIfInCooldown = (data, callbackId) => {
    postMessageToWebView({ callbackId: callbackId, data: { coolDownInfo: commonFunctions.checkIfNeedCoolDown() } })
  }
  BaseHandler.showRealtimeVisualConfig = () => {
    executeScript('/test/全局悬浮窗显示-配置信息.js')
  }
  BaseHandler.ocrInvokeCount = (data, callbackId) => {
    let invokeStorage = commonFunctions.getBaiduInvokeCountStorage()
    console.log(JSON.stringify(invokeStorage))
    postMessageToWebView({ callbackId: callbackId, data: '今日已调用次数:' + invokeStorage.count + (' 剩余:' + (500 - invokeStorage.count)) })
  }

  BaseHandler.pageCollectInfo = (data, callbackId) => {
    let pageResult = AntForestDao.pageCollectInfo(data)
    if (pageResult.result && pageResult.result.length > 0) {
      pageResult.result.forEach(collect => collect.createTime = dateFormat(collect.createTime))
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

  BaseHandler.changeAlipayAccount = (data, callbackId) => {
    threads.start(function () {
      changeAccount(data.account)
      floatyInstance.close()
      commonFunctions.minimize()
    })
  }

  BaseHandler.executeTargetScript = (path) => {
    executeScript(path)
  }

  BaseHandler.queryTargetTimedTaskInfo = (data, callbackId) => {
    postMessageToWebView({ callbackId: callbackId, data: queryTargetTimedTaskInfo(rootPath + data.path) })
  }

  return BaseHandler

  function executeScript (subPath) {

    // 不在ui线程启动的话会丢失线程上下文，导致执行异常
    ui.run(function () {
      let source = rootPath + subPath
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
    })
  }

  function queryTargetTimedTaskInfo (targetScriptPath) {
    console.log(`查找目标：${targetScriptPath}`)
    let resultList = timers.queryTimedTasks({ path: targetScriptPath })
    console.log(`result: ${JSON.stringify(resultList)}`)
    if (resultList && resultList.length > 0) {
      return resultList.map(task => {
        let desc = checkAll(task.getTimeFlag())
        let time = format(Math.floor(task.getMillis() / 3600000)) + ':' + format(task.getMillis() % 3600000 / 60000)
        if (0x0 == task.getTimeFlag()) {
          time = new java.text.SimpleDateFormat('yyyy-MM-dd HH:mm:ss').format(new java.util.Date(task.getMillis()))
        }
        return desc + '' + time
      }).join(';')
    }
    return ''
  }

  function format(val) {
    if (val.length < 2) {
      return '0' + val
    }
    return val
  }

  function checkAll (timeFlag) {

    let flagMap = {
      '0': { code: 'FLAG_DISPOSABLE', desc: '执行一次' },
      '1': { code: 'FLAG_SUNDAY', desc: '每周日' },
      '2': { code: 'FLAG_MONDAY', desc: '每周日一' },
      '4': { code: 'FLAG_TUESDAY', desc: '每周二' },
      '8': { code: 'FLAG_WEDNESDAY', desc: '每周三' },
      '16': { code: 'FLAG_THURSDAY', desc: '每周四' },
      '32': { code: 'FLAG_FRIDAY', desc: '每周五' },
      '64': { code: 'FLAG_SATURDAY', desc: '每周六' },
      '127': { code: 'FLAG_EVERYDAY', desc: '每天' }
    }
    let result = []
    if (0x0 === timeFlag || 0x7F === timeFlag) {
      result = [flagMap[timeFlag]]
    } else {
      result.push(flagMap[0x01 & timeFlag])
      result.push(flagMap[0x02 & timeFlag])
      result.push(flagMap[0x04 & timeFlag])
      result.push(flagMap[0x08 & timeFlag])
      result.push(flagMap[0x10 & timeFlag])
      result.push(flagMap[0x20 & timeFlag])
      result.push(flagMap[0x40 & timeFlag])
    }
    return result.filter(v => typeof v !== 'undefined').map(v => v.desc).join(',')
  }
}
