/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-05 09:12:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-09 17:33:25
 * @Description: 
 */

let { config: _config } = require('../config.js')(runtime, this)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo
} = singletonRequire('LogUtils')

const BaseWidgetUtils = function () {
  /**
   * 切换控件获取的模式，正常模式基本能获取到当前最新的数据 快速模式会直接获取已缓存的控件信息，但是控件内容并不一定是最新的，目前来说没啥用
   * @param {number} newMode 0或1 正常模式或快速模式
   */
  this.changeMode = function (newMode) {
    try {
      let clz = runtime.accessibilityBridge.getClass()
      clz = clz.getSuperclass()
      let field = clz.getDeclaredField('mMode')
      field.setAccessible(true)
      let mode = parseInt(field.get(runtime.accessibilityBridge))
      debugInfo(['current mode: {}', mode === 0 ? 'NORMAL' : 'FAST'])
      runtime.accessibilityBridge.setMode(newMode)
      mode = parseInt(field.get(runtime.accessibilityBridge))
      debugInfo(['mode after set: {}', mode === 0 ? 'NORMAL' : 'FAST'])
    } catch (e) {
      console.error('执行异常' + e)
    }
  }

  this.enableFastMode = function () {
    this.changeMode(1)
  }

  this.enableNormalMode = function () {
    this.changeMode(0)
  }

  /**
   * 判断控件A或者控件B是否存在；超时返回0 找到A返回1 否则返回2
   * 
   * @param {string|regex} contentA 控件A的内容
   * @param {string|regex} contentB 控件B的内容
   * @param {number} timeout 超时时间
   * @param {boolean} containContent 是否传递实际内容
   * @return 超时返回0 找到A返回1 否则返回2
   */
  this.alternativeWidget = function (contentA, contentB, timeout, containContent) {
    timeout = timeout || _config.timeout_existing
    let timeoutFlag = true
    let countDown = new java.util.concurrent.CountDownLatch(1)
    let matchRegexA = new RegExp(contentA)
    let matchRegexB = new RegExp(contentB)
    let isDesc = false, findA = false
    let res = null, target = null
    let descThreadA = threads.start(function () {
      descMatches(matchRegexA).waitFor()
      target = descMatches(matchRegexA).findOne()
      res = target.desc()
      debugInfo('find desc ' + contentA + " " + res)
      timeoutFlag = false
      isDesc = true
      findA = true
      countDown.countDown()
    })

    let textThreadA = threads.start(function () {
      textMatches(matchRegexA).waitFor()
      target = textMatches(matchRegexA).findOne()
      res = target.text()
      debugInfo('find text ' + contentA + "  " + res)
      timeoutFlag = false
      findA = true
      countDown.countDown()
    })
    let descThreadB = threads.start(function () {
      descMatches(matchRegexB).waitFor()
      descMatches(matchRegexB).findOne()
      res = target.desc()
      debugInfo('find desc ' + contentB + " " + res)
      timeoutFlag = false
      isDesc = true
      countDown.countDown()
    })

    let textThreadB = threads.start(function () {
      textMatches(matchRegexB).waitFor()
      target = textMatches(matchRegexB).findOne()
      res = target.text()
      debugInfo('find text ' + contentB + "  " + res)
      timeoutFlag = false
      countDown.countDown()
    })

    let timeoutThread = threads.start(function () {
      sleep(timeout)
      countDown.countDown()
    })
    countDown.await()
    descThreadA.interrupt()
    textThreadA.interrupt()
    descThreadB.interrupt()
    textThreadB.interrupt()
    timeoutThread.interrupt()
    if (timeoutFlag) {
      debugInfo(['cannot find any matches {} or {}', contentA, contentB])
    }
    // 超时返回0 找到A返回1 否则返回2
    let returnVal = timeoutFlag ? 0 : (findA ? 1 : 2)
    if (containContent) {
      return {
        target: target,
        content: res,
        value: returnVal
      }
    } else {
      return returnVal
    }
  }

  /**
   * 校验控件是否存在，并打印相应日志
   * @param {String} contentVal 控件文本
   * @param {String} position 日志内容 当前所在位置是否成功进入
   * @param {Number} timeoutSetting 超时时间 单位毫秒 默认为_config.timeout_existing
   */
  this.widgetWaiting = function (contentVal, position, timeoutSetting) {
    let waitingSuccess = this.widgetCheck(contentVal, timeoutSetting)
    position = position || contentVal
    if (waitingSuccess) {
      debugInfo('等待控件成功：' + position)
      return true
    } else {
      errorInfo('等待控件[' + position + ']失败, 查找内容：' + contentVal)
      return false
    }
  }

  /**
   * 校验控件是否存在
   * @param {String} contentVal 控件文本
   * @param {Number} timeoutSetting 超时时间 单位毫秒 不设置则为_config.timeout_existing
   * @param {Boolean} containType 返回结果附带文本是desc还是text
   * 超时返回false
   */
  this.widgetCheck = function (contentVal, timeoutSetting, containType) {
    let timeout = timeoutSetting || _config.timeout_existing
    let timeoutFlag = true
    let countDown = new java.util.concurrent.CountDownLatch(1)
    let matchRegex = new RegExp(contentVal)
    let isDesc = false
    let descThread = threads.start(function () {
      descMatches(matchRegex).waitFor()
      let res = descMatches(matchRegex).findOne().desc()
      debugInfo('find desc ' + contentVal + " " + res)
      timeoutFlag = false
      isDesc = true
      countDown.countDown()
    })

    let textThread = threads.start(function () {
      textMatches(matchRegex).waitFor()
      let res = textMatches(matchRegex).findOne().text()
      debugInfo('find text ' + contentVal + "  " + res)
      timeoutFlag = false
      countDown.countDown()
    })

    let timeoutThread = threads.start(function () {
      sleep(timeout)
      countDown.countDown()
    })
    countDown.await()
    descThread.interrupt()
    textThread.interrupt()
    timeoutThread.interrupt()
    if (timeoutFlag) {
      debugInfo('cannot find any matches ' + contentVal + ' timeout:' + timeout)
    }
    if (containType) {
      return {
        timeout: timeoutFlag,
        isDesc: isDesc
      }
    }
    return !timeoutFlag
  }

  /**
   * id检测
   * @param {string|RegExp} idRegex 
   * @param {number} timeoutSetting 
   */
  this.idCheck = function (idRegex, timeoutSetting) {
    let timeout = timeoutSetting || _config.timeout_existing
    let timeoutFlag = true
    let countDown = new java.util.concurrent.CountDownLatch(1)
    let idCheckThread = threads.start(function () {
      idMatches(idRegex).waitFor()
      debugInfo('find id ' + idRegex)
      timeoutFlag = false
      countDown.countDown()
    })

    let timeoutThread = threads.start(function () {
      sleep(timeout)
      countDown.countDown()
    })
    countDown.await()
    idCheckThread.interrupt()
    timeoutThread.interrupt()
    if (timeoutFlag) {
      warnInfo(['未能找到id:{}对应的控件', idRegex])
    }
    return !timeoutFlag
  }

  /**
   * 校验控件是否存在，并打印相应日志
   * @param {String} idRegex 控件文本
   * @param {String} position 日志内容 当前所在位置是否成功进入
   * @param {Number} timeoutSetting 超时时间 默认为_config.timeout_existing
   */
  this.idWaiting = function (idRegex, position, timeoutSetting) {
    let waitingSuccess = this.idCheck(idRegex, timeoutSetting)
    position = position || idRegex
    if (waitingSuccess) {
      debugInfo('等待控件成功：' + position)
      return true
    } else {
      errorInfo('等待控件[' + position + ']失败， id：' + idRegex)
      return false
    }
  }

  /**
   * 根据id获取控件信息
   * @param {String|RegExp} idRegex id
   * @param {number} timeout 超时时间
   * @return 返回找到的控件，否则null
   */
  this.widgetGetById = function (idRegex, timeout) {
    timeout = timeout || _config.timeout_findOne
    let target = null
    if (this.idCheck(idRegex, timeout)) {
      idRegex = new RegExp(idRegex)
      target = idMatches(idRegex).findOne(timeout)
    }
    return target
  }

  /**
   * 根据内容获取一个对象
   * 
   * @param {string} contentVal 
   * @param {number} timeout 
   * @param {boolean} containType 是否带回类型
   * @param {boolean} suspendWarning 是否隐藏warning信息
   */
  this.widgetGetOne = function (contentVal, timeout, containType, suspendWarning) {
    let target = null
    let isDesc = false
    let waitTime = timeout || _config.timeout_existing
    let timeoutFlag = true
    debugInfo(['try to find one: {} timeout: {}ms', contentVal.toString(), waitTime])
    let checkResult = this.widgetCheck(contentVal, waitTime, true)
    if (!checkResult.timeout) {
      timeoutFlag = false
      let matchRegex = new RegExp(contentVal)
      if (!checkResult.isDesc) {
        target = textMatches(matchRegex).findOne(_config.timeout_findOne)
      } else {
        isDesc = true
        target = descMatches(matchRegex).findOne(_config.timeout_findOne)
      }
    }
    // 当需要带回类型时返回对象 传递target以及是否是desc
    if (target && containType) {
      let result = {
        target: target,
        isDesc: isDesc,
        content: isDesc ? target.desc() : target.text()
      }
      return result
    }
    if (timeoutFlag) {
      if (suspendWarning) {
        debugInfo('timeout for finding ' + contentVal)
      } else {
        warnInfo('timeout for finding ' + contentVal)
      }
    }
    return target
  }

  /**
   * 根据内容获取所有对象的列表
   * 
   * @param {string} contentVal 
   * @param {number} timeout 
   * @param {boolean} containType 是否传递类型
   */
  this.widgetGetAll = function (contentVal, timeout, containType) {
    let target = null
    let isDesc = false
    let timeoutFlag = true
    let waitTime = timeout || _config.timeout_existing
    debugInfo(['try to find all: {} timeout: {}ms', contentVal.toString(), waitTime])
    let checkResult = this.widgetCheck(contentVal, waitTime, true)
    if (!checkResult.timeout) {
      timeoutFlag = false
      let matchRegex = new RegExp(contentVal)
      if (!checkResult.isDesc) {
        target = textMatches(matchRegex).untilFind()
      } else {
        isDesc = true
        target = descMatches(matchRegex).untilFind()
      }
    }
    if (timeoutFlag && !target) {
      return null
    } else if (target && containType) {
      let result = {
        target: target,
        isDesc: isDesc
      }
      return result
    }
    return target
  }
}

module.exports = BaseWidgetUtils