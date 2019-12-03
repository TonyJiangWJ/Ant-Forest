let runningQueueDispatcher = require('../lib/RunningQueueDispatcher.js')

runningQueueDispatcher.showDispatchStatus()
runningQueueDispatcher.addRunningTask()
sleep(500)
runningQueueDispatcher.showDispatchStatus()
runningQueueDispatcher.addRunningTask()
sleep(500)
runningQueueDispatcher.showDispatchStatus()
runningQueueDispatcher.removeRunningTask()
sleep(500)
runningQueueDispatcher.showDispatchStatus()
// runningQueueDispatcher.clearAll()

