/**
 * 通用方法集合，和项目无关，项目相关的写到 ProjectCommonFunctions.js 中
 */
importClass(android.content.Context)
importClass(android.provider.Settings)
importClass(java.io.StringWriter)
importClass(java.io.StringReader)
importClass(java.io.PrintWriter)
importClass(java.io.BufferedReader)
importClass(java.lang.StringBuilder)
let { config: _config, storage_name: _storage_name, project_name } = require('../config.js')(runtime, this)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let Timers = singletonRequire('Timers')
let _runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let _FloatyInstance = singletonRequire('FloatyUtil')
let automator = singletonRequire('Automator')
let FileUtils = singletonRequire('FileUtils')
let _logUtils = singletonRequire('LogUtils')
let formatDate = require('./DateUtil.js')
let updateChecker = require('./UpdateChecker.js')

let storageFactory = singletonRequire('StorageFactory')
let RUNTIME_STORAGE = _storage_name + "_runtime"
let DISMISS_AWAIT_DIALOG = 'dismissAwaitDialog'
let TIMER_AUTO_START = "timerAutoStart"
let READY = 'ready_engine'
let DISMISSED_PACKAGE = 'dismissedPackage'
let SKIPPED_PACKAGE = 'skipedPackage'


function CommonFunctions () {
  this.keyList = []
  storageFactory.initFactoryByKey(DISMISS_AWAIT_DIALOG, { dismissReason: '' })
  storageFactory.initFactoryByKey(TIMER_AUTO_START, { array: [] })
  storageFactory.initFactoryByKey(READY, { engineId: -1 })
  storageFactory.initFactoryByKey(DISMISSED_PACKAGE, { packageName: '', count: 0 })
  storageFactory.initFactoryByKey(SKIPPED_PACKAGE, { packageName: '', count: 0 })
  // 初始化森林相关的存储数据
  this.initStorageFactory()

  // 初始化生命周期回调 start
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
  // 初始化生命周期回调 end

  const _current_pacakge = currentPackage
  currentPackage = function () {
    let start = new Date().getTime()
    try {
      if (!runtime.getAccessibilityBridge()) {
        return _current_pacakge()
      }
      // 通过windowRoot获取根控件的包名，理论上返回一个 速度较快
      let windowRoots = runtime.getAccessibilityBridge().windowRoots()
      if (windowRoots && windowRoots.size() > 0) {
        _logUtils.debugInfo(['windowRoots size: {}', windowRoots.size()])
        for (let i = 0; i < windowRoots.size(); i++) {
          let root = windowRoots.get(i)
          if (root !== null && root.getPackageName()) {
            return root.getPackageName()
          }
        }
      }
      // windowRoot获取失败了通过service.getWindows获取根控件的包名，按倒序从队尾开始获取 速度相对慢一点
      let service = runtime.getAccessibilityBridge().getService()
      let serviceWindows = service !== null ? service.getWindows() : null
      if (serviceWindows && serviceWindows.size() > 0) {
        _logUtils.debugInfo(['windowRoots未能获取包名信息，尝试service window size: {}', serviceWindows.size()])
        for (let i = serviceWindows.size() - 1; i >= 0; i--) {
          let window = serviceWindows.get(i)
          if (window && window.getRoot() && window.getRoot().getPackageName()) {
            return window.getRoot().getPackageName()
          }
        }
      }
      _logUtils.debugInfo(['service.getWindows未能获取包名信息，通过currentPackage()返回数据'])
      // 以上方法无法获取的，直接按原方法获取包名
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
            let configStorage = storages.create(_storage_name)
            // 设为负值
            _config.bang_offset = -offset
            configStorage.put('bang_offset', _config.bang_offset)
            configStorage.put('auto_set_bang_offset', false)
            configStorage.put('updated_temp_flag_1325', false)
            sleep(500)
            _logUtils.debugInfo('关闭悬浮窗')
            window.close()
          } else {
            sleep(100)
          }
        }
      }
      if (limit <= 0) {
        ui.run(function () {
          window.text.setText('无法自动检测刘海高度，请确认是否开启了深色模式？')
        })
        _logUtils.warnInfo('无法自动检测刘海高度，请确认是否开启了深色模式？')
        sleep(500)
        window.close()
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
    let setAccessibility = false
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
        this.setUpAutoStart(0.1)
        setAccessibility = true
      } else {
        return true
      }
    } catch (e) {
      _config.develop_mode && this.printExceptionStack(e)
      _logUtils.warnInfo('\n请确保已给予 WRITE_SECURE_SETTINGS 权限\n\n授权代码已复制，请使用adb工具连接手机执行(重启不失效)\n\n', true)
      let shellScript = 'adb shell pm grant ' + packageName + ' android.permission.WRITE_SECURE_SETTINGS'
      _logUtils.warnInfo('adb 脚本 已复制到剪切板：[' + shellScript + ']')
      setClip(shellScript)
      return false
    }
    // 当通过代码设置了无障碍权限之后自动退出
    setAccessibility && exit()
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
   * 关闭无障碍权限，并重启脚本
   */
  this.disableAccessibilityAndRestart = function () {
    Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, '')
    Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, '0')
    warnInfo('关闭无障碍服务成功', true)
    this.setUpAutoStart(0.1)
    exit()
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

  this.clickBackOrClose = function (package) {
    _logUtils.debugInfo(['当前包名：{} 对比包名: {}', currentPackage(), package])
    if (currentPackage() !== package) {
      return false
    }
    if (!this._widgetUtils) {
      this._widgetUtils = singletonRequire('WidgetUtils')
    }
    let backOrColse = this._widgetUtils.widgetGetOne('返回|关闭', 500)
    if (backOrColse) {
      automator.clickCenter(backOrColse)
    } else {
      back()
    }
    return true
  }

  this.minimize = function (currentPackageName) {
    _logUtils.debugInfo(['直接返回最小化，currentPackageName: {}', currentPackageName])
    currentPackageName = currentPackageName || currentPackage()
    try {
      let maxRepeat = 10
      while (maxRepeat-- > 0 && this.clickBackOrClose(currentPackageName)) {
        sleep(500)
      }
      currentPackage() === currentPackageName && back()
    } catch (e) {
      _logUtils.errorInfo('尝试返回失败' + e)
      this.printExceptionStack(e)
    }
  }

  /**
   * 用于保存相似内容，${STORAGE_TAG} => { packageName: ${}, count: ${} }
   * 当传入包名相同时自增count，不同时重置count和packageName
   * 
   * @param {*} packageName 对应包名
   * @param {*} STORAGE_TAG 对应保存的键值
   */
  this.savePackageStorageInfo = function (packageName, STORAGE_TAG) {
    let currentStorage = storageFactory.getValueByKey(STORAGE_TAG, true)
    if (currentStorage.packageName === packageName) {
      currentStorage.count += 1
    } else {
      currentStorage = {
        packageName: packageName,
        count: 1
      }
    }
    storageFactory.updateValueByKey(STORAGE_TAG, currentStorage)
  }

  /**
   * 保存点击了延迟五分钟时的包名次数信息
   * 
   * @param {*} packageName 
   */
  this.saveDismissedPackageInfo = function (packageName) {
    this.savePackageStorageInfo(packageName, DISMISSED_PACKAGE)
  }

  /**
   * 判断指定packageName是否在白名单中
   * 
   * @param {*} packageName 
   */
  this.inSkipList = function (packageName) {
    return _config.skip_running_packages && _config.skip_running_packages.map(v => v.packageName).indexOf(packageName) > -1
  }

  /**
   * 检测当前packageName跳过次数是否达到三次，如果是则弹窗询问是否加入到白名单中
   */
  this.askAndPutIntoSkipList = function () {
    let currentDismissedPackage = storageFactory.getValueByKey(DISMISSED_PACKAGE, true)
    if (currentDismissedPackage.packageName && currentDismissedPackage.count >= 3 && !this.inSkipList(currentDismissedPackage.packageName)) {
      if (confirm('是否需要将当前包名添加到白名单？\n' + currentDismissedPackage.packageName)) {
        var currentSkipPackages = _config.skip_running_packages || []
        currentSkipPackages.push({ packageName: currentDismissedPackage.packageName, appName: getAppName(currentDismissedPackage.packageName) })
        let configStorage = storages.create(_storage_name)
        configStorage.put('skip_running_packages', currentSkipPackages)
      }
    }
  }

  /**
   * 保存白名单自动跳过的包名次数信息
   * 
   * @param {*} packageName 
   */
  this.saveSkipedPackageInfo = function (packageName) {
    this.savePackageStorageInfo(packageName, SKIPPED_PACKAGE)
  }

  /**
   * 当白名单跳过次数过多时，询问是否直接运行不在跳过，适合需要时限的任务避免跳过次数过多影响收益
   * 按音量下键可以直接运行
   */
  this.askIfStartWhenSkipedTooMuch = function () {
    let currentSkippedPackage = storageFactory.getValueByKey(SKIPPED_PACKAGE, true)
    if (currentSkippedPackage.count >= 3 && _config.warn_skipped_too_much) {
      _logUtils.warnInfo(['当前包名跳过次数过多，是否直接执行{}？音量下键执行', project_name], true)
      let continueRunning = false
      let self = this
      let th = threads.start(function () {
        events.observeKey()
        events.onceKeyDown('volume_down', function (event) {
          _logUtils.warnInfo('直接执行，不再跳过', true)
          continueRunning = true
          // 重置计数器
          self.saveSkipedPackageInfo('')
        })
      })
      // 等待五秒
      sleep(5000)
      th.interrupt()
      return continueRunning
    }
    return false
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
    let currentPackageName = currentPackage()
    if (checkDismissReason) {
      let dismissReason = this.getAndUpdateDismissReason('')
      if (dismissReason) {
        _logUtils.debugInfo(['不再展示延迟对话框，{}', dismissReason])
        return
      }
    }
    if (_config.delayStartTime <= 0) {
      _logUtils.debugInfo(['延迟启动时间[{}]小于等于0，不展示对话框', _config.delayStartTime])
      return
    }

    let continueRunning = true
    let terminate = false
    let showDialog = true
    let lock = threads.lock()
    let complete = lock.newCondition()
    let that = this
    lock.lock()
    threads.start(function () {
      let suffixContent = () => {
        let newVersion = updateChecker.hasNewVersion()
        _logUtils.debugInfo(['自动检测更新：{}', _config.auto_check_update])
        let suffix = ''
        if (newVersion) {
          suffix = '，有新版本：' + newVersion + ' 请执行更新脚本进行更新, 本地版本为：' + updateChecker.getLocalVersion()
        }
        return suffix
      }
      
      let sleepCount = _config.delayStartTime || 5
      let confirmDialog = dialogs.build({
        title: '即将开始' + project_name,
        content: '将在' + sleepCount + '秒内开始' + suffixContent(),
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
          that.saveDismissedPackageInfo(currentPackageName)
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
        confirmDialog.setContent('将在' + sleepCount + '秒内开始' + suffixContent())
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
    // 加载最新版本
    updateChecker.getLatestInfo()
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
      // 重置计数
      this.saveDismissedPackageInfo('')
    } else {
      this.askAndPutIntoSkipList()
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
  this.listenDelayStart = function () {
    let _this = this
    threads.start(function () {
      _logUtils.infoLog('即将开始，按音量下键延迟五分钟执行', true)
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
   * 获取当天的缓存信息，不存在时创建一个初始值
   * @param key {String} key名称
   */
  this.getTodaysRuntimeStorage = function (key) {
    return storageFactory.getValueByKey(key)
  }

  this.updateRuntimeStorage = function (key, value) {
    return storageFactory.updateValueByKey(key, value)
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
   * 
   * @param {float} minutes 倒计时时间 单位分
   */
  this.setUpAutoStart = function (minutes) {
    if (minutes <= 0) {
      let newRandomMinutes = parseFloat((0.01 + Math.random()).toFixed(2))
      _logUtils.errorInfo(['倒计时时间必须大于零：{} 现在将倒计时重置为： {}', minutes, newRandomMinutes])
      minutes = newRandomMinutes
    }
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
    let array = storageFactory.getValueByKey(TIMER_AUTO_START, true).array
    array.push(task)
    storageFactory.updateValueByKey(TIMER_AUTO_START, { array: array })
  }

  this.showAllAutoTimedTask = function () {
    let array = storageFactory.getValueByKey(TIMER_AUTO_START, true).array
    if (array && array.length > 0) {
      array.forEach(task => {
        _logUtils.logInfo([
          '定时任务 mId: {} 目标执行时间: {} 剩余时间: {}秒',
          task.mId, formatDate(new Date(task.mMillis), 'yyyy-MM-dd HH:mm:ss'), ((task.mMillis - new Date().getTime()) / 1000.0).toFixed(0)
        ])
      })
    }
    else {
      _logUtils.logInfo('当前没有自动设置的定时任务')
    }
  }

  this.cancelAllTimedTasks = function () {
    let array = storageFactory.getValueByKey(TIMER_AUTO_START, true).array
    if (array && array.length > 0) {
      array.forEach(task => {
        _logUtils.debugInfo('撤销自动任务：' + JSON.stringify(task))
        if (task.mId) {
          Timers.removeTimedTask(task.mId)
        }
      })
    }
    // 将task队列置为空
    storageFactory.updateValueByKey(TIMER_AUTO_START, { array: [] })
  }


  /**
   * 杀死当前APP 仅适用于MIUI10+ 全面屏手势操作
   */
  this.killCurrentApp = function () {
    if (_config.killAppWithGesture) {
      recents()
      sleep(1000)
      gesture(320, [240, 1000], [800, 1000])
    }
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

  /**
   * 设置当前脚本即将运行，防止被定时运行的打断
   */
  this.setReady = function (seconds) {
    let targetMillis = new Date().getTime() + (seconds + 5) * 1000
    storageFactory.updateValueByKey(READY, {
      engineId: ENGINE_ID,
      timeout: targetMillis
    })
    _logUtils.debugInfo(['设置当前脚本即将运行，id: {}, targetMillis: {}', ENGINE_ID, targetMillis])
  }

  /**
   * 校验是否有同脚本运行中，如果有则等待一定时间避免抢占前台
   */
  this.checkAnyReadyAndSleep = function () {
    let readyInfo = storageFactory.getValueByKey(READY, true)
    if (readyInfo.engineId > 0) {
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
          this.listenDelayStart()
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
   * 将当日运行时数据导出
   */
  this.exportRuntimeStorage = function () {
    let runtimeStorageInfo = {
      storageName: RUNTIME_STORAGE,
      storeList: []
    }
    let runtimeStorages = storages.create(RUNTIME_STORAGE)
    this.keyList.forEach(key => {
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

  this.requestScreenCaptureOrRestart = function (doNotRestart) {
    if (_config.has_screen_capture_permission) {
      return true
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
        // 设置五分钟后再次尝试，一般是因为横屏状态下导致的
        this.setUpAutoStart(5)
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
    if (this.inSkipList(currentRunningPackage)) {
      _logUtils.warnInfo('当前包名在应用白名单中，延迟5分钟执行', true)
      // 保存当前白名单跳过的次数，如果无视包名则直接传入常量
      this.saveSkipedPackageInfo(_config.warn_skipped_ignore_package ? 'SKIP_IF_WHITE_PACKAGE' : currentRunningPackage)
      if (!this.askIfStartWhenSkipedTooMuch()) {
        this.setUpAutoStart(5)
        _config.forceStop = true
        exit()
      }
    } else {
      // 用于清空统计
      this.saveSkipedPackageInfo('')
    }
  }

  this.myCurrentPackage = function () {
    return currentPackage()
  }

  this.inLimitTimeRange = () => false

  /**
   * 减少控制台日志数量，避免内存泄露，仅免费版有用
   */
  this.reduceConsoleLogs = function () {
    if (!_config.is_pro) {
      let consoleImpl = org.autojs.autojs.autojs.AutoJs.getInstance().getGlobalConsole()
      let logList = consoleImpl.getAllLogs()
      _logUtils.debugInfo(['当前日志列表长度： {}', logList.size()])
      let maximumSize = _config.console_log_maximum_size || 1500
      if (logList.size() > maximumSize) {
        try {
          let size = logList.size()
          let tempList = new java.util.ArrayList(logList).subList(size - maximumSize, size)
          consoleImpl.clear()
          logList.addAll(tempList)
        } catch (e) {
          // 可能存在多线程异常，没法持有锁没办法处理，直接吃掉异常。
        }
      }
    }
  }

  this.delayIfBatteryLow = function () {
    let battery = device.getBattery()
    if (!device.isCharging() && battery < _config.battery_keep_threshold) {
      _logUtils.debugInfo(['当前电量低，延迟一小时后启动，电量值：{} 启动阈值>={}', battery, _config.battery_keep_threshold])
      this.setUpAutoStart(60)
      exit()
    }
  }
}

CommonFunctions.prototype.initStorageFactory = () => {}

module.exports = CommonFunctions