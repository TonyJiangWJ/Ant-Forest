let { config } = require('../config.js')(runtime, global)
// config.buddha_like_mode = false
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
floatyInstance.enableLog()
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let YoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetectionUtil = singletonRequire('YoloDetectionUtil')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let TouchController = require('../lib/TouchController.js')
let AiUtil = require('../lib/AIRequestUtil.js')
let logFloaty = singletonRequire('LogFloaty')
let warningFloaty = singletonRequire('WarningFloaty')
let NotificationHelper = singletonRequire('Notification')
let ocrUtil = require('../lib/LocalOcrUtil.js')
let formatDate = require('../lib/DateUtil.js')
// 神奇海洋专用通知id
const NOTIFICATION_ID = config.notificationId * 10 + 2
infoLog(['当前使用的OCR类型为：{} 是否启用：{}', ocrUtil.type, ocrUtil.enabled])
let unlocker = require('../lib/Unlock.js')
// 回收图像资源
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let SCALE_RATE = config.scaleRate
let cvt = (v) => parseInt(v * SCALE_RATE)
config.not_lingering_float_window = true
config.sea_ball_region = config.sea_ball_region || [cvt(860), cvt(1350), cvt(140), cvt(160)]
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
  if (typeof destoryPool != 'undefined') {
    destoryPool()
  }
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

const _package_name = 'com.eg.android.AlipayGphone'
let executeArguments = Object.assign({}, engines.myEngine().execArgv)
let executeByTimeTask = !!executeArguments.intent
// 部分设备中参数有脏东西 可能导致JSON序列化异常
delete executeArguments.intent
if (executeArguments) {
  debugInfo(['启动参数：{}', JSON.stringify(executeArguments)])
}
if (executeArguments.change_auto_start) {
  // 修改自启动脚本，避免参数丢失
  config._force_auto_start_script = executeArguments.change_auto_start
}

unlocker.exec()
commonFunctions.listenDelayStart()
commonFunctions.requestScreenCaptureOrRestart()

