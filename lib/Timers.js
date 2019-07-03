
/**
 * Returns a version name string of an app with either app name or app package name input
 * @param name {string} - app name, app package name or some shortcuts
 * <br>
 *     -- app name - "Alipay" <br>
 *     -- app package name - "com.eg.android.AlipayGphone" <br>
 *     -- /^[Aa]uto\.?js/ - "org.autojs.autojs" + (name.match(/[Pp]ro$/) ? "pro" : "") <br>
 *     -- /^[Cc]urrent.*[Aa]uto.*js/ - context.packageName <br>
 *     -- "self" - currentPackage()
 * @param [params] {object}
 * @param [params.debug_info_flag=false] {boolean}
 * @example
 * parseAppName("Alipay"); -- app name <br>
 * parseAppName("self"); -- shortcut <br>
 * parseAppName("autojs"); -- shortcut <br>
 * parseAppName("autojs pro"); -- shortcut <br>
 * parseAppName("Auto.js"); -- app name <br>
 * parseAppName("org.autojs.autojs"); -- app package name <br>
 * parseAppName("current autojs"); -- shortcut
 * @param name
 * @return {null|string}
 */
function getVerName(name, params) {

  let _params = params;

  let _parseAppName = typeof parseAppName === "undefined" ? parseAppNameRaw : parseAppName;
  let _debugInfo = _msg => (typeof debugInfo === "undefined" ? debugInfoRaw : debugInfo)(_msg, _params.debug_info_flag);

  name = _handleName(name);
  let _package_name = _parseAppName(name).package_name;
  if (!_package_name) return null;

  try {
    let _installed_packages = context.getPackageManager().getInstalledPackages(0).toArray();
    for (let i in _installed_packages) {
      if (_installed_packages[i].packageName.toString() === _package_name.toString()) {
        return _installed_packages[i].versionName;
      }
    }
  } catch (e) {
    _debugInfo(e);
  }
  return null;

  // tool function(s) //

  function _handleName(name) {
    if (name.match(/^[Aa]uto\.?js/)) return "org.autojs.autojs" + (name.match(/[Pp]ro$/) ? "pro" : "");
    if (name === "self") return currentPackage();
    if (name.match(/^[Cc]urrent.*[Aa]uto.*js/)) return context.packageName;
    return name;
  }

  // raw function(s) //

  function debugInfoRaw(msg, info_flag) {
    if (info_flag) console.verbose((msg || "").replace(/^(>*)( *)/, ">>" + "$1 "));
  }

  function parseAppNameRaw(name) {
    let _app_name = !name.match(/.+\..+\./) && app.getPackageName(name) && name;
    let _package_name = app.getAppName(name) && name;
    _app_name = _app_name || _package_name && app.getAppName(_package_name);
    _package_name = _package_name || _app_name && app.getPackageName(_app_name);
    return {
      app_name: _app_name,
      package_name: _package_name,
    };
  }
}


let is_pro = !!getVerName('current_autojs').match(/[Pp]ro/)
importPackage(org.joda.time)

