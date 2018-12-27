/*
* @Author: NickHopps
* @Date:   2018-12-26 02:44:53
* @Last Modified by:   NickHopps
* @Last Modified time: 2018-12-27 20:34:11
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
  HUAWEI_P10_Plus: {prime: "#30ab7c", extra: [[29, 16, "#ffffff"], [28, 42, "#ffffff"]]},
}

// 配置
const config = {
  device: devices.HUAWEI_P10_Plus,
  discern: discern.HUAWEI_P10_Plus,
  passwd: "123456",
  times: 10
}

/************************
 * 主程序
 ***********************/

// 储存收取数量
var pre_collect_energy = 0;
var post_collect_energy = 0;

// 解锁屏幕
function unlock() {
  if (!device.isScreenOn()) {
    const w = device.width;
    const h = device.height;
    const pwd = config.passwd.split("");
    device.wakeUp();
    sleep(1000);
    swipe((w / 2), (3 * h / 4), (w / 2), (h / 4), 300);
    sleep(1000);
    pwd.forEach(function(i) {
      click(config.device[i].x, config.device[i].y);
    });
    sleep(1000);
  }
}

// 进入蚂蚁森林主页
function homepage() {
  app.startActivity({        
    action: "VIEW",
    data: "alipays://platformapi/startapp?appId=60000002",    
  });
}

// 进入好友列表
function friends_list() {
  while (true) {
    if (descEndsWith("查看更多好友").exists() && descEndsWith("查看更多好友").findOne().bounds().centerY() < device.height) {
      var show_more_fri = descEndsWith("查看更多好友").findOne().bounds();
      click(show_more_fri.centerX(), show_more_fri.centerY());
      break;
    }
    scrollDown();
    sleep(500);
  }
}

// 收集能量
function collect() {
  if (descEndsWith("克").exists()) {
    descEndsWith("克").find().forEach(function(obj) {
      click(obj.bounds().centerX(), obj.bounds().centerY());
      sleep(1000);
    });
  }
}

// 显示文字悬浮窗
function show_text(text) {
  var window = floaty.window(
    <frame gravity = "center">
      <text id = "text" textSize="16sp" textColor="#0099FF" />
    </frame>
  );
  setInterval(()=>{
    ui.run(function(){
      window.text.setText(text);
    });
  }, 1000);
  window.text.click(()=>{
    window.setAdjustEnabled(!window.isAdjustEnabled());
  });
  window.exitOnClose();
}

// 计算收取能量数量并显示
function calcu_total_collect() {
  if (!textContains("蚂蚁森林").exists()) homepage();
  descEndsWith("背包").waitFor();
  post_collect_energy = parseInt(descEndsWith("g").findOne().desc().replace(/[^0-9]/ig, ""));
  if (descEndsWith("关闭").exists()) descEndsWith("关闭").findOne().click();
  home();
  show_text("共收取：" + (post_collect_energy - pre_collect_energy) + "g 能量");
}

// 收取自己的能量
function collect_own() {
  if (!textContains("蚂蚁森林").exists()) homepage();
  descEndsWith("背包").waitFor();
  if (pre_collect_energy === 0) {
    pre_collect_energy = parseInt(descEndsWith("g").findOne().desc().replace(/[^0-9]/ig, ""));
  }
  collect();
}

// 收取好友的能量
function collect_friend() {
  friends_list();
  sleep(2000);
  while (true) {
    var pos = true;
    while (pos) {
      pos = images.findMultiColors(captureScreen(), config.discern.prime, config.discern.extra);
      if (pos) {
        click(pos.x + 50, pos.y + 50);
        descEndsWith("浇水").waitFor();
        collect();
        back();
      }
    }
    if (descEndsWith("没有更多了").exists() && descEndsWith("没有更多了").findOne().bounds().centerY() < device.height) break;
    scrollDown();
    sleep(1000);
  }
  if (descEndsWith("关闭").exists()) descEndsWith("关闭").findOne().click();
  home();
}

// 每隔10秒收取一次
for (let i = 0; i < config.times; i++) {
  unlock();
  collect_own();
  collect_friend();
  sleep(10000);
}

// 计算收取的能量数量
calcu_total_collect();
