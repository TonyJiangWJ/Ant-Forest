/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-29 14:44:49
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-10-19 17:52:05
 * @Description: 
 */
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let widgetUtils = singletonRequire('WidgetUtils')
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
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


floatyInstance.setFloatyInfo({ x: parseInt(config.device_width / 2.7), y: parseInt(config.device_height / 2) }, '即将开始分析', { textSize: 20 })
sleep(1000)
let limit = 3
while (limit > 0) {
  floatyInstance.setFloatyText('倒计时' + limit-- + '秒')
  sleep(1000)
}
floatyInstance.setFloatyText('正在分析中...')


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
sleep(1000)
floatyInstance.close()
if (uiObjectInfoList) {
  let timeCost = new Date().getTime() - start
  let total = uiObjectInfoList.length
  let logInfoList = uiObjectInfoList.filter(v => v && v.hasUsableInfo()).map(v => v.toString())
  // let content = removeMinPrefix(logInfoList).join('\n')
  let content = logInfoList.join('\n')
  logUtils.infoLog('\n' + content)
  logUtils.logInfo('布局层次结果已经保存到logs/info.log')
  dialogs.build({
    title: '布局分析结果',
    content: commonFunctions.formatString("总分析耗时：{}ms 总控件数：{}\n{}", timeCost, total, content),
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