/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-05 09:12:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2024-11-28 15:56:09
 * @Description: 
 */
let { config: _config, storageName: _storageName } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let automator = singletonRequire('Automator')
let { infoLog, logInfo, errorInfo, warnInfo, debugInfo } = singletonRequire('LogUtils')
let FileUtils = singletonRequire('FileUtils')
let _commonFunctions = singletonRequire('CommonFunction')
let _widgetUtils = singletonRequire('WidgetUtils')
let _runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let warningFloaty = singletonRequire('WarningFloaty')
let NotificationHelper = singletonRequire('Notification')
let ExternalUnlockDevice = files.exists(FileUtils.getCurrentWorkPath() + '/extends/ExternalUnlockDevice.js') ? require('../extends/ExternalUnlockDevice.js') : null

if (ExternalUnlockDevice) {
  logInfo('使用自定义解锁模块')
} else {
  logInfo('使用内置解锁模块')
}
const DEVICE_TYPE = {
  VIVO: 'vivo',
  COLOROS: 'coloros',
  MEIZU: 'meizu_flyme',
  NORMAL: 'normal',
  VIVO_PATTERN: 'vivo_pattern',
}

const DEVICES = {
  'vivo': (mainUnlocker) => new VivoPinUnlocker(mainUnlocker),
  'coloros': (mainUnlocker) => new ColorOsPinUnlocker(mainUnlocker),
  'meizu_flyme': (mainUnlocker) => new MeizuPinUnlocker(mainUnlocker),
  'normal': (mainUnlocker) => new PinUnlocker(mainUnlocker),
  'vivo_pattern': (mainUnlocker) => new VivoPatternUnlocker(mainUnlocker),
}

let NORMAL_DEVICE = function (obj) {
  this.DEVICE_TYPE = DEVICE_TYPE
  this.storage = storages.create(_storageName)
  this.__proto__ = obj
  this.ensurePinPassword = function () {
    if (!/^\d+$/.test(this.password)) {
      throw new Error('密码应当为纯数字')
    }
  }

  // 密码解锁（仅ROOT可用）
  this.unlock_password = function () {
    debugInfo('使用字符串密码解锁 必须有root权限')
    if (!_config.hasRootPermission) {
      errorInfo('无ROOT权限，无法使用字符串密码解锁')
    }
    if (typeof this.password !== 'string') throw new Error('密码应为字符串！')
    // 直接在控件中输入密码
    setText(0, this.password)
    // 执行确认操作
    KeyCode('KEYCODE_ENTER')
    return this.check_unlock()
  }

  // 判断解锁方式并解锁
  this.unlock = function (password) {
    if (typeof password === 'undefined' || password === null || password.length === 0) {
      errorInfo('密码为空：' + JSON.stringify(password))
      throw new Error('密码为空！')
    }
    this.password = password
    let unlockSuccess = false
    let storedUnlocker = DEVICES[_config.unlock_device_flag]
    if (storedUnlocker != null && typeof storedUnlocker == 'function') {
      debugInfo(['当前已存储使用特定设备解锁：{}', _config.unlock_device_flag])
      unlockSuccess = storedUnlocker(this).unlock_pin()
    }
    let unsuccessFlag = false
    // 如果已存储使用特定设备解锁方式成功则直接返回成功
    if (unlockSuccess) {
      return true
    } else {
      debugInfo(['使用存储的特定解锁方式解锁失败'])
      unsuccessFlag = true
      // 重置为未知
      _config.overwrite('unlock_device_flag', 'unknown')
    }
    let _this = this
    let unlockers = [
      { id: '(fixedP|p)inEntry', unlock: () => new PinUnlocker(_this).unlock_pin() },
      { id: '(colorL|l)ockPatternView', unlock: () => new PatternUnlocker(_this).unlock_pattern() },
      {
        id: 'passwordEntry', unlock: () => {
          // 魅族手机特殊处理
          if (id('com.android.systemui:id/lockPattern').exists()) {
            return new MeizuPinUnlocker(_this).unlock_pin()
          }
          return _this.unlock_password()
        }
      },
      { id: 'pinColorNumericKeyboard', unlock: () => new ColorOsPinUnlocker(_this).unlock_pin() },
      { id: 'vivo_pin_keyboard', unlock: () => new VivoPinUnlocker(_this).unlock_pin() },
      { id: 'vivo_lock_pattern_view', unlock: () => new VivoPatternUnlocker(_this).unlock_pattern() },
    ]
    let patternMatched = false
    unlockers.forEach(v => {
      if (unlockSuccess) {
        return
      }
      debugInfo(['准备查找id:[com.android.systemui:id/{}]', v.id])
      if (idMatches('com.android.systemui:id/' + v.id).exists()) {
        debugInfo(['找到了目标控件实际id:[{}]', idMatches('com.android.systemui:id/' + v.id).findOne().id()])
        patternMatched = true
        unlockSuccess = v.unlock()
      } else {
        debugInfo(['通过id[{}]查找控件不存在', v.id])
      }
    })
    if (!patternMatched) {
      errorInfo(
        '识别锁定方式失败，型号：' + device.brand + ' ' + device.product + ' ' + device.release
      )
      errorInfo('请运行unit/获取解锁界面控件信息.js 获取布局信息自行开发解锁代码 或者向开发者寻求帮助', true)
      if (unsuccessFlag) {
        errorInfo('请检查是否开启了防误触功能并将手机进行了翻转，请关闭防误触功能后重试')
      }
      return this.check_unlock()
    }
    return unlockSuccess
  }
}


