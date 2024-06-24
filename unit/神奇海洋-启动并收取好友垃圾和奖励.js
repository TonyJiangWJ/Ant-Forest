require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let mainScriptPath = FileUtils.getRealMainScriptPath(true)
engines.execScriptFile(mainScriptPath + "/unit/神奇海洋收集.js", {
  path: mainScriptPath + "/unit/", arguments: {
    executeByDispatcher: true,
    find_friend_trash: true,
    collect_reward: true,
  }
})
