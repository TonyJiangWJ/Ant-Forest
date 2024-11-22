
let { config: _config } = require('../config.js')(runtime, global)

let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)

let notification = singletonRequire('Notification')

notification.createNotification('有任务执行失败', '京东京豆执行失败，请检查', 2)
