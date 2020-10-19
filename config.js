/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-09 20:42:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-10-09 15:29:45
 * @Description: 
 */
'ui';

let currentEngine = engines.myEngine().getSource() + ''
let isRunningMode = currentEngine.endsWith('/config.js') && typeof module === 'undefined'
let is_pro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
let default_config = {
  password: '',
  is_alipay_locked: false,
  alipay_lock_password: '',
  color_offset: 20,
  // 是否显示状态栏的悬浮窗，避免遮挡，悬浮窗位置可以通过后两项配置修改 min_floaty_x[y]
  show_small_floaty: true,
  not_lingering_float_window: false,
  min_floaty_x: 150,
  min_floaty_y: 20,
  min_floaty_color: '#00ff00',
  min_floaty_text_size: 8,
  help_friend: true,
  is_cycle: false,
  cycle_times: 10,
  never_stop: false,
  reactive_time: 60,
  timeout_unlock: 1000,
  timeout_findOne: 1000,
  timeout_existing: 8000,
  // 异步等待截图，当截图超时后重新获取截图 默认开启
  async_waiting_capture: true,
  capture_waiting_time: 500,
  max_collect_wait_time: 60,
  show_debug_log: true,
  show_engine_id: false,
  develop_mode: false,
  develop_saving_mode: false,
  check_device_posture: false,
  check_distance: false,
  posture_threshod_z: 6,
  // 开发用开关，截图并保存一些图片
  // 保存倒计时图片
  cutAndSaveCountdown: false,
  // 保存好友页面可收取和可帮助图片
  cutAndSaveTreeCollect: false,
  auto_lock: false,
  lock_x: 150,
  lock_y: 970,
  // 是否根据当前锁屏状态来设置屏幕亮度，当锁屏状态下启动时 设置为最低亮度，结束后设置成自动亮度
  auto_set_brightness: false,
  // 锁屏启动关闭提示框
  dismiss_dialog_if_locked: true,
  request_capture_permission: true,
  // 是否保存日志文件，如果设置为保存，则日志文件会按时间分片备份在logback/文件夹下
  save_log_file: true,
  // 异步写入日志文件
  async_save_log_file: true,
  back_size: '100',
  enable_call_state_control: false,
  collect_self_only: false,
  not_collect_self: false,
  // 当有收集或者帮助后 重新检查排行榜
  recheck_rank_list: true,
  base_on_image: true,
  // 自动判断基于图像还是基于控件识别
  auto_set_img_or_widget: false,
  // 是否基于图像分析是否到达底部
  checkBottomBaseImg: true,
  // 基于图像分析时 在好友排行榜下拉的次数，因为无法辨别是否已经达到了最低点
  friendListScrollTime: 30,
  // 基于像素点个数判断是否可收取，默认关闭
  check_finger_by_pixels_amount: false,
  // 可收取小手指绿色像素点个数，1080P分辨率是这个数值，其他分辨率请自己修改	
  finger_img_pixels: 1900,
  thread_pool_size: 4,
  thread_pool_max_size: 8,
  thread_pool_queue_size: 16,
  thread_pool_waiting_time: 5,
  white_list: [],

  // 单脚本模式 是否只运行一个脚本 不会同时使用其他的 开启单脚本模式 会取消任务队列的功能。
  // 比如同时使用蚂蚁庄园 则保持默认 false 否则设置为true 无视其他运行中的脚本
  single_script: false,
  // 这个用于控制列表滑动是否稳定 不用去修改它
  friendListStableCount: 3,
  // 滑动起始底部高度
  bottomHeight: 200,
  // 是否使用模拟的滑动，如果滑动有问题开启这个 当前默认关闭 经常有人手机上有虚拟按键 然后又不看文档注释的
  useCustomScrollDown: true,
  // 排行榜列表下滑速度 200毫秒 不要太低否则滑动不生效 仅仅针对useCustomScrollDown=true的情况
  scrollDownSpeed: 200,
  // 配置帮助收取能量球的颜色，用于查找帮助收取的能量球
  can_collect_color: '#1da06a',
  can_help_color: '#f99236',
  helpBallColors: ['#f99236', '#f7af70'],
  // 是否开启自动浇水 每日收集某个好友达到下一个阈值之后会进行浇水
  wateringBack: true,
  // 浇水阈值40克
  wateringThreshold: 40,
  // 浇水数量
  targetWateringAmount: 10,
  // 配置不浇水的黑名单
  wateringBlackList: [],
  // 延迟启动时延 5秒 悬浮窗中进行的倒计时时间
  delayStartTime: 5,
  // 是否使用百度的ocr识别倒计时
  useOcr: false,
  // 使用自建tesserac_ocr服务
  useTesseracOcr: true,
  // 识别像素点阈值 识别到倒计时的绿色像素点 像素点越多数字相对越小，设置大一些可以节省调用次数 毕竟每天只有500次
  ocrThreshold: 2600,
  autoSetThreshold: true,
  // 是否记录图片base64信息到日志中
  saveBase64ImgInfo: false,
  // ApiKey和SecretKey都来自百度AI平台 需要自己申请
  apiKey: '',
  // 秘钥
  secretKey: '',
  my_id: '',
  home_ui_content: '查看更多动态.*',
  friend_home_check_regex: '浇水',
  friend_home_ui_content: 'TA收取你.*|今天|浇水',
  friend_name_getting_regex: '(.*)的蚂蚁森林',
  // 废弃
  friend_list_ui_content: '(周|总)排行榜',
  // 用于判断是否在好友排行榜
  friend_list_id: '.*react-content.*',
  // 查看更多好友的按钮
  enter_friend_list_ui_content: '查看更多好友',
  no_more_ui_content: '没有更多了',
  load_more_ui_content: '查看更多',
  watering_widget_content: '浇水',
  do_watering_button_content: '送给\\s*TA|浇水送祝福',
  using_protect_content: '使用了保护罩',
  collectable_energy_ball_content: '收集能量\\d+克',
  // 排行榜校验区域
  rank_check_left: 250,
  rank_check_top: 250,
  rank_check_width: 550,
  rank_check_height: 130,
  tree_collect_left: 150,
  tree_collect_top: 550,
  tree_collect_width: 800,
  tree_collect_height: 350,
  // 底部校验区域
  bottom_check_left: 600,
  bottom_check_top: 2045,
  bottom_check_width: 30,
  bottom_check_height: 20,
  bottom_check_gray_color: '#999999',
  // 设备分辨率宽高
  device_width: device.width,
  device_height: device.height,
  // 尝试全局点击收集能量，能量球控件无法获取时使用 默认开启
  try_collect_by_multi_touch: false,
  // 直接使用图像分析方式收取和帮助好友
  direct_use_img_collect_and_help: true,
  // 通过霍夫变换识别能量球
  detect_balls_by_hough: true,
  // 是否是AutoJS Pro  需要屏蔽部分功能，暂时无法实现：生命周期监听等 包括通话监听
  is_pro: is_pro,
  // 尝试先逛一逛进行能量收取
  try_collect_by_stroll: true,
  auto_set_bang_offset: true,
  bang_offset: 0,
  limit_runnable_time_range: true,
  // 更新后需要强制执行的标记v1.3.2.5
  updated_temp_flag_1325: true,
  updated_temp_flag_1326: true,
  updated_temp_flag_1327: true,
  thread_name_prefix: 'antforest_'
}
let CONFIG_STORAGE_NAME = 'ant_forest_config_fork_version'
let PROJECT_NAME = '蚂蚁森林能量收集'
let config = {}
let storageConfig = storages.create(CONFIG_STORAGE_NAME)
Object.keys(default_config).forEach(key => {
  let storedVal = storageConfig.get(key)
  if (typeof storedVal !== 'undefined') {
    config[key] = storedVal
  } else {
    config[key] = default_config[key]
  }
})
if (typeof config.collectable_energy_ball_content !== 'string') {
  config.collectable_energy_ball_content = default_config.collectable_energy_ball_content
}
config.recalculateRegion = () => {
  if (config.device_height > 10 && config.device_width > 10) {
    if (config.bottom_check_top > config.device_height || config.bottom_check_top <= 0) {
      config.bottom_check_top = config.device_height - 50
      config.bottom_check_width = config.device_width - 50
      storageConfig.put('bottom_check_top', config.bottom_check_top)
      storageConfig.put('bottom_check_width', config.bottom_check_width)
    }

    if (config.rank_check_left + config.rank_check_width > config.device_width) {
      config.rank_check_left = 100
      config.rank_check_width = 100
      storageConfig.put('rank_check_left', config.rank_check_left)
      storageConfig.put('rank_check_width', config.rank_check_width)
    }
  }
}

