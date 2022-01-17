/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-23 23:33:09
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-23 23:39:20
 * @Description: 
 */
let lockableStorages = require('../lib/prototype/LockableStorage.js')(runtime, global)

let storge = lockableStorages.create('test_storage')
log(storge.put('yes', 'yesyes'))
log(storge.get('yes'))
