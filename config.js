/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-04-01 14:15:55
 * @Description: 配置文件
 */
let currentEngine = engines.myEngine().getSource() + ''
if (currentEngine.endsWith('/config.js')) {
  toast('请运行configGui.js')
  exit()
}

// 执行配置
var default_config = {
  color_offset: 50,
  password: '',
  help_friend: true,
  is_cycle: false,
  cycle_times: 10,
  // 是否永不停止，即倒计时信息不存在时 睡眠reactive_time之后重新开始收集
  never_stop: false,
  // 重新激活等待时间 单位分钟
  reactive_time: 60,
  timeout_unlock: 1000,
  timeout_findOne: 1000,
  // 检测是否存在的默认超时时间，8秒
  timeout_existing: 8000,
  max_collect_repeat: 20,
  // 是否显示状态栏的悬浮窗，避免遮挡，悬浮窗位置可以通过后两项配置修改 min_floaty_x[y]
  show_small_floaty: true,
  // 设置悬浮窗的位置，避免遮挡时间之类的 或者被刘海挡住，一般异形屏的min_floaty_y值需要设为负值
  min_floaty_x: 150,
  min_floaty_y: 20,
  // 计时模式下 收集能量的最大等待时间 分钟
  max_collect_wait_time: 60,
  // 白名单列表，即不去收取他们的能量
  white_list: [],
  // 是否跳过低于五克的能量，避免频繁偷别人的 这个其实不好用 不建议开启
  skip_five: false,
  // 是否显示调试日志信息
  show_debug_log: true,
  // 是否在收集完成后根据收集前状态判断是否锁屏，非ROOT设备通过下拉状态栏中的锁屏按钮实现 需要配置锁屏按钮位置，仅仅测试MIUI的 其他系统可能没法用
  // 可以自己研究研究之后 修改Automator.js中的lockScreen方法
  auto_lock: false,
  // 配置锁屏按钮位置
  lock_x: 150,
  lock_y: 970,
  // 是否需要检测录屏弹窗
  request_capture_permission: true
}
/**
 * 非可视化控制的配置 通过手动修改config.js来实现配置
 */
let no_gui_config = {
  // 设备高度 正常情况下device.height可以获取到
  // deviceHeight: 2160,
  // 收集相关配置
  timeoutLoadFriendList: 6000,
  friendListStableCount: 3,
  // 底部高度
  bottomHeight: 100,
  useCustomScrollDown: true,
  // 下滑速度 100毫秒
  scrollDownSpeed: 100,
  wateringBack: true,
  wateringThresold: 40,
  wateringBlackList: [],
  helpBallColors: ['#f99236', '#f7af70'],
  saveLogFile: true,
  // 是否根据当前锁屏状态来设置屏幕亮度，当锁屏状态下启动时 设置为最低亮度，结束后设置成自动亮度
  autoSetBrightness: true,
  // 是否延迟启动，即将开始前弹toast信息提醒，此时可以按音量下延迟5分钟后再启动收集
  delayStart: false,
  // 延迟启动时延 5秒
  delayStartTime: 5000
}

// UI配置
var ui_config = {
  home_ui_content: '背包|通知|攻略', 
  friend_home_ui_content: '浇水|发消息',
  friend_list_ui_content: '好友排行榜',
  no_more_ui_content: '没有更多了',
  load_more_ui_content: '查看更多',
  warting_widget_content: '浇水',
  using_protect_content: '使用了保护罩',
  collectable_energy_ball_content: /收集能量\d+克/
}

// 配置缓存的key值
const CONFIG_STORAGE_NAME = 'ant_forest_config_fork_version'
var configStorage = storages.create(CONFIG_STORAGE_NAME)
var config = {}
if (!configStorage.contains('color_offset')) {
  toastLog('使用默认配置')
  // 存储默认配置到本地
  Object.keys(default_config).forEach(key => {
    configStorage.put(key, default_config[key])
  })
  config = default_config
} else {
  Object.keys(default_config).forEach(key => {
    let storedConfigItem = configStorage.get(key)
    if (storedConfigItem === undefined) {
      storedConfigItem = default_config[key]
    }
    config[key] = storedConfigItem
  })
}
// UI配置直接设置到storages
Object.keys(ui_config).forEach(key => {
  config[key] = ui_config[key]
})
// 非可视化配置
Object.keys(no_gui_config).forEach(key => {
  config[key] = no_gui_config[key]
})
module.exports = {
  config: config,
  default_config: default_config,
  storage_name: CONFIG_STORAGE_NAME
}
