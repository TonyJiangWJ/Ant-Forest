/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-15 19:12:59
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-23 22:50:22
 * @Description: 
 */
let { config } = require('../../config.js')(runtime, global)
let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, global)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let commonFunctions = singletonRequire('CommonFunction')
let unlocker = require('../../lib/Unlock.js')

runningQueueDispatcher.addRunningTask()
unlocker.exec()
runningQueueDispatcher.showDispatchStatus()
let taskNumber = engines.myEngine().execArgv.taskNumber
log('task3 start, my taskNumber: ' + taskNumber)
let count = 15
while (count-- > 0) {
  let content = 'Task3 Running count:' + count
  commonFunctions.showMiniFloaty(content, 400 - count * 10, 500 - count * 10, '#0000ff')
  sleep(1000)
}
log('task3 end')
runningQueueDispatcher.showDispatchStatus()
runningQueueDispatcher.removeRunningTask()
exit()