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
let { openFriendHome, doWaterFriend, openAndWaitForPersonalHome } = require('./waterFriend.js')
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
commonFunctions.listenDelayStart()
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
      if (config.watering_main_account && config.watering_main_at === 'collect') {
        if (openFriendHome(true)) {
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
