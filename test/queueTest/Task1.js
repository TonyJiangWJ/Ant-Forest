let { config } = require('../../config.js')(runtime, global)
let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, global)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let commonFunctions = singletonRequire('CommonFunction')
let unlocker = require('../../lib/Unlock.js')

runningQueueDispatcher.addRunningTask()
unlocker.exec()
runningQueueDispatcher.showDispatchStatus()
let taskNumber = engines.myEngine().execArgv.taskNumber
log('task1 start, my taskNumber: ' + taskNumber)
let count = 15
while (count-- > 0) {
  let content = 'Task1 Running count:' + count
  commonFunctions.showMiniFloaty(content, 700 - count * 10, 700 - count * 10, '#00FF00')
  sleep(1000)
}
log('task1 end')
runningQueueDispatcher.showDispatchStatus()
runningQueueDispatcher.removeRunningTask()
exit()