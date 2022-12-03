/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-29 14:44:49
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-12-01 11:19:05
 * @Description: https://github.com/TonyJiangWJ/AutoScriptBase
 */
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let FileUtils = singletonRequire('FileUtils')
let formatDate = require('../lib/DateUtil.js')
let workpath = FileUtils.getCurrentWorkPath()
runtime.loadDex(workpath + '/lib/autojs-common.dex')
importClass(com.tony.autojs.search.UiObjectTreeBuilder)

let args = engines.myEngine().execArgv
console.log('来源参数：' + JSON.stringify(args))
let inspectConfig = args || {}
if (typeof inspectConfig.save_data_js == 'undefined') {
  inspectConfig.save_data_js = true
}
if (typeof inspectConfig.save_img_js == 'undefined') {
  inspectConfig.save_img_js = true
}
if (typeof inspectConfig.save_history == 'undefined') {
  inspectConfig.save_history = true
}
commonFunctions.registerOnEngineRemoved(function () {
  logUtils.showCostingInfo()
}, 'logging cost')

// 检查手机是否开启无障碍服务
// 当无障碍经常莫名消失时  可以传递true 强制开启无障碍
// if (!commonFunctions.checkAccessibilityService(true)) {
if (!commonFunctions.ensureAccessibilityEnabled()) {
  toastLog('获取无障碍权限失败')
  exit()
}
if (inspectConfig.capture) {
  if (!requestScreenCapture()) {
    toastLog('请求截图权限失败')
    exit()
  }
}
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
while (limit > 0 && !inspectConfig.immediate) {
  floatyInstance.setFloatyText('倒计时' + limit-- + '秒')
  sleep(1000)
}

let imgBase64 = null
if (inspectConfig.capture) {
  floatyInstance.setFloatyText(' ')
  sleep(50)
  let screen = captureScreen()
  imgBase64 = images.toBase64(screen)
}
floatyInstance.setFloatyText('正在分析中...')
let windowRootsList = getWindowRoots()
// 最大深度
let maxDepth = -1
let treeNodeBuilder = new UiObjectTreeBuilder(runtime.getAccessibilityBridge())
let uiObjectInfoList = null
let start = new Date().getTime()
let nodeList = treeNodeBuilder.buildTreeNode()
logUtils.debugInfo(['获取总根节点数：{}', nodeList.size()])
if (nodeList.size() <= 0) {
  logUtils.warnInfo(['获取根节点失败 退出执行 请检查无障碍是否正常'], true)
  exit()
}
let root = nodeList.get(0)
let windowSummary = commonFunctions.formatString('获取总窗口数：{} 活动窗口包名：{}', windowRootsList.length, windowRootsList.filter(v => v.active)[0].packageName)
let rootSummary = commonFunctions.formatString('{}\n总根节点数：{} 当前展示第一个根节点的数据', windowSummary, nodeList.size())
if (root) {
  let rootObj = root.root
  let boundsInfo = rootObj.bounds()
  let content = rootObj.text() || rootObj.desc()
  let id = rootObj.id()
  let rootInfo = commonFunctions.formatString(
    'rootInfo id:{} content: {} bounds:[{}, {}, {}, {}]',
    id, content,
    boundsInfo.left, boundsInfo.top, boundsInfo.width(), boundsInfo.height()
  )
  rootSummary += '\n' + rootInfo
  logUtils.infoLog(rootInfo)
  let rawList = iterateAll(root).filter(v => v !== null)

  // 异步写入文件 用于后续分析
  threads.start(function () {
    let savePath = workpath + '/logs/uiobjects.json'
    let packageName = null
    // 过滤false和无效值 压缩json大小
    let content = JSON.stringify(rawList, (key, value) => {
      if (typeof value === 'undefined' || value === false) {
        return undefined
      }
      if (key == 'packageName') {
        if (packageName) {
          return undefined
        } else {
          packageName = value
        }
      }
      return value
    })
    files.write(savePath, content)
    if (inspectConfig.save_data_js) {
      files.write(workpath + '/logs/data.js', 'let objects = ' + content)
    }
    let hisPath = workpath + '/logs/hisUiObjects/' + formatDate(new Date(), 'yyyyMMdd/')
    let time = formatDate(new Date(), 'HHmmss')
    if (inspectConfig.save_history) {
      console.log('ensureDir?' + files.ensureDir(hisPath))
      files.write(hisPath + '/uiobjects.' + time + '.json', content)
      files.write(hisPath + '/data.' + time + '.js', 'let objects = ' + content)
    }
    if (inspectConfig.capture && imgBase64) {
      let base64Content = 'data:image/png;base64,' + imgBase64
      files.write(workpath + '/logs/img.log', base64Content)
      inspectConfig.save_history && files.write(hisPath + '/img.' + time + '.log', base64Content)
      if (inspectConfig.save_img_js) {
        let jsBase64 = 'let imageBase64=\'' + base64Content + '\''
        files.write(workpath + '/logs/img.js', jsBase64)
        inspectConfig.save_history && files.write(hisPath + '/img.' + time + '.js', jsBase64)
      }
    }
    toastLog('控件元数据已保存到：' + savePath)
  })
  let resultList = rawList.sort((a, b) => {
    let depth1 = getCompareDepth(a)
    let depth2 = getCompareDepth(b)
    logUtils.debugInfo(['depth1:{} depth2: {}', depth1, depth2])
    if (depth1 > depth2) {
      return 1
    } else if (depth1 === depth2) {
      return compareWithIndex(a, b)
    } else {
      return -1
    }
  })
  rootSummary += '\n控件最大深度：' + maxDepth
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
  // let logInfoList = uiObjectInfoList.filter(v => v && v.hasUsableInfo()).map(v => v.toString())
  let logInfoList = uiObjectInfoList.map(v => v.toString())
  // let content = removeMinPrefix(logInfoList).join('\n')
  let content = rootSummary + '\n' + logInfoList.join('\n')
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
function iterateAll (root, depth, index) {
  if (root.root == null) {
    return null
  }
  index = index || 0
  depth = depth || 0
  maxDepth = Math.max(maxDepth, depth)
  let uiObjectInfo = new UiObjectInfo(root.root, depth, index)
  logUtils.logInfo(uiObjectInfo.toString())
  if (root.getChildList().size() > 0) {
    return [uiObjectInfo].concat(runtime.bridges.bridges.toArray(root.getChildList()).map((child, index) => iterateAll(child, depth + 1, index)))
  } else {
    return [uiObjectInfo]
  }
}

function UiObjectInfo (uiObject, depth, index) {
  this.content = uiObject.text() || uiObject.desc() || ''
  this.isDesc = typeof uiObject.desc() !== 'undefined' && uiObject.desc() !== '' && uiObject.desc() != null
  this.id = uiObject.id()
  this.boundsInfo = uiObject.bounds()
  this.depth = depth
  this.index = index
  this.indexInParent = uiObject.indexInParent()
  this.visible = uiObject.visibleToUser()
  this.visibleToUser = uiObject.visibleToUser()
  this.clickable = uiObject.clickable()
  this.drawingOrder = uiObject.drawingOrder()
  this.className = uiObject.className()
  this.packageName = uiObject.packageName()
  this.mDepth = uiObject.depth()
  this.checkable = uiObject.checkable()
  this.checked = uiObject.checked()
  this.focusable = uiObject.focusable()
  this.focused = uiObject.focused()
  this.accessibilityFocused = uiObject.accessibilityFocused()
  this.selected = uiObject.selected()
  this.longClickable = uiObject.longClickable()
  this.enabled = uiObject.enabled()
  this.password = uiObject.password()
  this.scrollable = uiObject.scrollable()
  this.row = uiObject.row()
  this.column = uiObject.column()
  this.rowSpan = uiObject.rowSpan()
  this.columnSpan = uiObject.columnSpan()
  this.rowCount = uiObject.rowCount()
  this.columnCount = uiObject.columnCount()
  this.desc = uiObject.desc()
  this.text = uiObject.text()


  this.toString = function () {
    return commonFunctions.formatString(
      // ----[depth:index] id:[] [text/desc]content:[] bounds:[]
      '{}[{}:{}]visible:[{}]{}{}{}',
      new Array(this.depth + 1).join('-'), this.depth, this.index,
      this.visible,
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
        // if (data.id || data.content)
        return data.depth
      }
    }
  } else {
    return a.depth
  }
}

