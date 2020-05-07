/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-07 10:56:12
 * @Description: 日志工具
 */
importClass(java.lang.Thread)
let { config: _config, storage_name: _storage_name } = require('../../config.js')(runtime, this)
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let formatDate = require('../DateUtil.js')
let FileUtils = singletonRequire('FileUtils')
let storage = storages.create(_storage_name + 'run_log_file')

const ENGINE_ID = engines.myEngine().id
/**
 * @param {string} content 
 * @param {function} logFunc 执行控制台日志打印的方法
 * @param {boolean} isToast 
 * @param {function} appendLogFunc 写入额外日志的方法
 * @param {string} prefix 日志的前缀
 */
const showToast = function (content, logFunc, isToast, appendLogFunc, prefix) {
  content = convertObjectContent(content)
  if (isToast) {
    toast(content)
  }
  innerAppendLog(content, appendLogFunc, prefix)
  if (_config.show_engine_id) {
    content = '[E:' + ENGINE_ID + ' T:' + Thread.currentThread().getId() + '] - ' + content
  }
  logFunc(content)
}

const removeOutdateBacklogFiles = function () {
  let logbackDirPath = FileUtils.getRealMainScriptPath(true) + '/logs/logback'
  if (files.exists(logbackDirPath)) {
    // 日志保留天数
    let saveDays = _config.logSavedDays || 3
    let threeDayAgo = formatDate(new Date(new Date().getTime() - saveDays * 24 * 3600000), 'yyyyMMddHHmm')
    let timeRegex = /.*(\d{12})\.log/
    let outdateLogs = files.listDir(logbackDirPath, function (fileName) {
      let checkResult = timeRegex.exec(fileName)
      if (checkResult) {
        let timestr = checkResult[1]
        return timestr < threeDayAgo
      } else {
        return true
      }
    })
    if (outdateLogs && outdateLogs.length > 0) {
      outdateLogs.forEach(logFile => {
        console.verbose('日志文件过期，删除掉：' + logFile)
        files.remove(logbackDirPath + '/' + logFile)
      })
    }
  }
}

/**
 * 清除日志到备份文件夹，当不传递日志类型时清除所有日志
 * @param {string} target 日志类型
 */
const innerClearLogFile = function (target) {
  let mainScriptPath = FileUtils.getRealMainScriptPath(true) + '/logs'
  if (!target || target === 'verbose') {
    clearTarget(mainScriptPath, mainScriptPath + '/log-verboses.log', 'log-verboses')
  }
  if (!target || target === 'error') {
    clearTarget(mainScriptPath, mainScriptPath + '/error.log', 'error')
  }
  if (!target || target === 'log') {
    clearTarget(mainScriptPath, mainScriptPath + '/log.log', 'log')
  }
  if (!target || target === 'warn') {
    clearTarget(mainScriptPath, mainScriptPath + '/warn.log', 'warn')
  }
  if (!target || target === 'info') {
    clearTarget(mainScriptPath, mainScriptPath + '/info.log', 'info')
  }
}

const clearTarget = function (parentPath, filePath, fileName) {
  if (files.exists(filePath)) {
    let timestampLastHour = new Date().getTime()
    let backLogPath = parentPath + '/logback/' + fileName + '.' + formatDate(new Date(timestampLastHour), 'yyyyMMddHHmm') + '.log'
    files.ensureDir(parentPath + '/logback/')
    console.info('备份日志文件[' + backLogPath + ']' + (files.move(filePath, backLogPath) ? '成功' : '失败'))
  } else {
    console.info(filePath + '不存在，不执行备份')
  }
  try {
    files.write(filePath, fileName + ' logs for [' + formatDate(new Date()) + ']\n')
  } catch (e) {
    console.error('初始化写入日志文件失败' + e)
  }
}

const checkFileSizeAndBackup = function (filePath, target) {

  let clearFlag = storage.get(target)
  if (!clearFlag || parseInt(clearFlag) < new Date().getTime()) {
    // 十秒钟进行一次
    clearFlag = new Date().getTime() + 10000
    storage.put(target, clearFlag)

    let length = new java.io.File(filePath).length()
    if (files.exists(filePath) && length > 1024 * (_config.back_size || 100)) {
      console.verbose(target + '文件大小：' + length + ' 大于' + (_config.back_size || 100) + 'kb，执行备份')
      innerClearLogFile(target)
    }
  } else {
    // 十秒内计算过当前类型的大小，不执行计算
    return
  }

}

