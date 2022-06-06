
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
        rain_collect_duration: 18,
        send_chance_to_friend: '',
        rain_click_top: 300,
        collect_rain_when_stroll: true,
        timeout_rain_find_friend: 3000,
      },
      validations: {
        rain_press_duration: VALIDATOR.P_INT,
      },
      timedUnit1: '',
      timedUnit2: '',
    }
  },
  filters: {
    displayTime: value => {
      if (value && value.length > 0) {
        return `[${value}]`
      }
      return ''
    }
  },
  methods: {
    startRainCollect: function () {
      this.saveConfigs()
      $app.invoke('startRainCollect', {})
    },
  },
  mounted () {
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/循环切换小号并执行能量雨收集.js' }).then(r => this.timedUnit1 = r)
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/自动启动并执行能量雨.js' }).then(r => this.timedUnit2 = r)
  },
  template: `
  <div>
    <van-divider content-position="left">
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="startRainCollect">启动能量雨</van-button>
    </van-divider>
    <van-cell-group>
      <tip-block>最新版支付宝已经无法在逛一逛中直接触发能量雨，请设置以下任一脚本的定时任务进行触发:</tip-block>
      <tip-block>unit/循环切换小号并执行能量雨收集.js{{timedUnit1|displayTime}}</tip-block>
      <tip-block>unit/自动启动并执行能量雨.js{{timedUnit2|displayTime}}</tip-block>
      <!--<switch-cell title="逛一逛结束是否执行能量雨" v-model="configs.collect_rain_when_stroll" />-->
      <van-field v-model="configs.rain_start_content" label="启动按钮文本" label-width="10em" type="text" placeholder="请输入启动按钮文本" input-align="right" />
      <van-field v-model="configs.rain_end_content" label="无能量雨机会文本" label-width="10em" type="text" placeholder="请输入无能量雨机会文本" input-align="right" />
      <tip-block>在执行一次之后自动判断是否可以赠送好友机会，配置后自动送给对应好友一次机会，不配置则不会赠送，脚本只执行一轮。</tip-block>
      <van-field v-model="configs.send_chance_to_friend" label="赠送好友" label-width="10em" type="text" placeholder="请输入需要赠送机会的好友" input-align="right" />
      <number-field v-model="configs.timeout_rain_find_friend" label="查找赠送好友超时时间" label-width="12em" placeholder="请输入超时时间">
        <template #right-icon><span>毫秒</span></template>
      </number-field>
      <tip-block>设置能量雨点击的持续时间 默认为18秒(3+15)，使用限时能量雨时有可能需要改为21，请按实际情况修改</tip-block>
      <number-field v-model="configs.rain_collect_duration" :error-message="validationError.rain_collect_duration" error-message-align="right" label="持续点击时间" type="text" placeholder="请输入持续时间" input-align="right" >
        <template #right-icon><span>秒</span></template>
      </number-field>
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
        watering_cooperation_name: 'test',
        watering_cooperation_amount: '100',
        watering_cooperation_threshold: '100',
        // 执行冷却
        cool_down_if_collect_too_much: true,
        cool_down_per_increase: 600,
        cool_down_minutes: 30,
        cool_down_time: 10,
        collect_self_only: true,
        not_collect_self: true,
        try_collect_by_stroll: true,
        collect_rain_when_stroll: true,
        recheck_rank_list: true,
        double_click_card_used: true,
        merge_countdown_by_gaps: true,
        limit_runnable_time_range: true,
        disable_image_based_collect: true,
        force_disable_image_based_collect: true,
        collect_by_stroll_only: true,
        useCustomScrollDown: true,
        bottomHeight: 200,
        countdown_gaps: 30,
      },
      currentInCoolDown: false,
      currentCollected: 0,
      energyIncreased: 0,
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
        cool_down_time: VALIDATOR.P_INT,
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
    $nativeApi.request('getCurrentIncreased', {}).then(resp => {
      this.currentCollected = resp.collected
      this.energyIncreased = resp.energyIncreased
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
          <tip-block>当最近一小时内累计收取了这个值之后，将暂停收集配置的时间。默认收集600克（包含收集自身的能量）后冷却30分钟，请结合自身情况自行调整</tip-block>
          <tip-block>最近一小时内收集好友能量: {{currentCollected}}g 自身能量增量: {{energyIncreased}}g 是否冷却: {{currentInCoolDown ? '是' : '否' }}</tip-block>
          <number-field v-model="configs.cool_down_per_increase" :error-message="validationError.cool_down_per_increase" error-message-align="right" label="收集阈值" type="text" placeholder="请输入收集阈值" input-align="right" >
            <template #right-icon><span>克</span></template>
          </number-field>
          <number-field v-model="configs.cool_down_minutes" :error-message="validationError.cool_down_minutes" error-message-align="right" label="冷却时间" type="text" placeholder="请输入冷却时间" input-align="right" >
            <template #right-icon><span>分</span></template>
          </number-field>
        </template>
        <number-field v-model="configs.cool_down_time" :error-message="validationError.cool_down_time" error-message-align="right" label="被动冷却时间，检测到行为异常toast之后自动延迟执行"
          label-width="20em" type="text" placeholder="请输入冷却时间" input-align="right" >
          <template #right-icon><span>分</span></template>
        </number-field>
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
        <switch-cell title="是否二次校验能量球" v-model="configs.double_click_card_used" />
        <switch-cell title="是否通过逛一逛收集能量" v-model="configs.try_collect_by_stroll" />
        <template v-if="configs.try_collect_by_stroll">
          <switch-cell title="逛一逛结束是否执行能量雨" v-model="configs.collect_rain_when_stroll" />
          <tip-block>开启仅执行逛一逛后将只通过逛一逛执行，仅循环模式有效</tip-block>
          <switch-cell title="循环模式仅执行逛一逛" v-model="configs.disable_image_based_collect" />
          <tip-block>开启此项将仅通过逛一逛执行不去排行榜获取任何信息，此时无法从排行榜识别倒计时数据，会影响后续定时任务的设置，可以配合永不停止达到自动设置随机的定时任务，但不建议开启此项</tip-block>
          <switch-cell title="所有模式强制仅执行逛一逛" v-model="configs.force_disable_image_based_collect" />
          <tip-block>开启仅识别倒计时可以仅通过逛一逛收取，排行榜中只识别倒计时信息不识别帮收和可收取，能够避免重复进入白名单或者保护罩好友页面，
            但是也有一定几率会漏收倒计时刚刚结束的能量，请酌情选择是否开启</tip-block>
          <switch-cell title="排行榜中仅识别倒计时" v-model="configs.collect_by_stroll_only" />
        </template>
        <tip-block>有时候排行榜中无法使用scrollDown函数下滑，需启用模拟滑动</tip-block>
        <switch-cell title="是否使用模拟滑动" v-model="configs.useCustomScrollDown" />
        <template v-if="configs.useCustomScrollDown">
          <number-field v-model="configs.bottomHeight" label="模拟底部起始高度" label-width="8em" />
        </template>
        <switch-cell title="是否在收集或帮助后重新检查排行榜" title-style="flex:2;" v-model="configs.recheck_rank_list" />
        <switch-cell title="是否限制0:30-6:50不可运行" title-style="flex:2;" v-model="configs.limit_runnable_time_range" />
      </van-cell-group>
    </div>
  `
}