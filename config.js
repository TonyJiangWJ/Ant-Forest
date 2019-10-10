/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-04-01 14:15:55
 * @Description: 配置文件
 */
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
  max_collect_repeat: 20,
  // 是否显示状态栏的悬浮窗，避免遮挡，悬浮窗位置可以通过后两项配置修改 min_floaty_x[y]
  show_small_floaty: true,
  min_floaty_x: 150,
  min_floaty_y: 20,
  max_collect_wait_time: 60,
  white_list: [],
  // 自动定时启动 其实是基于循环等待的 此项可以废弃 使用AutoJS 4.1.1 Alpha2的定时任务功能即可
  // ---↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓---
  auto_start: false,
  auto_start_same_day: true,
  /**
   * 设置自动启动时间为 6:55:00
   */
  auto_start_hours: 6,
  auto_start_minutes: 55,
  auto_start_seconds: 0,
  // ---↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑---
  // 是否跳过低于五克的能量，避免频繁偷别人的
  skip_five: false,
  // 是否显示调试日志信息
  show_debug_log: true,
  // 是否toast调试日志
  toast_debug_info: false,
  // 是否在收集完成后根据收集前状态判断是否锁屏，非ROOT设备通过下拉状态栏中的锁屏按钮实现 需要配置锁屏按钮位置
  auto_lock: false,
  // 配置锁屏按钮位置
  lock_x: 150,
  lock_y: 970,
  
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
  useCustomScrollDown: false,
  // 下滑速度 100毫秒
  scrollDownSpeed: 100,
  wateringBack: true,
  wateringThresold: 30,
  wateringBlackList: [],
  helpBallColors: ['#f99236', '#f7af70'],
  saveLogFile: true
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