const innerAppendLog = function (content, appendAnother, prefix) {
  if (_config.saveLogFile) {

    // 每个整点清除过期日志
    let compareDateTime = formatDate(new Date(), 'yyyyMMddHH')
    let last_back_file = storage.get('last_back_file')
    if (compareDateTime !== last_back_file) {
      console.verbose('old last_back_file: ' + last_back_file + ' new compare_flag:' + compareDateTime)
      storage.put('last_back_file', compareDateTime)
      removeOutdateBacklogFiles()
    }
    let string = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss.S') + ' ' + (prefix ? prefix : '') + ' [E:' + ENGINE_ID + ' T:' + Thread.currentThread().getId() + '] - ' + content + '\n'
    files.ensureDir(FileUtils.getRealMainScriptPath(true) + '/logs/')
    let logFilePath = FileUtils.getRealMainScriptPath(true) + '/logs/log-verboses.log'
    try {
      checkFileSizeAndBackup(logFilePath, 'verbose')
      files.append(logFilePath, string)
    } catch (e) {
      console.error('写入日志信息失败' + e)
    }

    if (appendAnother) {
      try {
        appendAnother(string)
      } catch (e) {
        console.error('写入额外日志文件失败' + e)
      }
    }
  }
}


function convertObjectContent (originContent) {
  if (typeof originContent === 'string') {
    return originContent
  } else if (Array.isArray(originContent)) {
    // let [marker, ...args] = originContent
    let marker = originContent[0]
    let args = originContent.slice(1)
    let regex = /(\{\})/g
    let matchResult = marker.match(regex)
    if (matchResult && args && matchResult.length > 0 && matchResult.length === args.length) {
      args.forEach((item, idx) => {
        marker = marker.replace('{}', item)
      })
      return marker
    } else if (matchResult === null) {
      return marker
    }
  }
  console.error('参数不匹配[' + originContent + ']')
  return originContent
}

const _debug_info = function (content, isToast) {
  let prefix = 'DEBUG'
  if (_config.show_debug_log) {
    showToast(content, (c) => console.verbose(c), isToast, null, prefix)
  } else {
    content = convertObjectContent(content)
    innerAppendLog(content, null, prefix)
  }
}

module.exports = {
  debugInfo: _debug_info,
  debugForDev: function (content, isToast, fileOnly) {
    if (_config.develop_mode) {
      if (Array.isArray(content) && content.length > 0) {
        content = content.map(r => {
          if (typeof r === 'function') {
            return r()
          } else {
            return r
          }
        })
      }
      showToast(content,
        (c) => {
          if (!fileOnly) {
            console.verbose(c)
          }
        }, isToast,
        (string) => {
          let filePath = FileUtils.getRealMainScriptPath(true) + '/logs/develop.log'
          // checkFileSizeAndBackup(filePath, 'log')
          files.append(filePath, string)
        }, 'DEVELOP'
      )
    }
  },
  logInfo: function (content, isToast) {
    showToast(content, (c) => console.log(c), isToast,
      (string) => {
        let filePath = FileUtils.getRealMainScriptPath(true) + '/logs/log.log'
        checkFileSizeAndBackup(filePath, 'log')
        files.append(filePath, string)
      }, 'LOG'
    )
  },
  infoLog: function (content, isToast) {
    showToast(content, (c) => console.info(c), isToast,
      (string) => {
        let filePath = FileUtils.getRealMainScriptPath(true) + '/logs/info.log'
        checkFileSizeAndBackup(filePath, 'info')
        files.append(filePath, string)
      }, 'INFO'
    )
  },
  warnInfo: function (content, isToast) {
    showToast(content, (c) => console.warn(c), isToast,
      (string) => {
        let filePath = FileUtils.getRealMainScriptPath(true) + '/logs/warn.log'
        checkFileSizeAndBackup(filePath, 'warn')
        files.append(filePath, string)
      }, 'WARN'
    )
  },
  errorInfo: function (content, isToast) {
    showToast(content, (c) => console.error(c), isToast,
      (string) => {
        let filePath = FileUtils.getRealMainScriptPath(true) + '/logs/error.log'
        checkFileSizeAndBackup(filePath, 'error')
        files.append(filePath, string)
      }, 'ERROR'
    )
  },
  appendLog: innerAppendLog,
  clearLogFile: innerClearLogFile,
  removeOldLogFiles: removeOutdateBacklogFiles
}
