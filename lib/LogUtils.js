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
 * @param {string} content 
 * @param {boolean} isToast 
 */
const showToast = function (content, logFunc, isToast, appendLog) {
  content = convertObjectContent(content)
  if (isToast) {
    toast(content)
  }
  innerAppendLog(content, appendLog)
  logFunc(content)
}

const innerClearLogFile = function () {
  let mainScriptPath = FileUtils.getRealMainScriptPath(true) + '/logs'
  clearTarget(mainScriptPath, mainScriptPath + '/log-verboses.log', 'log-verboses')
  clearTarget(mainScriptPath, mainScriptPath + '/error.log', 'error')
  clearTarget(mainScriptPath, mainScriptPath + '/log.log', 'log')
  clearTarget(mainScriptPath, mainScriptPath + '/warn.log', 'warn')
  clearTarget(mainScriptPath, mainScriptPath + '/info.log', 'info')

}

const clearTarget = function (parentPath, filePath, fileName) {
  if (files.exists(filePath)) {
    let timestampLastHour = new Date().getTime() - 3600000
    let backLogPath = parentPath + '/logback/' + fileName + '.' + formatDate(new Date(timestampLastHour), 'yyyyMMddHHmm') + '.log'
    files.ensureDir(parentPath + '/logback/')
    console.info('备份日志文件[' + backLogPath + ']' + (files.move(filePath, backLogPath) ? '成功' : '失败'))
  } else {
    console.info(filePath + '不存在，不执行备份')
  }
  files.write(filePath, fileName + ' logs for [' + formatDate(new Date()) + ']\n')
}

const innerAppendLog = function (content, appendAnother) {
  if (config.saveLogFile) {

    // 每个整点备份日志
    let compareDateTime = formatDate(new Date(), 'yyyyMMddHH')
    let last_back_file = storage.get('last_back_file')
    if (compareDateTime !== last_back_file) {
      storage.put('last_back_file', compareDateTime)
      innerClearLogFile()
    }
    let string = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss.S') + ':' + content + '\n'
    files.ensureDir(FileUtils.getRealMainScriptPath(true) + '/logs/')
    let logFilePath = FileUtils.getRealMainScriptPath(true) + '/logs/log-verboses.log'
    files.append(logFilePath, string)

    if (appendAnother) {
      appendAnother(string)
    }
  }
}


function convertObjectContent(originContent) {
  if (typeof originContent === 'string') {
    return originContent
  } else if (Array.isArray(originContent)) {
    // let [maker, ...args] = originContent
    let maker = originContent[0]
    let args = originContent.slice(1)
    let regex = /(\{\})/g
    let matchResult = maker.match(regex)
    if (matchResult && args && matchResult.length > 0 && matchResult.length === args.length) {
      args.forEach((item, idx) => {
        maker = maker.replace('{}', item)
      })
      return maker
    }
  }
  console.error('参数不匹配[' + originContent + ']')
  return originContent
}


module.exports = {
  debugInfo: function (content, isToast) {
    if (config.show_debug_info) {
      showToast(content, (c) => console.verbose(c), isToast)
    } else {
      content = convertObjectContent(content)
      innerAppendLog(content)
    }
  },
  logInfo: function (content, isToast) {
    showToast(content, (c) => console.log(c), isToast,
      (string) => {
        let filePath = FileUtils.getRealMainScriptPath(true) + '/logs/log.log'
        files.append(filePath, string)
      }
    )
  },
  infoLog: function (content, isToast) {
    showToast(content, (c) => console.info(c), isToast,
      (string) => {
        let filePath = FileUtils.getRealMainScriptPath(true) + '/logs/info.log'
        files.append(filePath, string)
      }
    )
  },
  warnInfo: function (content, isToast) {
    showToast(content, (c) => console.warn(c), isToast,
      (string) => {
        let filePath = FileUtils.getRealMainScriptPath(true) + '/logs/warn.log'
        files.append(filePath, string)
      }
    )
  }
  ,
  errorInfo: function (content, isToast) {
    showToast(content, (c) => console.error(c), isToast,
      (string) => {
        let filePath = FileUtils.getRealMainScriptPath(true) + '/logs/error.log'
        files.append(filePath, string)
      }
    )
  },
  appendLog: innerAppendLog,
  clearLogFile: innerClearLogFile
}