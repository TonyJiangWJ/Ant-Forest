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
  // 是否显示状态栏的悬浮窗，避免遮挡，悬浮窗位置暂时未做配置管理 可在/lib/CommonFunctions.js$show_raw_floaty中[第12行]的setPosition中修改
  show_small_floaty: true,
  min_floaty_x: 150,
  min_floaty_y: 20,
  max_collect_wait_time: 60,
  white_list: [],
  auto_start: false,
  auto_start_same_day: true,
  /**
   * 设置自动启动时间为 6:55:00
   */
  auto_start_hours: 6,
  auto_start_minutes: 55,
  auto_start_seconds: 0,
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
  lock_y: 970
}

var configStorage = storages.create('ant_forest_config')
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
    config[key] = configStorage.get(key)
  })
}

module.exports = config