
/**
 * 能量雨配置
 */
const RainConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        rain_start_content: '再来一次|立即开启',
        rain_end_content: '.*去蚂蚁森林看看.*',
        rain_press_duration: 7,
        send_chance_to_friend: '',
        rain_click_top: 300,
      },
      validations: {
        rain_press_duration: VALIDATOR.P_INT,
      }
    }
  },
  methods: {
    startRainCollect: function () {
      $app.invoke('startRainCollect', {})
    },
  },
  template: `
  <div>
    <van-divider content-position="left">
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="startRainCollect">启动能量雨</van-button>
    </van-divider>
    <van-cell-group>
      <van-field v-model="configs.rain_start_content" label="启动按钮文本" label-width="10em" type="text" placeholder="请输入启动按钮文本" input-align="right" />
      <van-field v-model="configs.rain_end_content" label="无能量雨机会文本" label-width="10em" type="text" placeholder="请输入无能量雨机会文本" input-align="right" />
      <tip-block>在执行一次之后自动判断是否可以赠送好友机会，配置后自动送给对应好友一次机会，不配置则不会赠送，脚本只执行一轮。</tip-block>
      <van-field v-model="configs.send_chance_to_friend" label="赠送好友" label-width="10em" type="text" placeholder="请输入需要赠送机会的好友" input-align="right" />
      <tip-block>如果运行比较卡可以调高press时间，但是不建议高于35ms</tip-block>
      <number-field v-model="configs.rain_press_duration" :error-message="validationError.rain_press_duration" error-message-align="right" label="press时间" type="text" placeholder="请输入press时间" input-align="right" >
         <template #right-icon><span>毫秒</span></template>
       </number-field>
      <number-field v-model="configs.rain_click_top" label="距离顶部的点击高度" label-width="10em" type="text" placeholder="请输入距离顶部的点击高度" input-align="right" />
    </van-cell-group>
  </div>
  `
}

/**
 * 收集配置
 */
const CollectConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        is_cycle: true,
        cycle_times: 10,
        never_stop: true,
        reactive_time: 60,
        max_collect_wait_time: 60,
        delayStartTime: 5,
        enable_watering_cooperation: true,
        watering_cooperation_name: '',
        watering_cooperation_amount: '',
        watering_cooperation_threshold: '',
        // 执行冷却
        cool_down_if_collect_too_much: true,
        cool_down_per_increase: 1000,
        cool_down_minutes: 60,
        collect_self_only: true,
        not_collect_self: true,
        try_collect_by_stroll: true,
        recheck_rank_list: true,
        use_double_click_card: true,
        merge_countdown_by_gaps: true,
        limit_runnable_time_range: true,
        disable_image_based_collect: true,
        collect_by_stroll_only: true,
      },
      currentInCoolDown: false,
      validations: {
        reactive_time: {
          validate: () => false,
          message: v => {
            if (v) {
              let reactiveTime = this.configs.reactive_time
              let rangeCheckRegex = /^(\d+)-(\d+)$/
              if (isNaN(reactiveTime)) {
                if (rangeCheckRegex.test(this.configs.reactive_time)) {
                  let execResult = rangeCheckRegex.exec(this.configs.reactive_time)
                  let start = parseInt(execResult[1])
                  let end = parseInt(execResult[2])
                  if (start > end || start <= 0) {
                    return '随机范围应当大于零，且 start < end'
                  }
                } else {
                  return '随机范围请按此格式输入: 5-10'
                }
              } else {
                if (parseInt(reactiveTime) <= 0) {
                  return '请输入一个正数'
                }
              }
            }
            return ''
          }
        },
        cool_down_per_increase: VALIDATOR.P_INT,
        cool_down_minutes: VALIDATOR.P_INT,
        countdown_gaps: VALIDATOR.P_INT,
      }
    }
  },
  computed: {
    reactiveTimeDisplay: function () {
      if (this.configs.reactive_time) {
        let rangeCheckRegex = /^(\d+)-(\d+)$/
        if (isNaN(this.configs.reactive_time)) {
          if (rangeCheckRegex.test(this.configs.reactive_time)) {
            let execResult = rangeCheckRegex.exec(this.configs.reactive_time)
            let start = parseInt(execResult[1])
            let end = parseInt(execResult[2])
            if (start < end && start > 0) {
              return '当前设置为从 ' + start + ' 到 ' + end + ' 分钟的随机范围'
            }
          }
        } else {
          return '当前设置为' + this.configs.reactive_time + '分钟'
        }
      }
      return ''
    }
  },
  mounted () {
    $nativeApi.request('checkIfInCooldown', {}).then(resp => {
      this.currentInCoolDown = resp.coolDownInfo.coolDown
    })
    if (this.configs.not_collect_self && this.configs.collect_self_only) {
      this.configs.not_collect_self = false
      this.configs.collect_self_only = false
    }
  },
  template: `
    <div>
      <van-cell-group>
        <switch-cell title="是否循环" v-model="configs.is_cycle" />
        <number-field v-if="configs.is_cycle" v-model="configs.cycle_times" label="循环次数" placeholder="请输入单次运行循环次数" />
        <switch-cell title="是否永不停止" v-model="configs.never_stop" v-if="!configs.is_cycle"/>
        <template  v-if="configs.never_stop">
          <tip-block>永不停止模式请不要全天24小时运行，具体见README</tip-block>
          <tip-block>重新激活时间可以选择随机范围，按如下格式输入即可：30-40。{{reactiveTimeDisplay}}</tip-block>
          <van-field v-model="configs.reactive_time" :error-message="validationError.reactive_time" error-message-align="right" label="重新激活时间" type="text" placeholder="请输入永不停止的循环间隔" input-align="right" >
            <template #right-icon><span>分</span></template>
          </van-field>
        </template>
        <template v-if="!configs.never_stop && !configs.is_cycle">
          <tip-block>如果你想要脚本只执行一次，可以将计时模式最大等待时间设置为0</tip-block>
          <number-field v-model="configs.max_collect_wait_time" label="计时模式最大等待时间" label-width="10em" placeholder="请输入最大等待时间" >
            <template #right-icon><span>分</span></template>
          </number-field>
        </template>
        <tip-block>开启合并倒计时后会统计倒计时N分钟内的按最大倒计时来执行定时任务，比如设置N为5分钟，识别到倒计时[1,2,2,3,6,10,11]将以6(1+5)为最小倒计时设置定时任务</tip-block>
        <switch-cell title="是否合并N分钟内的倒计时" title-style="flex:2;" v-model="configs.merge_countdown_by_gaps" />
        <number-field v-if="configs.merge_countdown_by_gaps" v-model="configs.countdown_gaps" :error-message="validationError.countdown_gaps" label="倒计时间隔时间" label-width="8em" placeholder="请输入倒计时间隔时间" >
          <template #right-icon><span>分</span></template>
        </number-field>
        <tip-block>对话框的倒计时时间，如果设置成0则不显示对话框</tip-block>
        <number-field v-model="configs.delayStartTime" label="延迟启动时间" label-width="10em" placeholder="请输入延迟启动时间" >
          <template #right-icon><span>秒</span></template>
        </number-field>
        <switch-cell title="执行冷却" label="为了避免被支付宝检测为异常，设置一个阈值，达到该值后暂停收集一段时间" title-style="flex:3.5;" v-model="configs.cool_down_if_collect_too_much" />
        <template v-if="configs.cool_down_if_collect_too_much">
          <tip-block>当一个脚本活动周期内累计收取了这个值之后，将暂停收集配置的时间。默认收集1000克后冷却60分钟
          <van-button v-if="currentInCoolDown" style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="cancelCurrentCoolDown">撤销当前冷却</van-button>
          </tip-block>
          <number-field v-model="configs.cool_down_per_increase" :error-message="validationError.cool_down_per_increase" error-message-align="right" label="收集阈值" type="text" placeholder="请输入收集阈值" input-align="right" >
            <template #right-icon><span>克</span></template>
          </number-field>
          <number-field v-model="configs.cool_down_minutes" :error-message="validationError.cool_down_minutes" error-message-align="right" label="冷却时间" type="text" placeholder="请输入冷却时间" input-align="right" >
            <template #right-icon><span>分</span></template>
          </number-field>
        </template>
        <switch-cell title="是否启用合种浇水" title-style="width: 10em;flex:2;" v-model="configs.enable_watering_cooperation" />
        <template v-if="configs.enable_watering_cooperation">
          <van-field v-model="configs.watering_cooperation_name" label="合种名称" placeholder="请输入合种名称" input-align="right" />
          <number-field v-model="configs.watering_cooperation_amount" label="浇水数量" label-width="8em" placeholder="请输入浇水数量" >
            <template #right-icon><span>克</span></template>
          </number-field>
          <tip-block>当今日收集数量超过该阈值之后才执行合种浇水</tip-block>
          <number-field v-model="configs.watering_cooperation_threshold" label="浇水阈值" label-width="8em" placeholder="请输入浇水阈值" >
            <template #right-icon><span>克</span></template>
          </number-field>
        </template>
        <switch-cell v-if="!configs.not_collect_self" title="只收自己的能量" v-model="configs.collect_self_only" />
        <switch-cell v-if="!configs.collect_self_only" title="不收自己的能量" v-model="configs.not_collect_self" />
        <switch-cell title="是否二次校验能量球" v-model="configs.use_double_click_card" />
        <switch-cell title="是否通过逛一逛收集能量" v-model="configs.try_collect_by_stroll" />
        <template v-if="configs.try_collect_by_stroll">
          <tip-block>开启仅仅执行逛一逛后将只通过逛一逛执行，此时将不从排行榜识别倒计时数据，会影响后续定时任务的设置，仅循环模式有效</tip-block>
          <switch-cell title="仅仅执行逛一逛" v-model="configs.disable_image_based_collect" />
          <tip-block>开启仅识别倒计时可以仅通过逛一逛收取，排行榜中只识别倒计时信息不识别帮收和可收取，能够避免重复进入白名单或者保护罩好友页面，
            但是也有一定几率会漏收倒计时刚刚结束的能量，请酌情选择是否开启</tip-block>
          <switch-cell title="排行榜中仅识别倒计时" v-model="configs.collect_by_stroll_only" />
        </template>
        <switch-cell title="是否在收集或帮助后重新检查排行榜" title-style="flex:2;" v-model="configs.recheck_rank_list" />
        <switch-cell title="是否限制0:30-6:50不可运行" title-style="flex:2;" v-model="configs.limit_runnable_time_range" />
      </van-cell-group>
    </div>
  `
}

