/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-11 16:54:44
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-11 18:23:25
 * @Description: 监听通话状态，通话时自动延迟五分钟
 */
importClass(android.content.Context)
importClass(android.telephony.PhoneStateListener)
let { config } = require('../../config.js')(runtime, this)
let sRequire = require('../SingletonRequirer.js')(runtime, this)
let commonFunctions = sRequire('CommonFunction')

function CallStateListener () {

  let telephoneManager = context.getSystemService(Context.TELEPHONY_SERVICE)
  const STATE_LISTENER = new PhoneStateListener({
    onCallStateChanged: function (callState) {
      // 当有通话状态变化是回调
      logFile('phone call state changed to:' + callState, true)
      if (callState !== 0) {
        exitAndSetupAutoStart()
      }
    }
  })

  this.isEnabled = function () {
    config.enable_call_state_control
  }

  this.enableListener = function () {
    if (this.isEnabled()) {
      telephoneManager.listen(STATE_LISTENER, PhoneStateListener.LISTEN_CALL_STATE)
    }
  }

  this.disableListener = function () {
    if (this.isEnabled()) {
      telephoneManager.listen(STATE_LISTENER, PhoneStateListener.LISTEN_NONE)
    }
  }

  this.getCurrentCallState = function () {
    telephoneManager.getCallState()
  }

  this.isIdle = function () {
    return !this.isEnabled() || this.getCurrentCallState() === 0
  }

  this.exitIfNotIdle = function () {

    if (!callStateListener.isIdle()) {
      let callState = callStateListener.getCurrentState()
      warnInfo(['当前正在{}状态，延迟五分钟后再试', callState === 1 ? '响铃' : '通话'])
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