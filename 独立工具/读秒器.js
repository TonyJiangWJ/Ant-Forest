
let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(engine => {
    let compareEngine = engine
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop()
    }
  })
}


let floatyWindow = floaty.rawWindow(
  <horizontal>
    <text id="colon" fontFamily="sans-serif-medium" typeface="normal" text=":" textSize="10dp"></text>
    <text id="time" fontFamily="sans-serif-medium" typeface="normal" textSize="12dp"></text>
  </horizontal>
)

let lock = threads.lock()
let condition = lock.newCondition()
let offsetCondition = lock.newCondition()
let currentSeconds = 0
let serverTimeOffset = 0
let needSyncTime = true
let showSecondsOnly = false
let initX = showSecondsOnly ? 270 : 10
let initY = showSecondsOnly ? -50 : -30
threads.start(function () {
  ui.post(() => {
    // 修改成实际的位置
    floatyWindow.setPosition(initX, initY)
    if (!showSecondsOnly) {
      floatyWindow.colon.setVisibility(android.view.View.GONE)
    }
  })
  while (true) {
    let offset = -1
    let start = new Date().getTime()
    if (needSyncTime) {
      http.get('https://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp', {}, (res, err) => {
        if (err) {
          console.error('请求异常', err)
          return
        }
        if (res.body) {
          lock.lock()
          try {
            let data = JSON.parse(res.body.string())
            console.verbose('result: ' + JSON.stringify(data))
            let timestamp = parseInt(data.data.t)
            let datetime = new Date(timestamp)
            if (showSecondsOnly) {
              let seconds = datetime.getSeconds() + Math.round(datetime.getMilliseconds() / 1000)
              currentSeconds = seconds
              ui.post(() => {
                floatyWindow.time.setText(paddingZero(seconds % 60))
              })
            } else {
              ui.post(() => {
                floatyWindow.time.setText(getTimeFormated(datetime))
              })
            }
            offset = datetime.getMilliseconds()
            needSyncTime = offset >= 50
            if (!needSyncTime) {
              let localTimestamp = new Date().getTime()
              let cost = localTimestamp - start
              // 计算本机和服务端时间差 服务端时间加上请求所消耗时间的一半 减去当前本机时间
              serverTimeOffset = timestamp + (cost / 2) - localTimestamp
              toastLog('已完成时间同步，同步精度：±' + (cost / 2).toFixed(2) + 'ms 时延' + (serverTimeOffset > 0 ? '慢' : '快') + (serverTimeOffset/1000).toFixed(2) + '秒')
            }
            offsetCondition.signal()
          } catch (e) {
            offsetCondition.signal()
            console.error('执行异常', e)
          } finally {
            lock.unlock()
          }
          // console.verbose('网络时间：', datetime.getHours() + ':' + datetime.getMinutes() + ':' + datetime.getSeconds() + '.' + datetime.getMilliseconds())
        }
      })
    }
    lock.lock()
    try {
      let awaitTime = 1000
      if (needSyncTime) {
        console.verbose('等待获取网络时间')
        offsetCondition.await(1000, java.util.concurrent.TimeUnit.MILLISECONDS)
        let cost = new Date().getTime() - start
        let awaitTime = 1000 - cost / 2 - offset
        if (awaitTime < 0) {
          awaitTime = 1000
        }
      } else {
        let serverDateTime = new Date(new Date().getTime() + serverTimeOffset)
        ui.post(() => {
          if (showSecondsOnly) {
            floatyWindow.time.setText(getSeconds(serverDateTime))
          } else {
            floatyWindow.time.setText(getTimeFormated(serverDateTime))
          }
        })
        awaitTime = 1000 - serverDateTime.getMilliseconds()
      }
      condition.await(awaitTime, java.util.concurrent.TimeUnit.MILLISECONDS)
    } finally {
      lock.unlock()
    }
  }
})

function paddingZero (seconds) {
  seconds += ''
  return new Array(2).join('0').substring(0, (2 - seconds.length)) + seconds
}

function getTimeFormated (datetime) {
  return paddingZero(datetime.getHours()) + ':' + paddingZero(datetime.getMinutes()) + ':' + paddingZero(datetime.getSeconds())
}

function getSeconds (datetime) {
  return paddingZero(datetime.getSeconds())
}



let offsets = [0, 5, -5]
setInterval(() => {
  // 随机切换位置 保护脆弱的oled
  ui.post(() => {
    floatyWindow.setPosition(initX + offsets[Math.ceil(Math.random() * 1000) % 3], initY + offsets[Math.ceil(Math.random() * 1000) % 3])
  })
}, 20000)