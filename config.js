/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-09 20:42:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2023-07-08 22:38:45
 * @Description: 
 */
require('./lib/Runtimes.js')(global)
let currentEngine = engines.myEngine().getSource() + ''
let isRunningMode = currentEngine.endsWith('/config.js') && typeof module === 'undefined'
let is_pro = !!Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
let default_config = {
  unlock_device_flag: 'normal',
  password: '',
  is_alipay_locked: false,
  alipay_lock_password: '',
  color_offset: 20,
  // 是否显示状态栏的悬浮窗，避免遮挡，悬浮窗位置可以通过后两项配置修改 min_floaty_x[y]
  show_small_floaty: true,
  not_lingering_float_window: false,
  release_screen_capture_when_waiting: false,
  not_setup_auto_start: false,
  disable_all_auto_start: false,
  min_floaty_x: 150,
  min_floaty_y: 20,
  min_floaty_color: '#00ff00',
  min_floaty_text_size: 8,
  no_friend_list_countdown: false,
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
  random_sleep_time: 500,
  max_collect_wait_time: 60,
  show_debug_log: true,
  show_engine_id: false,
  // 日志保留天数
  log_saved_days: 3,
  develop_mode: false,
  develop_saving_mode: false,
  check_device_posture: false,
  check_distance: false,
  posture_threshold_z: 6,
  // 执行冷却
  cool_down_if_collect_too_much: true,
  cool_down_per_increase: 600,
  cool_down_minutes: 30,
  cool_down_time: 10,
  // 电量保护，低于该值延迟60分钟执行脚本
  battery_keep_threshold: 20,
  // 开发用开关，截图并保存一些图片
  // 保存好友页面可收取和可帮助图片
  cutAndSaveTreeCollect: false,
  // 保存好友页面未找到可收取能量球的图片
  cutAndSaveTreeNoCollect: false,
  auto_lock: device.sdkInt >= 28,
  lock_x: 150,
  lock_y: 970,
  // 是否根据当前锁屏状态来设置屏幕亮度，当锁屏状态下启动时 设置为最低亮度，结束后设置成自动亮度
  auto_set_brightness: false,
  // 锁屏启动关闭提示框
  dismiss_dialog_if_locked: true,
  // 佛系模式
  buddha_like_mode: false,
  // 多设备可信登录
  multi_device_login: false,
  request_capture_permission: true,
  capture_permission_button: 'START NOW|立即开始|允许',
  // 是否保存日志文件，如果设置为保存，则日志文件会按时间分片备份在logback/文件夹下
  save_log_file: true,
  // 异步写入日志文件
  async_save_log_file: true,
  back_size: '100',
  // 控制台最大日志长度，仅免费版有用
  console_log_maximum_size: 1500,
  enable_call_state_control: false,
  collect_self_only: false,
  not_collect_self: false,
  // 当有收集或者帮助后 重新检查排行榜
  // recheck_rank_list: true,
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
  merge_countdown_by_gaps: false,
  countdown_gaps: 5,
  // 单脚本模式 是否只运行一个脚本 不会同时使用其他的 开启单脚本模式 会取消任务队列的功能。
  // 比如同时使用蚂蚁庄园 则保持默认 false 否则设置为true 无视其他运行中的脚本
  single_script: false,
  // 这个用于控制列表滑动是否稳定 不用去修改它
  friendListStableCount: 3,
  // 滑动起始底部高度
  bottomHeight: 200,
  // 是否使用模拟的滑动，如果滑动有问题开启这个 当前默认关闭 经常有人手机上有虚拟按键 然后又不看文档注释的
  useCustomScrollDown: false,
  // 排行榜列表下滑速度 200毫秒 不要太低否则滑动不生效 仅仅针对useCustomScrollDown=true的情况
  scrollDownSpeed: 200,
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
  useBaiduOcr: false,
  // 倒计时使用模拟OCR
  countdown_mock_ocr: true,
  // 本地ocr优先级
  local_ocr_priority: 'auto',
  // 识别像素点阈值 识别到倒计时的绿色像素点 像素点越多数字相对越小，设置大一些可以节省调用次数 毕竟每天只有500次
  ocrThreshold: 2600,
  autoSetThreshold: false,
  // 是否记录图片base64信息到日志中
  saveBase64ImgInfo: false,
  // ApiKey和SecretKey都来自百度AI平台 需要自己申请
  apiKey: '',
  // 秘钥
  secretKey: '',
  my_id: '',
  rain_entry_content: '.*能量雨.*',
  rain_start_content: '再来一次|立即开启',
  rain_end_content: '.*去蚂蚁森林看看.*',
  send_chance_to_friend: '',
  timeout_rain_find_friend: 3000,
  rain_click_top: 400,
  rain_click_gap: null,
  rain_press_duration: 7,
  suspend_on_alarm_clock: false,
  suspend_alarm_content: '滑动关闭闹钟',
  delay_start_pay_code_content: '向商家付(钱|款)',
  home_ui_content: '森林新消息|最新动态',
  friend_home_check_regex: '(你收取TA|TA收取你).*',
  friend_name_getting_regex: '(.*)的蚂蚁森林',
  magic_species_text: '点击发现|抽取今日|点击开启',
  magic_species_text_in_stroll: '.*神奇物种新图鉴.*',
  // 查看更多好友的按钮
  enter_friend_list_ui_content: '.*查看更多好友.*',
  no_more_ui_content: '没有更多了',
  load_more_ui_content: '查看更多',
  watering_widget_content: '浇水',
  do_watering_button_content: '送给\\s*TA|浇水送祝福',
  friend_load_more_content: '(点击)?展开好友动态',
  using_protect_content: '使用了保护罩',
  friend_list_max_scroll_down_time: 30,
  friend_list_end_content: '.*没有更多了.*',
  friend_list_countdown_timeout: 10000,
  can_collect_color_lower: '#008A31',
  can_collect_color_upper: '#6FDC90',
  // 配置可收取能量球颜色范围
  collectable_lower: '#9BDA00',
  collectable_upper: '#E1FF2F',
  water_lower: '#e8cb3a',
  water_upper: '#ffed8e',
  // 神奇海洋识别区域
  sea_ocr_left: 10,
  sea_ocr_top: 1800,
  sea_ocr_width: 370,
  sea_ocr_height: 240,
  sea_ball_region: null,
  sea_ball_radius_min: null,
  sea_ball_radius_max: null,
  // 排行榜校验区域
  rank_check_left: 190,
  rank_check_top: 170,
  rank_check_width: 750,
  rank_check_height: 200,
  // 能量球所在范围
  auto_detect_tree_collect_region: true,
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
  // 跳过好友浇水能量球
  skip_own_watering_ball: false,
  hough_param1: 30,
  hough_param2: 30,
  hough_min_radius: null,
  hough_max_radius: null,
  hough_min_dst: null,
  // 使用双击卡
  double_click_card_used: false,
  // 快速收集模式
  fast_collect_mode: false,
  // 是否是AutoJS Pro  需要屏蔽部分功能，暂时无法实现：生命周期监听等 包括通话监听
  is_pro: is_pro,
  // 逛一逛结束是否进行能量雨收集
  collect_rain_when_stroll: true,
  // 逛一逛结束后重复一遍
  recheck_after_stroll: false,
  stroll_end_ui_content: '^返回(我的|蚂蚁)森林>?|去蚂蚁森林.*$',
  stroll_button_regenerate: true,
  stroll_button_left: null,
  stroll_button_top: null,
  stroll_button_width: null,
  stroll_button_height: null,
  auto_set_bang_offset: true,
  bang_offset: 0,
  limit_runnable_time_range: true,
  // 当以下包正在前台运行时，延迟执行
  skip_running_packages: [],
  warn_skipped_ignore_package: false,
  warn_skipped_too_much: false,
  enable_visual_helper: false,
  auto_restart_when_crashed: true,
  thread_name_prefix: 'antforest_',
  package_name: 'com.eg.android.AlipayGphone',
  auto_check_update: true,
  github_url: 'https://github.com/TonyJiangWJ/Ant-Forest',
  gitee_url: 'https://gitee.com/TonyJiangWJ/Ant-Forest',
  qq_group: '524611323',
  qq_group_url: 'https://jq.qq.com/?_wv=1027&k=uYq7S3hr',
  github_latest_url: 'https://api.github.com/repos/TonyJiangWJ/Ant-Forest/releases/latest',
  gitee_relase_url: 'https://gitee.com/api/v5/repos/TonyJiangWJ/Ant-Forest/releases/latest',
  history_tag_url: 'https://api.github.com/repos/TonyJiangWJ/Ant-Forest/tags',
  gitee_package_prefix: 'Ant-Forest-',
  gitee_package_url: 'https://gitee.com/TonyJiangWJ/Ant-Forest/raw/release_pkgs/',
  release_access_token: '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',
  enable_watering_cooperation: false,
  watering_cooperation_name: '',
  watering_cooperation_amount: '',
  watering_cooperation_threshold: '',
  // 能量雨设置
  rain_collect_debug_mode: false,
  rain_collect_duration: 18,
  auto_start_rain: false,
  // 设置无障碍权限时开启其他的无障碍权限
  other_accessisibility_services: '',
  // 不需要执行resolver
  noneed_resolve_dex: false,
  // 标记是否清除webview缓存
  clear_webview_cache: false,
  // 更新后需要强制执行的标记
  updated_temp_flag_13732: true,
  // 多账号管理
  accounts: [],
  main_account: '',
  main_userid: '',
  main_account_username: '',
  watering_main_at: 'collect',
  watering_main_account: true,
  to_main_by_user_id: true,
  enable_multi_account: false,
  pushplus_token: '',
  pushplus_walking_data: true,
  // 配置界面webview打印日志
  webview_loging: false,
  random_gesture_safe_range_top: '',
  random_gesture_safe_range_bottom: '',
  // 代码版本
  code_version: 'v1.3.8.2',
}
// 文件更新后直接生效，不使用缓存的值
let no_cache_configs = ['release_access_token', 'code_version']
let securityFields = ['password', 'alipay_lock_password']
let objFields = []
let CONFIG_STORAGE_NAME = 'ant_forest_config_fork_version'
let PROJECT_NAME = '蚂蚁森林能量收集'
let config = {}
let storageConfig = storages.create(CONFIG_STORAGE_NAME)
let AesUtil = require('./lib/AesUtil.js')
let aesKey = device.getAndroidId()
Object.keys(default_config).forEach(key => {
  let storedVal = storageConfig.get(key)
  if (typeof storedVal !== 'undefined' && no_cache_configs.indexOf(key) < 0) {
    config[key] = getConfigValue(storedVal, key)
  } else {
    config[key] = default_config[key]
  }
})
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