function Unlocker () {
  const _km = context.getSystemService(context.KEYGUARD_SERVICE)

  this.relock = false
  this.reTry = 0

  // 设备是否锁屏
  this.is_locked = function () {
    return _km.inKeyguardRestrictedInputMode()
  }

  // 设备是否加密
  this.is_passwd = function () {
    return _km.isKeyguardSecure()
  }

  // 解锁失败
  this.failed = function () {
    automator.back()
    this.reTry++
    if (this.reTry > 3 && !_config.infinite_retry_unlock) {
      logInfo('解锁失败达到三次，停止运行')
      _config.resetBrightness && _config.resetBrightness()
      _runningQueueDispatcher.removeRunningTask()
      this.saveNeedRelock(true)
      exit()
    } else {
      let sleepMs = 5000 * (this.reTry > 3 ? 3 : this.reTry)
      logInfo('解锁失败，' + sleepMs + 'ms之后重试')
      sleep(sleepMs)
      this.run_unlock()
    }
  }

  // 检测是否解锁成功
  this.check_unlock = function () {
    sleep(_config.timeout_unlock)
    if (!this.is_locked()) {
      return true
    }
    if (
      textContains('重新|重试|错误').findOne(_config.timeout_existing)
    ) {
      logInfo('密码错误')
      return false
    }
    return !this.is_locked()
  }

  // 唤醒设备
  this.wakeup = function () {
    if (this.relock && _config.auto_set_brightness && !_config.resetBrightness) {
      _config.last_brightness_mode = device.getBrightnessMode()
      _config.last_brightness = device.getBrightness()
      logInfo(['设置显示亮度为最低，关闭自动亮度 原始模式: {} 亮度: {}', _config.last_brightness_mode, _config.last_brightness])
      _config.resetBrightness = () => {
        debugInfo(['重置自动亮度 原始模式: {} 亮度: {}', _config.last_brightness_mode, _config.last_brightness])
        if (!isNaN(_config.last_brightness_mode)) {
          device.setBrightnessMode(_config.last_brightness_mode)
          debugInfo('自动亮度模式调整完毕')
        }
        if (!isNaN(_config.last_brightness)) {
          device.setBrightness(_config.last_brightness)
          debugInfo('亮度值调整完毕')
        }
        _config.resetBrightness = null
      }
      // 设置最低亮度 同时关闭自动亮度
      device.setBrightnessMode(0)
      device.setBrightness(1)
    }
    let limit = 3
    while (!device.isScreenOn() && limit-- > 0) {
      device.wakeUp()
      sleep(_config.timeout_unlock)
    }
    if (!device.isScreenOn()) {
      warnInfo('isScreenOn判定失效，无法确认是否已亮屏。直接尝试后续解锁操作')
    }
  }

  /**
   * 当闹钟响铃时暂停
   */
  this.suspendOnAlarm = function () {
    if (_config.suspend_on_alarm_clock) {
      let alarmContent = _widgetUtils.widgetGetOne(_config.suspend_alarm_content || '滑动关闭闹钟', 1000, true, true)
      if (alarmContent) {
        warnInfo(['闹钟响铃中，暂停脚本 text: {}', alarmContent.content], true)
        _config.forceStop = true
        _commonFunctions.setUpAutoStart(5)
        NotificationHelper.createNotificationWithStart('闹钟响铃中，延迟五分钟', '点击可以直接运行')
        if (this.relock && _config.auto_set_brightness) {
          logInfo('重置自动亮度')
          // 重新打开自动亮度
          _config.resetBrightness()
        }
        _runningQueueDispatcher.removeRunningTask()
        exit()
      } else {
        debugInfo('未找到关闭闹钟控件信息')
      }
    }
  }

  // 划开图层
  this.swipe_layer = function () {
    debugInfo(['滑动解锁，设备分辨率：{},{}', _config.device_width, _config.device_height])
    if (_config.device_width <= 0 || _config.device_height <= 0) {
      _config.device_width = device.width || 1080
      _config.device_height = device.height || 2340
      errorInfo(['设备分辨率不正确，建议重启AutoJs或者直接写死分辨率. 重置分辨率为{}*{}避免解锁失败', _config.device_width, _config.device_height])
    }
    this.suspendOnAlarm()
    let x = parseInt(_config.device_width * 0.2)
    gesture(320, [x, parseInt(_config.device_height * 0.7)], [x, parseInt(_config.device_height * 0.3)])
    sleep(_config.timeout_unlock)
  }

  // 执行解锁操作
  this.run_unlock = function () {
    this.relock = this.relock || this.getRelockInfo()
    // 如果已经解锁则返回
    if (!this.is_locked()) {
      logInfo('已解锁')
      if (this.relock === true) {
        logInfo('前置校验需要重新锁定屏幕')
      } else {
        logInfo('不需要重新锁定屏幕')
        this.relock = false
      }
      return true
    }
    // 校验设备姿态 是否在裤兜内
    if (_config.check_device_posture) {
      let sensorInfo = _commonFunctions.getDistanceAndGravity(1000)
      if (sensorInfo.z < (_config.posture_threshold_z || 6)
        && (!_config.check_distance || sensorInfo.distance < 4)) {
        _commonFunctions.setUpAutoStart(5)
        NotificationHelper.createNotificationWithStart('当前设备可能在裤兜内，5分钟后尝试', '点击可以直接运行')
        warnInfo('当前设备可能在裤兜内，5分钟后尝试')
        _runningQueueDispatcher.removeRunningTask()
        exit()
      }
    }
    this.relock = true
    _config.notNeedRelock = false
    logInfo('需要重新锁定屏幕')
    // 首先点亮屏幕
    this.wakeup()
    // 打开滑动层
    this.swipe_layer()
    // 如果有锁屏密码则输入密码
    if (this.is_passwd() && !this.unlock(_config.password)) {
      // 如果解锁失败
      this.failed()
    } else {
      this.saveNeedRelock()
      if (_config.dismiss_dialog_if_locked) {
        // 锁屏状态下启动不再弹框倒计时
        _commonFunctions.getAndUpdateDismissReason('screen_locked')
      }
    }
  }

  this.saveNeedRelock = function (notRelock) {
    this.relock = this.relock || this.getRelockInfo()
    if (notRelock || _config.notNeedRelock) {
      this.relock = false
    }
    let storage = storages.create(_storageName)
    debugInfo('保存是否需要重新锁屏：' + this.relock)
    storage.put('needRelock', JSON.stringify({ needRelock: this.relock, timeout: new Date().getTime() + 30000 }))
  }

  this.getRelockInfo = function () {
    let storage = storages.create(_storageName)
    let needRelock = storage.get('needRelock')
    if (needRelock) {
      needRelock = JSON.parse(needRelock)
      if (needRelock && new Date().getTime() <= needRelock.timeout) {
        return needRelock.needRelock
      }
    }
    return false
  }
}

