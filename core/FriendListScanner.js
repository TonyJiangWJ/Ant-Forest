/*
 * @Author: TonyJiangWJ
 * @Date: 2022-11-28 20:54:42
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-11-29 10:43:15
 * @Description: 控件识别倒计时信息
 */
importClass(com.tony.ColorCenterCalculatorWithInterval)
importClass(com.tony.ScriptLogger)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let BaiduOcrUtil = require('../lib/BaiduOcrUtil.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let OcrUtil = null
if (!_config.countdown_mock_ocr && localOcrUtil.enabled) {
  OcrUtil = wrapLocalOcrUtil(localOcrUtil)
}
if (_config.useBaiduOcr) {
  OcrUtil = BaiduOcrUtil
}
let useMockOcr = false
if (!OcrUtil) {
  OcrUtil = require('../lib/MockNumberOcrUtil.js')
  useMockOcr = true
}

function wrapLocalOcrUtil (localOcr) {
  return {
    getImageNumber: function (base64String) {
      let img = images.fromBase64(base64String)
      img = images.resize(img, [img.getWidth() * 2, img.getHeight() * 2])
      let recognizedText = (localOcr.recognize(img) || '').replace(/\n/g, '')
      let regex = /(\d+)/
      let result = regex.exec(recognizedText)
      if (result && result.length > 1) {
        return parseInt(result[1])
      }
      return null
    }
  }
}

let BaseScanner = require('./BaseScanner.js')
const FriendListScanner = function () {
  BaseScanner.call(this)
  this.threadPool = null

  this.has_next = true
  // 倒计时数据
  this.countingDownContainers = []

  let self = this
  this.init = function (option) {
    option = option || {}
    this.current_time = option.currentTime || 0
    this.increased_energy = option.increasedEnergy || 0
    // this.createNewThreadPool()
  }

  this.start = function () {
    this.min_countdown = 10000
    this.min_countdown_pixels = 10
    debugInfo('排行榜控件分析即将开始')
    sleep(200)
    return this.collectingCountdown()
  }

  this.destroy = function () {
    this.baseDestroy()
  }

  this.scrollUpIfNeeded = function () {
    debugInfo('向下滑动寻找 没有更多了')
    let limit = 10
    do {
      randomScrollDown()
      randomScrollDown()
      randomScrollDown()
    } while (!_widgetUtils.widgetChecking('.*没有更多了.*', { algorithm: 'PDFS', timeoutSetting: 1000 }) && limit-- > 0)
  }

  function randomScrollDown () {
    let duration = 100 + Math.random() * 1000 % 300
    let startY = ~~(Math.random() * _config.device_height * 0.85 % 200 + 50) * (Math.random() > 0.5 ? 1 : -1) + 1600
    let endY = ~~(Math.random() * _config.device_height * 0.85 % 200 + 50) * (Math.random() > 0.5 ? 1 : -1) + 400
    debugInfo(['滑动起始：{} 结束：{}', startY, endY])
    automator.gestureDown(startY, endY, duration)
    sleep(duration)
  }

  /**
   * 执行收集操作
   * 
   * @return { true } if failed
   * @return { minCountdown, lostSomeone } if successful
   */
  this.collectingCountdown = function () {
    this.scrollUpIfNeeded()
    debugInfo('准备获取倒计时控件信息 等待10秒')
    let countingDownWidgets = _widgetUtils.widgetGetAll('\\d+’', 10000, true, null, { algorithm: 'PDFS' })
    if (countingDownWidgets) {
      let isDesc = countingDownWidgets.isDesc
      let widgets = countingDownWidgets.target
      widgets.forEach(widget => {
        let content = isDesc ? widget.desc() : widget.text()
        debugInfo(['获取倒计时数据：{}', content])
        let countdown = content.match(/\d+/)
        if (countdown.length > 0) {
          countdown = parseInt(countdown[0])
        }
        if (isNaN(countdown)) {
          return
        }
        this.countingDownContainers.push({
          countdown: countdown,
        })
      })
    } else {
      debugInfo('未找到匹配的倒计时数据')
    }
    this.checkRunningCountdown()

    return this.getCollectResult()
  }


}

FriendListScanner.prototype = Object.create(BaseScanner.prototype)
FriendListScanner.prototype.constructor = FriendListScanner

/**
 * 校验倒计时数据
 * 如果在收集过程中有倒计时已结束，需要返回重新开始
 * 如果开启了merge_countdown_by_gaps需要将最小的N个倒计时统合 选择区间内的最大倒计时作为最小倒计时
 */
FriendListScanner.prototype.checkRunningCountdown = function () {
  if (!_config.is_cycle && this.countingDownContainers.length > 0) {
    debugInfo(['倒计时中的好友数[{}]', this.countingDownContainers.length])
    let that = this
    let countdownTimes = []
    this.countingDownContainers.forEach((item, idx) => {
      if (item.countdown <= 0) {
        return
      }
      let count = item.countdown
      debugInfo(['需要计时[{}]分', count])
      countdownTimes.push(count)
    })

    // 统计当前倒计时数据，如果配置了统合最近N分钟内的倒计时 将最小倒计时改为该区间内的最大倒计时
    let sortedList = countdownTimes.sort((a, b) => a - b)
    // 初始化max为最小值
    let max = min = sortedList[0]
    let maxIdx = 0
    if (_config.merge_countdown_by_gaps) {
      sortedList.forEach((time, idx) => {
        if (time - min <= _config.countdown_gaps) {
          max = time
          maxIdx = idx
        }
      })
      debugInfo(['当前最小倒计时为：{} 与它相近且间隔小于等于{}的有{}个, 采用倒计时：{}', min, _config.countdown_gaps, maxIdx, max])
    }
    this.min_countdown = max
  }
}
module.exports = FriendListScanner
