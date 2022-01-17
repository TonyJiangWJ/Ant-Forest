let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let { debugInfo, debugForDev } = singletonRequire('LogUtils')
let workpath = FileUtils.getCurrentWorkPath()

runtime.loadDex(workpath + '/modules/kill-pro.dex')
importClass(com.evil.killpro.MyUiSelector)
module.exports = function (__runtime__, scope) {
  var skipMethod = ['click']
  var __evil_selector__ = new MyUiSelector(__runtime__.getAccessibilityBridge());
  var __obj__ = new java.lang.Object();

  for (var method in __evil_selector__) {
    if (!(method in __obj__) && skipMethod.indexOf(method) < 0) {
      debugForDev(['准备替换selector 方法：{}', method])
      if (scope[method + '__sss']) {
        debugInfo(['已存在相同方法，跳过替换'])
        continue
      }
      scope[method] = (function (method) {
        return function () {
          var s = new MyUiSelector(__runtime__.getAccessibilityBridge());
          return s[method].apply(s, Array.prototype.slice.call(arguments));
        };
      })(method);
      scope[method + '__sss'] = true
    }
  }

  return function () {
    return new MyUiSelector(__runtime__.getAccessibilityBridge())
  };
}

