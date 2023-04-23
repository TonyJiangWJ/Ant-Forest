/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-25 20:37:31
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2023-04-22 15:09:17
 * @Description: 
 */
let { config: _config } = require('../../config.js')(runtime, global)
let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let _logUtils = singletonRequire('LogUtils')
let FileUtils = singletonRequire('FileUtils')
let customLockScreen = files.exists(FileUtils.getCurrentWorkPath() + '/extends/LockScreen.js') ? require('../../extends/LockScreen.js') : null


const hasRootPermission = function () {
  return files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su")
}

const _automator = (device.sdkInt < 24 || hasRootPermission()) ? new Automation_root() : new Automation()

/**
 * 获取区域内的随机数，并避免获取到边界
 * @param {*} min 最小值
 * @param {*} max 最大值
 * @returns 随机值
 */
const randomRange = (min, max) => {
  let padding = Math.floor((max - min) / 5)
  return min + padding + Math.ceil(Math.random() * (max - min - 2 * padding))
}

function isPositionValid(x, y) {
  if (x < 0 || y < 0 || x >= config.device_width || y >= config.device_height) {
    return false
  }
  return true
}

function checkClickPosition (x, y) {
  if (!isPositionValid(x, y)) {
    throw new Error('点击区域超出屏幕外，请检查代码是否正确：' + x + ',' + y)
  }
}

module.exports = {
  checkClickable: function (x, y) {
    return isPositionValid(x, y)
  },
  checkCenterClickable: function (target) {
    return target && target.bounds && isPositionValid(target.bounds().centerX(), target.bounds().centerY())
  },
  registerVisualHelper: function (visualHelper) {
    _automator.registerVisualHelper(visualHelper)
  },
  click: function (x, y) {
    checkClickPosition(x, y)
    _logUtils.debugInfo(['点击了：{}, {}', x, y])
    return _automator.click(x, y)
  },
  clickCenter: function (obj) {
    checkClickPosition(obj.bounds().centerX(), obj.bounds().centerY())
    return _automator.click(obj.bounds().centerX(), obj.bounds().centerY())
  },
  clickRandom: function (obj) {
    let bounds = obj.bounds()
    let { left, top, right, bottom } = bounds
    let x = randomRange(left, right)
    let y = randomRange(top, bottom)
    _logUtils.debugInfo(['random clicked: [{}, {}]', x, y])
    if (_automator.visualHelper) {
      _automator.visualHelper.addText('↓', { x: x - 8, y: y - 2 }, '#e440e1')
      _automator.visualHelper.addRectangle('', [x, y, 5, 5])
    }
    return _automator.click(x, y)
  },
  clickRandomRegion: function (region) {
    if (Object.prototype.toString.call(region) === '[object Array]' && region.length > 3) {
      region = { left: region[0], top: region[1], width: region[2], height: region[3] }
    }
    let { left, top, width, height } = region
    let right = left + width, bottom = top + height
    if (left < 0 || left > _config.device_width
      || top < 0 || top > _config.device_height
      || right < 0 || right > _config.device_width
      || bottom < 0 || bottom > _config.device_height) {
      _logUtils.errorInfo(['区域信息不在屏幕内，取消点击：{}', region])
      return false
    }
    let x = randomRange(left, left + width)
    let y = randomRange(top, top + height)
    _logUtils.debugInfo(['randomRegion clicked: [{}, {}]', x, y])
    if (_automator.visualHelper) {
      _automator.visualHelper.addText('↓', { x: x - 8, y: y - 2 }, '#e440e1')
      _automator.visualHelper.addRectangle('', [x, y, 5, 5])
    }
    return _automator.click(x, y)
  },
  swipe: function (x1, y1, x2, y2, duration) {
    return _automator.swipe(x1, y1, x2, y2, duration)
  },
  gesture: function (duration, points) {
    return _automator.gesture(duration, points)
  },
  back: function () {
    return _automator.back()
  },
  lockScreen: function () {
    _config.notNeedRelock = true
    return _automator.lockScreen()
  },
  scrollDown: function () {
    if (_config.useCustomScrollDown) {
      return _automator.scrollDown()
    } else {
      return scrollDown()
    }
  },
  /**
   * 页面向下滑动 startY > endY 手势向上
   * 
   * @param {*} startY 起始高度
   * @param {*} endY 结束高度
   * @param {*} duration 
   * @returns 
   */
  gestureDown: function (startY, endY, duration) {
    return _automator.scrollDown(startY, endY, duration)
  },
  /**
   * 页面向上滑动 startY < endY 手势向下
   * 
   * @param {*} startY 起始高度
   * @param {*} endY 结束高度
   * @param {*} duration 
   * @returns 
   */
  gestureUp: function (startY, endY, duration) {
    return _automator.scrollUp(startY, endY, duration)
  },
  scrollUp: function (speed) {
    if (_config.useCustomScrollDown) {
      _automator.scrollUp()
    } else {
      scrollUp()
    }
  },
  scrollUpAndDown: function (speed) {
    _automator.scrollUpAndDown(speed)
  },
  clickBack: function (forceBack) {
    return _automator.clickBack(forceBack)
  },
  clickClose: function () {
    return _automator.clickClose()
  },
  randomScrollDown: function (minStart, maxStart, minEnd, maxEnd) {
    let duration = 100 + Math.random() * 1000 % 300
    let height = _config.device_height
    let startY = randomNum(minStart || height * 0.80, maxStart || height * 0.85)
    let endY = randomNum(minEnd || height * 0.15, maxEnd || height * 0.2)
    _logUtils.debugInfo(['ScrollDown 滑动起始：{} 结束：{}', startY, endY])
    this.gestureDown(startY, endY, duration)
    sleep(duration)
  },
  randomScrollUp: function (minStart, maxStart, minEnd, maxEnd) {
    let duration = 100 + Math.random() * 1000 % 300
    let height = _config.device_height
    let startY = randomNum(minStart || height * 0.15, maxStart || height * 0.2)
    let endY = randomNum(minEnd || height * 0.8, maxEnd || height * 0.85)
    _logUtils.debugInfo(['ScrollUp 滑动起始：{} 结束：{}', startY, endY])
    this.gestureUp(startY, endY, duration)
    sleep(duration)
  }
}

