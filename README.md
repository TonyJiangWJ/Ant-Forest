# 简介

基于 Autojs 的蚂蚁森林自动收能量脚本，采用  4.1.1 Alpha 版本开发。解锁模块参考自：https://github.com/e1399579/autojs

- 经过测试小米mix2s可以使用4.0.4alpha版本,4.0.5alpha会报错
- 找到最新版了 经过测试可以执行。建议下载该版本，可以直接设置定时任务，而不需要通过脚本中的定时启动方式。自备梯子：[AutoJs 4.1.1 alpha2下载](https://www.dropbox.com/s/pe3w53k0fugo1fa/Autojs%204.1.1%20Alpha2.apk?dl=0)

## 更新记录
- 本项目从https://github.com/Nick-Hopps/Ant-Forest-autoscript fork而来，但是经过了各种改动，和原版功能差异较大
- 历史版本下载可前往[RELEASES页面](https://github.com/TonyJiangWJ/Ant-Forest-autoscript/releases)

# 使用

- 下载安装 [AutoJs 4.1.1 alpha2下载](https://www.dropbox.com/s/pe3w53k0fugo1fa/Autojs%204.1.1%20Alpha2.apk?dl=0) 之后把整个脚本项目放进 __"/sdcard/脚本/"__ 文件夹下面。打开软件后下拉刷新，然后运行项目或者 main 即可。

# 功能

- 自动匹配不同系统下自动化的方式，安卓7及以上通过无障碍服务模拟操作，以下版本通过 root 权限模拟操作；
- 自动识别屏幕锁定方式并根据配置的密码解锁，支持图形解锁，PIN解锁，混合密码解锁；
- 识别自己能量球的倒计时，和好友列表中的倒计时做对比，取最小值作为下次收取的等待时间；
- 识别好友能量罩，下一次收取时跳过开启能量罩的好友；
- 默认使用倒计时收取，可通过配置打开循环收取；
- 根据设置选择是否帮助好友收取能量；
- 根据白名单实现不收取特定好友能量；
- 脚本运行时可以显示悬浮窗展示当前状态
- 开始收集的时候按音量减可以延迟五分钟再执行，适合需要使用手机的时候使用
- 收取完毕后悬浮框显示收取的能量数量。

# 配置

打开 config.js 后可以看到如下配置：

```javascript
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
  // 是否toast调试日志
  toast_debug_info: false,
  // 是否在收集完成后根据收集前状态判断是否锁屏，非ROOT设备通过下拉状态栏中的锁屏按钮实现 需要配置锁屏按钮位置，仅仅测试MIUI的 其他系统可能没法用
  // 可以自己研究研究之后 修改Automator.js中的lockScreen方法
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
  // 预加载超时，其实可以不用管这个 该值会在运行中自动配置合适的时间
  timeoutLoadFriendList: 6000,
  // 这个用于控制列表滑动是否稳定 不用去修改它
  friendListStableCount: 3,
  // 底部高度，比如有虚拟按键就需要修改这个值 设置比虚拟按键高度高就可以了
  bottomHeight: 100,
  // 是否使用模拟的滑动，如果滑动有问题开启这个
  useCustomScrollDown: false,
  // 排行榜列表下滑速度 100毫秒 仅仅针对useCustomScrollDown=true的情况
  scrollDownSpeed: 100,
  // 配置帮助收取能量球的颜色，用于查找帮助收取的能量球
  helpBallColors: ['#f99236', '#f7af70'],
  // 是否保存日志文件，如果设置为保存，则日志文件会按时间分片备份在logback/文件夹下
  saveLogFile: true
}

// UI配置 针对多语言环境 英文界面替换成相应的英文内容即可 建议还是用中文界面比较好
var ui_config = {
  home_ui_content: '背包|通知',
  friend_home_ui_content: '浇水|发消息',
  friend_list_ui_content: '好友排行榜',
  no_more_ui_content: '没有更多了',
  load_more_ui_content: '查看更多',
  warting_widget_content: '浇水',
  collectable_energy_ball_content: /.*\d+克/
}
```

其中：
- `default_config`中的配置可以运行configGui.js来可视化修改，其他两个配置`no_gui_config`和`ui_config`需要通过修改config.js文件中的值

# 添加解锁设备

在 Unlock.js 中，按照以下格式扩展：

```javascript
var Devices = {
  device_1: function(obj) {
    this.__proto__ = obj;

    this.unlock = function(password) {
      if (typeof password !== "string") throw new Error("密码应为字符串！");

      // 此处为解锁的代码

      return this.check_unlock();
    }
  },
  device_2: function(obj) {
    ...
  },
  device_3: function(obj) {
    ...
  }
}
```

上述所示为最简单的解锁模板，也可以参考 Unlock.js 默认多解锁方式的代码进行修改。

然后在下方的 MyDevice 中设置解锁设备：

```javascript
var MyDevice = Devices.device_1;
```

# 注意事项

解锁仅支持：

- 具有ROOT权限的安卓5.0及以上版本
- 没有ROOT权限的安卓7.0及以上版本

# 目前存在的问题

- MIUI10 默认锁屏主题解锁失败，修改成第三方主题可以解决
