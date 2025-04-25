
let { config } = require('../../config.js')(runtime, global)
let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, global)
let automator = singletonRequire('Automator')
let commonFunctions = singletonRequire('CommonFunction')
let FloatyInstance = singletonRequire('FloatyUtil')
let logFloaty = singletonRequire('LogFloaty')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let widgetUtils = singletonRequire('WidgetUtils')

module.exports = {
  Market: Market,
}


function Market () {
  const _this = this
  function startApp (reopen) {
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=2019072665961762&page=pages%2Fant%2Findex%3F%24%24_share_uid%3Dr9D1H0xiGjQBASQIhCEXn3n9%26%24%24_utm_medium%3D3&enbsv=0.2.2503111357.59&chInfo=ch_share__chsub_CopyLink&fxzjshareChinfo=ch_share__chsub_CopyLink&shareTimestamp=1741767573196&apshareid=619a04b2-24f0-4035-8170-761779f0c278&shareBizType=H5App_XCX',
      packageName: config.package_name
    })
    FloatyInstance.setFloatyInfo({ x: config.device_width / 2, y: config.device_height / 2 }, "查找是否有'打开'对话框")
    let confirm = widgetUtils.widgetGetOne(/^打开$/, 1000)
    if (confirm) {
      automator.clickCenter(confirm)
    }
    if (openAlipayMultiLogin(reopen)) {
      return
    }
    if (config.is_alipay_locked) {
      sleep(1000)
      alipayUnlocker.unlockAlipay()
    }
    if (widgetUtils.widgetWaiting('绿色商品', null)) {
      return true
    }
    warnInfo(['无法校验 绿色商品 控件，可能没有正确打开'], true)
    return false
  }

  function openAlipayMultiLogin (reopen) {
    if (config.multi_device_login && !reopen) {
      debugInfo(['已开启多设备自动登录检测，检查是否有 进入支付宝 按钮'])
      let entryBtn = widgetUtils.widgetGetOne(/^进入支付宝$/, 1000)
      if (entryBtn) {
        automator.clickCenter(entryBtn)
        sleep(1000)
        startApp()
        return true
      } else {
        debugInfo(['未找到 进入支付宝 按钮'])
      }
    }
  }


  this.isDone = function () {
    return widgetUtils.widgetGetOne('下单得能量', 1000, false, false, matcher => {
      return matcher.className('android.widget.TextView').filter(node => node && node.bounds().left > config.device_width / 2)
    })
  }

  this.doHangOut = function (retry) {

    let tryLimit = 10
    let taskRunner = new TaskRunner()
    while (tryLimit-- > 0) {
      if (this.isDone()) {
        logFloaty.pushLog('今日任务已经完成了 退出执行')
        sleep(1000)
        return true
      }
      if (!taskRunner.run()) {
        debugInfo(['未能匹配到任何执行器'])
        if (checkIfInVerify()) {
          return false
        }
        if (!widgetUtils.widgetCheck('绿色商品', 2000)) {
          logFloaty.pushErrorLog('当前不在森林集市界面，重新打开')
          commonFunctions.minimize()
          if (!startApp()) {
            logFloaty.pushErrorLog('重新打开森林集市失败')
            return false
          }
        }
      }
      // 放弃按钮 遮挡界面
      let drop = widgetUtils.widgetGetOne('放弃', 3000)
      if (drop) {
        automator.clickCenter(drop)
        sleep(1000)
      }
    }
    logFloaty.pushWarningLog('未能找到任务完结按钮，可能界面有阻断')
    return false
  }

  this.exec = function () {
    let retry = 0
    let opened = false
    let success = false
    let errorInfo = ''
    let errorType = 0
    logFloaty.pushLog('准备打开森林集市')
    while ((opened = startApp()) == false && retry++ < 3) {
      if (checkIfInVerify()) {
        errorInfo = '触发身份验证'
        break
      }
      warnInfo('打开森林集市失败')
      sleep(1000)
      home()
      sleep(1000)
    }
    if (opened) {
      try {
        if (this.doHangOut()) {
          success = true
        } else {
          errorInfo = '任务执行失败，稍后重试'
          errorType = 3
        }
      } catch (e) {
        errorInfo(['任务执行异常：{}', e])
        errorInfo = '任务执行异常' + e
        errorType = 2
      }
    } else {
      logFloaty.pushErrorLog('打开森林集市界面失败')
      errorInfo = '打开森林集市界面失败'
      errorType = 1
    }
    return {
      success: success,
      errorInfo: errorInfo,
      errorType: errorType,
    }
  }

}

