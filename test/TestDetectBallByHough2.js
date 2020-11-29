/*
 * @Author: TonyJiangWJ
 * @Date: 2020-09-23 23:56:10
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-17 22:18:25
 * @Description: 
 */

let { config } = require('../config.js')(runtime, this)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, this)
let OpenCvUtil = require('../lib/OpenCvUtil.js')
commonFunction.autoSetUpBangOffset()
let offset = config.bang_offset

config.show_debug_log = true
requestScreenCapture(false)
var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(config.device_width, config.device_height)
window.setTouchable(false)

let SCALE_RATE = config.device_width / 1080
let cvt = (v) => parseInt(v * SCALE_RATE)
let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let birthTime = new Date().getTime()
let flag = 1
let clickPoints = []
let findBalls = []
let lock = threads.lock()
let condition = lock.newCondition()
let inCapture = false
let detectRegion = [config.tree_collect_left, config.tree_collect_top - cvt(80), config.tree_collect_width, config.tree_collect_height + cvt(80)]
let dailyOrNightMedian = null
let param1 = 30
let param2 = 30
let cost = 0
let detectThread = threads.start(function () {
  automator.click = () => { }
  while (true) {
    if (new Date().getTime() - birthTime > 500) {
      inCapture = true
      sleep(200)
      clickPoints = []
      findBalls = []
      log('set find balls to empty')
      try {
        let screen = captureScreen()
        if (screen) {
          let rgbImg = images.copy(screen, true)
          let dayOrNightImg = images.clip(rgbImg, config.tree_collect_left, config.tree_collect_top, 40, 40)
          dailyOrNightMedian = OpenCvUtil.getMedian(dayOrNightImg)
          screen = images.medianBlur(screen, 5)
          let grayImgInfo = images.grayscale(screen)
          let start = new Date().getTime()
          findBalls = images.findCircles(
            grayImgInfo,
            {
              param1: param1,
              param2: param2,
              minRadius: cvt(65),
              maxRadius: cvt(75),
              minDst: cvt(100),
              // region: detectRegion
            }
          )
          cost = new Date().getTime() - start
          if (findBalls && findBalls.length > 0) {
            findBalls.forEach(b => {
              let region = [b.x - cvt(40), b.y + cvt(70), cvt(60), cvt(30)]
              try {
                commonFunction.ensureRegionInScreen(region)
                if (rgbImg.getMat().dims() >= 2) {
                  // let clipImg = images.clip(rgbImg, b.x - cvt(30), b.y, cvt(60), cvt(30))
                  let clipImg = images.clip(rgbImg, b.x - cvt(30), b.y + cvt(35), cvt(60), cvt(20))
                  let clipGrayImg = images.clip(grayImgInfo, b.x - cvt(30), b.y + cvt(35), cvt(60), cvt(20))
                  let avgHsv = OpenCvUtil.getHistAverage(clipImg)
                  // clipImg = images.clip(rgbImg, b.x - cvt(30), b.y + cvt(35), cvt(60), cvt(20))
                  let median = OpenCvUtil.getMedian(clipImg)
                  let standardDevication = OpenCvUtil.getStandardDeviation(clipGrayImg)
                  clipImg = images.clip(rgbImg, b.x - cvt(40), b.y + cvt(80), cvt(80), cvt(20))
                  clipGrayImg = images.clip(grayImgInfo, b.x - cvt(40), b.y + cvt(80), cvt(80), cvt(20))
                  let medianBottom = OpenCvUtil.getMedian(clipImg)
                  let avgBottom = OpenCvUtil.getHistAverage(clipImg)
                  let standardDevicationBottom = OpenCvUtil.getStandardDeviation(clipGrayImg)
                  clickPoints.push({
                    ball: b, 
                    median: median, 
                    avg: avgHsv,
                    avgBottom: avgBottom,
                    medianBottom: medianBottom,
                    std: standardDevication, stdBottom: standardDevicationBottom
                  })
                } else {
                  debugInfo(['mat dims is smaller then two, rgb: {}', rgbImg.getMat().dims()])
                }
              } catch (e) {
                errorInfo('线程执行异常：' + e)
                commonFunction.printExceptionStack(e)
              }
            })
            let sortedResult = clickPoints.map(v => {
              let { std, stdBottom, ball, medianBottom } = v
              return { x: ball.x, y: ball.y, std: std.toFixed(2), stdBottom: stdBottom.toFixed(2), medianBottom: medianBottom.toFixed(2) }
            }).sort((a, b) => a.x > b.x ? 1 : -1)
            log('findBalls: ', JSON.stringify(findBalls))
            log('clickPoints: ' + JSON.stringify(sortedResult))
            log('std infos: ' + JSON.stringify(sortedResult.map(v => {
              let { std, stdBottom, medianBottom } = v
              return [std, stdBottom, medianBottom]
            })))
          }
          rgbImg.recycle()
        }
      } catch (e) {
        commonFunction.printExceptionStack(e)
      }
      birthTime = new Date().getTime()
      inCapture = false
    }
    sleep(300)
  }
})
// 防止崩溃
function exitAndClean () {
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
    window = null
  }
  if (detectThread) {
    detectThread.interrupt()
    detectThread = null
  }
  resourceMonitor.releaseAll()
  exit()
}

