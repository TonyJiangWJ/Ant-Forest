/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-02 19:05:01
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-14 23:40:26
 * @Description: 悬浮窗工具，单独提出来作为单例使用
 */
let { config: _config } = require('../../config.js')(runtime, this)
let _debugInfo = typeof debugInfo === 'undefined' ? (v) => console.verbose(v) : debugInfo
let _errorInfo = typeof errorInfo === 'undefined' ? (v) => console.error(v) : errorInfo
let FloatyUtil = function () {
  this.floatyWindow = null
  this.floatyInitStatus = false
  this.floatyLock = null
  this.floatyCondition = null
  this.showLog = false

  this.debugInfo = function (content) {
    this.showLog && _debugInfo(content)
  }
}
FloatyUtil.prototype.init = function () {
  if (this.floatyInitStatus) {
    return true
  }
  this.floatyLock = threads.lock()
  this.floatyCondition = this.floatyLock.newCondition()
  let _this = this
  threads.start(function () {
    // 延迟初始化，避免死机
    sleep(400)
    _this.floatyLock.lock()
    try {
      if (_this.floatyInitStatus) {
        return true
      }
      _this.floatyWindow = floaty.rawWindow(
        <frame gravity="left">
          <text id="content" textSize="8dp" textColor="#00ff00" />
        </frame>
      )
      _this.floatyWindow.setTouchable(false)
      _this.floatyWindow.setPosition(50, 50 + _config.bang_offset)
      _this.floatyWindow.content.text('悬浮窗初始化成功')
      _this.floatyInitStatus = true
    } catch (e) {
      _errorInfo('悬浮窗初始化失败' + e)
      _this.floatyInitStatus = false
    } finally {
      _this.floatyCondition.signalAll()
      _this.floatyLock.unlock()
    }
  })
  this.floatyLock.lock()
  try {
    if (this.floatyInitStatus === false) {
      this.debugInfo('等待悬浮窗初始化')
      this.floatyCondition.await()
    }
  } finally {
    this.floatyLock.unlock()
  }
  this.debugInfo('悬浮窗初始化' + (this.floatyInitStatus ? '成功' : '失败'))
  return this.floatyInitStatus
}

FloatyUtil.prototype.close = function () {
  if (this.floatyInitStatus) {
    this.floatyLock.lock()
    try {
      if (this.floatyWindow !== null) {
        this.floatyWindow.close()
        this.floatyWindow = null
      }
      this.floatyInitStatus = false
    } finally {
      this.floatyLock.unlock()
    }
  }
}

FloatyUtil.prototype.setFloatyInfo = function (position, text, option) {
  option = option || {}
  if (this.floatyWindow === null) {
    this.init()
  }
  let _this = this
  ui.run(function () {
    _this.floatyLock.lock()
    try {
      if (position && isFinite(position.x) && isFinite(position.y)) {
        _this.floatyWindow.setPosition(parseInt(position.x), parseInt(position.y) + _config.bang_offset)
      }
      if (text) {
        _this.floatyWindow.content.text(text)
        _this.debugInfo(text)
      }
      if (option.textSize) {
        _this.floatyWindow.content.setTextSize(option.textSize)
      }
      if (typeof option.touchable !== 'undefined') {
        _this.floatyWindow.setTouchable(option.touchable)
      }
    } finally {
      _this.floatyLock.unlock()
    }
  })
}


FloatyUtil.prototype.setFloatyTextColor = function (colorStr) {
  if (this.floatyWindow === null) {
    this.init()
  }
  if (/^#[\dabcdef]{6,8}$/i.test(colorStr)) {
    let colorInt = colors.parseColor(colorStr)
    if (colorInt !== null) {
      let _this = this
      ui.run(function () {
        _this.floatyLock.lock()
        try {
          _this.floatyWindow.content.setTextColor(colorInt)
        } finally {
          _this.floatyLock.unlock()
        }
      })
    }
  } else {
    console.error('颜色值字符串格式不正确: ' + colorStr)
  }
}

FloatyUtil.prototype.setFloatyText = function (text, option) {
  this.setFloatyInfo(null, text, option)
}

FloatyUtil.prototype.setFloatyPosition = function (x, y, option) {
  this.setFloatyInfo({ x: x, y: y }, null, option)
}

FloatyUtil.prototype.setTextSize = function (textSize) {
  this.setFloatyInfo(null, null, { textSize: textSize })
}

FloatyUtil.prototype.setTouchable = function (touchable) {
  this.setFloatyInfo(null, null, { touchable: touchable })
}

FloatyUtil.prototype.disableLog = function () {
  this.showLog = false
}

FloatyUtil.prototype.enableLog = function () {
  this.showLog = true
}

module.exports = new FloatyUtil()