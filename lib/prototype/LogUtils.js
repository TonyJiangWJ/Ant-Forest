/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-09-16 22:29:07
 * @Description: 日志工具
 */
importClass(java.lang.Thread)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
let { config: _config } = require('../../config.js')(runtime, this)
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let formatDate = require('../DateUtil.js')
let FileUtils = singletonRequire('FileUtils')

const executeThreadPool = new ThreadPoolExecutor(1, 1, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(10))
let writingList = []
let readingList = []
const MAX_QUEUE_SIZE = 256
let writingLock = threads.lock()
let queueChangeLock = threads.lock()
let queueChangeCondition = queueChangeLock.newCondition()
const MAIN_PATH = FileUtils.getRealMainScriptPath(true)
// 确保目录存在
files.ensureDir(MAIN_PATH + '/logs/')
files.ensureDir(MAIN_PATH + '/logs/logback/')
const LOG_TYPES = {
  VERBOSE: 'VERBOSE',
  DEBUG: 'DEBUG',
  LOG: 'LOG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEVELOP: 'DEVELOP'
}
const PATH_CONFIG = {
  'VERBOSE': MAIN_PATH + '/logs/log-verboses.log',
  'LOG': MAIN_PATH + '/logs/log.log',
  'INFO': MAIN_PATH + '/logs/info.log',
  'WARN': MAIN_PATH + '/logs/warn.log',
  'ERROR': MAIN_PATH + '/logs/error.log',
  'DEVELOP': MAIN_PATH + '/logs/develop.log'
}
const ENGINE_ID = engines.myEngine().id
// 移除过期的日志
removeOutdateBacklogFiles()

// 将日志写入文件
executeThreadPool.execute(function () {
  while (true && _config.saveLogFile && (_config.isRunning || readingList.length !== 0)) {
    let start = new Date().getTime()
    try {
      queueChangeLock.lock()
      while (readingList.length === 0) {
        queueChangeCondition.await()
      }
      start = new Date().getTime()
      let writerHolder = {}
      for (let key in PATH_CONFIG) {
        writerHolder[key] = files.open(PATH_CONFIG[key], 'a')
      }
      readingList.forEach(logData => {
        let { logType, content, dateTime, threadId } = logData
        let logWriter = writerHolder[logType]
        if (logWriter) {
          logWriter.writeline(dateTime + ' ' + content)
        }
        writerHolder[LOG_TYPES.VERBOSE].writeline(dateTime + ' ' + logType + ' [E:' + ENGINE_ID + ' T:' + threadId + '] - ' + content)
      })
      for (let key in PATH_CONFIG) {
        let writer = writerHolder[key]
        if (writer) {
          writer.flush()
          writer.close()
        }
      }
    } catch (e) {
      console.error('写入日志异常：' + e)
    } finally {
      checkFileSizeAndBackup()
      console.verbose('写入日志到文件耗时：' + (new Date().getTime() - start) + 'ms')
      // 置空
      readingList = []
      queueChangeLock.unlock()
    }
  }
  console.warn('脚本执行结束，日志文件写入线程关闭')
})

/**
 * @param {string} content 
 * @param {function} logFunc 执行控制台日志打印的方法
 * @param {boolean} isToast 
 * @param {string} logType 日志类型
 */
const showToast = function (content, logFunc, isToast, logType) {
  content = convertObjectContent(content)
  if (isToast) {
    toast(content)
  }
  let logData = {
    logType: logType,
    content: content,
    dateTime: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss.S'),
    threadId: Thread.currentThread().getId()
  }
  if (_config.show_engine_id) {
    content = '[E:' + ENGINE_ID + ' T:' + logData.threadId + '] - ' + content
  }
  logFunc(content)
  if (_config.saveLogFile) {
    try {
      writingLock.lock()
      writingList.push(logData)
      if (writingList.length >= MAX_QUEUE_SIZE) {
        try {
          queueChangeLock.lock()
          readingList = writingList
          writingList = []
          queueChangeCondition.signal()
        } finally {
          queueChangeLock.unlock()
        }
      }
    } finally {
      writingLock.unlock()
    }
  }
}

/**
 * 移除过期的日志 默认清除三天前的
 */
