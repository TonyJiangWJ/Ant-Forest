let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let { config: _config } = require('../../config.js')(runtime, this)
let { debugInfo, warnInfo } = singletonRequire('LogUtils')
let workpath = FileUtils.getCurrentWorkPath()
let ResultAdapter = require('result_adapter')
let $resolver = require(workpath + '/lib/AutoJSRemoveDexResolver.js')
$resolver()
runtime.loadDex(workpath + '/lib/autojs-common.dex')
importClass(com.tony.autojs.common.ImagesResolver)
$resolver()

function ReRequestScreenCapture() {
  /**
   * 释放截图权限
   */
  this.releaseImageCapture = function () {
    _config.has_screen_capture_permission = false
    debugInfo('准备释放截图权限')
    ImagesResolver.releaseImageCapture(runtime)
    debugInfo('释放截图权限完毕')
  }

  this.requestScreenCaptureManual = function () {
    log('准备重新获取截图权限')
    let permission = ResultAdapter.wait(ImagesResolver.requestScreenCapture(runtime))
    debugInfo('重新获取截图权限' + permission)
    return permission
  }

  this.requestScreenCaptureAuto = function () {
    ImagesResolver.clearScreenCaptureState(runtime)
    log('准备重新获取截图权限')
    let permission = singletonRequire('RequestScreenCapture')()
    debugInfo('重新获取截图权限' + permission)
    return permission
  }

  this.reRequestScreenCapture = function () {
    if (_config.request_capture_permission) {
      return this.requestScreenCaptureAuto()
    } else {
      return this.requestScreenCaptureManual()
    }
  }

  /**
   * 释放并重新请求截图权限-手动
   */
  this.releaseAndRequestScreenCaptureManual = function () {
    debugInfo('释放截图权限')
    ImagesResolver.releaseImageCapture(runtime)
    sleep(100)
    log('准备重新获取截图权限')
    let permission = ResultAdapter.wait(ImagesResolver.requestScreenCapture(runtime))
    debugInfo('重新获取截图权限' + permission)
    return permission
  }

  /**
   * 释放截图权限并清除截图权限状态-自动
   */
  this.releaseAndRequestScreenCaptureAuto = function () {
    debugInfo('释放截图权限')
    ImagesResolver.clearScreenCaptureState(runtime)
    debugInfo('释放截图权限完毕')
    let permission = singletonRequire('RequestScreenCapture')()
    debugInfo('重新获取截图权限' + permission)
    return permission
  }

  /**
   * 释放并重新获取截图权限
   * @returns 是否请求成功
   */
  this.releaseAndRequestScreenCapture = function () {
    if (_config.request_capture_permission) {
      return this.releaseAndRequestScreenCaptureAuto()
    } else {
      return this.releaseAndRequestScreenCaptureManual()
    }
  }

}

module.exports = new ReRequestScreenCapture()