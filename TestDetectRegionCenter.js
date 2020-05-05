/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-04 14:35:59
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-05 11:33:43
 * @Description: 
 */


runtime.loadDex('./lib/autojs-tools.dex')
importClass(com.tony.BitCheck)
importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)

const Stack = function () {
  this.size = 0
  this.innerArray = []
  this.index = -1

  this.isEmpty = function () {
    return this.size === 0
  }

  this.push = function (val) {
    this.innerArray.push(val)
    this.index++
    this.size++
  }

  this.peek = function () {
    if (this.isEmpty()) {
      return null
    }
    return this.innerArray[this.index]
  }

  this.pop = function (val) {
    if (this.isEmpty()) {
      return null
    }
    this.size--
    return this.innerArray.splice(this.index--)[0]
  }

  this.print = function () {
    if (this.isEmpty()) {
      return
    }
    this.innerArray.forEach(val => {
      debugInfo(val)
    })
  }
}
let BIT_MAX_VAL = 2160 << 8 | 1080
function ColorRegionCenterCalculator (img, point, threshold) {
  // Java打包的位运算方式
  this.bitChecker = new BitCheck(BIT_MAX_VAL)

  // 在外部灰度化
  this.img = images.copy(img)
  this.color = img.getBitmap().getPixel(point.x, point.y) & 0xFFFFFF
  console.info('color:' + colors.toString(this.color))
  this.color = colors.parseColor('#cacaca')
  // this.color = color
  this.point = point
  this.threshold = threshold
  this.intervalImg = images.medianBlur(images.interval(this.img, colors.toString(this.color), this.threshold), 5)
  images.save(this.intervalImg, files.cwd() + '/interval.png')
  console.log(':::::' + colors.toString(this.intervalImg.getBitmap().getPixel(point.x, point.y)))
  console.log(':::::' + colors.toString(this.intervalImg.getBitmap().getPixel(point.x + 1, point.y + 1)))
  console.log(':::::' + (0xFFFFFF & this.intervalImg.getBitmap().getPixel(point.x, point.y)))
  console.log('::::: +1 ' + (0xFFFFFF & this.intervalImg.getBitmap().getPixel(point.x + 1, point.y + 1)))
  console.log(':::::' + (0xFFFFFF & colors.parseColor('#ffffff')))
  console.log(':::::' + (0xFFFFFF == (0xFFFFFF & this.intervalImg.getBitmap().getPixel(point.x, point.y))))
  // 回收原始图像
  img.recycle()

  /**
   * 获取所有同色区域的点集合
   */
  this.getAllColorRegionPoints = function () {
    let nearlyColorPoints = this.getNearlyNorecursion(this.point)
    nearlyColorPoints = nearlyColorPoints || []
    console.log('回收资源')
    // 回收图像资源
    this.img.recycle()
    this.intervalImg.recycle()
    console.log('回收资源完毕')
    return nearlyColorPoints
  }

  /**
   * 获取颜色中心点
   */
  this.getColorRegionCenter = function () {
    let maxX = -1
    let minX = 1080 + 10
    let maxY = -1
    let minY = 2160 + 10
    debugInfo(['准备获取[{}]的同色[{}]点区域', JSON.stringify(this.point), colors.toString(this.color)])
    let nearlyColorPoints = this.getAllColorRegionPoints()
    if (nearlyColorPoints && nearlyColorPoints.length > 0) {
      nearlyColorPoints.forEach((item, idx) => {
        if (maxX < item.x) {
          maxX = item.x
        }
        if (minX > item.x) {
          minX = item.x
        }
        if (maxY < item.y) {
          maxY = item.y
        }
        if (minY > item.y) {
          minY = item.y
        }
      })
      let center = {
        top: minY,
        bottom: maxY,
        left: minX,
        right: maxX,
        x: parseInt((maxX + minX) / 2),
        y: parseInt((maxY + minY) / 2),
        same: nearlyColorPoints.length
      }
      console.log('获取中心点位置为：' + JSON.stringify(center))
      return center
    } else {
      debugInfo(['没有找到同色点 原始位置：「{}」 颜色：「{}」', JSON.stringify(this.point), colors.toString(this.color)])
      return this.point
    }
  }


  this.isOutofScreen = function (point) {
    let width = 1080
    let height = 2160
    if (point.x >= width || point.x < 0 || point.y < 0 || point.y >= height) {
      return true
    }
    return false
  }

  this.getNearlyNorecursion = function (point) {
    let directs = [
      [0, -1],
      [0, 1],
      [1, 0],
      [-1, 0]
    ]
    let stack = new Stack()
    stack.push(point)
    let nearlyPoints = [point]
    this.isUncheckedBitJava(point)
    let step = 0
    let totalStart = new Date().getTime()
    while (!stack.isEmpty()) {
      let target = stack.peek()
      let allChecked = true
      for (let i = 0; i < 4; i++) {
        let direction = directs[i]
        let checkItem = this.getDirectionPoint(target, direction)
        if (!checkItem) {
          continue
        }
        step++
        allChecked = false
        // 二值化图片颜色比较
        if (this.intervalImg.getBitmap().getPixel(checkItem.x, checkItem.y) & 0xFFFFFF === 0xFFFFFF) {
          nearlyPoints.push(checkItem)
          stack.push(checkItem)
          console.log('same point:' + JSON.stringify(checkItem) + ' color:' + colors.toString(this.intervalImg.getBitmap().getPixel(checkItem.x, checkItem.y)))
        } else {
          console.log('diff point:' + JSON.stringify(checkItem) + ' color:' + colors.toString(this.intervalImg.getBitmap().getPixel(checkItem.x, checkItem.y)))
        }
      }
      if (allChecked) {
        stack.pop()
      }
    }
    debugInfo([
      '原始点：{} 颜色：{}, 找了多个点 总计步数：{} 总耗时：{}ms 同色点个数：{}',
      JSON.stringify(this.point), colors.toString(this.color), step,
      new Date().getTime() - totalStart, nearlyPoints.length
    ])
    return nearlyPoints
  }

  this.isUncheckedBitJava = function (point) {
    let x_start = 0
    if (point.x < x_start) {
      return false
    }
    return this.bitChecker.isUnchecked(point.y << 8 | (point.x - x_start))
  }

  this.getDirectionPoint = function (point, direct) {
    // debugInfo('准备获取附近节点:' + JSON.stringify(point))
    let nearPoint = {
      x: point.x + direct[0],
      y: point.y + direct[1]
    }
    if (this.isOutofScreen(nearPoint) || !this.isUncheckedBitJava(nearPoint)) {
      return null
    }
    return nearPoint
  }

}


