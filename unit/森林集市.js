
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let FloatyInstance = singletonRequire('FloatyUtil')
let logFloaty = singletonRequire('LogFloaty')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
config.buddha_like_mode = false
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
config.not_lingering_float_window = true
logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()

// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  if (config.auto_lock === true && unlocker.needRelock() === true) {
    debugInfo('重新锁定屏幕')
    automator.lockScreen()
    unlocker.saveNeedRelock(true)
  }
  config.resetBrightness && config.resetBrightness()
  debugInfo('校验并移除已加载的dex')
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, false,
    () => {
      // 保存是否需要重新锁屏
      unlocker.saveNeedRelock()
      config.isRunning = false
    }
  )
}, 'main')
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
let unlocker = require('../lib/Unlock.js')
unlocker.exec()
commonFunctions.showCommonDialogAndWait('森林集市')
let market = new Market()
market.exec()

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
    if (widgetUtils.widgetWaiting('绿色商品', null, 2000)) {
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

  this.clickRewardIfNeeded = function () {
    let collectReword = widgetUtils.widgetGetOne('领取奖励', 1000)
    if (collectReword) {
      collectReword.click()
      logFloaty.pushLog('点击了领取奖励，等待界面加载, 5s')
      sleep(5000)
      return true
    }
    return false
  }

  this.clickGoodDetail = function () {
    let clickBtn = widgetUtils.widgetGetOne('到手价')
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

  this.isDone = function () {
    return widgetUtils.widgetGetOne('下单得能量', 1000, false, false, matcher => {
      return matcher.className('android.widget.TextView').filter(node => node && node.bounds().left > config.device_width / 2)
    })
  }

  this.doHangOut = function (retry) {
    this.clickRewardIfNeeded()
    if (this.isDone()) {
      logFloaty.pushLog('今日任务已经完成了 退出执行')
      sleep(1000)
      return
    }
    let executed = false
    let countdownWidget = widgetUtils.widgetGetOne('浏览商品\\d+s', 2000)
    if (countdownWidget) {
      logFloaty.pushLog('找到了倒计时控件，开始浏览商品')
      let maxTry = 5
      while (maxTry-->0 && widgetUtils.widgetGetOne('浏览商品\\d+s', 1000)) {
        let breakLoop = false;
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
          breakLoop = this.clickRewardIfNeeded()
        })
      }
      executed = true
    } else {
      let clickWidget = widgetUtils.widgetGetOne('点击\\d+个商品', 2000)
      if (clickWidget) {
        logFloaty.pushLog('点击商品进行浏览')
        let maxTry = 5
        while (maxTry-->0 && widgetUtils.widgetGetOne('点击\\d+个商品', 1000)) {
          this.clickGoodDetail()
          if (this.clickRewardIfNeeded()) {
            break
          }
        }
        executed = true
      }
    }
    if (executed) {
      logFloaty.pushLog('执行了操作，等待界面加载 循环执行任务')
      this.doHangOut()
    } else {
      if (retry) {
        if (!this.isDone()) {
          logFloaty.pushErrorLog('未找到 下单得能量 可能执行失败了，设置五分钟后继续')
          commonFunctions.setUpAutoStart(5)
        }
        logFloaty.pushLog('未执行任意操作，退出执行')
        return
      }
      return this.doHangOut(true)
    }
  }

  this.exec = function () {
    let retry = 0
    let opened = false
    while ((opened = startApp()) == false && retry++ < 3) {
      warnInfo('打开森林集市失败')
      sleep(1000)
      home()
      sleep(1000)
    }
    if (opened) {
      this.doHangOut()
    }
    commonFunctions.minimize()
    exit()
  }

}
