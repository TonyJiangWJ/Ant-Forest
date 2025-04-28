/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-09 20:42:08
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-04-25 09:18:40
 * @Description: 
 */
require('./lib/Runtimes.js')(global)

let default_config = {
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
  no_friend_list_countdown: false,
  is_cycle: false,
  cycle_times: 10,
  never_stop: false,
  reactive_time: 60,
  max_collect_wait_time: 60,
  // 随机睡眠时间 最大值
  random_sleep_time: 500,
  save_home_train_data: false,
  save_no_energy_train_data: false,
  save_one_key_train_data: false,
  save_one_key_fail_train_data: false,
  // 执行冷却
  cool_down_if_collect_too_much: true,
  cool_down_per_increase: 600,
  cool_down_minutes: 30,
  cool_down_time: 10,
  // 多设备可信登录
  multi_device_login: false,
  collect_self_only: false,
  not_collect_self: false,
  // 是否控制脚本运行时间范围
  limit_runnable_time_range: true,
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
  // 这个用于控制列表滑动是否稳定 不用去修改它
  friendListStableCount: 3,
  // 是否开启自动浇水 每日收集某个好友达到下一个阈值之后会进行浇水
  wateringBack: true,
  // 浇水阈值40克
  wateringThreshold: 40,
  // 浇水数量
  targetWateringAmount: 10,
  // 配置不浇水的黑名单
  wateringBlackList: [],
  // 是否使用百度的ocr识别倒计时
  useBaiduOcr: false,
  // 倒计时使用模拟OCR
  countdown_mock_ocr: true,
  // 识别像素点阈值 识别到倒计时的绿色像素点 像素点越多数字相对越小，设置大一些可以节省调用次数 毕竟每天只有500次
  ocrThreshold: 2600,
  autoSetThreshold: false,
  // ApiKey和SecretKey都来自百度AI平台 需要自己申请
  apiKey: '',
  // 秘钥
  secretKey: '',
  my_id: '',
  // 是否强制进入组队模式
  force_group_mode: false,
  change_to_group: '切换为个人版',
  change_to_personal: '切换为组队版',
  group_mode_info: '小队能量.*|排名奖',
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
  home_ui_content: '森林新消息|最新动态|证书|小队能量.*',
  friend_home_check_regex: '(你收取TA|TA收取你).*|.*的蚂蚁森林',
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
  // yolo图片数据保存
  sea_ball_train_save_data: false,
  force_sea_auto_click: false,
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
  // 尝试全局点击收集能量，能量球控件无法获取时使用 默认开启
  try_collect_by_multi_touch: false,
  // 跳过好友浇水能量球
  skip_own_watering_ball: false,
  // 是否使用YOLO模型检测能量球
  detect_ball_by_yolo: false,
  yolo_confidence: null,
  yolo_shape_size: 320,
  yolo_confidence_threshold: 0.5,
  yolo_model_path: '/config_data/forest_lite.onnx',
  yolo_labels: ['cannot', 'collect', 'countdown', 'help_revive', 'item', 'tree', 'water', 'waterBall',
    'stroll_btn', 'sea_ball', 'sea_garbage', 'backpack', 'gift', 'magic_species', 'one_key', 'patrol_ball',
    'reward', 'sea_ocr', 'energy_ocr', 'cooperation'],
  hough_param1: 30,
  hough_param2: 30,
  hough_min_radius: null,
  hough_max_radius: null,
  hough_min_dst: null,
  // 二次校验
  double_check_collect: false,
  // 快速收集模式
  fast_collect_mode: false,
  // 一键收
  use_one_key_collect: false,
  // 逛一逛结束是否进行能量雨收集
  collect_rain_when_stroll: true,
  // 逛一逛结束后重复一遍
  recheck_after_stroll: false,
  stroll_end_ui_content: '^返回(我的|蚂蚁)森林>?|去蚂蚁森林.*$',
  stroll_button_regenerate: true,
  // 每次执行都重新识别逛一逛按钮
  regenerate_stroll_button_every_loop: false,
  stroll_button_left: null,
  stroll_button_top: null,
  stroll_button_width: null,
  stroll_button_height: null,
  thread_name_prefix: 'antforest_',
  package_name: 'com.eg.android.AlipayGphone',
  start_alipay_by_url: false,
  github_url: 'https://github.com/TonyJiangWJ/Ant-Forest',
  gitee_url: 'https://gitee.com/TonyJiangWJ/Ant-Forest',
  qq_group: '524611323',
  qq_group_url: 'https://jq.qq.com/?_wv=1027&k=uYq7S3hr',
  github_latest_url: 'https://api.github.com/repos/TonyJiangWJ/Ant-Forest/releases/latest',
  gitee_relase_url: 'https://gitee.com/api/v5/repos/TonyJiangWJ/Ant-Forest/releases/latest',
  history_tag_url: 'https://api.github.com/repos/TonyJiangWJ/Ant-Forest/tags',
  yolo_onnx_model_url: 'https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/forest_lite.onnx',
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
  // 邀请好友获取巡护机会
  invite_friends_gaint_chance: false,
  // 更新后需要强制执行的标记
  updated_temp_flag_1534: true,
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
  random_gesture_safe_range_top: '',
  random_gesture_safe_range_bottom: '',
  // 是否使用双击卡
  use_duplicate_card: false,
  // 双击卡使用时间段
  duplicate_card_using_time_ranges: '00:00-00:10',
  ai_type: 'kimi',// 可选 kimi、chatgml
  kimi_api_key: '',
  chatgml_api_key: '',
  // 代码版本
  code_version: 'v1.5.4.2',
  notificationId: 133,
  notificationChannelId: 'ant_forest_channel_id',
  notificationChannel: '蚂蚁森林通知',
}

let CONFIG_STORAGE_NAME = 'ant_forest_config_fork_version'
let PROJECT_NAME = '蚂蚁森林能量收集'

// 公共扩展
let config = require('./config_ex.js')(default_config, { CONFIG_STORAGE_NAME, PROJECT_NAME })

config.exportIfNeeded(module, (key, value) => {
  if (key == 'detect_ball_by_yolo') {
    config.detect_by_yolo = value
  }
})

// 图片配置相关key值
config.prepareImageConfig([
  'reward_for_plant', 'backpack_icon', 'sign_reward_icon', 'water_icon',
  'stroll_icon', 'watering_cooperation', 'magic_species_icon', 'use_item', 'one_key_collect',
  'main_account_avatar'
])

// 重置配置
config.resetConfigsIfNeeded('updated_temp_flag_1534', [
  'home_ui_content',
]);

// 蚂蚁森林 排行榜校验区域配置
(() => {
  if (config.device_height > 10 && config.device_width > 10) {
    if (config.bottom_check_top > config.device_height || config.bottom_check_top <= 0) {
      config.override('bottom_check_top', config.device_height - 50)
      config.override('bottom_check_width', config.device_width - 50)
    }

    if (config.rank_check_left + config.rank_check_width > config.device_width) {
      config.override('rank_check_left', 100)
      config.override('rank_check_width', 100)
    }
  }
})()

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
config.detect_by_yolo = config.detect_ball_by_yolo

// 安全范围
config.topRange = () => getRange(config.random_gesture_safe_range_top)
config.bottomRange = () => getRange(config.random_gesture_safe_range_bottom)



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