/**
 * 锁屏相关配置
 */
const LockConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        password: '',
        is_alipay_locked: true,
        alipay_lock_password: '',
        auto_set_brightness: true,
        dismiss_dialog_if_locked: true,
        check_device_posture: true,
        check_distance: true,
        posture_threshold_z: 6,
        battery_keep_threshold: 20,
        auto_lock: true,
        hasRootPermission: false,
        lock_x: 150,
        lock_y: 970,
        timeout_unlock: 1000,
      },
      device: {
        pos_x: 0,
        pos_y: 0,
        pos_z: 0,
        distance: 0
      },
    }
  },
  filters: {
    toFixed3: function (v) {
      if (v) {
        return v.toFixed(3)
      }
      return v
    }
  },
  methods: {
    gravitySensorChange: function (data) {
      this.device.pos_x = data.x
      this.device.pos_y = data.y
      this.device.pos_z = data.z
    },
    distanceSensorChange: function (data) {
      this.device.distance = data.distance
    },
  },
  mounted () {
    $app.registerFunction('gravitySensorChange', this.gravitySensorChange, true)
    $app.registerFunction('distanceSensorChange', this.distanceSensorChange, true)
  },
  unmounted() {
    $app.unregisterFunction('gravitySensorChange')
    $app.unregisterFunction('distanceSensorChange')
  },
  template: `
  <div>
    <van-cell-group>
      <van-field v-model="configs.password" label="锁屏密码" type="password" placeholder="请输入锁屏密码" input-align="right" />
      <number-field v-model="configs.timeout_unlock" label="解锁超时时间" placeholder="请输入解锁超时时间">
        <template #right-icon><span>毫秒</span></template>
      </number-field>
      <switch-cell title="支付宝是否锁定" v-model="configs.is_alipay_locked" />
      <van-field v-if="configs.is_alipay_locked" v-model="configs.alipay_lock_password" label="手势密码" placeholder="请输入手势密码对应的九宫格数字" type="password" input-align="right" />
      <switch-cell title="锁屏启动设置最低亮度" v-model="configs.auto_set_brightness" />
      <switch-cell title="锁屏启动关闭弹窗提示" v-model="configs.dismiss_dialog_if_locked" />
      <switch-cell title="锁屏启动时检测设备传感器" label="检测是否在裤兜内，防止误触" v-model="configs.check_device_posture" />
      <template  v-if="configs.check_device_posture">
        <switch-cell title="同时校验距离传感器" label="部分设备数值不准默认关闭" v-model="configs.check_distance" />
        <tip-block>z轴重力加速度阈值（绝对值小于该值时判定为在兜里）</tip-block>
        <tip-block>x: {{device.pos_x | toFixed3}} y: {{device.pos_y | toFixed3}} z: {{device.pos_z | toFixed3}} 距离传感器：{{device.distance}}</tip-block>
        <number-field v-if="configs.check_device_posture" v-model="configs.posture_threshold_z" error-message-align="right" :error-message="validationError.posture_threshold_z" label="加速度阈值" placeholder="请输入加速度阈值" />
      </template>
      <switch-cell title="自动锁屏" label="脚本执行完毕后自动锁定屏幕" v-model="configs.auto_lock" />
      <template v-if="configs.auto_lock && !configs.hasRootPermission">
        <tip-block>安卓9以上支持通过无障碍服务直接锁屏；低版本的需要通过模拟点击的方式自动锁屏，默认仅支持MIUI12+（在控制中心下拉放置锁屏快捷按钮然后配置坐标），其他系统需要自行扩展实现：extends/LockScreen.js</tip-block>
        <number-field v-model="configs.lock_x" label="横坐标位置" placeholder="请输入横坐标位置" />
        <number-field v-model="configs.lock_y" label="纵坐标位置" placeholder="请输入纵坐标位置" />
      </template>
      <tip-block>设置脚本运行的最低电量(充电时不受限制)，防止早晨低电量持续运行导致自动关机，发生意外情况，比如闹钟歇菜导致上班迟到等情况。如不需要设置为0即可</tip-block>
      <number-field v-model="configs.battery_keep_threshold" label="脚本可运行的最低电量" label-width="12em" placeholder="请输入最低电量" />
    </van-cell-group>
  </div>`
}