commonFunction.registerOnEngineRemoved(function () {
  resourceMonitor.releaseAll()
})

window.canvas.on("draw", function (canvas) {
  // try {
  // 清空内容
  canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR);
  try {
    lock.lock()
    condition.signal()
    lock.unlock()
  } catch (e) { }

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
  drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 200 }, canvas, paint)
  drawText('收集自身能量：' + (flag === 1 ? '是' : '否'), { x: 100, y: 400 }, canvas, paint)
  drawText('白天或黑夜校验色：' + dailyOrNightMedian, { x: 100, y: 500 }, canvas, paint)
  if (!inCapture) {
    drawRectAndText('能量球有效区域', detectRegion, '#808080', canvas, paint)
    if (findBalls && findBalls.length > 0) {
      drawText("找到的球数: " + findBalls.length, { x: 100, y: 380 }, canvas, paint, '#00ff00')

      paint.setTextSize(20)
      drawText("params: " + param1 + ', ' + param2 + ' cost:' + cost, { x: 100, y: 420 }, canvas, paint, '#00ff00')
      // canvas.drawImage(grayImgInfo, 0, 0, paint)
      findBalls.forEach(b => {
        let region = [b.x - 40, b.y + 70, 60, 50]
        drawRectAndText('', region, '#808080', canvas, paint)
        drawText(b.radius.toFixed(2), { x: b.x, y: b.y }, canvas, paint)
        paint.setStrokeWidth(3)
        paint.setStyle(Paint.Style.STROKE)
        canvas.drawCircle(b.x, b.y + offset, b.radius, paint)
      })
    } else {
      drawText("未找到球: " + findBalls.length, { x: 100, y: 380 }, canvas, paint, '#00ff00')
    }

    //******* */
    if (clickPoints && clickPoints.length > 0) {
      drawText("可点击数: " + clickPoints.length, { x: 100, y: 450 }, canvas, paint, '#00ff00')
      log('找到的球？' + JSON.stringify(findBalls))
      clickPoints.forEach((s) => {
        let b = s.ball
        drawRectAndText('', [b.x - cvt(30), b.y + cvt(35), cvt(60), cvt(20)], '#808080', canvas, paint)
        // drawRectAndText('', [b.x - cvt(30), b.y, cvt(60), cvt(30)], '#999999', canvas, paint)
        drawRectAndText('', [b.x - cvt(40), b.y + cvt(80), cvt(80), cvt(20)], '#808080', canvas, paint)
        drawRectAndText(s.median +/*  ';' + s.avg.toFixed(2) +  */';' + s.std.toFixed(2), [b.x - cvt(30), b.y + cvt(35), 4, 4], s.stdBottom <= 30 ? '#00ff00' : '#000000', canvas, paint)
        drawRectAndText(s.medianBottom +/*  ';' + s.avgBottom.toFixed(2) +  */';' + s.stdBottom.toFixed(2), [b.x - cvt(40), b.y + cvt(80), 4, 4], s.stdBottom <= 30 || s.medianBottom > (dailyOrNightMedian < 100 ? 80 : 180) ? '#ff9800' : '#000000', canvas, paint)
      })
    }
  }
  passwindow = new Date().getTime() - startTime

  if (passwindow > 1000) {
    // console.verbose('可点击点：' + JSON.stringify(clickPoints))
    startTime = new Date().getTime()
    // console.verbose('关闭倒计时：' + countdown.toFixed(2))
  }

  // drawCoordinateAxis(canvas, paint)
  converted = true
  // } catch (e) {
  //   toastLog(e)
  //   exitAndClean()
  // }
});

