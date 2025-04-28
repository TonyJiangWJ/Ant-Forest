let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let formatDate = require('./DateUtil.js')
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo
} = singletonRequire('LogUtils')
let _commonFunctions = singletonRequire('CommonFunction')
let automator = singletonRequire('Automator')
let warningFloaty = singletonRequire('WarningFloaty')
let OpenCvUtil = require('./OpenCvUtil.js')
let localOcrUtil = require('./LocalOcrUtil.js')
let YoloDetection = singletonRequire('YoloDetectionUtil')

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
      let currentPkg = _commonFunctions.myCurrentPackage()
      errorInfo('错误位置：当前未打开支付宝，' + currentPkg)
      if (currentPkg.indexOf('huawei') > -1) {
        errorInfo('华为手机如果提示无法打开支付宝，手机的设置查找 安全管控 - 支付保护中心 将支付宝的开关关闭即可。详见常见问题', true)
      }
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
    // if (this.checkIsInFriendListByImg(1, true)) {
    //   errorInfo('错误位置：当前所在位置为好友排行榜')
    //   return false
    // }
    if (_config.home_ui_content.indexOf('小队能量') < 0) {
      _config.overwrite('home_ui_content', _config.home_ui_content + '|小队能量.*')
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
    let youGet = this.widgetGetOne('你收取TA.*')
    if (youGet) {
      let bd = youGet.bounds()
      let region = [bd.left - 5, bd.top - 5, bd.right - bd.left + 10, (bd.bottom - bd.top) * 2.2]
      let energySum = this.widgetGetOne(/\D*\d+g/, null, null, false, matcher => matcher.boundsInside(region[0], region[1], region[0] + region[2], region[1] + region[3]))
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
    if (_config.has_summary_widget || this.widgetCheck('你收取TA.*', 500)) {
      _config.has_summary_widget = true
      result = this.getYouCollectEnergyByWidget()
    } else {
      _config.has_summary_widget = false
      result = this.getYouCollectEnergyByList()
    }
    result = parseInt(result)
    return isNaN(result) ? 0 : result
  }

  this.getFriendCurrentEnergy = function () {
    let friendGet = this.widgetGetOne('TA收取你.*', 1000)
    if (friendGet) {
      try {
        let container = friendGet.parent().child(0).child(0)
        if (container) {
          return container.text().match(/\d+/)
        }
      } catch (e) {
        //
      }
    }
    return 0
  }

  function getOcrRegionByYolo (screen) {
    if (!YoloDetection.enabled) {
      return null
    }
    let result = YoloDetection.forward(screen, { labelRegex: 'energy_ocr' })
    if (result && result.length > 0) {
      let bounds = result[0]
      return [bounds.x, bounds.y, bounds.width, bounds.height]
    }
    return null
  }

  this.getCurrentEnergy = function () {
    if (!localOcrUtil.enabled) {
      let energyWidget = this.widgetGetOne(/\d+g/, null, false, false, m => m.boundsInside(_config.device_width / 2, 0, _config.device_width, _config.device_width * 0.4))
      let result = null
      if (energyWidget) {
        if (energyWidget.desc()) {
          result = energyWidget.desc().match(/\d+/)
        } else {
          result = energyWidget.text().match(/\d+/)
        }
        result = parseInt(result)
        return isNaN(result) ? -1 : result
      }
      warnInfo(['当前支付宝不支持控件获取能量值，请下载支持OCR的AutoJS版本'])
      return 0
    }
    let screen = _commonFunctions.captureScreen()
    let ocrRegion = getOcrRegionByYolo(screen) || [_config.device_width * 0.6, _config.device_height * 0.05, _config.device_width * 0.4, _config.device_height * 0.2]
    warningFloaty.addRectangle('OCR识别能量值区域:', ocrRegion)
    let recognizeResult = localOcrUtil.recognizeWithBounds(screen, ocrRegion, /\d+/)
    warningFloaty.clearAll()
    return getValidEnergy(recognizeResult)
  }

  function getValidEnergy (recognizeResult) {
    if (recognizeResult && recognizeResult.length > 0) {
      debugInfo(['ocr 识别能量数据文本：{}', JSON.stringify(recognizeResult)])
      let unclearEnergy = 0
      let clearEnergy = 0
      recognizeResult.forEach(recoResult => {
        if (!recoResult) {
          return
        }
        let result = recoResult.label
        let unclear = false
        result = result.match(/(\d+)(g)?/)
        if (!result) {
          return
        }
        let energyStr = result[1]
        if (!result[2]) {
          unclear = true
          warnInfo(['ocr识别未能识别到g单位，能量值可能不准确'])
          if (result[1].endsWith('9')) {
            energyStr = result[1].substring(0, result[1].length - 1)
            warnInfo(['ocr识别未能识别到g单位，且能量值结尾为9，可能将g识别成了9 进行截断处理：{} => {}', result[1], energyStr])
          }
        }
        let energy = parseInt(energyStr)
        if (!isNaN(energy)) {
          if (unclear) {
            unclearEnergy = energy
          } else {
            clearEnergy = energy
          }
        }
      })
      return clearEnergy > 0 ? clearEnergy : unclearEnergy
    }
    warnInfo(['ocr识别能量值失败'])
    return 0
  }

  this.findWateringBtn = function () {
    let screen = _commonFunctions.checkCaptureScreenPermission()
    if (!screen) {
      warnInfo(['获取截图失败', true])
      return
    }
    if (YoloDetection.enabled) {
      let result = YoloDetection.forward(screen, { labelRegex: 'water' })
      if (result && result.length > 0) {
        let bounds = result[0]
        return {
          centerX: bounds.centerX,
          centerY: bounds.centerY
        }
      }
      warnInfo(['yolo查找浇水按钮失败，降级为图片查找'])
    }
    if (_config.image_config.water_icon) {
      let point = OpenCvUtil.findByGrayBase64(screen, _config.image_config.water_icon)
      if (!point) {
        warnInfo(['普通找图未找到目标，请通过可视化配置修改 浇水 按钮图片'])
        point = OpenCvUtil.findBySIFTGrayBase64(screen, _config.image_config.water_icon)
      }
      if (point) {
        return {
          centerX: point.centerX(),
          centerY: point.centerY(),
        }
      } else if (localOcrUtil.enabled) {
        debugInfo('尝试使用OCR识别浇水按钮')
        let wateringBtn = localOcrUtil.recognizeWithBounds(screen, null, '^浇水$')
        if (wateringBtn && wateringBtn.length > 0) {
          let point = wateringBtn[0].bounds
          return {
            centerX: point.centerX(),
            centerY: point.centerY(),
          }
        }
      }
    } else {
      warnInfo(['请通过可视化配置修改 浇水 按钮图片', true])
    }
    return null
  }

  /**
   * 给好友浇水
   */
  this.wateringFriends = function () {
    let wateringWidget = this.findWateringBtn()
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
      sleep(1000)
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
          let noticeWidget = this.widgetGetOne('提醒TA来收.*', 1000)
          if (noticeWidget) {
            let noticeBounds = noticeWidget.bounds()
            if (noticeBounds) {
              let screen = _commonFunctions.checkCaptureScreenPermission()
              if (screen) {
                let color = '#1D9F4E'
                let checkRegion = [noticeBounds.left, noticeBounds.top, config.device_width / 2, noticeBounds.height()]
                let point = images.findColor(screen, color, { region: checkRegion })
                if (point) {
                  automator.click(point.x, point.y)
                }
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
          if (_config.useBaiduOcr) {
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

  /**
   * @deprecated
   * @param {*} tryCount 
   * @returns 
   */
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
    if (_commonFunctions.hasWateredCooperation()) {
      return
    }
    if (_config.enable_watering_cooperation && _config.watering_cooperation_name && _config.image_config.watering_cooperation) {
      let todayIncrease = _commonFunctions.getTodaysIncreasedEnergy()
      debugInfo(['今日收集能量：{}, 合种浇水阈值：{}', todayIncrease, _config.watering_cooperation_threshold])
      if (todayIncrease < _config.watering_cooperation_threshold) {
        return
      }

      let screen = _commonFunctions.checkCaptureScreenPermission()
      if (screen) {
        let point = null
        if (YoloDetection.enabled) {
          let yoloPoints = YoloDetection.forward(screen, { confidence: _config.yolo_confidence || 0.7, labelRegex: 'cooperation' })
          if (yoloPoints && yoloPoints.length > 0) {
            let p = yoloPoints[0]
            point = {
              centerX: () => p.centerX,
              centerY: () => p.centerY
            }
          } else {
            debugInfo(['未能通过yolo找到合种入口'])
          }
        }
        if (!point) {
          point = OpenCvUtil.findByGrayBase64(screen, _config.image_config.watering_cooperation)
        }
        if (!point) {
          warnInfo(['通过图片识别无法找到合种入口，请在查找图片设置中正确配置入口图片'])
          if (localOcrUtil.enabled) {
            debugInfo('尝试通过OCR获取合种入口')
            let cooperation = localOcrUtil.recognizeWithBounds(screen, null, '合种')
            if (cooperation && cooperation.length > 0) {
              point = cooperation[0].bounds
              debugInfo('OCR找到了 合种')
            }
          }
        }
        if (point) {
          automator.click(point.centerX(), point.centerY())
          let checkPoint = this.widgetWaiting('说点啥吧')
          if (checkPoint) {
            debugInfo('进入浇水界面成功', true)
            sleep(500)
            this.wateringCooperationPlant()
          }
        } else {
          debugInfo('未找进入合种的入口', true)
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
      let title = this.widgetGetById(/.*id\/(h5_tv|textView)_title/)
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
        _commonFunctions.setWateredCooperation()
      } else {
        let wateredWidget = this.widgetGetOne(/.*合种浇水已达上限，\n.*/, 2000)
        if (wateredWidget) {
          _commonFunctions.setWateredCooperation()
          warnInfo('今日该合种浇水已经达到上限', true)
        }
      }
    } else {
      debugInfo(['未找到浇水按钮', true])
    }
    debugInfo('浇水执行完毕')
    automator.back()
  }

  this.checkIsDuplicateCardUsed = function () {
    let target = null
    if ((target = this.widgetGetOne(/^(\d{2}:\d{2})|(\d+天)$/, 1000, true, null, matcher => matcher.boundsInside(0, 0, _config.device_width / 2, _config.device_height * 0.6))) != null) {
      debugInfo(['发现双击卡使用控件，倒计时：{}', target.content])
      warningFloaty.addRectangle('双击卡倒计时:' + target.content, this.boundsToRegion(target.target.bounds()))
      _config.double_check_collect = true
      _config._double_click_card_used = true
      return true
    }
    return false
  }

  this.checkAndUseDuplicateCard = function () {
    if (!_config.use_duplicate_card) {
      debugInfo('当前未启用双击卡')
      return false
    }
    if (!checkInUsingTimeRange()) {
      return false
    }
    if (!this.checkIsDuplicateCardUsed()) {
      let target = findByGrayBase64()
      if (!target) {
        target = ocrCheckTarget(1)
      }
      if (target) {
        warningFloaty.addRectangle('用道具', this.boundsToRegion(target.bounds))
        automator.clickRandomRegion(this.boundsToRegion(target.bounds))
        sleep(500)
        let useConfirm = this.widgetGetOne('立即使用')
        if (useConfirm) {
          warningFloaty.addRectangle('立即使用', this.boundsToRegion(useConfirm.bounds()))
          automator.clickRandomRegion(this.boundsToRegion(useConfirm.bounds()))
          sleep(500)
          let useSuccess = this.checkIsDuplicateCardUsed()
          // 部分人反馈有动画需要等待，增加延迟
          sleep(1500)
          return useSuccess
        }
      } else {
        warningFloaty.addText('OCR未找到目标', { x: 300, y: 1000 })
        warnInfo('OCR未找到目标位置', true)
      }
    } else {
      debugInfo(['双击卡已使用'])
      return true
    }

    function findByGrayBase64 () {
      if (!_config.image_config.use_item) {
        return null
      }
      let screen = _commonFunctions.checkCaptureScreenPermission()
      let find = OpenCvUtil.findByGrayBase64(screen, _config.image_config.use_item)
      if (find) {
        debugInfo(['通过找图找到了目标按钮'])
        return { bounds: find }
      }
      debugInfo(['找图方式未找到目标，尝试OCR'])
      return null
    }

    function ocrCheckTarget (tryTime) {
      tryTime = tryTime || 1
      let screen = _commonFunctions.checkCaptureScreenPermission()
      let recognizeResult = localOcrUtil.recognizeWithBounds(screen,
        [0, _config.device_height * 0.5, _config.device_width * 0.5, _config.device_height * 0.4], '用道具')
      if (recognizeResult && recognizeResult.length > 0) {
        return recognizeResult[0]
      } else if (tryTime <= 3) {
        sleep(300)
        return ocrCheckTarget(tryTime + 1)
      }
    }

    function checkInUsingTimeRange () {
      let timeRanges = _config.duplicate_card_using_time_ranges || '00:00-00:50;23:40-23:59;07:10-07:15'
      let currentTime = formatDate(new Date(), 'HH:mm')
      let inRange = timeRanges.split(';').filter(timeRange => {
        let timeRangeArray = timeRange.split('-')
        if (currentTime >= timeRangeArray[0] && currentTime <= timeRangeArray[1]) {
          debugInfo(['当前时间:{} 在双击卡执行范围[{}]内', currentTime, timeRange])
          return true
        }
      }).length > 0
      if (inRange) {
        return true
      }
      debugInfo(['当前时间：{}不在双击卡执行范围[{}]内', currentTime, timeRanges])
      return false
    }
  }

}
ProjectWidgetUtils.prototype = Object.create(_BaseWidgetUtils.prototype)
ProjectWidgetUtils.prototype.constructor = ProjectWidgetUtils

module.exports = ProjectWidgetUtils