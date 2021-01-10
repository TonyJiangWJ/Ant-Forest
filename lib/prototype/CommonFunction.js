/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-10 12:10:16
 * @Description: 通用工具
 */
importClass(android.content.Context)
importClass(android.provider.Settings)
importClass(java.io.StringWriter)
importClass(java.io.StringReader)
importClass(java.io.PrintWriter)
importClass(java.io.BufferedReader)
importClass(java.lang.StringBuilder)
let { config: _config, storage_name: _storage_name, project_name } = require('../../config.js')(runtime, this)
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let Timers = singletonRequire('Timers')
let _runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let _FloatyInstance = singletonRequire('FloatyUtil')
let automator = singletonRequire('Automator')
let FileUtils = singletonRequire('FileUtils')
let _logUtils = singletonRequire('LogUtils')
let formatDate = require('../DateUtil.js')
let RUNTIME_STORAGE = _storage_name + "_runtime"
let DISMISS_AWAIT_DIALOG = 'dismissAwaitDialog'
let TIMER_AUTO_START = "timerAutoStart"
let READY = 'ready_engine'
let window = this
let ENERGY_TAG = 'energy'
let RUN_TIMES_TAG = 'runTimes'
let PROTECT_TAG = 'protectList'
let FRIEND_COLLECT_TAG = 'friendCollect'
let BAIDU_INVOKE_COUNT = 'baiduInvokeCount'
let TESSERAC_INVOKE_COUNT = 'tesseracInvokeCount'
let lifecycleDeamonThreadPool = null
let lifecycleCallbacks = []
let idCounter = 0
let lifecycleLock = threads.lock()
_config.isRunning = true
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
let ENGINE_ID = engines.myEngine().id
// 注册脚本生命周期回调，创建一个单独的线程来监听当前脚本是否已经执行完毕
lifecycleDeamonThreadPool = new ThreadPoolExecutor(1, 1, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(10), new ThreadFactory({
  newThread: function (runnable) {
    let thread = Executors.defaultThreadFactory().newThread(runnable)
    thread.setName(_config.thread_name_prefix + ENGINE_ID + '-lifecycle-deamon-' + thread.getName())
    return thread
  }
}))
lifecycleDeamonThreadPool.execute(function () {
  while (_config.isRunning) {
    // 每0.5秒检测一次isRunning, 5秒太慢了
    sleep(500)
    let currentEngine = engines.all().filter(engine => engine.id === ENGINE_ID)
    _config.isRunning = currentEngine && currentEngine.length > 0
  }
  _logUtils.debugInfo('脚本已经中止执行，执行生命周期回调')
  try {
    // 脚本已经结束，执行callbacks
    if (lifecycleCallbacks && lifecycleCallbacks.length > 0) {
      _logUtils.debugInfo('生命周期回调总数：' + lifecycleCallbacks.length)
      lifecycleCallbacks.forEach((callback, index) => {
        try {
          _logUtils.debugInfo(['执行生命周期回调：[{}/{}] {}', index + 1, lifecycleCallbacks.length, callback.desc])
          callback.func()
        } catch (e) {
          _logUtils.errorInfo(callback.desc + ' 生命周期回调异常' + e)
        }
      })
    }
  } catch (e) {
    _logUtils.errorInfo('执行生命周期回调异常' + e)
  }
  // 新建线程 关闭线程池
  let thread = new Thread(new java.lang.Runnable({
    run: function () {
      try {
        lifecycleDeamonThreadPool.shutdown()
        let flag = lifecycleDeamonThreadPool.awaitTermination(5, TimeUnit.SECONDS)
        _logUtils.debugInfo('lifecycleDeamon线程池关闭：' + flag)
      } catch (e) {
        _logUtils.errorInfo('关闭lifecycleDeamon线程池异常:' + e)
      } finally {
        lifecycleDeamonThreadPool = null
      }
    }
  }))
  thread.setName(_config.thread_name_prefix + ENGINE_ID + "_shutdown_lifecycle_thread")
  thread.start()
})


