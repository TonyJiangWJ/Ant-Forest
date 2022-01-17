let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')


let regex = /.*收取好友.*g/
let readResult = FileUtils.readLastLines('/storage/emulated/0/脚本/energy_store/logs/log.log', 500, null, line => regex.test(line))
// console.log('读取结果：', JSON.stringify(readResult))
readResult.result.forEach(line => {
  console.log(line)
})