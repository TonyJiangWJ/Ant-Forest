/*
 * @Author: NickHopps
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-03-07 14:33:55
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
  max_collect_wait_time: 20,
  white_list: [],
  auto_start_same_day: false,
  auto_start_hours: 6,
  auto_start_minutes: 40,
  auto_start_seconds: 0
};

module.exports = config;