function removeOutdateBacklogFiles () {
  let logbackDirPath = MAIN_PATH + '/logs/logback'
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
function innerClearLogFile (target) {
  let path = PATH_CONFIG[target]
  if (!target) {
    // 全部清除
    for (let k in PATH_CONFIG) {
      clearTarget(PATH_CONFIG[k])
    }
  } else if (path) {
    clearTarget(path)
  }
}

/**
 * 根据日志路径备份，并清空内容
 * @param {string} originLogPath 目标日志全路径
 */
const clearTarget = function (originLogPath) {
  let nameRegex = /.*\/([-\w]+)\.log$/
  if (nameRegex.test(originLogPath)) {
    fileName = nameRegex.exec(originLogPath)[1]
    if (files.exists(originLogPath)) {
      let timestampLastHour = new Date().getTime()
      let backLogPath = MAIN_PATH + '/logs/logback/' + fileName + '.' + formatDate(new Date(timestampLastHour), 'yyyyMMddHHmm') + '.log'
      console.info('备份日志文件[' + backLogPath + ']' + (files.move(originLogPath, backLogPath) ? '成功' : '失败'))
    } else {
      console.info(originLogPath + '不存在，不执行备份')
    }
    try {
      files.write(originLogPath, fileName + ' logs for [' + formatDate(new Date()) + ']\n')
    } catch (e) {
      console.error('初始化写入日志文件失败' + e)
    }
  } else {
    console.error('解析文件名失败：' + originLogPath)
  }
}

/**
 * 校验文件大小并执行备份
 */
function checkFileSizeAndBackup () {
  let start = new Date()
  let hadBackup = false
  for (let key in PATH_CONFIG) {
    if (key === LOG_TYPES.DEVELOP) {
      // 开发用的develop日志不做备份
      continue
    }
    let filePath = PATH_CONFIG[key]
    let length = new java.io.File(filePath).length()
    if (files.exists(filePath) && length > 1024 * (_config.back_size || 100)) {
      hadBackup = true
      console.verbose(key + '文件大小：' + length + ' 大于' + (_config.back_size || 100) + 'kb，执行备份')
      innerClearLogFile(key)
    }
  }
  if (hadBackup) {
    console.verbose('备份文件耗时：' + (new Date().getTime() - start) + 'ms')
  }
}

/**
 * 格式化输入参数 eg. `['args: {} {} {}', 'arg1', 'arg2', 'arg3']` => `'args: arg1 arg2 arg3'`
 * @param {array} originContent 输入参数
 */
function convertObjectContent (originContent) {
  if (typeof originContent === 'string') {
    return originContent
  } else if (Array.isArray(originContent)) {
    let marker = originContent[0]
    let args = originContent.slice(1)
    if (Array.isArray(args) && args.length > 0) {
      args = args.map(r => {
        if (typeof r === 'function') {
          return r()
        } else {
          return r
        }
      })
    }
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
  console.error('参数不匹配[' + JSON.stringify(originContent) + ']')
  return originContent
}

module.exports = {
  debugInfo: function (content, isToast) {
    isToast = isToast && _config.show_debug_log
    if (_config.show_debug_log || _config.saveLogFile) {
      showToast(content, _config.show_debug_log ? (c) => console.verbose(c) : () => { }, isToast, LOG_TYPES.DEBUG)
    }
  },
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
      showToast(
        content,
        (c) => {
          if (!fileOnly) {
            console.verbose(c)
          }
        },
        isToast,
        LOG_TYPES.DEVELOP
      )
    }
  },
  logInfo: function (content, isToast) {
    showToast(content, (c) => console.log(c), isToast, LOG_TYPES.LOG)
  },
  infoLog: function (content, isToast) {
    showToast(content, (c) => console.info(c), isToast, LOG_TYPES.INFO)
  },
  warnInfo: function (content, isToast) {
    showToast(content, (c) => console.warn(c), isToast, LOG_TYPES.WARN)
  },
  errorInfo: function (content, isToast) {
    showToast(content, (c) => console.error(c), isToast, LOG_TYPES.ERROR)
  },
  appendLog: function (content) {
    showToast(content, () => { }, false, LOG_TYPES.DEBUG)
  },
  clearLogFile: innerClearLogFile,
  removeOldLogFiles: removeOutdateBacklogFiles,
  flushAllLogs: function () {
    if (_config.saveLogFile) {
      try {
        queueChangeLock.lock()
        readingList = writingList
        writingList = []
        queueChangeCondition.signal()
      } finally {
        queueChangeLock.unlock()
      }
    }
  }
}
