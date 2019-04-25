/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-04-01 14:15:55
 * @Description: 配置文件
 */

// 执行配置
var config = {
  color_offset: 50,
  password: "123456",
  help_friend: true,
  is_cycle: false,
  cycle_times: 10,
  timeout_unlock: 1000,
  timeout_findOne: 1000,
  max_collect_repeat: 20,
  max_collect_wait_time: 60,
  white_list: [],
  auto_start: true,
  auto_start_same_day: true,
  /**
   * 设置自动启动时间为 6:55:00
   */
  auto_start_hours: 6,
  auto_start_minutes: 55,
  auto_start_seconds: 0,
  // 是否跳过低于五克的能量，避免频繁偷别人的
  skip_five: true,
  // 是否显示调试日志信息
  show_debug_log: true,
  // 是否toast调试日志
  toast_debug_info: false,
  // 是否在收集完成后根据收集前状态判断是否锁屏，非ROOT设备通过下拉状态栏中的锁屏按钮实现 需要配置锁屏按钮位置
  auto_lock: false,
  // 配置锁屏按钮位置
  lock_x: 150,
  lock_y: 970
};

module.exports = config;
