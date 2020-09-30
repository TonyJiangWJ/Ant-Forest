/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-12 20:33:18
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-09-27 14:11:21
 * @Description: 
 */
let resolver = require('../lib/AutoJSRemoveDexResolver.js')
resolver()
runtime.loadDex('../lib/color-region-center.dex')
importClass(com.tony.ColorCenterCalculatorWithInterval)
importClass(com.tony.ScriptLogger)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
resolver()

let { config: _config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile } = singletonRequire('LogUtils')
require('../lib/ResourceMonitor.js')(runtime, this)
let numberUtil = require('../lib/MockNumberOcrUtil.js')
_config.show_debug_log = true
_config.develop_mode = true
requestScreenCapture(false)

let SCRIPT_LOGGER = new ScriptLogger({
  log: function (message) {
    logInfo(message)
  },
  debug: function (message) {
    debugInfo(message)
  },
  error: function (message) {
    errorInfo(message)
  }
})


function Countdown () {
  this.start = new Date().getTime()
  this.getCost = function () {
    return new Date().getTime() - this.start
  }

  this.summary = function (content) {
    debugInfo(content + ' 耗时' + this.getCost() + 'ms')
  }

  this.restart = function () {
    this.start = new Date().getTime()
  }

}

function CollectDetect () {

  this.threadPool = null
  this.min_countdown_pixels = 10
  this.resolved_pixels = {}
  this.last_check_point = null
  this.last_check_color = null
  const SCALE_RATE = _config.device_width / 1080
  const checkPoints = []
  for (let i = 0; i < 30 * SCALE_RATE; i++) {
    for (let j = 0; j < 30 * SCALE_RATE; j++) {
      if (i == j)
        checkPoints.push([i, j, "#ffffff"])
    }
  }
  for (let i = 20; i < 30 * SCALE_RATE; i++) {
    for (let j = 30; j > 20 * SCALE_RATE; j--) {
      if (i - 20 === (30 - j)) {
        checkPoints.push([i, j, "#ffffff"])
      }
    }
  }

  this.init = function () {
    this.createNewThreadPool()
  }


  this.createNewThreadPool = function () {
    this.threadPool = new ThreadPoolExecutor(_config.thread_pool_size || 4, _config.thread_pool_max_size || 8, 60,
      TimeUnit.SECONDS, new LinkedBlockingQueue(_config.thread_pool_queue_size || 256),
      new ThreadFactory({
        newThread: function (runnable) {
          let thread = Executors.defaultThreadFactory().newThread(runnable)
          thread.setName(_config.thread_name_prefix + ENGINE_ID + '-mock-detect-' + thread.getName())
          return thread
        }
      })
    )
    let self = this
    _commonFunctions.registerOnEngineRemoved(function () {
      self.destory()
    }, 'shutdown mockdetect thread pool')
  }

  /**
   * 目前可能存在误判 帮收和可收 移除和帮收比较接近的可收点
   */
  this.sortAndReduce = function (points, gap) {
    let scaleRate = _config.device_width / 1080
    gap = gap || 100 * scaleRate
    debugInfo(['reduce gap: {}', gap])
    let lastY = -gap - 1
    let lastIsHelp = false
    let resultPoints = []
    if (points && points.length > 0) {
      points.sort((pd1, pd2) => {
        let p1 = pd1.point
        let p2 = pd2.point
        if (p1.y > p2.y) {
          return 1
        } else if (p1.y < p2.y) {
          return -1
        } else {
          return 0
        }
      }).forEach(pointData => {
        let point = pointData.point
        if (point.y - lastY > gap) {
          resultPoints.push(pointData)
          lastY = point.y
          lastIsHelp = pointData.isHelp
        } else {
          if (lastIsHelp || !pointData.isHelp) {
            // 距离过近的丢弃
            debugInfo(['丢弃距离较上一个:{} 比较近的：{}', lastY, JSON.stringify(pointData)])
          } else {
            // 上一个点非帮助 且当前点为帮助点 丢弃上一个点
            let dropLast = resultPoints.splice(resultPoints.length - 1)
            debugInfo(['丢弃上一个距离比较近的非帮助点：{}', JSON.stringify(dropLast)])
            resultPoints.push(pointData)
            lastY = point.y
            lastIsHelp = pointData.isHelp
          }
        }
      })
      debugInfo('重新分析后的点：' + JSON.stringify(resultPoints))
    }
    return resultPoints
  }

  this.destory = function () {
    if (this.threadPool !== null) {
      this.threadPool.shutdown()
      debugInfo(['等待mockDetect线程池关闭, 结果: {}', this.threadPool.awaitTermination(5, TimeUnit.SECONDS)])
      this.threadPool = null
    }
  }

  this.checkIsCanCollect = function (img, point) {

    let height = point.bottom - point.top
    let width = point.right - point.left
    debugInfo(['checkPoints: {}', JSON.stringify(checkPoints)])
    let p = images.findMultiColors(img, "#ffffff", checkPoints, {
      region: [
        point.left + width - width / Math.sqrt(2),
        point.top,
        width / Math.sqrt(2),
        height / Math.sqrt(2)
      ],
      threshold: 0
    })

    let flag = p !== null
    debugInfo(['point: {} 判定结果：{} {}', JSON.stringify(point), flag, JSON.stringify(p)])
    return flag
  }

  this.collecting = function () {
    let screen = null
    let grayScreen = null
    let intervalScreenForDetectCollect = null
    let intervalScreenForDetectHelp = null
    screen = captureScreen()
    // 重新复制一份
    grayScreen = images.grayscale(images.copy(screen))
    let originScreen = images.copy(screen, true)
    intervalScreenForDetectCollect = images.medianBlur(images.interval(grayScreen, '#828282', 1), 5)
    intervalScreenForDetectHelp = images.medianBlur(images.interval(images.copy(screen), _config.can_help_color || '#f99236', _config.color_offset), 5)
    let countdown = new Countdown()
    let waitForCheckPoints = []

    let helpPoints = this.detectHelp(intervalScreenForDetectHelp)
    if (helpPoints && helpPoints.length > 0) {
      waitForCheckPoints = waitForCheckPoints.concat(helpPoints.map(
        helpPoint => {
          return {
            isHelp: true,
            point: helpPoint
          }
        })
      )
    }

    let collectPoints = this.detectCollect(intervalScreenForDetectCollect)
    if (collectPoints && collectPoints.length > 0) {
      waitForCheckPoints = waitForCheckPoints.concat(collectPoints.map(
        collectPoint => {
          return {
            isHelp: false,
            point: collectPoint
          }
        })
      )
    }
    waitForCheckPoints = this.sortAndReduce(waitForCheckPoints)
    countdown.summary('获取可帮助和可能可收取的点')
    if (waitForCheckPoints.length > 0) {
      if (!_config.help_friend) {
        waitForCheckPoints = waitForCheckPoints.filter(p => !p.isHelp)
        debugInfo(['移除帮助收取的点之后：{}', JSON.stringify(waitForCheckPoints)])
      }
      countdown.restart()
      let countdownLatch = new CountDownLatch(waitForCheckPoints.length)
      let listWriteLock = threads.lock()
      let collectOrHelpList = []
      let countdownList = []
      let that = this
      waitForCheckPoints.forEach(pointData => {
        if (pointData.isHelp) {
          this.threadPool.execute(function () {
            let calculator = new ColorCenterCalculatorWithInterval(
              images.copy(intervalScreenForDetectHelp), _config.device_width - parseInt(200 * SCALE_RATE), pointData.point.x, pointData.point.y
            )
            calculator.setScriptLogger(SCRIPT_LOGGER)
            let point = calculator.getCenterPoint()
            debugInfo('可帮助收取位置：' + JSON.stringify(point))
            listWriteLock.lock()
            collectOrHelpList.push({
              point: point,
              isHelp: true
            })
            countdownLatch.countDown()
            listWriteLock.unlock()
            calculator = null
          })
        } else {
          this.threadPool.execute(function () {
            let calculator = new ColorCenterCalculatorWithInterval(
              images.copy(intervalScreenForDetectCollect), _config.device_width - parseInt(200 * SCALE_RATE), pointData.point.x, pointData.point.y
            )
            calculator.setScriptLogger(SCRIPT_LOGGER)
            let point = calculator.getCenterPoint()
            try {
              if (that.checkIsCanCollect(images.copy(originScreen), point)) {
                debugInfo('判定可收取位置：' + JSON.stringify(point))
                listWriteLock.lock()
                collectOrHelpList.push({ point: point, isHelp: false })
                countdownLatch.countDown()
                listWriteLock.unlock()
              } else {
                let height = point.bottom - point.top
                let width = point.right - point.left
                let countdownImg = images.clip(
                  images.copy(originScreen),
                  point.left + width - width / Math.sqrt(2),
                  point.top,
                  width / Math.sqrt(2),
                  height / Math.sqrt(2)
                )
                let num = numberUtil.doRecognize(countdownImg)
                debugInfo('倒计时中：' + JSON.stringify(point) + ' 像素点总数：' + point.regionSame + ' 倒计时值：' + num)
                // 直接标记执行完毕 将OCR请求交给异步处理
                listWriteLock.lock()
                countdownList.push({ point: point, isCountdown: true, num: num })
                countdownLatch.countDown()
                listWriteLock.unlock()
              }
            } catch (e) {
              errorInfo('发生异常：' + e)
            }
            calculator = null
          })
        }
      })
      // 等待五秒
      if (!countdownLatch.await(_config.thread_pool_waiting_time || 5, TimeUnit.SECONDS)) {
        let activeCount = this.threadPool.getActiveCount()
        errorInfo('有线程执行失败 运行中的线程数：' + activeCount)
        if (activeCount > 0) {
          debugInfo('将线程池关闭然后重建线程池')
          this.threadPool.shutdown()
          debugInfo(['强制关闭mockDetect线程池，等待线程池关闭, 结果: {}', this.threadPool.awaitTermination(5, TimeUnit.SECONDS)])
          this.createNewThreadPool()
        }
      }
      originScreen.recycle()
      countdown.summary('分析所有可帮助和可收取的点')
      return collectOrHelpList.concat(countdownList)
    }
    return null
  }

  this.detectHelp = function (img) {
    let helpPoints = this.detectColors(img)
    debugInfo('可帮助的点：' + JSON.stringify(helpPoints))
    return helpPoints
  }

  this.detectCollect = function (img) {
    let collectPoints = this.detectColors(img)
    debugInfo('可能可收取的点：' + JSON.stringify(collectPoints))
    return collectPoints
  }

  this.detectColors = function (img) {
    let use_img = images.copy(img)
    let movingY = parseInt(180 * SCALE_RATE)
    let movingX = parseInt(100 * SCALE_RATE)
    debugInfo(['moving window size: [{},{}]', movingX, movingY])
    // 预留70左右的高度
    let endY = _config.device_height - movingY - 70 * SCALE_RATE
    let runningY = 440 * SCALE_RATE
    let startX = _config.device_width - movingX
    let regionWindow = []
    let findColorPoints = []
    let countdown = new Countdown()
    let hasNext = true
    do {
      if (runningY > endY) {
        runningY = endY
        hasNext = false
      }
      regionWindow = [startX, runningY, movingX, movingY]
      debugForDev('检测区域：' + JSON.stringify(regionWindow))
      let point = images.findColor(use_img, '#FFFFFF', {
        region: regionWindow
      })
      if (_config.develop_mode) {
        countdown.summary('检测初始点')
      }
      if (point) {
        findColorPoints.push(point)
      }
      runningY += movingY
      countdown.restart()
    } while (hasNext)
    return findColorPoints
  }
}



