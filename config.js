/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-09 20:42:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-08 00:39:41
 * @Description: 
 */
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
  help_friend: false,
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
  posture_threshold_z: 6,
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
  capture_permission_button: 'START NOW|立即开始|允许',
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
  friend_home_check_regex: '你收取TA|TA收取你',
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
  help_and_notify: '知道了.*去提醒',
  // 配置帮助收取能量球的颜色，用于查找帮助收取的能量球
  can_collect_color_gray: '#828282',
  can_help_color: '#f99236',
  collectable_lower: '#a5c600',
  collectable_upper: '#ffff5d',
  helpable_lower: '#6f0028',
  helpable_upper: '#ffb2b2',
  valid_collectable_lower: '#77cc00',
  valid_collectable_upper: '#ffff91',
  // 排行榜校验区域
  rank_check_left: 250,
  rank_check_top: 250,
  rank_check_width: 550,
  rank_check_height: 130,
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
  use_double_click_card: false,
  // 是否是AutoJS Pro  需要屏蔽部分功能，暂时无法实现：生命周期监听等 包括通话监听
  is_pro: is_pro,
  // 尝试先逛一逛进行能量收取
  try_collect_by_stroll: true,
  stroll_end_ui_content: '返回我的森林',
  collect_by_stroll_only: false,
  stroll_button_regenerate: true,
  auto_set_bang_offset: true,
  bang_offset: 0,
  limit_runnable_time_range: true,
  // 当以下包正在前台运行时，延迟执行
  skip_running_packages: [],
  enable_visual_helper: false,
  auto_restart_when_crashed: true,
  // 更新后需要强制执行的标记
  updated_temp_flag_1328: true,
  updated_temp_flag_1346: true,
  thread_name_prefix: 'antforest_',
  package_name: 'com.eg.android.AlipayGphone'
}
// 自动生成的配置数据 
let auto_generate_config = {
  stroll_button_left: null,
  stroll_button_top: null,
  stroll_button_width: null,
  stroll_button_height: null,
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
Object.keys(auto_generate_config).forEach(key => {
  let storedVal = storageConfig.get(key)
  if (typeof storedVal !== 'undefined') {
    config[key] = storedVal
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

config.scaleRate = (() => {
  let width = config.device_width
  if (width >= 1440) {
    return 1440 / 1080
  } else if (width < 1000) {
    return 720 / 1080
  } else {
    return 1
  }
})()

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
  toastLog('可视化配置工具已经迁移，下次请直接运行`可视化配置.js`, 三秒后将自动启动')
  setTimeout(function () {
    engines.execScriptFile(files.cwd() + "/可视化配置.js", { path: files.cwd() })
  }, 3000)
}

/**
 * 脚本更新后自动恢复一些不太稳定的配置
 */
function resetConfigsIfNeeded () {
  if (config.friend_home_check_regex === '浇水') {
    config.friend_home_check_regex = default_config.friend_home_check_regex
    storageConfig.put('friend_home_check_regex', default_config.friend_home_check_regex)
  }
  if (config.updated_temp_flag_1346) {
    // 默认关闭帮助收取，帮收还得发通知，容易影响到别人
    config.help_friend = default_config.help_friend
    storageConfig.put('updated_temp_flag_1346', false)
  }
  let resetFields = [
    'collectable_lower',
    'collectable_upper',
    'helpable_lower',
    'helpable_upper',
    'valid_collectable_lower',
    'valid_collectable_upper'
  ]
  if (config.updated_temp_flag_1347) {
    resetFields.forEach(key => {
      config[key] = default_config[key]
    })
    storageConfig.put('updated_temp_flag_1347', false)
  }
}
