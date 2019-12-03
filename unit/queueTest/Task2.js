let runningQueueDispatcher = require('../../lib/RunningQueueDispatcher.js')
let commonFunctions = require('../../lib/CommonFunction.js')

runningQueueDispatcher.addRunningTask()
let count = 15
while (count-- > 0) {
  let content = 'Task2 Running count:' + count
  log(content)
  commonFunctions.showMiniFloaty(content, 500 - count * 10, 600 - count * 10, '#ff0000')
  sleep(1000)
}
runningQueueDispatcher.removeRunningTask()