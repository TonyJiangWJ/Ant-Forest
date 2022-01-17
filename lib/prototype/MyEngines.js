let { config: _config } = require('../../config.js')(runtime, global)
function MyEngines () {

  
  let engineFuncs = Object.getOwnPropertyNames(engines)
  // 复制所有的内置方法
  for (let idx in engineFuncs) {
    let func_name = engineFuncs[idx]
    this[func_name] = engines[func_name]
  }

  /**
   * 在新的界面中运行ui脚本
   *
   * @param {string} path 
   * @param {obj} config 
   * @returns 
   */
  this.execUiScriptFile = function (path, config) {
    return runtime.engines.execScriptFile(path, fillConfig(config));
  }

}

function fillConfig (c) {
  var config = new com.stardust.autojs.execution.ExecutionConfig();
  c = c || {};
  c.path = c.path || files.cwd();
  if (c.path) {
    config.workingDirectory = c.path;
  }
  config.delay = c.delay || 0;
  config.interval = c.interval || 0;
  config.loopTimes = (c.loopTimes === undefined) ? 1 : c.loopTimes;
  // 增加配置 intentFlag
  config.intentFlags = Intent.FLAG_ACTIVITY_MULTIPLE_TASK | Intent.FLAG_ACTIVITY_NEW_DOCUMENT
  if (c.arguments) {
    var arguments = c.arguments;
    for (var key in arguments) {
      if (arguments.hasOwnProperty(key)) {
        config.setArgument(key, arguments[key]);
      }
    }
  }
  return config;
}

module.exports = new MyEngines()