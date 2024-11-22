let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let unlocker = require('../lib/Unlock.js')
let commonFunctions = singletonRequire('CommonFunction')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let mainScriptPath = FileUtils.getRealMainScriptPath(true)
runningQueueDispatcher.addRunningTask()
// 需要提前解锁 如果佛系模式下 需要将当前脚本加入定时任务 避免丢失参数
unlocker.exec()
unlocker.saveNeedRelock()
commonFunctions.showCommonDialogAndWait('神奇海洋收垃圾好友垃圾')
let source = mainScriptPath + "/unit/神奇海洋收集.js"
// 提前加入任务队列
runningQueueDispatcher.doAddRunningTask({ source: source })
engines.execScriptFile(source, {
  path: mainScriptPath + "/unit/", arguments: {
    executeByDispatcher: true,
    triggerImmediately: true,
    find_friend_trash: true,
    collect_reward: true,
    // 提前解锁，传递原始亮度信息
    last_brightness_mode: config.last_brightness_mode,
    last_brightness: config.last_brightness,
    change_auto_start: engines.myEngine().getSource() + ''
  }
})
setTimeout(() => { exit() }, 5000)