let { config } = require('./config.js')(runtime, this)
let sRequire = require('./lib/SingletonRequirer.js')(runtime, this)
let automator = sRequire('Automator')
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let commonFunction = sRequire('CommonFunction')

config.show_debug_log = true
requestScreenCapture(false)
var window = floaty.rawWindow(
  <canvas id="canvas" layout_weight="1" />
);

window.setSize(1080, 2160)
window.setTouchable(false)

function convertArrayToRect (a) {
  // origin array left top width height
  // left top right bottom
  return new android.graphics.Rect(a[0], a[1], (a[0] + a[2]), (a[1] + a[3]))
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
  let colorVal = colors.parseColor('#65f4fb')
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


let converted = false
let startTime = new Date().getTime()
// 两分钟后自动关闭
let targetEndTime = startTime + 120000
let passwindow = 0
let grayImgInfo = null
let birthTime = new Date().getTime()
let threshold = 0
let flag = 1
let centerPoint = null

let detectRegion = [150, 500, 750, 350]
let helpGrayImg = null

threads.start(function () {
  while (grayImgInfo === null || centerPoint === null) {
    let screen = commonFunction.checkCaptureScreenPermission()
    if (screen) {
      grayImgInfo = images.grayscale(screen)
      if (grayImgInfo) {

        let intervalImg = images.medianBlur(images.interval(grayImgInfo, '#cacaca', 0), 5)
        let point = images.findColor(intervalImg, '#ffffff', { region: detectRegion, threshold: 0 })
        if (point) {
          console.log('找到了点：「' + JSON.stringify(point + '」color:' + colors.toString(intervalImg.getBitmap().getPixel(point.x, point.y))))
          images.save(screen, files.cwd() + '/origin.png')
          images.save(grayImgInfo, files.cwd() + '/gray.png')
          images.save(intervalImg, files.cwd() + '/out_interval.png')
          let centerCalculator = new ColorRegionCenterCalculator(grayImgInfo, {x: 370, y: 623 }, 0)
          centerPoint = centerCalculator.getColorRegionCenter()
        }
      }
      screen.recycle()
      birthTime = new Date().getTime()
    }
    sleep(1000)
  }
})

function exitAndClean () {
  if (window !== null) {
    window.canvas.removeAllListeners()
    toastLog('close in 1 seconds')
    sleep(1000)
    window.close()
  }
  exit()
}
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



  if (centerPoint) {
    drawRectAndText('', [centerPoint.x - 5, centerPoint.y - 5, 10, 10], '#00ff00', canvas, paint)
  }

  // if (new Date().getTime() - birthTime > 1500) {
  //   grayImgInfo = null
  //   helpGrayImg = null
  // }
  passwindow = new Date().getTime() - startTime

  if (passwindow > 1000) {
    startTime = new Date().getTime()
    // console.verbose('关闭倒计时：' + countdown.toFixed(2))
  }
  let o = 225
  for (let x = 150; x <= 775; x += 125) {
    let offset = x == 525 ? o : Math.abs(o -= 75)
    if (offset == 75) {
      offset = 90
    }
    drawRectAndText('' + offset, [x, 500 + offset, 125, 350 - offset], '#00ff00', canvas, paint)
  }
  drawCoordinateAxis(canvas, paint)
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