/*
 * @Author: NickHopps
 * @Last Modified by:   TonyJiangWJ
 * @Last Modified time: 2019-04-01 14:15:55
 * @Description: 自动化模块（多版本支持）
 */
let { config } = require('../config.js')

const hasRootPermission = function () {
  return files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su")
}

function Automation_root() {
  this.check_root = function () {
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

  this.gesture = function (duration, points) {
    this.check_root();
    let len = points.length,
      step = duration / len,
      start = points.shift();

    // 使用 RootAutomator 模拟手势，仅适用于安卓5.0及以上
    let ra = new RootAutomator();
    ra.touchDown(start[0], start[1]);
    sleep(step);
    points.forEach(function (el) {
      ra.touchMove(el[0], el[1]);
      sleep(step);
    });
    ra.touchUp();
    ra.exit();
    return true;
  }

  this.back = function () {
    this.check_root();
    return (shell("input keyevent KEYCODE_BACK", true).code === 0);
  }

  this.lockScreen = function () {
    return (shell("input keyevent 26", true).code === 0)
  }

  this.scrollDown = function (speed) {
    let millis = speed || config.scrollDownSpeed || 500
    let deviceHeight = device.height || 1900
    let bottomHeight = config.bottomHeight || 250
    swipe(400, deviceHeight - bottomHeight, 600, 200, millis)
  }

  this.clickBack = function () {
    if (descEndsWith('返回').exists()) {
      descEndsWith('返回')
        .findOne(config.timeout_findOne)
        .click()
    } else if (textEndsWith('返回').exists()) {
      textEndsWith('返回')
        .findOne(config.timeout_findOne)
        .click()
    }
    sleep(200)
  }

  this.clickClose = function () {
    if (descEndsWith('关闭').exists()) {
      descEndsWith('关闭')
        .findOne(config.timeout_findOne)
        .click()
    } else if (textEndsWith('关闭').exists()) {
      textEndsWith('关闭')
        .findOne(config.timeout_findOne)
        .click()
    }
  }

  this.enterFriendList = function () {
    if (descEndsWith('查看更多好友').exists()) {
      descEndsWith('查看更多好友')
        .findOne(config.timeout_findOne)
        .click()
    } else if (textEndsWith('查看更多好友').exists()) {
      textEndsWith('查看更多好友')
        .findOne(config.timeout_findOne)
        .click()
    }
    sleep(200)
  }
}

function Automation() {

  this.click = function (x, y) {
    return click(x, y);
  }

  this.swipe = function (x1, y1, x2, y2, duration) {
    return swipe(x1, y1, x2, y2, duration);
  }

  this.gesture = function (duration, points) {
    return gesture(duration, points);
  }

  this.back = function () {
    return back();
  }

  /**
   * 下拉状态栏，点击锁屏按钮
   */
  this.lockScreen = function () {
    swipe(500, 10, 500, 1000, 500)
    swipe(500, 10, 500, 1000, 500)
    // 点击锁屏按钮
    click(parseInt(config.lock_x), parseInt(config.lock_y))
  }

  this.scrollDown = function (speed) {
    let millis = speed || config.scrollDownSpeed || 500
    let deviceHeight = device.height || 1900
    let bottomHeight = config.bottomHeight || 250
    swipe(400, deviceHeight - bottomHeight, 600, 200, millis)
  }

  this.clickBack = function () {
    if (descEndsWith('返回').exists()) {
      descEndsWith('返回')
        .findOne(config.timeout_findOne)
        .click()
    } else if (textEndsWith('返回').exists()) {
      textEndsWith('返回')
        .findOne(config.timeout_findOne)
        .click()
    }
    sleep(200)
  }

  this.clickClose = function () {
    if (descEndsWith('关闭').exists()) {
      descEndsWith('关闭')
        .findOne(config.timeout_findOne)
        .click()
    } else if (textEndsWith('关闭').exists()) {
      textEndsWith('关闭')
        .findOne(config.timeout_findOne)
        .click()
    }
  }

  this.enterFriendList = function () {
    if (descEndsWith('查看更多好友').exists()) {
      descEndsWith('查看更多好友')
        .findOne(config.timeout_findOne)
        .click()
    } else if (textEndsWith('查看更多好友').exists()) {
      textEndsWith('查看更多好友')
        .findOne(config.timeout_findOne)
        .click()
    }
    sleep(200)
  }
}

const _automator = (device.sdkInt < 24 || hasRootPermission()) ? new Automation_root() : new Automation();
module.exports = {
  automator: {
    click: function (x, y) {
      return _automator.click(x, y);
    },
    clickCenter: function (obj) {
      return _automator.click(obj.bounds().centerX(), obj.bounds().centerY());
    },
    swipe: function (x1, y1, x2, y2, duration) {
      return _automator.swipe(x1, y1, x2, y2, duration);
    },
    gesture: function (duration, points) {
      return _automator.gesture(duration, points);
    },
    back: function () {
      return _automator.back();
    },
    lockScreen: function () {
      return _automator.lockScreen();
    },
    scrollDown: function (speed) {
      if (config.useCustomScrollDown) {
        return _automator.scrollDown(speed)
      } else {
        return scrollDown()
      }
    },
    clickBack: function () {
      return _automator.clickBack()
    },
    clickClose: function () {
      return _automator.clickClose()
    },
    enterFriendList: function () {
      return _automator.enterFriendList()
    }
  }
};
