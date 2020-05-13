/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-11 16:54:44
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-13 17:39:08
 * @Description: 监听通话状态，通话时自动延迟五分钟
 */
importClass(android.content.Context)
importClass(android.telephony.PhoneStateListener)
importClass(com.stardust.autojs.ScriptEngineService)
importClass(com.stardust.autojs.engine.ScriptEngineManager)
let { config } = require('../../config.js')(runtime, this)
let sRequire = require('../SingletonRequirer.js')(runtime, this)
let commonFunctions = sRequire('CommonFunction')
let logUtils = sRequire('LogUtils')

function CallStateListener () {

  let telephoneManager = context.getSystemService(Context.TELEPHONY_SERVICE)

  const STATE_LISTENER = new JavaAdapter(PhoneStateListener, {
    onCallStateChanged: function (callState) {
      // 当有通话状态变化是回调
      logUtils.warnInfo('phone call state changed to:' + callState, true)
      if (callState !== 0) {
        exitAndSetupAutoStart()
      }
    }
  })

  // 监听运行周期，脚本结束后释放图片资源
  let engineService = ScriptEngineService.getInstance()

  let myEngineId = engines.myEngine().id
  let that = this
  logUtils.debugInfo('添加运行状态监听器，结束时释放通话状态监听')
  engineService.registerEngineLifecycleCallback(
    new ScriptEngineManager.EngineLifecycleCallback({
      onEngineCreate: function (engine) {
      },
      onEngineRemove: function (engine) {
        if (engine.id === myEngineId) {
          logUtils.infoLog('脚本执行结束, 移除通话状态监听')
          that.disableListener()
          engineService.unregisterEngineLifecycleCallback(this)
        }
      }
    })
  )

  this.isEnabled = function () {
    logUtils.debugInfo('当前启用状态：' + config.enable_call_state_control)
    return config.enable_call_state_control
  }

  this.enableListener = function () {
    if (this.isEnabled()) {
      logUtils.debugInfo('添加通话状态监听器')
      telephoneManager.listen(STATE_LISTENER, PhoneStateListener.LISTEN_CALL_STATE)
    }
  }

  this.disableListener = function () {
    if (this.isEnabled()) {
      logUtils.debugInfo('移除通话状态监听器')
      telephoneManager.listen(STATE_LISTENER, PhoneStateListener.LISTEN_NONE)
    }
  }

  this.getCurrentCallState = function () {
    return telephoneManager.getCallState()
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