let { config } = require('../config.js')(runtime, global)
config.buddha_like_mode = false
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile, flushAllLogs } = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
floatyInstance.enableLog()
let commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let TouchController = require('../lib/TouchController.js')
let AiUtil = require('../lib/AIRequestUtil.js')
let logFloaty = singletonRequire('LogFloaty')
logFloaty.fontSize = 30
let warningFloaty = singletonRequire('WarningFloaty')
config.debuging = true
let SCALE_RATE = config.scaleRate
let cvt = (v) => parseInt(v * SCALE_RATE)
config.not_lingering_float_window = true
config.sea_ball_region = config.sea_ball_region || [cvt(860), cvt(1350), cvt(140), cvt(160)]
logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()
let ai_type = config.ai_type || 'kimi'
let kimi_api_key = config.kimi_api_key
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  config.resetBrightness && config.resetBrightness()
  debugInfo('校验并移除已加载的dex')
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, false,
    () => {
      // 保存是否需要重新锁屏
      config.isRunning = false
    }
  )
}, 'main')

if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}


let executeArguments = engines.myEngine().execArgv
debugInfo(['启动参数：{}', JSON.stringify(executeArguments)])

commonFunctions.listenDelayStart()
importClass(android.graphics.drawable.GradientDrawable)
importClass(android.graphics.drawable.RippleDrawable)
importClass(android.content.res.ColorStateList)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
let threadPool = new ThreadPoolExecutor(2, 2, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(16),
  new ThreadFactory({
    newThread: function (runnable) {
      let thread = Executors.defaultThreadFactory().newThread(runnable)
      thread.setName('ai-operator-' + thread.getName())
      return thread
    }
  })
)
let data = {
  btnDrawables: {}
}
// 启动UI形式，支持手动执行更多功能
let btns = [
  {
    id: 'addLongText',
    text: '打印长文本',
    onClick: function () {
      logFloaty.pushLog('这是一条长文本：通过上述属性的组合使用，你可以创建出既美观又具有良好交互体验的按钮。记住，设计按钮时要保持整体界面风格的一致性，确保按钮的样式与应用的主题和设计语言相匹配。')
    }
  },
  {
    id: 'addShortText',
    text: '打印短文本',
    onClick: function () {
      logFloaty.pushLog('这是一条短文本')
    },
  },
  {
    id: 'exit',
    color: '#EB393C',
    rippleColor: '#C2292C',
    text: '退出脚本',
    onClick: function () {
      exit()
    }
  }
]

let window = floaty.rawWindow(
  `<horizontal>
    <vertical padding="1">
   ${btns.map(btn => {
    return `<vertical marginTop="5" marginBottom="5"><button id="${btn.id}" text="${btn.text}" textSize="${btn.textSize ? btn.textSize : 12}sp" w="*" h="30" /></vertical>`
  }).join('\n')
  }</vertical>
  </horizontal>`)
ui.run(() => {
  window.setPosition(config.device_width * 0.1, config.device_height * 0.5)
})
btns.forEach(btn => {
  ui.run(() => {
    setButtonStyle(btn.id, btn.color, btn.rippleColor)
  })
  if (btn.onClick) {
    window[btn.id].on('click', () => {
      if (data.clickExecuting) {
        threadPool.execute(function () {
          logFloaty.pushLog('点击执行中，请稍等')
        })
        return
      }
      data.clickExecuting = true
      threadPool.execute(function () {
        try {
          btn.onClick()
        } catch (e) {
          errorInfo(['点击执行异常：{}', e.message], true)
        } finally {
          data.clickExecuting = false
        }
      })
    })
  }
})
window.exit.setOnTouchListener(new TouchController(window, () => {
  exit()
}, () => {
  changeButtonStyle('exit', null, '#FF753A', '#FFE13A')
}, () => {
  changeButtonStyle('exit', (drawable) => {
    drawable.setColor(colors.parseColor('#EB393C'))
    drawable.setStroke(0, colors.parseColor('#3FBE7B'))
  })
}).createListener())

setInterval(() => {
  runningQueueDispatcher.renewalRunningTask()
}, 60000)

function setButtonStyle (btnId, color, rippleColor) {
  let shapeDrawable = new GradientDrawable();
  shapeDrawable.setShape(GradientDrawable.RECTANGLE);
  // 设置圆角大小，或者直接使用setCornerRadius方法
  // shapeDrawable.setCornerRadius(20); // 调整这里的数值来控制圆角的大小
  let radius = util.java.array('float', 8)
  for (let i = 0; i < 8; i++) {
    radius[i] = 20
  }
  shapeDrawable.setCornerRadii(radius); // 调整这里的数值来控制圆角的大小
  shapeDrawable.setColor(colors.parseColor(color || '#3FBE7B')); // 按钮的背景色
  shapeDrawable.setPadding(10, 10, 10, 10); // 调整这里的数值来控制按钮的内边距
  // shapeDrawable.setStroke(5, colors.parseColor('#FFEE00')); // 调整这里的数值来控制按钮的边框宽度和颜色
  data.btnDrawables[btnId] = shapeDrawable
  let btn = window[btnId]
  btn.setShadowLayer(10, 5, 5, colors.parseColor('#888888'))
  btn.setBackground(new RippleDrawable(ColorStateList.valueOf(colors.parseColor(rippleColor || '#27985C')), shapeDrawable, null))
}

function changeButtonStyle (btnId, handler, color, storkColor) {
  handler = handler || function (shapeDrawable) {
    color && shapeDrawable.setColor(colors.parseColor(color))
    storkColor && shapeDrawable.setStroke(5, colors.parseColor(storkColor))
  }
  handler(data.btnDrawables[btnId])
}