config.scaleRate = (() => {
  let width = config.device_width
  if (width >= 1440) {
    return 1440 / 1080
  } else if (width < 1000) {
    return 720 / 1080
  } else {
    if (config.device_width * config.device_height > 3000000) {
      // K50U 1.5k屏幕
      return config.device_width / 1080
    }
    return 1
  }
})()

// 覆写配置信息
config.overwrite = (key, value) => {
  let storage_name = CONFIG_STORAGE_NAME
  let config_key = key
  if (key.indexOf('.') > -1) {
    let keyPair = key.split('.')
    storage_name = CONFIG_STORAGE_NAME + '_' + keyPair[0]
    key = keyPair[1]
    config_key = keyPair[0] + '_config'
    if (!config.hasOwnProperty(config_key) || !config[config_key].hasOwnProperty(key)) {
      return
    }
    config[config_key][key] = value
  } else {
    if (!config.hasOwnProperty(config_key)) {
      return
    }
    config[config_key] = value
  }
  console.verbose('覆写配置', storage_name, key)
  storages.create(storage_name).put(key, value)
}
// 扩展配置
let workpath = getCurrentWorkPath()
let configDataPath = workpath + '/config_data/'
let default_image_config = {};
[
  'reward_for_plant', 'backpack_icon', 'sign_reward_icon', 'water_icon',
  'stroll_icon', 'watering_cooperation', 'magic_species_icon'
].forEach(key => {
  if (!files.exists(configDataPath + key + '.data')) {
    default_image_config[key] = ''
    return
  }
  default_image_config[key] = files.read(configDataPath + key + '.data')
})
default_config.image_config = default_image_config
config.image_config = convertDefaultData(default_image_config, CONFIG_STORAGE_NAME + '_image')

