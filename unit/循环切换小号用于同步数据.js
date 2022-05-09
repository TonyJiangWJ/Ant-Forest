let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let accountChange = require('../lib/AlipayAccountManage.js')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
config.not_lingering_float_window = true
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
let unlocker = require('../lib/Unlock.js')
unlocker.exec()

if (!floatyInstance.init()) {
  toast('创建悬浮窗失败')
  exit()
}

commonFunctions.showCommonDialogAndWait('同步小号行走步数')

if (config.accounts && config.accounts.length > 1) {
  config.accounts.forEach(({account}) => {
    floatyInstance.setFloatyText('准备切换账号为：' + account)
    sleep(1000)
    accountChange(account)
    floatyInstance.setFloatyText('切换完毕')
    sleep(500)
  })
  floatyInstance.setFloatyText('账号切换完毕，切换回主账号')
  sleep(1000)
  accountChange(config.main_account || config.accounts[0])
  floatyInstance.setFloatyText('切换完毕，再见')
  sleep(500)
} else {
  logUtils.errorInfo(['当前未配置多账号或账号只有一个，进行切换'], true)
}