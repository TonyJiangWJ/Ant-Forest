/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-07-04 00:14:13
 * @Description: 配置文件
 */

"ui";
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo
} = require('./lib/LogUtils.js')

var default_conf = {
  color_offset: 50,
  password: "",
  help_friend: true,
  is_cycle: false,
  cycle_times: 10,
  delay_unlock: 1000,
  timeout_findOne: 1000,
  max_collect_wait_time: 20,
  white_list: [],
  // 是否显示debug详细日志
  show_debug_info: true,
  // 预加载排行榜数据的超时时间 正常情况下100个好友约2000ms，超时时间配置为实际加载时间的2-3倍，具体自己计算
  timeoutLoadFriendList: 6000,
  // 是否永不停止，仅计时模式有效
  never_stop: false,
  // 永不停止重新激活时间。当获取倒计时低于该值时睡眠reactive_time分钟
  reactive_time: 30
};

var non_gui_config = {
  // 等待列表稳定的计数，越大越慢但是越稳定，越小越快但是容易导致漏收
  friendListStableCount: 3,
  // 滑动开始距离底部的高度
  bottomHeight: 150,
  // 最大重试次数
  maxRetryTime: 5,
  // mini悬浮窗的位置
  min_floaty_x: 145,
  min_floaty_y: 20,
  // 帮助收取能量球颜色, 可以多增加几组以便全部能够找到，但是越多识别速度越慢
  help_energy_ball_color: ['#f99236', '#f7af70'],
  // 保存日志文件 文件名 log-verboses.log
  save_log_file: false,
  // 列表下滑执行速度 毫秒
  scroll_down_speed: 100
}

// 使用字符串方式的正则表达式 不要使用/pattern/方式 否则无法生效
var ui_config = {
  // 是否进入个人页面用
  home_ui_content: '背包|通知',
  // 是否进入好友页面用
  friend_home_ui_content: '浇水|发消息',
  // 是否进入排行榜用
  friend_list_ui_content: '好友排行榜',
  // 校验排行榜加载完毕用
  no_more_ui_content: '没有更多了',
  // 检测是否存在可收取能量球
  collectable_energy_ball_content: '.*\\d+克'
}

var config = storages.create("ant_forest_config");
if (!config.contains("color_offset")) {
  logInfo("使用默认配置", true);
  // 储存默认配置到本地
  Object.keys(default_conf).forEach(function (key) {
    config.put(key, default_conf[key]);
  });
} else {
  // 某些非可视化配置的
  Object.keys(default_conf).forEach(key => {
    let storedConfigItem = config.get(key)
    if (storedConfigItem === undefined) {
      storedConfigItem = default_conf[key]
    }
    config.put(key, storedConfigItem)
  })
}
// UI配置直接设置到storages
Object.keys(ui_config).forEach(key => {
  config.put(key, ui_config[key])
})

// 非GUI可配置的配置直接设置到storages
Object.keys(non_gui_config).forEach(key => {
  config.put(key, non_gui_config[key])
})