resetConfigsIfNeeded()
if (!isRunningMode) {
  if (!currentEngine.endsWith('/config.js')) {
    config.recalculateRegion()
  }
  module.exports = function (__runtime__, scope) {
    if (typeof scope.config_instance === 'undefined') {
      console.verbose('config未实例化，准备实例化config.js')
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

      // 安全范围
      config.topRange = () => getRange(config.random_gesture_safe_range_top)
      config.bottomRange = () => getRange(config.random_gesture_safe_range_bottom)

      scope.config_instance = {
        config: config,
        default_config: default_config,
        storage_name: CONFIG_STORAGE_NAME,
        securityFields: securityFields,
        project_name: PROJECT_NAME
      }
      if (currentEngine.endsWith('/main.js') || scope.subscribe_config_change) {
        // 运行main.js时监听配置是否变更 实现动态更新配置
        let processShare = require('./lib/prototype/ProcessShare.js')
        processShare
          // 设置缓冲区大小为2MB
          .setBufferSize(2048 * 1024)
          .loop().setInterval(scope.subscribe_interval).subscribe(function (newConfigInfos) {
            try {
              newConfigInfos = JSON.parse(newConfigInfos)
              Object.keys(newConfigInfos).forEach(key => {
                scope.config_instance.config[key] = getConfigValue(newConfigInfos[key], key)
              })
              if (scope.subscribe_callback) {
                scope.subscribe_callback(scope.config_instance.config)
              }
            } catch (e) {
              console.error('接收到config变更消息，但是处理发生异常', newConfigInfos, e)
            }
          }, -1, scope.subscribe_file_name || '.configShare')
      }
    }
    return scope.config_instance
  }
} else {
  toastLog('可视化配置工具已经迁移，下次请直接运行`可视化配置.js`, 三秒后将自动启动')
  setTimeout(function () {
    engines.execScriptFile(files.cwd() + "/可视化配置.js", { path: files.cwd() })
  }, 3000)
}

