let STORAGE_KEY = "autojs_dispatch_queue_storage"
let RUNNING_KEY = "qunningTask"
let WAITING_QUEUE_KEY = "waitingQueue"
let WRITE_LOCK_KEY = "writeLock"
let Timers = require('./Timers.js')(runtime, this)

let pwd = files.cwd()
let logLibExists = files.exists(pwd + '/lib/LogUtils.js')
let { logInfo, warnInfo, debugInfo, infoLog, errorInfo } = logLibExists ? require(pwd + '/lib/LogUtils.js') : {
  logInfo: (str) => {
    console.log(str)
  },
  warnInfo: (str) => {
    console.warn(str)
  },
  debugInfo: (str) => {
    console.verbose(str)
  },
  infoLog: (str) => {
    console.info(str)
  },
  errorInfo: (str) => {
    console.error(str)
  },
}
if (logLibExists) {
  debugInfo('日志工具类存在')
} else {
  debugInfo('日志工具类不存在, 当前目录：' + pwd)
}


function RunningQueueDispatcher () {

  this.checkDuplicateRunning = function () {
    let currentEngine = engines.myEngine()
    let runningEngines = engines.all()
    let runningSize = runningEngines.length
    let currentSource = currentEngine.getSource() + ''
    debugInfo('当前脚本信息 id:' + currentEngine.id + ' source:' + currentSource + ' 运行中脚本数量：' + runningSize)
    if (runningSize > 1) {
      runningEngines.forEach(engine => {
        let compareEngine = engine
        let compareSource = compareEngine.getSource() + ''
        debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource)
        if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
          warnInfo('脚本正在运行中 退出当前脚本：' + currentSource, true)
          this.removeRunningTask(true)
          engines.myEngine().forceStop()
          exit()
        }
      })
    }
  }

  /**
   * 设置自动启动
   * 
   * @param {string} source 脚本path路径
   * @param {number} seconds 延迟时间 秒
   */
  this.setUpAutoStart = function (source, seconds) {
    let waitTime = seconds || 5
    let task = Timers.addDisposableTask({
      path: source,
      date: new Date().getTime() + waitTime * 1000
    })
    debugInfo("定时任务预定成功: " + task.id);
  }

  this.getCurrentTaskInfo = function () {
    currentEngine = engines.myEngine().getSource() + ''
    return {
      source: currentEngine,
      engineId: engines.myEngine().id
    }
  }


  this.clearAll = function () {
    storages.remove(STORAGE_KEY)
    logInfo('清除数据成功')
  }

  this.showDispatchStatus = function () {
    let runningTaskStr = this.getStorage().get(RUNNING_KEY)
    let waitingQueueStr = this.getStorage().get(WAITING_QUEUE_KEY)
    let lockKeyStr = this.getStorage().get(WRITE_LOCK_KEY)
    if (runningTaskStr) {
      let runningTask = JSON.parse(runningTaskStr)
      let timeout = new Date().getTime() - parseInt(runningTask.timeout)
      logInfo('当前运行中的任务：' + runningTaskStr + (timeout > 0 ? ' 已超时' + (timeout / 1000.0).toFixed(2) + '秒' : ' 超时剩余时间' + (-timeout / 1000.0).toFixed(0) + '秒'))
    } else {
      logInfo('当前无运行中的任务')
    }
    if (waitingQueueStr && waitingQueueStr !== '[]') {
      logInfo('当前等待中的队列：' + waitingQueueStr)
    } else {
      logInfo('当前无等待中的队列')
    }
    if (lockKeyStr) {
      let key = JSON.parse(lockKeyStr)
      logInfo('当前存在的锁：' + lockKeyStr + " 超时时间剩余：" + ((parseInt(key.timeout) - new Date().getTime()) / 1000.0).toFixed(2) + '秒')
    } else {
      logInfo('当前无存在的锁')
    }
  }

  this.getStorage = function () {
    return storages.create(STORAGE_KEY)
  }

  this.clearLock = function () {
    let taskInfo = this.getCurrentTaskInfo()
    let storedLockStr = this.getStorage().get(WRITE_LOCK_KEY)
    if (storedLockStr) {
      let storedLock = JSON.parse(storedLockStr)
      if (storedLock.source === taskInfo.source) {
        debugInfo('移除任务锁：' + JSON.stringify(taskInfo))
        this.getStorage().put(WRITE_LOCK_KEY, '')
      }
    }
  }

  this.lock = function () {
    let taskInfo = this.getCurrentTaskInfo()
    let storedLockStr = this.getStorage().get(WRITE_LOCK_KEY)
    if (storedLockStr) {
      let storedLock = JSON.parse(storedLockStr)
      if (storedLock.source === taskInfo.source) {
        storedLock.count = parseInt(storedLock.count) + 1
        storedLock.timeout = new Date().getTime() + 30000
        this.getStorage().put(WRITE_LOCK_KEY, JSON.stringify(storedLock))
        return true
      } else {
        if (parseInt(storedLock.timeout) < new Date().getTime()) {
          warnInfo('已有锁已超时，直接覆盖：' + JSON.stringify(storedLock))
          this.getStorage().put(WRITE_LOCK_KEY, JSON.stringify({ source: taskInfo.source, count: 1, timeout: new Date().getTime() + 30000 }))
          return true
        }
        return false
      }
    } else {
      this.getStorage().put(WRITE_LOCK_KEY, JSON.stringify({ source: taskInfo.source, count: 1, timeout: new Date().getTime() + 30000 }))
      return true
    }
  }

  this.unlock = function () {
    let taskInfo = this.getCurrentTaskInfo()
    let storedLockStr = this.getStorage().get(WRITE_LOCK_KEY)
    if (storedLockStr) {
      let storedLock = JSON.parse(storedLockStr)
      if (storedLock.source === taskInfo.source) {
        if (parseInt(storedLock.count) > 1) {
          storedLock.count = parseInt(storedLock.count) - 1
          this.getStorage().put(WRITE_LOCK_KEY, JSON.stringify(storedLock))
        } else {
          this.getStorage().put(WRITE_LOCK_KEY, '')
        }
      } else {
        return false
      }
    } else {
      return false
    }
  }

  this.getRunningStatus = function () {
    let storedRunningTask = this.getStorage().get(RUNNING_KEY)
    if (storedRunningTask) {
      let runningTask = JSON.parse(storedRunningTask)
      let currentTimestamp = new Date().getTime()
      if (currentTimestamp > runningTask.timeout) {
        debugInfo('运行中任务已超时：' + storedRunningTask + ' 超时时间：' + ((currentTimestamp - runningTask.timeout) / 1000).toFixed(0) + '秒')
        // 直接移除已超时运行中的任务
        this.getStorage().put(RUNNING_KEY, '')
        return null
      } else {
        debugInfo('获取运行中任务信息：' + storedRunningTask + ' 超时剩余时间：' + ((runningTask.timeout - currentTimestamp) / 1000).toFixed(0) + '秒')
        return runningTask
      }
    } else {
      return null
    }
  }

  this.getWaitingStatus = function () {
    // 任务队列去重
    this.distinctAwaitTasks()
    let waitingArrayStr = this.getStorage().get(WAITING_QUEUE_KEY)
    let waitingArray = null
    if (waitingArrayStr) {
      waitingArray = JSON.parse(waitingArrayStr)
    }
    if (waitingArray && waitingArray.length > 0) {
      return waitingArray[0]
    }
    return null
  }

  this.popWaitingTask = function () {
    let waitingArrayStr = this.getStorage().get(WAITING_QUEUE_KEY)
    let waitingArray = null
    if (waitingArrayStr) {
      waitingArray = JSON.parse(waitingArrayStr)
    }
    if (waitingArray && waitingArray.length > 0) {
      waitingArray.splice(0, 1)
      if (this.lock()) {
        this.getStorage().put(WAITING_QUEUE_KEY, JSON.stringify(waitingArray))
        this.unlock()
      }
    }
    return null
  }

  /**
   * @param {boolean} checkOwner 判断当前运行中的任务信息是否是当前脚本引擎施加的
   */
  this.removeRunningTask = function (checkOwner) {
    let taskInfo = this.getCurrentTaskInfo()
    let runningTask = this.getRunningStatus()
    if (runningTask !== null) {
      // engineId判断所有权
      if (runningTask.source === taskInfo.source && (!checkOwner || runningTask.engineId === taskInfo.engineId)) {
        debugInfo('移除' + (checkOwner ? '重复运行误创建的' : '') + '运行中任务')
        // 不加锁直接移除
        this.getStorage().put(RUNNING_KEY, '')

        let waitingTask = this.getWaitingStatus()
        if (waitingTask !== null && this.lock()) {
          debugInfo('有任务在等待，执行它')
          this.popWaitingTask()
          debugInfo('执行等待队列首个任务：' + JSON.stringify(waitingTask))

          // 将队列中任务放入执行中
          this.doAddRunningTask(waitingTask)
          sleep(1000)
          // 将队列中的任务执行掉
          this.setUpAutoStart(waitingTask.source)
          this.unlock()
        }
      } else {
        errorInfo('运行中任务：' + JSON.stringify(runningTask) + '和当前任务：' + JSON.stringify(taskInfo) + '不同，不可移除')
      }
    } else {
      errorInfo('无任务在运行中，不可移除')
    }
    // 清空当前任务施加的锁
    this.clearLock()
  }

  this.doAddRunningTask = function (taskInfo) {
    // 默认超时时间15分钟
    taskInfo.timeout = new Date().getTime() + 15 * 60 * 1000
    this.getStorage().put(RUNNING_KEY, JSON.stringify(taskInfo))
  }

  this.addRunningTask = function () {
    let taskInfo = this.getCurrentTaskInfo()
    let runningTask = this.getRunningStatus()
    if (runningTask !== null) {
      debugInfo('当前有任务正在运行：' + JSON.stringify(runningTask))
      if (runningTask.source === taskInfo.source) {
        debugInfo('运行中脚本任务和当前任务相同，直接继续')
        // 避免重复运行，如果挂了则继续
        this.checkDuplicateRunning()
        return
      } else {
        debugInfo('将当前task放入等待队列：' + JSON.stringify(taskInfo))
        this.addAwaitTask(taskInfo)
        exit()
      }
    } else {
      let waitingTask = this.getWaitingStatus()
      if (waitingTask !== null) {
        debugInfo('等待队列中已有任务待运行：' + JSON.stringify(waitingTask))
        if (waitingTask.source === taskInfo.source) {
          debugInfo('等待中任务和当前任务相同，可直接执行，将任务信息放入running')
          if (this.lock()) {
            this.doAddRunningTask(taskInfo)
            this.popWaitingTask()
            this.unlock()
          } else {
            errorInfo('获取锁失败，无法继续执行任务：' + JSON.stringify(taskInfo))
            this.setUpAutoStart(taskInfo.source, 10)
            exit()
          }
        } else {
          debugInfo('等待中任务和当前任务不同，将任务信息放入等待队列：' + JSON.stringify(taskInfo))
          if (this.lock()) {
            this.addAwaitTask(taskInfo)
            this.popWaitingTask()
            debugInfo('执行等待队列首个任务：' + JSON.stringify(waitingTask))
            // 将队列中任务放入执行中
            this.doAddRunningTask(waitingTask)
            // 将队列中的任务执行掉
            this.setUpAutoStart(waitingTask.source)
            this.unlock()
            exit()
          } else {
            errorInfo('获取锁失败，无法执行等待中任务，当前任务也未成功入队列：' + JSON.stringify(taskInfo))
            this.setUpAutoStart(taskInfo.source, 10)
            exit()
          }
        }
      } else {
        if (this.lock()) {
          debugInfo('当前无任务等待，直接执行：' + JSON.stringify(taskInfo))
          this.doAddRunningTask(taskInfo)
          this.unlock()
        } else {
          errorInfo('获取锁失败，无法继续执行任务：' + JSON.stringify(taskInfo))
          this.setUpAutoStart(taskInfo.source, 10)
          exit()
        }
      }
    }
  }

  this.addAwaitTask = function (taskInfo) {
    let storedArrayStr = this.getStorage().get(WAITING_QUEUE_KEY)
    let storedArray = null
    if (storedArrayStr) {
      storedArray = JSON.parse(storedArrayStr)
    } else {
      storedArray = []
    }
    storedArray.push(taskInfo)
    if (this.lock()) {
      this.getStorage().put(WAITING_QUEUE_KEY, JSON.stringify(storedArray))
      this.distinctAwaitTasks()
      this.unlock()
    } else {
      errorInfo('添加等待任务队列失败，获取写锁失败，任务信息：' + JSON.stringify(taskInfo))
      this.setUpAutoStart(taskInfo.source, 10)
    }
  }

  this.distinctAwaitTasks = function () {
    if (this.lock()) {
      let storedArrayStr = this.getStorage().get(WAITING_QUEUE_KEY)
      let storedArray = null
      if (storedArrayStr) {
        storedArray = JSON.parse(storedArrayStr)
      } else {
        storedArray = []
      }
      if (storedArray && storedArray.length > 0) {
        debugInfo('去重复前的任务队列：' + storedArrayStr)
        let distinctArray = []
        storedArray.forEach(task => {
          if (distinctArray.map(r => r.source).indexOf(task.source) < 0) {
            distinctArray.push(task)
          }
        })
        let distinctArrayStr = JSON.stringify(distinctArray)
        debugInfo('去重复后的任务队列：' + distinctArrayStr)
        this.getStorage().put(WAITING_QUEUE_KEY, distinctArrayStr)
      } else {
        debugInfo('队列小于等于1 不需要去重:' + storedArrayStr)
      }
      this.unlock()
    }
  }

}

module.exports = {
  runningQueueDispatcher: new RunningQueueDispatcher()
}