function compareWithIndex (a, b) {
  let idxA = getCompareIndex(a)
  let idxB = getCompareIndex(b)
  return idxA - idxB
}

function getCompareIndex (a) {
  if (a instanceof Array) {
    for (let i = 0; i < a.length; i++) {
      if (a[i] instanceof Array) {
        return getCompareIndex(a[i])
      } else {
        let data = a[i]
        // if (data.id || data.content)
        return data.indexInParent
      }
    }
  } else {
    return a.indexInParent
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

function getWindowRoots () {
  let windowInfoList = []
  let windows = runtime.accessibilityBridge.getService().getWindows()
  if (windows != null && windows.size() > 0) {
    logUtils.debugInfo('获取窗体数量：' + windows.size())
    let activeRootNode = null
    for (let i = 0; i < windows.size(); i++) {
      let window = windows.get(i)
      let root = window.getRoot()
      if (window.isActive()) {
        activeRootNode = root
        logUtils.debugInfo('活动的目标窗口：' + root.getPackageName())
        windowInfoList.push({ active: true, packageName: root.getPackageName(), findByWindows: true })
      } else {
        logUtils.debugInfo('非活动的窗口：' + (root != null ? root.getPackageName() : ''))
        windowInfoList.push({ active: false, packageName: (root != null ? root.getPackageName() : ''), findByWindows: true })
      }
    }
    // if (activeRootNode != null) {
    //   let uiObjectRoot = com.stardust.automator.UiObject.Companion.createRoot(activeRootNode)
    //   if (uiObjectRoot) {
    //     logUtils.debugInfo('获取uiObjectRoot成功')
    //     return uiObjectRoot
    //   }
    // }
  }
  let windowRoots = runtime.getAccessibilityBridge().windowRoots()
  if (windowRoots && windowRoots.size() > 0) {
    logUtils.debugInfo(['windowRoots size: {}', windowRoots.size()])
    for (let i = windowRoots.size() - 1; i >= 0; i--) {
      let root = windowRoots.get(i)
      if (root !== null && root.getPackageName()) {
        logUtils.debugInfo(['找到windowRoots index: {} packageName: {}', i, root.getPackageName()])
        windowInfoList.push({ active: true, packageName: root.getPackageName(), findByWindows: false })
      } else {
        logUtils.debugInfo(['找到windowRoots index: {} packageName: 未知', i])
        windowInfoList.push({ active: false, packageName: '', findByWindows: true })
      }
    }
  }
  return windowInfoList
}
