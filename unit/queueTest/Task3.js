let { runningQueueDispatcher } = require('../../lib/RunningQueueDispatcher.js')
let { commonFunctions } = require('../../lib/CommonFunction.js')

runningQueueDispatcher.addRunningTask()
let count = 15
while (count-- > 0) {
  let content = 'Task3 Running count:' + count
  log(content)
  commonFunctions.showMiniFloaty(content, 400 - count * 10, 500 - count * 10, '#0000ff')
  sleep(1000)
}
runningQueueDispatcher.removeRunningTask()