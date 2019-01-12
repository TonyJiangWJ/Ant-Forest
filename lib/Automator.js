/*
* @Author: NickHopps
* @Last Modified by:   NickHopps
* @Last Modified time: 2019-01-10 02:26:02
* @Description: 多版本支持
*/

// 安卓7.0以下版本使用 root 模式模拟操作
function Automation_root() {
  // 判断 ROOT 权限
  const _check_root = function() {
    const IS_ROOT = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su");
    if (!IS_ROOT) throw new Error("未获取ROOT权限");
  }

  return {
    click: function (x, y) {
      _check_root();
      return (shell("input tap " + x + " " + y, true).code === 0);
    },
    swipe: function (x1, y1, x2, y2, duration) {
      _check_root();
      return (shell("input swipe " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + duration, true).code === 0);
    },
    gesture: function(duration, points) {
      // 仅适用于安卓5.0及以上
      _check_root();
      const len = points.length;
      const step = duration / len;
      const start = points.shift();
      const ra = new RootAutomator();
      ra.touchDown(start[0], start[1]);
      sleep(step);
      points.forEach(function(el) {
        ra.touchMove(el[0], el[1]);
        sleep(step);
      });
      ra.touchUp();
      ra.exit();
      return true;
    },
    back: function() {
      _check_root();
      return (shell("input keyevent KEYCODE_BACK", true).code === 0);
    }
  }
}

// 安卓7.0及以上版本使用无障碍服务模拟操作
function Automation() {
  return {
    click: function (x, y) {
      return click(x, y);
    },
    swipe: function (x1, y1, x2, y2, duration) {
      return swipe(x1, y1, x2, y2, duration);
    },
    gesture: function(duration, points) {
      return gesture(duration, points);
    },
    back: function() {
      return back();
    }
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
