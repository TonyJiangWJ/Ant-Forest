// 引入配置模块和单例工具
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)

// 获取自动化操作、控件工具、日志工具等单例模块
let automator = singletonRequire('Automator') // 自动化点击等操作
let widgetUtils = singletonRequire('WidgetUtils') // 控件查找工具
let logUtils = singletonRequire('LogUtils') // 日志工具
let floatyInstance = singletonRequire('FloatyUtil') // 悬浮窗工具
let logFloaty = singletonRequire('LogFloaty') // 日志悬浮窗
let openCvHelper = require('../lib/OpenCvUtil.js') // OpenCV 图像识别工具
let commonFunctions = singletonRequire('CommonFunction') // 公共函数
let NotificationHelper = singletonRequire('Notification') // 通知工具
let formatDate = require('../lib/DateUtil.js') // 时间格式化工具

// 常量定义
const MAX_RETRY_TIMES = 3
const TIMEOUT_SHORT = 500
const TIMEOUT_MEDIUM = 1000
const TIMEOUT_LONG = 2000
const TIMEOUT_EXTRA_LONG = 5000

// 工具函数
/**
 * 通用重试函数
 * @param {Function} operation - 要执行的操作
 * @param {number} maxRetries - 最大重试次数
 * @param {Function} errorCallback - 错误回调
 * @returns {*} 操作结果或false
 */
function retryOperation(operation, maxRetries, errorCallback) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      return operation();
    } catch (e) {
      if (i === maxRetries) {
        errorCallback && errorCallback(e);
        return false;
      }
      sleep(TIMEOUT_MEDIUM);
    }
  }
}

/**
 * 转义账号正则表达式
 * @param {string} account - 账号
 * @returns {string} 转义后的正则表达式
 */
function escapeAccountRegex(account) {
  return (account || '').replace(/\*+/g, '\\*+');
}

/**
 * 查找可点击的父级控件
 * @param {UiObject} target - 目标控件
 * @returns {UiObject|null} 可点击的父级控件
 */
function findClickableParent(target) {
  let parent = target;
  for (let i = 0; i < 3; i++) { // 最多查找3层
    if (parent && parent.clickable()) return parent;
    if (parent) parent = parent.parent();
    if (!parent) break;
  }
  return null;
}

/**
 * 通知失败信息
 * @param {string} message - 错误消息
 */
function notifyFailure(message) {
  logFloaty.pushWarningLog(message);
  NotificationHelper.createNotification(
    message, 
    message + '，登录操作时间：' + formatDate(new Date()), 
    'mainAccountCheckFailed'
  );
}

/**
 * 取消失败通知
 */
function cancelFailureNotification() {
  NotificationHelper.cancelNotice('mainAccountCheckFailed');
}

// 导出模块方法
module.exports = {
  changeAccount: changeAccount, // 切换账号
  inspectMainAccountAvatar: inspectMainAccountAvatar, // 提取主账号头像
  ensureMainAccount: ensureMainAccount, // 确保当前是主账号
}

/**
 * 切换账号入口函数
 * @param {string} account - 要切换的账号
 * @param {boolean} isMainAccount - 是否为主账号
 */
function changeAccount(account, isMainAccount) {
  if (!account) {
    logUtils.errorInfo('账号不能为空');
    return;
  }
  ensureMainAccountIfFailed(account, null, isMainAccount)
}

/**
 * 确保当前是主账号（尝试最多三次）
 * @param {number} tryTime - 尝试次数
 */
function ensureMainAccount(tryTime) {
  tryTime = tryTime || 1
  if (tryTime > MAX_RETRY_TIMES) {
    logFloaty.pushErrorLog('切换主账号失败多次')
    return
  }
  try {
    changeAccount(_config.main_account || _config.accounts[0], true)
  } catch (e) {
    logFloaty.pushErrorLog('切换主账号异常' + e)
    ensureMainAccount(tryTime + 1)
  }
}

/**
 * 截取当前主账号头像并保存为 base64 格式到配置中
 */
