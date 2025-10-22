importClass(android.view.View)
let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(compareEngine => {
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop()
    }
  })
}

let { config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let args = config.parseExecArgv()
let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let widgetUtils = sRequire('WidgetUtils')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let FloatyInstance = sRequire('FloatyUtil')
let NotificationHelper = sRequire('Notification')
let LogFloaty = sRequire('LogFloaty')
let SimpleFloatyButton = require('../lib/FloatyButtonSimple.js')
let CanvasDrawer = require('../lib/CanvasDrawer')
let runningQueueDispatcher = sRequire('RunningQueueDispatcher')
runningQueueDispatcher.addRunningTask()
if (!FloatyInstance.init()) {
  toastLog('初始化悬浮窗失败')
  exit()
}
FloatyInstance.enableLog()
if (!commonFunction.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
config.show_debug_log = true
commonFunction.autoSetUpBangOffset(true)
let offset = config.bang_offset

let SCALE_RATE = config.scaleRate
let cvt = (v) => parseInt(v * SCALE_RATE)

let window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

ui.post(() => {
  window.setSize(config.device_width, config.device_height)
  window.setTouchable(false)
})


// 是否点击中
let clickRunning = false
let isRunning = true
let displayInfoZone = [config.device_width * 0.05, config.device_height * 0.65, config.device_width * 0.9, 150 * config.scaleRate]
let writeLock = threads.lock()
let waitStart = writeLock.newCondition()

let startX = config.speed_race_start_x || cvt(225)
let startY = config.speed_race_start_y || cvt(1275)
let clickGapHorizontal = config.speed_race_gap_horizontal || cvt(320)
let clickGapVertical = config.speed_race_gap_vertical || cvt(255)

LogFloaty.pushLog(`默认配置：${config.speed_race_start_x} ${config.speed_race_start_y} ${config.speed_race_gap_horizontal} ${config.speed_race_gap_vertical}`)
LogFloaty.pushLog(`初始配置：${startX} ${startY} ${clickGapHorizontal} ${clickGapVertical}`)
// 暴力点击的区域
let violentClickPoints = []
handleGapsChanged()
// 控制当前是开发调试还是正常模式，调试模式控制点击时间短于实际时间，将退出点击避免浪费机会。但需要人为控制结束
let VIOLENT_CLICK_TIME = 9

let startTimestamp = new Date().getTime()
let passedTime = 0

// 点击线程
let clickThread = threads.start(function () {
  let pressDuration = config.rain_press_duration || 7
  let sleepTime = 5 * pressDuration + 10
  sleepTime = sleepTime > 120 ? 120 : sleepTime
  while (isRunning) {
    writeLock.lock()
    try {
      if (!clickRunning) {
        LogFloaty.pushLog('等待开始点击')
        waitStart.await()
        LogFloaty.pushLog('开始暴力点击')
      }
    } finally {
      writeLock.unlock()
    }
    while (clickRunning) {
      passedTime = (new Date().getTime() - startTimestamp) / 1000
      // 暴力点击方式执行，当前点击持续时间小于等于设定时间继续点击，超过后便停止
      if (passedTime <= VIOLENT_CLICK_TIME) {
        violentClickPoints.forEach(p => press(p[0], p[1], pressDuration))
        sleep(sleepTime)
      } else {
        LogFloaty.pushLog('暴力点击完毕')
        clickRunning = false
        changeButtonInfo()
        sleep(1000)
      }
    }
  }
})

let clickButtons = new SimpleFloatyButton('clickBalls', [
  {
    id: 'changeStatus',
    text: '开始点击',
    onClick: function () {
      if (!clickRunning) {
        writeLock.lock()
        try {
          startTimestamp = new Date().getTime()
          clickRunning = true
          waitStart.signal()
        } finally {
          writeLock.unlock()
        }
      } else {
        clickRunning = false
      }
      changeButtonInfo()
    }
  },
  {
    id: 'changeClickPoint',
    text: '更改点击区域',
    onClick: function () {
      // 展示控制条
      if (config._show_seek_bar) {
        config._show_seek_bar = false
        // 保存数值
        config.overwrite('speed_race_start_x', startX)
        config.overwrite('speed_race_start_y', startY)
        config.overwrite('speed_race_gap_horizontal', clickGapHorizontal)
        config.overwrite('speed_race_gap_vertical', clickGapVertical)
      } else {
        config._show_seek_bar = true
      }
      ui.run(function () {
        changeSeekbarVisibility(config._show_seek_bar ? View.VISIBLE : View.GONE)
      })
      clickButtons.changeButtonText('changeClickPoint', config._show_seek_bar ? '确定并保存' : '更改点击区域')
    }
  }
], btns => {
  return `<horizontal>
    <vertical padding="1">
   ${btns.map(btn => {
    return `<vertical padding="1" id="${btn.id}_container"><button id="${btn.id}" text="${btn.text}" textSize="${btn.textSize ? btn.textSize : 12}sp" w="*" h="30" marginTop="5" marginBottom="5" /></vertical>`
  }).join('\n')
    }
    <seekbar id="zoomX" progress="{{startX}}" max="{{parseInt(config.device_width/2)}}" w="200" h="*"/>
    <seekbar id="zoomGapH" progress="{{clickGapHorizontal}}" max="{{parseInt(config.device_width/3)}}" w="*" h="*" />
    <seekbar id="zoomGapV" progress="{{clickGapVertical}}" max="{{parseInt(config.device_height/5)}}"  w="*" h="*" />
    </vertical>
    <vertical h="*" w="40">
      <seekbar id="zoomY" progress="{{startY}}" max="{{config.device_height}}" rotation="90" w="200" h="*" />
    </vertical>
  </horizontal>`
})
let clickButtonWindow = clickButtons.window

ui.run(function () {
  changeButtonInfo()
  clickButtonWindow.zoomY.setTranslationX(-(clickButtonWindow.zoomY.getWidth() / 2) + 40)
  clickButtonWindow.zoomX.setProgress(startX)
  clickButtonWindow.zoomY.setProgress(startY)
  clickButtonWindow.zoomGapH.setProgress(clickGapHorizontal)
  clickButtonWindow.zoomGapV.setProgress(clickGapVertical)
  // 首先隐藏控制条
  changeSeekbarVisibility(View.GONE)
})

function setupListener (id, valueHandler) {
  if (!clickButtonWindow[id]) {
    return
  }
  clickButtonWindow[id].setOnSeekBarChangeListener({
    onProgressChanged: function (seekbar, p, fromUser) {
      if (!fromUser) return
      valueHandler(Number(clickButtonWindow[id].getProgress().toString()))
      handleGapsChanged()
    }
  })
}
function changeVisibility (id, visibility) {
  if (!clickButtonWindow[id]) {
    return
  }
  clickButtonWindow[id].setVisibility(visibility)
}
function changeSeekbarVisibility (visibility) {
  changeVisibility('zoomX', visibility)
  changeVisibility('zoomY', visibility)
  changeVisibility('zoomGapH', visibility)
  changeVisibility('zoomGapV', visibility)
}
setupListener('zoomX', v => startX = v)
setupListener('zoomY', v => startY = v)
setupListener('zoomGapH', v => clickGapHorizontal = v)
setupListener('zoomGapV', v => clickGapVertical = v)
function handleGapsChanged () {
  violentClickPoints = []
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      violentClickPoints.push([startX + i * clickGapHorizontal, startY + j * clickGapVertical])
    }
  }
}
let drawer = null
window.canvas.on("draw", function (canvas) {
  if (!isRunning) {
    return
  }
  if (drawer == null) {
    drawer = new CanvasDrawer(canvas, null, config.bang_offset)
  }
  try {
    // 清空内容
    canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR)

    violentClickPoints.forEach(v => drawer.drawRectAndText('click', [v[0] - 5, v[1] - 5, 10, 10], '#ff0000'))

    // 倒计时
    drawer.drawText('首次使用请正确调整点击位置', { x: displayInfoZone[0], y: displayInfoZone[1] - 250 }, '#ff4800', 35)
    drawer.drawText('请进入赚能量界面后手动开始，音量上键可关闭脚本，音量下停止点击', { x: displayInfoZone[0], y: displayInfoZone[1] - 200 }, '#00ff00', 30)
    drawer.drawText('点击倒计时：' + (VIOLENT_CLICK_TIME - passedTime).toFixed(1) + 's', { x: displayInfoZone[0], y: displayInfoZone[1] - 100 }, '#00ff00', 30)
    drawer.drawText('如果无法点击，请见常见问题中的解决方案', { x: displayInfoZone[0], y: displayInfoZone[1] + 50 }, '#00ff00', 30)
  } catch (e) {
    commonFunction.printExceptionStack(e)
    exit()
  }
})

let lastChangedTime = new Date().getTime()
threads.start(function () {
  toastLog('按音量上键关闭，音量下切换模式')
  events.observeKey()
  events.on("key_down", function (keyCode, event) {
    if (keyCode === 24) {
      exit()
    } else if (keyCode === 25) {
      // 设置最低间隔200毫秒，避免修改太快
      if (new Date().getTime() - lastChangedTime > 200) {
        lastChangedTime = new Date().getTime()
        clickRunning = !clickRunning
        changeButtonInfo()
      }
    }
  })
})

// 保持运行
setInterval(function () { }, 1000)

commonFunction.registerOnEngineRemoved(function () {
  runningQueueDispatcher.removeRunningTask()
  isRunning = false
  clickThread.interrupt()
})

// ---------------------
function changeButtonInfo () {
  ui.post(() => {
    clickButtonWindow.changeStatus.setText(!clickRunning ? '点我开始！' : '音量下停止点击')
    clickButtons.changeButtonStyle('changeStatus', null, !clickRunning ? '#9ed900' : '#f36838')
    if (!clickRunning) {
      clickButtonWindow.setPosition(config.device_width / 2 - ~~(clickButtonWindow.getWidth() / 2), config.device_height * 0.15)
    }
  })
}