function BrowserExecutor () {
  this.check = function () {
    return !!widgetUtils.widgetGetOne('浏览商品\\d+s', 2000)
  }

  this.execute = function () {
    logFloaty.pushLog('找到了倒计时控件，开始浏览商品')
    let maxTry = 5
    let breakLoop = false
    while (maxTry-- > 0 && widgetUtils.widgetGetOne('浏览商品\\d+s', 1000)) {
      // 按顺序点来点去
      ['greenConsumer', 'greenFood', 'furniture', 'greenItem'].forEach(id => {
        if (breakLoop) {
          return
        }
        let target = widgetUtils.widgetGetById(id, 1000)
        if (target) {
          target.click()
          sleep(3000)
        }
        // 滑动一下 避免无法触发倒计时
        automator.randomScrollDown()
        breakLoop = clickRewardIfNeeded()
      })
    }
  }
}


function ClickExecutor () {
  this.check = function () {
    return !!widgetUtils.widgetGetOne('点击\\d+个商品', 2000)
  }

  this.execute = function () {
    logFloaty.pushLog('点击商品进行浏览')
    let maxTry = 5
    while (maxTry-- > 0 && widgetUtils.widgetGetOne('点击\\d+个商品', 1000)) {
      if (!this.clickGoodDetail()) {
        logFloaty.pushWarningLog('点击商品失败，尝试切换到其他tab')
        let greenfood = widgetUtils.widgetGetById('greenFood', 1000)
        if (greenfood) {
          greenfood.click()
          sleep(1000)
          this.clickGoodDetail()
        }
      }
      if (clickRewardIfNeeded()) {
        break
      }
    }
  }

  this.clickGoodDetail = function () {
    let clickBtn = widgetUtils.widgetGetOne('到手价|折后价')
    if (clickBtn) {
      logFloaty.pushLog('随机点击一个商品')
      clickBtn.click()
      sleep(3000)
      back()
      sleep(1000)
      return true
    } else {
      logFloaty.pushErrorLog('未找到可点击商品')
    }
    return false
  }
}

function RewardExecutor () {

  this.check = function () {
    return !!widgetUtils.widgetGetOne('领取奖励', 2000)
  }

  this.execute = function () {
    let collectReword = widgetUtils.widgetGetOne('领取奖励', 1000)
    if (collectReword) {
      collectReword.click()
      logFloaty.pushLog('点击了领取奖励，等待界面加载, 5s')
      let limit = 5
      while (limit-- > 0) {
        sleep(1000)
        logFloaty.replaceLastLog('点击了领取奖励，等待界面加载, ' + limit + 's')
      }
    } else {
      logFloaty.pushWarningLog('未能找到领取奖励按钮，可能界面有阻断')
    }
  }
}

function TaskRunner () {
  this.executors = [new ClickExecutor(), new BrowserExecutor(), new RewardExecutor()]
  this.run = function () {
    for (let executor of this.executors) {
      if (executor.check()) {
        executor.execute()
        return true
      }
    }
    return false
  }
}

function clickRewardIfNeeded () {
  let collectReword = widgetUtils.widgetGetOne('领取奖励', 1000)
  if (collectReword) {
    collectReword.click()
    logFloaty.pushLog('点击了领取奖励，等待界面加载, 5s')
    let limit = 5
    while (limit-- > 0) {
      sleep(1000)
      logFloaty.replaceLastLog('点击了领取奖励，等待界面加载, ' + limit + 's')
    }
    return true
  }
  return false
}

function checkIfInVerify () {
  if (widgetUtils.widgetCheck('.*身份验证.*', 1000)) {
    logFloaty.pushErrorLog('触发身份验证机制，等待是否自动处理')
    let limit = 3
    while (limit-- > 0) {
      logFloaty.replaceLastLog('触发身份验证机制，等待是否自动处理' + limit + 's')
      sleep(1000)
      if (!widgetUtils.widgetCheck('.*身份验证.*', 1000)) {
        break
      }
    }
    if (limit <= 0 && widgetUtils.widgetCheck('.*身份验证.*', 1000)) {
      logFloaty.pushErrorLog('触发身份验证，无法执行')
      // 直接退回桌面 傻逼淘宝
      home()
      return true
    }
  }
  return false
}