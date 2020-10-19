/*
 * @Author: TonyJiangWJ
 * @Date: 2020-09-22 10:47:53
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-10-19 18:59:12
 * @Description: 
 */
let { config } = require('../config.js')(runtime, this)
config.show_debug_log = true
config.save_log_file = true
config.back_size = 1024

let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let widgetUtils = singletonRequire('WidgetUtils')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let unlocker = require('../lib/Unlock.js').unlocker
commonFunctions.registerOnEngineRemoved(function () {
  logUtils.showCostingInfo()
}, 'logging cost')
// 清空所有日志
logUtils.clearLogFile()
if (!floatyInstance.init()) {
  toast('创建悬浮窗失败')
  exit()
}

// 适配老代码
if (!floatyInstance.hasOwnProperty('setFloatyInfo')) {
  floatyInstance.setFloatyText = function (text) {
    this.setFloatyInfo(null, text, null)
  }

  floatyInstance.setPosition = function (x, y) {
    this.setFloatyInfo({ x: x, y: y }, null, null)
  }
}
floatyInstance.setFloatyInfo({ x: parseInt(config.device_width / 2.7), y: parseInt(config.device_height / 2) }, ' ', { textSize: 20 })
while (!unlocker.is_locked()) {
  let lock = threads.lock()
  let complete = lock.newCondition()
  let awaitDialog = dialogs.build({
    cancelable: false,
    negative: '取消',
    positive: '确定',
    title: '请手动锁屏',
    content: '请手动锁定屏幕，脚本将在点击确定5秒后开始识别\n短振动开始分析\n长振动后请解锁查看结果'
  })
    .on('negative', () => {
      exit()
    })
    .on('positive', () => {
      lock.lock()
      complete.signal()
      lock.unlock()
      awaitDialog.dismiss()
    })
    .show()
  lock.lock()
  complete.await()
  lock.unlock()
  let limit = 5
  while (limit > 0) {
    floatyInstance.setFloatyText('倒计时' + limit-- + '秒')
    sleep(1000)
  }
}

let fStart = new Date().getTime()
let contentData = []

floatyInstance.setFloatyInfo({ x: parseInt(config.device_width / 2.7), y: parseInt(config.device_height / 2) }, '即将开始分析', { textSize: 20 })
unlocker.wakeup()
contentData.push(analyzeLayout('锁屏界面'))
sleep(1000)
unlocker.swipe_layer()
sleep(1500)

sleep(150)
floatyInstance.setFloatyText('正在分析中...')

contentData.push(analyzeLayout('密码输入界面'))

logUtils.debugInfo('分析页面数：' + contentData.length)

let displayContent = '', total = 0
contentData.map(data => {
  total += data.total
  displayContent += '\n=================\n' + data.desc + ':\n' + '分析耗时：' + data.cost + 'ms\n'
    + '控件总数：' + data.total + '\n分析控件内容：\n' + data.content
})
let timeCost = new Date().getTime() - fStart
let logContents = commonFunctions.formatString("总分析耗时：{}ms 总控件数：{}\n{}", timeCost, total, displayContent)
logUtils.infoLog(logContents)
logUtils.flushAllLogs()
dialogs.build({
  title: '布局分析结果更多内容请查看logs/info.log',
  content: logContents,
  negative: '关闭',
  positive: '复制内容',
  negativeColor: 'red',
  cancelable: false
})
  .on('negative', () => {
    exit()
  })
  .on('positive', () => {
    setClip(content)
    toastLog('布局日志已复制到剪切板！')
  })
  .show()


sleep(1000)
device.vibrate(1000)
sleep(1000)
floatyInstance.close()

// ----------------

function analyzeLayout (desc) {
  device.vibrate(200)
  logUtils.debugInfo('开始分析：' + desc)

  let uiObjectInfoList = null
  let start = new Date().getTime()

  let any = widgetUtils.widgetGetOne(/.+/)
  if (any) {
    let root = getRootContainer(any)
    let boundsInfo = root.bounds()
    let content = root.text() || root.desc()
    let id = root.id()
    logUtils.logInfo([
      'rootInfo id:{} content: {} bounds:[{}, {}, {}, {}]',
      id, content,
      boundsInfo.left, boundsInfo.top, boundsInfo.width(), boundsInfo.height()
    ])

    let resultList = iterateAll(root).filter(v => v !== null).sort((a, b) => {
      let depth1 = getCompareDepth(a)
      let depth2 = getCompareDepth(b)
      logUtils.debugInfo(['depth1:{} depth2: {}', depth1, depth2])
      if (depth1 > depth2) {
        return 1
      } else if (depth1 === depth2) {
        return 0
      } else {
        return -1
      }
    })
    uiObjectInfoList = flatMap(flatArrayList, resultList)

    floatyInstance.setPosition(parseInt(config.device_width / 5), parseInt(config.device_height / 2))
    floatyInstance.setFloatyText('分析完成，请查看日志页面')
  } else {
    floatyInstance.setPosition(parseInt(config.device_width / 5), parseInt(config.device_height / 2))
    floatyInstance.setFloatyText('无法获取任何控件信息')
  }


  let cost = new Date().getTime() - start
  if (uiObjectInfoList) {
    let logInfoList = uiObjectInfoList.filter(v => v && v.hasUsableInfo()).map(v => v.toString())
    // let content = removeMinPrefix(logInfoList).join('\n')
    let content = logInfoList.join('\n')
    logUtils.debugInfo(['{} 分析耗时：{}ms', desc, cost])
    return { content: content, total: logInfoList.length, cost: cost, desc: desc }
  }
  return { desc: desc, content: '', total: 0, cost: cost }
}



