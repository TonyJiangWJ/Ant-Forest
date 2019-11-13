/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-04-01 14:16:07
 * @Description: 手机解锁模块
 */
let { config } = require('../config.js')
let { automator } = require('./Automator.js')
let { commonFunctions } = require('./CommonFunction.js')
let Devices = {
  HUAWEI_EMUI8: function (obj) {
    this.__proto__ = obj

    // 图形密码解锁
    this.unlock_pattern = function (password) {
      if (typeof password !== 'string') throw new Error('密码应为字符串！')
      let pattern_view = id('com.android.systemui:id/lockPatternView')
        .findOne(config.timeout_findOne)
        .bounds(),
        pattern_size = 3,
        len = password.length,
        view_x = pattern_view.left,
        view_y = pattern_view.top,
        width = (pattern_view.right - pattern_view.left) / pattern_size,
        height = (pattern_view.bottom - pattern_view.top) / pattern_size,
        points = [],
        ges_param = []
      // 记录图形点信息
      for (let i = 0; i < pattern_size; i++) {
        for (let j = 0; j < pattern_size; j++) {
          let index = pattern_size * i + (j + 1)
          points[index] = [
            parseInt(view_x + j * width + width / 2),
            parseInt(view_y + i * height + height / 2)
          ]
        }
      }
      // 构造滑动参数
      for (let i = 0; i < len; i++) ges_param.push(points[password[i]])
      // 使用手势解锁
      automator.gesture(300 * len, ges_param)
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
      for (let i = 0; i < password.length; i++) {
        let key_id = 'com.android.systemui:id/key' + password[i]
        id(key_id)
          .findOne(config.timeout_findOne)
          .click()
        sleep(100)
      }
      return this.check_unlock()
    }

    // 判断解锁方式并解锁
    this.unlock = function (password) {
      if (id('com.android.systemui:id/lockPatternView').exists()) {
        return this.unlock_pattern(password)
      } else if (id('com.android.systemui:id/passwordEntry').exists()) {
        return this.unlock_password(password)
      } else if (id('com.android.systemui:id/pinEntry').exists()) {
        return this.unlock_pin(password)
      } else {
        logInfo(
          '识别锁定方式失败，型号：' + device.brand + ' ' + device.product + ' ' + device.release
        )
        return this.check_unlock()
      }
    }
  },
  XIAOMI_MIX2S: function (obj) {
    this.__proto__ = obj

    // 图形密码解锁
    this.unlock_pattern = function (password) {
      if (typeof password !== 'string') throw new Error('密码应为字符串！')
      let pattern_view = id('com.android.systemui:id/lockPatternView')
        .findOne(config.timeout_findOne)
        .bounds(),
        pattern_size = 3,
        len = password.length,
        view_x = pattern_view.left,
        view_y = pattern_view.top,
        width = (pattern_view.right - pattern_view.left) / pattern_size,
        height = (pattern_view.bottom - pattern_view.top) / pattern_size,
        points = [],
        ges_param = []
      // 记录图形点信息
      for (let i = 0; i < pattern_size; i++) {
        for (let j = 0; j < pattern_size; j++) {
          let index = pattern_size * i + (j + 1)
          points[index] = [
            parseInt(view_x + j * width + width / 2),
            parseInt(view_y + i * height + height / 2)
          ]
        }
      }
      // 构造滑动参数
      for (let i = 0; i < len; i++) ges_param.push(points[password[i]])
      // 使用手势解锁
      automator.gesture(300 * len, ges_param)
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
      for (let i = 0; i < password.length; i++) {
        let key_id = 'com.android.systemui:id/key' + password[i]
        id(key_id)
          .findOne(config.timeout_findOne)
          .click()
        sleep(100)
      }
      return this.check_unlock()
    }

    // 判断解锁方式并解锁
    this.unlock = function (password) {
      if (id('com.android.systemui:id/lockPatternView').exists()) {
        return this.unlock_pattern(password)
      } else if (id('com.android.systemui:id/passwordEntry').exists()) {
        return this.unlock_password(password)
      } else if (id('com.android.systemui:id/pinEntry').exists()) {
        return this.unlock_pin(password)
      } else {
        logInfo(
          '识别锁定方式失败，型号：' + device.brand + ' ' + device.product + ' ' + device.release
        )
        return this.check_unlock()
      }
    }
  }
}

const MyDevice = Devices.XIAOMI_MIX2S

function Unlocker() {
  const _device = new MyDevice(this),
    _HEIGHT = device.height,
    _WIDTH = device.width,
    _km = context.getSystemService(context.KEYGUARD_SERVICE)

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
      device.setBrightnessMode(1)
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
    sleep(config.timeout_unlock)
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
    while (!device.isScreenOn()) {
      device.wakeUp()
      sleep(config.timeout_unlock)
    }
  }

  // 划开图层
  this.swipe_layer = function () {
    // let x = _WIDTH / 2;
    // let y = _HEIGHT / 6;
    // gesture(320, [x, 5 * y], [x, 1 * y])
    // 暂时写死 否则兼容性较差
    gesture(320, [540, 1800], [540, 1000])
    sleep(config.timeout_unlock)
  }

  // 执行解锁操作
  this.run_unlock = function () {
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
    this.relock = true
    logInfo('需要重新锁定屏幕')
    if (config.autoSetBrightness) {
      // 设置最低亮度 同时关闭自动亮度
      device.setBrightnessMode(0)
      device.setBrightness(0)
    }
    // 首先点亮屏幕
    this.wakeup()
    // 打开滑动层
    this.swipe_layer()
    // 如果有锁屏密码则输入密码
    if (this.is_passwd() && !_device.unlock(config.password)) {
      // 如果解锁失败
      this.failed()
    }
  }
}

const _unlocker = new Unlocker()
module.exports = {
  unlocker: {
    exec: function () {
      _unlocker.reTry = 0
      _unlocker.run_unlock()
    },
    needRelock: function () {
      logInfo('是否需要重新锁定屏幕：' + _unlocker.relock)
      let tmp = _unlocker.relock
      _unlocker.relock = false
      return tmp
    }
  }
}