/**
 * 悬浮窗设置
 */
const FloatyConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        bang_offset: -90,
        auto_set_bang_offset: true,
        min_floaty_color: '',
        min_floaty_text_size: '',
        min_floaty_x: '',
        min_floaty_y: '',
        not_lingering_float_window: true,
        not_setup_auto_start: true,
        disable_all_auto_start: true,
      },
      validations: {
        min_floaty_color: {
          validate: (v) => /^#[\dabcdef]{6}$/i.test(v),
          message: () => '颜色值格式不正确'
        },
      }
    }
  },
  computed: {
    computedFloatyTextColor: function () {
      if (/#[\dabcdef]{6}/i.test(this.configs.min_floaty_color)) {
        return this.configs.min_floaty_color
      } else {
        return ''
      }
    },
  },
  template: `
  <div>
    <van-cell-group>
      <swipe-color-input-field label="悬浮窗颜色" :error-message="validationError.min_floaty_color" v-model="configs.min_floaty_color" placeholder="悬浮窗颜色值 #FFFFFF"/>
      <number-field v-model="configs.min_floaty_text_size" label-width="8em" label="悬浮窗字体大小" placeholder="请输入悬浮窗字体大小" >
        <template #right-icon><span>sp</span></template>
      </number-field>
      <number-field v-model="configs.min_floaty_x" label="悬浮窗位置X" placeholder="请输入悬浮窗横坐标位置" />
      <number-field v-model="configs.min_floaty_y" label="悬浮窗位置Y" placeholder="请输入悬浮窗纵坐标位置" />
      <tip-block>刘海屏或者挖孔屏悬浮窗显示位置和实际目测位置不同，需要施加一个偏移量，一般是负值，脚本运行时会自动设置</tip-block>
      <switch-cell title="下次执行时重新识别" v-model="configs.auto_set_bang_offset" />
      <van-cell center title="当前偏移量">
        <span>{{configs.auto_set_bang_offset ? "下次执行时重新识别": configs.bang_offset}}</span>
      </van-cell>
      <switch-cell title="不自动设置定时任务" label="是否在脚本执行完成后不自动设置定时任务，仅保留倒计时悬浮窗" title-style="flex:3;" v-model="configs.not_setup_auto_start" />
      <switch-cell v-if="configs.not_setup_auto_start" title="完全关闭定时任务功能" label="完全禁止脚本设置定时任务，只保留部分延迟机制的定时任务" title-style="flex:3;" v-model="configs.disable_all_auto_start" />
      <switch-cell v-if="!configs.not_setup_auto_start" title="不驻留前台" label="是否在脚本执行完成后不驻留前台，关闭倒计时悬浮窗" title-style="flex:3;" v-model="configs.not_lingering_float_window" />
    </van-cell-group>
  </div>`
}

