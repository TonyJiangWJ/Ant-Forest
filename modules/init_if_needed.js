/*
 * @Author: TonyJiangWJ
 * @Date: 2020-09-18 13:40:43
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-11-28 17:28:42
 * @Description: 免费版专用
 */
module.exports = function (runtime, scope) {

  if (context.getPackageName() !== 'org.autojs.autojspro') {
    var modules = ["$zip", "$base64", "$crypto", "$power_manager", "mDialogs"]
    requireCommonModules(modules)
  } else {
    requireCommonModules(["fake_selector"])
  }

  function requireCommonModules (modules) {
    var len = modules.length
    for (var i = 0; i < len; i++) {
      var m = modules[i]
      let requirePath = getCurrentWorkPath() + '/modules/__' + m + '__.js'
      if (typeof scope[m] === 'undefined' && files.exists(requirePath)) {
        let module = require(requirePath)(runtime, scope)
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
