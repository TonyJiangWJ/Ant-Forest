
let { config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let storageFactory = singletonRequire('StorageFactory')
let RUNTIME_STORAGE = _storage_name + "_runtime"

let ENERGY_TAG = 'energy'
let RUN_TIMES_TAG = 'runTimes'
let PROTECT_TAG = 'protectList'
let FRIEND_COLLECT_TAG = 'friendCollect'
let BAIDU_INVOKE_COUNT = 'baiduInvokeCount'
let TESSERAC_INVOKE_COUNT = 'tesseracInvokeCount'
let DISMISS_AWAIT_DIALOG = 'dismissAwaitDialog'
let TIMER_AUTO_START = "timerAutoStart"
let READY = 'ready_engine'
let USER_NAME_MD5 = 'userNameImgMD5'

storageFactory.initFactoryByKey(ENERGY_TAG, { totalIncrease: 0 })
storageFactory.initFactoryByKey(RUN_TIMES_TAG, { runTimes: 0 })
storageFactory.initFactoryByKey(PROTECT_TAG, { protectList: [] })
storageFactory.initFactoryByKey(FRIEND_COLLECT_TAG, { collectInfos: [] })
storageFactory.initFactoryByKey(BAIDU_INVOKE_COUNT, { count: 0 })
storageFactory.initFactoryByKey(TESSERAC_INVOKE_COUNT, { count: 0 })
let storageNames = [
  ENERGY_TAG,
  RUN_TIMES_TAG,
  PROTECT_TAG,
  FRIEND_COLLECT_TAG,
  BAIDU_INVOKE_COUNT,
  TESSERAC_INVOKE_COUNT,
  DISMISS_AWAIT_DIALOG,
  TIMER_AUTO_START,
  READY,
  USER_NAME_MD5
]

let storage = storages.create(RUNTIME_STORAGE)
storageNames.forEach(key => {
  console.log(key + ': ' + storage.get(key))
  console.log('storageFactory: ' + JSON.stringify(storageFactory.getValueByKey(key, true)))
  // 清空数据
  // storage.put(key, null)
})

