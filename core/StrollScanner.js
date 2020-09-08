/*
 * @Author: TonyJiangWJ
 * @Date: 2020-09-07 13:06:32
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-09-08 10:00:14
 * @Description: 逛一逛收集器
 */
let { config: _config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')

let BaseScanner = require('./BaseScanner.js')


const StrollScanner = function () {
  BaseScanner.call(this)

  this.init = function (option) {
    this.current_time = option.currentTime || 0
    this.increased_energy = option.increasedEnergy || 0
  }

  this.start = function () {
    debugInfo('逛一逛即将开始')
    return this.collecting()
  }

  this.destory = function () {
    debugInfo('逛一逛结束')
  }
  /**
   * 执行收集操作
   * 
   * @return { true } if failed
   * @return { minCountdown, lostSomeone } if successful
   */
  this.collecting = function () {
    let hasNext = true
    let doSuccess = false
    let grayScreen = null
    let jTreeWarp = _widgetUtils.widgetGetById('J_tree_dialog_wrap')
    let region = null
    if (jTreeWarp) {
      let warpBounds = jTreeWarp.bounds()
      region = [
        parseInt(warpBounds.right - 0.18 * warpBounds.width()), parseInt(warpBounds.bottom - 0.12 * warpBounds.height()),
        parseInt(0.18 * warpBounds.width()), parseInt(0.12 * warpBounds.height())
      ]
    } else {
      hasNext = false
    }
    while (hasNext) {
      grayScreen = images.grayscale(_commonFunctions.checkCaptureScreenPermission(5))
      let point = images.findColor(grayScreen, '#909090', { region: region })
      if (point) {
        debugInfo('逛下一个')
        doSuccess = true
        automator.click(point.x, point.y)
        sleep(500)
        if (_widgetUtils.idCheck(_config.energy_id || 'J_userEnergy', 1500) && !_widgetUtils.widgetCheck('startapp\\?.*', 500)) {
            //sleep(200)
          hasNext = this.collectTargetFriend()
        } else {
          hasNext = false
        }
      } else {
        debugInfo('没有可以逛一逛的了')
        hasNext = false
      }
    }
    sleep(100)
    let result = {
      doSuccess: doSuccess
    }
    Object.assign(result, this.getCollectResult())
    return result
  }

  this.backToListIfNeeded = function () {
    debugInfo('准备逛下一个，等待500ms')
    sleep(500)
    return true
  }
}

StrollScanner.prototype = Object.create(BaseScanner.prototype)
StrollScanner.prototype.constructor = StrollScanner

StrollScanner.prototype.collectTargetFriend = function (obj) {
  obj = obj || {}
  if (!obj.protect) {
    //automator.click(obj.target.centerX(), obj.target.centerY())
    debugInfo('等待进入好友主页')
    let restartLoop = false
    let count = 1
    ///sleep(1000)
    while (!_widgetUtils.friendHomeWaiting()) {
      if (_widgetUtils.widgetCheck('startapp\\?.*', 500)) {
        debugInfo('逛一逛啥也没有，不再瞎逛')
        return false
      }
      debugInfo(
        '未能进入主页，等待500ms count:' + count++
      )
      sleep(500)
      if (count >= 3) {
        warnInfo('重试超过3次，取消操作')
        restartLoop = true
        break
      }
    }
    if (restartLoop) {
      errorInfo('页面流程出错，重新开始')
      return false
    }
    let title = textContains('的蚂蚁森林')
      .findOne(_config.timeout_findOne)
      .text().match(/(.*)的蚂蚁森林/)
    if (title) {
      obj.name = title[1]
      debugInfo(['进入好友[{}]首页成功', obj.name])
    } else {
      errorInfo(['获取好友名称失败，请检查好友首页文本"XXX的蚂蚁森林"是否存在'])
    }
    let skip = false
    if (!skip && _config.white_list && _config.white_list.indexOf(obj.name) >= 0) {
      debugInfo(['{} 在白名单中不收取他', obj.name])
      skip = true
    }
    if (!skip && _commonFunctions.checkIsProtected(obj.name)) {
      warnInfo(['{} 使用了保护罩 不收取他', obj.name])
      skip = true
    }
    if (!skip && !obj.recheck && this.protectInfoDetect(obj.name)) {
      warnInfo(['{} 好友已使用能量保护罩，跳过收取', obj.name])
      skip = true
    }
    if (skip) {
      return true
    }
    return this.doCollectTargetFriend(obj)
  }
  return true
}

module.exports = StrollScanner