function draw_view() {
  ui.layout(
    <ScrollView>
      <vertical id="viewport">
        <frame>
          <appbar>
            <toolbar id="toolbar" title="执行配置" />
          </appbar>
        </frame>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="设置执行模式：" textColor="#666666" textSize="14sp" />
          <radiogroup id="exec_pattern" orientation="horizontal" margin="0 10">
            <radio text="计时" checked="{{!config.get('is_cycle')}}" />
            <radio text="循环" checked="{{config.get('is_cycle')}}" marginLeft="20" />
          </radiogroup>
          <vertical visibility="{{config.get('is_cycle') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left">
            <text text="循环次数：" textColor="#666666" textSize="14sp" />
            <input id="cycle_times" inputType="number" text="{{config.get('cycle_times')}}" />
          </vertical>
          <vertical  w="*" visibility="{{config.get('is_cycle') ? 'gone' : 'visible'}}" >
            <text text="永不停止：" textColor="#666666" textSize="14sp" />
            <radiogroup id="never_stop" orientation="horizontal" margin="0 10">
              <radio text="是" checked="{{config.get('never_stop')}}" />
              <radio text="否" checked="{{!config.get('never_stop')}}" marginLeft="20" />
            </radiogroup>
          </vertical>
          <vertical visibility="{{(!config.get('is_cycle')) ? 'visible': 'gone'}}" w="*">
            <vertical visibility="{{config.get('never_stop') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left">
              <text text="重新激活等待时间：" textColor="#666666" textSize="14sp" />
              <input id="reactive_time" inputType="number" text="{{config.get('reactive_time')}}" />
            </vertical>
          </vertical>
        </vertical>
        <horizontal w="*" h="1sp" bg="#cccccc" margin="10 0"></horizontal>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="帮好友收取：" textColor="#666666" textSize="14sp" />
          <radiogroup id="is_help_fris" orientation="horizontal" margin="0 10">
            <radio text="是" checked="{{config.get('help_friend')}}" />
            <radio text="否" checked="{{!config.get('help_friend')}}" marginLeft="20" />
          </radiogroup>
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="显示debug日志：" textColor="#666666" textSize="14sp" />
          <radiogroup id="show_debug_info" orientation="horizontal" margin="0 10">
            <radio text="是" checked="{{config.get('show_debug_info')}}" />
            <radio text="否" checked="{{!config.get('show_debug_info')}}" marginLeft="20" />
          </radiogroup>
        </vertical>
        <horizontal w="*" h="1sp" bg="#cccccc" margin="10 0"></horizontal>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="颜色偏移量：" textColor="#666666" textSize="14sp" />
          <input id="color_offset" inputType="number" text="{{config.get('color_offset')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="解锁密码：" textColor="#666666" textSize="14sp" />
          <input id="password" inputType="textPassword" text="{{config.get('password')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="最大等待时间（分钟）：" textColor="#666666" textSize="14sp" />
          <input id="max_collect_wait_time" inputType="number" text="{{config.get('max_collect_wait_time')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="好友列表预加载时延：" textColor="#666666" textSize="14sp" />
          <input id="timeoutLoadFriendList" inputType="number" text="{{config.get('timeoutLoadFriendList')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="解锁操作时延：" textColor="#666666" textSize="14sp" />
          <input id="delay_unlock" inputType="number" text="{{config.get('delay_unlock')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="控件搜索超时：" textColor="#666666" textSize="14sp" />
          <input id="timeout_findOne" inputType="number" text="{{config.get('timeout_findOne')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="白名单：" textColor="#666666" textSize="14sp" />
          <text visibility="{{config.get('white_list').length == 0 ? 'visible' : 'gone'}}" w="*" h="80" gravity="center" layout_gravity="center" text="白名单为空" textColor="#999999" textSize="18sp" margin="0 20" bg="#eeeeee" />
          <frame>
            <list id="white_list">
              <horizontal w="*" h="40" gravity="left" bg="#efefef" margin="0 5">
                <text id="name" layout_weight='1' h="30" gravity="left|center" layout_gravity="left|center" textSize="16sp" text="{{name}}" margin="10 0" />
                <card id="delete" w="30" h="30" cardBackgroundColor="#fafafa" cardCornerRadius="15dp" layout_gravity="center" marginRight="10">
                  <text textSize="16dp" textColor="#555555" gravity="center">×</text>
                </card>
              </horizontal>
            </list>
          </frame>
          <button w="*" id="add" text="添加" gravity="center" layout_gravity="center" />
        </vertical>
        <horizontal w="*" h="1sp" bg="#cccccc" margin="10 0"></horizontal>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <button w="*" id="clear" text="清除本地储存" gravity="center" layout_gravity="center" />
        </vertical>
      </vertical>
    </ScrollView>
  );

  // 更新本地配置同时重绘UI
  function update(target, new_val) {
    config.put(target, new_val);
    if (target == "is_cycle" || target == "white_list" || target == 'never_stop') draw_view();
  }

  // 格式化
  function format(val) {
    return val.toString();
  }

  // 更新选中的执行方法
  ui.exec_pattern.setOnCheckedChangeListener(function (radioGroup, id) {
    let index = (id + 1) % radioGroup.getChildCount();
    //toast(radioGroup.getChildAt(index).getText());
    if (radioGroup.getChildAt(index).getText() == "循环") {
      update("is_cycle", true);
    } else {
      update("is_cycle", false);
    }
  });

  // 更新是否帮助好友
  ui.is_help_fris.setOnCheckedChangeListener(function (radioGroup, id) {
    let index = (id + 1) % radioGroup.getChildCount();
    //toast(radioGroup.getChildAt(index).getText());
    if (radioGroup.getChildAt(index).getText() == "是") {
      update("help_friend", true);
    } else {
      update("help_friend", false);
    }
  });

  // 更新是否显示debug日志
  ui.show_debug_info.setOnCheckedChangeListener(function (radioGroup, id) {
    let index = (id + 1) % radioGroup.getChildCount();
    //toast(radioGroup.getChildAt(index).getText());
    if (radioGroup.getChildAt(index).getText() == "是") {
      update("show_debug_info", true);
    } else {
      update("show_debug_info", false);
    }
  });

  ui.never_stop.setOnCheckedChangeListener(function (radioGroup, id) {
    let index = (id + 1) % radioGroup.getChildCount();
    //toast(radioGroup.getChildAt(index).getText());
    if (radioGroup.getChildAt(index).getText() == "是") {
      update("never_stop", true);
    } else {
      update("never_stop", false);
    }
  });

  // 更新颜色偏移
  ui.emitter.on("pause", () => {
    if (config.contains("color_offset")) {
      update("cycle_times", format(ui.cycle_times.getText()));
      update("color_offset", format(ui.color_offset.getText()));
      update("password", format(ui.password.getText()));
      update("max_collect_wait_time", format(ui.max_collect_wait_time.getText()));
      update("delay_unlock", format(ui.delay_unlock.getText()));
      update("timeout_findOne", format(ui.timeout_findOne.getText()));
    }
  });

  // 白名单缓存
  var list_temp = config.get("white_list").map(i => { return { name: i } });
  // 生成白名单
  ui.white_list.setDataSource(list_temp);
  // 从白名单中删除
  ui.white_list.on("item_bind", function (itemView, itemHolder) {
    itemView.delete.on("click", function () {
      list_temp.splice(itemHolder.position, 1);
      update("white_list", list_temp.map(i => i['name']));
    });
  });
  // 添加到白名单
  ui.add.on("click", () => {
    dialogs.rawInput("请输入好友昵称")
      .then(fri_name => {
        if (!fri_name) return;
        list_temp.push({ name: fri_name });
        update("white_list", list_temp.map(i => i['name']));
      });
  });

  // 清除本地储存
  ui.clear.on("click", () => {
    confirm("确定要清除本地储存吗？")
      .then(ok => {
        if (ok) {
          storages.remove("ant_forest_config");
          toastLog("清除成功");
        }
      });
  });
}

draw_view();