/**
 * 脚本更新后自动恢复一些不太稳定的配置
 */
function resetConfigsIfNeeded () {
  let resetFields = [
    'friend_home_check_regex',
  ]
  if (config.updated_temp_flag_13732) {
    resetFields.forEach(key => {
      config[key] = default_config[key]
      storageConfig.put(key, default_config[key])
    })
    storageConfig.put('updated_temp_flag_13732', false)
  }
}

function convertDefaultData (default_config, config_storage_name) {
  let config_storage = storages.create(config_storage_name)
  let configData = {}
  Object.keys(default_config).forEach(key => {
    configData[key] = config_storage.get(key, default_config[key])
  })
  return configData
}
function resetImgDefault (default_config, config_storage_name) {
  let config_storage = storages.create(config_storage_name)
  let configData = {}
  Object.keys(default_config).forEach(key => {
    configData[key] = default_config[key]
    config_storage.put(key, default_config[key])
  })
  return configData
}

function getCurrentWorkPath () {
  let currentPath = files.cwd()
  if (files.exists(currentPath + '/main.js')) {
    return currentPath
  }
  let paths = currentPath.split('/')

  do {
    paths = paths.slice(0, paths.length - 1)
    currentPath = paths.reduce((a, b) => a += '/' + b)
  } while (!files.exists(currentPath + '/main.js') && paths.length > 0)
  if (paths.length > 0) {
    return currentPath
  }
}

function getConfigValue (configValue, key) {
  if (securityFields.indexOf(key) > -1) {
    try {
      configValue = AesUtil.decrypt(configValue, aesKey) || configValue
      if (objFields.indexOf(key) > -1) {
        configValue = JSON.parse(configValue)
      }
    } catch (e) {
      console.error('解密字段失败：', key)
    }
  }
  return configValue
}

function getRange (config_value) {
  let rangeRegex = /^(\d+)-(\d+)$/
  if (config_value && rangeRegex.test(config_value)) {
    let result = rangeRegex.exec(config_value)
    let start = parseInt(result[1])
    let end = parseInt(result[2])
    return { start: start, end: end }
  }
  return null
}