function inspectMainAccountAvatar () {
  logFloaty.pushLog('打开账号切换界面')
  openAccountManage()
  logFloaty.pushLog('检查当前登录账号信息')
  logFloaty.pushLog('请确保当前已经登录主账号')
  sleep(TIMEOUT_LONG)
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
      _config.overwrite('image.main_account_avatar', content)
      logFloaty.pushLog('提取成功，请回到可视化配置中刷新界面查看')
      sleep(TIMEOUT_EXTRA_LONG)
    }
  } else {
    logFloaty.pushWarningLog('未找到主账号控件信息 无法提取')
  }
}

/**
 * 尝试切换账号，失败则重试最多三次
 * @param {string} account - 要切换的账号
 * @param {number} retryCount - 重试次数
 * @param {boolean} isMainAccount - 是否为主账号
 */
function ensureMainAccountIfFailed (account, retryCount, isMainAccount) {
  retryCount = retryCount || 1
  if (retryCount > MAX_RETRY_TIMES) {
    logUtils.errorInfo(['切换账号失败次数超过三次，尝试直接切换为主账号 避免后续执行异常'], true)
    try {
      doChangeAccount(_config.main_account, true)
    } catch (e) {
      logUtils.errorInfo(['切换主账号异常，{}', e])
    }
    ensureMainAccountLogin(_config.main_account)
    return
  }
  try {
    if (!doChangeAccount(account, isMainAccount)) {
      return ensureMainAccountIfFailed(account, retryCount + 1, isMainAccount)
    }
  } catch (e) {
    logUtils.errorInfo(['切换账号异常，尝试重新切换，{}', e])
    return ensureMainAccountIfFailed(account, retryCount + 1, isMainAccount)
  }
  isMainAccount && ensureMainAccountLogin(_config.main_account)
}

/**
 * 确保主账号登录成功，检查界面中是否正确显示"当前"标识
 * @param {string} account - 主账号信息
 */
function ensureMainAccountLogin (account) {
  openAccountManage()
  let checkResult = false, limit = MAX_RETRY_TIMES
  while (!checkResult && limit-- > 0) {
    checkResult = (() => {
      logFloaty.pushLog('准备检查主账号是否正确登录')
      let accountRegex = escapeAccountRegex(account)
      let targetAccounts = widgetUtils.widgetGetAll(accountRegex)
      if (targetAccounts && targetAccounts.length > 0) {
        if (targetAccounts.length > 1) {
          let target = targetAccounts[0]
          let container = target.parent()
          let region = widgetUtils.boundsToRegion(container.bounds())
          // TODO 多个账号 通过图片查找
          if (!_config.image_config.main_account_avatar) {
            logUtils.errorInfo(['当前未维护主账号图片，无法确认主账号是否正确登录，建议改用邮箱登录'], true)
            logFloaty.pushWarningLog('当前未维护主账号图片，无法确认主账号是否正确登录，建议改用邮箱登录')
          } else {
            let find = openCvHelper.findBySimpleBase64(commonFunctions.captureScreen(), _config.image_config.main_account_avatar, region)
            if (find) {
              logFloaty.pushLog('主账号登录成功')
              return true
            } else {
              logFloaty.pushWarningLog('通过图片未找到主账号信息，主账号登录失败')
            }
          }
        } else {
          let target = targetAccounts[0]
          let container = target.parent()
          let isCurrent = widgetUtils.subWidgetGetOne(container, '当前', TIMEOUT_MEDIUM)
          if (isCurrent) {
            logFloaty.pushLog('主账号登录成功')
            return true
          }
        }
      }
    })()
    if (!checkResult) {
      sleep(TIMEOUT_MEDIUM)
      logFloaty.pushWarningLog('当前监测到主账号未登录，重新登录主账号')
      doChangeAccount(account, true)
    }
  }
  if (!checkResult) {
    notifyFailure('主账号登录监测失败，请手动确认')
  } else {
    cancelFailureNotification()
  }
}

/**
 * 执行账号切换操作
 * @param {string} account - 账号信息
 * @param {boolean} isMain - 是否为主账号
 * @param {boolean} isRetry - 是否为重试
 * @returns {boolean} 是否切换成功
 */
function doChangeAccount (account, isMain, isRetry) {
  floatyInstance.init()
  floatyInstance.setFloatyPosition(_config.device_width * 0.4, _config.device_height / 2)
  if (openAccountManage()) {
    return findAndCheck(account, isMain)
  } else {
    if (isRetry) {
      logFloaty.pushErrorLog('打开账户切换界面失败')
      return false
    }
    logFloaty.pushErrorLog('打开账户切换界面失败 尝试重新打开')
    commonFunctions.killCurrentApp()
    return doChangeAccount(account, isMain, true)
  }
}

