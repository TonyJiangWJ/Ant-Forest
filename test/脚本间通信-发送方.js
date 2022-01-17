// runtime.loadDex('../lib/autojs-common.dex')

// importClass(com.tony.autojs.common.ProcessMappedShare)

// let waiting = true
// let provider = ProcessMappedShare.newProvider(files.cwd() + '/tmp.mm', 1024, runtime)
// provider.postInfo("hello world")
// log('消息发送完毕！')

let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let processShare = singletonRequire('ProcessShare')
processShare.postInfo('hello world')