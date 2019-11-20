let { runningQueueDispatcher } = require('../../lib/RunningQueueDispatcher.js')
let { commonFunctions } = require('../../lib/CommonFunction.js')

runningQueueDispatcher.addRunningTask()
let count = 15
while (count-- > 0) {
  let content = 'Task1 Running count:' + count
  log(content)
  commonFunctions.showMiniFloaty(content, 700 - count * 10, 700 - count * 10, '#00FF00')
  sleep(1000)
}
runningQueueDispatcher.removeRunningTask()