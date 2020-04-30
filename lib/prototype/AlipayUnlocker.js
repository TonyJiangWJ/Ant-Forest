let { config: _config } = require('../../config.js')(runtime, this)
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let WidgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')

const AlipayUnlocker = function () {
}
AlipayUnlocker.prototype.drawGestureByPassword = function (lockBounds) {
  let password = _config.alipay_lock_password
  let boxWidth = (lockBounds.right - lockBounds.left) / 3
  let boxHeight = (lockBounds.bottom - lockBounds.top) / 3
  let positions = password.split('').map(p => {
    let checkVal = parseInt(p) - 1
    return { r: parseInt(checkVal / 3), c: parseInt(checkVal % 3) }
  }).map(p => {
    return [parseInt(lockBounds.left + (0.5 + p.c) * boxWidth), parseInt(lockBounds.top + (0.5 + p.r) * boxHeight)]
  })
  gesture(220 * positions.length, positions)
}

AlipayUnlocker.prototype.unlockAlipay = function () {
  let gestureButton = WidgetUtils.widgetGetOne('验证手势', 2000)
  if (gestureButton) {
    automator.clickCenter(gestureButton)
    sleep(500)
  }
  let lockView = WidgetUtils.widgetGetById('.*lockView.*')
  if (lockView) {
    this.drawGestureByPassword(lockView.bounds())
  }
}

module.exports = new AlipayUnlocker()