var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(1080, 2160)
window.setTouchable(false)

// function convertArrayToRect (a) {
//   // origin array left top width height
//   // left top right bottom
//   return new android.graphics.Rect(a[0], a[1], (a[0] + a[2]), (a[1] + a[3]))
// }
function convertArrayToRect (a) {
  return new android.graphics.Rect(a[0], a[1], a[2], a[3])
}

function getPositionDesc (position) {
  return position[0] + ', ' + position[1] + ' w:' + position[2] + ',h:' + position[3]
}

function getRectCenter (position) {
  return {
    x: parseInt(position[0] + position[2] / 2),
    y: parseInt(position[1] + position[3] / 2)
  }
}

function drawRectAndText (desc, position, colorStr, canvas, paint) {
  let color = colors.parseColor(colorStr)

  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.STROKE)
  // 反色
  paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
  canvas.drawRect(convertArrayToRect(position), paint)
  paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  paint.setStrokeWidth(1)
  paint.setTextSize(20)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(desc, position[0], position[1], paint)
  paint.setTextSize(10)
  paint.setStrokeWidth(1)
  paint.setARGB(255, 0, 0, 0)
  // let center = getRectCenter(position)
  // canvas.drawText(getPositionDesc(position), center.x, center.y, paint)
}

function drawText (text, position, canvas, paint) {
  paint.setARGB(255, 0, 0, 255)
  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(text, position.x, position.y, paint)
}

