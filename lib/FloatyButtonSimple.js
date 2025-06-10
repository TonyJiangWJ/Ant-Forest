
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let logFloaty = singletonRequire('LogFloaty')
let TouchController = require('./TouchController.js')
importClass(android.graphics.drawable.GradientDrawable)
importClass(android.graphics.drawable.RippleDrawable)
importClass(android.content.res.ColorStateList)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)

module.exports = SimpleFloatyButton

function SimpleFloatyButton (threadName, buttons) {
  let threadPool = new ThreadPoolExecutor(2, 2, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(16),
    new ThreadFactory({
      newThread: function (runnable) {
        let thread = Executors.defaultThreadFactory().newThread(runnable)
        thread.setName(threadName + '-' + thread.getName())
        return thread
      }
    })
  )

  let data = {
    _clickExecuting: false,
    set clickExecuting (val) {
      threadPool.execute(function () {
        if (val) {
          logFloaty.logQueue.push('点击执行中，请稍等', '#888888')
        } else {
          logFloaty.logQueue.push('执行完毕', '#888888')
        }
      })
      this._clickExecuting = val
    },
    get clickExecuting () {
      return this._clickExecuting
    },
    btnDrawables: {}
  }

  // 启动UI形式，支持手动执行更多功能
  let btns = buttons.concat([
    {
      id: 'exit',
      color: '#EB393C',
      rippleColor: '#C2292C',
      text: '退出脚本',
      onClick: function () {
        exit()
      }
    }
  ])

  let window = floaty.rawWindow(
    `<horizontal>
    <vertical padding="1">
   ${btns.map(btn => {
      return `<vertical padding="1" id="${btn.id}_container"><button id="${btn.id}" text="${btn.text}" textSize="${btn.textSize ? btn.textSize : 12}sp" w="*" h="30" marginTop="5" marginBottom="5" /></vertical>`
    }).join('\n')
    }</vertical>
  </horizontal>`)

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

  ui.run(() => {
    window.setPosition(config.device_width * 0.1, config.device_height * 0.5)
  })
  btns.forEach(btn => {
    ui.run(() => {
      if (typeof btn.render == 'function') {
        btn.render(window[btn.id])
      } else {
        if (btn.hide) {
          // 隐藏按钮
          window[btn.id + '_container'].setVisibility(8)
        }
        setButtonStyle(btn.id, btn.color, btn.rippleColor)
      }
    })
    if (btn.onClick) {
      window[btn.id].on('click', () => {
        // region 点击操作执行中，对于collect_friends触发终止，等待执行结束
        if (data.clickExecuting) {
          if (btn.handleExecuting) {
            btn.handleExecuting(data.executingBtn)
            return
          }
          threadPool.execute(function () {
            logFloaty.pushLog('点击执行中，请稍等')
          })
          return
        }
        data.clickExecuting = true
        data.executingBtn = btn.id
        // endregion
        threadPool.execute(function () {
          try {
            btn.onClick()
          } catch (e) {
            errorInfo(['点击执行异常：{} {}', e, e.message], true)
            commonFunctions.printExceptionStack(e)
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
    this.changeButtonStyle('exit', null, '#FF753A', '#FFE13A')
  }, () => {
    this.changeButtonStyle('exit', (drawable) => {
      drawable.setColor(colors.parseColor('#EB393C'))
      drawable.setStroke(0, colors.parseColor('#3FBE7B'))
    })
  }).createListener())


  this.changeButtonText = function (btnId, text) {
    ui.run(function () {
      if (!window[btnId]) {
        return
      }
      window[btnId].setText(text)
    })
  }

  this.changeButtonStyle = function (btnId, handler, color, storkColor) {
    handler = handler || function (shapeDrawable) {
      color && shapeDrawable.setColor(colors.parseColor(color))
      storkColor && shapeDrawable.setStroke(5, colors.parseColor(storkColor))
    }
    handler(data.btnDrawables[btnId])
  }

  this.window = window
  this.data = data
}
