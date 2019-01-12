/*
* @Author: NickHopps
* @Last Modified by:   NickHopps
* @Last Modified time: 2019-01-10 02:26:10
* @Description: 手机解锁模块
*/

function Unlock(automator, config) {
  const _automator = automator;
  const _config = config;
  const _secure = new Secure(this);
  const _HEIGHT = device.height,
        _WIDTH = device.width;
  const _km = context.getSystemService(context.KEYGUARD_SERVICE),
        _is_locked = _km.inKeyguardRestrictedInputMode(),
        _is_passwd = _km.isKeyguardSecure();

  // 唤醒设备
  const _wakeup = function() {
    while (!device.isScreenOn()) {
      device.wakeUp();
      sleep(1000);
    }
  }

  // 划开图层
  const _swipe_layer = function() {
    const x = _WIDTH / 2;
    const y = _HEIGHT / 4;
    _automator.swipe(x, (3 * y), x, y, 300);
    sleep(1000);
  }

  // 解锁失败
  const _failed = function() {
    engines.stopAll();
    return false;
  }

  // 检测是否解锁成功
  this._check_unlock = function() {
    if (textContains("重新").exists() || textContains("重试").exists() || textContains("错误").exists()) {
      toastLog("密码错误");
      return _failed();
    }
    return !_is_locked;
  }

  // 图形密码解锁
  this._unlock_pattern = function(password) {
    if (typeof password !== "string") throw new Error("密码应为字符串！");
    // 默认使用九宫格解锁
    const pattern_size = 3;
    const len = password.length;
    const pattern_view = id("com.android.systemui:id/lockPatternView").findOne().bounds();
    const view_x = pattern_view.left,
          view_y = pattern_view.top;
    const width = (pattern_view.right - pattern_view.left) / pattern_size,
          height = (pattern_view.bottom - pattern_view.top) / pattern_size;

    // 收集所有点的位置信息
    let points = new Array();
    for (let i = 0; i < pattern_size; i++) {
      for (let j = 0; j < pattern_size; j++) {
        let index = pattern_size * i + (j + 1);
        points[index] = [parseInt(view_x + j * width + width / 2), parseInt(view_y + i * height + height / 2)];
      }
    }
    let ges_param = [];
    for (var i = 0; i < len; i++) {
      ges_param.push(points[password[i]]);
    }
    _automator.gesture(300 * len, ges_param);
    return this._check_unlock();
  }

  // 混合密码解锁
  this._unlock_password = function(password) {
    if (typeof password !== "string") throw new Error("密码应为字符串！");
    setText(0, password);
    if (text("确认").exists()) {
      text("确认").findOne().click(); // 仅对解锁界面包含确认按钮的设备有效
    } else {
      KeyCode("KEYCODE_ENTER"); // 仅对已ROOT的设备有效
    }
    return this._check_unlock();
  }

  // PIN解锁
  this._unlock_pin = function(password) {
    if (typeof password !== "string") throw new Error("密码应为字符串！");
    const len = password.length;
    for (let i = 0; i < len; i++) {
      let key_id = "com.android.systemui:id/key" + password[i];
      if (!id(key_id).exists()) return false;
      id(key_id).findOne().click();
      sleep(100);
    }
    if (id("com.android.systemui:id/key_enter").exists()) {
      id("com.android.systemui:id/key_enter").findOne().click();
    }
    return this._check_unlock();
  }

  return {
    exec: function() {
      const retry_times =_config.max_retry_times;
      const password = _config.password;
      for (let i = 0; i < retry_times; i++) {
        // 如果已经解锁则返回
        if (!_is_locked) return true;
        // 首先点亮屏幕
        _wakeup();
        // 如果有滑动图层则上滑打开
        if (_secure.has_layer) _swipe_layer();
        // 如果有锁屏密码则输入密码
        if (_is_passwd) {
          if (password.length < 4) throw new Error("密码不符合要求！");
          return _secure.unlock(password);
        }
      }
      // 解锁失败
      return _failed();
    }
  }
}

function Secure(secure) {
  this.__proto__ = secure;
  this.has_layer = id("com.android.systemui:id/notification_panel").visibleToUser(true).exists();

  this.unlock = function(password) {
    if (id("com.android.systemui:id/lockPatternView").exists()) {
      return this._unlock_pattern(password);
    } else if (id("com.android.systemui:id/passwordEntry").exists()) {
      return this._unlock_password(password);
    } else if (id("com.android.systemui:id/pinEntry").exists()) {
      return this._unlock_pin(password);
    } else {
      toastLog("识别锁定方式失败，型号：" + device.brand + " " + device.product + " " + device.release);
      return this._check_unlock();
    }
  }
}

module.exports = Unlock;