/**
 * 打开用户切换界面
 * @returns {boolean} 是否打开成功
 */
function openAccountManage () {
  logFloaty.pushLog('检查当前是否已经打开账户切换界面')
  if (widgetUtils.widgetGetById('.*security_userListTitle', TIMEOUT_MEDIUM)) {
    logFloaty.pushLog('当前在账户切换界面')
    sleep(TIMEOUT_SHORT)
    return true
  }
  logFloaty.pushLog('打开账户切换界面')
  let scheme = 'alipays://platformapi/startapp?appId=20000027'
  app.startActivity({
    action: 'VIEW',
    data: scheme,
    packageName: 'com.eg.android.AlipayGphone'
  })
  sleep(TIMEOUT_MEDIUM)
  return widgetUtils.idWaiting('.*security_userListTitle')
}

/**
 * 查找并点击目标账号
 * @param {string} account - 账号信息
 * @param {boolean} isMain - 是否为主账号
 * @returns {boolean} 是否切换成功
 */
function findAndCheck (account, isMain) {
  logFloaty.pushLog('是否切换主账号：' + !!isMain)
  let accountRegex = escapeAccountRegex(account)
  let targetAccounts = widgetUtils.widgetGetAll(accountRegex)
  if (targetAccounts && targetAccounts.length > 0) {
    let target = null
    if (targetAccounts.length == 1) {
      target = targetAccounts[0]
    } else {
      if (isMain) {
        logFloaty.pushWarningLog('当前需要切换为主账号，无法通过控件区分 匹配个数：' + targetAccounts.length + '，需要使用图片识别')
        if (!_config.image_config.main_account_avatar) {
          logUtils.errorInfo(['当前未维护主账号图片，无法进行正确切换，建议改用邮箱登录'], true)
          logFloaty.pushWarningLog('当前未维护主账号图片，无法进行正确切换，建议改用邮箱登录')
        } else {
          let find = openCvHelper.findBySimpleBase64(commonFunctions.captureScreen(), _config.image_config.main_account_avatar)
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
    sleep(TIMEOUT_SHORT)
    let container = target.parent()
    let isCurrent = widgetUtils.subWidgetGetOne(container, '当前', TIMEOUT_MEDIUM)
    if (isCurrent) {
      logUtils.infoLog(['当前已经登录账号：{}', account], true)
      floatyInstance.setFloatyText('该账号已登录')
      sleep(TIMEOUT_SHORT)
    } else {
      floatyInstance.setFloatyText('点击切换账号')
      sleep(TIMEOUT_SHORT)
      clickTarget(target)
      floatyInstance.setFloatyText('延迟2s等待加载完毕')
      sleep(TIMEOUT_LONG)
      if (!widgetUtils.idWaiting('.*king_kong_image')) {
        logUtils.debugInfo(['未找到控件，通过模拟坐标点击'])
        automator.clickCenter(target)
        sleep(TIMEOUT_LONG)
      }
      floatyInstance.setFloatyText('检查是否有 进入支付宝')
      let entryBtn = widgetUtils.widgetGetOne(/^进入支付宝$/, TIMEOUT_MEDIUM)
      if (entryBtn) {
        automator.clickCenter(entryBtn)
        sleep(TIMEOUT_MEDIUM)
      } else {
        floatyInstance.setFloatyText('未找到 进入支付宝 按钮')
      }
    }
    return true
  } else {
    logUtils.errorInfo(['未找到目标账号：{}', account], true)
    floatyInstance.setFloatyText('未找到目标账户')
    sleep(TIMEOUT_SHORT)
  }
}

/**
 * 点击目标控件（尝试父控件或坐标）
 * @param {UiObject} target - 目标控件
 */
function clickTarget (target) {
  let clickableParent = findClickableParent(target);
  if (clickableParent) {
    logUtils.debugInfo(['通过parent点击：{}', clickableParent.click()])
  } else {
    logUtils.debugInfo(['通过模拟坐标点击'])
    automator.clickCenter(target)
  }
}
