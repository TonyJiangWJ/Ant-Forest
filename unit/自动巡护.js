let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let FloatyInstance = singletonRequire('FloatyUtil')
let logFloaty = singletonRequire('LogFloaty')
let WarningFloaty = singletonRequire('WarningFloaty')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let alipayUnlocker = singletonRequire('AlipayUnlocker')
config.buddha_like_mode = false
config.not_lingering_float_window = true

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
// 设置自动静音
config.mute_exec = true
let unlocker = require('../lib/Unlock.js')
unlocker.exec()

commonFunctions.showCommonDialogAndWait('自动巡护')
commonFunctions.listenDelayStart()
commonFunctions.backHomeIfInVideoPackage()
let patrol = new Patrol()
patrol.exec()

function Patrol () {
  function startApp (reopen) {
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=68687842',
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
    if (widgetUtils.widgetWaiting('.*保护地.*', null, 2000)) {
      return true
    }
    warnInfo(['无法校验 保护地 控件，可能没有正确打开'], true)
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

  this.openForest = function () {
    startApp()
  }

  this.exec = function () {
    this.openForest()
    debugInfo(['开始执行巡护'])
    PatrolWalker = prepareWalker()
    let walker = new PatrolWalker()
    walker.operate()
    debugInfo(['巡护结束'])
    commonFunctions.minimize()
    exit()
  }

}

function prepareWalker () {
  function PatrolWalker () {
    this.currentState = 'init'
    this.ended = false
    this.loopCount = 0
    this.operate = function () {
      this.currentWalker = new InitWalker()
      let lastState = this.currentState
      do {
        WarningFloaty.clearAll()
        this.currentWalker.doOperate(this)
        if (lastState == this.currentState) {
          this.loopCount++
          this.duplicateState = true
        } else {
          this.loopCount = 0
          this.duplicateState = false
        }
        lastState = this.currentState
        sleep(2000)
        debugInfo(['current loop count: {}', this.loopCount])
      } while (this.checkCurrentState() && this.loopCount <= 10)
      if (this.loopCount >= 10) {
        warnInfo(['可能界面卡死循环了'], true)
      }
    }

    this.checkCurrentState = function () {
      if (this.ended) {
        WarningFloaty.clearAll()
        return false
      }
      auto.clearCache && auto.clearCache()
      // 等待动画结束
      sleep(1500)
      WarningFloaty.clearAll()
      logFloaty.pushLog('检查是否有关闭按钮')
      let closeDialog = widgetUtils.widgetGetById('J_event_main-btn', 1000, matcher => matcher.filter(node => node.text().indexOf('派它巡护') < 0))
      if (closeDialog) {
        closeDialog = {
          content: closeDialog.text() || closeDialog.desc(),
          target: closeDialog
        }
      } else {
       closeDialog = widgetUtils.widgetGetOne('关闭|送去鼓励|继续|继续前进', 1000, true, true, matcher => matcher.boundsInside(0, config.device_height / 2, config.device_width, config.device_height))
      }
      if (closeDialog) {
        WarningFloaty.addRectangle(closeDialog.content, boundsToRegion(closeDialog.target.bounds()))
        logFloaty.pushLog('找到' + closeDialog.content + '按钮')
        automator.clickCenter(closeDialog.target)
        sleep(1000)
        if (closeDialog.content.indexOf('观看视频') > -1) {
          this.currentWalker = new VideoWalker()
        } else {
          this.currentWalker = new InitWalker()
          this.currentWalker.tmpState = 'close'
        }
        WarningFloaty.clearAll()
        return true
      }
      logFloaty.pushLog('检查当前界面元素')
      sleep(1000)
      let answerBtnsExists = widgetUtils.idCheck('J_event_answerBtns', 1000)
      if (answerBtnsExists) {
        logFloaty.pushLog('切换为回答提问')
        this.currentWalker = new QuestionWalker()
        return true
      }
      let stateCheckWidget = widgetUtils.widgetGetOne('追寻踪迹|观看视频|邀请好友得巡护机会', 1500, true)
      if (stateCheckWidget) {
        let content = stateCheckWidget.content
        WarningFloaty.addRectangle(content, boundsToRegion(stateCheckWidget.target.bounds()))
        switch (content) {
          case '追寻踪迹':
            logFloaty.pushLog('切换为追寻踪迹')
            this.currentWalker = new SeekWalker()
            return true
          case '观看视频':
            logFloaty.pushLog('切换为观看视频')
            this.currentWalker = new VideoWalker()
            return true
          case '邀请好友得巡护机会':
            logFloaty.pushLog('切换为邀请好友')
            this.currentWalker = new InviteWalker()
            return true
          default:
            errorInfo(['无法确认当前状态：{}', content])
            logFloaty.pushErrorLog('无法确认当前状态：' + content)
        }
      }
      let checkWidget = widgetUtils.widgetGetOne('兑换巡护机会|开始巡护.*', 1000, true)
      if (checkWidget) {
        let content = checkWidget.content
        if (content == '兑换巡护机会') {
          logFloaty.pushLog('切换为兑换机会')
          this.currentWalker = new ExchangeWalker()
          return true
        }
        WarningFloaty.addRectangle('开始巡护', boundsToRegion(checkWidget.target.bounds()))
        logFloaty.pushLog('切换为初始状态')
        this.currentWalker = new InitWalker()
        return true
      }
      logFloaty.pushWarningLog('无法确定当前状态，退出执行')
      warnInfo(['无法确定当前状态，退出执行'], true)
      return false
    }
  }

  PatrolWalker.prototype.doOperate = function () {
    errorInfo(['do nonthing, should be override by subclass'], true)
  }

  function extend(child, parent) {
    child.prototype = Object.create(parent.prototype)
    child.prototype.constructor = child
  }
  function InitWalker () {
    PatrolWalker.call(this)
  }

  extend(InitWalker, PatrolWalker)
  InitWalker.prototype.doOperate = function (context) {
    context.currentState = this.tmpState || 'init'
    let start = widgetUtils.widgetGetOne('开始巡护.*', 1000)
    if (start) {
      automator.clickCenter(start)
      sleep(1000)
    }
  }


  function SeekWalker () {
    PatrolWalker.call(this)
  }

  extend(SeekWalker, PatrolWalker)
  SeekWalker.prototype.doOperate = function (context) {
    context.currentState = 'seek'
    sleep(1000)
    let seekTrack = widgetUtils.widgetGetOne('追寻踪迹', 1000)
    if (seekTrack) {
      WarningFloaty.addRectangle('追寻踪迹', boundsToRegion(seekTrack.bounds()))
      // automator.clickCenter(seekTrack)
      seekTrack.click()
      sleep(1000)
      let keepForward = widgetUtils.widgetGetOne('继续前进', 1000)
      if (keepForward) {
        WarningFloaty.addRectangle('继续前进', boundsToRegion(keepForward.bounds()))
        logFloaty.pushLog('找到了继续前进')
        automator.clickCenter(keepForward)
        sleep(1000)
      }
    }
  }

  function InviteWalker () {
    PatrolWalker.call(this)
  }
  extend(InviteWalker, PatrolWalker)
  InviteWalker.prototype.doOperate = function (context) {
    context.currentState = 'invite'
    if (config.invite_friends_gaint_chance) {
      let invite = widgetUtils.widgetGetOne('邀请TA', 1000)
      if (invite) {
        debugInfo('点击邀请TA')
        automator.clickCenter(invite)
        sleep(1000)
        let continueWalk = widgetUtils.widgetGetOne('继续', 1000)
        if (continueWalk) {
          automator.clickCenter(continueWalk)
          sleep(1000)
        }
      }
    } else {
      let closeInvite = widgetUtils.widgetGetById('inviteFriendDialog-close', 1000)
      if (closeInvite) {
        WarningFloaty.addRectangle('关闭邀请', boundsToRegion(closeInvite.bounds()))
        logFloaty.pushLog('关闭邀请')
        automator.clickCenter(closeInvite)
        sleep(1000)
      }
    }
  }

  function ExchangeWalker () {
    PatrolWalker.call(this)
  }

  extend(ExchangeWalker, PatrolWalker)
  ExchangeWalker.prototype.doOperate = function (context) {
    context.currentState = 'exchange'
    let exchange = widgetUtils.widgetGetOne('兑换巡护机会', 1000)
    if (exchange) {
      WarningFloaty.addRectangle('兑换巡护机会', exchange.bounds())
      automator.clickCenter(exchange)
      sleep(1000)
      let exchangeInstantly = widgetUtils.widgetGetOne('立即兑换', 1000)
      if (exchangeInstantly) {
        debugInfo(['点击立即兑换'])
        WarningFloaty.clearAll()
        WarningFloaty.addRectangle('立即兑换', exchangeInstantly.bounds())
        logFloaty.pushLog('点击立即兑换')
        automator.clickCenter(exchangeInstantly)
        sleep(1000)
      } else {
        let ended = widgetUtils.widgetGetOne('.*(兑换次数已达上限|步数不足).*', 1000)
        if (ended) {
          WarningFloaty.clearAll()
          WarningFloaty.addRectangle(ended.desc() || ended.text() || '次数不够', ended.bounds())
          warnInfo(['兑换已达到上限或步数不足'], true)
          logFloaty.pushWarningLog('兑换已达到上限或步数不足')
          context.ended = true
        }
      }
    } else {
      warnInfo(['未找到兑换巡护机会按钮'])
      logFloaty.pushWarningLog('未找到兑换巡护机会按钮')
      context.ended = true
    }
  }
  function VideoWalker () {
    PatrolWalker.call(this)
  }

  extend(VideoWalker, PatrolWalker)
  VideoWalker.prototype.doOperate = function (context) {
    context.currentState = 'video'
    sleep(1000)
    let watchVideo = widgetUtils.widgetGetOne('观看视频', 1000)
    if (watchVideo) {
      WarningFloaty.addRectangle('观看视频', boundsToRegion(watchVideo.bounds()))
      automator.clickCenter(watchVideo)
      infoLog('观看视频，等待15秒', true)
      logFloaty.pushLog('观看视频，等待15秒')
      let count = 15
      while (count-- > 0) {
        logFloaty.replaceLastLog('观看视频，等待' + count + '秒')
        sleep(1000)
      }
      sleep(1000)
      WarningFloaty.clearAll()
      automator.back()
      let tryTime = 3
      while (!widgetUtils.widgetWaiting('.*保护地.*', null, 2000) && --tryTime > 0) {
        automator.back()
      }
    }
  }

  function QuestionWalker() {
    PatrolWalker.call(this)
  }
  extend(QuestionWalker, PatrolWalker)
  QuestionWalker.prototype.doOperate = function (context) {
    context.currentState = 'question'
    sleep(1000)
    let target = selector().className('android.widget.Button').filter(node => node.bounds().left < config.device_width * 0.3 && node.bounds().right > 0.8 * config.device_width).findOne(config.timeout_findOne)
    if (target) {
      WarningFloaty.addRectangle(target.desc() || target.text(), target.bounds())
      automator.clickCenter(target)
    } else {
      logFloaty.pushLog('查找答案控件失败')
    }
  }
  return PatrolWalker
}

function boundsToRegion (bd) {
  return [bd.left, bd.top, bd.right - bd.left, (bd.bottom - bd.top)]
}