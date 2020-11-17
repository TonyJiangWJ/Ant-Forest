/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-14 23:40:55
 * @Description: 日志工具
 */
importClass(java.lang.Thread)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
let { config: _config, storage_name: _storage_name } = require('../../config.js')(runtime, this)
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let formatDate = require('../DateUtil.js')
let FileUtils = singletonRequire('FileUtils')
const MAIN_PATH = FileUtils.getRealMainScriptPath(true)
_config.isRunning = true
// -------------初始化-------------
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
// -------------初始化结束-------------

/**
 * Logger 日志基类
 */
function Logger () {

  this.fileWriteCostCounter = 0
  this.backupCostCounter = 0
  this.enqueueCostCounter = 0

  /**
   * 刷新日志缓冲区，仅异步日志用到
   * 切换读写缓冲区，将缓冲区中的日志全部写入到日志文件
   */
  this.flushAllLogs = () => { }
  /**
   * 异步日志：将日志内容写入写缓冲区
   * 同步日志：将日志内容写入日志文件中
   * @param {*} logData 日志内容对象：包含logType,dataTime,content,threadId等信息
   */
  this.enqueueLog = (logData) => { }

  this.showCostingInfo = () => {
    console.verbose(ENGINE_ID + ' 日志入队总耗时：' + this.enqueueCostCounter + 'ms 写入文件总耗时：' + this.fileWriteCostCounter + 'ms 备份日志文件总耗时：' + this.backupCostCounter + 'ms')
  }
}

/**
 * 异步日志
 */
