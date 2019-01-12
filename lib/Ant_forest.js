/*
* @Author: NickHopps
* @Last Modified by:   NickHopps
* @Last Modified time: 2019-01-10 02:25:36
* @Description: 蚂蚁森林操作集
*/

function Ant_forest(automator, unlock, config) {
  const _automator = automator;
  const _unlock = unlock;
  const _config = config;

  // 统计收取的能量
  let _pre_energy = 0;
  let _post_energy = 0;

  // 好友列表最小倒计时
  let _min_count_down = 0;

  // 当前收集次数
  let _current_time = 0;

  // 脚本执行状态
  let _is_running = false;

  // 是否下一次运行
  let _has_next = true;

  // 构建下一次运行
  const _generate_next = function() {
    if (_min_count_down && _min_count_down <= _config.max_wait_time) _has_next = true;
    else _has_next = false;
  }

  // 获取好友列表中可收取倒计时的最小值
  const _getmin_count_down = function() {
    if (descEndsWith("’").exists()) {
      let count_downs = [];
      descEndsWith("’").find().forEach(function(obj) {
        let temp = parseInt(obj.desc().replace("’", ""));
        count_downs.push(temp);
      });
      _min_count_down = Math.min.apply(null, count_downs);
    } else {
      _min_count_down = null;
    }
  }

  // 显示文字悬浮窗
  const _show_floaty = function(text) {
    let window = floaty.window(
      <card cardBackgroundColor = "#aa000000" cardCornerRadius = "20dp">
        <horizontal w = "250" h = "40" paddingLeft = "15" gravity="center">
          <text id = "log" w = "180" h = "30" textSize = "12dp" textColor = "#ffffff" layout_gravity="center" gravity="left|center"></text>
          <card id = "stop" w = "30" h = "30" cardBackgroundColor = "#fafafa" cardCornerRadius = "15dp" layout_gravity="right|center" paddingRight = "-15">
            <text w = "30" h = "30" textSize = "16dp" textColor = "#000000" layout_gravity="center" gravity="center">×</text>
          </card>
        </horizontal>
      </card>
    );
    window.stop.on("click", () => {
      engines.stopAll();
    });
    setInterval(()=>{
      ui.run(function(){
        window.log.text(text)
      });
    }, 0);
  }

  // 按分钟延时
  const _delay = function(minutes) {
    minutes = (typeof minutes != null) ? minutes : 0;
    for (let i = 0; i < minutes; i++) {
      log("距离下次运行还有 " + (minutes - i) + " 分钟");
      sleep(60000);
    }
    return true;
  }

  // 进入蚂蚁森林主页
  const _start_app = function() {
    app.startActivity({        
      action: "VIEW",
      data: "alipays://platformapi/startapp?appId=60000002",    
    });
  }

  // 收取能量
  const _collect = function() {
    if (descEndsWith("克").exists()) {
      descEndsWith("克").find().forEach(function(obj) {
        _automator.clickCenter(obj);
        sleep(500);
      });
    }
  }

  // 记录当前能量
  const _get_current_energy = function() {
    if (descEndsWith("背包").exists()) {
      return parseInt(descEndsWith("g").findOne().desc().replace(/[^0-9]/ig, ""));
    }
  }

  // 记录初始能量值
  const _get_pre_energy = function() {
    if (_is_running && _has_next) _pre_energy = _get_current_energy();
  }

  // 记录最终能量值
  const _get_post_energy = function() {
    if (_is_running && !_has_next) {
      if (descEndsWith("返回").exists()) descEndsWith("返回").findOne().click();
      descEndsWith("背包").waitFor();
      _post_energy = _get_current_energy();
    }
    if (descEndsWith("关闭").exists()) descEndsWith("关闭").findOne().click();
    home();
    if (_is_running && !_has_next) _show_floaty("共收取：" + (_post_energy - _pre_energy) + "g 能量");
  }

  // 收取自己的能量
  const _collect_own = function() {
    if (!textContains("蚂蚁森林").exists()) _start_app();
    descEndsWith("背包").waitFor();
    _get_pre_energy();
    _collect();
  }

  // 收取好友的能量
  const _collect_friend = function() {
    descEndsWith("查看更多好友").findOne().click();
    while(!textContains("好友排行榜").exists()) sleep(1000);
    while (true) {
      var pos = images.findMultiColors(captureScreen(), _config.discern.prime, _config.discern.extra);
      while (pos) {
        _automator.click(pos.x, pos.y + 20);
        descEndsWith("浇水").waitFor();
        _collect();
        _automator.back();
        while(!textContains("好友排行榜").exists()) sleep(1000);
        pos = images.findMultiColors(captureScreen(), _config.discern.prime, _config.discern.extra);
      }
      if (descEndsWith("没有更多了").exists() && descEndsWith("没有更多了").findOne().bounds().centerY() < device.height) break;
      _getmin_count_down();
      scrollDown();
      sleep(1000);
    }
    _generate_next();
    _get_post_energy();
  }

  return {
    exec: function() {
      while (true) {
        _delay(_min_count_down);
        log("第 " + (_current_time + 1) + " 次运行");
        _is_running = true;
        _unlock.exec();
        _collect_own();
        _collect_friend();
        if (_current_time++ > _config.max_repeat_times || _has_next == false) break;
      }
    }
  }
}

module.exports = Ant_forest;
