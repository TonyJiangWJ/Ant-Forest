/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-23 09:09:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-06 18:08:02
 * @Description: 
 */
let { config: _config } = require('../config.js')(runtime, this)

let delay = 320
gesture(delay, [500, parseInt(_config.device_height * 0.8)], [500, parseInt(_config.device_height * 0.3)])