let runningQueueDispatcher = require('../../lib/RunningQueueDispatcher.js')
let pwd = files.cwd()

let task1 = pwd + '/Task1.js'
let task2 = pwd + '/Task2.js'
let task3 = pwd + '/Task3.js'

runningQueueDispatcher.setUpAutoStart(task1, 1)
runningQueueDispatcher.setUpAutoStart(task2, 1)
runningQueueDispatcher.setUpAutoStart(task3, 1)

// 继续重复执行
runningQueueDispatcher.setUpAutoStart(task1, 1)
runningQueueDispatcher.setUpAutoStart(task2, 1)
runningQueueDispatcher.setUpAutoStart(task3, 1)