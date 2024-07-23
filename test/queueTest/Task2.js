let { config } = require('../../config.js')(runtime, global)
let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, global)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let commonFunctions = singletonRequire('CommonFunction')
let unlocker = require('../../lib/Unlock.js')

runningQueueDispatcher.addRunningTask()
unlocker.exec()
runningQueueDispatcher.showDispatchStatus()
let taskNumber = engines.myEngine().execArgv.taskNumber
log('task2 start, my taskNumber: ' + taskNumber)
let count = 15
while (count-- > 0) {
  let content = 'Task2 Running count:' + count
  commonFunctions.showMiniFloaty(content, 500 - count * 10, 600 - count * 10, '#ff0000')
  sleep(1000)
}
log('task2 end')
runningQueueDispatcher.showDispatchStatus()
runningQueueDispatcher.removeRunningTask()
exit()