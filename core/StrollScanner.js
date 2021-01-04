/*
 * @Author: TonyJiangWJ
 * @Date: 2020-09-07 13:06:32
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-29 22:53:29
 * @Description: 逛一逛收集器
 */
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')

let BaseScanner = require('./BaseScanner.js')

const DuplicateChecker = function () {

  this.duplicateChecked = {}

  /**
   * 校验是否全都重复校验过了
   */
  this.checkIsAllDuplicated = function () {
    if (Object.keys(this.duplicateChecked).length === 0) {
      return false
    }
    for (let key in this.duplicateChecked) {
      if (this.duplicateChecked[key].count <= 1) {
        return false
      }
    }
    return true
  }

  /**
   * 记录 白名单、保护罩好友 重复访问次数的数据
   * @param {*} obj 
   */
  this.pushIntoDuplicated = function (obj) {
    let exist = this.duplicateChecked[obj.name]
    if (exist) {
      exist.count++
    } else {
      exist = { name: obj.name, count: 1 }
      this.duplicateChecked[obj.name] = exist
    }
  }

}

const StrollScanner = function () {
  BaseScanner.call(this)
  this.duplicateChecker = new DuplicateChecker()
  this.init = function (option) {
    this.current_time = option.currentTime || 0
    this.increased_energy = option.increasedEnergy || 0
    this.createNewThreadPool()
  }

  this.start = function () {
    debugInfo('逛一逛即将开始')
    return this.collecting()
  }

  this.destory = function () {
    debugInfo('逛一逛结束')
    this.baseDestory()
  }

  /**
   * 执行收集操作
   * 
   * @return { true } if failed
   * @return { minCountdown, lostSomeone } if successful
   */
  this.collecting = function () {
    let hasNext = true
    let region = null
    if (_config.stroll_button_left && !_config.stroll_button_regenerate) {
      region = [_config.stroll_button_left, _config.stroll_button_top, _config.stroll_button_width, _config.stroll_button_height]
    } else {
      let jTreeWarp = _widgetUtils.widgetGetById('J_tree_dialog_wrap')
      if (jTreeWarp) {
        let warpBounds = jTreeWarp.bounds()
        region = [
          Math.floor(warpBounds.right - 0.3 * warpBounds.width()), Math.floor(warpBounds.bottom - 0.098 * warpBounds.height()),
          Math.floor(0.3 * warpBounds.width()), Math.floor(0.085 * warpBounds.height())
        ]
        _config.stroll_button_left = region[0]
        _config.stroll_button_top = region[1]
        _config.stroll_button_width = region[2]
        _config.stroll_button_height = region[3]
        _config.stroll_button_regenerate = true
        debugInfo(['重新生成逛一逛按钮区域：{}', JSON.stringify(region)])
        this.visualHelper.addRectangle('自动识别逛一逛按钮', region)
        this.visualHelper.displayAndClearAll()
        _commonFunctions.ensureRegionInScreen(region)
      } else {
        warnInfo('自动识别逛一逛按钮失败', true)
        hasNext = false
      }
    }
    let firstTime = true
    while (hasNext) {
      if (this.duplicateChecker.checkIsAllDuplicated()) {
        debugInfo('全部都在白名单，没有可以逛一逛的了')
        hasNext = false
        continue
      }
      debugInfo(['逛下一个, click random region: [{}]', JSON.stringify(region)])
      this.visualHelper.addRectangle('准备点击下一个', region)
      this.visualHelper.displayAndClearAll()
      automator.clickRandomRegion({ left: region[0], top: region[1], width: region[2], height: region[3] })
      sleep(300)
      hasNext = this.collectTargetFriend()
    }
    let result = {}
    Object.assign(result, this.getCollectResult())
    return result
  }

  this.backToListIfNeeded = function (rentery, obj) {
    if (!rentery) {
      debugInfo('准备逛下一个，等待200ms')
      sleep(200)
      return true
    } else {
      debugInfo('二次校验好友信息，等待250ms')
      sleep(250)
      obj.recheck = true
      return this.doCollectTargetFriend(obj)
    }
  }

  this.doIfProtected = function (obj) {
    this.duplicateChecker.pushIntoDuplicated(obj)
  }

  /**
   * 逛一逛模式进行特殊处理
   */
  this.getFriendName = function () {
    let friendNameGettingRegex = _config.friend_name_getting_regex || '(.*)的蚂蚁森林'
    let titleContainer = _widgetUtils.alternativeWidget(friendNameGettingRegex, _config.stroll_end_ui_content || '返回我的森林', null, true)
    if (titleContainer.value === 1) {
      let regex = new RegExp(friendNameGettingRegex)
      if (titleContainer && regex.test(titleContainer.content)) {
        return regex.exec(titleContainer.content)[1]
      } else {
        errorInfo(['获取好友名称失败，请检查好友首页文本"{}"是否存在', friendNameGettingRegex])
      }
    }
    debugInfo(['未找到{} {}', friendNameGettingRegex, titleContainer.value === 2 ? '找到了逛一逛结束标志' : ''])
    return false
  }
}

StrollScanner.prototype = Object.create(BaseScanner.prototype)
StrollScanner.prototype.constructor = StrollScanner

StrollScanner.prototype.collectTargetFriend = function () {
  let obj = {}
  debugInfo('等待进入好友主页')
  let restartLoop = false
  let count = 1
  ///sleep(1000)
  let alternativeFriendOrDone = 0
  // 未找到好友首页控件 循环等待三次
  while ((alternativeFriendOrDone = _widgetUtils.alternativeWidget(_config.friend_home_check_regex, _config.stroll_end_ui_content || '返回我的森林')) !== 1) {
    // 找到了结束标志信息 停止逛一逛
    if (alternativeFriendOrDone === 2) {
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
  let name = this.getFriendName()
  if (name) {
    obj.name = name
    debugInfo(['进入好友[{}]首页成功', obj.name])
  } else {
    return false
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
  if (skip) {
    this.duplicateChecker.pushIntoDuplicated(obj)
    return true
  }
  if (!obj.recheck) {
    this.protectInfoDetect(obj.name)
  } else {
    this.isProtected = false
    this.isProtectDetectDone = true
  }
  this.saveButtonRegionIfNeeded()
  return this.doCollectTargetFriend(obj)
}

StrollScanner.prototype.saveButtonRegionIfNeeded = function () {
  if (_config.stroll_button_regenerate) {
    let configStorage = storages.create(_storage_name)
    configStorage.put('stroll_button_left', _config.stroll_button_left)
    configStorage.put('stroll_button_top', _config.stroll_button_top)
    configStorage.put('stroll_button_width', _config.stroll_button_width)
    configStorage.put('stroll_button_height', _config.stroll_button_height)
    configStorage.put('stroll_button_regenerate', false)
    debugInfo(['保存重新生成的逛一逛按钮区域：{}', JSON.stringify([_config.stroll_button_left, _config.stroll_button_top, _config.stroll_button_width, _config.stroll_button_height])])
  }
}
module.exports = StrollScanner
