
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let automator = singletonRequire('Automator')
let widgetUtils = singletonRequire('WidgetUtils')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let logFloaty = singletonRequire('LogFloaty')
let openCvHelper = require('../lib/OpenCvUtil.js')
let commonFunctions = singletonRequire('CommonFunction')
module.exports = {
  changeAccount: function (account, isMainAccount) {
    ensureMainAccountIfFailed(account, null, isMainAccount)
  },
  inspectMainAccountAvatar: inspectMainAccountAvatar
}

function inspectMainAccountAvatar () {
  logFloaty.pushLog('打开账号切换界面')
  openAccountManage()
  logFloaty.pushLog('检查当前登录账号信息')
  logFloaty.pushLog('请确保当前已经登录主账号')
  sleep(2000)
  let isCurrent = widgetUtils.widgetGetOne('当前')
  if (isCurrent) {
    let container = isCurrent.parent()
    let avatar = container.child(1)
    let region = widgetUtils.boundsToRegion(avatar.bounds())
    let screen = commonFunctions.captureScreen()
    if (!screen) {
      logFloaty.pushWarningLog('获取截图失败')
    } else {
      let img = images.clip.apply(images, [screen].concat(region))
      let content = images.toBase64(img)
      console.log('图片信息：' + content)
      config.overwrite('image.main_account_avatar', content)
      logFloaty.pushLog('提取成功，请回到可视化配置中刷新界面查看')
      sleep(5000)
    }
  } else {
    logFloaty.pushWarningLog('未找到主账号控件信息 无法提取')
  }
}

function ensureMainAccountIfFailed (account, retryCount, isMainAccount) {
  retryCount = retryCount || 1
  if (retryCount > 3) {
    logUtils.errorInfo(['切换账号失败次数超过三次，尝试直接切换为主账号 避免后续执行异常'], true)
    doChangeAccount(_config.main_account, true)
  }
  try {
    doChangeAccount(account, isMainAccount)
  } catch (e) {
    logUtils.errorInfo(['切换账号异常，尝试重新切换，{}', e])
    ensureMainAccountIfFailed(account, retryCount + 1, isMainAccount)
  }
}

function doChangeAccount (account, isMain) {
  floatyInstance.init()
  floatyInstance.setFloatyPosition(_config.device_width * 0.4, _config.device_height / 2)
  openAccountManage()
  findAndCheck(account, isMain)

}

function openAccountManage () {
  logFloaty.pushLog('检查当前是否已经打开账户切换界面')
  if (widgetUtils.widgetGetById('.*security_userListTitle', 1000)) {
    logFloaty.pushLog('当前在账户切换界面')
    sleep(500)
    return
  }
  logFloaty.pushLog('打开账户切换界面')
  let scheme = 'alipays://platformapi/startapp?appId=20000027'
  app.startActivity({
    action: 'VIEW',
    data: scheme,
    packageName: 'com.eg.android.AlipayGphone'
  })
  sleep(1000)
  widgetUtils.idWaiting('.*security_userListTitle')
  sleep(1000)
}

function findAndCheck (account, isMain) {
  logFloaty.pushLog('是否切换主账号：' + isMain)
  let accountRegex = (account || '').replace(/\*+/, '\\*+')
  let targetAccounts = widgetUtils.widgetGetAll(accountRegex)
  if (targetAccounts && targetAccounts.length > 0) {
    let target = null
    if (targetAccounts.length == 1) {
      target = targetAccounts[0]
    } else {
      if (isMain) {
        logFloaty.pushWarningLog('当前需要切换为主账号，无法通过控件区分 匹配个数：' + targetAccounts.length + '，需要使用图片识别')
        if (!config.image_config.main_account_avatar) {
          logUtils.errorInfo(['当前未维护主账号图片，无法进行正确切换，建议改用邮箱登录'], true)
          logFloaty.pushWarningLog('当前未维护主账号图片，无法进行正确切换，建议改用邮箱登录')
        } else {
          let find = openCvHelper.findBySimpleBase64(commonFunctions.captureScreen(), config.image_config.main_account_avatar)
          if (find) {
            automator.click(find.centerX(), find.centerY())
            logFloaty.pushLog('通过图片切换账号成功')
            return true
          } else {
            logUtils.errorInfo(['通过图片未找到主账号信息，切换失败，降级为控件查找，可能切换不正确，建议改用邮箱登录'], true)
            logFloaty.pushWarningLog('通过图片未找到主账号信息，切换失败，降级为控件查找，可能切换不正确，建议改用邮箱登录')
          }
        }
      }

      // 通过图片切换失败
      logUtils.debugInfo(['当前有多个账号匹配「{}」选择最后一个 匹配数：{} 建议改用邮箱登录', account, targetAccounts.length])
      logFloaty.pushWarningLog('当前有多个账号匹配「' + account + '」选择最后一个 匹配数：' + targetAccounts.length + ' 建议改用邮箱登录')
      target = targetAccounts[targetAccounts.length - 1]

    }
    logUtils.debugInfo(['找到了目标账号：{}', account])
    floatyInstance.setFloatyInfo({ x: target.bounds().centerX(), y: target.bounds().centerY() }, '找到了目标账号')
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
function clickTarget (target) {
  if (target.parent().clickable()) {
    logUtils.debugInfo(['通过parent点击：{}', target.parent().click()])
  } else if (target.parent().parent().clickable()) {
    logUtils.debugInfo(['通过parent.parent点击：{}', target.parent().parent().click()])
  } else {
    logUtils.debugInfo(['通过模拟坐标点击'])
    automator.clickCenter(target)
  }
}