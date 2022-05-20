let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let accountChange = require('../lib/AlipayAccountManage.js')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let fileUtils = singletonRequire('FileUtils')
let automator = singletonRequire('Automator')
let unlocker = require('../lib/Unlock.js')
let _BaseScanner = require('../core/BaseScanner.js')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let OpenCvUtil = require('../lib/OpenCvUtil.js')
config.not_lingering_float_window = true
runningQueueDispatcher.addRunningTask()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  if (config.auto_lock && unlocker.needRelock() === true) {
    logUtils.debugInfo('重新锁定屏幕')
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
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
unlocker.exec()
commonFunctions.requestScreenCaptureOrRestart()

if (!floatyInstance.init()) {
  toast('创建悬浮窗失败')
  exit()
}
floatyInstance.enableLog()
commonFunctions.showCommonDialogAndWait('循环执行小号并收集能量')

if (config.accounts && config.accounts.length > 1) {
  if (!config.main_account_username) {
    let match = config.accounts.filter(acc => acc.account === config.main_account)
    if (match && match.length > 0) {
      config.main_account_username = match[0].accountName
    }
  }
  config.accounts.forEach((accountInfo, idx) => {
    let { account, accountName } = accountInfo
    if (account === config.main_account) {
      return
    }
    floatyInstance.setFloatyText('准备切换账号为：' + account)
    sleep(1000)
    accountChange(account)
    floatyInstance.setFloatyText('切换完毕')
    sleep(500)
    floatyInstance.setFloatyText('开始执行收取能量')
    try {
      doCollectSelf()
      getSignReward()
      if (config.watering_main_account) {
        if (openFriendHome()) {
          doWaterFriend()
        }
      }
      floatyInstance.setFloatyText('切换下一个账号')
      sleep(500)
    } catch (e) {
      logUtils.errorInfo('执行异常：' + e)
      floatyInstance.setFloatyText('收取能量异常 进行下一个')
    }
  })
  floatyInstance.setFloatyText('全部账号能量收集完毕切换回主账号')
  sleep(1000)
  accountChange(config.main_account || config.accounts[0])
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，不进行切换'], true)
}
commonFunctions.minimize()
exit()

function doCollectSelf () {
  if (!openAndWaitForPersonalHome()) {
    return
  }
  floatyInstance.setFloatyText('开始识别并收取能量')
  let scanner = new _BaseScanner()
  let balls = []
  let invalidBalls = []
  let preEnergy = getCurrentEnergy()
  scanner.checkAndCollectByHough(true, ball => { balls.push(ball) }, null, invalid => { invalidBalls.push(invalid) })
  scanner.destroy()
  let postEnergy = getCurrentEnergy()
  let validBallCount = balls.length - invalidBalls.length
  floatyInstance.setFloatyText('收取能量完毕' + ('有效能量球个数：' + validBallCount) + (validBallCount > 0 ? '增加能量值：' + (postEnergy - preEnergy) : ''))
  sleep(500)
}
function startApp () {
  logUtils.logInfo('准备打开蚂蚁森林')
  app.startActivity({
    action: 'VIEW',
    data: 'alipays://platformapi/startapp?appId=60000002',
    packageName: config.package_name
  })
  floatyInstance.setFloatyInfo({ x: config.device_width / 2, y: config.device_height / 2 }, "查找是否有'打开'对话框")
  let confirm = widgetUtils.widgetGetOne(/^打开$/, 1000)
  if (confirm) {
    automator.clickCenter(confirm)
  }
}
function openAndWaitForPersonalHome () {
  let restartCount = 0
  let waitFlag
  let startWait = 1000
  startApp()
  // 首次启动等待久一点
  sleep(1500)
  while (!(waitFlag = widgetUtils.homePageWaiting()) && restartCount++ < 5) {
    logUtils.warnInfo('程序未启动，尝试再次唤醒')
    automator.clickClose()
    logUtils.debugInfo('关闭H5')
    if (restartCount >= 3) {
      startWait += 200 * restartCount
      home()
    }
    sleep(1000)
    // 解锁并启动
    unlocker.exec()
    startApp(false)
    logUtils.sleep(startWait)
  }
  if (!waitFlag && restartCount >= 5) {
    logUtils.logInfo('执行失败')
    return false
  }
  logUtils.logInfo('进入个人首页成功')
  return true
}

function getCurrentEnergy () {
  let currentEnergyWidget = widgetUtils.widgetGetById(config.energy_id || 'J_userEnergy')
  let currentEnergy = undefined
  if (currentEnergyWidget) {
    let content = currentEnergyWidget.text() || currentEnergyWidget.desc()
    currentEnergy = parseInt(content.match(/\d+/))
  }
  logUtils.debugInfo(['getCurrentEnergy 获取能量值: {}', currentEnergy])
  return currentEnergy
}

// 每日签到奖励
function getSignReward () {
  floatyInstance.setFloatyText('准备校验是否有奖励')
  let screen = commonFunctions.checkCaptureScreenPermission()
  if (screen && config.image_config.sign_reward_icon) {
    let collect = OpenCvUtil.findByImageSimple(images.cvtColor(images.grayscale(screen), 'GRAY2BGRA'), images.fromBase64(config.image_config.sign_reward_icon))
    if (collect) {
      floatyInstance.setFloatyInfo({ x: collect.centerX(), y: collect.centerY() }, '点击奖励按钮')
      automator.click(collect.centerX(), collect.centerY())
      sleep(1000)
      let getRewards = widgetUtils.widgetGetAll('立即领取')
      if (getRewards && getRewards.length > 0) {
        floatyInstance.setFloatyText('找到可领取的奖励数量：' + getRewards.length)
        getRewards.forEach(getReward => {
          getReward.click()
          sleep(500)
        })
      } else {
        floatyInstance.setFloatyText('未找到可领取的奖励')
      }
      commonFunctions.setRewardCollected()
      automator.click(config.device_width * 0.2, config.device_width * 0.3)
      sleep(200)
    } else {
      floatyInstance.setFloatyText('未找到奖励按钮')
    }
    sleep(500)
  }
}

function openFriendHome () {
  if (!config.to_main_by_user_id || !config.main_userid) {
    if (!config.main_account_username) {
      floatyInstance.setFloatyText('无法获取主账号用户名，进入主页失败')
      sleep(500)
      return false
    }
    floatyInstance.setFloatyText('通过主账号用户名，进入主页')
    sleep(500)
    return openFriendHomeByWidget()
  } else {
    floatyInstance.setFloatyText('通过主账号userid，进入主页')
    sleep(500)
    return openFriendHomeByUserId()
  }
}

function openFriendHomeByWidget () {
  let target = widgetUtils.widgetGetOne(config.main_account_username)
  if (target) {
    target.click()
  } else {
    floatyInstance.setFloatyText('查找主账号失败 跳过浇水')
    return false
  }
  sleep(1000)
  floatyInstance.setFloatyText('查找是否存在点击展开好友')
  let openSuccess = false, limit = 3
  while (!(openSuccess = widgetUtils.widgetWaiting('点击展开好友动态')) && limit-- > 0) {
    target = widgetUtils.widgetGetOne('重新加载')
    if (target) {
      automator.clickCenter(target)
    }
  }
  return openSuccess
}

function openFriendHomeByUserId (count) {
  let count = count || 3
  floatyInstance.setFloatyText('准备打开主账号页面进行浇水')
  home()
  sleep(2000)
  app.startActivity({
    action: "VIEW",
    data: "alipays://platformapi/startapp?appId=60000002&url=" + encodeURIComponent("https://60000002.h5app.alipay.com/www/home.html?userId=" + config.main_userid),
    packageName: config.package_name
  })
  sleep(1000)
  let confirm = widgetUtils.widgetGetOne(/^打开$/, 3000)
  if (confirm) {
    automator.clickCenter(confirm)
  }
  sleep(1000)
  floatyInstance.setFloatyText('查找是否存在点击展开好友')

  let openSuccess = false, limit = 3
  while (!(openSuccess = widgetUtils.widgetWaiting('点击展开好友动态')) && limit-- > 0) {
    //
  }
  if (!openSuccess && count > 0) {
    floatyInstance.setFloatyText('打开好友界面失败')
    openFriendHomeByUserId(--count)
  }
  return openSuccess
}

function doWaterFriend () {
  config.targetWateringAmount = 66
  floatyInstance.setFloatyText('准备进行浇水')
  let limit = 3
  threads.start(function () {
    events.observeToast()
    // 监控 toast
    events.onToast(function (toast) {
      let text = toast.getText()
      logUtils.debugInfo(['获取到toast文本：{}', text])
      if (
        toast &&
        toast.getPackageName() &&
        toast.getPackageName().indexOf(config.package_name) >= 0
      ) {
        if (/.*浇水已经达到上限.*/.test(text)) {
          limit = 0
        }
      }
    })
  })
  let retryLimit = 6
  while (limit-- > 0 && retryLimit-- > 0) {
    floatyInstance.setFloatyText('第' + (3 - limit) + '次浇水')
    if (!widgetUtils.wateringFriends()) {
      limit++
    }
    limit > 0 && sleep(1500)
  }
}