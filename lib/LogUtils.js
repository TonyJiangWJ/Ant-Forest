/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-07-04 00:14:22
 * @Description: 日志工具
 */
let { config } = require('../config.js')
let { formatDate } = require('./DateUtil.js')
let { commonFunctions } = require('./CommonFunction.js')
/**
 * 根据参数toast文本信息
 * @param {string} content 
 * @param {boolean} isToast 
 */
function showToast(content, logFunc, isToast) {
  if (isToast) {
    toast(content)
  }
  if (config.saveLogFile) {
    appendLog(content)
  }
  logFunc(content)
}

function appendLog(content) {
  if (config.saveLogFile) {
    let string = formatDate(new Date()) + ":" + content + "\n"
    let currentPath = files.cwd()
    files.append(currentPath + "/log-verboses.log", string)
  }
}
module.exports = {
  debugInfo: function (content, isToast) {
    if (config.show_debug_info) {
      showToast(content, (c) => console.verbose(c), isToast)
    }
  },
  logInfo: function (content, isToast) {
    showToast(content, (c) => console.log(c), isToast)
  },
  infoLog: function (content, isToast) {
    showToast(content, (c) => console.info(c), isToast)
  },
  warnInfo: function (content, isToast) {
    showToast(content, (c) => console.warn(c), isToast)
  },
  errorInfo: function (content, isToast) {
    showToast(content, (c) => console.error(c), isToast)
  },
  appendLog: appendLog
}