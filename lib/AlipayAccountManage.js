
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let automator = singletonRequire('Automator')
let widgetUtils = singletonRequire('WidgetUtils')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')

module.exports = function changeAccount(account) {
  ensureMainAccount(account)
}

function ensureMainAccount(account, retryCount) {
  retryCount = retryCount || 1
  if (retryCount > 3) {
    logUtils.errorInfo(['切换账号失败次数超过三次，尝试直接切换为主账号 避免后续执行异常'], true)
    doChangeAccount(_config.main_account)
  }
  try {
    doChangeAccount(account)
  } catch (e) {
    logUtils.errorInfo(['切换账号异常，尝试重新切换，{}', e])
    ensureMainAccount(account, retryCount + 1)
  }
}

function doChangeAccount(account) {
  floatyInstance.init()
  floatyInstance.setFloatyPosition(_config.device_width * 0.4, _config.device_height / 2)
  openAccountManage()
  findAndCheck(account)

  function openAccountManage() {
    if (widgetUtils.widgetGetById('.*security_userListTitle')) {
      logUtils.logInfo('当前在账户切换界面')
      sleep(500)
      return
    }
    let scheme = 'alipays://platformapi/startapp?appId=20000027'
    app.startActivity({
      action: 'VIEW',
      data: scheme,
      packageName: 'com.eg.android.AlipayGphone'
    })
    sleep(1000)
    widgetUtils.idWaiting('.*security_userListTitle')
  }

  function findAndCheck(account) {
    let accountRegex = (account || '').replace(/\*+/, '\\*+')
    let target = widgetUtils.widgetGetOne(accountRegex)
    if (target) {
      logUtils.debugInfo(['找到了目标账号：{}', account])
      floatyInstance.setFloatyInfo({x: target.bounds().centerX(), y: target.bounds().centerY()}, '找到了目标账号')
      sleep(500)
      let container = target.parent()
      let isCurrent = widgetUtils.subWidgetGetOne(container, '当前')
      if (isCurrent) {
        logUtils.infoLog(['当前已经登录账号：{}', account], true)
        floatyInstance.setFloatyText('该账号已登录')
        sleep(500)
      } else {
        floatyInstance.setFloatyText('点击切换账号')
        sleep(500)
        clickTarget(target)
        floatyInstance.setFloatyText('延迟2s等待加载完毕')
        sleep(2000)
        if (!widgetUtils.idWaiting('.*king_kong_image')) {
          logUtils.debugInfo(['未找到控件，通过模拟坐标点击'])
          automator.clickCenter(target)
          sleep(2000)
        }
        floatyInstance.setFloatyText('检查是否有 进入支付宝')
        let entryBtn = widgetUtils.widgetGetOne(/^进入支付宝$/, 1000)
        if (entryBtn) {
          automator.clickCenter(entryBtn)
          sleep(1000)
        } else {
          floatyInstance.setFloatyText('未找到 进入支付宝 按钮')
        }
      }
    } else {
      logUtils.errorInfo(['未找到目标账号：{}', account], true)
      floatyInstance.setFloatyText('未找到目标账户')
      sleep(500)
    }
  }
  function clickTarget(target) {
    if (target.parent().clickable()) {
      logUtils.debugInfo(['通过parent点击：{}', target.parent().click()])
    } else if (target.parent().parent().clickable()) {
      logUtils.debugInfo(['通过parent.parent点击：{}', target.parent().parent().click()])
    } else {
      logUtils.debugInfo(['通过模拟坐标点击'])
      automator.clickCenter(target)
    }
  }
}