function CommonAutomation () {
  this.visualHelper = null

  this.registerVisualHelper = function (visualHelper) {
    this.visualHelper = visualHelper
  }

  this.scrollDown = function (startY, endY, duration) {
    let deviceHeight = _config.device_height || 1900
    let bottomHeight = _config.bottomHeight || 250
    let points = []
    let startX = parseInt(_config.device_width / 2) + ~~(Math.random() * 100 % 40 + 50) * (Math.random() > 0.5 ? 1 : -1)
    startY = startY || deviceHeight - bottomHeight
    endY = endY || parseInt(deviceHeight / 5)
    if (startY < endY) {
      let tmp = endY
      endY = startY
      startY = tmp
    }
    let distY = startY - endY
    let distX = 100

    let sum = 0, step = 1
    let gaps = []
    while (sum < distY) {
      step *= 1.2
      sum += Math.log2(step)
      gaps.push(Math.log2(step))
    }
    let currentY = startY, currentX = startX
    let gapX = distX / gaps.length
    gaps.reverse().forEach(v => {
      points.push([currentX, currentY])
      currentY -= v
      currentX += gapX
    })
    this.gesture(duration || points.length * 8, points)
  }

  this.scrollUp = function (startY, endY, duration) {
    let deviceHeight = _config.device_height || 1900
    let points = []
    let startX = parseInt(_config.device_width / 2) + ~~(Math.random() * 100 % 40 + 50) * (Math.random() > 0.5 ? 1 : -1)
    startY = startY || deviceHeight / 3
    endY = endY || deviceHeight * 0.75
    if (startY > endY) {
      let tmp = endY
      endY = startY
      startY = tmp
    }
    let distY = endY - startY
    let distX = 100
    let sum = 0, step = 1
    let gaps = []
    while (sum < distY) {
      step *= 1.2
      sum += Math.log2(step)
      gaps.push(Math.log2(step))
    }
    let currentY = startY, currentX = startX
    let gapX = distX / gaps.length
    gaps.reverse().forEach(v => {
      points.push([currentX, currentY])
      currentY += v
      currentX += gapX
    })
    this.gesture(duration || points.length * 8, points)
  }

  this.scrollUpAndDown = function (speed) {
    let millis = parseInt(speed || _config.scrollDownSpeed || 500)

    let deviceHeight = _config.device_height || 1900
    let bottomHeight = _config.bottomHeight || 250
    let x = parseInt(_config.device_width / 2)
    let startPoint = deviceHeight - bottomHeight
    // 滑动距离，二分之一屏幕
    let distance = parseInt(deviceHeight / 2)
    let endPoint = startPoint - distance
    // 手势上划
    this.swipe(x, startPoint, x + 100, endPoint, millis)
    sleep(millis + 20)
    this.swipe(x, endPoint, x + 100, startPoint, millis)
  }

  this.clickBack = function (forceBack) {
    let hasButton = false
    if (descEndsWith('返回').exists()) {
      descEndsWith('返回')
        .findOne(_config.timeout_findOne)
        .click()
      hasButton = true
    } else if (textEndsWith('返回').exists()) {
      textEndsWith('返回')
        .findOne(_config.timeout_findOne)
        .click()
      hasButton = true
    } else if (forceBack) {
      this.back()
    }
    if (hasButton) {
      sleep(200)
    }
    return hasButton
  }

  this.clickClose = function () {
    let hasButton = false
    if (descEndsWith('关闭').exists()) {
      descEndsWith('关闭')
        .findOne(_config.timeout_findOne)
        .click()
      hasButton = true
    } else if (textEndsWith('关闭').exists()) {
      textEndsWith('关闭')
        .findOne(_config.timeout_findOne)
        .click()
      hasButton = true
    }
    if (hasButton) {
      sleep(200)
    }
    return hasButton
  }

}
function Automation_root () {
  CommonAutomation.call(this)

  this.check_root = function () {
    if (!(files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su"))) throw new Error("未获取ROOT权限")
  }

  this.click = function (x, y) {
    this.check_root()
    return (shell("input tap " + x + " " + y, true).code === 0)
  }

  this.swipe = function (x1, y1, x2, y2, duration) {
    this.check_root()
    return (shell("input swipe " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + duration, true).code === 0)
  }

  this.gesture = function (duration, points) {
    this.check_root()
    let len = points.length,
      step = duration / len,
      start = points.shift()

    // 使用 RootAutomator 模拟手势，仅适用于安卓5.0及以上
    let ra = new RootAutomator()
    ra.touchDown(start[0], start[1])
    sleep(step)
    points.forEach(function (el) {
      ra.touchMove(el[0], el[1])
      sleep(step)
    })
    ra.touchUp()
    ra.exit()
    return true
  }

  this.back = function () {
    this.check_root()
    return (shell("input keyevent KEYCODE_BACK", true).code === 0)
  }

  this.lockScreen = function () {
    return (shell("input keyevent 26", true).code === 0)
  }

}

function Automation () {
  CommonAutomation.call(this)

  this.click = function (x, y) {
    return click(x, y)
  }

  this.swipe = function (x1, y1, x2, y2, duration) {
    return swipe(x1, y1, x2, y2, duration)
  }

  this.gesture = function (duration, points) {
    return gesture(duration, points)
  }

  this.back = function () {
    return back()
  }

  /**
   * 首先尝试无障碍方式锁屏，失败后使用 下拉状态栏，点击锁屏按钮 的方式锁屏
   */
  this.lockScreen = function () {
    // 使用无障碍服务进行锁屏
    if (auto.service.performGlobalAction(8)) {
      return
    }
    _logUtils.debugInfo('使用无障碍锁屏失败，尝试模拟点击方式')
    if (customLockScreen) {
      customLockScreen()
    } else {
      // MIUI 12 新控制中心
      swipe(800, 10, 800, 500, 230)
      sleep(1000)
      // 点击锁屏按钮
      click(parseInt(_config.lock_x), parseInt(_config.lock_y))
    }
  }

}

function randomNum (min, max) {
  return ~~(min + Math.random() * (max - min))
}
