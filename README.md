# 简介

基于 Autojs 的蚂蚁森林自动收能量脚本，采用  ~~4.1.1 Alpha~~ ([Autojs](https://github.com/hyb1996/Auto.js/releases) 找不到这个版本，不知道原作者这个版本在哪下载的) 版本开发。解锁模块参考自：https://github.com/e1399579/autojs

- 经过测试小米mix2s可以使用4.0.4alpha版本,4.0.5alpha会报错

## 更新记录

- 2019/1/31 
  - ~~发现识别能量罩时采用的函数不合适~~（使用了同步获取 toast 的方法，会卡住，已修正）
  - ~~帮助好友收取时，默认所有能量球都各点击一遍，效率太低~~（已修正）
  - 重构代码，添加注释
- 2019/2/1
  - ~~Toast 监听器超过10过导致报错~~（已修正）
  - ~~帮助好友收取时有时候会失败~~（因为控件下方文字闪烁导致，已修正）
  - 不限制监听器数量并且每次运行完成后清空监听器
- 2019/2/2
  - ~~自己的倒计时减为0时会结束收取而不是立马收取下一次~~（已修正）
- 2019/2/5
  - ~~实际运行中安卓7.0以下会报错~~（已修正）
- 2019/2/24
  - 多语言问题，繁体或者英文环境下判断字符不同（取消）
  - ~~当收取次数设置为 0 次时，收取行为出错~~（已修正）
  - ~~初次进入蚂蚁森林弹窗提醒添加至首页和合种信息~~（已修正）
- 2019/3/5
  - 重构了一下 Unlock 的内容，方便添加设备
  - 由于基本所有设备解锁都有滑动层，因此去掉了判断是否有滑动层的代码
  - 目前看来新版本效果不错，因此去掉了 old 版本的脚本
  - 增加循环收取的功能
- 2019/3/7
  - 增加白名单功能
  - 计算颜色相似度，修改默认颜色偏移量为50
- 2019/3/13
  - 定时执行
  - 优化锁屏后sleep优先级降低导致的时间不准确问题

# 使用

- 下载安装 [Autojs](https://github.com/hyb1996/Auto.js/releases) 之后把整个脚本项目放进 __"/sdcard/脚本/"__ 文件夹下面。打开软件后下拉刷新，然后运行项目或者 main 即可。

# 功能

- 自动匹配不同系统下自动化的方式，安卓7及以上通过无障碍服务模拟操作，以下版本通过 root 权限模拟操作；
- 自动识别屏幕锁定方式并根据配置的密码解锁，支持图形解锁，PIN解锁，混合密码解锁；
- 识别自己能量球的倒计时，和好友列表中的倒计时做对比，取最小值作为下次收取的等待时间；
- 识别好友能量罩，下一次收取时跳过开启能量罩的好友；
- 默认使用倒计时收取，可通过配置打开循环收取；
- 根据设置选择是否帮助好友收取能量；
- 根据白名单实现不收取特定好友能量；
- 收取完毕后悬浮框显示收取的能量数量。

# 配置

打开 config.js 后可以看到如下配置：

```javascript
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
  white_list: ["好友1", "好友2"],
  // 是否定时启动
  auto_start: true,
  auto_start_same_day: false,
  auto_start_hours: 6,
  auto_start_minutes: 40,
  auto_start_seconds: 0,
  // 是否显示调试日志
  show_debug_log: true,
  // 是否toast调试日志
  toast_debug_info: false
};
```

其中：

- color_offset：设置颜色识别的偏移量，如果识别失败可以尝试增加该值，默认为50，即80%的相似度；
- password：手机解锁密码，如果是图形解锁则为图形经过的点对应的数字；
- help_friend：设定是否帮助好友收取能量；
- is_cycle: false：设定是否循环执行，开启后 max_collect_repeat 无效；
- cycle_times: 10：设定循环执行次数，开启循环执行后有效；
- timeout_unlock：解锁模块的延时，解锁操作过快导致出错时可修改，默认为1s；
- timeout_findOne：控件搜索时最大搜索时间，找不到控件时可修改，默认为1s；
- max_collect_repeat：脚本重复收取的最大次数；
- max_collect_wait_time：等待好友收取能量倒计时的最大值；
- white_list：白名单，将好友的 ID 添加到白名单实现不收取特定好友的能量。

---------

- auto_start: 是否定时启动
- auto_start_same_day: 自动启动的时间是否同一天
- auto_start_hours minutes seconds: 自动启动的时间 

因为autojs某些版本有问题 无法自动启动定时脚本 只能用这个方式在前一天开始一直运行直到第二天开始执行能量收集

-----------
-- show_debug_log: 是否打印调试日志
-- toast_debug_info: 是否将调试信息toast显示

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

上述所示为最简单的解锁模板，也可以参考 Unlocl.js 默认多解锁方式的代码进行修改。

然后在下方的 MyDevice 中设置解锁设备：

```javascript
var MyDevice = Devices.device_1;
```

# 注意事项

解锁仅支持：

- 具有ROOT权限的安卓5.0及以上版本
- 没有ROOT权限的安卓7.0及以上版本

# 目前存在的问题

- ~~autojs 在锁屏状态下由于软件优先度被降低导致 sleep() 函数时间不准确~~ (优化delay代码 可以降低延迟)
