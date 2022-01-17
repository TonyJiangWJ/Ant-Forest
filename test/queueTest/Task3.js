/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-15 19:12:59
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-23 22:50:22
 * @Description: 
 */
let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, global)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let commonFunctions = singletonRequire('CommonFunction')

runningQueueDispatcher.addRunningTask()
runningQueueDispatcher.showDispatchStatus()
log('task3 start')
let count = 15
while (count-- > 0) {
  let content = 'Task3 Running count:' + count
  commonFunctions.showMiniFloaty(content, 400 - count * 10, 500 - count * 10, '#0000ff')
  sleep(1000)
}
log('task3 end')
runningQueueDispatcher.showDispatchStatus()
runningQueueDispatcher.removeRunningTask()