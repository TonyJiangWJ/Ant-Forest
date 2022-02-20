/**
 * 控件配置
 */
const WidgetConfigs = {
  mixins: [mixin_common],
  data: function () {
    return {
      configs: {
        my_id: '',
        suspend_on_alarm_clock: false,
        suspend_alarm_content: '滑动关闭闹钟',
        delay_start_pay_code_content: '向商家付(钱|款)',
        home_ui_content: '查看更多动态.*',
        friend_home_check_regex: '你收取TA|TA收取你',
        friend_name_getting_regex: '(.*)的蚂蚁森林',
        enter_friend_list_ui_content: '查看更多好友',
        stroll_end_ui_content: '返回我的森林',
        no_more_ui_content: '没有更多了',
        load_more_ui_content: '查看更多',
        do_watering_button_content: '送给\\s*TA|浇水送祝福',
        friend_load_more_content: '点击展开好友动态',
        using_protect_content: '使用了保护罩',
        collectable_energy_ball_content: '收集能量\\d+克',
        timeout_findOne: 1000,
        timeout_existing: 8000,
      },
    }
  },
  methods: {
    loadConfigs: function () {
      $app.invoke('loadConfigs', {}, config => {
        Object.keys(this.configs).forEach(key => {
          // console.log('load config key:[' + key + '] value: [' + config[key] + ']')
          this.$set(this.configs, key, config[key])
        })
      })
    },
    saveConfigs: function () {
      console.log('save widget configs')
      this.doSaveConfigs()
    }
  },
  mounted () {
    $app.registerFunction('saveWidgetConfigs', this.saveConfigs)
    $app.registerFunction('reloadWidgetConfigs', this.loadConfigs)
  },
  template: `<div>
    <tip-block>一般情况下不需要修改这一块的配置，除非你的支付宝是英文的</tip-block>
    <tip-block>我的ID主要用来准确获取当前收集的能量数据，可不配置</tip-block>
    <van-field v-model="configs.my_id" label="我的ID" type="text" placeholder="" input-align="right" />
    <switch-cell title="闹钟响铃时暂停执行" title-style="width: 12em;flex:2;" v-model="configs.suspend_on_alarm_clock" />
    <van-field v-if="configs.suspend_on_alarm_clock" v-model="configs.suspend_alarm_content" label="闹钟响铃文本" type="text" placeholder="请输入闹钟响铃文本" input-align="right" />
    <tip-block>配置在支付码界面时延迟5分钟执行，避免打断日常支付操作</tip-block>
    <van-field v-model="configs.delay_start_pay_code_content" label="支付码界面文本" label-width="10em" type="text" placeholder="请输入支付码界面文本" input-align="right" />
    <van-field v-model="configs.home_ui_content" label="个人首页" type="text" placeholder="请输入个人首页控件文本" input-align="right" />
    <van-field v-model="configs.friend_home_check_regex" label="判断是否好友首页" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />
    <van-field v-model="configs.friend_name_getting_regex" label="好友名称正则表达式" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />
    <van-field v-model="configs.enter_friend_list_ui_content" label="查看更多好友按钮" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />
    <tip-block>逛一逛结束按钮影响执行逻辑，请不要随意修改，更不要改成立即开启</tip-block>
    <van-field v-model="configs.stroll_end_ui_content" label="逛一逛结束返回按钮" label-width="10em" type="text" placeholder="逛一逛结束返回按钮" input-align="right" />
    <van-field v-model="configs.friend_load_more_content" label="加载好友动态按钮" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />
    <van-field v-model="configs.using_protect_content" label="保护罩使用记录" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />
    <van-field v-model="configs.do_watering_button_content" label="确认浇水按钮" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />
    <number-field v-model="configs.timeout_findOne" label="查找控件超时时间" label-width="8em" placeholder="请输入超时时间">
      <template #right-icon><span>毫秒</span></template>
    </number-field>
    <number-field v-model="configs.timeout_existing" label="校验控件是否存在超时时间" label-width="12em" placeholder="请输入超时时间" >
      <template #right-icon><span>毫秒</span></template>
    </number-field>
  </div>`
}
Vue.component('widget-configs', function (resolve, reject) {
  resolve(WidgetConfigs)
})