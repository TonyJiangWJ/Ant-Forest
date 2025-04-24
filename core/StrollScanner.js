/*
 * @Author: TonyJiangWJ
 * @Date: 2020-09-07 13:06:32
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-04-23 00:10:53
 * @Description: 逛一逛收集器
 */
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let _widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let _commonFunctions = singletonRequire('CommonFunction')
let fileUtils = singletonRequire('FileUtils')
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let localOcrUtil = require('../lib/LocalOcrUtil.js')
let WarningFloaty = singletonRequire('WarningFloaty')
let YoloTrainHelper = singletonRequire('YoloTrainHelper')
let YoloDetection = singletonRequire('YoloDetectionUtil')

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
      if (this.duplicateChecked[key].count <= 2) {
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
    }
    this.duplicateChecked[obj.name] = exist

  }

  /**
   * 收集过1个好友后，重置白名单缓存计数
   * 用以确保连续遇到白名单好友才退出逛一逛
   */
  this.resetAll = function () {
    Object.keys(this.duplicateChecked).forEach(key => {
      this.duplicateChecked[key].count = 0
    })
  }

}

const StrollScanner = function () {
  BaseScanner.call(this)
  this.duplicateChecker = new DuplicateChecker()
  this.first_check = true
  this.init = function (option) {
    this.current_time = option.currentTime || 0
    this.increased_energy = option.increasedEnergy || 0
    this.group_execute_mode = option.group_execute_mode || false
    this.createNewThreadPool()
  }

  this.start = function () {
    debugInfo('逛一逛即将开始')
    if (_config.regenerate_stroll_button_every_loop) {
      debugInfo('重新识别逛一逛按钮: ' + regenerateStrollButton())
    }
    return this.collecting()
  }

  this.destroy = function () {
    debugInfo('逛一逛结束')
    this.baseDestroy()
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
    if (_config.stroll_button_left && !_config.stroll_button_regenerate && !this._regenerate_stroll_button) {
      region = [_config.stroll_button_left, _config.stroll_button_top, _config.stroll_button_width, _config.stroll_button_height]
    } else {
      let successful = regenerateStrollButton()
      if (!successful) {
        warnInfo('自动识别逛一逛按钮失败，请主动配置区域或者图片信息', true)
        hasNext = false
      } else {
        region = [_config.stroll_button_left, _config.stroll_button_top, _config.stroll_button_width, _config.stroll_button_height]
      }
    }
    while (hasNext) {
      if (this.duplicateChecker.checkIsAllDuplicated()) {
        debugInfo('全部都在白名单，没有可以逛一逛的了')
        break
      }
      debugInfo(['逛下一个, click random region: [{}]', JSON.stringify(region)])
      this.visualHelper.addRectangle('准备点击下一个', region)
      WarningFloaty.addRectangle('逛一逛按钮区域', region, '#00ff00')
      this.visualHelper.displayAndClearAll()
      // 直接点击中间位置
      automator.click(region[0] + region[2] / 2, region[1] + region[3] / 2)
      sleep(300)
      hasNext = this.collectTargetFriend()
    }
    WarningFloaty.clearAll()
    let result = { regenerate_stroll_button: this._regenerate_stroll_button }
    Object.assign(result, this.getCollectResult())
    return result
  }

  this.backToListIfNeeded = function (rentery, obj, temp) {
    if (!rentery) {
      debugInfo('准备逛下一个，等待200ms')
      sleep(200)
      return true
    } else {
      debugInfo('二次校验好友信息，等待250ms')
      sleep(250)
      obj.recheck = true
      return this.doCollectTargetFriend(obj, temp)
    }
  }

  this.doIfProtected = function (obj) {
    //
  }

  /**
   * 逛一逛模式进行特殊处理
   */
  this.getFriendName = function () {
    let friendNameGettingRegex = _config.friend_name_getting_regex || '(.*)的蚂蚁森林'
    let titleContainer = _widgetUtils.alternativeWidget(friendNameGettingRegex, _config.stroll_end_ui_content || /^返回(我的|蚂蚁)森林>?|去蚂蚁森林.*$/, null, true, null, { algorithm: 'PVDFS' })
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
  if (auto.clearCache) {
    let start = new Date().getTime()
    auto.clearCache()
    debugInfo(['刷新根控件成功: {}ms', (new Date().getTime() - start)])
  }
  if (_config.friend_home_check_regex.indexOf('的蚂蚁森林') < 0) {
    _config.overwrite('friend_home_check_regex', _config.friend_home_check_regex + '|.*的蚂蚁森林')
  }
  // 未找到好友首页控件 循环等待三次
  while ((alternativeFriendOrDone = _widgetUtils.alternativeWidget(_config.friend_home_check_regex, _config.stroll_end_ui_content || /^返回(我的|蚂蚁)森林>?|去蚂蚁森林.*$/, null, false, null, { algorithm: 'PVDFS' })) !== 1) {
    // 找到了结束标志信息 停止逛一逛
    let ended = false
    if (alternativeFriendOrDone === 2) {
      debugInfo('逛一逛啥也没有，不再瞎逛')
      ended = true
    }
    if (this.checkAndCollectRain()) {
      ended = true
    }
    if (ended) {
      return false
    }
    debugInfo(
      '未能进入主页，等待500ms count:' + count++
    )
    sleep(500)
    if (count >= 3) {
      if (!this.regenerated_stroll_button) {
        warnInfo(['可能逛一逛按钮不正确，重新识别'])
        if (regenerateStrollButton()) {
          let region = [_config.stroll_button_left, _config.stroll_button_top, _config.stroll_button_width, _config.stroll_button_height]
          automator.clickRandomRegion({ left: region[0], top: region[1], width: region[2], height: region[3] })
          sleep(1000)
          this.regenerated_stroll_button = true
          continue
        }
      }
      this._regenerate_stroll_button = true
      warnInfo('重试超过3次，取消操作')
      warnInfo(['无法确认是否进入好友主页，请检查`判断是否进入好友首页`的控件文本配置是否正确，当前值：{}', _config.friend_home_check_regex])
      warnInfo(['或者检查一下逛一逛按钮的位置是否正确，当前按钮区域：{}', JSON.stringify([_config.stroll_button_left, _config.stroll_button_top, _config.stroll_button_width, _config.stroll_button_height])])
      WarningFloaty.addRectangle('逛一逛按钮区域不正确', [_config.stroll_button_left, _config.stroll_button_top, _config.stroll_button_width, _config.stroll_button_height], '#ff0000')
      WarningFloaty.addText('逛一逛按钮区域不正确', { x: _config.device_width * 0.4, y: _config.device_height * 0.5 }, '#ff0000', 30)
      restartLoop = true
      break
    }
  }
  if (restartLoop) {
    errorInfo('页面流程出错，跳过好友能量收集')
    return false
  }
  let name = this.getFriendName()
  if (name) {
    obj.name = name
    debugInfo(['进入好友[{}]首页成功', obj.name])
    if (name == this.lastFriendName) {
      this.duplicateEnterCount = (this.duplicateEnterCount ? this.duplicateEnterCount : 0) + 1
    } else {
      this.duplicateEnterCount = 0
    }
    if (this.duplicateEnterCount >= 3) {
      this._regenerate_stroll_button = true
      warnInfo(['重复卡在一个好友界面，可能逛一逛按钮区域不正确，重新识别'], true)
      return false
    }
    this.lastFriendName = name
  } else {
    this.checkAndCollectRain()
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
    return true
  }
  if (!obj.recheck) {
    // 增加延迟 避免展开好友动态失败
    sleep(100)
    this.protectInfoDetect(obj.name)
  } else {
    this.isProtected = false
    this.isProtectDetectDone = true
  }
  this.saveButtonRegionIfNeeded()
  if (this.first_check) {
    _widgetUtils.checkAndUseDuplicateCard()
    this.first_check = false
  }
  let result = this.doCollectTargetFriend(obj)
  if (!this.collect_any) {
    // 未收取任何能量，可能在保护罩或者白名单中，亦或者发生了异常或识别出错 将其放入重复队列
    this.duplicateChecker.pushIntoDuplicated(obj)
  } else {
    this.duplicateChecker.resetAll()
  }
  return result
}

StrollScanner.prototype.checkAndCollectRain = function () {
  let target = null
  auto.clearCache && auto.clearCache()
  if ((target = _widgetUtils.widgetGetOne(_config.rain_entry_content || '.*能量雨.*', 500, true)) != null) {
    if (!_config.collect_rain_when_stroll) {
      debugInfo('找到能量雨开始标志，但是不需要执行能量雨')
      return true
    }
    if (/已完成/.test(target.content)) {
      debugInfo('今日能量雨已完成')
      return true
    }
    sleep(1000)
    debugInfo('找到能量雨开始标志，准备自动执行能量雨脚本')
    target = _widgetUtils.widgetGetOne('去收取')
    if (target) {
      WarningFloaty.clearAll()
      automator.clickCenter(target)
      sleep(1000)
      let source = fileUtils.getCurrentWorkPath() + '/unit/能量雨收集.js'
      runningQueueDispatcher.doAddRunningTask({ source: source })
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')), arguments: { executeByStroll: true, executorSource: engines.myEngine().getSource() + '' } })
      _commonFunctions.commonDelay(2.5, '执行能量雨[', true, true)
      automator.back()
    } else {
      debugInfo('未找到去收取，执行能量雨脚本失败')
    }
    this.showCollectSummaryFloaty()
    return true
  }
  return false
}

StrollScanner.prototype.saveButtonRegionIfNeeded = function () {
  if (_config.stroll_button_regenerate) {
    _config.overwrite('stroll_button_left', _config.stroll_button_left)
    _config.overwrite('stroll_button_top', _config.stroll_button_top)
    _config.overwrite('stroll_button_width', _config.stroll_button_width)
    _config.overwrite('stroll_button_height', _config.stroll_button_height)
    _config.overwrite('stroll_button_regenerate', false)
    debugInfo(['保存重新生成的逛一逛按钮区域：{}', JSON.stringify([_config.stroll_button_left, _config.stroll_button_top, _config.stroll_button_width, _config.stroll_button_height])])
  }
}
module.exports = StrollScanner


// inner functions

function refillStrollInfo (region) {
  _config.stroll_button_left = parseInt(region[0])
  _config.stroll_button_top = parseInt(region[1])
  _config.stroll_button_width = parseInt(region[2])
  _config.stroll_button_height = parseInt(region[3])
  // 用于执行保存数值
  _config.stroll_button_regenerate = true

  debugInfo(['重新生成逛一逛按钮区域：{}', JSON.stringify(region)])
}

function ocrFindText (screen, text, tryTime) {
  tryTime = tryTime || 0
  let ocrCheck = localOcrUtil.recognizeWithBounds(screen, null, text)
  if (ocrCheck && ocrCheck.length > 0) {
    return ocrCheck[0]
  } else {
    if (--tryTime > 0) {
      sleep(500)
      return ocrFindText(screen, text, tryTime)
    }
    return null
  }
}

function regenerateByYolo (screen) {
  let yoloCheck = YoloDetection.forward(screen, { labelRegex: 'stroll_btn' })
  if (yoloCheck && yoloCheck.length > 0) {
    let bounds = yoloCheck[0]
    region = [
      bounds.x, bounds.y,
      bounds.width, bounds.height
    ]
    refillStrollInfo(region)
    return true
  }
  return false

}

function regenerateByOcr (screen) {
  let ocrCheck = ocrFindText(screen, '找能量', 1)
  if (ocrCheck) {
    let bounds = ocrCheck.bounds
    if (!bounds) {
      return false
    }
    region = [
      bounds.left, bounds.top,
      bounds.width(), bounds.height()
    ]
    refillStrollInfo(region)
    return true
  }
  return false
}

function regenerateByImg (screen) {
  let configImageFail = false
  let imagePoint = OpenCvUtil.findByGrayBase64(screen, _config.image_config.stroll_icon)
  if (!imagePoint) {
    configImageFail = true
    imagePoint = OpenCvUtil.findBySIFTGrayBase64(screen, _config.image_config.stroll_icon)
  }
  if (imagePoint) {
    region = [
      Math.floor(imagePoint.left), Math.floor(imagePoint.top),
      imagePoint.width(), imagePoint.height()
    ]
    if (region[0] + region[2] > _config.device_width) {
      region[2] = _config.device_width - region[0]
    }
    if (region[1] + region[3] > _config.device_height) {
      region[3] = _config.device_height - region[1]
    }
    if (configImageFail) {
      logInfo(['找到目标区域，截图保存：{}', JSON.stringify(region)])
      let croppedImage = images.clip(images.cvtColor(images.grayscale(screen), 'GRAY2BGRA'), region[0], region[1], region[2], region[3])
      _config.overwrite('image_config.stroll_icon', images.toBase64(croppedImage))
    }
    refillStrollInfo(region)
    _commonFunctions.ensureRegionInScreen(region)
    return true
  }
  return false
}

function regenerateStrollButton () {
  if (!_config.image_config.stroll_icon && !localOcrUtil.enabled) {
    warnInfo(['请配置逛一逛按钮图片或者手动指定逛一逛按钮区域'], true)
    return false
  }
  let screen = _commonFunctions.checkCaptureScreenPermission()
  if (!screen) {
    errorInfo(['获取截图失败'])
    return false
  }
  YoloTrainHelper.saveImage(screen, '识别逛一逛按钮')
  let successful = true
  if (YoloDetection.enabled) {
    successful = regenerateByYolo(screen)
  }
  if (!successful && !(successful = regenerateByOcr(screen))) {
    successful = regenerateByImg(screen)
  }
  return successful
}
