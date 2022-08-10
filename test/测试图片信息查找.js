/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-17 22:14:39
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-08-10 23:48:48
 * @Description: 
 */
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
let { config } = require('../config.js')(runtime, global)
let offset = config.bang_offset
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let { debugInfo, errorInfo, warnInfo, logInfo, infoLog } = singletonRequire('LogUtils')
let WidgetUtil = singletonRequire('WidgetUtils')
let commonFunction = singletonRequire('CommonFunction')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let hasScreenPermission = false
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
threads.start(function () {
  if (!commonFunction.requestScreenCaptureOrRestart(true)) {
    toast("请求截图失败")
    exit()
  }
  hasScreenPermission = true
})
var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(config.device_width, config.device_height)
window.setTouchable(false)

let testImg = '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'
testImg = images.fromBase64(testImg)
let tmpImg = images.resize(testImg, [parseInt(testImg.width * 0.7), parseInt(testImg.height * 0.7)])
testImg = images.toBase64(tmpImg)
let imageFinderThreadPool = new ThreadPoolExecutor(4, 4, 60,
  TimeUnit.SECONDS, new LinkedBlockingQueue(16),
  new ThreadFactory({
    newThread: function (runnable) {
      let thread = Executors.defaultThreadFactory().newThread(runnable)
      thread.setName('image-finder-' + thread.getName())
      return thread
    }
  })
)
let strollRegion = null
let waterCooperationRegion = null
let wateringRegion = null
let rewardRegion = null
let backpackRegion = null
let rewardForPlantRegion = null
let testRegion = null
let running = true, capturing = true
function getRegionByImg (screen, imgBase64, desc) {
  if (!imgBase64) {
    return null
  }
  let imagePoint = OpenCvUtil.findByGrayBase64(screen, imgBase64)
  if (!imagePoint) {
    imagePoint = OpenCvUtil.findBySIFTGrayBase64(screen, imgBase64) 
  }
  if (imagePoint) {
    let region = [
      imagePoint.left, imagePoint.top,
      imagePoint.width(), imagePoint.height()
    ]
    debugInfo(['重新生成{}按钮区域：{}', desc, JSON.stringify(region)])
    return region
  }
  return null
}


commonFunction.registerOnEngineRemoved(function () {
  running = false
  imageFinderThreadPool.shutdown()
  debugInfo(['等待线程池关闭:{}', imageFinderThreadPool.awaitTermination(5, TimeUnit.SECONDS)])
})


threads.start(function () {
  while (running) {
    if (!hasScreenPermission) {
      sleep(100)
      continue
    }
    capturing = true
    sleep(10)
    let screen = captureScreen()
    if (screen) {
      imageFinderThreadPool.execute(function () {
        strollRegion = getRegionByImg(screen, config.image_config.stroll_icon, '逛一逛')
      })
      imageFinderThreadPool.execute(function () {
        waterCooperationRegion = getRegionByImg(screen, config.image_config.watering_cooperation, '合种')
      })
      imageFinderThreadPool.execute(function () {
        wateringRegion = getRegionByImg(screen, config.image_config.water_icon, '浇水')
      })
      imageFinderThreadPool.execute(function () {
        rewardRegion = getRegionByImg(screen, config.image_config.sign_reward_icon, '奖励')
      })
      imageFinderThreadPool.execute(function () {
        backpackRegion = getRegionByImg(screen, config.image_config.backpack_icon, '背包')
      })
      imageFinderThreadPool.execute(function () {
        rewardForPlantRegion = getRegionByImg(screen, config.image_config.reward_for_plant, '种树奖励')
      })
      imageFinderThreadPool.execute(function () {
        testRegion = getRegionByImg(screen, testImg, '测试图片')
      })
    } else {
      warnInfo('获取截图失败', true)
    }
    capturing = false
    sleep(2000)
  }
})


let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let showAxis = false



window.canvas.on("draw", function (canvas) {
  try {
    // 清空内容
    canvas.drawColor(0xFFFFFF, android.graphics.PorterDuff.Mode.CLEAR);
    let width = canvas.getWidth()
    let height = canvas.getHeight()
    if (!converted) {
      toastLog('画布大小：' + width + ', ' + height)
    }

    // let canvas = new com.stardust.autojs.core.graphics.ScriptCanvas(width, height)
    let Typeface = android.graphics.Typeface
    let paint = new Paint()
    paint.setStrokeWidth(1)
    paint.setTypeface(Typeface.DEFAULT_BOLD)
    paint.setTextAlign(Paint.Align.LEFT)
    paint.setAntiAlias(true)
    paint.setStrokeJoin(Paint.Join.ROUND)
    paint.setDither(true)


    paint.setTextSize(30)
    let countdown = (targetEndTime - new Date().getTime()) / 1000
    drawText('关闭倒计时：' + countdown.toFixed(0) + 's', { x: 100, y: 300 }, canvas, paint)

    passwindow = new Date().getTime() - startTime

    if (passwindow > 1000) {
      startTime = new Date().getTime()
      console.verbose('关闭倒计时：' + countdown.toFixed(2))
    }
    if (!capturing) {
      displayRegionIfExists(strollRegion, '逛一逛', canvas, paint)
      displayRegionIfExists(waterCooperationRegion, '合种', canvas, paint)
      displayRegionIfExists(wateringRegion, '浇水', canvas, paint)
      displayRegionIfExists(rewardRegion, '奖励', canvas, paint)
      displayRegionIfExists(backpackRegion, '背包', canvas, paint)
      displayRegionIfExists(rewardForPlantRegion, '种树奖励', canvas, paint)
      displayRegionIfExists(testRegion, '测试图片', canvas, paint)
    }

    if (showAxis) {
      drawCoordinateAxis(canvas, paint)
    }
    converted = true
  } catch (e) {
    toastLog(e)
    exitAndClean()
  }
});

function displayRegionIfExists (region, desc, canvas, paint) {
  if (region && region.length === 4) {
    drawRectAndText(desc + '按钮区域', region, '#FF00FF', canvas, paint)
  }
}

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
        lastChangedTime = new Date().getTime()
        showAxis = !showAxis
      }
    }
  })
})

setTimeout(function () { exitAndClean() }, 120000)


// ========= canvas functions ==========

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

function drawText (text, position, canvas, paint) {
  paint.setARGB(255, 0, 0, 255)
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

function exitAndClean () {
  running = false
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
  }
  exit()
}