const MyDevice = ExternalUnlockDevice || NORMAL_DEVICE
const _unlocker = new MyDevice(new Unlocker())
module.exports = {
  exec: function () {
    // 撤销延迟执行通知
    NotificationHelper.cancelNotice(_config.notificationId * 10 + 1)
    _commonFunctions.listenDelayBeforeUnlock()
    _unlocker.reTry = 0
    _unlocker.run_unlock()
    let executeArguments = engines.myEngine().execArgv
    let executedIntent = executeArguments.intent
    let executedByTimeTask = false
    let triggerByNotice = executeArguments.triggerImmediately
    if (executedIntent) {
      triggerByNotice = executedIntent.getStringExtra('triggerByNotice')
      if (!triggerByNotice) {
        executedByTimeTask = true
      }
    }
    if (typeof executeArguments.last_brightness_mode != 'undefined' || typeof executeArguments.last_brightness != 'undefined') {
      // 根据启动参数覆写重置亮度
      _config.resetBrightness = () => {
        debugInfo(['重置自动亮度 原始模式: {} 亮度: {}', executeArguments.last_brightness_mode, executeArguments.last_brightness])
        if (!isNaN(executeArguments.last_brightness_mode)) {
          device.setBrightnessMode(executeArguments.last_brightness_mode)
          debugInfo('自动亮度模式调整完毕')
        }
        if (!isNaN(executeArguments.last_brightness)) {
          device.setBrightness(executeArguments.last_brightness)
          debugInfo('亮度值调整完毕')
        }
        _config.resetBrightness = null
      }
    }
    if (!_unlocker.relock) {
      // 启用佛系模式 定时任务触发或另一个佛系脚本触发
      if (_config.buddha_like_mode && (executedByTimeTask || executeArguments.buddha)) {
        infoLog('已启用佛系模式，且未锁定屏幕，等待5分钟后再试')
        _config.forceStop = true
        _config._buddha = true
        _commonFunctions.setUpAutoStart(5)
        NotificationHelper.createNotificationWithStart('佛系模式当前亮屏状态，5分钟后尝试', '点击可以直接运行')
        _runningQueueDispatcher.removeRunningTask()
        exit()
      }
      // 手动触发的情况下 不校验白名单和支付界面信息 
      // 定时触发和其他脚本触发的（可能都在排队中，然后触发的下一个脚本） 需要进行校验
      // 如果是triggerByNotice 通过通知触发启动，则无需校验
      if ((executedByTimeTask || executeArguments.executeByDispatcher) && !triggerByNotice) {
        let skipped = false
        // 未锁定屏幕情况下，判断是否在白名单中
        do {
          skipped = _commonFunctions.delayStartIfInSkipPackage()
          // 跳过了，需要重新执行解锁操作
          skipped && _unlocker.run_unlock()
        } while (skipped && !_unlocker.relock)
      }
    }
    if (_config.mute_exec && !_config._volume_setted) {
      _config.device_music_volume = device.getMusicVolume()
      _config._volume_setted = true
      debugInfo(['设置音量为0'])
      try {
        device.setMusicVolume(0)
        _commonFunctions.registerOnEngineRemoved(function () {
          resetMusicVolume()
        }, 'reset volume')
      } catch (e) {
        errorInfo(['设置音量失败，请确认赋予了AutoJS修改媒体音量的权限：{}', e])
      }
    }
  },
  needRelock: function () {
    logInfo('是否需要重新锁定屏幕：' + _unlocker.relock)
    return _unlocker.relock
  },
  saveNeedRelock: function (notRelock) {
    _unlocker.saveNeedRelock(notRelock)
  },
  resetMusicVolume: () => {
    if (_config.mute_exec) {
      resetMusicVolume()
    }
  },
  unlocker: _unlocker
}

