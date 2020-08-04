/*
 * @Author: SilvMonFr.00 https://github.com/SuperMonster003
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-03 14:00:31
 * @Description: 定时任务桥接，由大佬SilvMonFr.00提供
 */
importPackage(org.joda.time);

let waitForAction = _waitForAction

module.exports = (function (_runtime_, scope) {

  let is_pro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
  let is_modify = Object.prototype.toString.call(org.autojs.autojsm.timing.TimedTask).match(/Java(Class|Object)/)
  let timing = is_pro ? com.stardust.autojs.core.timing : (is_modify ? org.autojs.autojsm.timing : org.autojs.autojs.timing)
  var timers = Object.create(_runtime_.timers);
  var TimedTask = is_pro ? timing.TimedTask.Companion : timing.TimedTask;
  var IntentTask = timing.IntentTask;
  var TimedTaskManager = is_pro ? timing.TimedTaskManager.Companion.getInstance() : timing.TimedTaskManager.getInstance();
  var bridges = require("__bridges__");
  let days_ident = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
    '一', '二', '三', '四', '五', '六', '日',
    1, 2, 3, 4, 5, 6, 0,
    1, 2, 3, 4, 5, 6, 7,
  ].map(value => value.toString());

  scope.__asGlobal__(timers, ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate']);

  scope.loop = function () {
    console.warn("loop() has been deprecated and has no effect. Remove it from your code.");
  };

  timers.addDailyTask = function (task) {
    let localTime = parseDateTime("LocalTime", task.time);
    let timedTask = TimedTask.dailyTask(localTime, files.path(task.path), parseConfig(task));

    addTask(timedTask);
    return timedTask;
  };

  timers.addWeeklyTask = function (task) {
    let localTime = parseDateTime("LocalTime", task.time);
    let timeFlag = 0;
    for (let i = 0; i < task.daysOfWeek.length; i++) {
      let dayString = task.daysOfWeek[i].toString();
      let dayIndex = days_ident.indexOf(dayString.toLowerCase()) % 7;
      if (!~dayIndex) throw new Error('unknown day: ' + dayString);
      timeFlag |= TimedTask.getDayOfWeekTimeFlag(dayIndex + 1);
    }
    let timedTask = TimedTask.weeklyTask(localTime, new java.lang.Long(timeFlag), files.path(task.path), parseConfig(task));
    addTask(timedTask);
    return timedTask;
  };

  timers.addDisposableTask = function (task) {
    let localDateTime = parseDateTime("LocalDateTime", task.date);
    let timedTask = TimedTask.disposableTask(localDateTime, files.path(task.path), parseConfig(task));
    addTask(timedTask);
    return timedTask;
  };

  timers.addIntentTask = function (task) {
    let intentTask = new IntentTask();
    intentTask.setLocal(task.isLocal)
    intentTask.setScriptPath(files.path(task.path));
    task.action && intentTask.setAction(task.action);
    addTask(intentTask);
    return intentTask;
  };

  timers.getTimedTask = function (id) {
    return TimedTaskManager.getTimedTask(id);
  };

  timers.getIntentTask = function (id) {
    return TimedTaskManager.getIntentTask(id);
  };

  timers.removeIntentTask = function (id) {
    if (!id && isNaN(+id)) return;
    let task = timers.getIntentTask(id);
    return task && removeTask(task);
  };

  timers.removeTimedTask = function (id) {
    if (!id && isNaN(+id)) return;
    let task = timers.getTimedTask(id);
    return task && removeTask(task);
  };

  timers.queryTimedTasks = function (options, callback) {
    options = options || {};
    var sql = '';
    var args = [];

    function sqlAppend (str) {
      if (sql.length === 0) {
        sql += str;
      } else {
        sql += ' AND ' + str;
      }
      return true;
    }

    let path = options.path;
    path && sqlAppend('script_path = ?') && args.push(path);
    return is_pro ? bridges.toArray(TimedTaskManager.queryTimedTasks(sql || null, args)) : (() => {
      let list = TimedTaskManager.getAllTasksAsList().toArray();
      if (options.path) list = list.filter(task => task.getScriptPath() === path);
      return list;
    })();
  };

  timers.queryIntentTasks = function (options, callback) {
    let allIntentTasks = TimedTaskManager.getAllIntentTasksAsList()
    return bridges.toArray(allIntentTasks).filter(intentTask => {
      return (options.action ? intentTask.getAction() === options.action : true) 
              && (options.path ? intentTask.getScriptPath() === options.path : true)
    });
  };

  return timers;

  // tool function(s) //

  function parseConfig (c) {
    let config = new com.stardust.autojs.execution.ExecutionConfig();
    config.delay = c.delay || 0;
    config.interval = c.interval || 0;
    config.loopTimes = (c.loopTimes === undefined) ? 1 : c.loopTimes;
    return config;
  }

  function parseDateTime (clazz, dateTime) {
    clazz = is_pro ? clazz : org.joda.time[clazz];
    if (typeof (dateTime) == 'string') {
      return is_pro ? TimedTask.parseDateTime(clazz, dateTime) : clazz.parse(dateTime);
    } else if (typeof (dateTime) == 'object' && dateTime.constructor === Date) {
      return is_pro ? TimedTask.parseDateTime(clazz, dateTime.getTime()) : new clazz(dateTime.getTime());
    } else if (typeof (dateTime) == 'number' && isFinite(dateTime)) {
      return is_pro ? TimedTask.parseDateTime(clazz, dateTime) : new clazz(dateTime);
    } else {
      throw new Error("cannot parse date time: " + dateTime);
    }
  }

  function addTask (task) {
    TimedTaskManager[is_pro ? "addTaskSync" : "addTask"](task);
    waitForAction(() => task.id !== 0, 500, 80);
  }

  function removeTask (task) {
    let id = task.id;
    TimedTaskManager[is_pro ? "removeTaskSync" : "removeTask"](task);
    return waitForAction(() => !timers.getTimedTask(id), 500, 80);
  }
})(runtime, this)

