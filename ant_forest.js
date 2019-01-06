/*
* @Author: NickHopps
* @Last Modified by:   NickHopps
* @Last Modified time: 2019-01-06 23:15:00
* @Description: 蚂蚁森林自动收能量
*/

/************************
 * 初始化
 ***********************/

// 检查手机是否开启无障碍服务
auto();

// 请求截图权限
if (! requestScreenCapture()) {
  toast("请求截图失败");
  exit();
}

/************************
 * 常量定义
 ***********************/

// 手机解锁键盘(0~9)
const devices = {
  HUAWEI_P10_Plus: [{x: 720, y: 2320}, {x: 300, y: 1360}, {x: 720, y: 1360}, {x: 1150, y: 1360}, {x: 300, y: 1680}, {x: 720, y: 1680}, {x: 1150, y: 1680}, {x: 300, y: 2000}, {x: 720, y: 2000}, {x: 1150, y: 2000}],
}

// 不同手机/分辨率对应多点找色识别信息
const discern = {
  HUAWEI_P10_Plus: {prime: "#31ab7c", extra: [[28, 42, "#ffffff"], [87, 87, "#23a372"]], option: {region: [1350, 0, 89, 2559], threhold: 4}},
}

// 判断 ROOT 权限
const IS_ROOT = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su");

// 执行配置
const config = {
  device: devices.HUAWEI_P10_Plus,
  discern: discern.HUAWEI_P10_Plus,
  encrypt: true,
  passwd: "123456",
  times: 10
}

/************************
 * 多版本支持
 ***********************/

// 安卓7.0以下版本使用 root 模式模拟操作
function Automation_root() {
  this.check_root = function() {
    if (!IS_ROOT) {
      throw new Error("未获取ROOT权限");
    }
  };

  this.click = function (x, y) {
    this.check_root();
    return (shell("input tap " + x + " " + y, true).code === 0);
  };

  this.swipe = function (x1, y1, x2, y2, duration) {
    var duration = duration || 500;
    this.check_root();
    return (shell("input swipe " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + duration, true).code === 0);
  };

  this.back = function() {
    this.check_root();
    return (shell("input keyevent KEYCODE_BACK", true).code === 0);
  }
}

// 安卓7.0及以上版本使用无障碍服务模拟操作
function Automation() {
  this.click = function (x, y) {
    return click(x, y);
  };

  this.swipe = function (x1, y1, x2, y2, duration) {
    var duration = duration || 500;
    return swipe(x1, y1, x2, y2, duration);
  };

  this.back = function() {
    return back();
  }
}

// 工厂方法
function Automator() {
  var automator = (device.sdkInt < 24) ? new Automation_root() : new Automation();

  return {
    click: function (x, y) {
      return automator.click(x, y);
    },
    clickCenter: function (obj) {
      return automator.click(obj.bounds().centerX(), obj.bounds().centerY());
    },
    swipe: function (x1, y1, x2, y2, duration) {
      return automator.swipe(x1, y1, x2, y2, duration);
    },
    back: function () {
      return automator.back();
    }
  }
}

// 加载 Automator
const amt = new Automator();

/************************
 * 功能模块
 ***********************/

// 解锁屏幕
function unlock() {
  var w = device.width;
  var h = device.height;
  if (!device.isScreenOn()) {
    device.wakeUp();
    sleep(500);
    swipe((w / 2), (3 * h / 4), (w / 2), (h / 4), 300);
    sleep(500);
    if (config.encrypt) {
      config.passwd.split("").forEach(function(i) {
        amt.click(config.device[i].x, config.device[i].y);
      });
    }
  }
}

// 进入蚂蚁森林主页
function homepage() {
  app.startActivity({        
    action: "VIEW",
    data: "alipays://platformapi/startapp?appId=60000002",    
  });
  descEndsWith("背包").waitFor();
}

// 收取能量
function collect() {
  if (descEndsWith("克").exists()) {
    descEndsWith("克").find().forEach(function(obj) {
      amt.clickCenter(obj);
      sleep(500);
    });
  }
}

// 收取自己的能量
function collect_own(times) {
  if (!textContains("蚂蚁森林").exists()) homepage();
  if (times == 0) pre_collect_energy = parseInt(descEndsWith("g").findOne().desc().replace(/[^0-9]/ig, ""));
  collect();
}

// 显示文字悬浮窗
function show_text(text) {
  var window = floaty.window(
    <card cardBackgroundColor = "#aa000000" cardCornerRadius = "20dp">
      <horizontal w = "250" h = "40" paddingLeft = "15" gravity="center">
        <text id = "log" w = "180" h = "30" textSize = "12dp" textColor = "#ffffff" layout_gravity="center" gravity="left|center"></text>
        <card id = "stop" w = "30" h = "30" cardBackgroundColor = "#fafafa" cardCornerRadius = "15dp" layout_gravity="right|center" paddingRight = "-15">
          <text w = "30" h = "30" textSize = "16dp" textColor = "#000000" layout_gravity="center" gravity="center">×</text>
        </card>
      </horizontal>
    </card>
  );
  window.log.setOnTouchListener(function(view, event) {
    switch (event.getAction()) {
      case event.ACTION_DOWN:
        x = event.getRawX();
        y = event.getRawY();
        windowX = window.getX();
        windowY = window.getY();
        return true;
      case event.ACTION_MOVE:
        window.setPosition(windowX + (event.getRawX() - x), windowY + (event.getRawY() - y));
        return true;
    }
    return true;
  });
  window.stop.on("click", () => {
    engines.stopAll();
  });
  setInterval(()=>{
    ui.run(function(){
      window.log.text(text)
    });
  }, 0);
}

// 收取好友的能量
function collect_friend(times) {
  descEndsWith("查看更多好友").findOne().click();
  while(!textContains("好友排行榜").exists()) sleep(1000);
  while (true) {
    var pos = images.findMultiColors(captureScreen(), config.discern.prime, config.discern.extra, config.discern.option);
    while (pos) {
      amt.click(pos.x, pos.y + 20);
      descEndsWith("浇水").waitFor();
      collect();
      amt.back();
      while(!textContains("好友排行榜").exists()) sleep(1000);
      pos = images.findMultiColors(captureScreen(), config.discern.prime, config.discern.extra, config.discern.option);
    }
    if (descEndsWith("没有更多了").exists() && descEndsWith("没有更多了").findOne().bounds().centerY() < device.height) break;
    scrollDown();
    sleep(1000);
  }
  if (times == config.times - 1) {
    if (descEndsWith("返回").exists()) descEndsWith("返回").findOne().click();
    descEndsWith("背包").waitFor();
    post_collect_energy = parseInt(descEndsWith("g").findOne().desc().replace(/[^0-9]/ig, ""));
    show_text("共收取：" + (post_collect_energy - pre_collect_energy) + "g 能量");
  }
  if (descEndsWith("关闭").exists()) descEndsWith("关闭").findOne().click();
  home();
}

/************************
 * 主程序
 ***********************/

// 储存收取数量
let pre_collect_energy = 0;
let post_collect_energy = 0;

// 根据配置收取 n 次，之间的 n-1 次间隔 10s
for (let i = 0; i < config.times; i++) {
  unlock();
  collect_own(i);
  collect_friend(i);
  if (i != config.times - 1) {
    sleep(10000);
  }
}
