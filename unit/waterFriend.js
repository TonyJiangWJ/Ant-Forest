let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')

module.exports = {
  openFriendHome: openFriendHome,
  doWaterFriend: doWaterFriend,
  openAndWaitForPersonalHome: openAndWaitForPersonalHome,
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
    sleep(startWait)
  }
  if (!waitFlag && restartCount >= 5) {
    logUtils.logInfo('执行失败')
    return false
  }
  logUtils.logInfo('进入个人首页成功')
  return true
}
function openFriendHome (inPersonalHome) {
  if (!config.to_main_by_user_id || !config.main_userid) {
    if (!config.main_account_username) {
      floatyInstance.setFloatyText('无法获取主账号用户名，进入主页失败')
      sleep(500)
      return false
    }
    if (!inPersonalHome) {
      openAndWaitForPersonalHome()
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
  let done = false
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
          done = true
        }
      }
    })
  })
  sleep(1000)
  let retryLimit = 6
  let limit = 3
  while (!done && limit-- > 0 && retryLimit-- > 0) {
    floatyInstance.setFloatyText('第' + (3 - limit) + '次浇水')
    if (!widgetUtils.wateringFriends()) {
      limit++
    }
    !done && limit > 0 && sleep(1500)
  }
}