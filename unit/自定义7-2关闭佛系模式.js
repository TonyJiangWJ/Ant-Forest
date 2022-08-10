/*
 * @Author: TonyJiangWJ
 * @Date: 2022-07-11 17:29:06
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-07-12 09:16:15
 * @Description: 
 */
let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let ProcessShare = singletonRequire('ProcessShare')

let changedConfig = {
  buddha_like_mode: false,
}

Object.keys(changedConfig).forEach(key => {
  config.overwrite(key, changedConfig[key])
})

console.verbose(engines.myEngine().id + ' 发送广播 通知配置变更')
ProcessShare
  // 设置缓冲区大小为10KB
  .setBufferSize(10240)
  .postInfo(JSON.stringify(changedConfig), '.configShare')