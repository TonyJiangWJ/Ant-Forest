
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let automator = singletonRequire('Automator')
let widgetUtils = singletonRequire('WidgetUtils')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')

module.exports = function changeAccount(account) {
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
        automator.clickCenter(target)
        floatyInstance.setFloatyText('延迟2s等待加载完毕')
        sleep(2000)
        widgetUtils.idWaiting('.*king_kong_image')
      }
    } else {
      logUtils.errorInfo(['未找到目标账号：{}', account], true)
      floatyInstance.setFloatyText('未找到目标账户')
      sleep(500)
    }
  }
}