resetConfigsIfNeeded()
if (!isRunningMode) {
  if (!currentEngine.endsWith('/config.js')) {
    config.recalculateRegion()
  }
  module.exports = function (__runtime__, scope) {
    if (typeof scope.config_instance === 'undefined') {
      config.getReactiveTime = () => {
        let reactiveTime = config.reactive_time
        if (isNaN(reactiveTime)) {
          let rangeRegex = /^(\d+)-(\d+)$/
          let result = rangeRegex.exec(reactiveTime)
          let start = parseInt(result[1])
          let end = parseInt(result[2])
          return parseInt(start + Math.random() * (end - start))
        } else {
          return reactiveTime
        }
      }
      scope.config_instance = {
        config: config,
        default_config: default_config,
        storage_name: CONFIG_STORAGE_NAME,
        project_name: PROJECT_NAME
      }
      events.broadcast.on(CONFIG_STORAGE_NAME + 'config_changed', function (params) {
        let newConfig = params.config
        let currentId = engines.myEngine().id
        let senderId = params.id
        if (currentId !== senderId) {
          console.verbose(currentId + ' 获取从' + senderId + '得到的新的配置信息' + JSON.stringify(newConfig))
          Object.assign(scope.config_instance.config, newConfig)
        }
      })
    }
    return scope.config_instance
  }
} else {

  importClass(android.text.TextWatcher)
  importClass(android.widget.AdapterView)
  importClass(android.view.View)
  importClass(android.view.MotionEvent)
  importClass(java.util.concurrent.LinkedBlockingQueue)
  importClass(java.util.concurrent.ThreadPoolExecutor)
  importClass(java.util.concurrent.TimeUnit)
  importClass(java.util.concurrent.ThreadFactory)
  importClass(java.util.concurrent.Executors)

  let threadPool = new ThreadPoolExecutor(4, 4, 60, TimeUnit.SECONDS, new LinkedBlockingQueue(16), new ThreadFactory({
    newThread: function (runnable) {
      let thread = Executors.defaultThreadFactory().newThread(runnable)
      thread.setName(config.thread_name_prefix + ENGINE_ID + '-configing-' + thread.getName())
      return thread
    }
  }))
  let floatyWindow = null
  let floatyLock = threads.lock()
  let count = 10
  let countdownThread = null
  let loadingDialog = null

  let colorRegex = /^#[\dabcdef]{6}$/i

  let _hasRootPermission = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su")
  let commonFunctions = require('./lib/prototype/CommonFunction.js')
  let AesUtil = require('./lib/AesUtil.js')
  let FileUtils = require('./lib/prototype/FileUtils.js')
  let dateFormat = require('./lib/DateUtil.js')
  // 初始化list 为全局变量
  let whiteList = [], wateringBlackList = [], helpBallColorList = [], protectList = []

  let scale = config.device_width / 1080
  let rankCheckRegionXRange, rankCheckRegionYRange, rankCheckRegionHRange, rankCheckRegionWRange
  let bottomCheckRegionXRange, bottomCheckRegionYRange, bottomCheckRegionHRange, bottomCheckRegionWRange = [5, 50]

  let gravitySensor, distanceSensor
  let stopEmitUntil = 0

  // 注册关闭线程池
  commonFunctions.registerOnEngineRemoved(function () {
    if (threadPool !== null) {
      threadPool.shutdown()
      console.verbose('等待configing线程池关闭, 结果: ' + threadPool.awaitTermination(5, TimeUnit.SECONDS))
    }
  }, 'shutdown configing thread pool')
  function registerSensors () {
    if (!gravitySensor) {
      gravitySensor = sensors.register('gravity', sensors.delay.ui).on('change', (event, x, y, z) => {
        ui.gravityXText.setText(x.toFixed(3) + '')
        ui.gravityYText.setText(y.toFixed(3) + '')
        ui.gravityZText.setText(z.toFixed(3) + '')
      })
    }
    if (!distanceSensor) {
      distanceSensor = sensors.register('proximity', sensors.delay.ui).on('change', (event, d) => {
        ui.distanceText.setText(d + '')
      })
    }
  }

  function unregisterSensors () {
    sensors.unregister(gravitySensor)
    sensors.unregister(distanceSensor)
    gravitySensor = distanceSensor = null
  }
  function resetRangeInfo () {
    scale = config.device_width / 1080
    rankCheckRegionXRange = [100 * scale, config.device_width / 2]
    rankCheckRegionYRange = [100 * scale, config.device_height / 4]
    rankCheckRegionWRange = [100 * scale, config.device_width * 0.66]
    rankCheckRegionHRange = [100 * scale, config.device_width / 4]
    bottomCheckRegionXRange = [100 * scale, config.device_width]
    bottomCheckRegionYRange = [config.device_height / 2, config.device_height]
    bottomCheckRegionWRange = [5, 50]
    bottomCheckRegionHRange = [5, 50]
  }

  let setImageBasedUiVal = function () {
    ui.friendListScrollTimeInpt.text(config.friendListScrollTime + '')
    ui.checkBottomBaseImgChkBox.setChecked(config.checkBottomBaseImg)
    ui.baseOnImageContainer.setVisibility(config.base_on_image ? View.VISIBLE : View.GONE)
    ui.rankCheckRegionInpt.text(config.rank_check_left + ',' + config.rank_check_top + ',' + config.rank_check_width + ',' + config.rank_check_height)
    ui.checkFingerByPixelsAmountChkBox.setChecked(config.check_finger_by_pixels_amount)
    ui.checkFingerByPixelsAmountContainer.setVisibility(config.check_finger_by_pixels_amount ? View.VISIBLE : View.GONE)
    ui.fingerImgPixelsInpt.text(config.finger_img_pixels + '')
    ui.tryCollectByMultiTouchChkBox.setChecked(config.try_collect_by_multi_touch)
    ui.directUseImgCollectChkBox.setChecked(config.direct_use_img_collect_and_help)
    ui.directBallsByHoughChkBox.setChecked(config.detect_balls_by_hough)

    if (config.direct_use_img_collect_and_help) {
      ui.multiTouchContainer.setVisibility(View.GONE)
      ui.directBallsByHoughChkBox.setVisibility(View.VISIBLE)
      config.try_collect_by_multi_touch = false
    } else {
      ui.multiTouchContainer.setVisibility(View.VISIBLE)
      ui.directBallsByHoughChkBox.setVisibility(View.GONE)
      ui.tryCollectByMultiTouchChkBox.setChecked(config.try_collect_by_multi_touch)
    }

    ui.useOcrParentContainer.setVisibility(config.base_on_image ? View.VISIBLE : View.GONE)
    ui.friendListScrollTimeContainer.setVisibility(config.checkBottomBaseImg ? View.GONE : View.VISIBLE)
    ui.bottomCheckContainer.setVisibility(!config.checkBottomBaseImg ? View.GONE : View.VISIBLE)
    ui.bottomCheckRegionInpt.text(config.bottom_check_left + ',' + config.bottom_check_top + ',' + config.bottom_check_width + ',' + config.bottom_check_height)
    ui.bottomCheckGrayColorInpt.text(config.bottom_check_gray_color)
    if (colorRegex.test(config.bottom_check_gray_color)) {
      ui.bottomCheckGrayColorInpt.setTextColor(colors.parseColor(config.bottom_check_gray_color))
    }

    ui.useCustomScrollDownChkBox.setChecked(config.useCustomScrollDown)
    ui.scrollDownContainer.setVisibility(config.useCustomScrollDown ? View.VISIBLE : View.INVISIBLE)
    ui.bottomHeightContainer.setVisibility(config.useCustomScrollDown ? View.VISIBLE : View.GONE)
    ui.scrollDownSpeedInpt.text(config.scrollDownSpeed + '')

    setWidgetOnlyVisiable()
  }

  let setOcrUiVal = function () {
    ui.useTesseracOcrChkBox.setVisibility(config.base_on_image ? View.VISIBLE : View.GONE)
    ui.useTesseracOcrChkBox.setChecked(config.useTesseracOcr)


    ui.useOcrChkBox.setVisibility(config.useTesseracOcr ? View.GONE : View.VISIBLE)
    ui.apiKeyInpt.setVisibility(config.useTesseracOcr ? View.GONE : View.VISIBLE)
    ui.secretKeyInpt.setVisibility(config.useTesseracOcr ? View.GONE : View.VISIBLE)
    ui.baiduDescText.setVisibility(config.useTesseracOcr ? View.GONE : View.VISIBLE)

    ui.useOcrChkBox.setChecked(config.useOcr)
    ui.autoSetThresholdChkBox.setChecked(config.autoSetThreshold)
    ui.setThresholdContainer.setVisibility(config.autoSetThreshold ? View.GONE : View.VISIBLE)
    ui.ocrThresholdInpt.text(config.ocrThreshold + '')
    ui.saveBase64ImgInfoChkBox.setChecked(config.saveBase64ImgInfo)
    ui.apiKeyInpt.text(config.apiKey + '')
    ui.secretKeyInpt.text(config.secretKey + '')

    let invokeStorage = config.useTesseracOcr ? commonFunctions.getTesseracInvokeCountStorage() : commonFunctions.getBaiduInvokeCountStorage()
    ui.ocrInvokeCount.text(invokeStorage.date + '已调用次数:' + invokeStorage.count + (config.useTesseracOcr ? '' : ' 剩余:' + (500 - invokeStorage.count)))
    ui.useOcrContainer.setVisibility(config.useOcr || config.useTesseracOcr ? View.VISIBLE : View.GONE)
  }

  let inputDeviceSize = function () {
    return Promise.resolve().then(() => {
      return dialogs.rawInput('请输入设备分辨率宽度：', config.device_width + '')
    }).then(x => {
      if (x) {
        let xVal = parseInt(x)
        if (isFinite(xVal) && xVal > 0) {
          config.device_width = xVal
        } else {
          toast('输入值无效')
        }
      }
    }).then(() => {
      return dialogs.rawInput('请输入设备分辨率高度：', config.device_height + '')
    }).then(y => {
      if (y) {
        let yVal = parseInt(y)
        if (isFinite(yVal) && yVal > 0) {
          config.device_height = yVal
        } else {
          toast('输入值无效')
        }
      }
    })
  }

  let setDeviceSizeText = function () {
    ui.deviceSizeText.text(config.device_width + 'px ' + config.device_height + 'px')
    // 重置范围
    resetRangeInfo()
  }

  let setColorSeekBar = function () {
    let rgbColor = colors.parseColor(config.min_floaty_color)
    let rgbColors = {
      red: colors.red(rgbColor),
      green: colors.green(rgbColor),
      blue: colors.blue(rgbColor),
    }
    ui.redSeekbar.setProgress(parseInt(rgbColors.red / 255 * 100))
    ui.greenSeekbar.setProgress(parseInt(rgbColors.green / 255 * 100))
    ui.blueSeekbar.setProgress(parseInt(rgbColors.blue / 255 * 100))
  }

  function getGap (rangeInfo) {
    return rangeInfo[1] - rangeInfo[0]
  }

  function getProgress (configValue, rangeInfo) {
    return parseInt((configValue - rangeInfo[0]) / getGap(rangeInfo) * 100)
  }

  let setRegionSeekBars = function () {


    ui.rankCheckRegionXSeekbar.setProgress(getProgress(config.rank_check_left, rankCheckRegionXRange))
    ui.rankCheckRegionYSeekbar.setProgress(getProgress(config.rank_check_top, rankCheckRegionYRange))
    ui.rankCheckRegionWSeekbar.setProgress(getProgress(config.rank_check_width, rankCheckRegionWRange))
    ui.rankCheckRegionHSeekbar.setProgress(getProgress(config.rank_check_height, rankCheckRegionHRange))


    ui.bottomCheckRegionXSeekbar.setProgress(getProgress(config.bottom_check_left, bottomCheckRegionXRange))
    ui.bottomCheckRegionYSeekbar.setProgress(getProgress(config.bottom_check_top, bottomCheckRegionYRange))
    ui.bottomCheckRegionWSeekbar.setProgress(getProgress(config.bottom_check_width, bottomCheckRegionWRange))
    ui.bottomCheckRegionHSeekbar.setProgress(getProgress(config.bottom_check_height, bottomCheckRegionHRange))

    sendConfigChangedBroadcast()

  }

  let setWidgetOnlyVisiable = function () {
    if (config.base_on_image && !config.auto_set_img_or_widget) {
      ui.baseOnWidgetOnlyContainer.setVisibility(View.GONE)
    } else {
      ui.baseOnWidgetOnlyContainer.setVisibility(View.VISIBLE)
    }
  }

  let setBasicUiValues = function () {
    config.device_width = config.device_width > 0 ? config.device_width : 1
    config.device_height = config.device_height > 0 ? config.device_height : 1
    // 重置为默认
    whiteList = []
    wateringBlackList = []
    helpBallColorList = []
    protectList = []
    // 基本配置
    ui.password.text(config.password + '')
    ui.alipayLockPasswordInpt.text(config.alipay_lock_password + '')
    ui.isAlipayLockedChkBox.setChecked(config.is_alipay_locked)
    ui.alipayLockPasswordContainer.setVisibility(config.is_alipay_locked ? View.VISIBLE : View.GONE)

    ui.colorThresholdInput.text('' + config.color_offset)
    let precent = parseInt(config.color_offset / 255 * 100)
    ui.colorThresholdSeekbar.setProgress(precent)

    if (config.auto_set_bang_offset) {
      ui.bangOffsetText.text('下次运行时重新检测')
    } else {
      ui.bangOffsetText.text('' + config.bang_offset)
    }
    let configColor = config.min_floaty_color
    ui.floatyColor.text(configColor)
    if (/^#[\dabcdef]{6}$/i.test(configColor)) {
      ui.floatyColor.setTextColor(colors.parseColor(configColor))
    }
    ui.floatyX.text(config.min_floaty_x + '')
    ui.floatyXSeekBar.setProgress(parseInt(config.min_floaty_x / config.device_width * 100))
    ui.floatyY.text(config.min_floaty_y + '')
    ui.floatyYSeekBar.setProgress(parseInt(config.min_floaty_y / config.device_height * 100))
    ui.floatyTextSizeInpt.text(config.min_floaty_text_size + '')
    ui.colorSelectorChkBox.setChecked(false)
    ui.colorSelectorContainer.setVisibility(View.GONE)
    setColorSeekBar()

    ui.notLingeringFloatWindowChkBox.setChecked(config.not_lingering_float_window)
    ui.helpFriendChkBox.setChecked(config.help_friend)

    ui.enableCallStateControlChkBox.setChecked(config.enable_call_state_control)
    ui.isCycleChkBox.setChecked(config.is_cycle)
    ui.cycleTimeContainer.setVisibility(config.is_cycle ? View.VISIBLE : View.INVISIBLE)
    ui.neverStopContainer.setVisibility(config.is_cycle ? View.GONE : View.VISIBLE)
    ui.countdownContainer.setVisibility(config.is_cycle || config.never_stop ? View.GONE : View.VISIBLE)
    ui.cycleTimeInpt.text(config.cycle_times + '')
    ui.maxCollectWaitTimeInpt.text(config.max_collect_wait_time + '')
    ui.isNeverStopChkBox.setChecked(config.never_stop)
    ui.reactiveTimeContainer.setVisibility(config.never_stop ? View.VISIBLE : View.INVISIBLE)
    ui.reactiveTimeInpt.text(config.reactive_time + '')
    let reactiveTime = config.reactive_time
    let rangeCheckRegex = /^(\d+)-(\d+)$/
    if (rangeCheckRegex.test(reactiveTime)) {
      let execResult = rangeCheckRegex.exec(reactiveTime)
      let start = parseInt(execResult[1])
      let end = parseInt(execResult[2])
      ui.reactiveTimeDisplay.setText('当前设置为从 ' + start + ' 到 ' + end + ' 分钟的随机范围')
    } else {
      ui.reactiveTimeDisplay.setText('当前设置为 ' + reactiveTime + ' 分钟')
    }

    ui.delayStartTimeInpt.text(config.delayStartTime + '')

    ui.showDebugLogChkBox.setChecked(config.show_debug_log)
    ui.saveLogFileChkBox.setChecked(config.save_log_file)
    ui.asyncSaveLogFileChkBox.setChecked(config.async_save_log_file)
    ui.asyncSaveLogFileChkBox.setVisibility(config.save_log_file ? View.VISIBLE : View.GONE)
    ui.fileSizeInpt.text(config.back_size + '')
    ui.fileSizeContainer.setVisibility(config.save_log_file ? View.VISIBLE : View.GONE)
    ui.showEngineIdChkBox.setChecked(config.show_engine_id)
    ui.developModeChkBox.setChecked(config.develop_mode)
    ui.developSavingModeChkBox.setChecked(config.develop_saving_mode)
    ui.cutAndSaveCountdownChkBox.setChecked(config.cutAndSaveCountdown)
    ui.cutAndSaveTreeCollectChkBox.setChecked(config.cutAndSaveTreeCollect)
    ui.developModeContainer.setVisibility(config.develop_mode ? View.VISIBLE : View.GONE)

    ui.requestCapturePermissionChkBox.setChecked(config.request_capture_permission)

    ui.lockX.text(config.lock_x + '')
    ui.lockXSeekBar.setProgress(parseInt(config.lock_x / config.device_width * 100))
    ui.lockY.text(config.lock_y + '')
    ui.lockYSeekBar.setProgress(parseInt(config.lock_y / config.device_height * 100))
    ui.autoLockChkBox.setChecked(config.auto_lock)
    ui.lockPositionContainer.setVisibility(config.auto_lock && !_hasRootPermission ? View.VISIBLE : View.INVISIBLE)
    ui.lockDescNoRoot.setVisibility(!_hasRootPermission ? View.VISIBLE : View.INVISIBLE)

    ui.autoSetBrightnessChkBox.setChecked(config.auto_set_brightness)
    ui.checkDevicePostureChkBox.setChecked(config.check_device_posture)
    if (config.check_device_posture) {
      registerSensors()
    }
    ui.checkDistanceChkBox.setVisibility(config.check_device_posture ? View.VISIBLE : View.GONE)
    ui.postureThresholdZInpt.setText((config.posture_threshod_z || 6) + '')
    ui.senrsorInfoContainer.setVisibility(config.check_device_posture ? View.VISIBLE : View.GONE)
    ui.checkDistanceChkBox.setChecked(config.check_distance)
    ui.dismissDialogIfLockedChkBox.setChecked(config.dismiss_dialog_if_locked)

    ui.timeoutUnlockInpt.text(config.timeout_unlock + '')
    ui.timeoutFindOneInpt.text(config.timeout_findOne + '')
    ui.timeoutExistingInpt.text(config.timeout_existing + '')
    ui.captureWaitingTimeInpt.text(config.capture_waiting_time + '')
    ui.asyncWaitingCaptureChkBox.setChecked(config.async_waiting_capture)
    ui.asyncWaitingCaptureContainer.setVisibility(config.async_waiting_capture ? View.VISIBLE : View.GONE)
    setDeviceSizeText()
  }

  let setAdvanceUiValues = function () {
    ui.singleScriptChkBox.setChecked(config.single_script)
    ui.collectSelfOnlyChkBox.setChecked(config.collect_self_only)
    ui.notCollectSelfChkBox.setChecked(config.not_collect_self)
    if (config.collect_self_only) {
      ui.notCollectSelfChkBox.setVisibility(View.GONE)
    }


    ui.recheckRankListChkBox.setChecked(config.recheck_rank_list)
    ui.tryCollectByStrollChkBox.setChecked(config.try_collect_by_stroll)
    ui.limitRunnableTimeRangeChkBox.setChecked(config.limit_runnable_time_range)

    ui.autoSetImgOrWidgetChkBox.setChecked(config.auto_set_img_or_widget)
    ui.baseOnImageChkBox.setChecked(config.base_on_image)
    ui.bottomHeightInpt.text(config.bottomHeight + '')

    ui.threadPoolSizeInpt.setText(config.thread_pool_size + '')
    ui.threadPoolMaxSizeInpt.setText(config.thread_pool_max_size + '')
    ui.threadPoolQueueSizeInpt.setText(config.thread_pool_queue_size + '')
    ui.threadPoolWaitingTimeInpt.setText(config.thread_pool_waiting_time + '')


    ui.wateringBackChkBox.setChecked(config.wateringBack)
    ui.wateringThresholdInpt.text(config.wateringThreshold + '')
    ui.wateringThresholdContainer.setVisibility(config.wateringBack ? View.VISIBLE : View.INVISIBLE)
    ui.wateringBlackListContainer.setVisibility(config.wateringBack ? View.VISIBLE : View.GONE)
    let waterTargetIdx = [10, 18, 33, 66].indexOf(config.targetWateringAmount)
    if (waterTargetIdx < 0) {
      waterTargetIdx = 0
      config.targetWateringAmount = 10
    }
    ui.wateringBackAmountSpinner.setSelection(waterTargetIdx)
    ui.regionSeekChkBox.setChecked(false)
    setImageBasedUiVal()
    setOcrUiVal()
    ui.rankCheckRegionContainer.setVisibility(View.GONE)
    ui.bottomCheckRegionContainer.setVisibility(View.GONE)
  }

  let setWidgetUiValues = function () {
    ui.myIdInpt.text(config.my_id)
    ui.homeUiContentInpt.text(config.home_ui_content)
    ui.friendHomeCheckRegexInpt.text(config.friend_home_check_regex)
    ui.friendHomeUiContentInpt.text(config.friend_home_ui_content)
    ui.friendNameGettingRegexInpt.text(config.friend_name_getting_regex)
    ui.friendListIdInpt.text(config.friend_list_id)
    ui.enterFriendListUiContentInpt.text(config.enter_friend_list_ui_content)
    ui.noMoreUiContentInpt.text(config.no_more_ui_content)
    ui.loadMoreUiContentInpt.text(config.load_more_ui_content)
    ui.wateringWidgetContentInpt.text(config.watering_widget_content)
    ui.doWateringWidgetContentInpt.text(config.do_watering_button_content)
    ui.usingProtectContentInpt.text(config.using_protect_content)
    let collectColor = config.can_collect_color
    ui.canCollectColorInpt.text(collectColor)
    if (colorRegex.test(collectColor)) {
      ui.canCollectColorInpt.setTextColor(colors.parseColor(collectColor))
    }
    let helpColor = config.can_help_color
    ui.canHelpColorInpt.text(helpColor)
    if (colorRegex.test(helpColor)) {
      ui.canHelpColorInpt.setTextColor(colors.parseColor(helpColor))
    }

    ui.collectableEnergyBallContentInpt.text(config.collectable_energy_ball_content)
  }

  let bindListValues = function () {
    // 白名单
    if (config.white_list && config.white_list.length > 0) {
      whiteList = config.white_list.map(r => {
        return { name: r }
      })
    }
    ui.whiteList.setDataSource(whiteList)

    // 黑名单
    if (config.wateringBlackList && config.wateringBlackList.length > 0) {
      wateringBlackList = config.wateringBlackList.map(r => {
        return { name: r }
      })
    }
    ui.blackList.setDataSource(wateringBlackList)

    // 可帮助收取能量球颜色
    if (config.helpBallColors && config.helpBallColors.length > 0) {
      helpBallColorList = config.helpBallColors.map(r => {
        return { color: r }
      })
    }
    ui.helpBallColorsList.setDataSource(helpBallColorList)

    // 保护罩使用信息
    protectList = commonFunctions.getTodaysRuntimeStorage('protectList').protectList || []
    protectList.map(protectInfo => protectInfo.timeout = dateFormat(new Date(protectInfo.timeout)))
    ui.protectList.setDataSource(protectList)
    if (protectList && protectList.length > 0) {
      ui.protectInfoContainer.setVisibility(View.VISIBLE)
    } else {
      ui.protectInfoContainer.setVisibility(View.GONE)
    }
  }

  /**
   * 刷新所有的配置信息
   */
  let resetUiValues = function () {
    // 基本配置
    setBasicUiValues()
    // 进阶配置
    setAdvanceUiValues()
    // 控件文本配置
    setWidgetUiValues()
    // 列表绑定
    bindListValues()
  }

  threads.start(function () {
    loadingDialog = dialogs.build({
      title: "加载中...",
      progress: {
        max: -1
      },
      cancelable: false
    }).show()
    setTimeout(function () {
      loadingDialog.dismiss()
    }, 3000)
  })

  let TextWatcherBuilder = function (textCallback) {
    return new TextWatcher({
      onTextChanged: (text) => {
        textCallback(text + '')
      },
      beforeTextChanged: function (s) { },
      afterTextChanged: function (s) { }
    })
  }

  let SpinnerItemSelectedListenerBuilder = function (selectedCallback) {
    return new AdapterView.OnItemSelectedListener({
      onItemSelected: function (parentView, selectedItemView, position, id) {
        selectedCallback(position)
      },
      onNothingSelected: function (parentView) { }
    })
  }

  setTimeout(function () {
    let start = new Date().getTime()
    ui.layout(
      <drawer>
        <vertical>
          <appbar>
            <toolbar id="toolbar" title="运行配置" />
            <tabs id="tabs" />
          </appbar>
          <viewpager id="viewpager">
            <frame>
              <ScrollView>
                <vertical padding="24 0">
                  {/* 锁屏密码 */}
                  <horizontal gravity="center">
                    <text text="锁屏密码：" />
                    <input id="password" inputType="textPassword" layout_weight="80" />
                  </horizontal>
                  <checkbox id="isAlipayLockedChkBox" text="支付宝是否锁定" />
                  <horizontal gravity="center" id="alipayLockPasswordContainer">
                    <text text="支付宝手势密码对应的九宫格数字：" textSize="10sp" />
                    <input id="alipayLockPasswordInpt" inputType="textPassword" layout_weight="80" />
                  </horizontal>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 5"></horizontal>
                  <horizontal gravity="center">
                    <text text="设备宽高：" textColor="black" textSize="16sp" />
                    <text id="deviceSizeText" text="" />
                    <button id="changeDeviceSizeBtn" >修改</button>
                  </horizontal>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 5"></horizontal>
                  {/* 颜色识别 */}
                  <text text="颜色相似度（拖动为百分比，实际使用0-255）" textColor="black" textSize="16sp" />
                  <button id="showThresholdConfig" >直接输入</button>
                  <horizontal gravity="center">
                    <text id="colorThresholdInput" />
                    <seekbar id="colorThresholdSeekbar" progress="20" layout_weight="85" />
                  </horizontal>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  <text text="刘海屏或者挖孔屏悬浮窗显示位置和实际目测位置不同，需要施加一个偏移量一般是负值，脚本运行时会自动设置：" textSize="12sp" margin="10 5" />
                  <horizontal padding="10 10" gravity="center">
                    <text text="当前自动设置的刘海偏移量为：" textSize="12sp" layout_weight="60" />
                    <text id="bangOffsetText" textSize="12sp" layout_weight="40" />
                  </horizontal>
                  <button id="resetOffsetBtn">下次运行时重新检测</button>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  {/* 悬浮窗配置 不再提供关闭 */}
                  <horizontal margin="10 0" gravity="center">
                    <vertical padding="12" layout_weight="75">
                      <checkbox id="colorSelectorChkBox" text="悬浮窗颜色" textColor="black" textSize="16sp" />
                      <input id="floatyColor" inputType="text" />
                      <text text="悬浮窗位置" textColor="black" textSize="16sp" />
                      <horizontal margin="10 0" gravity="center">
                        <text text="x:" />
                        <seekbar id="floatyXSeekBar" progress="20" layout_weight="80" />
                        <text id="floatyX" />
                      </horizontal>
                      <horizontal margin="10 0" gravity="center">
                        <text text="y:" />
                        <seekbar id="floatyYSeekBar" progress="20" layout_weight="80" />
                        <text id="floatyY" />
                      </horizontal>
                      <horizontal margin="10 0" gravity="center">
                        <text text="悬浮窗字体大小:" />
                        <input id="floatyTextSizeInpt" inputType="number" />
                      </horizontal>
                    </vertical>
                    <vertical padding="12" layout_weight="25">
                      <button id="testFloatyPosition">测试悬浮窗</button>
                      <button id="showFloatyPointConfig">手动输入坐标</button>
                    </vertical>
                  </horizontal>
                  <vertical id="colorSelectorContainer" >
                    <horizontal gravity="center">
                      <text text="R:" />
                      <seekbar id="redSeekbar" progress="20" layout_weight="85" />
                    </horizontal>
                    <horizontal gravity="center">
                      <text text="G:" />
                      <seekbar id="greenSeekbar" progress="20" layout_weight="85" />
                    </horizontal>
                    <horizontal gravity="center">
                      <text text="B:" />
                      <seekbar id="blueSeekbar" progress="20" layout_weight="85" />
                    </horizontal>
                  </vertical>
                  <text text="是否在执行完毕后不驻留前台，关闭悬浮窗" textSize="12sp" />
                  <checkbox id="notLingeringFloatWindowChkBox" text="不驻留前台" />
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  {/* 是否帮助收取 */}
                  <checkbox id="helpFriendChkBox" text="是否帮助收取" />
                  {/* 是否循环 */}
                  <horizontal gravity="center">
                    <checkbox id="isCycleChkBox" text="是否循环" />
                    <horizontal padding="10 0" id="cycleTimeContainer" gravity="center" layout_weight="75">
                      <text margin="40 0" text="循环次数：" layout_weight="40" />
                      <input id="cycleTimeInpt" textSize="14sp" layout_weight="60" />
                    </horizontal>
                  </horizontal>
                  {/* 是否永不停止 */}
                  <vertical id="neverStopContainer">
                    <text text="永不停止模式请不要全天24小时运行，具体见README" />
                    <text text="重新激活时间可以选择随机范围，按如下格式输入即可：30-40" textSize="10sp" />
                    <text id="reactiveTimeDisplay" textSize="10sp" />
                    <horizontal gravity="center">
                      <checkbox id="isNeverStopChkBox" text="是否永不停止" />
                      <horizontal padding="10 0" id="reactiveTimeContainer" gravity="center" layout_weight="75">
                        <text margin="10 0" text="重新激活时间：" layout_weight="40" />
                        <input id="reactiveTimeInpt" textSize="14sp" layout_weight="60" />
                      </horizontal>
                    </horizontal>
                  </vertical>
                  <vertical id="countdownContainer">
                    <text text="倒计时等待的最大时间，默认是60分钟内有可收取的就会设置倒计时，你如果只需要收集一次，可以将它设置为0即可。" textSize="10sp"/>
                    <horizontal gravity="center" >
                      <text text="计时最大等待时间:" />
                      <input id="maxCollectWaitTimeInpt" inputType="number" layout_weight="60" />
                    </horizontal>
                  </vertical>
                  {/* 脚本延迟启动 */}
                  <horizontal gravity="center">
                    <text text="延迟启动时间（秒）:" />
                    <input layout_weight="70" inputType="number" id="delayStartTimeInpt" layout_weight="70" />
                  </horizontal>
                  <checkbox id="developModeChkBox" text="是否启用开发模式" />
                  <vertical id="developModeContainer" gravity="center">
                    <text text="脚本执行时保存图片等数据，未启用开发模式时依旧有效，请不要随意开启:" margin="5 0" textSize="14sp" />
                    <checkbox id="cutAndSaveCountdownChkBox" text="是否保存倒计时图片" />
                    <checkbox id="cutAndSaveTreeCollectChkBox" text="是否保存可收取能量球图片" />
                    <checkbox id="developSavingModeChkBox" text="是否保存一些开发用的数据" />
                  </vertical>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  {/* 是否显示debug日志 */}
                  <checkbox id="showDebugLogChkBox" text="是否显示debug日志" />
                  <checkbox id="showEngineIdChkBox" text="是否在控制台中显示脚本引擎id" />
                  <checkbox id="saveLogFileChkBox" text="是否保存日志到文件" />
                  <checkbox id="asyncSaveLogFileChkBox" text="异步保存日志到文件" />
                  <horizontal padding="10 0" id="fileSizeContainer" gravity="center" layout_weight="75">
                    <text text="文件滚动大小：" layout_weight="20" />
                    <input id="fileSizeInpt" textSize="14sp" layout_weight="80" />
                    <text text="kb" />
                  </horizontal>
                  {/* 是否自动点击授权录屏权限 */}
                  <checkbox id="requestCapturePermissionChkBox" text="是否需要自动授权截图权限" />
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  {/* 收集一轮后自动锁屏 */}
                  <vertical id="lockDescNoRoot">
                    <text text="锁屏功能仅限于下拉状态栏中有锁屏按钮的情况下可用" textSize="12sp" />
                    <text text="实在想用可以自行修改Automator中的lockScreen方法" textSize="12sp" />
                  </vertical>
                  <horizontal gravity="center">
                    <checkbox id="autoLockChkBox" text="是否自动锁屏" />
                    <vertical padding="10 0" id="lockPositionContainer" gravity="center" layout_weight="75">
                      <horizontal margin="10 0" gravity="center">
                        <text text="x:" />
                        <seekbar id="lockXSeekBar" progress="20" layout_weight="80" />
                        <text id="lockX" />
                      </horizontal>
                      <horizontal margin="10 0" gravity="center">
                        <text text="y:" />
                        <seekbar id="lockYSeekBar" progress="20" layout_weight="80" />
                        <text id="lockY" />
                      </horizontal>
                      <button id="showLockPointConfig" >手动输入坐标</button>
                    </vertical>
                  </horizontal>
                  {/* 是否自动设置最低亮度 */}
                  <checkbox id="autoSetBrightnessChkBox" text="锁屏启动设置最低亮度" />
                  <checkbox id="checkDevicePostureChkBox" text="锁屏启动检测是否在裤兜内，防止误触" />
                  <checkbox id="checkDistanceChkBox" text="是否同时校验距离传感器，部分设备距离传感器不准，默认不开启" />
                  <vertical id="senrsorInfoContainer" gravity="center">
                    <text text="z轴重力加速度阈值：（绝对值小于该值判定为在兜里）" />
                    <input layout_weight="70" inputType="number" id="postureThresholdZInpt" />
                    <horizontal>
                      <text text="x:" /><text id="gravityXText" margin="5 0" />
                      <text text="y:" /><text id="gravityYText" margin="5 0" />
                      <text text="z:" /><text id="gravityZText" margin="5 0" />
                    </horizontal>
                    <horizontal>
                      <text text="距离传感器:" /><text id="distanceText" />
                    </horizontal>
                  </vertical>
                  {/* 是否锁屏启动关闭弹框提示 */}
                  <checkbox id="dismissDialogIfLockedChkBox" text="锁屏启动关闭弹框提示" />
                  <text text="通话状态监听需要授予AutoJS软件获取通话状态的权限" textSize="12sp" />
                  <checkbox id="enableCallStateControlChkBox" text="是否在通话时停止脚本" />
                  {/* 基本不需要修改的 */}
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  <horizontal gravity="center">
                    <text text="解锁超时（ms）:" />
                    <input id="timeoutUnlockInpt" inputType="number" layout_weight="60" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="查找控件超时（ms）:" />
                    <input id="timeoutFindOneInpt" inputType="number" layout_weight="60" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="校验控件是否存在超时（ms）:" />
                    <input id="timeoutExistingInpt" inputType="number" layout_weight="60" />
                  </horizontal>
                  <text text="偶尔通过captureScreen获取截图需要等待很久，或者一直阻塞无法进行下一步操作，建议开启异步等待，然后设置截图等待时间(默认500ms,需自行调试找到合适自己设备的数值)。失败多次后脚本会自动重启，重新获取截图权限" textSize="10dp" />
                  <checkbox id="asyncWaitingCaptureChkBox" text="是否异步等待截图" />
                  <horizontal gravity="center" id="asyncWaitingCaptureContainer">
                    <text text="获取截图等待时间（ms）:" />
                    <input id="captureWaitingTimeInpt" inputType="number" layout_weight="60" />
                  </horizontal>
                </vertical>
              </ScrollView>
            </frame >
            <frame>
              <ScrollView id="parentScrollView2">
                <vertical padding="24 12">
                  {/* 单脚本使用，无视多任务队列 */}
                  <text text="当需要使用多个脚本时不要勾选（如同时使用我写的蚂蚁庄园脚本），避免抢占前台" textSize="9sp" />
                  <checkbox id="singleScriptChkBox" text="是否单脚本运行" />
                  {/* 只收集自己的能量 */}
                  <checkbox id="collectSelfOnlyChkBox" text="只收自己的能量" />
                  <checkbox id="notCollectSelfChkBox" text="不收自己的能量" />
                  <checkbox id="recheckRankListChkBox" text="是否在收集或帮助后重新检查排行榜" />
                  <checkbox id="tryCollectByStrollChkBox" text="是否通过逛一逛收集能量" />
                  <checkbox id="limitRunnableTimeRangeChkBox" text="是否限制0:30-6:50不可运行" />
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  <button id="showRealTimeImgConfig" >实时查看可视化配置信息</button>
                  <checkbox id="regionSeekChkBox" text="拖动输入区域" textColor="black" textSize="16sp" />
                  {/* 使用模拟手势来实现上下滑动 */}
                  <horizontal gravity="center">
                    <checkbox id="useCustomScrollDownChkBox" text="是否启用模拟滑动" layout_weight="40" />
                    <horizontal layout_weight="60" id="scrollDownContainer">
                      <text text="滑动速度（ms）" />
                      <input layout_weight="70" inputType="number" id="scrollDownSpeedInpt" />
                    </horizontal>
                  </horizontal>
                  {/* 虚拟按键高度 */}
                  <horizontal gravity="center" id="bottomHeightContainer">
                    <text text="模拟滑动距离底部的高度，默认200即可" />
                    <input layout_weight="70" inputType="number" id="bottomHeightInpt" />
                  </horizontal>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  <checkbox id="directUseImgCollectChkBox" text="是否直接基于图像分析收取和帮助好友" />
                  <checkbox id="directBallsByHoughChkBox" text="是否通过findCircles识别能量球" />
                  <vertical id="multiTouchContainer">
                    <text text="当可收取能量球控件无法获取时开启区域点击, 不同设备请扩展点击代码，当前建议开启 直接基于图像分析收取和帮助好友" textSize="9sp" />
                    <checkbox id="tryCollectByMultiTouchChkBox" text="是否尝试区域点击来收取能量" />
                  </vertical>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  {/* 基于图像分析 */}
                  <checkbox id="autoSetImgOrWidgetChkBox" text="自动判断基于图像还是控件分析" />
                  <checkbox id="baseOnImageChkBox" text="基于图像分析" />
                  <vertical id="baseOnImageContainer">
                    <text text="通过运行 util/悬浮窗框位置.js 可以获取对应位置信息" />
                    <horizontal gravity="center">
                      <text text="校验排行榜分析范围:" layout_weight="20" />
                      <input inputType="text" id="rankCheckRegionInpt" layout_weight="80" />
                    </horizontal>
                    <vertical id="rankCheckRegionContainer" >
                      <horizontal gravity="center">
                        <text text="X坐标:" />
                        <seekbar id="rankCheckRegionXSeekbar" progress="20" layout_weight="85" />
                      </horizontal>
                      <horizontal gravity="center">
                        <text text="Y坐标:" />
                        <seekbar id="rankCheckRegionYSeekbar" progress="20" layout_weight="85" />
                      </horizontal>
                      <horizontal gravity="center">
                        <text text="宽度:" />
                        <seekbar id="rankCheckRegionWSeekbar" progress="20" layout_weight="85" />
                      </horizontal>
                      <horizontal gravity="center">
                        <text text="高度:" />
                        <seekbar id="rankCheckRegionHSeekbar" progress="20" layout_weight="85" />
                      </horizontal>
                    </vertical>
                    <text text="一般情况下不需要开启，自动识别失效后再开启该项" textSize="10sp" />
                    <checkbox id="checkFingerByPixelsAmountChkBox" text="基于像素点个数判断小手" />
                    <vertical id="checkFingerByPixelsAmountContainer">
                      <text text="可收取小手指的绿色像素点个数，颜色相似度20，1080P时小于1900判定为可收取，其他分辨率需要自行修改=1900*缩放比例^2" textSize="10sp" />
                      <text text="或者在好友列表中运行test/MockDetect.js查看具体的像素点个数，详细使用见README" textSize="10sp" />
                      <horizontal gravity="center" >
                        <text text="小手指像素点个数:" />
                        <input layout_weight="70" inputType="number" id="fingerImgPixelsInpt" layout_weight="70" />
                      </horizontal>
                    </vertical>
                    <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                    <checkbox id="checkBottomBaseImgChkBox" text="基于图像判断列表底部" />
                    <vertical id="bottomCheckContainer">
                      <horizontal gravity="center">
                        <text text="基于图像判断底部的范围:" layout_weight="20" />
                        <input inputType="text" id="bottomCheckRegionInpt" layout_weight="80" />
                      </horizontal>
                      <vertical id="bottomCheckRegionContainer" >
                        <horizontal gravity="center">
                          <text text="X坐标:" />
                          <seekbar id="bottomCheckRegionXSeekbar" progress="20" layout_weight="85" />
                        </horizontal>
                        <horizontal gravity="center">
                          <text text="Y坐标:" />
                          <seekbar id="bottomCheckRegionYSeekbar" progress="20" layout_weight="85" />
                        </horizontal>
                        <horizontal gravity="center">
                          <text text="宽度:" />
                          <seekbar id="bottomCheckRegionWSeekbar" progress="20" layout_weight="85" />
                        </horizontal>
                        <horizontal gravity="center">
                          <text text="高度:" />
                          <seekbar id="bottomCheckRegionHSeekbar" progress="20" layout_weight="85" />
                        </horizontal>
                      </vertical>
                      <horizontal gravity="center">
                        <text text="底部判断的灰度颜色值:" layout_weight="20" />
                        <input inputType="text" id="bottomCheckGrayColorInpt" layout_weight="80" />
                      </horizontal>
                    </vertical>
                    {/* 排行榜中下拉次数 当关闭基于图像判断底部时生效 */}
                    <vertical id="friendListScrollTimeContainer">
                      <text text="排行榜下拉的最大次数，使得所有数据都加载完，如果基于图像拍短无效只能如此" textSize="10sp" />
                      <horizontal gravity="center" >
                        <text text="排行榜下拉次数:" />
                        <input layout_weight="70" inputType="number" id="friendListScrollTimeInpt" layout_weight="70" />
                      </horizontal>
                    </vertical>
                    <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                    {/* 线程池配置 */}
                    <text text="图像识别的线程池配置，如果过于卡顿，请调低线程池大小，同时增加线程池等待时间。" />
                    <horizontal gravity="center">
                      <text text="线程池大小" layout_weight="20" />
                      <input layout_weight="60" inputType="number" id="threadPoolSizeInpt" />
                    </horizontal>
                    <horizontal gravity="center">
                      <text text="线程池最大大小" layout_weight="20" />
                      <input layout_weight="60" inputType="number" id="threadPoolMaxSizeInpt" />
                    </horizontal>
                    <horizontal gravity="center">
                      <text text="线程池等待队列大小" layout_weight="20" />
                      <input layout_weight="60" inputType="number" id="threadPoolQueueSizeInpt" />
                    </horizontal>
                    <horizontal gravity="center">
                      <text text="线程池等待时间（秒）" layout_weight="20" />
                      <input layout_weight="60" inputType="number" id="threadPoolWaitingTimeInpt" />
                    </horizontal>
                  </vertical>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  <checkbox id="useTesseracOcrChkBox" text="是否启用自建tesserac_ocr服务器识别倒计时" />
                  {/* 是否启用百度的OCR */}
                  <vertical id="useOcrParentContainer">
                    <checkbox id="useOcrChkBox" text="是否启用百度的OCR识别倒计时" />
                    <vertical id="useOcrContainer">
                      <text text="Base64图片信息仅仅为了开发用，日常使用请关闭" textSize="10sp" />
                      <checkbox id="saveBase64ImgInfoChkBox" text="是否记录图片Base64数据到日志" />
                      <text id="ocrInvokeCount" textSize="12sp" />
                      <checkbox id="autoSetThresholdChkBox" text="自动设置OCR像素点阈值" />
                      <vertical id="setThresholdContainer">
                        <text text="需要识别的倒计时绿色像素点数量阈值，当像素点个数大于该值才会调用，理论上像素点越多倒计时数值越小，此时调用接口可以节省调用次数" textSize="10sp" />
                        <input inputType="number" id="ocrThresholdInpt" w="*" />
                      </vertical>
                      <text id="baiduDescText" text="百度AI平台申请到的ApiKey和SecretKey" />
                      <input id="apiKeyInpt" hint="apiKey" />
                      <input id="secretKeyInpt" inputType="textPassword" hint="secretKey" />
                    </vertical>
                  </vertical>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  {/* 收取白名单列表 */}
                  <vertical w="*" gravity="left" layout_gravity="left" margin="10">
                    <text text="收取白名单：" textColor="#666666" textSize="14sp" />
                    <frame>
                      <list id="whiteList" height="150">
                        <horizontal w="*" h="40" gravity="left" bg="#efefef" margin="0 5">
                          <text id="name" layout_weight='1' h="30" gravity="left|center" layout_gravity="left|center" textSize="16sp" text="{{name}}" margin="10 0" />
                          <card id="deleteWhite" w="30" h="30" cardBackgroundColor="#fafafa" cardCornerRadius="15dp" layout_gravity="center" marginRight="10">
                            <text textSize="16dp" textColor="#555555" gravity="center">×</text>
                          </card>
                        </horizontal>
                      </list>
                    </frame>
                    <button w="*" id="addWhite" text="添加" gravity="center" layout_gravity="center" />
                  </vertical>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  {/* 保护罩信息列表 */}
                  <vertical w="*" gravity="left" layout_gravity="left" margin="10" id="protectInfoContainer">
                    <text text="保护罩使用信息：（好友昵称 超时时间）" textColor="#666666" textSize="14sp" />
                    <frame>
                      <list id="protectList" height="150">
                        <horizontal w="*" h="40" gravity="left" bg="#efefef" margin="0 5">
                          <vertical layout_weight='1' gravity="left|center" layout_gravity="left|center">
                            <text id="name" layout_weight='1' h="30" gravity="left|center" layout_gravity="left|center" textSize="16sp" text="{{name}}" margin="10 0" />
                            <text id="outDateTime" layout_weight='1' h="30" gravity="left|center" layout_gravity="left|center" textSize="16sp" text="{{timeout}}" margin="10 0" />
                          </vertical>
                          <card id="deleteProtect" w="30" h="30" cardBackgroundColor="#fafafa" cardCornerRadius="15dp" layout_gravity="left|center" margin="10 10">
                            <text textSize="16dp" textColor="#555555" gravity="center">×</text>
                          </card>
                        </horizontal>
                      </list>
                    </frame>
                    {/* <button w="*" id="addWhite" text="添加" gravity="center" layout_gravity="center" /> */}
                  </vertical>
                  <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                  {/* 是否在收取到了一定阈值后自动浇水10克 */}
                  <horizontal gravity="center">
                    <checkbox id="wateringBackChkBox" text="是否浇水回馈" layout_weight="40" />
                    <horizontal layout_weight="60" id="wateringThresholdContainer">
                      <text text="浇水阈值" />
                      <input layout_weight="70" inputType="number" id="wateringThresholdInpt" />
                    </horizontal>
                    <text text="浇水数量" textSize="14sp" />
                    <spinner id="wateringBackAmountSpinner" entries="10|18|33|66" />
                  </horizontal>
                  {/* 浇水黑名单 */}
                  <vertical w="*" gravity="left" layout_gravity="left" margin="10" id="wateringBlackListContainer">
                    <text text="浇水黑名单：" textColor="#666666" textSize="14sp" />
                    <frame>
                      <list id="blackList" height="150">
                        <horizontal w="*" h="40" gravity="left" bg="#efefef" margin="0 5">
                          <text id="name" layout_weight='1' h="30" gravity="left|center" layout_gravity="left|center" textSize="16sp" text="{{name}}" margin="10 0" />
                          <card id="deleteBlack" w="30" h="30" cardBackgroundColor="#fafafa" cardCornerRadius="15dp" layout_gravity="center" marginRight="10">
                            <text textSize="16dp" textColor="#555555" gravity="center">×</text>
                          </card>
                        </horizontal>
                      </list>
                    </frame>
                    <button w="*" id="addBlack" text="添加" gravity="center" layout_gravity="center" />
                  </vertical>
                </vertical>
              </ScrollView>
            </frame>
            <frame>
              <ScrollView id="parentScrollView3">
                <vertical padding="12 24">
                  <text text="一般情况下不需要修改这一块的配置，除非你的支付宝是英文的" textSize="12sp" />
                  <text text="我的ID主要用来准确获取当前收集的能量数据，可不配置" textSize="8sp" />
                  <horizontal gravity="center">
                    <text text="我的ID:" layout_weight="20" />
                    <input inputType="text" id="myIdInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="个人首页:" layout_weight="20" />
                    <input inputType="text" id="homeUiContentInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="个人首页判断是否好友首页:" layout_weight="20" />
                    <input inputType="text" id="friendHomeCheckRegexInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="好友首页:" layout_weight="20" />
                    <input inputType="text" id="friendHomeUiContentInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="好友名称正则表达式:" layout_weight="20" />
                    <input inputType="text" id="friendNameGettingRegexInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="查看更多好友按钮:" layout_weight="20" />
                    <input inputType="text" id="enterFriendListUiContentInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="浇水:" layout_weight="20" />
                    <input inputType="text" id="wateringWidgetContentInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="确认浇水按钮:" layout_weight="20" />
                    <input inputType="text" id="doWateringWidgetContentInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="保护罩:" layout_weight="20" />
                    <input inputType="text" id="usingProtectContentInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="可收集能量球:" layout_weight="20" />
                    <input inputType="text" id="collectableEnergyBallContentInpt" layout_weight="80" />
                  </horizontal>
                  <vertical id="baseOnWidgetOnlyContainer">
                    <horizontal gravity="center">
                      <text text="好友排行榜id:" layout_weight="20" />
                      <input inputType="text" id="friendListIdInpt" layout_weight="80" />
                    </horizontal>
                    <horizontal gravity="center">
                      <text text="没有更多按钮:" layout_weight="20" />
                      <input inputType="text" id="noMoreUiContentInpt" layout_weight="80" />
                    </horizontal>
                    <horizontal gravity="center">
                      <text text="查看更多按钮:" layout_weight="20" />
                      <input inputType="text" id="loadMoreUiContentInpt" layout_weight="80" />
                    </horizontal>
                  </vertical>
                  <horizontal gravity="center">
                    <text text="列表中可收取的颜色:" layout_weight="20" />
                    <input inputType="text" id="canCollectColorInpt" layout_weight="80" />
                  </horizontal>
                  <horizontal gravity="center">
                    <text text="列表中可帮助的颜色:" layout_weight="20" />
                    <input inputType="text" id="canHelpColorInpt" layout_weight="80" />
                  </horizontal>
                  <vertical w="*" gravity="left" layout_gravity="left" margin="10">
                    <text text="帮收取能量球颜色" textColor="#666666" textSize="14sp" />
                    <frame>
                      <list id="helpBallColorsList" height="150">
                        <horizontal w="*" h="40" gravity="left" bg="#efefef" margin="0 5">
                          <text id="name" layout_weight='1' h="30" gravity="left|center" layout_gravity="left|center" textSize="16sp" textColor="{{color}}" text="{{color}}" margin="10 0" />
                          <card id="deleteHelpColor" w="30" h="30" cardBackgroundColor="#fafafa" cardCornerRadius="15dp" layout_gravity="center" marginRight="10">
                            <text textSize="16dp" textColor="#555555" gravity="center">×</text>
                          </card>
                        </horizontal>
                      </list>
                    </frame>
                    <button w="*" id="addHelpBallColor" text="添加" gravity="center" layout_gravity="center" />
                  </vertical>
                </vertical>
              </ScrollView>
            </frame>
          </viewpager>
        </vertical>
      </drawer>
    )

    // 创建选项菜单(右上角)
    ui.emitter.on("create_options_menu", menu => {
      menu.add("全部重置为默认")
      menu.add("从配置文件导入")
      menu.add("导出到配置文件")
      menu.add("导入运行时数据")
      menu.add("导出运行时数据")
    })
    // 监听选项菜单点击
    ui.emitter.on("options_item_selected", (e, item) => {
      let local_config_path = files.cwd() + '/local_config.cfg'
      let runtime_store_path = files.cwd() + '/runtime_store.cfg'
      let aesKey = device.getAndroidId()
      switch (item.getTitle()) {
        case "全部重置为默认":
          confirm('确定要将所有配置重置为默认值吗？').then(ok => {
            if (ok) {
              Object.keys(default_config).forEach(key => {
                let defaultValue = default_config[key]
                config[key] = defaultValue
                storageConfig.put(key, defaultValue)
              })
              log('重置默认值')
              resetUiValues()
            }
          })
          break
        case "从配置文件导入":
          confirm('确定要从local_config.cfg中读取配置吗？').then(ok => {
            if (ok) {
              try {
                if (files.exists(local_config_path)) {
                  let refillConfigs = function (configStr) {
                    let local_config = JSON.parse(configStr)
                    Object.keys(default_config).forEach(key => {
                      let defaultValue = local_config[key]
                      if (typeof defaultValue === 'undefined') {
                        defaultValue = default_config[key]
                      }
                      config[key] = defaultValue
                      storageConfig.put(key, defaultValue)
                    })
                    resetUiValues()
                  }
                  let configStr = AesUtil.decrypt(files.read(local_config_path), aesKey)
                  if (!configStr) {
                    toastLog('local_config.cfg解密失败, 请尝试输入秘钥')
                    dialogs.rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                      .then(key => {
                        if (key) {
                          key = key.trim()
                          configStr = AesUtil.decrypt(files.read(local_config_path), key)
                          if (configStr) {
                            refillConfigs(configStr)
                          } else {
                            toastLog('秘钥不正确，无法解析')
                          }
                        }
                      })
                  } else {
                    refillConfigs(configStr)
                  }
                } else {
                  toastLog('local_config.cfg不存在无法导入')
                }
              } catch (e) {
                toastLog(e)
              }
            }
          })
          break
        case "导出到配置文件":
          confirm('确定要将配置导出到local_config.cfg吗？此操作会覆盖已有的local_config数据').then(ok => {
            if (ok) {
              Object.keys(default_config).forEach(key => {
                console.verbose(key + ': ' + config[key])
              })
              try {
                let configString = AesUtil.encrypt(JSON.stringify(config), aesKey)
                files.write(local_config_path, configString)
                toastLog('配置信息导出成功，刷新目录即可，local_config.cfg内容已加密仅本机可用，除非告知秘钥')
              } catch (e) {
                toastLog(e)
              }

            }
          })
          break
        case "导出运行时数据":
          confirm('确定要将运行时数据导出到runtime_store.cfg吗？此操作会覆盖已有的数据').then(ok => {
            if (ok) {
              try {
                let runtimeStorageStr = AesUtil.encrypt(commonFunctions.exportRuntimeStorage(), aesKey)
                files.write(runtime_store_path, runtimeStorageStr)
              } catch (e) {
                toastLog(e)
              }
            }
          })
          break
        case "导入运行时数据":
          confirm('确定要将从runtime_store.cfg导入运行时数据吗？此操作会覆盖已有的数据').then(ok => {
            if (ok) {
              if (files.exists(runtime_store_path)) {
                let encrypt_content = files.read(runtime_store_path)
                let resetRuntimeStore = function (runtimeStorageStr) {
                  if (commonFunctions.importRuntimeStorage(runtimeStorageStr)) {
                    resetUiValues()
                    return true
                  }
                  toastLog('导入运行配置失败，无法读取正确信息')
                  return false
                }
                try {
                  let decrypt = AesUtil.decrypt(encrypt_content, aesKey)
                  if (!decrypt) {
                    toastLog('runtime_store.cfg解密失败, 请尝试输入秘钥')
                    dialogs.rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                      .then(key => {
                        if (key) {
                          key = key.trim()
                          decrypt = AesUtil.decrypt(encrypt_content, key)
                          if (decrypt) {
                            resetRuntimeStore(decrypt)
                          } else {
                            toastLog('秘钥不正确，无法解析')
                          }
                        }
                      })
                  } else {
                    resetRuntimeStore(decrypt)
                  }
                } catch (e) {
                  toastLog(e)
                }
              } else {
                toastLog('配置信息不存在，无法导入')
              }
            }
          })
          break
      }
      e.consumed = true
    })
    activity.setSupportActionBar(ui.toolbar)

    ui.viewpager.setTitles(['基本配置', '进阶配置', '控件文本配置'])
    ui.tabs.setupWithViewPager(ui.viewpager)

    resetUiValues()

    // 列表监听
    ui.whiteList.on('item_bind', function (itemView, itemHolder) {
      // 绑定删除事件
      itemView.deleteWhite.on('click', function () {
        confirm('确定要从白名单移除[' + itemHolder.getItem().name + ']这个好友吗？').then(ok => {
          if (ok) {
            whiteList.splice(itemHolder.getPosition(), 1)
            config.white_list.splice(itemHolder.getPosition(), 1)
          }
        })
      })
    })

    ui.whiteList.setOnTouchListener(new View.OnTouchListener({
      onTouch: function (v, event) {
        if (event.getAction() == MotionEvent.ACTION_UP) {
          ui.parentScrollView2.requestDisallowInterceptTouchEvent(false)
        } else {
          // 屏蔽父控件的拦截事件  
          ui.parentScrollView2.requestDisallowInterceptTouchEvent(true)
        }
        return false
      }
    }))

    // 保护罩
    ui.protectList.on('item_bind', function (itemView, itemHolder) {
      // 绑定删除事件
      itemView.deleteProtect.on('click', function () {
        confirm('确定要从保护罩使用列表移除[' + itemHolder.getItem().name + ']这个好友吗？').then(ok => {
          if (ok) {
            protectList.splice(itemHolder.getPosition(), 1)
            commonFunctions.removeFromProtectList(itemHolder.getItem().name)
          }
        })
      })
    })

    ui.whiteList.setOnTouchListener(new View.OnTouchListener({
      onTouch: function (v, event) {
        if (event.getAction() == MotionEvent.ACTION_UP) {
          ui.parentScrollView2.requestDisallowInterceptTouchEvent(false)
        } else {
          // 屏蔽父控件的拦截事件  
          ui.parentScrollView2.requestDisallowInterceptTouchEvent(true)
        }
        return false
      }
    }))

    ui.addWhite.on('click', () => {
      dialogs.rawInput('请输入好友昵称')
        .then(friendName => {
          if (friendName) {
            friendName = friendName.trim()
            whiteList.push({ name: friendName })
            config.white_list.push(friendName)
          }
        })
    })

    ui.blackList.on('item_bind', function (itemView, itemHolder) {
      // 绑定删除事件
      itemView.deleteBlack.on('click', function () {
        confirm('确定要从黑名单移除[' + itemHolder.getItem().name + ']这个好友吗？').then(ok => {
          if (ok) {
            wateringBlackList.splice(itemHolder.getPosition(), 1)
            config.wateringBlackList.splice(itemHolder.getPosition(), 1)
          }
        })
      })
    })

    ui.blackList.setOnTouchListener(new View.OnTouchListener({
      onTouch: function (v, event) {
        if (event.getAction() == MotionEvent.ACTION_UP) {
          ui.parentScrollView2.requestDisallowInterceptTouchEvent(false)
        } else {
          // 屏蔽父控件的拦截事件  
          ui.parentScrollView2.requestDisallowInterceptTouchEvent(true)
        }
        return false
      }
    }))

    ui.addBlack.on('click', () => {
      dialogs.rawInput('请输入好友昵称')
        .then(friendName => {
          if (friendName) {
            friendName = friendName.trim()
            wateringBlackList.push({ name: friendName })
            config.wateringBlackList.push(friendName)
          }
        })
    })

    ui.helpBallColorsList.on('item_bind', function (itemView, itemHolder) {
      // 绑定删除事件
      itemView.deleteHelpColor.on('click', function () {
        confirm('确定要删除[' + itemHolder.getItem().color + ']这个颜色吗？').then(ok => {
          if (ok) {
            helpBallColorList.splice(itemHolder.getPosition(), 1)
            config.helpBallColors.splice(itemHolder.getPosition(), 1)
          }
        })
      })
    })

    ui.helpBallColorsList.setOnTouchListener(new View.OnTouchListener({
      onTouch: function (v, event) {
        if (event.getAction() == MotionEvent.ACTION_UP) {
          ui.parentScrollView3.requestDisallowInterceptTouchEvent(false)
        } else {
          // 屏蔽父控件的拦截事件
          ui.parentScrollView3.requestDisallowInterceptTouchEvent(true)
        }
        return false
      }
    }))

    ui.addHelpBallColor.on('click', () => {
      dialogs.rawInput('请输入颜色')
        .then(color => {
          if (color) {
            color = color.trim()
          }
          if (/^#[\dabcdef]{6}$/i.test(color)) {
            helpBallColorList.push({ color: color })
            config.helpBallColors.push(color)
          } else {
            toastLog('颜色值无效')
          }
        })
    })



    // 添加监听
    ui.colorThresholdSeekbar.on('touch', () => {
      let precent = ui.colorThresholdSeekbar.getProgress()
      let trueVal = parseInt(precent * 255 / 100)
      ui.colorThresholdInput.text('' + trueVal)
      config.color_offset = trueVal
    })

    ui.colorSelectorChkBox.on('click', () => {
      let show = ui.colorSelectorChkBox.isChecked()
      if (show) {
        setColorSeekBar()
        ui.colorSelectorContainer.setVisibility(View.VISIBLE)
      } else {
        ui.colorSelectorContainer.setVisibility(View.GONE)
      }
    })

    ui.regionSeekChkBox.on('click', () => {
      let show = ui.regionSeekChkBox.isChecked()
      if (show) {
        setRegionSeekBars()
        ui.rankCheckRegionContainer.setVisibility(View.VISIBLE)
        ui.bottomCheckRegionContainer.setVisibility(View.VISIBLE)
      } else {
        ui.rankCheckRegionContainer.setVisibility(View.GONE)
        ui.bottomCheckRegionContainer.setVisibility(View.GONE)
      }
    })


    let resetColorTextBySelector = function () {
      let progress = ui.redSeekbar.getProgress()
      let red = parseInt(progress * 255 / 100)
      progress = ui.greenSeekbar.getProgress()
      let green = parseInt(progress * 255 / 100)
      progress = ui.blueSeekbar.getProgress()
      let blue = parseInt(progress * 255 / 100)
      let rgb = red << 16 | green << 8 | blue
      config.min_floaty_color = colors.toString(rgb)
      ui.floatyColor.text(config.min_floaty_color)
      ui.floatyColor.setTextColor(colors.parseColor(config.min_floaty_color))
    }

    ui.redSeekbar.on('touch', () => {
      resetColorTextBySelector()
    })
    ui.greenSeekbar.on('touch', () => {
      resetColorTextBySelector()
    })
    ui.blueSeekbar.on('touch', () => {
      resetColorTextBySelector()
    })

    ui.changeDeviceSizeBtn.on('click', () => {
      inputDeviceSize().then(() => setDeviceSizeText())
    })

    ui.resetOffsetBtn.on('click', () => {
      config.auto_set_bang_offset = true
      ui.bangOffsetText.text('下次运行时重新检测')
    })

    ui.showThresholdConfig.on('click', () => {
      threadPool.execute(function () {
        dialogs.rawInput("请输入颜色相似度（0-255）", config.color_offset + '', val => {
          if (!val) {
            return
          }
          let newVal = parseInt(val)
          if (isFinite(newVal) && 0 <= newVal && 255 >= newVal) {
            config.color_offset = newVal
            ui.colorThresholdInput.text('' + config.color_offset)
            let precent = parseInt(config.color_offset / 255 * 100)
            ui.colorThresholdSeekbar.setProgress(precent)
          } else {
            toast('输入的值无效 请重新输入')
          }
        })
      })
    })

    let setFloatyStatusIfExist = function () {
      try {
        floatyLock.lock()
        if (floatyWindow !== null) {
          count = 10
          threadPool.execute(function () {
            try {
              floatyLock.lock()
              if (floatyWindow !== null) {
                floatyWindow.content.setTextColor(colors.parseColor(config.min_floaty_color))
                floatyWindow.setPosition(config.min_floaty_x, config.min_floaty_y + config.bang_offset)
                floatyWindow.content.text('悬浮窗' + count + '秒后关闭')
                floatyWindow.content.setTextSize(config.min_floaty_text_size)
              }
            } finally {
              floatyLock.unlock()
            }
          })
          if (countdownThread === null || !countdownThread.isAlive()) {
            countdownThread = threads.start(function () {
              while (count-- > 0 && floatyWindow !== null) {
                try {
                  floatyWindow.content.text('悬浮窗' + count + '秒后关闭')
                  log('悬浮窗' + count + '秒后关闭')
                } catch (e) {
                  console.error(e)
                }
                sleep(1000)
              }
              try {
                floatyLock.lock()
                if (floatyWindow !== null) {
                  floatyWindow.close()
                  floatyWindow = null
                }
              } finally {
                floatyLock.unlock()
              }
            })
          }
        }
      } finally {
        floatyLock.unlock()
      }
    }


    ui.floatyColor.addTextChangedListener(
      TextWatcherBuilder(text => {
        let val = text + ''
        if (val) {
          val = val.trim()
        }
        if (/^#[\dabcdef]{6}$/i.test(val)) {
          ui.floatyColor.setTextColor(colors.parseColor(val))
          config.min_floaty_color = val
          setFloatyStatusIfExist()
        } else {
          toast('颜色值无效，请重新输入')
        }
      })
    )

    ui.floatyXSeekBar.on('touch', () => {
      let precent = ui.floatyXSeekBar.getProgress()
      let trueVal = parseInt(precent * config.device_width / 100)
      ui.floatyX.text('' + trueVal)
      config.min_floaty_x = trueVal
      setFloatyStatusIfExist()
    })

    ui.floatyYSeekBar.on('touch', () => {
      let precent = ui.floatyYSeekBar.getProgress()
      let trueVal = parseInt(precent * config.device_height / 100)
      ui.floatyY.text('' + trueVal)
      config.min_floaty_y = trueVal
      setFloatyStatusIfExist()
    })

    function getTrueValue (progress, rangeInfo) {
      return parseInt(rangeInfo[0] + getGap(rangeInfo) * progress / 100)
    }

    let textChangeCall = () => {
      ui.rankCheckRegionInpt.text(config.rank_check_left + ',' + config.rank_check_top + ',' + config.rank_check_width + ',' + config.rank_check_height)
    }

    let setRegionInptVal = () => {
      textChangeCall()
      stopEmitUntil = new Date().getTime() + 3000
      sendConfigChangedBroadcast()
    }
    ui.rankCheckRegionXSeekbar.on('touch', () => {
      config.rank_check_left = getTrueValue(ui.rankCheckRegionXSeekbar.getProgress(), rankCheckRegionXRange)
      setRegionInptVal()
    })
    ui.rankCheckRegionYSeekbar.on('touch', () => {
      config.rank_check_top = getTrueValue(ui.rankCheckRegionYSeekbar.getProgress(), rankCheckRegionYRange)
      setRegionInptVal()
    })
    ui.rankCheckRegionWSeekbar.on('touch', () => {
      config.rank_check_width = getTrueValue(ui.rankCheckRegionWSeekbar.getProgress(), rankCheckRegionWRange)
      setRegionInptVal()
    })
    ui.rankCheckRegionHSeekbar.on('touch', () => {
      config.rank_check_height = getTrueValue(ui.rankCheckRegionHSeekbar.getProgress(), rankCheckRegionHRange)
      setRegionInptVal()
    })

    textChangeCall = () => {
      ui.bottomCheckRegionInpt.text(config.bottom_check_left + ',' + config.bottom_check_top + ',' + config.bottom_check_width + ',' + config.bottom_check_height)
    }
    ui.bottomCheckRegionXSeekbar.on('touch', () => {
      config.bottom_check_left = getTrueValue(ui.bottomCheckRegionXSeekbar.getProgress(), bottomCheckRegionXRange)
      setRegionInptVal()
    })
    ui.bottomCheckRegionYSeekbar.on('touch', () => {
      config.bottom_check_top = getTrueValue(ui.bottomCheckRegionYSeekbar.getProgress(), bottomCheckRegionYRange)
      setRegionInptVal()
    })
    ui.bottomCheckRegionWSeekbar.on('touch', () => {
      config.bottom_check_width = getTrueValue(ui.bottomCheckRegionWSeekbar.getProgress(), bottomCheckRegionHRange)
      setRegionInptVal()
    })
    ui.bottomCheckRegionHSeekbar.on('touch', () => {
      config.bottom_check_height = getTrueValue(ui.bottomCheckRegionHSeekbar.getProgress(), bottomCheckRegionWRange)
      setRegionInptVal()
    })


    ui.showFloatyPointConfig.on('click', () => {
      Promise.resolve().then(() => {
        return dialogs.rawInput('请输入X坐标：', config.min_floaty_x + '')
      }).then(x => {
        if (x) {
          let xVal = parseInt(x)
          if (isFinite(xVal)) {
            config.min_floaty_x = xVal
          } else {
            toast('输入值无效')
          }
        }
      }).then(() => {
        return dialogs.rawInput('请输入Y坐标：', config.min_floaty_y + '')
      }).then(y => {
        if (y) {
          let yVal = parseInt(y)
          if (isFinite(yVal)) {
            config.min_floaty_y = yVal
          } else {
            toast('输入值无效')
          }
        }
      }).then(() => {
        ui.floatyX.text(config.min_floaty_x + '')
        ui.floatyXSeekBar.setProgress(parseInt(config.min_floaty_x / config.device_width * 100))
        ui.floatyY.text(config.min_floaty_y + '')
        ui.floatyYSeekBar.setProgress(parseInt(config.min_floaty_y / config.device_height * 100))
        setFloatyStatusIfExist()
      })

    })

    ui.testFloatyPosition.on('click', () => {
      threadPool.execute(function () {
        try {
          floatyLock.lock()
          if (floatyWindow === null) {
            sleep(300)
            toastLog('准备初始化悬浮窗')
            floatyWindow = floaty.rawWindow(
              <frame gravity='left'>
                <text id='content' textSize='8dp' textColor='#00ff00' />
              </frame>
            )
            setFloatyStatusIfExist()
          }
        } catch (e) {
          toastLog(e)
        } finally {
          floatyLock.unlock()
        }
      })
    })

    ui.helpFriendChkBox.on('click', () => {
      config.help_friend = ui.helpFriendChkBox.isChecked()
    })

    ui.notLingeringFloatWindowChkBox.on('click', () => {
      config.not_lingering_float_window = ui.notLingeringFloatWindowChkBox.isChecked()
    })

    ui.isCycleChkBox.on('click', () => {
      config.is_cycle = ui.isCycleChkBox.isChecked()
      ui.cycleTimeContainer.setVisibility(config.is_cycle ? View.VISIBLE : View.INVISIBLE)
      ui.neverStopContainer.setVisibility(config.is_cycle ? View.GONE : View.VISIBLE)
      ui.countdownContainer.setVisibility(config.is_cycle || config.never_stop ? View.GONE : View.VISIBLE)
    })

    ui.isNeverStopChkBox.on('click', () => {
      config.never_stop = ui.isNeverStopChkBox.isChecked()
      ui.reactiveTimeContainer.setVisibility(config.never_stop ? View.VISIBLE : View.INVISIBLE)
      ui.countdownContainer.setVisibility(config.never_stop ? View.GONE : View.VISIBLE)
    })

    ui.showDebugLogChkBox.on('click', () => {
      config.show_debug_log = ui.showDebugLogChkBox.isChecked()
    })

    ui.showEngineIdChkBox.on('click', () => {
      config.show_engine_id = ui.showEngineIdChkBox.isChecked()
    })

    ui.developModeChkBox.on('click', () => {
      config.develop_mode = ui.developModeChkBox.isChecked()
      ui.developModeContainer.setVisibility(config.develop_mode ? View.VISIBLE : View.GONE)
    })

    ui.developSavingModeChkBox.on('click', () => {
      config.develop_saving_mode = ui.developSavingModeChkBox.isChecked()
    })

    ui.cutAndSaveCountdownChkBox.on('click', () => {
      config.cutAndSaveCountdown = ui.cutAndSaveCountdownChkBox.isChecked()
    })

    ui.cutAndSaveTreeCollectChkBox.on('click', () => {
      config.cutAndSaveTreeCollect = ui.cutAndSaveTreeCollectChkBox.isChecked()
    })

    ui.saveLogFileChkBox.on('click', () => {
      config.save_log_file = ui.saveLogFileChkBox.isChecked()
      ui.fileSizeContainer.setVisibility(config.save_log_file ? View.VISIBLE : View.GONE)
      ui.asyncSaveLogFileChkBox.setVisibility(config.save_log_file ? View.VISIBLE : View.GONE)
    })

    ui.asyncSaveLogFileChkBox.on('click', () => {
      config.async_save_log_file = ui.asyncSaveLogFileChkBox.isChecked()
    })

    ui.requestCapturePermissionChkBox.on('click', () => {
      config.request_capture_permission = ui.requestCapturePermissionChkBox.isChecked()
    })

    ui.autoSetBrightnessChkBox.on('click', () => {
      config.auto_set_brightness = ui.autoSetBrightnessChkBox.isChecked()
    })

    ui.checkDevicePostureChkBox.on('click', () => {
      config.check_device_posture = ui.checkDevicePostureChkBox.isChecked()
      ui.checkDistanceChkBox.setVisibility(config.check_device_posture ? View.VISIBLE : View.GONE)
      ui.senrsorInfoContainer.setVisibility(config.check_device_posture ? View.VISIBLE : View.GONE)
      if (config.check_device_posture) {
        registerSensors()
      } else {
        unregisterSensors()
      }
    })

    ui.checkDistanceChkBox.on('click', () => {
      config.check_distance = ui.checkDistanceChkBox.isChecked()
    })

    ui.dismissDialogIfLockedChkBox.on('click', () => {
      config.dismiss_dialog_if_locked = ui.dismissDialogIfLockedChkBox.isChecked()
    })

    ui.enableCallStateControlChkBox.on('click', () => {
      config.enable_call_state_control = ui.enableCallStateControlChkBox.isChecked()
    })

    ui.asyncWaitingCaptureChkBox.on('click', () => {
      config.async_waiting_capture = ui.asyncWaitingCaptureChkBox.isChecked()
      ui.asyncWaitingCaptureContainer.setVisibility(config.async_waiting_capture ? View.VISIBLE : View.GONE)
    })

    ui.autoLockChkBox.on('click', () => {
      let checked = ui.autoLockChkBox.isChecked()
      config.auto_lock = checked
      ui.lockPositionContainer.setVisibility(checked && !_hasRootPermission ? View.VISIBLE : View.INVISIBLE)
    })

    ui.lockXSeekBar.on('touch', () => {
      let precent = ui.lockXSeekBar.getProgress()
      let trueVal = parseInt(precent * config.device_width / 100)
      ui.lockX.text('' + trueVal)
      config.lock_x = trueVal
    })

    ui.lockYSeekBar.on('touch', () => {
      let precent = ui.lockYSeekBar.getProgress()
      let trueVal = parseInt(precent * config.device_height / 100)
      ui.lockY.text('' + trueVal)
      config.lock_y = trueVal
    })

    ui.showLockPointConfig.on('click', () => {
      Promise.resolve().then(() => {
        return dialogs.rawInput('请输入X坐标：', config.lock_x + '')
      }).then(x => {
        if (x) {
          let xVal = parseInt(x)
          if (isFinite(xVal)) {
            config.lock_x = xVal
          } else {
            toast('输入值无效')
          }
        }
      }).then(() => {
        return dialogs.rawInput('请输入Y坐标：', config.lock_y + '')
      }).then(y => {
        if (y) {
          let yVal = parseInt(y)
          if (isFinite(yVal)) {
            config.lock_y = yVal
          } else {
            toast('输入值无效')
          }
        }
      }).then(() => {
        ui.lockX.text(config.lock_x + '')
        ui.lockXSeekBar.setProgress(parseInt(config.lock_x / config.device_width * 100))
        ui.lockY.text(config.lock_y + '')
        ui.lockYSeekBar.setProgress(parseInt(config.lock_y / config.device_height * 100))
      })
    })

    ui.password.addTextChangedListener(
      TextWatcherBuilder(text => { config.password = text + '' })
    )

    ui.alipayLockPasswordInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.alipay_lock_password = text + '' })
    )

    ui.isAlipayLockedChkBox.on('click', () => {
      config.is_alipay_locked = ui.isAlipayLockedChkBox.isChecked()
      ui.alipayLockPasswordContainer.setVisibility(config.is_alipay_locked ? View.VISIBLE : View.GONE)
    })

    ui.floatyTextSizeInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        config.min_floaty_text_size = parseInt(text)
        setFloatyStatusIfExist()
      })
    )
    ui.cycleTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.cycle_times = parseInt(text) })
    )
    ui.maxCollectWaitTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.max_collect_wait_time = parseInt(text) })
    )

    ui.reactiveTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        let reactiveTime = text
        let rangeCheckRegex = /^(\d+)-(\d+)$/
        if (isNaN(reactiveTime)) {
          if (rangeCheckRegex.test(reactiveTime)) {
            let execResult = rangeCheckRegex.exec(reactiveTime)
            let start = parseInt(execResult[1])
            let end = parseInt(execResult[2])
            if (start < end && start > 0) {
              config.reactive_time = reactiveTime
              ui.reactiveTimeDisplay.setText('当前设置为从 ' + start + ' 到 ' + end + ' 分钟的随机范围')
            } else {
              toast('随机范围应当大于零，且 start < end')
            }
          } else {
            toast('随机范围请按此格式输入: 5-10')
          }
        } else {
          reactiveTime = parseInt(reactiveTime)
          if (reactiveTime > 0) {
            config.reactive_time = reactiveTime
            ui.reactiveTimeDisplay.setText('当前设置为 ' + reactiveTime + ' 分钟')
          } else {
            toast('请输入正整数')
          }
        }
      })
    )

    ui.timeoutUnlockInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.timeout_unlock = parseInt(text) })
    )

    ui.timeoutFindOneInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.timeout_findOne = parseInt(text) })
    )

    ui.timeoutExistingInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.timeout_existing = parseInt(text) })
    )

    ui.captureWaitingTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.capture_waiting_time = parseInt(text) })
    )

    ui.postureThresholdZInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        let value = parseInt(text)
        if (value > 0 && value < 9) {
          config.posture_threshod_z = value
        } else {
          toast('请输入一个介于0-9的数字，推荐在4-7之间')
        }
      })
    )

    ui.fileSizeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.back_size = parseInt(text) })
    )

    // 进阶配置
    ui.singleScriptChkBox.on('click', () => {
      config.single_script = ui.singleScriptChkBox.isChecked()
    })
    ui.collectSelfOnlyChkBox.on('click', () => {
      config.collect_self_only = ui.collectSelfOnlyChkBox.isChecked()
      if (config.collect_self_only) {
        config.not_collect_self = false
        ui.notCollectSelfChkBox.setChecked(false)
        ui.notCollectSelfChkBox.setVisibility(View.GONE)
      } else {
        ui.notCollectSelfChkBox.setVisibility(View.VISIBLE)
      }
    })
    ui.notCollectSelfChkBox.on('click', () => {
      config.not_collect_self = ui.notCollectSelfChkBox.isChecked()
    })

    ui.showRealTimeImgConfig.on('click', () => {
      let source = FileUtils.getCurrentWorkPath() + '/test/全局悬浮窗显示-配置信息.js'
      engines.execScriptFile(source, { path: source.substring(0, source.lastIndexOf('/')) })
      sendConfigChangedBroadcast()
    })

    ui.autoSetImgOrWidgetChkBox.on('click', () => {
      config.auto_set_img_or_widget = ui.autoSetImgOrWidgetChkBox.isChecked()
      if (config.auto_set_img_or_widget) {
        // 自动判断的 默认启用图像分析
        config.base_on_image = true
        ui.baseOnImageChkBox.setChecked(true)
        config.useCustomScrollDown = true
      }
      setImageBasedUiVal()
    })

    ui.tryCollectByMultiTouchChkBox.on('click', () => {
      config.try_collect_by_multi_touch = ui.tryCollectByMultiTouchChkBox.isChecked()
    })
    ui.directBallsByHoughChkBox.on('click', () => {
      config.detect_balls_by_hough = ui.directBallsByHoughChkBox.isChecked()
    })
    ui.directUseImgCollectChkBox.on('click', () => {
      config.direct_use_img_collect_and_help = ui.directUseImgCollectChkBox.isChecked()
      if (config.direct_use_img_collect_and_help) {
        ui.multiTouchContainer.setVisibility(View.GONE)
        ui.directBallsByHoughChkBox.setVisibility(View.VISIBLE)
        config.try_collect_by_multi_touch = false
      } else {
        ui.multiTouchContainer.setVisibility(View.VISIBLE)
        ui.directBallsByHoughChkBox.setVisibility(View.GONE)
        ui.tryCollectByMultiTouchChkBox.setChecked(config.try_collect_by_multi_touch)
      }
    })

    ui.baseOnImageChkBox.on('click', () => {
      config.base_on_image = ui.baseOnImageChkBox.isChecked()
      if (config.base_on_image) {
        config.useCustomScrollDown = true
      }
      setImageBasedUiVal()
    })

    ui.recheckRankListChkBox.on('click', () => {
      config.recheck_rank_list = ui.recheckRankListChkBox.isChecked()
    })
    ui.tryCollectByStrollChkBox.on('click', () => {
      config.try_collect_by_stroll = ui.tryCollectByStrollChkBox.isChecked()
    })

    ui.limitRunnableTimeRangeChkBox.on('click', () => {
      config.limit_runnable_time_range = ui.limitRunnableTimeRangeChkBox.isChecked()
    })

    ui.checkBottomBaseImgChkBox.on('click', () => {
      config.checkBottomBaseImg = ui.checkBottomBaseImgChkBox.isChecked()
      ui.friendListScrollTimeContainer.setVisibility(config.checkBottomBaseImg ? View.GONE : View.VISIBLE)
      ui.bottomCheckContainer.setVisibility(!config.checkBottomBaseImg ? View.GONE : View.VISIBLE)
    })

    ui.checkFingerByPixelsAmountChkBox.on('click', () => {
      config.check_finger_by_pixels_amount = ui.checkFingerByPixelsAmountChkBox.isChecked()
      ui.checkFingerByPixelsAmountContainer.setVisibility(config.check_finger_by_pixels_amount ? View.VISIBLE : View.GONE)
    })

    ui.useCustomScrollDownChkBox.on('click', () => {
      config.useCustomScrollDown = ui.useCustomScrollDownChkBox.isChecked()
      ui.scrollDownContainer.setVisibility(config.useCustomScrollDown ? View.VISIBLE : View.INVISIBLE)
      ui.bottomHeightContainer.setVisibility(config.useCustomScrollDown ? View.VISIBLE : View.GONE)
    })

    ui.bottomHeightInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.bottomHeight = parseInt(text) })
    )

    ui.threadPoolSizeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.thread_pool_size = parseInt(text) })
    )

    ui.threadPoolMaxSizeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.thread_pool_max_size = parseInt(text) })
    )

    ui.threadPoolQueueSizeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.thread_pool_queue_size = parseInt(text) })
    )

    ui.threadPoolWaitingTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.thread_pool_waiting_time = parseInt(text) })
    )

    ui.scrollDownSpeedInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.scrollDownSpeed = parseInt(text) })
    )

    ui.useOcrChkBox.on('click', () => {
      config.useOcr = ui.useOcrChkBox.isChecked()
      setOcrUiVal()
    })

    ui.useTesseracOcrChkBox.on('click', () => {
      config.useTesseracOcr = ui.useTesseracOcrChkBox.isChecked()
      setOcrUiVal()
    })

    ui.autoSetThresholdChkBox.on('click', () => {
      config.autoSetThreshold = ui.autoSetThresholdChkBox.isChecked()
      ui.setThresholdContainer.setVisibility(config.autoSetThreshold ? View.GONE : View.VISIBLE)
    })

    ui.saveBase64ImgInfoChkBox.on('click', () => {
      config.saveBase64ImgInfo = ui.saveBase64ImgInfoChkBox.isChecked()
      setOcrUiVal()
    })

    ui.ocrThresholdInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.ocrThreshold = parseInt(text) })
    )
    ui.apiKeyInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.apiKey = text })
    )
    ui.secretKeyInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.secretKey = text })
    )

    ui.wateringBackChkBox.on('click', () => {
      config.wateringBack = ui.wateringBackChkBox.isChecked()
      ui.wateringThresholdContainer.setVisibility(config.wateringBack ? View.VISIBLE : View.INVISIBLE)
      ui.wateringBlackListContainer.setVisibility(config.wateringBack ? View.VISIBLE : View.GONE)
    })

    ui.wateringBackAmountSpinner.setOnItemSelectedListener(
      SpinnerItemSelectedListenerBuilder(position => {
        let chose = [10, 18, 33, 66][position]
        if (chose > config.wateringThreshold) {
          toastLog('当前选择的浇水量大于浇水阈值，请重新选择')
        } else {
          if (chose >= 33) {
            toastLog('你可真是壕无人性！' + (chose > 33 ? '6的一批' : ''))
          }
          config.targetWateringAmount = chose
        }
      })
    )

    ui.wateringThresholdInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.wateringThreshold = parseInt(text) })
    )

    ui.friendListScrollTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.friendListScrollTime = parseInt(text) })
    )

    ui.fingerImgPixelsInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.finger_img_pixels = parseInt(text) })
    )

    ui.delayStartTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.delayStartTime = parseInt(text) })
    )
    // 控件文本配置
    ui.myIdInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.my_id = text + '' })
    )
    ui.homeUiContentInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.home_ui_content = text + '' })
    )
    ui.friendHomeCheckRegexInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.friend_home_check_regex = text + '' })
    )
    ui.friendHomeUiContentInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.friend_home_ui_content = text + '' })
    )
    ui.friendNameGettingRegexInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.friend_name_getting_regex = text + '' })
    )
    ui.friendListIdInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.friend_list_id = text + '' })
    )
    ui.enterFriendListUiContentInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.enter_friend_list_ui_content = text + '' })
    )
    ui.noMoreUiContentInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.no_more_ui_content = text + '' })
    )
    ui.loadMoreUiContentInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.load_more_ui_content = text + '' })
    )
    ui.wateringWidgetContentInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.watering_widget_content = text + '' })
    )
    ui.doWateringWidgetContentInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.do_watering_button_content = text + '' })
    )
    ui.usingProtectContentInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.using_protect_content = text + '' })
    )
    ui.rankCheckRegionInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        if (new Date().getTime() > stopEmitUntil) {
          let newVal = text + ''
          let regex = /^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/
          if (regex.test(newVal)) {
            let match = regex.exec(newVal)
            config.rank_check_left = parseInt(match[1])
            config.rank_check_top = parseInt(match[2])
            config.rank_check_width = parseInt(match[3])
            config.rank_check_height = parseInt(match[4])
            setRegionSeekBars()
          } else {
            toast('输入值无效')
          }
        }
      })
    )

    ui.bottomCheckRegionInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        if (new Date().getTime() > stopEmitUntil) {
          let newVal = text + ''
          let regex = /^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/
          if (regex.test(newVal)) {
            let match = regex.exec(newVal)
            config.bottom_check_left = parseInt(match[1])
            config.bottom_check_top = parseInt(match[2])
            config.bottom_check_width = parseInt(match[3])
            config.bottom_check_height = parseInt(match[4])
            setRegionSeekBars()
          } else {
            toast('输入值无效')
          }
        }
      })
    )

    ui.bottomCheckGrayColorInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        let val = text + ''
        if (val) {
          val = val.trim()
        }
        if (/^#[\dabcdef]{6}$/i.test(val)) {
          ui.bottomCheckGrayColorInpt.setTextColor(colors.parseColor(val))
          config.bottom_check_gray_color = val
        } else {
          toast('颜色值无效，请重新输入')
        }
      })
    )

    ui.canCollectColorInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        let val = text + ''
        if (val) {
          val = val.trim()
        }
        if (/^#[\dabcdef]{6}$/i.test(val)) {
          ui.canCollectColorInpt.setTextColor(colors.parseColor(val))
          config.can_collect_color = val
        } else {
          toast('颜色值无效，请重新输入')
        }
      })
    )
    ui.canHelpColorInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        let val = text + ''
        if (val) {
          val = val.trim()
        }
        if (/^#[\dabcdef]{6}$/i.test(val)) {
          ui.canHelpColorInpt.setTextColor(colors.parseColor(val))
          config.can_help_color = val
        } else {
          toast('颜色值无效，请重新输入')
        }
      })
    )
    ui.collectableEnergyBallContentInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.collectable_energy_ball_content = text + '' })
    )


    console.verbose('界面初始化耗时' + (new Date().getTime() - start) + 'ms')
    setTimeout(function () {
      if (loadingDialog !== null) {
        loadingDialog.dismiss()
      }
    }, 800)
  }, 800)

  ui.emitter.on('pause', () => {
    let isBlank = function (val) {
      return typeof val === 'undefined' || val === null || val === '' || ('' + val).trim() === ''
    }
    // 校验OCR配置是否有效
    if (config.useOcr && (isBlank(config.apiKey) || isBlank(config.secretKey))) {
      config.useOcr = false
    }
    Object.keys(default_config).forEach(key => {
      let newVal = config[key]
      if (typeof newVal !== 'undefined') {
        storageConfig.put(key, newVal)
      } else {
        storageConfig.put(key, default_config[key])
      }
    })
    sendConfigChangedBroadcast()
  })

  function sendConfigChangedBroadcast () {
    console.verbose(engines.myEngine().id + ' 发送广播 通知配置变更')
    events.broadcast.emit(CONFIG_STORAGE_NAME + 'config_changed', { config: config, id: engines.myEngine().id })
  }
}

/**
 * 脚本更新后自动恢复一些不太稳定的配置
 */
function resetConfigsIfNeeded() {
  if (config.friend_home_ui_content.indexOf('|.*大树成长记录') > 0) {
    config.friend_home_ui_content.replace('|.*大树成长记录', '')
    storageConfig.put('friend_home_ui_content', config.friend_home_ui_content)
  }
  // 首次更新 直接关闭控件分析，开启图像分析
  if (config.updated_temp_flag_1326) {
    config.auto_set_img_or_widget = false
    config.base_on_image = true
    config.direct_use_img_collect_and_help = true
    storageConfig.put('updated_temp_flag_1326', false)
    storageConfig.put('auto_set_img_or_widget', false)
    storageConfig.put('base_on_image', true)
    storageConfig.put('direct_use_img_collect_and_help', true)
  }
  if (config.updated_temp_flag_1327) {
    if (config.friend_home_ui_content === 'TA的好友.*|今天') {
      config.friend_home_ui_content = default_config.friend_home_ui_content
      storageConfig.put('friend_home_ui_content', default_config.friend_home_ui_content)
    }
    storageConfig.put('updated_temp_flag_1327', false)
  }
}