function AsyncLogger () {
  Logger.call(this)

  this.executeThreadPool = new ThreadPoolExecutor(1, 1, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(10), new ThreadFactory({
    newThread: function (runnable) {
      let thread = Executors.defaultThreadFactory().newThread(runnable)
      thread.setName(_config.thread_name_prefix + ENGINE_ID + '-logging-' + thread.getName())
      return thread
    }
  }))
  this.writingList = []
  this.readingList = []
  this.MAX_QUEUE_SIZE = 256
  this.writingLock = threads.lock()
  this.queueChangeLock = threads.lock()
  this.queueChangeCondition = this.queueChangeLock.newCondition()
  let self = this
  // 将日志写入文件
  this.executeThreadPool.execute(function () {
    let loggerRunning = true
    while (true && _config.save_log_file && (_config.isRunning || self.readingList.length !== 0 || self.writingList.length !== 0)) {
      let start = new Date().getTime()
      self.queueChangeLock.lock()
      try {
        while (self.readingList.length === 0 && _config.isRunning) {
          if (_config.develop_mode) {
            console.verbose(ENGINE_ID + ' 等待日志刷新')
          }
          if (!self.queueChangeCondition.await(5, java.util.concurrent.TimeUnit.SECONDS)) {
            let currentEngine = engines.all().filter(engine => engine.id === ENGINE_ID)
            _config.isRunning = currentEngine && currentEngine.length > 0
          }
        }
        if (self.readingList.length === 0) {
          // console.warn(ENGINE_ID + ' 脚本可能已终止执行')
          if (self.writingList.length !== 0) {
            // 切换缓冲区，将缓冲区内容全部写入日志
            if (_config.show_debug_log) {
              console.verbose(ENGINE_ID + ' 切换缓冲区，将缓冲区内容全部写入日志')
            }
            self.readingList = self.writingList
            self.writingList = []
          } else {
            loggerRunning = false
            // 双队列为空 直接退出
            break
          }
        }
        start = new Date().getTime()
        let writerHolder = {}
        for (let key in PATH_CONFIG) {
          writerHolder[key] = files.open(PATH_CONFIG[key], 'a')
        }
        self.readingList.forEach(logData => {
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
        console.error(ENGINE_ID + ' 写入日志异常：' + e)
      } finally {
        if (loggerRunning) {
          let cost = new Date().getTime() - start
          self.fileWriteCostCounter += cost
          start = new Date().getTime()
          checkFileSizeAndBackup()
          self.backupCostCounter += new Date().getTime() - start
          console.verbose(ENGINE_ID + ' 写入日志到文件耗时：' + cost + 'ms')
        }
        // 置空
        self.readingList = []
        self.queueChangeLock.unlock()
      }
    }
    console.warn(ENGINE_ID + ' 脚本执行结束，日志文件写入线程关闭')
    self.showCostingInfo()
    // 新建线程 关闭线程池
    let thread = new Thread(new java.lang.Runnable({
      run: function () {
        try {
          self.executeThreadPool.shutdown()
          let flag = self.executeThreadPool.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS)
          if (_config.show_debug_log) {
            console.verbose(ENGINE_ID + ' 日志线程池关闭：' + flag)
          }
        } catch (e) {
          console.error(ENGINE_ID + ' 关闭日志线程池异常:' + e)
        } finally {
          self.executeThreadPool = null
        }
      }
    }))
    thread.setName(_config.thread_name_prefix + ENGINE_ID + '_shutdown_logging_thread')
    thread.start()
  })

  this.flushAllLogs = function () {
    if (_config.save_log_file) {
      this.queueChangeLock.lock()
      try {
        this.readingList = this.writingList
        this.writingList = []
        this.queueChangeCondition.signal()
      } finally {
        this.queueChangeLock.unlock()
      }
    }
  }

  this.enqueueLog = function (logData) {
    if (_config.save_log_file) {
      let enqueueStart = new Date().getTime()
      // 异步方式 将日志内容入队列
      this.writingLock.lock()
      try {
        this.writingList.push(logData)
        if (this.writingList.length >= this.MAX_QUEUE_SIZE) {
          this.queueChangeLock.lock()
          try {
            this.readingList = this.writingList
            this.writingList = []
            this.queueChangeCondition.signal()
          } finally {
            this.queueChangeLock.unlock()
          }
        }
      } finally {
        this.enqueueCostCounter += new Date().getTime() - enqueueStart
        this.writingLock.unlock()
      }
    }
  }
}

/**
 * 同步日志
 */
function SyncLogger () {
  Logger.call(this)
  this.storage = storages.create(_storage_name + 'run_log_file')

  this.enqueueLog = function (logData) {
    if (_config.save_log_file) {
      let enqueueStart = new Date().getTime()
      // 同步方式写入文件
      let { logType, content, dateTime, threadId } = logData
      content += '\n'
      let verboseLog = dateTime + ' ' + logType + ' [E:' + ENGINE_ID + ' T:' + threadId + '] - ' + content
      let log = dateTime + ' ' + content
      let start = new Date().getTime()
      if (PATH_CONFIG[logType]) {
        files.append(PATH_CONFIG[logType], log)
      }
      files.append(PATH_CONFIG[LOG_TYPES.VERBOSE], verboseLog)
      this.fileWriteCostCounter += new Date().getTime() - start

      let target = 'checkFileSizeAndBackup'
      let clearFlag = this.storage.get(target)
      if (!clearFlag || parseInt(clearFlag) < new Date().getTime()) {
        // 十秒钟进行一次
        clearFlag = new Date().getTime() + 10000
        this.storage.put(target, clearFlag)
        start = new Date().getTime()
        checkFileSizeAndBackup()
        this.backupCostCounter += new Date().getTime() - start
      }
      this.enqueueCostCounter += new Date().getTime() - enqueueStart
    }
  }
}

AsyncLogger.prototype = Object.create(Logger.prototype)
AsyncLogger.prototype.constructor = AsyncLogger

SyncLogger.prototype = Object.create(Logger.prototype)
SyncLogger.prototype.constructor = SyncLogger

const LOGGER = _config.async_save_log_file ? new AsyncLogger() : new SyncLogger()

if (_config.show_debug_log) {
  if (_config.async_save_log_file) {
    console.verbose(ENGINE_ID + ' 使用异步日志')
  } else {
    console.verbose(ENGINE_ID + ' 使用同步日志')
  }
}
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
  LOGGER.enqueueLog(logData)
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
        if (_config.show_debug_log) {
          console.verbose(ENGINE_ID + ' 日志文件过期，删除掉：' + logFile)
        }
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
      console.info(ENGINE_ID + ' 备份日志文件[' + backLogPath + ']' + (files.move(originLogPath, backLogPath) ? '成功' : '失败'))
    } else {
      console.info(ENGINE_ID + ' ' + originLogPath + '不存在，不执行备份')
    }
    try {
      files.write(originLogPath, fileName + ' logs for [' + formatDate(new Date()) + ']\n')
    } catch (e) {
      console.error(ENGINE_ID + ' 初始化写入日志文件失败' + e)
    }
  } else {
    console.error(ENGINE_ID + ' 解析文件名失败：' + originLogPath)
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
      if (_config.show_debug_log) {
        console.verbose(ENGINE_ID + ' ' + key + '文件大小：' + length + ' 大于' + (_config.back_size || 100) + 'kb，执行备份')
      }
      innerClearLogFile(key)
    }
  }
  if (hadBackup && _config.show_debug_log) {
    console.verbose(ENGINE_ID + ' 备份文件耗时：' + (new Date().getTime() - start) + 'ms')
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
  console.error(ENGINE_ID + ' 参数不匹配[' + JSON.stringify(originContent) + ']')
  return originContent
}

module.exports = {
  debugInfo: function (content, isToast) {
    isToast = isToast && _config.show_debug_log
    if (_config.show_debug_log || _config.save_log_file) {
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
  developSaving: function (content, fileName) {
    if (_config.develop_saving_mode) {
      content = convertObjectContent(content)
      content = formatDate(new Date()) + ' ' + content
      console.verbose(content)
      files.append(MAIN_PATH + '/logs/' + fileName + '.log', content)
    }
  },
  clearLogFile: innerClearLogFile,
  removeOldLogFiles: removeOutdateBacklogFiles,
  flushAllLogs: function () {
    LOGGER.flushAllLogs()
  },
  showCostingInfo: () => {
    LOGGER.showCostingInfo()
  }
}
