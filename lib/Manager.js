/*
* @Author: NickHopps
* @Date:   2019-01-11 13:52:45
* @Last Modified by:   NickHopps
* @Last Modified time: 2019-01-11 13:53:14
* @Description: 脚本执行管理
*/

function Manager(config, delay, callback) {
  const _config = config;
  const _delay = delay;
  const _callback = callback;
  const _tasks = [];

  const _add_task = function(task) {
    if (_tasks.length == 0) {
      _tasks.push(task);
    }
  }

  const _remove_task = function() {
    if (_tasks.length > 0) {
      _tasks.pop();
    }
  }
}

module.exports = Manager;