function drawCoordinateAxis (canvas, paint) {
  let width = canvas.width
  let height = canvas.height
  paint.setStyle(Paint.Style.FILL)
  paint.setTextSize(10)
  let colorVal = colors.parseColor('#888888')
  paint.setARGB(255, colorVal >> 16 & 0xFF, colorVal >> 8 & 0xFF, colorVal & 0xFF)
  for (let x = 50; x < width; x += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(x, x, 10, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(x, 0, x, height, paint)
  }

  for (let y = 50; y < height; y += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(y, 0, y, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(0, y, width, y, paint)
  }
}

function exitAndClean () {
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
  }
  exit()
}

let detect = new CollectDetect()
detect.init()
let points = null
setInterval(function () {
  points = detect.collecting()
}, 50)

let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let threshold = 0
let flag = 1

window.canvas.on("draw", function (canvas) {
  // try {
  // 清空内容
  canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR);
  var width = canvas.getWidth()
  var height = canvas.getHeight()
  if (!converted) {
    toastLog('画布大小：' + width + ', ' + height)
  }

  // let canvas = new com.stardust.autojs.core.graphics.ScriptCanvas(width, height)
  let Typeface = android.graphics.Typeface
  var paint = new Paint()
  paint.setStrokeWidth(1)
  paint.setTypeface(Typeface.DEFAULT_BOLD)
  paint.setTextAlign(Paint.Align.LEFT)
  paint.setAntiAlias(true)
  paint.setStrokeJoin(Paint.Join.ROUND)
  paint.setDither(true)
  paint.setTextSize(30)
  let countdown = (targetEndTime - new Date().getTime()) / 1000
  drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 100 }, canvas, paint)

  if (points && points.length > 0) {
    points.forEach(pointData => {
      let point = pointData.point
      if (pointData.isCountdown) {
        drawRectAndText('倒计时:' + pointData.num, [point.left - 10, point.top - 10, point.right + 10, point.bottom + 10], '#ff0000', canvas, paint)
      } else {
        drawRectAndText(pointData.isHelp ? '帮收' : '可收', [point.left - 10, point.top - 10, point.right + 10, point.bottom + 10], '#ff0000', canvas, paint)
      }
      drawText(point.same, { x: point.left, y: point.top - 30 }, canvas, paint)
    })
  }
  // if (new Date().getTime() - birthTime > 1500) {
  //   grayImgInfo = null
  //   helpGrayImg = null
  // }
  passwindow = new Date().getTime() - startTime

  if (passwindow > 1000) {
    startTime = new Date().getTime()
  }
  // drawCoordinateAxis(canvas, paint)
  converted = true
  // } finally {
  //   exitAndClean()
  // }
});

let lastChangedTime = new Date().getTime()
threads.start(function () {
  toastLog('按音量上键关闭，音量下切换')
  events.observeKey()
  events.on("key_down", function (keyCode, event) {
    if (keyCode === 24) {
      // 设置最低间隔200毫秒，避免修改太快
      exitAndClean()
    } else if (keyCode === 25) {
      // 设置最低间隔200毫秒，避免修改太快
      if (new Date().getTime() - lastChangedTime > 200) {
        flag = (flag + 1) % 2
      }
    }

    if (threshold < 0) {
      threshold = 0
    } else if (threshold > 255) {
      threshold = 255
    }
  })
})

setTimeout(function () { exitAndClean() }, 120000)
toastLog('done')