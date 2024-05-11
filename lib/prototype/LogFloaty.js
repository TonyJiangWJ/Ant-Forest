let { config } = require('../../config.js')(runtime, global)
let sRequire = require('../SingletonRequirer.js')(runtime, global)
let warningFloaty = sRequire('WarningFloaty')
let logUtils = sRequire('LogUtils')
/**
 * 非UI线程安全，请在UI线程调用时另外起线程调用
 */
function LogFloaty () {
  this.logQueue = new LogQueue(15, this)
  this.fontSize = 25

  let left = config.scaleRate * 100
  let top = config.device_height - 1.2 * this.fontSize * 15

  this.hide = function () {
    warningFloaty.disableTip()
  }

  this.show = function () {
    warningFloaty.enableTip()
  }

  this.setFontSize = function (size) {
    this.fontSize = size
    top = config.device_height - 1.2 * this.fontSize * 15
  }

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

  function LogQueue (maxSize, parent) {
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
      try {
        warningFloaty.clearAll('log')
        warningFloaty.disableDebugInfo = true
        let widthScale = 0.9
        if (this._innerList.length > 0) {
          let displayQueue = []
          for (let i = 0; i < this._innerList.length; i++) {
            let logInfo = this._innerList[i]
            if (logInfo.text.length * parent.fontSize > widthScale * config.device_width) {
              // 超长的log，分行显示 直接按字符数计算，并不精确，英文并不等宽，中文实际宽度不一定等于字数宽度 but it works fine for most cases
              let lines = []
              let words = logInfo.text.split('')
              let wordsPerLine = Math.floor(widthScale * config.device_width / parent.fontSize)
              let line = ''
              for (let j = 0; j < words.length; j++) {
                if (line.length >= wordsPerLine) {
                  lines.push(line)
                  line = ''
                }
                line += words[j]
              }
              if (line.length > 0) {
                lines.push(line)
              }
              for (let j = 0; j < lines.length; j++) {
                config.debuging && console.verbose('添加行文本：' + lines[j])
                displayQueue.push({ text: lines[j], color: logInfo.color })
              }
            } else {
              config.debuging && console.verbose('添加行文本：' + logInfo.text)
              displayQueue.push({ text: logInfo.text, color: logInfo.color })
            }
          }
          while (displayQueue.length > maxSize) {
            let deleted = displayQueue.shift()
            config.debuging && console.verbose('删除行文本', deleted)
          }
          let offset = 0
          displayQueue.forEach((logInfo) => {
            let position ={ x: left, y: top + (offset++) * parent.fontSize }
            config.debuging && logUtils.debugInfo(['绘制文本：{} {}', logInfo.text, JSON.stringify(position)])
            warningFloaty.addText(logInfo.text, position, logInfo.color, parent.fontSize, 'log')
          })
        }
        warningFloaty.disableDebugInfo = false
      } catch (e) {
        logUtils.errorInfo(['日志绘制异常：' + e], true)
      }
    }
  }
}

module.exports = new LogFloaty()