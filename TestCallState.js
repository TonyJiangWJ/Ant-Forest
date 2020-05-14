/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-13 13:58:40
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-14 01:14:58
 * @Description: 
 */
let { config } = require('config.js')(runtime, this)
config.enable_call_state_control = true
config.show_debug_log = true
let callStateListener = require('./lib/prototype/CallStateListener.js')

callStateListener.exitIfNotIdle()
callStateListener.enableListener()


let count = 30
while (count-- > 0) {
  sleep(1000)
}

