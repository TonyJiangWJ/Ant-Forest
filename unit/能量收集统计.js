let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let WidgetUtils = singletonRequire('WidgetUtils')
let commonFunctions = singletonRequire('CommonFunction')
let { config } = require('../config.js')
let automator = singletonRequire('Automator')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo
} = singletonRequire('LogUtils')
const PACKAGE_NAME = 'com.eg.android.AlipayGphone'
const START_DATA = 'alipays://platformapi/startapp?appId=60000002'

// 进入蚂蚁森林主页
const startApp = function (packageName, startData, action) {
  logInfo('启动应用' + packageName)
  app.startActivity({
    action: action || 'VIEW',
    data: startData,
    packageName: packageName
  })
}

const checkFriends = function () {
  WidgetUtils.homePageWaiting()
  automator.enterFriendList()
  WidgetUtils.friendListWaiting()
  let lastCheckFriend = -1
  let friendListLength = -2
  debugInfo('加载好友列表')
  WidgetUtils.loadFriendList()
  if (!WidgetUtils.friendListWaiting()) {
    errorInfo('崩了 当前不在好友列表 重新开始')
    return false
  }
  commonFunctions.addOpenPlacehold("<<<<>>>>")
  let queue = commonFunctions.createQueue(3)
  do {
    sleep(50)
    WidgetUtils.waitRankListStable()
    let screen = captureScreen()
    debugInfo('获取好友列表')
    let friends_list = WidgetUtils.getFriendListParent()
    debugInfo('判断好友信息')
    if (friends_list && friends_list.children) {
      friendListLength = friends_list.children().length
      debugInfo(
        '读取好友列表完成 列表长度:' + friendListLength
      )
      friends_list.children().forEach(function (fri, idx) {
        if (fri.visibleToUser()) {
          if (fri.childCount() >= 3) {
            let bounds = fri.bounds()
            let fh = bounds.bottom - bounds.top
            if (fh > 10 && idx >= lastCheckFriend) {
              // 进入好友首页并记录数据
              collectTargetFriend(fri)
              // 记录最后一个校验的下标索引, 也就是最后出现在视野中的
              lastCheckFriend = idx + 1
            } else {
              debugInfo('不在视野范围' + idx + ' name:' + WidgetUtils.getFriendsName(fri))
            }
          } else {
            debugInfo('不符合好友列表条件 childCount:' + fri.childCount() + ' index:' + idx)
          }
        }
      })
    } else {
      logInfo('好友列表不存在')
    }
    if (!WidgetUtils.friendListWaiting()) {
      errorInfo('崩了 当前不在好友列表 重新开始')
      return false
    }
    debugInfo('收集数据完成 last:' + lastCheckFriend + '，下滑进入下一页')
    automator.scrollDown(50)
    debugInfo('进入下一页')
    commonFunctions.pushQueue(queue, 3, lastCheckFriend)
  } while (
    lastCheckFriend < friendListLength && commonFunctions.getQueueDistinctSize(queue) > 1
  )
  commonFunctions.addClosePlacehold(">>>><<<<")
  logInfo('全部好友数据收集完成, last:' + lastCheckFriend + ' length:' + friendListLength)
}


const collectTargetFriend = function (fri) {
  let startPoint = new Date()
  let name = WidgetUtils.getFriendsName(fri)
  if (name == 'TonyJiang') {
    logInfo('跳过自身', true)
    return
  }
  if (fri.child(2).desc() === '邀请' || fri.child(2).text() === '邀请') {
    logInfo('需要邀请好友:' + name)
    return
  }
  let obj = {
    name: name,
    target: fri.bounds()
  }
  //automator.click(obj.target.centerX(), obj.target.centerY())
  debugInfo('等待进入好友主页：' + name)
  let restartLoop = false
  let count = 1
  automator.click(obj.target.centerX(), obj.target.centerY())
  ///sleep(1000)
  while (!WidgetUtils.friendHomeWaiting()) {
    warnInfo(
      '未能进入' + name + '主页，尝试再次进入 count:' + count++
    )
    automator.click(obj.target.centerX(), obj.target.centerY())
    sleep(1000)
    if (count > 5) {
      warnInfo('重试超过5次，取消操作')
      restartLoop = true
      break
    }
  }
  if (restartLoop) {
    errorInfo('页面流程出错，重新开始')
    return false
  }

  if (WidgetUtils.widgetCheck('加为好友|返回我的森林', 200)) {
    errorInfo(name + ' TA已经把你删啦')
    // return
  } else {
    debugInfo('准备开始统计')
    let preGot
    let preE
    try {
      preGot = WidgetUtils.getYouCollectEnergy() || 0
      preE = WidgetUtils.getFriendEnergy()
      commonFunctions.recordFriendCollectInfo({
        friendName: name,
        friendEnergy: preE,
        postCollect: preGot,
        preCollect: preGot,
        helpCollect: 0
      })
    } catch (e) {
      errorInfo("[" + obj.name + "]获取收集能量异常" + e)
    }
  }

  automator.back()
  debugInfo('好友能量数据收集完毕, 回到好友排行榜')
  logInfo('统计用时：' + (new Date() - startPoint) + 'ms')
  let returnCount = 0
  while (!WidgetUtils.friendListWaiting()) {
    sleep(1000)
    if (returnCount++ === 2) {
      // 等待两秒后再次触发
      automator.back()
    }
    if (returnCount > 5) {
      errorInfo('返回好友排行榜失败，重新开始')
      return false
    }
  }
}
// 检查手机是否开启无障碍服务
try {
  auto.waitFor()
} catch (e) {
  warnInfo('auto.waitFor()不可用')
  auto()
}
// 请求截图权限
if (!requestScreenCapture()) {
  errorInfo('请求截图失败')
  exit()
} else {
  logInfo('请求截图权限成功')
}
startApp(PACKAGE_NAME, START_DATA)
checkFriends()
commonFunctions.showCollectSummary()
toastLog('done')
automator.clickClose()
home()