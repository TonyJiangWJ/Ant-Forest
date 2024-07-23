
let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, global)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let pwd = files.cwd()
runningQueueDispatcher.showDispatchStatus()
runningQueueDispatcher.clearAll()
let task1 = pwd + '/Task1.js'
let task2 = pwd + '/Task2.js'
let task3 = pwd + '/Task3.js'

let count = 10
while (count-- >0) {
  runningQueueDispatcher.executeTargetScript(task1, { taskNumber: '1' })
  runningQueueDispatcher.executeTargetScript(task2, { taskNumber: '2' })
  runningQueueDispatcher.executeTargetScript(task3, { taskNumber: '3' })
}

runningQueueDispatcher.showDispatchStatus()
