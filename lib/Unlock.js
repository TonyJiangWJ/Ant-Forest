/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-05 09:12:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-24 21:37:27
 * @Description: 
 */
let { config: _config, storageName: _storageName } = require('../config.js')(runtime, this)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let automator = singletonRequire('Automator')
let { logInfo, errorInfo, warnInfo, debugInfo } = singletonRequire('LogUtils')
let FileUtils = singletonRequire('FileUtils')
let _commonFunctions = singletonRequire('CommonFunction')
let _runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let ExternalUnlockDevice = files.exists(FileUtils.getCurrentWorkPath() + '/extends/ExternalUnlockDevice.js') ? require('../extends/ExternalUnlockDevice.js') : null

if (ExternalUnlockDevice) {
  logInfo('使用自定义解锁模块')
} else {
  logInfo('使用内置解锁模块')
}

let XIAOMI_MIX2S = function (obj) {
  this.__proto__ = obj
  // 图形密码解锁
  this.unlock_pattern = function (password) {
    if (typeof password !== 'string') throw new Error('密码应为字符串！')
    let lockBounds = id('com.android.systemui:id/lockPatternView')
      .findOne(_config.timeout_findOne)
      .bounds()
    let boxWidth = (lockBounds.right - lockBounds.left) / 3
    let boxHeight = (lockBounds.bottom - lockBounds.top) / 3
    let positions = password.split('').map(p => {
      let checkVal = parseInt(p) - 1
      return { r: parseInt(checkVal / 3), c: parseInt(checkVal % 3) }
    }).map(p => {
      return [parseInt(lockBounds.left + (0.5 + p.c) * boxWidth), parseInt(lockBounds.top + (0.5 + p.r) * boxHeight)]
    })
    gesture(220 * positions.length, positions)
    return this.check_unlock()
  }

  // 密码解锁（仅ROOT可用）
  this.unlock_password = function (password) {
    if (typeof password !== 'string') throw new Error('密码应为字符串！')
    // 直接在控件中输入密码
    setText(0, password)
    // 执行确认操作
    KeyCode('KEYCODE_ENTER')
    return this.check_unlock()
  }

  // PIN解锁
  this.unlock_pin = function (password) {
    if (typeof password !== 'string') throw new Error('密码应为字符串！')
    // 模拟按键
    let button = null
    for (let i = 0; i < password.length; i++) {
      let key_id = 'com.android.systemui:id/key' + password[i]
      if ((button = id(key_id).findOne(_config.timeout_findOne)) !== null) {
        button.click()
      }
      sleep(100)
    }
    return this.check_unlock()
  }

  // 判断解锁方式并解锁
  this.unlock = function (password) {
    if (typeof password === 'undefined' || password === null || password.length === 0) {
      errorInfo('密码为空：' + JSON.stringify(password))
      throw new Error('密码为空！')
    }
    if (id('com.android.systemui:id/lockPatternView').exists()) {
      return this.unlock_pattern(password)
    } else if (id('com.android.systemui:id/passwordEntry').exists()) {
      return this.unlock_password(password)
    } else if (idMatches('com.android.systemui:id/(fixedP|p)inEntry').exists()) {
      return this.unlock_pin(password)
    } else {
      logInfo(
        '识别锁定方式失败，型号：' + device.brand + ' ' + device.product + ' ' + device.release
      )
      return this.check_unlock()
    }
  }
}


const MyDevice = ExternalUnlockDevice || XIAOMI_MIX2S

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
    if (this.reTry > 3) {
      logInfo('解锁失败达到三次，停止运行')
      _config.resetBrightness && _config.resetBrightness()
      _runningQueueDispatcher.removeRunningTask()
      this.saveNeedRelock(true)
      engines.myEngine().forceStop()
    } else {
      let sleepMs = 5000 * this.reTry
      logInfo('解锁失败，' + sleepMs + 'ms之后重试')
      sleep(sleepMs)
      this.run_unlock()
    }
  }

  // 检测是否解锁成功
  this.check_unlock = function () {
    sleep(_config.timeout_unlock)
    if (
      textContains('重新').exists() ||
      textContains('重试').exists() ||
      textContains('错误').exists()
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
      }
      // 设置最低亮度 同时关闭自动亮度
      device.setBrightnessMode(0)
      device.setBrightness(0)
    }
    let limit = 3
    while (!device.isScreenOn() && limit-- > 0) {
      device.wakeUp()
      sleep(_config.timeout_unlock)
    }
    if (!device.isScreenOn()) {
      console.warn('isScreenOn判定失效，无法确认是否已亮屏。直接尝试后续解锁操作')
    }
  }

  // 划开图层
  this.swipe_layer = function () {
    let x = parseInt(_config.device_width * 0.2)
    gesture(320, [x, parseInt(_config.device_height * 0.8)], [x, parseInt(_config.device_height * 0.3)])
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
        warnInfo('当前设备可能在裤兜内，5分钟后尝试')
        _runningQueueDispatcher.removeRunningTask()
        engines.myEngine().forceStop()
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
    storage.put('needRelock', JSON.stringify({needRelock: this.relock, timeout: new Date().getTime() + 30000 }))
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

const _unlocker = new MyDevice(new Unlocker())
module.exports = {
  exec: function () {
    _unlocker.reTry = 0
    _unlocker.run_unlock()
    if (!_unlocker.relock) {
      // 未锁定屏幕情况下，判断是否在白名单中
      _commonFunctions.delayStartIfInSkipPackage()
    }
  },
  needRelock: function () {
    logInfo('是否需要重新锁定屏幕：' + _unlocker.relock)
    return _unlocker.relock
  },
  saveNeedRelock: function (notRelock) {
    _unlocker.saveNeedRelock(notRelock)
  },
  unlocker: _unlocker
}
