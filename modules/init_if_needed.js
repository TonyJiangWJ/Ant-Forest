/*
 * @Author: TonyJiangWJ
 * @Date: 2020-09-18 13:40:43
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-09-19 16:38:16
 * @Description: 免费版专用
 */
module.exports = function (runtime, scope) {

  if (context.getPackageName() !== 'org.autojs.autojspro') {
    requireCommonModules(['$power_manager'])
  } else {
    requireCommonModules(["fake_selector"])
  }

  function requireCommonModules (modules) {
    var len = modules.length
    for (var i = 0; i < len; i++) {
      var m = modules[i]
      if (typeof scope[m] === 'undefined') {
        let module = require(getCurrentWorkPath() + '/modules/__' + m + '__')(runtime, scope)
        scope[m] = module
      }
    }
  }

  function getCurrentWorkPath () {
    let currentPath = files.cwd()
    if (files.exists(currentPath + '/main.js')) {
      return currentPath
    }
    let paths = currentPath.split('/')

    do {
      paths = paths.slice(0, paths.length - 1)
      currentPath = paths.reduce((a, b) => a += '/' + b)
    } while (!files.exists(currentPath + '/main.js') && paths.length > 0)
    if (paths.length > 0) {
      return currentPath
    }
  }
}