function resetMusicVolume () {
  try {
    debugInfo(['重置音量为: {}', _config.device_music_volume])
    device.setMusicVolume(_config.device_music_volume)
  } catch (e) {
    errorInfo(['设置音量失败，请确认赋予了AutoJS修改媒体音量的权限：{}', e])
  }
}

// --- 内部类，扩展pin解锁

function PinUnlocker (mainUnlocker) {
  this.password = mainUnlocker.password
  mainUnlocker.ensurePinPassword()
  // PIN解锁
  this.unlock_pin = function () {
    if (this.doPinUnlock()) {
      return mainUnlocker.check_unlock()
    }
    return false
  }
}
// 默认解锁
PinUnlocker.prototype.doPinUnlock = function () {
  debugInfo('使用通用PIN密码解锁')
  if (!idMatches('com.android.systemui:id/key\\d').exists()) {
    warnInfo(['PIN解锁专有控件不存在，解锁失败'])
    return false
  }
  // 模拟按键
  let button = null
  for (let i = 0; i < this.password.length; i++) {
    let key_id = 'com.android.systemui:id/key' + this.password[i]
    if ((button = id(key_id).findOne(_config.timeout_findOne)) !== null) {
      button.click()
    }
    sleep(100)
  }
  _config.overwrite('unlock_device_flag', DEVICE_TYPE.NORMAL)
  return true
}
function extendPinUnlocker (child, doPinUnlock) {
  child.prototype = Object.create(PinUnlocker.prototype)
  child.prototype.constructor = child
  child.prototype.doPinUnlock = doPinUnlock
}
function VivoPinUnlocker (mainUnlocker) {
  PinUnlocker.call(this, mainUnlocker)
}
function ColorOsPinUnlocker (mainUnlocker) {
  PinUnlocker.call(this, mainUnlocker)
}
function MeizuPinUnlocker (mainUnlocker) {
  PinUnlocker.call(this, mainUnlocker)
}

