/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-11 16:54:44
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-24 18:03:46
 * @Description: 监听通话状态，通话时自动延迟五分钟
 */
importClass(android.content.Context)
importClass(android.content.BroadcastReceiver)
importClass(android.content.IntentFilter)
let { config } = require('../../config.js')(runtime, global)
let sRequire = require('../SingletonRequirer.js')(runtime, global)
let commonFunctions = sRequire('CommonFunction')
let logUtils = sRequire('LogUtils')

function CallStateListener () {

  let telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE)

  this.isReceiverRegistered = false

  let that = this

  const onReceiveCallStateChanged = function (context, intent) {
    logUtils.debugInfo('添加通话状态监听器')
    let currentState = that.getCurrentCallState()
    logUtils.debugInfo('当前通话状态：' + currentState)
    if (currentState !== 0) {
      threads.start(function () {
        exitAndSetupAutoStart()
      })
    }
  }

  let PHONE_STATE_RECEIVER = commonFunctions.createInterfaceOrJavaAdapter(BroadcastReceiver, {
    onReceive: onReceiveCallStateChanged
  })
  if (PHONE_STATE_RECEIVER === null) {
    logUtils.errorInfo('BroadcastReceiver扩展失败，请关闭 [通话状态关闭脚本] 的功能')
    config.enable_call_state_control = false
  }


  logUtils.debugInfo('添加运行状态监听器，结束时释放通话状态监听')
  commonFunctions.registerOnEngineRemoved(function () {
    logUtils.infoLog('脚本执行结束, 移除通话状态监听')
    if (that.isEnabled() && that.isReceiverRegistered) {
      logUtils.debugInfo('移除phoneStateBroadcastReceiver')
      context.unregisterReceiver(PHONE_STATE_RECEIVER)
    }
  }, 'callState')

  this.isEnabled = function () {
    logUtils.debugInfo('通话状态监听功能当前启用状态：' + config.enable_call_state_control)
    return config.enable_call_state_control
  }

  this.enableListener = function () {
    if (this.isEnabled()) {
      let intentFilter = new IntentFilter()
      intentFilter.addAction('android.intent.action.PHONE_STATE')
      logUtils.debugInfo('注册phoneStateBroadcastReceiver')
      context.registerReceiver(PHONE_STATE_RECEIVER, intentFilter)
      this.isReceiverRegistered = true
    }
  }

  this.disableListener = function () {
    if (that.isEnabled() && that.isReceiverRegistered) {
      logUtils.debugInfo('移除phoneStateBroadcastReceiver')
      context.unregisterReceiver(PHONE_STATE_RECEIVER)
      that.isReceiverRegistered = false
    }
  }

  this.getCurrentCallState = function () {
    return telephonyManager.getCallState()
  }

  this.isIdle = function () {
    return !this.isEnabled() || this.getCurrentCallState() === 0
  }

  this.exitIfNotIdle = function () {
    if (!callStateListener.isIdle()) {
      let callState = callStateListener.getCurrentCallState()
      logUtils.warnInfo(['当前正在{}状态，延迟五分钟后再试', callState === 1 ? '响铃' : '通话'])
      exitAndSetupAutoStart()
    }
  }

  function exitAndSetupAutoStart () {
    commonFunctions.setUpAutoStart(5)
    // TODO 释放资源，图片recycle欠缺
    exit()
  }
}

module.exports = new CallStateListener()