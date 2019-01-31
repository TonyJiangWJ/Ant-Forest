/*
* @Author: NickHopps
* @Last Modified by:   NickHopps
* @Last Modified time: 2019-01-31 17:54:27
* @Description: 自动化模块（多版本支持）
*/

function Automation_root() {
  this.check_root = function() {
    if (!(files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su"))) throw new Error("未获取ROOT权限");
  }

  this.click = function (x, y) {
    this.check_root();
    return (shell("input tap " + x + " " + y, true).code === 0);
  }

  this.swipe = function (x1, y1, x2, y2, duration) {
    this.check_root();
    return (shell("input swipe " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + duration, true).code === 0);
  }

  this.gesture = function(duration, points) {
    this.check_root();
    let len = points.length,
        step = duration / len,
        start = points.shift();

    // 使用 RootAutomator 模拟手势，仅适用于安卓5.0及以上
    let ra = new RootAutomator();
    ra.touchDown(start[0], start[1]);
    sleep(step);
    points.forEach(function(el) {
      ra.touchMove(el[0], el[1]);
      sleep(step);
    });
    ra.touchUp();
    ra.exit();
    return true;
  }

  this.back = function() {
    this.check_root();
    return (shell("input keyevent KEYCODE_BACK", true).code === 0);
  }
}

function Automation() {
  this.click = function (x, y) {
    return click(x, y);
  }

  this.swipe = function (x1, y1, x2, y2, duration) {
    return swipe(x1, y1, x2, y2, duration);
  }

  this.gesture = function(duration, points) {
    return gesture(duration, points);
  }

  this.back = function() {
    return back();
  }
}

// 工厂方法
function Automator() {
  const _automator = (device.sdkInt < 24) ? new Automation_root() : new Automation();

  return {
    click: function (x, y) {
      return _automator.click(x, y);
    },
    clickCenter: function (obj) {
      return _automator.click(obj.bounds().centerX(), obj.bounds().centerY());
    },
    swipe: function (x1, y1, x2, y2, duration) {
      return _automator.swipe(x1, y1, x2, y2, duration);
    },
    gesture: function(duration, points) {
      return _automator.gesture(duration, points);
    },
    back: function () {
      return _automator.back();
    }
  }
}

module.exports = Automator;
