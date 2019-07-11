/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-07-04 00:14:22
 * @Description: 日志工具
 */
let { config } = require('../config.js')
let { formatDate } = require('./DateUtil.js')
let { FileUtils } = require('./FileUtils.js')
let storage = storages.create('run_log_file')
/**
 * 根据参数toast文本信息
 * @param {string} content 
 * @param {boolean} isToast 
 */
const showToast = function (content, logFunc, isToast) {
  if (isToast) {
    toast(content)
  }
  innerAppendLog(content)
  logFunc(content)
}

const innerClearLogFile = function () {
  let mainScriptPath = FileUtils.getRealMainScriptPath(true)
  let logFilePath = mainScriptPath + '/log-verboses.log'
  let timestampLastHour = new Date().getTime() - 3600000
  let backLogPath = mainScriptPath + '/logback/log-verboses.' + formatDate(new Date(timestampLastHour), 'yyyyMMddHHmm') + '.log'
  if (files.exists(logFilePath)) {
    files.ensureDir(mainScriptPath + '/logback/')
    console.info('备份日志文件[' + backLogPath + ']' + (files.move(logFilePath, backLogPath) ? '成功' : '失败'))
  } else {
    console.info(logFilePath + '不存在，不执行备份')
  }
  files.write(logFilePath, 'logs for [' + formatDate(new Date()) + ']\n')
}

const innerAppendLog = function (content) {
  if (config.saveLogFile) {
    // 每个整点备份日志
    let compareDateTime = formatDate(new Date(), 'yyyyMMddHH')
    let last_back_file = storage.get('last_back_file')
    if (compareDateTime !== last_back_file) {
      storage.put('last_back_file', compareDateTime)
      innerClearLogFile()
    }
    let string = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss.S') + ':' + content + '\n'
    let logFilePath = FileUtils.getRealMainScriptPath(true) + '/log-verboses.log'
    files.append(logFilePath, string)
  }
}


module.exports = {
  debugInfo: function (content, isToast) {
    if (config.show_debug_info) {
      showToast(content, (c) => console.verbose(c), isToast)
    } else {
      innerAppendLog(content)
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
  }
  ,
  errorInfo: function (content, isToast) {
    showToast(content, (c) => console.error(c), isToast)
  },
  appendLog: innerAppendLog,
  clearLogFile: innerClearLogFile
}