
# 简介

基于 Autojs 的蚂蚁森林自动收能量脚本，采用 [AutoJS Modify](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.modify.latest.apk) 版本开发。解锁模块参考自：[https://github.com/e1399579/autojs](https://github.com/e1399579/autojs)

- 脚本执行依赖于：[AutoJS Modify](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.modify.latest.apk) 或 [困鱼](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.fake.latest.apk)，4.1.1原作者完全不会再维护且已经删库，同时存在较多内存泄露等问题、不支持Android12、脚本中部分特性也不支持，如本地OCR 多分辨率找图 等等。Pro限制无障碍操作且存在代码审查机制，不再受支持。
- 本项目原始版本 [https://github.com/Nick-Hopps/Ant-Forest-autoscript](https://github.com/Nick-Hopps/Ant-Forest-autoscript) ，原作者[Nick-Hoops](https://github.com/Nick-Hopps)已不再维护。虽然目前版本和原始版本代码已经完全不一样，但是还是非常感谢 [Nick-Hoops](https://github.com/Nick-Hopps)
- 设备系统要求

  - 具有 ROOT 权限的安卓 5.0 及以上版本
  - 没有 ROOT 权限的安卓 7.0 及以上版本
  - 因为图色识别的原因不支持护眼模式、暗色模式等。
- 觉得本项目好用的话请给个star吧~

## 其他脚本

- [蚂蚁庄园传送门](https://github.com/TonyJiangWJ/Ant-Manor)
- [聚合签到-签到薅羊毛](https://github.com/TonyJiangWJ/Unify-Sign)
- 拆分出来了基础项目，用于快速开发AutoJS脚本[AutoScriptBase](https://github.com/TonyJiangWJ/AutoScriptBase)

## 实验性功能

- 1.4.0版本开始增加基于YOLO的目标检测算法，需要下载最新版本的[AutoJS Modify](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.modify.latest.apk) 或 [困鱼](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.fake.latest.apk)
- 请手动下载YOLO模型，并将其放置到config_data目录下，链接地址：[https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/forest_lite.onnx](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/forest_lite.onnx)
- 运行可视化配置，进入图像识别相关设置，打开使用YOLO模型识别能量球即可启用。如果当前AutoJS不支持或者模型未下载将自动降级使用旧版识别方案。
- 从1.4.0版本开始将逐渐优化模型，将各种图片配置移除，尽量做的开箱即用
- 原方案识别能量球速度大概3-40ms，YOLO模型大概100ms请自行取舍，YOLO识别默认关闭

## 使用

- 下载安装 [AutoJS Modify](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.modify.latest.apk) 或 [困鱼](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.fake.latest.apk) 之后把整个脚本项目放进 **"/sdcard/脚本/"** 文件夹下面。打开软件后下拉刷新，然后运行项目或者 `main.js` 即可运行，首次运行请先进行部分必要配置否则部分功能不能正常运行，见[配置小节](#配置)。
- 给与软件必要权限 `后台弹出界面`、`显示悬浮窗`、`自启动`、`电量无限制`，并将软件保持后台运行
- 定时启动脚本，点击 `main.js` 的菜单，选择 `更多` `定时任务` 即可配置定时启动
- 如果运行提示有任务正在队列中，请运行配置 `可视化配置.js` 然后进到 `高级设置` 中勾选 `单脚本运行`，该功能是用于多个脚本同时运行时的任务队列 相当于一个调度程序，避免多个脚本抢占前台导致出错
- 当前版本森林只通过逛一逛收集能量，排行榜中仅获取倒计时数据，需要配置逛一逛（收能量）按钮位置或图片信息。更多配置信息见[配置小节](#配置)
- 运行有问题请查看[#常见问题小节](#常见问题)
- 不同手机的解锁方法不同可能不适配，需要自行编写解锁方法，具体见[#添加解锁设备](#添加解锁设备)小节
- ocr优先使用mlkit，不支持时尝试paddleocr，最后使用百度（需要配置API KEY，而且每天有500次的次数限制），推荐直接使用修改版或下载ocr插件[mlkit-ocr插件下载](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/mlkit-ocr-plugin-latest.apk)
- 关于本地OCR的说明，mlkit-ocr速度非常快，但是缺点是识别准确性不佳，目前基本能满足所需要的识别功能。PaddleOCR识别准确性很高但是缺点是速度慢，而且必须给AutoJS设置电量无限制权限否则容易闪退，另外就是必须安装[我的修改的AutoJS](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.modify.latest.apk) 或 [困鱼](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.fake.latest.apk) 才能使用PaddleOCR。
- 当前版本仅通过逛一逛收取，排行榜中只识别倒计时信息不识别帮收和可收取，有一定几率会漏收倒计时刚刚结束的能量

## 配置

运行 `可视化配置.js` 后可以看到如下配置：

- 常用配置按不同类别进行分组，按实际内容进入对应菜单项目即可
- 所有列表项都可以左滑触发删除或修改，部分输入框也能左滑触发高级输入操作如区域配置和颜色值配置等，多多摸索
- 运行配置后右上角菜单可以重置所有配置信息为默认值
- 配置导出导入功能，点击右上角菜单即可导出当前配置到local_config.cfg中，默认已加密加密密码为 `device.getAndriodId()` 如果需要在免费版和付费版AutoJS之间同步 需要自行创建脚本获取该密码
- 运行时数据导出导入功能同上所述
- **重要** 因为当前手机分辨率多种多样，请前往 `查找图片设置` 按说明截取相应位置的图片，特别是逛一逛按钮，避免运行不正常
- **重要** 基于图像分析模式必须按如下配置，否则脚本无法正常执行
- 好友首页的能量球无法通过控件识别，请进行如下配置：
- 图像识别区域信息可以在运行可视化配置.js之后进入 `图像识别相关配置` 直接点击 `实时查看可视化配置信息` 按钮来刷新配置并显示当前的框选区域。也可以在配置完之后可以运行`test/全局悬浮窗显示-配置信息.js` 查看配置生效状况，可在 `resources` 目录下截图保存 `region_check.jpg` ，然后可以悬浮窗显示半透明信息，方便在运行 `可视化配置.js` 时拖动进度条快速调整具体区域
- 区域信息输入框可以左滑，以显示可拖动控件
- 更多其他配置信息请运行 `可视化配置.js` 后自行摸索

## 功能

- 自动匹配不同系统下自动化的方式，安卓 7 及以上可以通过无障碍服务模拟操作，7以下版本需要通过 root 权限模拟操作；
- 自动识别屏幕锁定方式并根据配置的密码解锁，支持图形解锁，PIN 解锁，混合密码解锁；特殊设备需要自行扩展，具体见[#添加解锁设备](#添加解锁设备)小节
- 图形密码根据数字位置填写到锁屏密码即可，具体数字和手势位置如何对应自行尝试即可了解一二
- 同时支持支付宝手势解锁
- 识别自己能量球的倒计时，和好友列表中的倒计时做对比，取最小值作为下次收取的等待时间；
- 识别好友能量罩，下一次收取时跳过开启能量罩的好友；
- 可以根据指定时间段自动使用双击卡
- 默认使用倒计时收取，可通过配置打开循环收取；
- 可选择永不停止模式，无倒计时或超过激活时间（激活时间可以设置为随机范围）则在激活时间之后继续执行，否则按倒计时时间等待，实现全天不间断收集；
- 根据白名单实现不收取特定好友能量；
- 可以设定收取达到一定阈值后自动浇水回馈 默认阈值当日收集超过40克即浇水一次，同时可配置不浇水回馈的黑名单
- 浇水回馈数量可配置，可选：`10` `18` `33` `66`
- 脚本运行时可以显示悬浮窗展示当前状态
- 开始收集的时候按 `音量减` 可以延迟五分钟再执行，适合需要使用手机的时候使用，按 `音量加` 则关闭脚本终止执行
- 收取完毕后悬浮框显示收取的能量数量
- 支持切换小号进行能量收集和能量雨，运行 `可视化配置` 进入 `多账号管理` 增加支付宝账号并设置昵称用于能量雨自动赠送，并勾选一个主账号。需要确保增加的账号在当前设备可以免密切换。
- 循环小号并执行能量雨会根据多账号管理中配置的昵称按顺序自动赠送给下一个账号，即配置了A、B、C三个账号，能量雨运行时会自动的A->B->C->A的顺序进行赠送，这样三个账号都能获得三次机会。因此请确保正确配置了账号昵称
- 设置完毕后可以手动执行或者设置每天的定时任务
  - 自动收集 `unit/循环切换小号并收集能量.js` 支持小号给大号浇水
  - 自动循环执行能量雨 `unit/循环切换小号并执行能量雨收集.js` 建议同时关闭逛一逛结束自动执行能量雨的功能
  - 自动同步设备步数 `unit/循环切换小号用于同步数据.js`
- 可以自动打开无障碍，需要配合adb赋权，不同的软件请自行替换包名: 可以通过 `context.getPackageName()` 获取

  ```shell
    adb shell pm grant org.autojs.autojs.modify android.permission.WRITE_SECURE_SETTINGS
  ```

- [通过ADB授权脚本自动获取无障碍权限](https://github.com/TonyJiangWJ/AutoScriptBase/blob/master/resources/doc/ADB%E6%8E%88%E6%9D%83%E8%84%9A%E6%9C%AC%E8%87%AA%E5%8A%A8%E5%BC%80%E5%90%AF%E6%97%A0%E9%9A%9C%E7%A2%8D%E6%9D%83%E9%99%90.md)
- ROOT设备可以实现自动锁屏，非ROOT设备理论上安卓9以上都可以通过无障碍进行锁屏，如果无障碍锁屏失败需要扩展锁屏方法，具体见[#添加自定义锁屏代码](#添加自定义锁屏代码)，默认实现的是下拉状态栏中指定位置放了个锁屏按键
- 脚本更新 可以执行`update/检测更新.js`，也可以运行可视化配置后点击右上角菜单调出弹窗进行更新。
- 可以将配置数据以及运行时数据进行导入和导出，内容通过AES加密，默认密码是 `device.getAndroidId()`，因此仅本机可用。如果需要跨设备或者免费版和Pro版之间备份，自行获取 `device.getAndroidId()` 然后根据提示输入即可
- 通话状态监听，当通话中或者来电时自动延迟五分钟执行，需要授予AutoJS软件获取通话状态的权限[该功能暂不可靠，且Pro版无法使用]
- 可以配置在锁屏状态下判断设备姿势，防止在裤兜内误触（基于重力加速度传感器）
- `unit` 下提供了多个自定义模式的切换脚本，执行后会自动打断当前运行中的脚本然后按新的设置启动。
  - `自定义1永不停止.js` 25-35分钟的随机范围轮询一次，有倒计时按倒计时时间执行，适合9-23点。可以对它设置每天9点的定时任务
  - `自定义2计时停止.js` 按倒计时时间执行，最长等待时间60分钟，适合早上执行和晚上23点执行，避免0点后继续无意义的永不停止。可以对它设置7点、23点以及0点的定时任务
  - `自定义3循环千次只收自己.js` 循环收集自己的，适合自己能量快要生成的时候执行，因为每天步行能量生成时间是固定的，因此在生成前一分钟设置定时任务即可，然后再设置2分钟后的定时任务`自定义2计时停止.js`
  - 其他自定义方式请自行创建，内容参考以上文件和config.js中的字段
- 支持能量收集统计 查看每天能量值增量和收集好友能量数据 参考如下：
  ![hourly_summary](./resources/hourly_summary.jpg)
  ![daily_summary](./resources/daily_summary.jpg)

### 循环/计时模式、永不停止模式等详细说明

- 循环模式：脚本会根据设置的次数不间断的循环执行直到当前执行了指定次数之后便会停止。
- 计时模式：当关闭循环模式，且不开启永不停止模式时，启用计时模式。计时模式需要设置最大等待时间，默认为60分钟，脚本执行时会通过OCR识别排行榜中的倒计时时间，如果得到的最小倒计时时间小于最大等待时间，那么脚本将会按识别到的最小倒计时计时启动，否则脚本将退出执行。
- 永不停止模式：关闭循环模式并开启永不停止，此时需要设置重新激活时间，当识别到的倒计时时间小于这个重新激活时间时，脚本会按实际倒计时计时启动，当识别到的倒计时时间大于重新激活时间时，则按重新激活时间来计时启动。以此循环实现全天不间断的执行。这个重新激活时间可以设置为一个随机范围，每次判断都会在指定范围内生成一个随机的时间。
- 以上计时模式和永不停止模式依赖于OCR的正常运行，如果设备分辨率为1080P的建议直接将自建OCR识别和百度OCR识别关闭，此时会启用模拟的识别，准确率和速度都相较OCR来说更理想。其他分辨率设备则没怎么测试过，自行斟酌。

### 能量雨收集

- 增加了自动收集能量雨的脚本。运行 `unit/能量雨收集.js` 也可以在可视化配置中打开。然后打开能量雨界面，并手动开始，点击开始脚本会自动识别并点击
- 可配置自动赠送好友机会以获得一次能量雨机会，好友名支持正则匹配。
- 能量雨为暴力点击，基本百分百能得到满分。
- 配合 `多账号管理` 和 `unit/循环切换小号并执行能量雨收集.js` （创建定时任务）可以实现每天自动收集小号的能量雨
- 无小号时，对 `unit/自动启动并执行能量雨.js` 创建定时任务即可每天自动执行一遍

### 神奇海洋收集

- 对 `unit/神奇海洋收集.js` 创建每天7点后的定时任务
- 在可视化配置-图像识别相关配置-神奇海洋相关配置 配置OCR识别区域，垃圾球角标位置等配置 按实际提示进行配置
- OCR需要至少安装MlKitOCR插件或者修改版AutoJS 否则自动创建两小时后的定时任务

## 常见问题

- 可视化配置.js 执行异常，运行 `unit/功能测试-重置默认配置.js` 依旧有问题，尝试重启AutoJS，并检查AutoJS的版本是否为 [AutoJS Modify](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.modify.latest.apk) 或 [困鱼](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.fake.latest.apk)，其他版本可能有兼容性问题，另外Pro版不再支持。
- 可视化配置 运行后显示白屏或者显示 加载失败 大概是因为某个网络资源加载失败了，请退出重新打开，多试几次即可。
- 如果报错 `Function importClass must be called with a class;...` 直接强制关闭AutoJS软件，然后再打开即可。一般只在跨版本更新后才会出现这个问题，最新版脚本已解决这个问题，建议安装 [AutoJS Modify](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.modify.latest.apk) 或 [困鱼](https://github.com/TonyJiangWJ/Ant-Forest/releases/download/v1.1.1.4/AutoJS.fake.latest.apk)
- 另外如果不断的运行异常，强制关闭AutoJS软件后重新执行脚本。同时建议定期强制关闭AutoJS软件，避免内存不断增长导致卡顿
- 图像分析模式 如果识别有遗漏，尝试将 `颜色相似度` 调低 当前默认值已改为20，或者检查一下是否开启了护眼模式或者暗色模式。
- 软件的定时任务，点击main.js的 三个点菜单->更多->定时任务 然后设置相应的时间即可
- 报错 `获取截图失败多次` 请修改 `获取截图等待时间` 默认为500毫秒，自行调试选择适合自己的，或者直接取消勾选 `是否异步等待截图`
- 其他问题可以提ISSUE，但是请勾选保存日志到文件，并将日志文件大小调整为1024，日志文件保存在 `logs/log-verboses.log`
- 如果已经按说明配置后开启 `是否直接基于图像分析收取和帮助好友` 运行不正常，请先取消勾选，然后勾选 `区域点击来收取能量`, 同时自己扩展区域点击的方法，见下方的 [#添加自定义区域点击代码](#添加自定义区域点击代码)
- 定时任务不准，一般因为系统电量限制，在系统设置中启用自启动等。实在不行可以安装tasker发送广播触发脚本执行，具体请百度

## 其他问题反馈

- [创建ISSUE](https://github.com/TonyJiangWJ/Ant-Forest/issues/new) 描述具体问题，提供相应的日志或者截图信息，最好说明一下当前使用的脚本版本以及AutoJS软件版本
- 详细日志的文件为`logs/log-verboses.log` 默认保存100k之后会将旧日志保存到 `logs/logback` ；反馈问题时需要提供出问题时段的日志文件。
- 日志文件如果觉得有隐私信息可以单独发我文件，或者删除敏感信息。邮箱: tonyjiangwj@gmail.com

## 添加解锁设备

- 具体开发需要获取到锁屏界面的控件信息，可以运行 `/unit/获取锁屏界面控件信息.js` 根据提示进行操作，然后得到相应的布局信息进行开发，或者在执行完之后发起ISSUE并提供 `logs/info.log` 文件让开发者帮忙。
- 脚本根目录下新建extends文件夹，然后创建ExternalUnlockDevice.js文件，内容格式如下自定义
- 修改完毕后运行 `test/测试解锁.js` 即可对解锁代码进行测试
- 更多扩展可以参考`extends/ExternalUnlockDevice-demo.js`

```javascript
module.exports = function (obj) {
  this.__proto__ = obj

  this.unlock = function(password) {
    // 此处为自行编写的解锁代码

    // 在结尾返回此语句用于判断是否解锁成功
    return this.check_unlock()
  }

}
```

## 添加自定义锁屏代码

- 同解锁设备，在extends文件夹下创建LockScreen.js，内容可以参考LockScreen-demo.js 实现自定义锁屏
- 扩展代码之后可以执行 `test/TestLockScreen.js` 来调试是否生效
- 安卓9以上可以基于无障碍实现自动锁屏，不需要通过此方法来实现。

```javascript
  let { config: _config } = require('../config.js')(runtime, global)

  module.exports = function () {
    // MIUI 12 偏右上角下拉新控制中心
    swipe(800, 10, 800, 1000, 500)
    // 等待动画执行完毕
    sleep(500)
    // 点击锁屏按钮
    click(parseInt(_config.lock_x), parseInt(_config.lock_y))
  }
```

## 分享你的配置

- 如果你想分享你的自定义扩展代码，可以提交到 [这个分支下](https://github.com/TonyJiangWJ/Ant-Forest/tree/share_configs)，比如解锁代码 可以命名为 `ExternalUnlockDevice-手机型号.js` 并提交到 `extends` 目录下，方便其他用户下载使用
- 想获取其他网友分享的代码可以前往[这个分支](https://github.com/TonyJiangWJ/Ant-Forest/tree/share_configs)下载，或者等我集成发布

## 更新记录

- 历史版本更新记录可前往[RELEASES 页面](https://github.com/TonyJiangWJ/Ant-Forest/releases) 和 [RELEASES(旧仓库)](https://github.com/TonyJiangWJ/Ant-Forest-autoscript/releases) 查看

## 目前存在的问题

- 可能存在收集完一个好友后，因为没有获取到该好友剩余能量球的倒计时导致漏收
- 部分系统，如我使用的MIUI12因为省电策略的问题（即便设置了白名单无限制自启动），导致AutoJS软件的定时任务无法准时运行。非脚本自身问题
- 新发现问题请提交ISSUE，我会尽快跟进解决

## 请开发者喝咖啡

- 欢迎使用支付宝或微信请我喝杯咖啡
  - 一元喝速溶、5元喝胶囊、12买全家、33星巴克感激不尽
  
  ![alipay_qrcode](./resources/alipay_qrcode.png)  ![wechat_qrcode](./resources/wechat_qrcode.png)

- 支付宝扫码领红包，你拿红包我也有份。

- ![扫码领红包](./resources/hongbao_qrcode.png)

### 感谢充电~

#### alipay

- *剑
- **杰
- **佑
- **豪
- **旸
- **渔
- **真
- **刚
- **刚
- **亚
- **成
- *毅
- **杰
- *之
- **旸
- *硕
- **杰
- **宏
- **鲁
- *赟
- *鹏
- **杰
- **恒
- *鹏
- **光
- **彬
- **胜
- **庭
- **光
- **杰
- **俊
- *森
- *悦


#### wechat

- z*g
- *鸟
- *鸟
- *明
- *妖
- **昌
- **昌
- **昌
- *济
- *🧸
- A*g
- **昌
- **昌
- *信
- **昌
- *涛
- J*k
- *🍅
- *🧸
- F*sW
- **昌
- F*sW
- **昌
- *z
- **昌
- **昌
- *🍃