module.exports = function (runtime, scope) {
  let timing = is_pro ? com.stardust.autojs.core.timing : org.autojs.autojs.timing
  var timers = Object.create(runtime.timers)
  var TimedTask = timing.TimedTask
  var IntentTask = timing.IntentTask
  var TimedTaskManager = is_pro ? timing.TimedTaskManager.Companion.getInstance() : timing.TimedTaskManager.getInstance()
  var bridges = require('__bridges__')

  scope.__asGlobal__(timers, [
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'setImmediate',
    'clearImmediate'
  ])

  scope.loop = function () {
    console.warn(
      'loop() has been deprecated and has no effect. Remove it from your code.'
    )
  }

  function parseConfig(c) {
    let config = new com.stardust.autojs.execution.ExecutionConfig()
    config.delay = c.delay || 0
    config.interval = c.interval || 0
    config.loopTimes = c.loopTimes === undefined ? 1 : c.loopTimes
    return config
  }

  function parseDateTime(clazz, dateTime) {
    if (typeof dateTime == 'string') {
      return is_pro
        ? TimedTask.Companion.parseDateTime(clazz, dateTime)
        : clazz.parse(dateTime)
    } else if (typeof dateTime == 'object' && dateTime.constructor === Date) {
      return is_pro
        ? TimedTask.Companion.parseDateTime(clazz, dateTime.getTime())
        : new clazz(dateTime.getTime())
    } else if (typeof dateTime == 'number') {
      return is_pro
        ? TimedTask.Companion.parseDateTime(clazz, dateTime)
        : new clazz(dateTime)
    } else {
      throw new Error('cannot parse date time: ' + dateTime)
    }
  }

  function addTask(task) {
    TimedTaskManager[is_pro ? 'addTaskSync' : 'addTask'](task)
  }

  timers.addDailyTask = function (task) {
    let localTime = parseDateTime(
      is_pro ? 'LocalTime' : org.joda.time.LocalTime,
      task.time
    )
    let timedTask = (is_pro ? TimedTask.Companion : TimedTask).dailyTask(
      localTime,
      files.path(task.path),
      parseConfig(task)
    )
    addTask(timedTask)
    return timedTask
  }

  var daysEn = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ]
  var daysCn = ['一', '二', '三', '四', '五', '六', '日']

  timers.addWeeklyTask = function (task) {
    let localTime = parseDateTime(
      is_pro ? 'LocalTime' : org.joda.time.LocalTime,
      task.time
    )
    let timeFlag = 0
    for (let i = 0; i < task.daysOfWeek.length; i++) {
      let dayString = task.daysOfWeek[i]
      let dayIndex = daysEn.indexOf(dayString)
      if (dayIndex === -1) {
        dayIndex = daysCn.indexOf(dayString)
      }
      if (dayIndex === -1) {
        throw new Error('unknown day: ' + dayString)
      }
      timeFlag |= (is_pro
        ? TimedTask.Companion
        : TimedTask
      ).getDayOfWeekTimeFlag(dayIndex + 1)
    }
    let timedTask = (is_pro ? TimedTask.Companion : TimedTask).weeklyTask(
      localTime,
      new java.lang.Long(timeFlag),
      files.path(task.path),
      parseConfig(task)
    )
    addTask(timedTask)
    return timedTask
  }

  timers.addDisposableTask = function (task) {
    let localDateTime = parseDateTime(
      is_pro ? 'LocalDateTime' : org.joda.time.LocalDateTime,
      task.date
    )
    let timedTask = (is_pro ? TimedTask.Companion : TimedTask).disposableTask(
      localDateTime,
      files.path(task.path),
      parseConfig(task)
    )
    addTask(timedTask)
    return timedTask
  }

  timers.addIntentTask = function (task) {
    let intentTask = new IntentTask()
    intentTask.setScriptPath(files.path(task.path))
    task.action && intentTask.setAction(task.action)
    addTask(intentTask)
    return intentTask
  }

  timers.getTimedTask = function (id) {
    return TimedTaskManager.getTimedTask(id)
  }

  timers.getIntentTask = function (id) {
    return TimedTaskManager.getIntentTask(id)
  }

  timers.removeIntentTask = function (id) {
    let task = timers.getIntentTask(id)
    return task && TimedTaskManager.removeTaskSync(task)
  }

  timers.removeTimedTask = function (id) {
    let task = timers.getTimedTask(id)
    return task && TimedTaskManager.removeTaskSync(task)
  }

  timers.queryTimedTasks = function (options, callback) {
    var sql = ''
    var args = []

    function sqlAppend(str) {
      if (sql.length === 0) {
        sql += str
      } else {
        sql += ' AND ' + str
      }
      return true
    }

    options.path && sqlAppend('script_path = ?') && args.push(options.path)
    return bridges.toArray(
      TimedTaskManager.queryTimedTasks(sql ? sql : null, args)
    )
  }

  timers.getAllTasks = function () {
    return TimedTaskManager.getAllTasksAsList()
  }

  timers.queryIntentTasks = function (options, callback) {
    var sql = ''
    var args = []

    function sqlAppend(str) {
      if (sql.length === 0) {
        sql += str
      } else {
        sql += ' AND ' + str
      }
      return true
    }

    options.path && sqlAppend('script_path = ?') && args.push(options.path)
    options.action && sqlAppend('action = ?') && args.push(options.action)
    return bridges.toArray(
      TimedTaskManager.queryIntentTasks(sql ? sql : null, args)
    )
  }

  scope.addDailyTask = timers.addDailyTask.bind(timers)
  scope.addWeeklyTask = timers.addWeeklyTask.bind(timers)
  scope.addDisposableTask = timers.addDisposableTask.bind(timers)
  scope.addIntentTask = timers.addIntentTask.bind(timers)
  scope.getTimedTask = timers.getTimedTask.bind(timers)
  scope.getIntentTask = timers.getIntentTask.bind(timers)
  scope.removeIntentTask = timers.removeIntentTask.bind(timers)
  scope.removeTimedTask = timers.removeTimedTask.bind(timers)
  scope.queryTimedTasks = timers.queryTimedTasks.bind(timers)
  scope.queryIntentTasks = timers.queryIntentTasks.bind(timers)
  scope.getAllTasks = timers.getAllTasks.bind(timers)

  return timers
}

