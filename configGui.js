/*
 * @Author: NickHopps
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-04-01 14:15:55
 * @Description: 配置文件
 */
'ui';
// 读取并加载配置到storage
var { default_config, storage_name } = require('./config.js')
var configStorage = storages.create(storage_name)

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
            <radio text="计时" checked="{{!configStorage.get('is_cycle')}}" />
            <radio text="循环" checked="{{configStorage.get('is_cycle')}}" marginLeft="20" />
          </radiogroup>
          <vertical visibility="{{configStorage.get('is_cycle') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left">
            <text text="循环次数：" textColor="#666666" textSize="14sp" />
            <input id="cycle_times" inputType="number" text="{{configStorage.get('cycle_times')}}" />
          </vertical>
          <vertical w="*" visibility="{{configStorage.get('is_cycle') ? 'gone' : 'visible'}}" >
            <text text="永不停止：" textColor="#666666" textSize="14sp" />
            <radiogroup id="never_stop" orientation="horizontal" margin="0 10">
              <radio text="是" checked="{{configStorage.get('never_stop')}}" />
              <radio text="否" checked="{{!configStorage.get('never_stop')}}" marginLeft="20" />
            </radiogroup>
          </vertical>
          <vertical visibility="{{configStorage.get('is_cycle') ? 'gone' : 'visible'}}" w="*">
            <vertical visibility="{{configStorage.get('never_stop') ? 'gone' : 'visible'}}" w="*" gravity="left" layout_gravity="left">
              <text text="最大收集次数：" textColor="#666666" textSize="14sp" />
              <input id="max_collect_repeat" inputType="number" text="{{configStorage.get('max_collect_repeat')}}" />
            </vertical>
            <vertical visibility="{{configStorage.get('never_stop') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left">
              <text text="重新激活等待时间：" textColor="#666666" textSize="14sp" />
              <input id="reactive_time" inputType="number" text="{{configStorage.get('reactive_time')}}" />
            </vertical>
          </vertical>
        </vertical>
        <horizontal w="*" h="1sp" bg="#cccccc" margin="10 0"></horizontal>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="帮好友收取：" textColor="#666666" textSize="14sp" />
          <radiogroup id="is_help_fris" orientation="horizontal" margin="0 10">
            <radio text="是" checked="{{configStorage.get('help_friend')}}" />
            <radio text="否" checked="{{!configStorage.get('help_friend')}}" marginLeft="20" />
          </radiogroup>
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="显示mini悬浮窗" textColor="#666666" textSize="14sp" />
          <radiogroup id="show_small_floaty" orientation="horizontal" margin="0 10">
            <radio text="是" checked="{{configStorage.get('show_small_floaty')}}" />
            <radio text="否" checked="{{!configStorage.get('show_small_floaty')}}" marginLeft="20" />
          </radiogroup>
        </vertical>
        <horizontal visibility="{{configStorage.get('show_small_floaty') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="mini悬浮窗位置" />
        </horizontal>
        <horizontal visibility="{{configStorage.get('show_small_floaty') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="x:" /><input id="min_floaty_x" inputType="number" text="{{configStorage.get('min_floaty_x')}}" />
          <text text="y:" /><input id="min_floaty_y" inputType="number" text="{{configStorage.get('min_floaty_y')}}" />
        </horizontal>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="定时自动启动：" textColor="#666666" textSize="14sp" />
          <radiogroup id="auto_start" orientation="horizontal" margin="0 10">
            <radio text="是" checked="{{configStorage.get('auto_start')}}" />
            <radio text="否" checked="{{!configStorage.get('auto_start')}}" marginLeft="20" />
          </radiogroup>
          <vertical visibility="{{configStorage.get('auto_start') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left">
            <text text="是否同一天：" textColor="#666666" textSize="14sp" />
            <radiogroup id="auto_start_same_day" orientation="horizontal" margin="0 10">
              <radio text="是" checked="{{configStorage.get('auto_start_same_day')}}" />
              <radio text="否" checked="{{!configStorage.get('auto_start_same_day')}}" marginLeft="20" />
            </radiogroup>
          </vertical>
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="是否跳过小于等于5克的能量" />
          <radiogroup id="skip_five" orientation="horizontal" margin="0 10">
            <radio text="是" checked="{{configStorage.get('skip_five')}}" />
            <radio text="否" checked="{{!configStorage.get('skip_five')}}" marginLeft="20" />
          </radiogroup>
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="是否显示调试日志信息" />
          <radiogroup id="show_debug_log" orientation="horizontal" margin="0 10">
            <radio text="是" checked="{{configStorage.get('show_debug_log')}}" />
            <radio text="否" checked="{{!configStorage.get('show_debug_log')}}" marginLeft="20" />
          </radiogroup>
          <vertical visibility="{{configStorage.get('show_debug_log') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left" margin="10">
            <text text="是否toast调试日志" />
            <radiogroup id="toast_debug_info" orientation="horizontal" margin="0 10">
              <radio text="是" checked="{{configStorage.get('toast_debug_info')}}" />
              <radio text="否" checked="{{!configStorage.get('toast_debug_info')}}" marginLeft="20" />
            </radiogroup>
          </vertical>
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="是否在收集完成后根据收集前状态判断是否锁屏" />
          <radiogroup id="auto_lock" orientation="horizontal" margin="0 10">
            <radio text="是" checked="{{configStorage.get('auto_lock')}}" />
            <radio text="否" checked="{{!configStorage.get('auto_lock')}}" marginLeft="20" />
          </radiogroup>
          <horizontal visibility="{{configStorage.get('auto_lock') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left" margin="10">
            <text text="锁屏按钮位置" />
          </horizontal>
          <horizontal visibility="{{configStorage.get('auto_lock') ? 'visible' : 'gone'}}" w="*" gravity="left" layout_gravity="left" margin="10">
            <text text="x:" /><input id="lock_x" inputType="number" text="{{configStorage.get('lock_x')}}" />
            <text text="y:" /><input id="lock_y" inputType="number" text="{{configStorage.get('lock_y')}}" />
          </horizontal>
        </vertical>
        <horizontal w="*" h="1sp" bg="#cccccc" margin="10 0"></horizontal>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="颜色偏移量：" textColor="#666666" textSize="14sp" />
          <input id="color_offset" inputType="number" text="{{configStorage.get('color_offset')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="解锁密码：" textColor="#666666" textSize="14sp" />
          <input id="password" inputType="textPassword" text="{{configStorage.get('password')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="最大等待时间（分钟）：" textColor="#666666" textSize="14sp" />
          <input id="max_collect_wait_time" inputType="number" text="{{configStorage.get('max_collect_wait_time')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="解锁操作时延：" textColor="#666666" textSize="14sp" />
          <input id="timeout_unlock" inputType="number" text="{{configStorage.get('timeout_unlock')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="控件搜索超时：" textColor="#666666" textSize="14sp" />
          <input id="timeout_findOne" inputType="number" text="{{configStorage.get('timeout_findOne')}}" />
        </vertical>
        <vertical w="*" gravity="left" layout_gravity="left" margin="10">
          <text text="白名单：" textColor="#666666" textSize="14sp" />
          <text visibility="{{(!configStorage.get('white_list') || configStorage.get('white_list').length == 0) ? 'visible' : 'gone'}}" w="*" h="80" gravity="center" layout_gravity="center" text="白名单为空" textColor="#999999" textSize="18sp" margin="0 20" bg="#eeeeee" />
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
  function update(target, new_val, update_view) {
    configStorage.put(target, new_val);
    if (update_view) {
      draw_view();
    }
  }

  // 更新radio值
  function updateRadioValue(radioGroup, id, valueKey, p) {
    let identify = p || '是'
    let index = (id + 1) % radioGroup.getChildCount()
    if (radioGroup.getChildAt(index).getText() == identify) {
      update(valueKey, true, true)
    } else {
      update(valueKey, false, true)
    }
  }

  // 格式化
  function format(val) {
    return val.toString();
  }

  // 更新选中的执行方法
  ui.exec_pattern.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "is_cycle", "循环")
  });

  // 更新选中的执行方法
  ui.never_stop.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "never_stop")
  });

  ui.show_small_floaty.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "show_small_floaty")
  })

  // 更新是否帮助好友
  ui.is_help_fris.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "help_friend")
  });

  // 是否定时启动
  ui.auto_start.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "auto_start")
  })

  // 是否同一天
  ui.auto_start_same_day.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "auto_start_same_day")
  })

  // 是否跳过低于五克的能量
  ui.skip_five.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "skip_five")
  })

  // 是否显示调试日志
  ui.show_debug_log.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "show_debug_log")
  })

  // 是否toast调试日志
  ui.toast_debug_info.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "toast_debug_info")
  })

  // 是否自动锁屏
  ui.auto_lock.setOnCheckedChangeListener(function (radioGroup, id) {
    updateRadioValue(radioGroup, id, "auto_lock")
  })

  // 更新颜色偏移
  ui.emitter.on("pause", () => {
    if (configStorage.contains("color_offset")) {
      update("cycle_times", format(ui.cycle_times.getText()));
      update("reactive_time", format(ui.reactive_time.getText()));
      update("max_collect_repeat", format(ui.max_collect_repeat.getText()));
      update("color_offset", format(ui.color_offset.getText()));
      update("password", format(ui.password.getText()));
      update("max_collect_wait_time", format(ui.max_collect_wait_time.getText()));
      update("timeout_unlock", format(ui.timeout_unlock.getText()));
      update("timeout_findOne", format(ui.timeout_findOne.getText()));
      update("min_floaty_x", format(ui.min_floaty_x.getText()));
      update("min_floaty_y", format(ui.min_floaty_y.getText()));
      update("lock_x", format(ui.lock_x.getText()));
      update("lock_y", format(ui.lock_y.getText()));
    }
  });

  // 白名单缓存
  var list_temp = configStorage.get("white_list") ? configStorage.get("white_list").map(i => { return { name: i } }) : [];
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
        update("white_list", list_temp.map(i => i['name']), true);
      });
  });

  // 清除本地储存
  ui.clear.on("click", () => {
    confirm("确定要清除本地储存吗？")
      .then(ok => {
        if (ok) {
          storages.remove(storage_name);
          toastLog("清除成功");
          configStorage = storages.create(storage_name)
          Object.keys(default_config).forEach(key => {
            configStorage.put(key, default_config[key])
          })
          draw_view()
        }
      });
  });
}

draw_view()
// module.exports = config
