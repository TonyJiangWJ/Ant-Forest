# 简介

基于 Autojs 的蚂蚁森林自动收能量脚本，采用 4.0.5Alpha 版本开发。

*注意：新版本因缺乏样本，测试不够全面，麻烦大家及时反馈BUG，如需使用旧版，直接下载 old 中的文件*

# 使用

下载安装 [Autojs](https://github.com/hyb1996/Auto.js) 之后把整个脚本项目放进 __"/sdcard/脚本/"__ 文件夹下面。运行项目或者 main 即可。

# 功能

- 自动匹配不同系统下自动化的方式，安卓7及以上通过无障碍服务模拟操作，以下版本通过 root 权限模拟操作；
- 自动识别屏幕锁定方式并根据配置的密码解锁，支持图形解锁，PIN解锁，混合密码解锁；
- 识别自己能量球的倒计时，和好友列表中的倒计时做对比，取最小值作为下次收取的等待时间；
- 识别好友能量罩，下一次收取时跳过开启能力罩的好友；
- 根据设置选择是否帮助好友收取能量；
- 收取完毕后悬浮框显示收取的能量数量。

# 配置

打开 config.js 后可以看到如下配置：

```javascript
var config = {
  color_offset: 4,
  password: "52897",
  help_friend: true,
  max_unlock_retry: 3,
  max_collect_repeat: 20,
  max_collect_wait_time: 20
};
```

其中：

- color_offset：设置颜色识别的偏移量，如果识别失败可以尝试增加该值；
- password：手机解锁密码，如果是图形解锁则为图形经过的点对应的数字；
- help_friend：设定是否帮助好友收取能量；
- max_unlock_retry：解锁最大尝试次数；
- max_collect_repeat：脚本重复收取的最大次数；
- max_collect_wait_time：等待好友收取能量倒计时的最大值。

# 注意事项

解锁仅支持：

- 具有ROOT权限的安卓5.0及以上版本
- 没有ROOT权限的安卓7.0及以上版本

# 目前存在的问题

- 某些未ROOT设备无法解锁混合密码
- Autojs 在锁屏状态下由于软件优先度被降低导致 sleep() 函数时间不准确