if (executeByTimeTask || executeArguments.executeByDispatcher) {
  if (!(executeArguments.find_friend_trash || executeArguments.collect_reward)) {
    commonFunctions.showCommonDialogAndWait('神奇物种签到收集万能卡')
  }
  lanuchApp()
  sleep(1000)
  doCollectCards()
  // 执行主要动作
  commonFunctions.minimize()
  exit()
} else {
  importClass(android.graphics.drawable.GradientDrawable)
  importClass(android.graphics.drawable.RippleDrawable)
  importClass(android.content.res.ColorStateList)
  importClass(java.util.concurrent.LinkedBlockingQueue)
  importClass(java.util.concurrent.ThreadPoolExecutor)
  importClass(java.util.concurrent.TimeUnit)
  importClass(java.util.concurrent.ThreadFactory)
  importClass(java.util.concurrent.Executors)
  let threadPool = new ThreadPoolExecutor(2, 2, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(16),
    new ThreadFactory({
      newThread: function (runnable) {
        let thread = Executors.defaultThreadFactory().newThread(runnable)
        thread.setName('magic-operator-' + thread.getName())
        return thread
      }
    })
  )
  function destoryPool () {
    threadPool && threadPool.shutdown()
  }
  let data = {
    _clickExecuting: false,
    set clickExecuting (val) {
      threadPool.execute(function () {
        if (val) {
          logFloaty.logQueue.push('点击执行中，请稍等', '#888888')
        } else {
          logFloaty.logQueue.push('执行完毕', '#888888')
        }
      })
      this._clickExecuting = val
    },
    get clickExecuting () {
      return this._clickExecuting
    },
    btnDrawables: {}
  }

  // 启动UI形式，支持手动执行更多功能
  let btns = [
    {
      id: 'launch_app',
      text: '打开界面',
      textSize: 6,
      onClick: function () {
        lanuchApp()
      }
    },
    // {
    //   id: 'do_daily_sign',
    //   text: '执行每日签到',
    //   textSize: 6,
    //   onClick: function () {
    //     //
    //   }
    // },
    {
      id: 'do_collect_cards',
      text: '领万能卡',
      onClick: function () {
        //
        doCollectCards()
      }
    },
    // {
    //   id: 'help_friends',
    //   text: '抽好友卡',
    //   onClick: () => {
    //     //
    //   },
    // },
    {
      id: 'exit',
      color: '#EB393C',
      rippleColor: '#C2292C',
      text: '退出脚本',
      onClick: function () {
        exit()
      }
    }
  ]

  let window = floaty.rawWindow(
    `<horizontal>
    <vertical padding="1">
   ${btns.map(btn => {
      return `<vertical padding="1"><button id="${btn.id}" text="${btn.text}" textSize="${btn.textSize ? btn.textSize : 12}sp" w="*" h="30" marginTop="5" marginBottom="5" /></vertical>`
    }).join('\n')
    }</vertical>
  </horizontal>`)

  function setButtonStyle (btnId, color, rippleColor) {
    let shapeDrawable = new GradientDrawable();
    shapeDrawable.setShape(GradientDrawable.RECTANGLE);
    // 设置圆角大小，或者直接使用setCornerRadius方法
    // shapeDrawable.setCornerRadius(20); // 调整这里的数值来控制圆角的大小
    let radius = util.java.array('float', 8)
    for (let i = 0; i < 8; i++) {
      radius[i] = 20
    }
    shapeDrawable.setCornerRadii(radius); // 调整这里的数值来控制圆角的大小
    shapeDrawable.setColor(colors.parseColor(color || '#3FBE7B')); // 按钮的背景色
    shapeDrawable.setPadding(10, 10, 10, 10); // 调整这里的数值来控制按钮的内边距
    // shapeDrawable.setStroke(5, colors.parseColor('#FFEE00')); // 调整这里的数值来控制按钮的边框宽度和颜色
    data.btnDrawables[btnId] = shapeDrawable
    let btn = window[btnId]
    btn.setShadowLayer(10, 5, 5, colors.parseColor('#888888'))
    btn.setBackground(new RippleDrawable(ColorStateList.valueOf(colors.parseColor(rippleColor || '#27985C')), shapeDrawable, null))
  }

  function changeButtonStyle (btnId, handler, color, storkColor) {
    handler = handler || function (shapeDrawable) {
      color && shapeDrawable.setColor(colors.parseColor(color))
      storkColor && shapeDrawable.setStroke(5, colors.parseColor(storkColor))
    }
    handler(data.btnDrawables[btnId])
  }

  ui.run(() => {
    window.setPosition(config.device_width * 0.1, config.device_height * 0.5)
  })
  btns.forEach(btn => {
    ui.run(() => {
      if (typeof btn.render == 'function') {
        btn.render(window[btn.id])
      } else {
        setButtonStyle(btn.id, btn.color, btn.rippleColor)
      }
    })
    if (btn.onClick) {
      window[btn.id].on('click', () => {
        // region 点击操作执行中，对于collect_friends触发终止，等待执行结束
        if (data.clickExecuting) {
          if (btn.handleExecuting) {
            btn.handleExecuting()
            return
          }
          threadPool.execute(function () {
            logFloaty.pushLog('点击执行中，请稍等')
          })
          return
        }
        data.clickExecuting = true
        // endregion
        threadPool.execute(function () {
          try {
            btn.onClick()
          } catch (e) {
            errorInfo(['点击执行异常：{} {}', e, e.message], true)
            commonFunctions.printExceptionStack(e)
          } finally {
            data.clickExecuting = false
          }
        })
      })
    }
  })

  window.exit.setOnTouchListener(new TouchController(window, () => {
    exit()
  }, () => {
    changeButtonStyle('exit', null, '#FF753A', '#FFE13A')
  }, () => {
    changeButtonStyle('exit', (drawable) => {
      drawable.setColor(colors.parseColor('#EB393C'))
      drawable.setStroke(0, colors.parseColor('#3FBE7B'))
    })
  }).createListener())

}


