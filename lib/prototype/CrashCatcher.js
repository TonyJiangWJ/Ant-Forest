/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-27 23:08:29
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-24 21:50:58
 * @Description: AutoJS崩溃自启
 */

let { storage_name, config } = require('../../config.js')(runtime, this)
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let logUtils = singletonRequire('LogUtils')
let fileUtils = singletonRequire('FileUtils')
let timers = singletonRequire('Timers')

const RUN_STATE_STORAGE = storages.create(storage_name + '_crash_catch')

function CrashCatcher () {
  this.setOnRunning = function () {
    logUtils.debugInfo('设置脚本状态为执行中')
    RUN_STATE_STORAGE.put('running', true)
  }
  this.setDone = function () {
    logUtils.debugInfo('设置脚本状态为执行完毕')
    RUN_STATE_STORAGE.put('running', false)
  }
  this.restartIfCrash = function () {
    if (!config.auto_restart_when_crashed) {
      return
    }
    let runningStatus = RUN_STATE_STORAGE.get('running')
    if (runningStatus === 'true' || runningStatus === true) {
      logUtils.warnInfo('AutoJs可能异常崩溃且已重启，重新执行脚本')
      let source = fileUtils.getRealMainScriptPath()
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
    } else {
      logUtils.debugInfo('AutoJs可能异常崩溃且已重启，但脚本已正常走完流程，不重新执行')
    }
  }
}

let crashCatcher = new CrashCatcher()

if (typeof module === 'undefined') {
  // running mode
  crashCatcher.restartIfCrash()
} else {
  if (config.auto_restart_when_crashed) {
    function getOnStartAction () {
      let is_modify = Object.prototype.toString.call(org.autojs.autojsm.timing.TimedTask).match(/Java(Class|Object)/)
      if (is_modify) {
        return "org.autojs.autojsm.action.startup"
      } else {
        return "org.autojs.autojs.action.startup"
      }
    }
    let intentTask = {
      isLocal: true,
      path: fileUtils.getCurrentWorkPath() + '/lib/prototype/CrashCatcher.js',
      action: getOnStartAction()
    }
    let existTask = timers.queryIntentTasks(intentTask)
    if (!existTask || existTask.length === 0) {
      logUtils.debugInfo('创建异常终止后的重启任务')
      timers.addIntentTask(intentTask)
    } else {
      logUtils.debugInfo(['异常终止的重启任务已存在: {}', JSON.stringify(existTask)])
    }
  }
  module.exports = crashCatcher
}