extendPinUnlocker(VivoPinUnlocker, function () {
  debugInfo('使用vivo的PIN密码解锁')
  let keyboardRoot = idMatches('com.android.systemui:id/VivoPinkey\\d').exists()
  if (!keyboardRoot) {
    warnInfo(['vivo专有控件不存在，PIN解锁失败'])
    return false
  }
  // 模拟按键
  let button = null
  for (let i = 0; i < this.password.length; i++) {
    let key_id = 'com.android.systemui:id/VivoPinkey' + this.password[i]
    if ((button = id(key_id).findOne(_config.timeout_findOne)) !== null) {
      button.click()
    }
    sleep(100)
  }
  _config.overwrite('unlock_device_flag', DEVICE_TYPE.VIVO)
  return true
})

extendPinUnlocker(ColorOsPinUnlocker, function () {
  debugInfo('使用coloros的PIN密码解锁')
  // 模拟按键
  let button = null
  let keyboardRoot = id('com.android.systemui:id/pinColorNumericKeyboard').findOne(_config.timeout_existing)
  if (!keyboardRoot) {
    warnInfo(['coloros专有控件不存在，PIN解锁失败'])
    return false
  }
  for (let i = 0; i < this.password.length; i++) {
    button = keyboardRoot.child((parseInt(this.password[i]) + 9) % 10)
    if (button !== null) {
      button.click()
    } else {
      errorInfo(['未找到数字按钮：{} 可能无法正常解锁', this.password[i]])
    }
    sleep(100)
  }
  _config.overwrite('unlock_device_flag', DEVICE_TYPE.COLOROS)
  return true
})