// monster function(s) //

function _waitForAction (f, timeout_or_times, interval) {
  let _timeout = timeout_or_times || 10000;
  let _interval = interval || 200;
  let _times = _timeout < 100 ? _timeout : ~~(_timeout / _interval) + 1;

  let _messageAction = typeof messageAction === "undefined" ? messageActionRaw : messageAction;

  while (!_checkF(f) && _times--) sleep(_interval);
  return _times >= 0;

  // tool function(s) //

  function _checkF (f) {
    let _classof = o => Object.prototype.toString.call(o).slice(8, -1);
    if (_classof(f) === "JavaObject") return _checkF(() => f.exists());
    if (_classof(f) === "Array") {
      let _arr = f;
      let _logic_flag = "all";
      if (typeof _arr[_arr.length - 1] === "string") _logic_flag = _arr.pop();
      if (_logic_flag.match(/^(or|one)$/)) _logic_flag = "one";
      for (let i = 0, len = _arr.length; i < len; i += 1) {
        if (!(typeof _arr[i]).match(/function|object/)) _messageAction("数组参数中含不合法元素", 8, 1, 0, 1);
        if (_logic_flag === "all" && !_checkF(_arr[i])) return false;
        if (_logic_flag === "one" && _checkF(_arr[i])) return true;
      }
      return _logic_flag === "all";
    } else if (typeof f === "function") return f();
    else _messageAction("\"waitForAction\"传入f参数不合法\n\n" + f.toString() + "\n", 8, 1, 1, 1);
  }

  // raw function(s) //

  function messageActionRaw (msg, msg_level, toast_flag) {
    let _msg = msg || " ";
    if (msg_level && msg_level.toString().match(/^t(itle)?$/)) {
      return messageAction("[ " + msg + " ]", 1, toast_flag);
    }
    let _msg_level = typeof +msg_level === "number" ? +msg_level : -1;
    toast_flag && toast(_msg);
    _msg_level === 1 && log(_msg) || _msg_level === 2 && console.info(_msg) ||
      _msg_level === 3 && console.warn(_msg) || _msg_level >= 4 && console.error(_msg);
    _msg_level >= 8 && exit();
    return !(_msg_level in { 3: 1, 4: 1 });
  }
}