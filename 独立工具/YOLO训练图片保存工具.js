let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
config.save_yolo_train_data = true
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let WarningFloaty = singletonRequire('WarningFloaty')
let LogFloaty = singletonRequire('LogFloaty')
let logUtils = singletonRequire('LogUtils')
let automator = singletonRequire('Automator')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog } = logUtils
let FloatyInstance = singletonRequire('FloatyUtil')
let yoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')
let unlocker = require('../lib/Unlock.js')

runningQueueDispatcher.addRunningTask()
let commons = new Commons()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  // 重置自动亮度
  config.resetBrightness && config.resetBrightness()
  if (config.auto_lock && unlocker.needRelock() === true) {
    logUtils.debugInfo('重新锁定屏幕')
    automator.lockScreen()
  }
  commons.recycle()
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, false,
    () => {
      // 保存是否需要重新锁屏
      unlocker.saveNeedRelock()
      config.isRunning = false
    }
  )
}, 'main')
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}


commonFunctions.requestScreenCaptureOrRestart()
commonFunctions.showCommonDialogAndWait('YOLO训练用图片保存')

let uiWindows = (() => {
  let buttons = [
    { id: 'saveImage', text: '保存图片' },
    { id: 'autoSaveImage', text: '保存100张' },
    { id: 'closeBtn', text: '退出' },
  ]

  return {
    clickButtonWindow: floaty.rawWindow(
      `<vertical>
      ${buttons.filter(v => !v.hide).map(btn => `<button id="${btn.id}" text="${btn.text}" textSize="6sp" w="50sp" h="30sp" margin="0" padding="5" />`).join('')}
      </vertical>`
    ),
  }
})()

// 操作按钮
let clickButtonWindow = uiWindows.clickButtonWindow

clickButtonWindow.closeBtn.setOnTouchListener(new TouchController(clickButtonWindow).createListener())

clickButtonWindow.saveImage.click(function () {
  commons.runInThread('保存图片', function () {
    yoloTrainHelper.saveImage(commonFunctions.captureScreen(), '图片保存工具', 'manual_save')
    LogFloaty.pushLog('图片已保存')
  })
})

clickButtonWindow.autoSaveImage.click(function () {
  if (commons.in_saving) {
    commons.in_saving = false
    return
  }
  device.keepScreenOn()
  commons.in_saving = true
  commons.runInThread('自动保存', function () {
    let limit = 100
    while (commons.in_saving && limit-- > 0) {
      yoloTrainHelper.saveImage(commonFunctions.captureScreen(), '图片保存工具', 'manual_save')
      changeUiText(clickButtonWindow, 'autoSaveImage', '剩余' + limit)
      sleep(2000)
    }
    commons.in_saving = false
    changeUiText(clickButtonWindow, 'autoSaveImage', '保存100张')
    device.cancelKeepingAwake()
  })
})

// 保持运行
setInterval(() => {}, 60000)

// -----inner functions----
/**
 * 触控拖动控制器
 * @param {uiobject} buttonWindow 
 */
function TouchController (buttonWindow) {
  this.eventStartX = null
  this.eventStartY = null
  this.windowStartX = buttonWindow.getX()
  this.windowStartY = buttonWindow.getY()
  this.eventKeep = false
  this.eventMoving = false
  this.touchDownTime = new Date().getTime()

  this.createListener = function () {
    let _this = this
    return new android.view.View.OnTouchListener((view, event) => {
      try {
        switch (event.getAction()) {
          case event.ACTION_DOWN:
            _this.eventStartX = event.getRawX();
            _this.eventStartY = event.getRawY();
            _this.windowStartX = buttonWindow.getX();
            _this.windowStartY = buttonWindow.getY();
            _this.eventKeep = true; //按下,开启计时
            _this.touchDownTime = new Date().getTime()
            break;
          case event.ACTION_MOVE:
            var sx = event.getRawX() - _this.eventStartX;
            var sy = event.getRawY() - _this.eventStartY;
            if (!_this.eventMoving && _this.eventKeep && getDistance(sx, sy) >= 10) {
              _this.eventMoving = true;
            }
            if (_this.eventMoving && _this.eventKeep) {
              ui.post(() => {
                buttonWindow.setPosition(_this.windowStartX + sx, _this.windowStartY + sy);
              })
            }
            break;
          case event.ACTION_UP:
            if (!_this.eventMoving && _this.eventKeep && _this.touchDownTime > new Date().getTime() - 1000) {
              // 时间短 点击事件
              if (_this.exiting) {
                logUtils.warnInfo('退出中，请勿重复触发', true)
                return
              }
              _this.exiting = true
              changeUiText(_this.buttonWindow, 'closeBtn', '退出中')
              exit()
            }
            _this.eventKeep = false;
            _this.touchDownTime = 0;
            _this.eventMoving = false;
            break;
        }
      } catch (e) {
        console.error('异常' + e)
      }
      return true;
    })
  }
}
/**
 * 变更ui控件文本
 * 
 * @param {*} window 
 * @param {*} widgetId 
 * @param {*} text 
 */
function changeUiText (window, widgetId, text) {
  ui.run(function () {
    window && window[widgetId] && window[widgetId].setText(text)
  })
}

function pushLog (str) {
  LogFloaty.pushLog(str)
}

function getDistance(dx, dy) {
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}

function Commons () {

  importClass(java.util.concurrent.LinkedBlockingQueue)
  importClass(java.util.concurrent.ThreadPoolExecutor)
  importClass(java.util.concurrent.TimeUnit)
  importClass(java.util.concurrent.ThreadFactory)
  importClass(java.util.concurrent.Executors)
  let operationLock = threads.lock()
  this.threadPool = new ThreadPoolExecutor(4, 4, 60,
    TimeUnit.SECONDS, new LinkedBlockingQueue(64),
    new ThreadFactory({
      newThread: function (runnable) {
        let thread = Executors.defaultThreadFactory().newThread(runnable)
        thread.setName('yolo-saver-' + thread.getName())
        return thread
      }
    })
  )

  this.runInThread = function (desc, successCallback, failCallback, final) {
    let locked = false
    this.threadPool.execute(this.wrapExecution(function () {
      if (!operationLock.tryLock()) {
        pushLog('其他线程执行中，请稍等')
        failCallback && failCallback()
        return
      }
      locked = true
      successCallback && successCallback()
    }, desc, () => {
      locked && operationLock.unlock()
      final && final()
    }))
  }

  this.wrapExecution = function (func, desc, final) {
    return function () {
      try {
        func()
      } catch (e) {
        console.error((desc || '') + '执行异常' + e)
        pushLog((desc || '') + '执行异常，请检查')
        pushLog('执行异常，请检查' + e)
        commonFunctions.printExceptionStack(e)
        pushLog('执行异常，请检查')
      } finally {
        final()
      }
    }
  }

  this.recycle = function () {
    this.threadPool.shutdown()
  }
}