let { config } = require('../../config.js')(runtime, global)
let sRequire = require('../SingletonRequirer.js')(runtime, global)
let warningFloaty = sRequire('WarningFloaty')
let logUtils = sRequire('LogUtils')

function LogFloaty () {
  this.logQueue = new LogQueue(15)

  let left = config.scaleRate * 100
  let top = config.device_height - 25 * 20

  this.pushLog = function (text) {
    logUtils.debugInfo(text)
    this.logQueue.push(text)
  }

  this.replaceLastLog = function (text) {
    logUtils.debugInfo(text)
    this.logQueue.replaceLast(text)
  }

  this.pushErrorLog = function (text) {
    logUtils.errorInfo(text)
    this.logQueue.push(text, '#ff0000')
  }

  this.pushWarningLog = function (text) {
    logUtils.warnInfo(text)
    this.logQueue.push(text, '#0000ff')
  }

  function LogQueue (maxSize) {
    this.currentSize = 0
    this._innerList = []

    this.push = function (logText, color) {
      this._innerList.push({ text: logText, color })
      if (this._innerList.length > maxSize) {
        this._innerList.shift()
      }
      this.drawLogs()
    }

    this.replaceLast = function (logText) {
      if (this._innerList.length <= 0) {
        return
      }
      let idx = this._innerList.length - 1
      this._innerList[idx].text = logText
      this.drawLogs()
    }

    this.drawLogs = function () {
      warningFloaty.clearAll('log')
      warningFloaty.disableDebugInfo = true
      if (this._innerList.length > 0) {
        for (let i = 0; i < this._innerList.length; i++) {
          let logInfo = this._innerList[i]
          warningFloaty.addText(logInfo.text, { x: left, y: top + i * 25 }, logInfo.color, null, 'log')
        }
      }
      warningFloaty.disableDebugInfo = false
    }
  }
}

module.exports = new LogFloaty()