function CommonFunctions () {
  const _current_pacakge = currentPackage
  currentPackage = function () {
    let start = new Date().getTime()
    try {
      let windowRoots = runtime.getAccessibilityBridge().windowRoots()
      if (windowRoots.size() > 0) {
        _logUtils.debugInfo(['windowRoots size: {}', windowRoots.size()])
        for (let i = 0; i < windowRoots.size(); i++) {
          let root = windowRoots.get(i)
          if (root !== null && root.getPackageName()) {
            return root.getPackageName()
          }
        }
      }
      let service = runtime.getAccessibilityBridge().getService()
      let serviceWindows = service.getWindows()
      if (serviceWindows.size() > 0) {
        _logUtils.debugInfo(['windowRoots未能获取包名信息，尝试service window size: {}', serviceWindows.size()])
        for (let i = serviceWindows.size() - 1; i >= 0; i--) {
          let window = serviceWindows.get(i)
          if (window && window.getRoot() && window.getRoot().getPackageName()) {
            return window.getRoot().getPackageName()
          }
        }
      }
      _logUtils.debugInfo(['windowRoots未能获取包名信息，通过currentPackage()返回数据'])
      return _current_pacakge()
    } finally {
      _logUtils.debugInfo(['获取包名总耗时：{}ms', new Date().getTime() - start])
    }
  }

  /**
   * 确保识别区域在图片范围内，超范围的自动压缩宽高
   * @param {array} region  识别区域范围[x, y, width, height]
   * @param {int} maxWidth 最大宽度
   * @param {int} maxHeight 最大高度
   */
  this.ensureRegionInScreen = function (region, maxWidth, maxHeight) {
    let originRegion = JSON.parse(JSON.stringify(region))
    maxWidth = maxWidth || _config.device_width
    maxHeight = maxHeight || _config.device_height
    let flag = 0
    if (region[0] > maxWidth || region[0] < 0) {
      _logUtils.errorInfo(['x起始点超范围：{}', region[0]])
      throw new java.lang.IllegalArgumentException('x起始点超范围：' + region[0])
    }
    if (region[1] > maxHeight || region[1] < 0) {
      _logUtils.errorInfo(['y起始点超范围：{}', region[0]])
      throw new java.lang.IllegalArgumentException('y起始点超范围：' + region[1])
    }
    let width = region[0] + region[2]
    let height = region[1] + region[3]
    if (width > maxWidth) {
      region[2] = maxWidth - region[0]
      flag = flag | 1
    }
    if (height > maxHeight) {
      region[3] = maxHeight - region[1]
      flag = flag | 2
    }
    if (flag !== 0) {
      _logUtils.debugInfo(['检测识别区域是否超范围：{} maxW: {} maxH: {}', JSON.stringify(originRegion), maxWidth, maxHeight])
      if (flag & 1 === 1) {
        _logUtils.debugInfo(['宽度超范围 修正为：{}', region[2]])
      }
      if (flag & 2 === 2) {
        _logUtils.debugInfo(['高度超范围 修正为：{}', region[3]])
      }
    }
  }

  /**
   * 自动设置刘海的偏移量
   */
  this.autoSetUpBangOffset = function (doNotRestart) {
    if (_config.auto_set_bang_offset || _config.updated_temp_flag_1325) {
      if (!this.requestScreenCaptureOrRestart(doNotRestart)) {
        // 请求截图权限失败，取消设置刘海偏移量
        return
      }
      let DETECT_COLOR = '#10FF1F'
      let window = floaty.rawWindow(
        <frame id="container" gravity="center" bg="#10FF1F">
          <horizontal margin="10 0" gravity="center">
            <text id="text" text="TEXT FLOATY" textSize="10sp" />
          </horizontal>
        </frame>
      )
      window.setPosition(100, 0)
      // 等待悬浮窗初始化
      sleep(300)
      let offset = null
      let limit = 10
      while (!offset && offset !== 0 && limit-- > 0) {
        let screen = this.checkCaptureScreenPermission()
        if (screen) {
          let point = images.findColor(screen, DETECT_COLOR, { region: [80, 0, 100, 300], threshold: 1 })
          if (point && images.detectsColor(screen, DETECT_COLOR, point.x + 20, point.y) && images.detectsColor(screen, DETECT_COLOR, point.x + 30, point.y)) {
            offset = point.y
            ui.run(function () {
              window.text.setText('刘海偏移量为：' + offset + ' 自动关闭悬浮窗')
            })
            _logUtils.debugInfo(['自动设置刘海偏移量为：{}', offset])
            sleep(500)
            _logUtils.debugInfo('关闭悬浮窗')
            window.close()
            let configStorage = storages.create(_storage_name)
            // 设为负值
            _config.bang_offset = -offset
            configStorage.put('bang_offset', _config.bang_offset)
            configStorage.put('auto_set_bang_offset', false)
            configStorage.put('updated_temp_flag_1325', false)
          } else {
            sleep(100)
          }
        }
      }
      if (limit <= 0) {
        _logUtils.warnInfo('无法自动检测刘海高度，请确认是否开启了深色模式？')
      }
    }
  }

  /**
   * 注册生命周期回调，在退出时执行func
   * @param {function} func 回调方法
   * @param {String} desc 过程描述
   */
  this.registerOnEngineRemoved = function (func, desc) {
    desc = desc || 'common func'
    lifecycleLock.lock()
    let callbackId = ++idCounter
    try {
      lifecycleCallbacks.push({ func: func, desc: desc, id: callbackId })
    } finally {
      lifecycleLock.unlock()
    }
    return callbackId
  }

  /**
   * 取消生命周期回调
   * @param {number} callbackId 回调记录的id
   */
  this.unregisterLifecycleCallback = function (callbackId) {
    lifecycleLock.lock()
    if (lifecycleCallbacks && lifecycleCallbacks.length > 0) {
      let callbackIdx = lifecycleCallbacks.findIndex(callback => callback.id === callbackId)
      if (callbackIdx > -1) {
        let removedArray = lifecycleCallbacks.splice(callbackIdx, 1)
        _logUtils.debugInfo(['移除生命周期回调，id:{} index:{} desc: {}', callbackId, callbackIdx, (removedArray && removedArray.length > 0) ? removedArray[0].desc : 'unknown'])
      } else {
        _logUtils.debugInfo(['生命周期回调不存在，id:{}', callbackId])
      }
    }
    lifecycleLock.unlock()
  }

  /**
   * 校验是否已经拥有无障碍权限 没有自动获取 前提是获取了adb权限
   * 原作者：MrChen 原始代码来自Pro商店
   * adb授权方法：开启usb调试并使用adb工具连接手机，执行 adb shell pm grant org.autojs.autojspro android.permission.WRITE_SECURE_SETTINGS
   * 取消授权 adb shell pm revoke org.autojs.autojspro android.permission.WRITE_SECURE_SETTINGS
   * 其中免费版包名为 org.autojs.autojs
   * @param {boolean} force 是否强制启用
   */
  this.checkAccessibilityService = function (force) {
    let packageName = this.getAutoJsPackage()
    let self = this
    let accessibilityServiceClassName = (() => {
      if (packageName.startsWith("org.autojs.autojs")) {
        return "com.stardust.autojs.core.accessibility.AccessibilityService"
      } else {
        /**
         * 适配变更包名的AutoJS，针对淘宝客户端会读取并拉黑无障碍功能中已启用AutoJS相关的用户，
         * 可以创建一个乱七八糟包名的AutoJS并修改AccessibilityService的包名称，脚本中需要通过反射获取对应的类全名
         */
        try {
          importClass(org.autojs.autojs.tool.AccessibilityServiceTool)
          let clz = new AccessibilityServiceTool().getClass()
          let field = clz.getDeclaredField('sAccessibilityServiceClass')
          let typeName = field.getGenericType().getTypeName()
          let regex = /.*<(.*)>/
          return regex.exec(typeName)[1]
        } catch (e) {
          self.printExceptionStack(e)
          return null
        }
      }
    })()
    if (!accessibilityServiceClassName) {
      // 无法准确获取无障碍服务名称，交由auto.waitFor()处理
      return false
    }
    let requiredService = packageName + '/' + accessibilityServiceClassName
    try {
      let enabledServices = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
      _logUtils.debugInfo(['当前已启用无障碍功能的服务:{}', enabledServices])
      var service = null
      if (enabledServices.indexOf(requiredService) < 0) {
        service = enabledServices + ':' + requiredService
      } else if (force) {
        // 如果强制开启
        service = enabledServices
      }
      if (service) {
        Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, service)
        Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, '1')
        _logUtils.infoLog('成功开启AutoJS的辅助服务', true)
      }

      return true
    } catch (e) {
      _config.develop_mode && this.printExceptionStack(e)
      _logUtils.warnInfo('\n请确保已给予 WRITE_SECURE_SETTINGS 权限\n\n授权代码已复制，请使用adb工具连接手机执行(重启不失效)\n\n', true)
      let shellScript = 'adb shell pm grant ' + packageName + ' android.permission.WRITE_SECURE_SETTINGS'
      _logUtils.warnInfo('adb 脚本 已复制到剪切板：[' + shellScript + ']')
      setClip(shellScript)
      return false
    }
  }

  this.ensureAccessibilityEnabled = function (force) {
    if (!this.checkAccessibilityService(force)) {
      try {
        debugInfo('无ADB授权，使用auto.waitFor()')
        logInfo('即将跳转无障碍界面，授权完毕后会自动打开AutoJS，如果失败请手动返回，或者给与AutoJS后台弹出界面的权限', true)
        sleep(1500)
        auto.waitFor()
        waitForExecuted = true
        app.launch(context.getPackageName())
        if (waitForExecuted) {
          // 等待十秒钟，如果app.launch失败了等手动回到autojs界面
          limit = 10
          let currentPackageName = commonFunctions.myCurrentPackage()
          while (limit-- > 0 && currentPackageName !== context.getPackageName()) {
            debugInfo(['当前包名：{}', currentPackageName])
            sleep(1000)
            currentPackageName = commonFunctions.myCurrentPackage()
          }
        }
        return true
      } catch (e) {
        warnInfo('auto.waitFor()不可用')
        auto()
      }
    }
    return true
  }

  /**
   * 校验截图权限，权限失效则重新启动，根据参数释放任务队列
   * @param {number} errorLimit 失败尝试次数
   * @param {boolean} releaseLock 是否在失败后释放任务队列
   */
  this.checkCaptureScreenPermission = function (errorLimit, releaseLock) {
    let screen = null
    let start = new Date().getTime()
    if (!_config.async_waiting_capture) {
      _logUtils.debugInfo('同步获取截图')
      screen = captureScreen()
    } else {
      errorLimit = errorLimit || 3
      // 获取截图 用于判断是否可收取
      let errorCount = 0
      do {
        let waitResult = this.waitFor(function () {
          let max_try = 10
          while (!screen && max_try-- > 0) {
            screen = captureScreen()
          }
        }, _config.capture_waiting_time || 500)
        if (!screen) {
          _logUtils.warnInfo([
            '获取截图失败 {} {} count:{}',
            !waitResult ? '等待截图超时' + ((errorCount++ == errorLimit - 1) ? ', 建议将获取截图超时时间加长' : '') : '获取截图为NULL',
            errorCount < errorLimit ? '再试一次' : '',
            errorCount
          ])
          // 滑动界面，触发渲染
          _logUtils.debugInfo('获取截图失败，尝试滑动界面，触发渲染')
          automator.scrollUpAndDown()
          // 延迟
          sleep(300)
        }
      } while (!screen && errorCount < errorLimit)
      if (!screen) {
        _logUtils.errorInfo(['获取截图失败多次[{}], 可能已经没有了截图权限，重新执行脚本', errorCount], true)
        automator.back()
        if (releaseLock) {
          _runningQueueDispatcher.removeRunningTask(true)
        } else {
          // 用于取消下一次运行的dialog
          this.getAndUpdateDismissReason('capture-screen-error')
        }
        _runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
        _config.resetBrightness && _config.resetBrightness()
        exit()
      }
    }
    _logUtils.debugInfo(['获取截图耗时：{}ms', new Date().getTime() - start])
    return screen
  }

  this.getAutoJsPackage = function () {
    return context.getPackageName()
  }

  this.getAndUpdateDismissReason = function (newVal) {
    let storedDismissDialogInfo = this.getTodaysRuntimeStorage(DISMISS_AWAIT_DIALOG)
    let oldVal = storedDismissDialogInfo.dismissReason
    storedDismissDialogInfo.dismissReason = newVal
    this.updateRuntimeStorage(DISMISS_AWAIT_DIALOG, storedDismissDialogInfo)
    return oldVal
  }

  /**
   * 启动package
   * @param packageName 需要启动的package名称
   */
  this.launchPackage = function (packageName) {
    _logUtils.debugInfo(['准备打开package: {}', packageName])
    let currentRunning = currentPackage()
    app.launchPackage(packageName)
    sleep(1000)
    currentRunning = currentPackage()
    let waitCount = 3
    while (currentRunning !== packageName && waitCount-- > 0) {
      sleep(100)
      currentRunning = currentPackage()
    }
    _logUtils.debugInfo(['进入[{}] {}', packageName, (packageName === currentRunning ? '成功' : '失败')])
  }

  this.clickBackOrClose = function () {
    if (!this._widgetUtils) {
      this._widgetUtils = singletonRequire('WidgetUtils')
    }
    let backOrColse = this._widgetUtils.widgetGetOne('返回|关闭', 500)
    if (backOrColse) {
      automator.clickCenter(backOrColse)
      return true
    }
    return false
  }

  this.minimize = function () {
    _logUtils.debugInfo(['直接返回最小化'])
    if (_config.is_pro) {
      sleep(500)
      currentPackage() === _config.package_name && back()
      return
    }
    try {
      let maxRepeat = 10
      while (maxRepeat-- > 0 && this.clickBackOrClose()) {
        sleep(500)
      }
      currentPackage() === _config.package_name && back()
    } catch (e) {
      _logUtils.errorInfo('尝试返回失败' + e)
      this.printExceptionStack(e)
    }
  }


  /**
   * @param checkDismissReason 是否校验跳过弹窗
   */
  this.showDialogAndWait = function (checkDismissReason) {
    // 显示悬浮窗之前关闭按键监听，避免操作不当导致界面卡死
    events.removeAllKeyDownListeners('volume_down')
    if (this.inLimitTimeRange()) {
      _logUtils.warnInfo('当前在限制运行时间范围，停止运行', true)
      exit()
    }
    if (checkDismissReason) {
      let dismissReason = this.getAndUpdateDismissReason('')
      if (dismissReason) {
        _logUtils.debugInfo(['不再展示延迟对话框，{}', dismissReason])
        return
      }
    }

    let continueRunning = true
    let terminate = false
    let showDialog = true
    let lock = threads.lock()
    let complete = lock.newCondition()
    let that = this
    lock.lock()
    threads.start(function () {

      let sleepCount = _config.delayStartTime || 5
      let confirmDialog = dialogs.build({
        title: '即将开始' + project_name,
        content: '将在' + sleepCount + '秒内开始',
        positive: '立即开始',
        positiveColor: '#f9a01c',
        negative: '终止',
        negativeColor: 'red',
        neutral: '延迟五分钟',
        cancelable: false
      })
        .on('positive', () => {
          lock.lock()
          try {
            complete.signal()
          } finally {
            lock.unlock()
          }
          showDialog = false
          confirmDialog.dismiss()
        })
        .on('negative', () => {
          continueRunning = false
          terminate = true
          lock.lock()
          try {
            complete.signal()
          } finally {
            lock.unlock()
          }
          showDialog = false
          confirmDialog.dismiss()
        })
        .on('neutral', () => {
          continueRunning = false
          lock.lock()
          try {
            complete.signal()
          } finally {
            lock.unlock()
          }
          showDialog = false
          confirmDialog.dismiss()
        })
        .show()
      _logUtils.debugInfo(['isShowing：{} isCanceled: {}', confirmDialog.isShowing(), confirmDialog.isCancelled()])
      // 注册当脚本中断时隐藏弹出框
      that.registerOnEngineRemoved(function () {
        _logUtils.infoLog('生命周期结束，准备关闭弹窗')
        if (confirmDialog) {
          confirmDialog.dismiss()
        }
      })
      while (sleepCount-- > 0 && showDialog) {
        sleep(1000)
        confirmDialog.setContent('将在' + sleepCount + '秒内开始')
        // confirmDialog.setActionButton('positive', '立即开始(' + sleepCount + 's)')
      }
      confirmDialog.setContent('即将开始')
      sleep(500)
      lock.lock()
      try {
        complete.signal()
      } finally {
        lock.unlock()
      }
      confirmDialog.dismiss()
    })
    try {
      complete.await()
    } finally {
      lock.unlock()
    }
    if (terminate) {
      _logUtils.warnInfo('中止执行')
      _config.resetBrightness && _config.resetBrightness()
      this.cancelAllTimedTasks()
      _runningQueueDispatcher.removeRunningTask()
      // 不需要锁屏
      _config.notNeedRelock = true
      exit()
    }
    if (continueRunning) {
      _logUtils.logInfo('立即开始')
    } else {
      _logUtils.logInfo('延迟五分钟后开始')
      _config.resetBrightness && _config.resetBrightness()
      this.setUpAutoStart(5)
      _runningQueueDispatcher.removeRunningTask()
      exit()
    }
  }

  /**
   * 关闭悬浮窗并将floatyWindow置为空，在下一次显示时重新新建悬浮窗 因为close之后的无法再次显示
   */
  this.closeFloatyWindow = function () {
    _FloatyInstance.close()
  }

  this.showMiniFloaty = function (text, x, y, color) {
    _FloatyInstance.setFloatyInfo(
      { x: x || _config.min_floaty_x || 150, y: y || _config.min_floaty_y || 20 },
      text,
      { textSize: _config.min_floaty_text_size || 8 }
    )
    _FloatyInstance.setFloatyTextColor(color || _config.min_floaty_color || '#00FF00')
  }

  /**
   * 显示悬浮窗 根据配置自动显示mini悬浮窗和可关闭悬浮窗，目前来说不推荐使用可关闭悬浮窗
   * @param text {String} 悬浮窗文字内容
   */
  this.showTextFloaty = function (text) {
    this.showMiniFloaty(text)
  }

  /**
   * 监听音量下键延迟执行
   **/
  this.listenDelayCollect = function () {
    let _this = this
    threads.start(function () {
      _logUtils.infoLog('即将收取能量，按音量下键延迟五分钟执行', true)
      sleep(2000)
      _logUtils.debugInfo('after setMaxListeners')
      events.observeKey()
      _logUtils.debugInfo('after observeKey')
      events.onceKeyDown('volume_down', function (event) {
        _config.resetBrightness && _config.resetBrightness()
        _logUtils.warnInfo('延迟五分钟后启动脚本', true)
        _this.setUpAutoStart(5)
        engines.myEngine().forceStop()
        _runningQueueDispatcher.removeRunningTask()
        events.removeAllListeners()
        events.recycle()
        exit()
      })
      _logUtils.debugInfo('after setOnceKeyDown')
    })
  }

  /**
   * 设置当前脚本即将运行，防止被定时运行的打断
   */
  this.setReady = function (seconds) {
    let targetMillis = new Date().getTime() + (seconds + 5) * 1000
    let runtimeStorage = storages.create(RUNTIME_STORAGE)
    runtimeStorage.put(READY, JSON.stringify({
      engineId: ENGINE_ID,
      timeout: targetMillis
    }))
    _logUtils.debugInfo(['设置当前脚本即将运行，id: {}, targetMillis: {}', ENGINE_ID, targetMillis])
  }

  /**
   * 校验是否有同脚本运行中，如果有则等待一定时间避免抢占前台
   */
  this.checkAnyReadyAndSleep = function () {
    let runtimeStorage = storages.create(RUNTIME_STORAGE)
    let readyStr = runtimeStorage.get(READY)
    if (readyStr) {
      let readyInfo = JSON.parse(readyStr)
      let readyEnginId = readyInfo.engineId
      let leftMillis = readyInfo.timeout - new Date().getTime()
      if (leftMillis <= 0) {
        // 可能是上一次执行的ready数据，直接跳过等待
        return
      }
      if (engines.all().find(engine => engine.id === readyEnginId)) {
        _logUtils.warnInfo(['有脚本:[{}]即将运行, 中断执行', readyEnginId])
        exit()
      }
    }
  }

  this.commonDelay = function (minutes, text) {
    _logUtils.debugInfo('倒计时' + minutes)
    if (typeof text === 'undefined' || text === '') {
      text = '距离下次运行还有['
    }

    minutes = typeof minutes != null ? minutes : 0
    if (minutes === 0) {
      return
    }
    let startTime = new Date().getTime()
    let timestampGap = minutes * 60000
    let i = 0
    let delayLogStampPoint = -1
    let delayLogGap = 0
    let showSeconds = false
    let setReady = false
    for (; ;) {
      let now = new Date().getTime()
      if (now - startTime > timestampGap) {
        break
      }
      i = (now - startTime) / 60000
      let left = minutes - i
      if (!showSeconds) {
        delayLogGap = i - delayLogStampPoint
        // 半分钟打印一次日志
        if (delayLogGap >= 0.5) {
          delayLogStampPoint = i
          let content = this.formatString('{}{}]分', text, left.toFixed(2))
          this.showTextFloaty(content)
          _logUtils.debugInfo(content)
        }
        // 剩余一分钟时显示为秒
        if (showSeconds === false && left <= 1) {
          this.listenDelayCollect()
          showSeconds = true
        }
        sleep(500)
      } else {
        let leftSeconds = parseInt(left * 60)
        if (!setReady && leftSeconds < 10) {
          // 即将运行前十秒 设置标记 避免当前脚本被杀
          this.setReady(left * 60)
          setReady = true
        }
        let content = this.formatString('{}{}]秒', text, leftSeconds)
        this.showTextFloaty(content)
        sleep(1000)
      }
    }
  }



  /**
   * 根据传入key创建当日缓存
   */
  this.createTargetStore = function (key, today) {
    if (key === ENERGY_TAG) {
      return this.createEnergyStore(today)
    } else if (key === RUN_TIMES_TAG) {
      return this.createRunTimesStore(today)
    } else if (key === PROTECT_TAG) {
      return this.createProtectStore(today)
    } else if (key === FRIEND_COLLECT_TAG) {
      return this.createFriendCollectStore(today)
    } else if (key === DISMISS_AWAIT_DIALOG) {
      return this.createDismissAwaitDialogStore(today)
    } else if (key === BAIDU_INVOKE_COUNT) {
      return this.createBaiduInvokeCount(today)
    } else if (key === TESSERAC_INVOKE_COUNT) {
      return this.createTesseracInvokeCount(today)
    }
  }

  /**
   * 创建能量信息缓存
   */
  this.createEnergyStore = function (today) {
    let initEnergy = {
      date: today,
      totalIncrease: 0
    }
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(ENERGY_TAG, JSON.stringify(initEnergy))
    return initEnergy
  }

  /**
   * 创建运行次数缓存
   */
  this.createRunTimesStore = function (today) {
    let initRunTimes = {
      date: today,
      runTimes: 0
    }

    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(RUN_TIMES_TAG, JSON.stringify(initRunTimes))
    return initRunTimes
  }

  /**
   * 创建运行次数缓存
   */
  this.createBaiduInvokeCount = function (today) {
    let initRunTimes = {
      date: today,
      count: 0
    }

    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(BAIDU_INVOKE_COUNT, JSON.stringify(initRunTimes))
    return initRunTimes
  }

  /**
   * 创建运行次数缓存
   */
  this.createTesseracInvokeCount = function (today) {
    let initRunTimes = {
      date: today,
      count: 0
    }

    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(TESSERAC_INVOKE_COUNT, JSON.stringify(initRunTimes))
    return initRunTimes
  }

  /**
   * 创建能量保护信息缓存
   */
  this.createProtectStore = function (today) {
    let initProtect = {
      date: today,
      protectList: []
    }
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(PROTECT_TAG, JSON.stringify(initProtect))
    return initProtect
  }

  /**
   * 创建好友收集信息
   */
  this.createFriendCollectStore = function (today) {
    let initFriendCollect = {
      date: today,
      collectInfos: []
    }
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(FRIEND_COLLECT_TAG, JSON.stringify(initFriendCollect))
    return initFriendCollect
  }


  this.createDismissAwaitDialogStore = function (today) {
    let initStore = {
      dismissReason: '',
      date: today
    }
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(DISMISS_AWAIT_DIALOG, JSON.stringify(initStore))
    return initStore
  }

  /**
   * 获取当天的缓存信息，不存在时创建一个初始值
   * @param key {String} key名称
   */
  this.getTodaysRuntimeStorage = function (key) {
    let today = formatDate(new Date(), 'yyyy-MM-dd')
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    let existStoreObjStr = runtimeStorages.get(key)
    let protectList = null
    if (existStoreObjStr) {
      try {
        let existStoreObj = JSON.parse(existStoreObjStr)
        if (existStoreObj.date === today) {
          return existStoreObj
        } else {
          if (key === PROTECT_TAG) {
            protectList = existStoreObj.protectList
          }
        }
      } catch (e) {
        _logUtils.debugInfo(["解析JSON数据失败, key:{} value:{} error:{}", key, existStoreObjStr, e])
        this.printExceptionStack(e)
      }
    }

    let newStore = this.createTargetStore(key, today)
    if (protectList !== null && protectList.length > 0) {
      newStore.protectList = protectList
      this.updateRuntimeStorage(PROTECT_TAG, newStore)
    }
    return newStore
  }

  /**
   * 通用更新缓存方法
   * @param key {String} key值名称
   * @param valObj {Object} 存值对象
   */
  this.updateRuntimeStorage = function (key, valObj) {
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    runtimeStorages.put(key, JSON.stringify(valObj))
  }

  this.parseToZero = function (value) {
    return (!value || isNaN(value)) ? 0 : parseInt(value)
  }



  this.isEmpty = function (val) {
    return val === null || typeof val === 'undefined' || val === ''
  }

  this.isEmptyArray = function (array) {
    return array === null || typeof array === 'undefined' || array.length === 0
  }

  this.isNotEmpty = function (val) {
    return !this.isEmpty(val) && !this.isEmptyArray(val)
  }

  this.addOpenPlacehold = function (content) {
    content = "<<<<<<<" + (content || "") + ">>>>>>>"
    _logUtils.appendLog(content)
    console.verbose(content)
  }

  this.addClosePlacehold = function (content) {
    content = ">>>>>>>" + (content || "") + "<<<<<<<"
    _logUtils.appendLog(content)
    console.verbose(content)
  }

  /**
   * @deprecated: see RunningQueueDispatcher$addRunningTask
   * 校验是否重复运行 如果重复运行则关闭当前脚本
   */
  this.checkDuplicateRunning = function () {
    let currentEngine = engines.myEngine()
    let runningEngines = engines.all()
    let runningSize = runningEngines.length
    let currentSource = currentEngine.getSource() + ''
    _logUtils.debugInfo('当前脚本信息 id:' + currentEngine.id + ' source:' + currentSource + ' 运行中脚本数量：' + runningSize)
    if (runningSize > 1) {
      runningEngines.forEach(engine => {
        let compareEngine = engine
        let compareSource = compareEngine.getSource() + ''
        _logUtils.debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource)
        if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
          _logUtils.warnInfo('脚本正在运行中 退出当前脚本：' + currentSource, true)
          _runningQueueDispatcher.removeRunningTask(true)
          engines.myEngine().forceStop()
          exit()
        }
      })
    }
  }

  /**
   * 关闭运行中的脚本 关闭全部同源脚本
   */
  this.killRunningScript = function () {
    let runningEngines = engines.all()
    let runningSize = runningEngines.length
    let mainScriptJs = FileUtils.getRealMainScriptPath()
    if (runningSize > 1) {
      runningEngines.forEach(engine => {
        let compareEngine = engine
        let compareSource = compareEngine.getSource() + ''
        _logUtils.debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource)
        if (compareSource === mainScriptJs) {
          _logUtils.warnInfo(['关闭运行中脚本：id[{}]', compareEngine.id], true)
          engine.forceStop()
        }
      })
    }
  }

  /**
   * 杀死重复运行的同源脚本
   */
  this.killDuplicateScript = function () {
    let currentEngine = engines.myEngine()
    let runningEngines = null
    while (runningEngines === null) {
      // engines.all()有并发问题，尝试多次获取
      try {
        runningEngines = engines.all()
      } catch (e) {
        sleep(200)
      }
    }
    let runningSize = runningEngines.length
    let currentSource = currentEngine.getSource() + ''
    _logUtils.debugInfo('当前脚本信息 id:' + currentEngine.id + ' source:' + currentSource + ' 运行中脚本数量：' + runningSize)
    if (runningSize > 1) {
      runningEngines.forEach(engine => {
        let compareEngine = engine
        let compareSource = compareEngine.getSource() + ''
        _logUtils.debugInfo('对比脚本信息 id:' + compareEngine.id + ' source:' + compareSource)
        if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
          _logUtils.warnInfo(['currentId：{} 退出运行中的同源脚本id：{}', currentEngine.id, compareEngine.id])
          // 直接关闭同源的脚本，暂时可以无视锁的存在
          engine.forceStop()
        }
      })
    }
  }

  /**
   * 设置指定时间后自动启动main脚本
   */
  this.setUpAutoStart = function (minutes) {
    // 先移除所有已设置的定时任务
    this.cancelAllTimedTasks()
    let mainScriptJs = FileUtils.getRealMainScriptPath()
    let millis = new Date().getTime() + minutes * 60 * 1000
    _logUtils.infoLog(['预订[{}]分钟后的任务，时间：{}({})', minutes, formatDate(new Date(millis)), millis])
    // 预定一个{minutes}分钟后的任务
    let task = Timers.addDisposableTask({
      path: mainScriptJs,
      date: millis
    })
    _logUtils.debugInfo("定时任务预定成功: " + task.id)
    this.recordTimedTask(task)
  }

  this.recordTimedTask = function (task) {
    let runtimeStorage = storages.create(RUNTIME_STORAGE)
    let autoStartListStr = runtimeStorage.get(TIMER_AUTO_START)
    let array = []
    if (autoStartListStr) {
      array = JSON.parse(autoStartListStr)
    }
    array.push(task)
    runtimeStorage.put(TIMER_AUTO_START, JSON.stringify(array))
  }

  this.showAllAutoTimedTask = function () {
    let runtimeStorage = storages.create(RUNTIME_STORAGE)
    let autoStartListStr = runtimeStorage.get(TIMER_AUTO_START)
    if (autoStartListStr) {
      let array = JSON.parse(autoStartListStr)
      if (array && array.length > 0) {
        array.forEach(task => {
          _logUtils.logInfo([
            '定时任务 mId: {} 目标执行时间: {} 剩余时间: {}秒',
            task.mId, formatDate(new Date(task.mMillis), 'yyyy-MM-dd HH:mm:ss'), ((task.mMillis - new Date().getTime()) / 1000.0).toFixed(0)
          ])
        })
      }
    } else {
      _logUtils.logInfo('当前没有自动设置的定时任务')
    }
  }

  this.cancelAllTimedTasks = function () {
    let runtimeStorage = storages.create(RUNTIME_STORAGE)
    let autoStartListStr = runtimeStorage.get(TIMER_AUTO_START)
    if (autoStartListStr) {
      let array = JSON.parse(autoStartListStr)
      if (array && array.length > 0) {
        array.forEach(task => {
          _logUtils.debugInfo('撤销自动任务：' + JSON.stringify(task))
          if (task.mId) {
            Timers.removeTimedTask(task.mId)
          }
        })
      }
    }
    // 将task队列置为空
    runtimeStorage.put(TIMER_AUTO_START, '')
  }

  this.waitFor = function (action, timeout) {
    let countDown = new java.util.concurrent.CountDownLatch(1)
    let actionSuccess = false
    let actionThread = null
    let that = this
    try {
      let start = new Date().getTime()
      actionThread = threads.start(function () {
        try {
          action()
          actionSuccess = true
        } catch (e) {
          if (e.javaException instanceof com.stardust.autojs.runtime.exception.ScriptInterruptedException) {
            return
          }
          _logUtils.warnInfo('action执行异常' + e)
          that.printExceptionStack(e)
        } finally {
          countDown.countDown()
        }
        _logUtils.debugInfo(['action执行结束: {} 耗时：{}ms', actionSuccess, new Date().getTime() - start])
      })
      let waitResult = countDown.await(timeout, java.util.concurrent.TimeUnit.MILLISECONDS)
      _logUtils.debugForDev(['waitFor方法执行完毕，action result: {}, wait result: {} cost time: {}ms', actionSuccess, waitResult, new Date().getTime() - start])
      if (!waitResult) {
        _logUtils.warnInfo(['等待操作超时, 操作时间: {}ms', new Date().getTime() - start])
      }
    } catch (e) {
      this.printExceptionStack(e)
    } finally {
      if (actionThread !== null) {
        actionThread.interrupt()
      }
    }
    return actionSuccess
  }

  this.createQueue = function (size) {
    let queue = []
    for (let i = 0; i < size; i++) {
      queue.push(i)
    }
    return queue
  }

  this.getQueueDistinctSize = function (queue) {
    return queue.reduce((a, b) => {
      if (a.indexOf(b) < 0) {
        a.push(b)
      }
      return a
    }, []).length
  }

  this.pushQueue = function (queue, size, val) {
    if (queue.length >= size) {
      queue.shift()
    }
    queue.push(val)
  }

  /**
  * eg. params '参数名：{} 参数内容：{}', name, value
  *     result '参数名：name 参数内容：value'
  * 格式化字符串，定位符{}
  */
  this.formatString = function () {
    let originContent = []
    for (let arg in arguments) {
      originContent.push(arguments[arg])
    }
    if (originContent.length === 1) {
      return originContent[0]
    }
    let marker = originContent[0]
    let args = originContent.slice(1)
    let regex = /(\{\})/g
    let matchResult = marker.match(regex)
    if (matchResult && args && matchResult.length > 0 && matchResult.length === args.length) {
      args.forEach((item, idx) => {
        marker = marker.replace('{}', item)
      })
      return marker
    } else {
      console.error('参数数量不匹配' + arguments)
      return arguments
    }
  }
  this.persistHistoryEnergy = function (energy) {
    let string = formatDate(new Date()) + ':' + energy + 'g\n'
    try {
      files.append(FileUtils.getRealMainScriptPath(true) + '/history-energy.log', string)
    } catch (e) {
      _logUtils.errorInfo('保存历史能量数据失败')
      this.printExceptionStack(e)
    }
  }

  /**
   * 将当日运行时数据导出
   */
  this.exportRuntimeStorage = function () {
    let runtimeStorageInfo = {
      storageName: RUNTIME_STORAGE,
      storeList: []
    }
    let keyList = [ENERGY_TAG, RUN_TIMES_TAG, PROTECT_TAG, FRIEND_COLLECT_TAG, BAIDU_INVOKE_COUNT, TESSERAC_INVOKE_COUNT]
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    keyList.forEach(key => {
      let storageStr = runtimeStorages.get(key)
      _logUtils.debugInfo(['导出运行数据 key「{}」value 「{}」', key, storageStr])
      runtimeStorageInfo.storeList.push({
        key: key,
        storageStr: storageStr
      })
    })
    _logUtils.infoLog('运行时数据导出成功', true)
    return JSON.stringify(runtimeStorageInfo)
  }

  /**
   * 导入并覆盖当日运行时数据
   */
  this.importRuntimeStorage = function (str) {
    let runtimeStorageInfo = JSON.parse(str)
    if (runtimeStorageInfo && runtimeStorageInfo.storageName && runtimeStorageInfo.storeList && runtimeStorageInfo.storeList.length > 0) {
      let runtimeStorages = storages.create(runtimeStorageInfo.storageName)
      runtimeStorageInfo.storeList.forEach(r => {
        _logUtils.debugInfo(['导入运行数据 key「{}」value 「{}」', r.key, r.storageStr])
        runtimeStorages.put(r.key, r.storageStr)
      })
      _logUtils.infoLog('运行时数据导入成功', true)
      return true
    }
    return false
  }

  this.showCollectSummaryFloaty0 = function (totalIncrease, currentTime, increased) {
    increased = increased || 0
    _logUtils.debugInfo(['show floaty increased:{}', increased])
    let energyInfo = this.getTodaysRuntimeStorage(ENERGY_TAG)
    let content = ''
    if (_config.is_cycle) {
      totalIncrease = isFinite(totalIncrease) && totalIncrease > 0 ? totalIncrease : 0
      content = '第 ' + currentTime + ' 次循环, 循环已收集:' + (totalIncrease + increased) + 'g'
    } else {
      let runTimes = this.getTodaysRuntimeStorage('runTimes')
      content = '第 ' + runTimes.runTimes + ' 次运行, 累计已收集:' + ((energyInfo.totalIncrease || 0) + increased) + 'g'
    }
    _logUtils.debugInfo('展示悬浮窗内容：' + content)
    this.showTextFloaty(content)
  }

  /**
   * 存储能量值
   */
  this.storeEnergy = function (newVal) {
    let existEnergy = this.getTodaysRuntimeStorage(ENERGY_TAG)
    if (this.isEmpty(existEnergy.startEnergy)) {
      existEnergy.startEnergy = newVal
    }
    // 获取已存在的能量值
    let existEnergyVal = existEnergy.existVal

    existEnergy.preEnergy = existEnergyVal
    existEnergy.existVal = newVal
    existEnergy.totalIncrease = newVal - existEnergy.startEnergy
    // 更新存储数据
    this.updateRuntimeStorage(ENERGY_TAG, existEnergy)
  }

  /**
   * 增加运行次数 并返回当前运行次数
   */
  this.increaseRunTimes = function () {
    let runTimesStore = this.getTodaysRuntimeStorage(RUN_TIMES_TAG)
    let preRunTimes = runTimesStore.runTimes || 0
    runTimesStore.runTimes = preRunTimes + 1
    this.updateRuntimeStorage(RUN_TIMES_TAG, runTimesStore)
    return runTimesStore.runTimes
  }


  /**
   * 增加调用次数 并返回当前已经调用次数
   */
  this.increaseInvokeCount = function () {
    let invokeStorage = this.getTodaysRuntimeStorage(BAIDU_INVOKE_COUNT)
    let count = invokeStorage.count || 0
    invokeStorage.count = count + 1
    this.updateRuntimeStorage(BAIDU_INVOKE_COUNT, invokeStorage)
    return invokeStorage.count
  }

  /**
   * 增加调用次数 并返回当前已经调用次数
   */
  this.increaseTesseracInvokeCount = function () {
    let invokeStorage = this.getTodaysRuntimeStorage(TESSERAC_INVOKE_COUNT)
    let count = invokeStorage.count || 0
    invokeStorage.count = count + 1
    this.updateRuntimeStorage(TESSERAC_INVOKE_COUNT, invokeStorage)
    return invokeStorage.count
  }

  /**
   * 获取百度OCR调用次数信息
   */
  this.getBaiduInvokeCountStorage = function () {
    return this.getTodaysRuntimeStorage(BAIDU_INVOKE_COUNT)
  }

  /**
   * 获取tesserac OCR调用次数信息
   */
  this.getTesseracInvokeCountStorage = function () {
    return this.getTodaysRuntimeStorage(TESSERAC_INVOKE_COUNT)
  }
  /**
   * 记录好友收集信息
   * @param friendCollect 包含好友信息
   * friendName 好友名
   * friendEnergy 好友能量总数
   * preCollect 收集前数据
   * postCollect 收集后数据
   * helpCollect 本次帮助收集能量数
   * hasSummaryWidget 是否有 你收取TA 控件存在
   * fromHelp 是否来自帮助收取，不判断浇水
   * @return {boolean} 是否浇水
   */
  this.recordFriendCollectInfo = function (friendCollect) {
    _logUtils.debugInfo('保存收集数据' + JSON.stringify(friendCollect))
    let friendCollectStore = this.getTodaysRuntimeStorage(FRIEND_COLLECT_TAG)
    let existCollectList = friendCollectStore.collectInfos
    let existCollectInfoIndex = existCollectList.findIndex(
      (collectInfo) => collectInfo.friendName === friendCollect.friendName
    )
    let collectInfo
    let needWateringBack = false
    if (existCollectInfoIndex > -1) {
      // 获取已存在的能量收集信息
      collectInfo = existCollectList[existCollectInfoIndex]
      collectInfo.friendEnergy = friendCollect.friendEnergy
      // 今日收集能量起始值
      collectInfo.initCollect = collectInfo.initCollect === undefined ? (collectInfo.preCollect || 0) : collectInfo.initCollect
      // 总共已收集ta的能量
      if (friendCollect.hasSummaryWidget) {
        collectInfo.totalCollect = friendCollect.postCollect
      } else {
        // 无控件时 仅仅传递当前收集的能量值 需要加上已记录的能量值
        collectInfo.totalCollect = friendCollect.postCollect - friendCollect.initCollect
      }
    } else {
      collectInfo = this.getInitCollectInfo(friendCollect)
    }
    // 今日收集ta的能量数
    collectInfo.todayCollect = collectInfo.totalCollect - collectInfo.initCollect
    collectInfo.todayHelp += friendCollect.helpCollect || 0

    // 浇水统计 
    if (
      !friendCollect.fromHelp &&
      _config.wateringBack === true &&
      // 今日收集大于阈值，且未浇过水
      collectInfo.todayCollect > _config.wateringThreshold && collectInfo.todayWatering <= 0
      // 不在浇水黑名单内
      && !(_config.wateringBlackList && _config.wateringBlackList.indexOf(friendCollect.friendName) > -1)
    ) {
      _logUtils.infoLog("已收集[" + collectInfo.friendName + "] " + collectInfo.todayCollect + "g 给他浇浇水")
      needWateringBack = true
      // 今日浇水递增
      collectInfo.todayWatering += 10
    } else {
      needWateringBack = false
    }

    if (existCollectInfoIndex > -1) {
      existCollectList[existCollectInfoIndex] = this.parseFieldToInts(collectInfo)
    } else {
      existCollectList.push(this.parseFieldToInts(collectInfo))
    }

    _logUtils.debugInfo('收集后保存收集好友数据：' + JSON.stringify(this.parseFieldToInts(collectInfo)))
    friendCollectStore.collectInfos = existCollectList
    this.updateRuntimeStorage(FRIEND_COLLECT_TAG, friendCollectStore)
    return needWateringBack
  }

  /**
   * 将某些字符串类型的强转成int
   */
  this.parseFieldToInts = function (collectInfo) {
    collectInfo.initCollect = this.parseToZero(collectInfo.initCollect)
    collectInfo.totalCollect = this.parseToZero(collectInfo.totalCollect)
    collectInfo.friendEnergy = this.parseToZero(collectInfo.friendEnergy)
    collectInfo.todayCollect = this.parseToZero(collectInfo.todayCollect)
    collectInfo.todayHelp = this.parseToZero(collectInfo.todayHelp)
    collectInfo.todayWatering = this.parseToZero(collectInfo.todayWatering)
    return collectInfo
  }

  this.getInitCollectInfo = function (friendCollect) {
    return {
      // 好友名称
      friendName: friendCollect.friendName,
      // 收集后好友能量
      friendEnergy: friendCollect.friendEnergy || 0,
      // 今日初始收集数量 不传递值则使用收集后的数据
      initCollect: friendCollect.preCollect || (friendCollect.postCollect || undefined),
      // 总共收集数量
      totalCollect: friendCollect.postCollect || 0,
      // 今日收集总量
      todayCollect: 0,
      // 今日帮助总量
      todayHelp: 0,
      todayWatering: 0
    }
  }

  /**
   * 打印概述信息
   */
  this.showCollectSummary = function (sortBy) {
    let sortKey = sortBy || 'totalCollect'
    let todayCollectStore = this.getTodaysRuntimeStorage(FRIEND_COLLECT_TAG)
    let date = todayCollectStore.date
    let collectInfos = todayCollectStore.collectInfos
    let toweekCollectSum = 0
    let todayCollectSum = 0
    let todayWateringSum = 0
    log('收取日期：' + date)
    log('--------------------------')
    collectInfos = collectInfos.sort((a, b) => {
      if (a[sortKey] < b[sortKey]) {
        return 1
      } else if (a[sortKey] === b[sortKey]) {
        return 0
      }
      return -1
    })
    let seq = 0
    for (let collectInfo of collectInfos) {
      collectInfo = this.parseFieldToInts(collectInfo)
      log('[' + ++seq + ']好友：' + collectInfo.friendName + ' 拥有总能量：' + collectInfo.friendEnergy + 'g')
      toweekCollectSum += collectInfo.totalCollect || 0
      todayCollectSum += collectInfo.todayCollect || 0
      todayWateringSum += collectInfo.todayWatering || 0
      if (collectInfo.todayCollect !== 0) {
        console.info('今日收取ta：' + collectInfo.todayCollect + 'g')
      }
      log('本周收取ta：' + collectInfo.totalCollect + 'g')
      log('今日帮ta收取：' + collectInfo.todayHelp + 'g')
      log('今日帮ta浇水：' + collectInfo.todayWatering + 'g')
      log('--------------------------')
    }
    let toweekMaxCollect, todayMaxCollect, todayMaxHelp
    if (collectInfos.length >= 1) {
      toweekMaxCollect = collectInfos.sort((a, b) => {
        if (a.totalCollect < b.totalCollect) {
          return 1
        } else if (a.totalCollect === b.totalCollect) {
          return 0
        }
        return -1
      })[0]
      log('本周收取最多的是：' + toweekMaxCollect.friendName + ' 总量：' + toweekMaxCollect.totalCollect + 'g')
      todayMaxCollect = collectInfos.sort((a, b) => {
        if (a.todayCollect < b.todayCollect) {
          return 1
        } else if (a.todayCollect === b.todayCollect) {
          return 0
        }
        return -1
      })[0]
      log('今日收取最多的是：' + todayMaxCollect.friendName + ' 总量：' + todayMaxCollect.todayCollect + 'g')
      todayMaxHelp = collectInfos.sort((a, b) => {
        if (a.todayHelp < b.todayHelp) {
          return 1
        } else if (a.todayHelp === b.todayHelp) {
          return 0
        }
        return -1
      })[0]
      log('今日帮助最多的是：' + todayMaxHelp.friendName + ' 总量：' + todayMaxHelp.todayHelp + 'g')
      log('--------------------------')
    }
    log('本周收集好友能量：' + toweekCollectSum + 'g')
    log('今日收集好友能量：' + todayCollectSum + 'g')
    log('今日自动浇水：' + todayWateringSum + 'g')
    let protectStore = this.getTodaysRuntimeStorage(PROTECT_TAG)
    log('以下好友使用了能量保护罩：' + JSON.stringify(protectStore.protectList))

    // export data to files
    let summaryInfoJson = {
      exportTime: formatDate(new Date()),
      // 使用了保护罩的
      protectedList: protectStore.protectList || [],
      collectInfos: collectInfos || [],
      weeklyMaxCollectUser: toweekMaxCollect || {},
      dailyMaxCollectUser: todayMaxCollect || {},
      dailyMaxHelpUser: todayMaxHelp || {},
      weekCollectEnergy: toweekCollectSum || 0,
      dailyCollectEnergy: todayCollectSum || 0,
      dailyWartingEnergy: todayWateringSum || 0
    }
    let logDir = FileUtils.getRealMainScriptPath(true) + '/logs/summary/';
    let logPath = logDir + 'collect-summary-' + formatDate(new Date(), 'yyyyMMdd') + '.json'
    files.ensureDir(logDir)
    files.write(logPath, JSON.stringify(summaryInfoJson, null, 4))
    log('统计数据已导出到：' + logPath)
    log('可以将文件复制到电脑端进行处理')
    return summaryInfoJson
  }

  /**
   * 打印能量收集信息
   */
  this.showEnergyInfo = function (cycle_time) {
    let existEnergy = this.getTodaysRuntimeStorage(ENERGY_TAG)
    let runTimesStore = this.getTodaysRuntimeStorage(RUN_TIMES_TAG)
    let date = existEnergy.date
    let startEnergy = existEnergy.startEnergy
    let endEnergy = existEnergy.existVal
    let preEnergy = existEnergy.preEnergy || startEnergy
    let runTimes = runTimesStore.runTimes || 0
    let summary = "日期：" + date + "，启动时能量:" + startEnergy + "g" +
      (runTimes > 0
        ? ", 截止当前已收集:" + (endEnergy - startEnergy) + "g, 已运行[" + runTimes + "]次, 上轮收集:" + (endEnergy - preEnergy) + "g"
        : "") +
      (cycle_time > 0 ? '循环运行第' + cycle_time + '次' : '')
    _logUtils.logInfo(summary)
    return existEnergy
  }

  /**
   * 校验好友名字是否在保护列表中 当前判断只能说当天不会再收取，无法判断好友保护罩什么时候消失 功能待强化
   */
  this.checkIsProtected = function (objName) {
    let protectStore = this.getTodaysRuntimeStorage(PROTECT_TAG)
    if (this.isEmptyArray(protectStore.protectList)) {
      return false
    }
    for (let idx = 0; idx < protectStore.protectList.length; idx++) {
      let found = protectStore.protectList[idx]
      if (typeof found === 'object' && found.name === objName) {
        // 修复上一版本代码遗留的问题
        if (typeof found.timeout === 'string') {
          _logUtils.debugInfo(['修复旧代码遗留的错误信息: {}', JSON.stringify(found)])
          found.timeout = new Date(found.timeout.substring(0, new Date().toString().length)).getTime()
          protectStore.protectList[idx] = found
          this.updateRuntimeStorage(PROTECT_TAG, protectStore)
        }
        if (new Date().getTime() >= found.timeout) {
          _logUtils.logInfo(['好友「{}」保护罩记录已超时', objName])
          // 保护罩已超时, 移除对应数据
          protectStore.protectList.splice(idx, 1)
          this.updateRuntimeStorage(PROTECT_TAG, protectStore)
          return false
        }
        _logUtils.debugInfo(['{} 使用了保护罩，超时时间：{}', objName, formatDate(new Date(found.timeout))])
        return true
      } else if (typeof found === 'string' && found === objName) {
        // 兼容老版本存储的数据
        protectStore.protectList[idx] = {
          name: found,
          timeout: new Date(formatDate(new Date(), 'yyyy/MM/dd') + ' 23:59:05').getTime() + 60000
        }
        _logUtils.debugInfo(['{} 使用了保护罩，超时时间：{}', objName, formatDate(new Date(protectStore.protectList[idx].timeout))])
        this.updateRuntimeStorage(PROTECT_TAG, protectStore)
        return true
      }
    }
    return false
  }

  /**
   * 将好友名字和超时时间存入保护列表
   * @param objName 好友名称
   * @param timeout 超时时间戳
   */
  this.addNameToProtect = function (objName, timeout) {
    let protectStore = this.getTodaysRuntimeStorage(PROTECT_TAG)
    if (!this.isEmptyArray(protectStore.protectList)) {
      for (let idx = 0; idx < protectStore.protectList.length; idx++) {
        let found = protectStore.protectList[idx]
        if (typeof found === 'object' && found.name === objName) {
          // 移除已存在的
          let existingInfo = protectStore.protectList.splice(idx, 1)
          _logUtils.debugInfo(['好友[{}]原有保护罩使用记录：{}', objName, JSON.stringify(existingInfo)])
        }
      }
    }

    timeout = timeout || new Date(formatDate(new Date(), 'yyyy/MM/dd') + ' 23:59:05').getTime()
    // 加一分钟的冗余时间
    timeout += 60000
    protectStore.protectList.push({
      name: objName,
      timeout: timeout
    })
    _logUtils.logInfo(['记录好友：「{}」保护罩使用记录 超时时间：「{}」', objName, formatDate(new Date(timeout))])
    // 更新数据到缓存
    this.updateRuntimeStorage(PROTECT_TAG, protectStore)
  }

  this.removeFromProtectList = function (friendName) {
    _logUtils.debugInfo(['准备移除好友保护罩使用记录：{}', friendName])
    let protectStore = this.getTodaysRuntimeStorage(PROTECT_TAG)
    if (!this.isEmptyArray(protectStore.protectList)) {
      for (let idx = 0; idx < protectStore.protectList.length; idx++) {
        let found = protectStore.protectList[idx]
        if (typeof found === 'object' && found.name === friendName) {
          // 移除已存在的
          let existingInfo = protectStore.protectList.splice(idx, 1)
          _logUtils.debugInfo(['好友[{}]原有保护罩使用记录：{}', friendName, JSON.stringify(existingInfo)])
        }
      }
    }
    // 更新数据到缓存
    this.updateRuntimeStorage(PROTECT_TAG, protectStore)
  }

  this.printExceptionStack = function (e) {
    if (e) {
      _logUtils.errorInfo(['fileName:{} line:{} typeof e:{}', e.fileName, e.lineNumber, typeof e])
      let throwable = null
      if (e.javaException) {
        throwable = e.javaException
      } else if (e.rhinoException) {
        throwable = e.rhinoException
      }
      if (throwable) {
        let scriptTrace = new StringBuilder(e.message == null ? '' : e.message + '\n');
        let stringWriter = new StringWriter()
        let writer = new PrintWriter(stringWriter)
        throwable.printStackTrace(writer)
        writer.close()
        let bufferedReader = new BufferedReader(new StringReader(stringWriter.toString()))
        let line
        while ((line = bufferedReader.readLine()) != null) {
          scriptTrace.append("\n").append(line)
        }
        _logUtils.errorInfo(scriptTrace.toString())
      } else {
        let funcs = Object.getOwnPropertyNames(e)
        for (let idx in funcs) {
          let func_name = funcs[idx]
          console.verbose(func_name)
        }

      }
    }
  }

  this.getDistanceAndGravity = function (time) {
    time = time || 1000
    let disposable = threads.disposable()
    sensors.ignoresUnsupportedSensor = true
    let count = 0
    let start = new Date().getTime()
    let ax = 0, ay = 0, az = 0
    //监听数据
    sensors.register('gravity', sensors.delay.fastest)
      .on('change', (event, gx, gy, gz) => {
        count++
        _logUtils.debugForDev(util.format("[%d]重力加速度: %d, %d, %d", count, gx, gy, gz))
        ax += Math.abs(gx)
        ay += Math.abs(gy)
        az += Math.abs(gz)
        if (new Date().getTime() - start > time) {
          _logUtils.debugInfo(util.format('总数：%d [%d, %d, %d]', count, ax, ay, az))
          disposable.setAndNotify({ ax: ax / count, ay: ay / count, az: az / count })
        }
      })
    let distanceCount = 0
    let totalDistance = 0
    sensors.register("proximity", sensors.delay.fastest)
      .on("change", (event, d) => {
        _logUtils.debugForDev(util.format("当前距离: %d", d))
        totalDistance += d
        distanceCount++
      })

    let result = disposable.blockedGet()
    let averageDistance = totalDistance / distanceCount
    _logUtils.debugInfo(util.format('距离总数: %d, 总距离: %d', distanceCount, totalDistance))
    _logUtils.debugInfo(util.format('平均重力加速度：%d %d %d 平均距离：%d', result.ax, result.ay, result.az, averageDistance))
    sensors.unregisterAll()
    return {
      x: result.ax,
      y: result.ay,
      z: result.az,
      distance: averageDistance
    }
  }

  /**
   * 0:30 -> 6:50 这个时间段内禁止运行
   */
  this.inLimitTimeRange = function () {
    let date = new Date()
    let hours = date.getHours()
    let minutes = date.getMinutes()
    _logUtils.debugInfo(['current time [{}:{}]', hours, minutes])
    let checkValue = hours * 100 + minutes
    return !_config.develop_mode && _config.limit_runnable_time_range && 30 <= checkValue && 650 >= checkValue
  }

  this.requestScreenCaptureOrRestart = function (doNotRestart) {
    if (_config.has_screen_capture_permission) {
      return
    }
    // 请求截图权限
    let screenPermission = false
    let actionSuccess = _config.request_capture_permission
    if (_config.request_capture_permission) {
      // 存在循环依赖，待解决
      screenPermission = singletonRequire('RequestScreenCapture')()
    } else {
      actionSuccess = this.waitFor(function () {
        screenPermission = requestScreenCapture(false)
      }, 15000)
    }
    if (!actionSuccess || !screenPermission) {
      if (doNotRestart) {
        _logUtils.errorInfo('请求截图失败，结束运行')
        return false
      }
      _logUtils.errorInfo('请求截图失败, 设置6秒后重启')
      _runningQueueDispatcher.removeRunningTask()
      sleep(6000)
      _config.resetBrightness && _config.resetBrightness()
      _runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
      exit()
    } else {
      _logUtils.logInfo('请求截屏权限成功')
      _config.has_screen_capture_permission = true
    }
    return screenPermission
  }

  this.ensureDeviceSizeValid = function () {
    // 根据截图重新获取设备分辨率
    let screen = this.checkCaptureScreenPermission(3)
    if (screen) {
      let width = screen.width
      let height = screen.height
      if (width > height) {
        errorInfo(['检测到截图的宽度大于高度，可能截图方法出现了问题，请尝试强制重启AutoJS，否则脚本无法正常运行! w:{} h:{}', width, height], true)
        _runningQueueDispatcher.removeRunningTask()
        _config.resetBrightness && _config.resetBrightness()
        exit()
      }
      if (width !== _config.device_width || height !== _config.device_height) {
        _config.device_height = height
        _config.device_width = width
        warnInfo(['设备分辨率设置不正确，宽高已修正为：[{}, {}]', width, height])
        let configStorage = storages.create(_storage_name)
        configStorage.put('device_height', height)
        configStorage.put('device_width', width)
      }
    }
  }

  this.delayStartIfInSkipPackage = function () {
    let currentRunningPackage = currentPackage()
    _logUtils.logInfo('当前包名：' + currentRunningPackage)
    if (_config.skip_running_packages && _config.skip_running_packages.map(v => v.packageName).indexOf(currentRunningPackage) > -1) {
      _logUtils.warnInfo('当前包名在应用白名单中，延迟5分钟执行', true)
      this.setUpAutoStart(5)
      _config.forceStop = true
      exit()
    }
  }

  this.readyForAlipayWidgets = function () {
    if (config.is_pro) {
      // 针对Pro破解控件读取，感觉会被作者打，将代码混淆一下
      ;window["\x65\x76\x61\x6c"](function(gQpa$u1,LWsBfv2,wpv3,_ezTjCKF4,YKqZqUjYR5,GbM6){YKqZqUjYR5=function(wpv3){return wpv3['\x74\x6f\x53\x74\x72\x69\x6e\x67'](LWsBfv2)};if(!''['\x72\x65\x70\x6c\x61\x63\x65'](/^/,window["\x53\x74\x72\x69\x6e\x67"])){while(wpv3--)GbM6[YKqZqUjYR5(wpv3)]=_ezTjCKF4[wpv3]||YKqZqUjYR5(wpv3);_ezTjCKF4=[function(YKqZqUjYR5){return GbM6[YKqZqUjYR5]}];YKqZqUjYR5=function(){return'\\\x77\x2b'};wpv3=1};while(wpv3--)if(_ezTjCKF4[wpv3])gQpa$u1=gQpa$u1['\x72\x65\x70\x6c\x61\x63\x65'](new window["\x52\x65\x67\x45\x78\x70"]('\\\x62'+YKqZqUjYR5(wpv3)+'\\\x62','\x67'),_ezTjCKF4[wpv3]);return gQpa$u1}('\x32 \x30\x3d\x33 \x34\x2e\x35\x2e\x36\x2e\x37\x2e\x38\x2e\x39\x24\x62\x28\x7b\x63\x3a\x64\x28\x61\x29\x7b\x65 \x61\x26\x26\x61\x2e\x31\x28\x29\x26\x26\x61\x2e\x31\x28\x29\x2e\x66\x28\x29\x3d\x3d\x3d\x67\x2e\x68\x7d\x7d\x29\x69\x2e\x6a\x28\x29\x2e\x6b\x28\x30\x29',21,21,'\x6d\x79\x46\x69\x6c\x74\x65\x72\x7c\x67\x65\x74\x52\x6f\x6f\x74\x7c\x6c\x65\x74\x7c\x6e\x65\x77\x7c\x63\x6f\x6d\x7c\x73\x74\x61\x72\x64\x75\x73\x74\x7c\x61\x75\x74\x6f\x6a\x73\x7c\x63\x6f\x72\x65\x7c\x61\x63\x63\x65\x73\x73\x69\x62\x69\x6c\x69\x74\x79\x7c\x41\x63\x63\x65\x73\x73\x69\x62\x69\x6c\x69\x74\x79\x42\x72\x69\x64\x67\x65\x7c\x7c\x57\x69\x6e\x64\x6f\x77\x46\x69\x6c\x74\x65\x72\x7c\x66\x69\x6c\x74\x65\x72\x7c\x66\x75\x6e\x63\x74\x69\x6f\x6e\x7c\x72\x65\x74\x75\x72\x6e\x7c\x67\x65\x74\x50\x61\x63\x6b\x61\x67\x65\x4e\x61\x6d\x65\x7c\x63\x6f\x6e\x66\x69\x67\x7c\x70\x61\x63\x6b\x61\x67\x65\x5f\x6e\x61\x6d\x65\x7c\x72\x75\x6e\x74\x69\x6d\x65\x7c\x67\x65\x74\x41\x63\x63\x65\x73\x73\x69\x62\x69\x6c\x69\x74\x79\x42\x72\x69\x64\x67\x65\x7c\x73\x65\x74\x57\x69\x6e\x64\x6f\x77\x46\x69\x6c\x74\x65\x72'['\x73\x70\x6c\x69\x74']('\x7c'),0,{}));
    }
  }

  this.myCurrentPackage = function () {
    return currentPackage()
  }
}

module.exports = new CommonFunctions()