function getRootContainer (target) {
  if (target === null) {
    logUtils.errorInfo("target为null 无法获取root节点", true)
  }
  if (target.parent() !== null) {
    return getRootContainer(target.parent())
  } else {
    return target
  }
}


function iterateAll (root, depth, index) {
  if (isEmpty(root)) {
    return null
  }
  index = index || 0
  depth = depth || 0
  let uiObjectInfo = new UiObjectInfo(root, depth, index)
  logUtils.logInfo(uiObjectInfo.toString())
  if (root.getChildCount() > 0) {
    return [uiObjectInfo].concat(root.children().map((child, index) => iterateAll(child, depth + 1, index)))
  } else {
    return uiObjectInfo
  }
}

function UiObjectInfo (uiObject, depth, index) {
  this.content = uiObject.text() || uiObject.desc() || ''
  this.isDesc = typeof uiObject.desc() !== 'undefined' && uiObject.desc() !== ''
  this.id = uiObject.id()
  this.boundsInfo = uiObject.bounds()
  this.depth = depth
  this.index = index


  this.toString = function () {
    return commonFunctions.formatString(
      // ----[depth:index] id:[] [text/desc]content:[] bounds:[]
      '{}[{}:{}]{}{}{}',
      new Array(this.depth + 1).join('-'), this.depth, this.index,
      this.isEmpty(this.id) ? '' : 'id:[' + this.id + ']',
      this.isEmpty(this.content) ? '' :
        commonFunctions.formatString(
          '[{}]content:[{}]',
          (this.isDesc ? 'desc' : 'text'), this.content
        ),
      this.hasUsableInfo() ? commonFunctions.formatString(
        'bounds:[{}, {}, {}, {}]',
        this.boundsInfo.left, this.boundsInfo.top,
        this.boundsInfo.width(), this.boundsInfo.height()
      ) : ''
    )
  }

  this.isEmpty = function (v) {
    return typeof v === 'undefined' || v === null || v === ''
  }

  this.hasUsableInfo = function () {
    return !(this.isEmpty(this.content) && this.isEmpty(this.id))
  }
}

function isEmpty (strOrList) {
  return typeof strOrList === 'undefined' || strOrList === null || strOrList === '' || strOrList.length === 0
}

function flatMap (f, list) {
  if (isEmpty(list)) return []
  return list.map(f).reduce((x, y) => x.concat(y), [])
}

/**
 * 将嵌套数组转换成单个数组
 * @param {*} a 
 */
function flatArrayList (a) {
  if (a instanceof UiObjectInfo) {
    return a
  } else {
    return flatMap(flatArrayList, a)
  }
}

function getCompareDepth (a) {
  if (a instanceof Array) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] instanceof Array) {
        return getCompareDepth(a[i])
      } else {
        let data = a[i]
        if (data.id || data.content)
          return data.depth
      }
    }
  } else {
    return a.depth
  }
}

function Queue (size) {
  this.size = size || 10
  this.pushTime = 0
  this.queue = []

  this.enqueue = function (val) {
    if (this.queue.length >= this.size) {
      this.queue.shift()
    }
    this.pushTime++
    this.queue.push(val)
  }

  this.dequeue = function () {
    return this.queue.shift()
  }

  this.peek = function () {
    return this.queue[0]
  }
}

function removeMinPrefix (list) {
  let min = 10000000
  let minQueue = new Queue(3)
  const regex = /^(-+)[^-]+$/
  let result = list.map(l => {
    if (regex.test(l)) {
      let prefixLength = regex.exec(l)[1].length
      if (prefixLength < min) {
        minQueue.enqueue(prefixLength)
        min = prefixLength
      }
    }
    return l
  }).map(l => l.substring(minQueue.peek()))
  return result
}
