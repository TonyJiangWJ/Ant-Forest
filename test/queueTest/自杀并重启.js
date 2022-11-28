let singletonRequire = require('../../lib/SingletonRequirer.js')(runtime, global)
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let commonFunctions = singletonRequire('CommonFunction')
let lockableStorages = singletonRequire('LockableStorage')
let storage = lockableStorages.create('selfKiller')

runningQueueDispatcher.addRunningTask()
runningQueueDispatcher.showDispatchStatus()

if (storage.get('FLAG') == null) {
  storage.put('FLAG', true)
  java.lang.System.exit(0)
} else {
  storage.put('FLAG', null)
}
log('self killer start')
let count = 15
while (count-- > 0) {
  let content = 'Self killer Running count:' + count
  commonFunctions.showMiniFloaty(content, 700 - count * 10, 700 - count * 10, '#00FF00')
  sleep(1000)
}
log('self killer end')
runningQueueDispatcher.showDispatchStatus()
runningQueueDispatcher.removeRunningTask()