// runtime.loadDex('../lib/autojs-common.dex')

// importClass(com.tony.autojs.common.ProcessMappedShare)
// // importClass(com.stardust.util.Callback)

// let waiting = true
// let subscriber = ProcessMappedShare.newSubscriber(files.cwd() + '/tmp.mm', 1024, runtime)
// subscriber.subscribe(new ProcessMappedShare.Callback({
//   call: function (str) {
//     toastLog('接收消息：' + str)
//     waiting = false
//   }
// }))

let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let processShare = singletonRequire('ProcessShare')
let waiting = true
processShare.subscribe(function (str) {
  toastLog('接收消息：' + str)
  waiting = false
})

while (waiting) {
  sleep(1000)
  log('等待消息中...')
}
log('结束等待')