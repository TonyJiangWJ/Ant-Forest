/*
* @Author: NickHopps
* @Last Modified by:   NickHopps
* @Last Modified time: 2018-12-31 20:30:18
* @Description: 蚂蚁森林自动收能量
*/

/************************
 * 初始化
 ***********************/

// 检查手机是否开启无障碍服务
auto();

// 检测安卓版本是否符合要求(安卓7.0以上)
requiresApi(24);

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

// 执行配置
const config = {
  device: devices.HUAWEI_P10_Plus,
  discern: discern.HUAWEI_P10_Plus,
  encrypt: true,
  passwd: "123456",
  times: 1
}

// 变量别名
const w = device.width;
const h = device.height;

/************************
 * 函数模块
 ***********************/

// 解锁屏幕
function unlock() {
  if (!device.isScreenOn()) {
    device.wakeUp();
    sleep(500);
    swipe((w / 2), (3 * h / 4), (w / 2), (h / 4), 300);
    sleep(500);
    if (config.encrypt) {
      config.passwd.split("").forEach(function(i) {
        click(config.device[i].x, config.device[i].y);
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
      click(obj.bounds().centerX(), obj.bounds().centerY());
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
  }, 1000);
}

// 收取好友的能量
function collect_friend(times) {
  descEndsWith("查看更多好友").findOne().click();
  while(!textContains("好友排行榜").exists()) sleep(1000);
  while (true) {
    var pos = images.findMultiColors(captureScreen(), config.discern.prime, config.discern.extra, config.discern.option);
    while (pos) {
      click(pos.x, pos.y + 20);
      descEndsWith("浇水").waitFor();
      collect();
      back();
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
  }
  if (descEndsWith("关闭").exists()) descEndsWith("关闭").findOne().click();
  home();
  sleep(1000);
  show_text("共收取：" + (post_collect_energy - pre_collect_energy) + "g 能量");
}

/************************
 * 主程序
 ***********************/

// 储存收取数量
let pre_collect_energy = 0;
let post_collect_energy = 0;

// 根据配置收取 n 次，之间的 n-1 次间隔 20s
for (let i = 0; i < config.times; i++) {
  unlock();
  collect_own(i);
  collect_friend(i);
  if (i != config.times - 1) {
    sleep(20000);
  }
}
