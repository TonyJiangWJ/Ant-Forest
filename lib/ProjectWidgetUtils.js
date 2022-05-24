let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let formatDate = require('./DateUtil.js')
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo
} = singletonRequire('LogUtils')
let _commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')

function CollectInfo (widgetInfo) {
  if (widgetInfo.childCount() > 1) {
    this.time = widgetInfo.child(1).text() || widgetInfo.child(1).desc()
    let contentWidget = widgetInfo.child(0)
    if (contentWidget.childCount() === 2) {
      this.targetUser = contentWidget.child(0).text() || contentWidget.child(0).desc()
      this.collectText = contentWidget.child(1).text() || contentWidget.child(1).desc()
    }
  }

  this.getCollected = function () {
    let regex = /^(收取|took)\s*(\d+)g/
    if (regex.test(this.collectText)) {
      return parseInt(regex.exec(this.collectText)[2])
    } else {
      return 0
    }
  }
}

let _BaseWidgetUtils = require('./BaseWidgetUtils.js')

const ProjectWidgetUtils = function () {
  _BaseWidgetUtils.call(this)

  this.checkIsInFriendListByImg = function (checkTime, susspendError, currentImage) {
    let found = false
    let scaleRate = _config.scaleRate
    _config.rank_check_left = _config.rank_check_left || parseInt(190 * scaleRate)
    _config.rank_check_top = _config.rank_check_top || parseInt(170 * scaleRate)
    _config.rank_check_width = _config.rank_check_width || parseInt(750 * scaleRate)
    _config.rank_check_height = _config.rank_check_height || parseInt(200 * scaleRate)
    let checkRegion = [_config.rank_check_left, _config.rank_check_top, _config.rank_check_width, _config.rank_check_height]
    _commonFunctions.ensureRegionInScreen(checkRegion)
    debugInfo(['准备校验区域[{}]颜色是否匹配好友排行榜', JSON.stringify(checkRegion)])
    let start = new Date().getTime()
    let img = null
    checkTime = checkTime || 1

    while (!found && checkTime-- > 0) {
      img = currentImage || _commonFunctions.checkCaptureScreenPermission()
      if (img) {
        currentImage = null
        debugInfo(['图片大小：{}, {}', img.width, img.height])
        if (_config.develop_mode) {
          let rankCheckImg = images.clip(img, checkRegion[0], checkRegion[1], checkRegion[2], checkRegion[3])
          let base64String = images.toBase64(rankCheckImg)
          debugForDev(['好友排行榜校验区域图片base64：「data:image/png;base64,{}」', base64String], false, true)
        }
        let intervalImg = _commonFunctions.convertImageFromSingleChannel(images.inRange(img, '#008814', '#32D564'))
        let checkColorPoints = []
        let checkColorBlack = '#000000'
        let checkColorWhite = '#ffffff'
        let checkWidth = _config.scaleRate * 90
        for (let i = -checkWidth; i <= checkWidth; i += 5) {
          checkColorPoints.push([i, 0, checkColorWhite])
          checkColorPoints.push([i, 5, checkColorBlack])
        }
        let point = images.findMultiColors(intervalImg, checkColorWhite, checkColorPoints, { region: checkRegion, threshold: _config.color_offset })
        if (point) {
          found = true
        }
        if (!found) {
          if (!susspendError) {
            warnInfo('校验排行榜失败')
          }
          if (checkTime > 0) {
            sleep(500)
          }
          if (checkTime === 1) {
            warnInfo('排行榜校验失败多次，尝试自动识别校验区域')
            let points = []
            // 横向约200个像素点
            let limit = 200 * scaleRate / 3
            for (let i = 0; i < limit; i++) {
              points.push([i, 0, checkColorWhite])
            }
            let offset = parseInt(180 * scaleRate)
            let point = images.findMultiColors(intervalImg, checkColorWhite, points, { region: [offset, 50, _config.device_width - offset * 2, _config.device_height * 0.3] })
            if (point) {
              found = true
              _config.rank_check_left = point.x
              _config.rank_check_top = point.y - 10
              _config.rank_check_width = parseInt(200 * scaleRate * 3)
              if (_config.rank_check_width + _config.rank_check_left >= _config.device_width - offset) {
                _config.rank_check_width = _config.device_width - offset - _config.rank_check_left
              }
              _config.rank_check_height = 30
              checkRegion = [_config.rank_check_left, _config.rank_check_top, _config.rank_check_width, _config.rank_check_height]
              debugInfo(['自动识别的排行榜识别区域为：[{}]', JSON.stringify(checkRegion)])
              debugInfo('刷新配置到本地缓存')
              let configStorage = storages.create(_storage_name)
              configStorage.put('rank_check_left', _config.rank_check_left)
              configStorage.put('rank_check_top', _config.rank_check_top)
              configStorage.put('rank_check_width', _config.rank_check_width)
              configStorage.put('rank_check_height', _config.rank_check_height)
            } else {
              warnInfo('自动识别排行榜失败，未识别到匹配内容')
              debugForDev(['自动设置失败，当前图片信息：[data:image/png;base64,{}]', images.toBase64(img)])
            }
          }
        }
      }
    }
    debugInfo(['排行榜判断耗时：{}ms', (new Date().getTime() - start)])
    return found
  }

  /**
   * 校验是否成功进入自己的首页
   */
  this.homePageWaiting = function () {
    if (_commonFunctions.myCurrentPackage() !== _config.package_name) {
      errorInfo('错误位置：当前未打开支付宝，' + _commonFunctions.myCurrentPackage())
      return false
    }
    if (this.widgetCheck(_config.stroll_end_ui_content || '返回我的森林', 500)) {
      errorInfo('错误位置：当前所在位置为逛一逛结束界面')
      return false
    }
    if (this.widgetCheck(_config.friend_home_check_regex || 'TA收取你', 500)) {
      errorInfo('错误位置：当前所在位置为好友首页')
      return false
    }
    if (this.checkIsInFriendListByImg(1, true)) {
      errorInfo('错误位置：当前所在位置为好友排行榜')
      return false
    }
    return this.widgetWaiting(_config.home_ui_content, '个人首页')
  }

  /**
   * 校验是否成功进入好友首页
   */
  this.friendHomeWaiting = function () {
    return this.widgetWaiting(_config.friend_home_check_regex, '好友首页')
  }

  /**
   * 校验是否成功进入好友排行榜
   */
  this.friendListWaiting = function (currentImage) {
    if (_commonFunctions.myCurrentPackage() !== _config.package_name) {
      errorInfo('错误位置：当前未打开支付宝，' + _commonFunctions.myCurrentPackage())
      return false
    }
    return this.checkIsInFriendListByImg(5, false, currentImage)
  }

  this.ensureRankListLoaded = function (checkTime) {
    let start = new Date().getTime()
    let img = _commonFunctions.checkCaptureScreenPermission(3)
    let color = '#969696'
    let scaleRate = _config.scaleRate
    let loaded = false
    let check_region = [parseInt(70 * scaleRate), _config.rank_check_top + _config.rank_check_height, 200, 300]
    debugInfo(['准备校验排行榜是否加载完毕，检测区域：{} 是否匹配灰度颜色#969696', JSON.stringify(check_region)])
    while (!loaded && checkTime-- > 0) {
      let point = images.findColor(images.grayscale(img), color, { region: check_region })
      if (point) {
        debugInfo(['检测到了排行榜加载完毕的检测点：{}', JSON.stringify(point)])
        loaded = true
      } else {
        debugInfo('未检测到排行榜加载完毕的检测点，等待1秒')
        sleep(1000)
        img = _commonFunctions.checkCaptureScreenPermission(3)
      }
    }
    debugInfo(['排行榜加载状态:{} 判断耗时：{}ms', loaded, (new Date().getTime() - start)])
    return loaded
  }

  this.getYouCollectEnergyByWidget = function () {
    let youGet = this.widgetGetOne('你收取TA')
    if (youGet && youGet.parent) {
      let youGetParent = youGet.parent()
      let childSize = youGetParent.children().length
      debugForDev('你收取TA父级控件拥有子控件数量：' + childSize)
      let energySum = youGetParent.child(childSize - 1)
      if (energySum) {
        if (energySum.desc()) {
          return energySum.desc().match(/\d+/)
        } else if (energySum.text()) {
          return energySum.text().match(/\d+/)
        }
      }
    } else {
      config.has_summary_widget = false
    }
  }

  this.getYouCollectEnergyByList = function () {
    let today = this.widgetGetOne('今天|Today', 500, false, true)
    if (today !== null) {
      let container = today.parent()
      if (container) {
        let collectInfos = []
        let hasNext = true
        let timeRange = [formatDate(new Date(), 'HH:mm'), formatDate(new Date(new Date().getTime() - 60000), 'HH:mm')]
        container.children().forEach((elem, idx) => {
          if (hasNext) {
            let collectInfo = new CollectInfo(elem)
            if (collectInfo.time && timeRange.indexOf(collectInfo.time) < 0) {
              hasNext = false
            } else if (!_config.my_id && collectInfo.targetUser !== 'TA的好友' || collectInfo.targetUser === _config.my_id) {
              collectInfos.push(collectInfo)
            }
          }
        })
        // _config.show_debug_log = true
        debugInfo(['我当前的收集信息：{}', JSON.stringify(collectInfos)])
        return collectInfos.length > 0 ? collectInfos.map(collect => collect.getCollected()).reduce((a, b) => a = a + b) : 0
      }
    }
    // console.show()
    return 0
  }

  this.getYouCollectEnergy = function () {
    let result = null
    if (_config.has_summary_widget || this.widgetCheck('你收取TA', 500)) {
      _config.has_summary_widget = true
      result = this.getYouCollectEnergyByWidget()
    } else {
      _config.has_summary_widget = false
      result = this.getYouCollectEnergyByList()
    }
    result = parseInt(result)
    return isNaN(result) ? 0 : result
  }

  this.getFriendEnergy = function () {
    let energyWidget = this.widgetGetById(_config.energy_id || 'J_userEnergy')
    let result = null
    if (energyWidget) {
      if (energyWidget.desc()) {
        result = energyWidget.desc().match(/\d+/)
      } else {
        result = energyWidget.text().match(/\d+/)
      }
    }
    result = parseInt(result)
    return isNaN(result) ? 0 : result
  }

  this.checkAndClickWatering = function () {
    // 直接通过偏移量获取浇水按钮
    let jTreeWarp = this.widgetGetById('J_tree_dialog_wrap')
    let target = null
    if (jTreeWarp) {
      let warpBounds = jTreeWarp.bounds()
      target = {
        centerX: parseInt(warpBounds.left + 0.4 * warpBounds.width()),
        centerY: parseInt(warpBounds.bottom - 0.07 * warpBounds.height())
      }
    }
    return target
  }

  /**
   * 给好友浇水
   */
  this.wateringFriends = function () {
    let wateringWidget = this.checkAndClickWatering()
    if (wateringWidget) {
      automator.click(wateringWidget.centerX, wateringWidget.centerY)
      debugInfo('assemment wateringWidget:' + JSON.stringify(wateringWidget))
      sleep(500)
      let giveHimButton = null
      let give_content = _config.do_watering_button_content || '送给\\s*TA|浇水送祝福'

      let targetWateringAmount = _config.targetWateringAmount || 10
      targetWateringAmount += ''
      if (['10', '18', '33', '66'].indexOf(targetWateringAmount) < 0) {
        errorInfo(['浇水数配置有误：{}', _config.targetWateringAmount])
        targetWateringAmount = '10'
      }
      infoLog(['准备浇水：「{}」克', targetWateringAmount])
      let wateringAmountWidgetRegex = '^' + targetWateringAmount + '(g|克)$'
      let wateringAmountTargets = this.widgetGetAll(wateringAmountWidgetRegex, 3000)
      let target = null
      if (wateringAmountTargets) {
        wateringAmountTargets.forEach(b => {
          if (target === null) {
            if (b.isClickable() && b.getClassName() === 'android.widget.Button') {
              target = b
            } else {
              debugInfo(['控件不匹配浇水能量配置：clickable：{}, className: {}, depth:{}', b.isClickable(), b.className(), b.depth()])
            }
          }
        })
      }
      if (target) {
        // 查找是否勾选了提醒
        try {
          let noticeBounds = target.parent().child(7).child(0).bounds()
          if (noticeBounds) {
            let screen = _commonFunctions.checkCaptureScreenPermission()
            if (screen) {
              let color = '#1E9F4D'
              let checkPoints = []
              for (let i = 0; i < 10; i++) {
                checkPoints.push([i, 0, color])
              }
              let point = images.findMultiColors(screen, color, checkPoints, { region: [noticeBounds.left, noticeBounds.top, noticeBounds.width(), noticeBounds.height()] })
              if (point) {
                automator.click(point.x, point.y)
              }
            }
          }
        } catch (e) {
          console.error('查找按钮异常' + e)
        }
        automator.clickCenter(target)
        sleep(200)
      } else {
        warnInfo('未找到浇水数量选项, 浇水失败')
        return false
      }
      if (this.widgetCheck(give_content, 5000) && (giveHimButton = this.widgetGetOne(give_content))) {
        debugInfo('found watering to TA:' + giveHimButton.bounds())
        let bounds = giveHimButton.bounds()
        sleep(400)
        automator.click(parseInt(bounds.left + bounds.width() / 2), parseInt(bounds.top + bounds.height() / 2))
        sleep(500)
        return true
      } else {
        debugInfo(['没有找到 {} 按钮', give_content])
      }
    } else {
      errorInfo('未找到浇水按钮')
    }
  }


  this.reachBottom = function (grayImg) {
    let start = new Date().getTime()
    let region = [_config.bottom_check_left, _config.bottom_check_top, _config.bottom_check_width, _config.bottom_check_height]
    _commonFunctions.ensureRegionInScreen(region)
    let color = _config.bottom_check_gray_color || '#999999'
    debugInfo(['准备校验排行榜底部区域:{} 颜色：{}', JSON.stringify(region), color])
    let flag = false
    if (images.findColor(grayImg, color, { region: region, threshold: 4 })) {
      flag = true
      _config.bottom_check_succeed = true
    }
    debugInfo(['判断排行榜底部:{} 耗时：{}ms', flag, new Date().getTime() - start])
    return flag
  }

  this.tryFindBottomRegion = function (grayImg) {
    let scaleRate = _config.scaleRate
    // 如果未成功识别过排行榜底部区域 则进行自动配置
    if (!_config.bottom_check_succeed) {
      // 首先校验是否存在邀请按钮
      let detectRegion = [parseInt(800 * scaleRate), parseInt(_config.device_height * 0.8), parseInt(100 * scaleRate), parseInt(_config.device_height * 0.19)]
      _commonFunctions.ensureRegionInScreen(detectRegion)
      debugInfo(['准备识别区域中是否可能匹配排行榜底部:{}', JSON.stringify(detectRegion)])
      let color = '#999999'
      let point = images.findColor(grayImg, color, { region: detectRegion, threshold: 4 })
      if (point /* false */) {
        _config.bottom_check_left = point.x - 5
        _config.bottom_check_top = point.y - 5
        _config.bottom_check_width = 10
        _config.bottom_check_height = 10
        _config.bottom_check_succeed = true
      } else {
        debugInfo('未能自动识别到排行榜底部识别区')
        // 然后校验 “没有更多了” 是否存在
        detectRegion = [parseInt(600.0 / 1080 * scaleRate * _config.device_width), _config.device_height - parseInt(200 * scaleRate), parseInt(50 * scaleRate), 190 * scaleRate]
        _commonFunctions.ensureRegionInScreen(detectRegion)
        let checkPoints = []
        for (let x = 0; x < 30 * scaleRate; x++) {
          checkPoints.push([x, 0, color])
        }
        for (let y = 0; y < 3; y++) {
          checkPoints.push([parseInt(15 * scaleRate), parseInt(12 * scaleRate) + y, color])
        }
        debugInfo(['尝试多点找色识别区域：「{}」点集合：「{}」', JSON.stringify(detectRegion), JSON.stringify(checkPoints)])
        // 多点找色需要彩色原图
        grayImg = _commonFunctions.checkCaptureScreenPermission(3)
        point = images.findMultiColors(grayImg, color, checkPoints, { region: detectRegion })
        if (point) {
          _config.bottom_check_left = point.x - 5
          _config.bottom_check_top = point.y - 5
          _config.bottom_check_width = 20
          _config.bottom_check_height = 20
          _config.bottom_check_succeed = true
          if (_config.useOcr) {
            debugInfo('尝试使用百度OCR接口识别排行榜底部区域, hhhh 骗你的 速度太慢了')
          }
        } else {
          debugInfo('未能自动识别到排行榜底部识别区')
        }
      }
      if (_config.bottom_check_succeed) {
        detectRegion = [_config.bottom_check_left, _config.bottom_check_top, _config.bottom_check_width, _config.bottom_check_height]
        debugInfo(['自动识别的排行榜底部识别区域为：[{}] 刷新配置到本地缓存', JSON.stringify(detectRegion)])
        let configStorage = storages.create(_storage_name)
        _config.bottom_check_gray_color = color
        configStorage.put('bottom_check_left', _config.bottom_check_left)
        configStorage.put('bottom_check_top', _config.bottom_check_top)
        configStorage.put('bottom_check_width', _config.bottom_check_width)
        configStorage.put('bottom_check_height', _config.bottom_check_height)
        configStorage.put('bottom_check_gray_color', _config.bottom_check_gray_color)
        configStorage.put('bottom_check_succeed', _config.bottom_check_succeed)
      }
    }
  }

  this.enterFriendList = function (tryCount) {
    tryCount = tryCount || 1
    let target = this.widgetGetOne(_config.enter_friend_list_ui_content)
    if (target) {
      target.click()
      return
    }
    if (tryCount > 3) {
      return
    }
    warnInfo(['未找到 {} 等待一秒钟后重试, 尝试次数：{}', _config.enter_friend_list_ui_content, tryCount])
    // 未找到查看更多好友，等待1秒钟后重试
    sleep(1000)
    this.enterFriendList(++tryCount)
  }

  this.enterCooperationPlantAndDoWatering = function () {
    if (_commonFunctions.hasWateredCoopration()) {
      return
    }
    if (_config.enable_watering_cooperation && _config.watering_cooperation_name && _config.stroll_button_left && !_config.stroll_button_regenerate) {
      let todayIncrease = _commonFunctions.getTodaysIncreasedEnergy()
      debugInfo(['今日收集能量：{}, 合种浇水阈值：{}', todayIncrease, _config.watering_cooperation_threshold])
      if (todayIncrease < _config.watering_cooperation_threshold) {
        return
      }
      let region = [_config.stroll_button_left, _config.stroll_button_top - 400, _config.stroll_button_width, _config.stroll_button_height + 400]
      let screen = _commonFunctions.checkCaptureScreenPermission()
      if (screen) {
        let point = images.findColor(screen, '#b6834a', { region: region, threshold: 20 })
        if (point) {
          automator.click(point.x, point.y)
          let checkPoint = this.widgetWaiting('说点啥吧')
          if (checkPoint) {
            debugInfo('进入浇水界面成功', true)
            sleep(500)
            this.wateringCooperationPlant()
          }
        } else {
          debugInfo('未找进入合种的检测点', true)
        }
      }
    }
  }

  this.wateringCooperationPlant = function () {
    let pageWidget = this.widgetGetOne(/\d+\/\d+/, null, true)
    if (pageWidget) {
      let regexExec = /(\d+)\/(\d+)/.exec(pageWidget.content)
      let currentPage = parseInt(regexExec[1])
      let totalPage = parseInt(regexExec[2])
      debugInfo(['当前页：{} 总页数：{}', currentPage, totalPage])
      let title = this.widgetGetById(/.*id\/h5_tv_title/)
      if (title) {
        let plantName = title.desc() || title.text()
        debugInfo(['当前合种名称：{}', plantName])
        if (plantName === _config.watering_cooperation_name) {
          debugInfo('找到了目标合种：' + plantName)
          return this.doWateringToCooperationPlant()
        }
      }
      if (currentPage < totalPage) {
        let nextButton = pageWidget.target.parent().child(2)
        if (nextButton) {
          automator.clickCenter(nextButton)
          sleep(1500)
          this.wateringCooperationPlant()
        }
      } else {
        warnInfo('已到达最后一页，未匹配到目标，无法自动浇水', true)
        automator.back()
      }
    }
  }

  this.doWateringToCooperationPlant = function () {
    let screen = _commonFunctions.checkCaptureScreenPermission()
    let point = images.findColor(screen, '#36bbff', { region: [_config.device_width * 0.8, _config.device_height - 300, _config.device_width * 0.19, 280], threshold: 10 })
    if (point) {
      automator.click(point.x, point.y)
      let editWidget = className('android.widget.EditText').findOne(_config.timeout_findOne)
      if (editWidget) {
        editWidget.setText(_config.watering_cooperation_amount || 520)
        let confirmButton = this.widgetGetOne('浇水')
        if (confirmButton) {
          automator.clickCenter(confirmButton)
          sleep(1000)
        }
        _commonFunctions.setWateredCoopration()
      } else {
        let wateredWidget = this.widgetGetOne(/.*合种浇水已达上限，\n.*/, 2000)
        if (wateredWidget) {
          _commonFunctions.setWateredCoopration()
          warnInfo('今日该合种浇水已经达到上限', true)
        }
      }
    } else {
      debugInfo(['未找到浇水按钮', true])
    }
    debugInfo('浇水执行完毕')
    automator.back()
  }
}
ProjectWidgetUtils.prototype = Object.create(_BaseWidgetUtils.prototype)
ProjectWidgetUtils.prototype.constructor = ProjectWidgetUtils

module.exports = ProjectWidgetUtils