extendPinUnlocker(MeizuPinUnlocker, function () {
  debugInfo('使用魅族的PIN密码解锁')
  let lockRegion = id('com.android.systemui:id/lockPattern').findOne(_config.timeout_unlock)
  if (!lockRegion) {
    errorInfo('未找到flyme专有的lockPattern无法执行解锁，请确认设置的是PIN密码')
    return false
  }
  let region = lockRegion.bounds()
  let height = region.height() / 4, width = region.width() / 3
  if (_config.develop_mode) {
    warningFloaty.addRectangle('pattern区域', [region.left, region.top, region.width(), region.height()], '#ff0000')
    for (let i = 0; i <= 9; i++) {
      let position = { x: 0, y: 0 }
      if (i == 0) {
        position = { x: region.left + width, y: region.top + 3 * height }
      } else {
        position = { x: region.left + ((i - 1) % 3) * width, y: region.top + (Math.ceil(i / 3) - 1) * height }
      }
      warningFloaty.addRectangle(i + '', [position.x, position.y, width, height])
    }
  }
  // 模拟按键，区域
  for (let i = 0; i < this.password.length; i++) {
    let keyCenter = null
    let c = parseInt(this.password[i])
    if (c == 0) {
      keyCenter = { x: 1.5 * width, y: 3.5 * height }
    } else {
      keyCenter = { x: ((c - 1) % 3 + 0.5) * width, y: (Math.ceil(c / 3) - 0.5) * height }
    }
    keyCenter.x += region.left
    keyCenter.y += region.top
    automator.click(keyCenter.x, keyCenter.y)
    sleep(100)
  }
  _config.overwrite('unlock_device_flag', DEVICE_TYPE.MEIZU)
  if (_config.develop_mode) {
    sleep(5000)
    warningFloaty.clearAll()
  }
  return true
})


function PatternUnlocker (mainUnlocker) {
  this.password = mainUnlocker.password
  mainUnlocker.ensurePinPassword()
  // PIN解锁
  this.unlock_pattern = function () {
    if (this.doPatternUnlock()) {
      return mainUnlocker.check_unlock()
    }
    return false
  }
}
// 默认解锁
PatternUnlocker.prototype.doPatternUnlock = function () {
  debugInfo('使用通用图形密码解锁')
  let lockBounds = idMatches('com.android.systemui:id/(colorL|l)ockPatternView')
    .findOne(_config.timeout_findOne)
  if (!lockBounds) {
    console.error('无法找到图形密码所属控件信息')
    return false
  }
  lockBounds = lockBounds.bounds()
  let boxWidth = (lockBounds.right - lockBounds.left) / 3
  let boxHeight = (lockBounds.bottom - lockBounds.top) / 3
  let positions = this.password.split('').map(p => {
    let checkVal = parseInt(p) - 1
    return { r: parseInt(checkVal / 3), c: parseInt(checkVal % 3) }
  }).map(p => {
    return [parseInt(lockBounds.left + (0.5 + p.c) * boxWidth), parseInt(lockBounds.top + (0.5 + p.r) * boxHeight)]
  })
  gesture(220 * positions.length, positions)
  return true
}

function extendPatternUnlocker (child, doPatternUnlock) {
  child.prototype = Object.create(PatternUnlocker.prototype)
  child.prototype.constructor = child
  child.prototype.doPatternUnlock = doPatternUnlock
}

function VivoPatternUnlocker (mainUnlocker) {
  PatternUnlocker.call(this, mainUnlocker)
}

extendPatternUnlocker(VivoPatternUnlocker, () => {
  let lockBounds = idMatches('com.android.systemui:id/vivo_lock_pattern_view')
    .findOne(_config.timeout_findOne)
  if (!lockBounds) {
    console.error('无法找到图形密码所属控件信息')
    return false
  }
  lockBounds = lockBounds.bounds()
  let boxWidth = (lockBounds.right - lockBounds.left) / 3
  let boxHeight = (lockBounds.bottom - lockBounds.top) / 3
  let positions = this.password.split('').map(p => {
    let checkVal = parseInt(p) - 1
    return { r: parseInt(checkVal / 3), c: parseInt(checkVal % 3) }
  }).map(p => {
    return [parseInt(lockBounds.left + (0.5 + p.c) * boxWidth), parseInt(lockBounds.top + (0.5 + p.r) * boxHeight)]
  })
  gesture(220 * positions.length, positions)
  _config.overwrite('unlock_device_flag', DEVICE_TYPE.VIVO_PATTERN)
  return true
})