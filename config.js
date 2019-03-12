/*
 * @Author: NickHopps
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-03-12 09:49:26
 * @Description: 配置文件
 */

"ui";

var config = storages.create("ant_forest_config");
if (!config.contains("color_offset")) {
  toastLog("使用默认配置");
  // 默认执行配置
  var default_conf = {
    color_offset: 50,
    password: "",
    help_friend: true,
    is_cycle: false,
    cycle_times: 10,
    delay_unlock: 1000,
    timeout_findOne: 1000,
    max_collect_wait_time: 20,
    white_list: []
  };
  // 储存默认配置到本地
  Object.keys(default_conf).forEach(function(key) {
    config.put(key, default_conf[key]);
  });
}

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
        </vertical>
        <horizontal w="*" h="1sp" bg="#cccccc" margin="10 0"></horizontal>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="帮好友收取：" textColor="#666666" textSize="14sp" />
          <radiogroup id="is_help_fris" orientation="horizontal" margin="0 10">
            <radio text="是" checked="{{config.get('help_friend')}}" />
            <radio text="否" checked="{{!config.get('help_friend')}}" marginLeft="20" />
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
            <text text="解锁操作时延：" textColor="#666666" textSize="14sp" />
            <input id="delay_unlock" inputType="number" text="{{config.get('delay_unlock')}}" />
          </vertical>
          <vertical w="*" gravity="left" layout_gravity="left" margin="10">
            <text text="控件搜索超时：" textColor="#666666" textSize="14sp" />
            <input id="timeout_findOne" inputType="number" text="{{config.get('timeout_findOne')}}" />
          </vertical>
          <vertical w="*" gravity="left" layout_gravity="left" margin="10">
            <text text="白名单：" textColor="#666666" textSize="14sp" />
            <text visibility="{{config.get('white_list').length == 0 ? 'visible' : 'gone'}}"  w="*" h="80" gravity="center" layout_gravity="center" text="白名单为空" textColor="#999999" textSize="18sp" margin="0 20" bg="#eeeeee" />
            <frame>
              <list id="white_list">
                <horizontal w="*" h="40" gravity="left" bg="#efefef" margin="0 5">
                  <text id="name" layout_weight='1' h="30" gravity="left|center" layout_gravity="left|center" textSize="16sp" text="{{name}}" margin="10 0" />
                  <card id="delete" w="30" h = "30" cardBackgroundColor = "#fafafa" cardCornerRadius = "15dp" layout_gravity="center" marginRight="10">
                    <text textSize = "16dp" textColor = "#555555" gravity="center">×</text>
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
    if (target == "is_cycle" || target == "white_list") draw_view();
  }

  // 格式化
  function format(val) {
    return val.toString();
  }

  // 更新选中的执行方法
  ui.exec_pattern.setOnCheckedChangeListener(function(radioGroup, id) {
    let index = (id + 1) % radioGroup.getChildCount();
    //toast(radioGroup.getChildAt(index).getText());
    if (radioGroup.getChildAt(index).getText() == "循环") {
      update("is_cycle", true);
    } else {
      update("is_cycle", false);
    }
  });

  // 更新是否帮助好友
  ui.is_help_fris.setOnCheckedChangeListener(function(radioGroup, id) {
    let index = (id + 1) % radioGroup.getChildCount();
    //toast(radioGroup.getChildAt(index).getText());
    if (radioGroup.getChildAt(index).getText() == "是") {
      update("help_friend", true);
    } else {
      update("help_friend", false);
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
  var list_temp = config.get("white_list").map(i => {return {name: i}});
  // 生成白名单
  ui.white_list.setDataSource(list_temp);
  // 从白名单中删除
  ui.white_list.on("item_bind", function(itemView, itemHolder){
    itemView.delete.on("click", function() {
      list_temp.splice(itemHolder.position, 1);
      update("white_list", list_temp.map(i => i['name']));
    });
  });
  // 添加到白名单
  ui.add.on("click", () => {
    dialogs.rawInput("请输入好友昵称")
      .then(fri_name => {
        if (!fri_name) return;
        list_temp.push({name: fri_name});
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