/**
 * 日志配置
 */
const LogConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        is_pro: false,
        show_debug_log: true,
        show_engine_id: true,
        save_log_file: true,
        back_size: '',
        async_save_log_file: true,
        console_log_maximum_size: 1500,
      }
    }
  },
  methods: {
    showLogs: function () {
      $app.invoke('showLogs', {})
    }
  },
  template: `
  <div>
    <van-divider content-position="left">
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="showLogs">查看日志</van-button>
    </van-divider>
      <van-cell-group>
        <tip-block v-if="!configs.is_pro">控制台保留的日志行数，避免运行时间长后保留太多的无用日志，导致内存浪费</tip-block>
        <number-field v-if="!configs.is_pro" v-model="configs.console_log_maximum_size" label="控制台日志最大保留行数" label-width="12em" />
        <switch-cell title="是否显示debug日志" v-model="configs.show_debug_log" />
        <switch-cell title="是否显示脚本引擎id" v-model="configs.show_engine_id" />
        <switch-cell title="是否保存日志到文件" v-model="configs.save_log_file" />
        <number-field v-if="configs.save_log_file" v-model="configs.back_size" label="日志文件滚动大小" label-width="8em" placeholder="请输入单个文件最大大小" >
          <template #right-icon><span>KB</span></template>
        </number-field>
        <switch-cell title="是否异步保存日志到文件" v-model="configs.async_save_log_file" />
    </van-cell-group>
  </div>`
}

/**
 * 开发模式
 */
const DevelopConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        develop_mode: true,
        develop_saving_mode: true,
        cutAndSaveCountdown: true,
        cutAndSaveTreeCollect: true,
        saveBase64ImgInfo: true,
        enable_visual_helper: true,
        auto_check_update: true,
      }
    }
  },
  template: `
  <div>
  <van-cell-group>
    <switch-cell title="是否自动检测更新" v-model="configs.auto_check_update" />
    <switch-cell title="是否启用开发模式" v-model="configs.develop_mode" />
    <template v-if="configs.develop_mode">
      <tip-block>脚本执行时保存图片等数据，未启用开发模式时依旧有效，请不要随意开启。部分功能需要下载master分支才能使用，release分支代码开启后可能无法正常运行</tip-block>
      <switch-cell title="是否保存倒计时图片" v-model="configs.cutAndSaveCountdown" />
      <switch-cell title="是否保存可收取能量球图片" v-model="configs.cutAndSaveTreeCollect" />
      <switch-cell title="是否保存一些开发用的数据" v-model="configs.develop_saving_mode" />
      <switch-cell title="是否倒计时图片base64" v-model="configs.saveBase64ImgInfo" />
      <switch-cell title="是否启用可视化辅助工具" v-model="configs.enable_visual_helper" />
    </template>
  </van-cell-group>
  </div>`
}