let lastChangedTime = new Date().getTime()
threads.start(function () {
  toastLog('按音量上键关闭，音量下切换')
  events.observeKey()
  events.on("key_down", function (keyCode, event) {
    if (keyCode === 24) {
      exitAndClean()
    } else if (keyCode === 25) {
      // 设置最低间隔200毫秒，避免修改太快
      if (new Date().getTime() - lastChangedTime > 200) {
        flag = (flag + 1) % 2
        if (flag === 1) {
          detectRegion = [config.tree_collect_left, config.tree_collect_top - cvt(80), config.tree_collect_width, config.tree_collect_height + cvt(80)]
        } else {
          detectRegion = [config.tree_collect_left, config.tree_collect_top, config.tree_collect_width, config.tree_collect_height]
        }
      }
    }

  })
})

setTimeout(function () { exitAndClean() }, 120000)




function convertArrayToRect (a) {
  // origin array left top width height
  // left top right bottom
  return new android.graphics.Rect(a[0], a[1] + offset, (a[0] + a[2]), (a[1] + offset + a[3]))
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
  canvas.drawText(desc, position[0], position[1] + offset, paint)
  paint.setTextSize(10)
  paint.setStrokeWidth(1)
  paint.setARGB(255, 0, 0, 0)
  // let center = getRectCenter(position)
  // canvas.drawText(getPositionDesc(position), center.x, center.y, paint)
}

function drawText (text, position, canvas, paint, colorStr) {
  if (colorStr) {
    let color = colors.parseColor(colorStr)
    paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
  } else {
    paint.setARGB(255, 0, 0, 255)
  }
  paint.setStrokeWidth(1)
  paint.setStyle(Paint.Style.FILL)
  canvas.drawText(text, position.x, position.y + offset, paint)
}

function drawCoordinateAxis (canvas, paint) {
  let width = canvas.width
  let height = canvas.height
  paint.setStyle(Paint.Style.FILL)
  paint.setTextSize(10)
  let colorVal = colors.parseColor('#65f4fb')
  paint.setARGB(255, colorVal >> 16 & 0xFF, colorVal >> 8 & 0xFF, colorVal & 0xFF)
  for (let x = 50; x < width; x += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(x, x, 10 + offset, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(x, 0, x + offset, height, paint)
  }

  for (let y = 50; y < height; y += 50) {
    paint.setStrokeWidth(0)
    canvas.drawText(y, 0, y + offset, paint)
    paint.setStrokeWidth(0.5)
    canvas.drawLine(0, y + offset, width, y + offset, paint)
  }
}


function checkCaptureScreenPermission (errorLimit) {
  errorLimit = errorLimit || 3
  // 获取截图 用于判断是否可收取
  let screen = null
  let errorCount = 0
  let start = new Date().getTime()
  do {
    commonFunction.waitFor(function () {
      let max_try = 10
      while (!screen && max_try-- > 0) {
        screen = captureScreen()
      }
    }, config.capture_waiting_time || 500)
    if (!screen) {
      debugInfo('获取截图失败 再试一次 count:' + (++errorCount))
    }
  } while (!screen && errorCount < errorLimit)
  if (!screen) {
    errorInfo(['获取截图失败多次[{}], 可能已经没有了截图权限，重新执行脚本', errorCount], true)
    requestScreenCapture()
  }
  debugInfo(['获取截图耗时：{}ms', new Date().getTime() - start])
  return screen
}