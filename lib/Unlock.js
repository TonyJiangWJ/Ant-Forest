/*
 * @Author: NickHopps
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-03-17 09:31:30
 * @Description: 手机解锁模块
 */

var Devices = {
  HUAWEI_EMUI8: function(obj) {
    this.__proto__ = obj;

    // 图形密码解锁
    this.unlock_pattern = function(password) {
      if (typeof password !== "string") throw new Error("密码应为字符串！");
      let pattern_view = id("com.android.systemui:id/lockPatternView").findOne(this.config.get("timeout_findOne")).bounds(),
          pattern_size = 3,
          len = password.length,
          view_x = pattern_view.left,
          view_y = pattern_view.top,
          width = (pattern_view.right - pattern_view.left) / pattern_size,
          height = (pattern_view.bottom - pattern_view.top) / pattern_size,
          points = [],
          ges_param = [];
      // 记录图形点信息
      for (let i = 0; i < pattern_size; i++) {
        for (let j = 0; j < pattern_size; j++) {
          let index = pattern_size * i + (j + 1);
          points[index] = [parseInt(view_x + j * width + width / 2), parseInt(view_y + i * height + height / 2)];
        }
      }
      // 构造滑动参数
      for (var i = 0; i < len; i++) ges_param.push(points[password[i]]);
      // 使用手势解锁
      this.automator.gesture(300 * len, ges_param);
      return this.check_unlock();
    }

    // 密码解锁（仅ROOT可用）
    this.unlock_password = function(password) {
      if (typeof password !== "string") throw new Error("密码应为字符串！");
      // 直接在控件中输入密码
      setText(0, password);
      // 执行确认操作
      KeyCode("KEYCODE_ENTER");
      return this.check_unlock();
    }

    // PIN解锁
    this.unlock_pin = function(password) {
      if (typeof password !== "string") throw new Error("密码应为字符串！");
      // 模拟按键
      for (let i = 0; i < password.length; i++) {
        let key_id = "com.android.systemui:id/key" + password[i];
        id(key_id).findOne(this.config.get("timeout_findOne")).click();
        sleep(100);
      }
      return this.check_unlock();
    }

    // 判断解锁方式并解锁
    this.unlock = function(password) {
      if (id("com.android.systemui:id/lockPatternView").exists()) {
        return this.unlock_pattern(password);
      } else if (id("com.android.systemui:id/passwordEntry").exists()) {
        return this.unlock_password(password);
      } else if (id("com.android.systemui:id/pinEntry").exists()) {
        return this.unlock_pin(password);
      } else {
        toastLog("识别锁定方式失败，型号：" + device.brand + " " + device.product + " " + device.release);
        return this.check_unlock();
      }
    }
  }
}

var MyDevice = Devices.HUAWEI_EMUI8;

function Unlocker(automator) {
  const _device = new MyDevice(this),
        _HEIGHT = device.height,
        _WIDTH = device.width,
        _km = context.getSystemService(context.KEYGUARD_SERVICE);

  this.automator = automator;
  this.config = storages.create("ant_forest_config");

  // 设备是否锁屏
  this.is_locked = function() {
    return _km.inKeyguardRestrictedInputMode();
  }

  // 设备是否加密
  this.is_passwd = function() {
    return _km.isKeyguardSecure();
  }

  // 解锁失败
  this.failed = function() {
    log("解锁失败，停止运行");
    exit();
  }

  // 检测是否解锁成功
  this.check_unlock = function() {
    sleep(this.config.get("delay_unlock"));
    if (this.is_locked() == true) this.failed();
    return !this.is_locked();
  }

  // 唤醒设备
  this.wakeup = function() {
    while (!device.isScreenOn()) {
      device.wakeUp();
      sleep(this.config.get("delay_unlock"));
    }
  }

  // 划开图层
  this.swipe_layer = function() {
    let x = _WIDTH / 2;
    let y = _HEIGHT / 4;
    this.automator.swipe(x, (3 * y), x, y, 300);
    sleep(this.config.get("delay_unlock"));
  }

  // 执行解锁操作
  this.run_unlock = function() {
    // 如果已经解锁则返回
    if (!this.is_locked()) return true;
    // 首先点亮屏幕
    this.wakeup();
    // 打开滑动层
    this.swipe_layer();
    // 如果有锁屏密码则输入密码
    if (this.is_passwd()) _device.unlock(this.config.get("password"))
    // 检测是否解锁成功
    this.check_unlock();
  }
}

function Unlock(automator) {
  const _unlocker = new Unlocker(automator);
  return {
    exec: function() {
      _unlocker.run_unlock();
    }
  }
}

module.exports = Unlock;