function lanuchApp (retry) {
  if (commonFunctions.myCurrentPackage() === _package_name && widgetUtils.widgetCheck('当前图鉴|抽好友卡', 1000)) {
    logFloaty.pushLog('当前已经打开了神奇物种界面')
    return true
  }
  commonFunctions.backHomeIfInVideoPackage()
  app.startActivity({
    action: 'VIEW',
    data: 'alipays://platformapi/startapp?appId=68687886',
    packageName: _package_name
  })
  floatyInstance.setFloatyInfo({ x: config.device_width / 2, y: config.device_height / 2 }, "查找是否有'打开'对话框")
  let confirm = widgetUtils.widgetGetOne(/^打开$/, 1000)
  if (confirm) {
    automator.clickCenter(confirm)
  }
  sleep(1000)
  logFloaty.pushLog('等待页面元素')
  let checkResult = widgetUtils.widgetCheck('当前图鉴|抽好友卡')
  if (checkResult) {
    logFloaty.pushLog('打开成功')
  } else {
    logFloaty.pushWarningLog('打开失败')
    do {
      let reward = widgetUtils.widgetGetOne('.*(收下|再抽一次).*', 1000)
      if (!reward) {
        break
      }
      logFloaty.pushLog('找到每日签到控件，点击领取奖励')
      automator.clickCenter(reward)
      sleep(1000)
    } while (true)
    checkResult = widgetUtils.widgetCheck('当前图鉴|抽好友卡')
  }
  if (!checkResult && !retry) {
    commonFunctions.minimize(_package_name)
    return lanuchApp(true)
  }
  return checkResult
}

function doCollectCards () {
  if (lanuchApp()) {
    let entry = widgetUtils.widgetGetOne('奖励')
    if (entry) {
      logFloaty.pushLog('找到奖励入口')
      automator.clickCenter(entry)
      sleep(1000)
      entry = ocrWait('逛一逛市集')
      if (entry) {
        entry = entry.bounds
        let ocrCheckRegion = [entry.right, entry.top, config.device_width - entry.right, entry.height() * 3]
        debugInfo(['ocr校验区域：{}', JSON.stringify(ocrCheckRegion)])
        warningFloaty.addRectangle('按钮校验区域', ocrCheckRegion)
        sleep(1000)
        let checkResult = ocrWait('去看看|立即领取|已完成', ocrCheckRegion)
        if (checkResult) {
          if (checkResult.label == '去看看') {
            automator.click(checkResult.bounds.centerX(), checkResult.bounds.centerY())
            logFloaty.pushLog('等待进入逛一逛界面')
            sleep(1000)
            widgetUtils.widgetCheck('逛商品得万能卡')
            browseAds()
            logFloaty.pushLog('返回领取奖励')
            let collect = ocrWait('立即领取', ocrCheckRegion)
            if (collect) {
              logFloaty.pushLog('点击领取奖励')
              automator.click(collect.bounds.centerX(), collect.bounds.centerY())
            } else {
              logFloaty.pushWarningLog('OCR未能找到领取奖励')
            }
          } else if (checkResult.label == '立即领取') {
            logFloaty.pushLog('点击领取奖励')
            automator.click(checkResult.bounds.centerX(), checkResult.bounds.centerY())
          } else {
            logFloaty.pushLog('当日任务已完成：' + checkResult.label)
          }
        }
      }
    } else {
      logFloaty.pushErrorLog('未能找到奖励入口')
    }
  } else {
    logFloaty.pushErrorLog('打开神奇物种界面失败，执行失败')
  }
}

function browseAds () {
  logFloaty.pushLog('准备逛商品')
  sleep(1000)
  let limit = 20, end = false
  while (--limit > 0 && !end) {
    if (limit % 2 == 0) {
      automator.randomScrollDown()
    } else {
      automator.randomScrollUp()
    }
    logFloaty.replaceLastLog('逛商品 剩余：' + limit + 's')
    end = widgetUtils.widgetWaiting('任务完成返回领奖', 1000)
  }
  automator.back()
}

function ocrWait (targetContent, region, tryTime) {
  tryTime = tryTime || 0
  if (tryTime >= 5) {
    logFloaty.pushErrorLog('未能通过ocr找到目标元素：' + targetContent)
    return null
  }
  let results = ocrUtil.recognizeWithBounds(commonFunctions.captureScreen(), region, targetContent)
  if (results && results.length > 0) {
    return results[0]
  } else {
    sleep(500)
    return ocrWait(targetContent, region, tryTime + 1)
  }
}