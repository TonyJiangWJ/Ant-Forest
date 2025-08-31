importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)

let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(compareEngine => {
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop()
    }
  })
}

let { config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let args = config.parseExecArgv()
let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let widgetUtils = sRequire('WidgetUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let FloatyInstance = sRequire('FloatyUtil')
let NotificationHelper = sRequire('Notification')
let LogFloaty = sRequire('LogFloaty')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let SimpleFloatyButton = require('../lib/FloatyButtonSimple.js')
let unlocker = require('../lib/Unlock.js')
if (!FloatyInstance.init()) {
  toastLog('初始化悬浮窗失败')
  exit()
}
FloatyInstance.enableLog()
if (!commonFunction.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
config.show_debug_log = true
let runningQueueDispatcher = sRequire('RunningQueueDispatcher')
commonFunction.autoSetUpBangOffset(true)
runningQueueDispatcher.addRunningTask()

const BASE_URL = 'https://tonyjiang.hatimi.top/mutual-help'
const DEVICE_ID = device.getAndroidId()
const CATEGORY = 'forestTreasureHunt'
let CONTEXT = {}

let executeArguments = config.parseExecArgv()
let executeByTimeTask = !!engines.myEngine().execArgv.intent || executeArguments.executeByDispatcher
if (executeByTimeTask) {
  // 注册自动移除运行中任务
  commonFunction.registerOnEngineRemoved(function () {
    config.resetBrightness && config.resetBrightness()
    // 脚本退出时锁定屏幕
    if (config.auto_lock === true && unlocker.needRelock() === true) {
      debugInfo('重新锁定屏幕')
      automator.lockScreen()
    }
    // 移除运行中任务
    runningQueueDispatcher.removeRunningTask(true, true,
      () => {
        // 保存是否需要重新锁屏
        unlocker.saveNeedRelock()
        config.isRunning = false
      }
    )
  }, 'main')
  try {
    unlocker.exec()
  } catch (e) {
    if (/无障碍/.test(e + '')) {
      commonFunction.disableAccessibilityAndRestart()
    }
    if (!config.forceStop) {
      errorInfo('解锁发生异常, 三分钟后重新开始' + e)
      commonFunction.printExceptionStack(e)
      commonFunction.setUpAutoStart(3)
      runningQueueDispatcher.removeRunningTask()
      exit()
    }
  }
  commonFunction.showCommonDialogAndWait('森林寻宝')
}

let clickButtons = new SimpleFloatyButton('clickBalls', [
  {
    id: 'getMutualCode',
    text: '自动获取并执行任务',
    onClick: function () {
      getCodeAndOpen()
    }
  },
  {
    id: 'hangout',
    text: '开始逛一逛',
    hide: executeByTimeTask,
    onClick: function () {
      toastLog('请手动进入逛一逛界面，自动上下滑动15秒')
      clickButtons.changeButtonStyle('hangout', null, '#FF753A')
      let limit = 16
      while (limit-- > 0) {
        let start = new Date().getTime()
        LogFloaty.replaceLastLog('逛一逛 等待倒计时结束 剩余：' + limit + 's')
        clickButtons.changeButtonText('hangout', '等待' + limit + 's')
        if (limit % 2 == 0) {
          automator.randomScrollDown()
        } else {
          automator.randomScrollUp()
        }
        sleepIfNeeded(1000 - (new Date().getTime() - start))
      }
      clickButtons.changeButtonStyle('hangout', null, '#3FBE7B')
      clickButtons.changeButtonText('hangout', '开始逛一逛')
    }
  },
  {
    id: 'draw',
    text: '自动抽奖',
    hide: executeByTimeTask,
    onClick: function () {
      doDraw()
    }
  },
  {
    id: 'uploadNew',
    text: '上传新的互助码',
    hide: executeByTimeTask,
    onClick: function () {
      let text = dialogs.rawInput('请输入互助码', CONTEXT.recordText || '')
      if (text) {
        if (dialogs.confirm('是否上传这个互助码', text)) {
          LogFloaty.pushLog('执行上传新的互助码：' + text)
          http.postJson(BASE_URL + '/upload', {
            deviceId: DEVICE_ID,
            category: CATEGORY,
            text: text
          }, null, (resp, err) => {
            if (err) {
              LogFloaty.pushErrorLog('上传互助码失败:' + err)
              return
            }
            let responseData = resp.body.string()
            try {
              let result = JSON.parse(responseData)
              if (result.error) {
                LogFloaty.pushErrorLog('上传互助码失败:' + result.error)
                return
              }
              LogFloaty.pushLog('上传互助码成功:' + result.message)
              checkMutualCodeStatus()
            } catch (e) {
              LogFloaty.pushErrorLog('上传互助码失败:' + responseData)
            }
          })
        } else {
          LogFloaty.pushLog('放弃上传')
        }
      }
    }
  }
])
let clickButtonWindow = clickButtons.window

// 检查当前互助码状态
checkMutualCodeStatus()
// 保持运行
setInterval(function () { }, 1000)


if (executeByTimeTask) {
  clickButtons.data.clickExecuting = true
  getCodeAndOpen()
  clickButtons.changeButtonStyle('getMutualCode', null, '#FF753A')
  clickButtons.changeButtonText('getMutualCode', '抽奖中...')
  doDraw()
  clickButtons.changeButtonText('getMutualCode', '获取互助码并打开')
  clickButtons.changeButtonStyle('getMutualCode', null, '#3FBE7B')
  let limit = 5
  while (limit > 0) {
    clickButtons.changeButtonText('getMutualCode', '将在' + limit + '秒后自动退出')
    sleep(1000)
    limit--
  }
  exit()
} else {
  commonFunction.registerOnEngineRemoved(function () {
    runningQueueDispatcher.removeRunningTask()
  })
}


function sleepIfNeeded (time) {
  if (time > 0) {
    sleep(time)
  }
}

function checkMutualCodeStatus () {
  LogFloaty.pushLog('正在检查当前互助码状态，请稍等')
  http.get(BASE_URL + '/mine?category=' + CATEGORY + '&deviceId=' + DEVICE_ID, {}, (response, err) => {
    if (err) {
      console.error('请求异常', err)
      return
    }
    if (response) {
      let responseStr = response.body.string()
      console.log('获取响应：', responseStr)
      try {
        let data = JSON.parse(responseStr)
        if (data.record) {
          let record = data.record
          CONTEXT.recordText = record.text
          console.log('互助码：' + record.text)
          LogFloaty.pushLog('当前互助码更新时间：' + record.updatedAt)
          LogFloaty.pushLog('今天被获取次数：' + record.dailyCount)
          LogFloaty.pushLog('被报告无效次数：' + record.invalidCount)
        } else if (data.error) {
          LogFloaty.pushLog(data.error)
        }
      } catch (e) {
        console.error('执行异常' + e)
      }
    }
  })
}

function markTextInvalid (text) {
  http.postJson(BASE_URL + '/invalid', {
    category: CATEGORY,
    deviceId: DEVICE_ID,
    text: text,
  }, null, (resp, err) => {
    if (err) {
      errorInfo('标记互助码无效失败', err)
      return
    }
    try {
      let result = JSON.parse(resp.body.string())
      if (result.error) {
        errorInfo('标记互助码无效失败' + result.error)
        return
      }
      debugInfo('标记互助码无效成功:' + result.message)
    } catch (e) {
      errorInfo('标记互助码无效失败', e)
    }
  })
}

function markUsed (text) {
  http.postJson(BASE_URL + '/used', {
    category: CATEGORY,
    deviceId: DEVICE_ID,
    text: text,
  }, null, (resp, err) => {
    if (err) {
      errorInfo('标记互助码已使用失败', err)
      return
    }
    debugInfo('标记互助码已使用成功' + resp.body.string())
  })
}

function getCodeAndOpen () {
  clickButtons.changeButtonStyle('getMutualCode', null, '#FF753A')
  clickButtons.changeButtonText('getMutualCode', '请求中...')
  toastLog('请求服务接口获取中，请稍后')
  let disposable = threads.disposable()
  http.get(BASE_URL + '/random?category=' + CATEGORY + '&deviceId=' + DEVICE_ID, {}, (res, err) => {
    if (err) {
      console.error('请求异常', err)
      disposable.setAndNotify({ success: false, erorr: '请求异常' })
      return
    }
    if (res.body) {
      let responseStr = res.body.string()
      console.log('获取响应：', responseStr)
      try {
        let data = JSON.parse(responseStr)
        if (data.record) {
          console.log('互助码：' + data.record.text)
          disposable.setAndNotify({ success: true, text: data.record.text })
        } else if (data.error) {
          toastLog(data.error)
          disposable.setAndNotify({ success: false, erorr: data.error })
        }
      } catch (e) {
        console.error('执行异常' + e)
        disposable.setAndNotify({ success: false, erorr: '执行异常，具体见日志' })
      }
    }
  })

  let result = disposable.blockedGet()
  if (result.success) {
    setClip(result.text)
    app.startActivity({
      action: 'VIEW',
      data: 'alipays://platformapi/startapp?appId=20001003&keyword=' + encodeURI(result.text) + '&v2=true',
      packageName: 'com.eg.android.AlipayGphone'
    })
    let isValid = widgetUtils.widgetWaiting('去看看')
    if (!isValid) {
      if (widgetUtils.widgetWaiting('吱口令已失效', 1000)) {
        LogFloaty.pushLog('互助码已失效')
        markTextInvalid(result.text)
      }
      LogFloaty.pushLog('准备获取下一个互助码')
      return getCodeAndOpen()
    }
    // 等待界面加载完毕
    sleep(1000)
    let entry = widgetUtils.widgetGetOne('去看看', 1000)
    if (entry) {
      automator.clickCenter(entry)
      sleep(1000)
      widgetUtils.widgetWaiting('帮ta助力')
      sleep(1000)
      let target = widgetUtils.widgetGetOne('帮ta助力')
      if (target) {
        automator.clickCenter(target)
        sleep(1000)
        if (widgetUtils.widgetWaiting('^助力成功$', 2000)) {
          LogFloaty.pushLog('准备获取下一个互助码')
          markUsed(result.text)
          return getCodeAndOpen()
        } else {
          LogFloaty.pushLog('未能找到 助力成功 可能已经到达上限')
          // 自动领取，然后自动执行逛一逛
          clickButtons.changeButtonText('getMutualCode', '执行逛一逛...')
          doAutoCollect()
        }
      } else {
        LogFloaty.pushLog('未能找到 帮ta助力 可能已经到达上限')
      }
    }
  } else {
    toastLog('获取互助码失败' + result.error)
  }
  clickButtons.changeButtonText('getMutualCode', '获取互助码并打开')
  clickButtons.changeButtonStyle('getMutualCode', null, '#3FBE7B')
}

function doAutoCollect () {

  LogFloaty.pushLog('准备自动执行森林集市逛一逛')
  let target = widgetUtils.widgetGetOne('去森林市集逛一逛', 1000)
  let limit = 2
  while (target && limit-- > 0) {
    let container = target.parent().parent()
    target = widgetUtils.subWidgetGetOne(container, '去逛逛', 1000)
    if (!target) {
      break
    }
    target.click()
    widgetUtils.widgetWaiting('滑动浏览得抽奖机会')
    sleep(1000)
    LogFloaty.pushLog('开始自动滑动浏览')
    let limit = 16
    while (limit-- > 0) {
      let start = new Date().getTime()
      LogFloaty.replaceLastLog('逛一逛 等待倒计时结束 剩余：' + limit + 's')
      clickButtons.changeButtonText('hangout', '等待' + limit + 's')
      if (limit % 2 == 0) {
        automator.randomScrollDown()
      } else {
        automator.randomScrollUp()
      }
      sleepIfNeeded(1000 - (new Date().getTime() - start))
    }
    // 适当等待
    sleep(2000)
    clickButtons.changeButtonText('hangout', '开始逛一逛')
    automator.back()
    widgetUtils.widgetWaiting('去森林市集逛一逛')
    // 领取掉奖励机会
    target = widgetUtils.widgetGetOne('领取', 1000)
    while (target) {
      target.click()
      sleep(1000)
      target = widgetUtils.widgetGetOne('领取', 1000)
    }
    sleep(1000)
    target = widgetUtils.widgetGetOne('去森林市集逛一逛', 2000)
  }

  LogFloaty.pushLog('准备兑换奖励')
  target = widgetUtils.widgetGetOne('去兑换', 1000)
  limit = 2
  while (target && limit-- > 0) {
    target.click()
    sleep(1000)
    target = widgetUtils.widgetGetOne('去兑换', 1000)
  }

  LogFloaty.pushLog('准备去物种卡')
  target = widgetUtils.widgetGetOne('去物种集卡得机会', 1000)
  if (target) {
    let container = target.parent().parent()
    target = widgetUtils.subWidgetGetOne(container, '去逛逛', 1000)
    if (target) {
      target.click()
      LogFloaty.pushLog('等待界面加载')
      sleep(2000)
      automator.back()
      sleep(2000)
      widgetUtils.widgetWaiting('去物种集卡得机会')
    }
  }

  LogFloaty.pushLog('准备签到')
  target = widgetUtils.widgetGetOne('签到', 1000)
  if (target) {
    LogFloaty.pushLog('执行签到')
    target.click()
    sleep(1000)
  }

  LogFloaty.pushLog('检查是否有可领取的奖励')
  target = widgetUtils.widgetGetOne('领取', 1000)
  while (target) {
    target.click()
    sleep(1000)
    target = widgetUtils.widgetGetOne('领取', 1000)
  }
  LogFloaty.pushLog('自动领取执行完毕，剩余的请手动执行')
}

function doDraw () {
  let target = widgetUtils.widgetGetOne('还有')
  if (target) {
    let chance = widgetUtils.subWidgetGetOne(target.parent(), '\\d+', 2000)
    if (chance) {
      let chanceText = chance.text()
      if (chanceText) {
        if (chanceText != '0') {
          automator.clickCenter(chance)
          sleep(2000)
          while (true) {
            let results = localOcrUtil.recognizeWithBounds(commonFunction.captureScreen(), null, '再抽1次')
            if (results && results.length > 0) {
              LogFloaty.pushLog('再抽一次')
              let bounds = results[0].bounds
              automator.click(bounds.centerX(), bounds.centerY())
              sleep(2000)
            } else {
              LogFloaty.pushLog('未找到再抽一次 抽奖结束')
              let closeBtn = selector().clickable().className('android.widget.TextView').filter(node => node.bounds().width() == node.bounds().height()).depth(16).findOne(1000)
              if (closeBtn) {
                closeBtn.click()
              }
              break
            }
          }
          LogFloaty.pushLog('检查是否还有抽奖机会')
          sleep(1000)
          return doDraw()
        }
      }
    }
  } else {
    LogFloaty.pushLog('未找到抽奖按钮')
  }
}