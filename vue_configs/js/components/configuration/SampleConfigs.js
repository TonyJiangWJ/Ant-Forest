
/**
 * 能量雨配置
 */
const RainConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        rain_start_content: '再来一次|立即开启',
        rain_entry_content: '.*能量雨.*',
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
      <tip-block>不建议在逛一逛中触发能量雨，请设置以下任一脚本的定时任务进行触发，避免影响偷能量:</tip-block>
      <tip-block>unit/循环切换小号并执行能量雨收集.js{{timedUnit1|displayTime}}</tip-block>
      <tip-block>unit/自动启动并执行能量雨.js{{timedUnit2|displayTime}}</tip-block>
      <switch-cell title="逛一逛结束是否执行能量雨" v-model="configs.collect_rain_when_stroll" />
      <van-field v-model="configs.rain_entry_content" v-if="configs.collect_rain_when_stroll" label="能量雨入口文本" label-width="10em" type="text" placeholder="请输入能量雨入口文本" input-align="right" />
      <van-field v-model="configs.rain_start_content" label="启动按钮文本" label-width="10em" type="text" placeholder="请输入启动按钮文本" input-align="right" />
      <van-field v-model="configs.rain_end_content" label="无能量雨机会文本" label-width="10em" type="text" placeholder="请输入无能量雨机会文本" input-align="right" />
      <tip-block>在执行一次之后自动判断是否可以赠送好友机会，配置后自动送给对应好友一次机会，不配置则不会赠送，脚本只执行一轮。</tip-block>
      <tip-block>运行'unit/循环切换小号并执行能量雨收集.js'时，会根据配置的多账号自动赠送，不受此功能影响。即配置了A、B、C三个账号，能量雨运行时会自动的A->B->C->A的顺序进行赠送，
      这样三个账号都能获得三次机会。因此请确保正确配置了账号昵称
      </tip-block>
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
 * 神奇海洋
 */
const MagicSeaConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        // 神奇海洋识别区域
        sea_ocr_left: 10,
        sea_ocr_top: 1800,
        sea_ocr_width: 370,
        sea_ocr_height: 240,
        sea_ocr_region: '',
        sea_ball_region: [860, 1350, 140, 160],
        sea_ball_radius_min: null,
        sea_ball_radius_max: null,
        force_sea_auto_click: true,
        ai_type: 'kimi',// kimi、chatgml or empty
        kimi_api_key: '',
        chatgml_api_key: '',
      },
      validations: {
        sea_ocr_region: VALIDATOR.REGION,
      },
      timedUnit1: '每天7点',
    }
  },
  computed: {
    seaOcrRegion: function () {
      return this.configs.sea_ocr_region
    },
    visualConfigs: function () {
      let {
        sea_ocr_left,
        sea_ocr_top,
        sea_ocr_width,
        sea_ocr_height,
        sea_ball_region,
      } = this.configs
      return {
        sea_ocr_left,
        sea_ocr_top,
        sea_ocr_width,
        sea_ocr_height,
        sea_ball_region,
      }
    }
  },
  watch: {
    seaOcrRegion: function () {
      if (this.mounted && this.validations.sea_ocr_region.validate(this.seaOcrRegion)) {
        let match = /^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/.exec(this.seaOcrRegion)
        this.configs.sea_ocr_left = parseInt(match[1])
        this.configs.sea_ocr_top = parseInt(match[2])
        this.configs.sea_ocr_width = parseInt(match[3])
        this.configs.sea_ocr_height = parseInt(match[4])
      }
    },
    // 变更区域信息，用于实时展示
    visualConfigs: {
      handler: function (v) {
        console.log('区域信息变更 触发消息')
        $app.invoke('saveConfigs', v)
      },
      deep: true
    },
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
    loadConfigs: function () {
      this.configs.sea_ocr_region = this.configs.sea_ocr_left + ',' + this.configs.sea_ocr_top + ',' + this.configs.sea_ocr_width + ',' + this.configs.sea_ocr_height
      $app.invoke('loadConfigs', {}, config => {
        Object.keys(this.configs).forEach(key => {
          console.log('child load config key:[' + key + '] value: [' + config[key] + ']')
          this.$set(this.configs, key, config[key])
        })
        this.device.width = config.device_width
        this.device.height = config.device_height
        this.configs.sea_ocr_region = this.configs.sea_ocr_left + ',' + this.configs.sea_ocr_top + ',' + this.configs.sea_ocr_width + ',' + this.configs.sea_ocr_height
        this.mounted = true
      })
    },
    showRealVisual: function () {
      $app.invoke('executeTargetScript', '/test/全局悬浮窗显示-神奇海洋信息.js')
    },
    startSea: function () {
      $app.invoke('executeTargetScript', '/unit/神奇海洋收集.js')
    }
  },
  mounted () {
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/神奇海洋收集.js' }).then(r => this.timedUnit1 = r)
  },
  template: `
  <div>
    <tip-block>对下述文件创建每天7点的定时任务即可，如果怕影响偷能量则创建9点的。脚本执行后会自动每隔两小时创建定时任务</tip-block>
    <tip-block>unit/神奇海洋收集.js{{timedUnit1|displayTime}}<van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="startSea">启动脚本</van-button></tip-block>
    <van-divider content-position="left">
      神奇海洋配置
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="showRealVisual">实时查看区域配置</van-button>
    </van-divider>
    <tip-block>神奇海洋默认无法通过无障碍点击收集，请在神奇海洋设置中关闭3D模式。入口在神奇海洋右上角三点菜单中，点击“设置”按钮，然后关闭“3D模式”即可。</tip-block>
    <tip-block>脚本默认尝试shizuku点击，如已关闭3D模式日志相关提示无视即可。或者你确认关闭3D模式后可以主动打开以下开关</tip-block>
    <switch-cell title="使用无障碍点击" v-model="configs.force_sea_auto_click"/>
    <region-input-field
        :device-height="device.height" :device-width="device.width"
        :error-message="validationError.sea_ocr_region"
        v-model="configs.sea_ocr_region" label="神奇海洋OCR识别区域" label-width="12em" />
    <tip-block>角标是指棕黄色的小球 中间带x1的那个</tip-block>
    <region-input-field :array-value="true" v-model="configs.sea_ball_region" label="垃圾球角标所在位置" label-width="14em" :device-height="device.height" :device-width="device.width" />
    <van-field v-model="configs.sea_ball_radius_min" label="垃圾球角标半径最小值" label-width="14em" type="text" placeholder="留空使用默认配置" input-align="right"/>
    <van-field v-model="configs.sea_ball_radius_max" label="垃圾球角标半径最大值" label-width="14em" type="text" placeholder="留空使用默认配置" input-align="right"/>
    <tip-block>AI答题配置，留空使用默认配置。KIMI令牌请前往开放平台申请：https://platform.moonshot.cn/console/api-keys</tip-block>
    <tip-block>智谱清言(chatgml)令牌请前往开放平台申请（新用户首月免费100万token，后续似乎按量收费，但是响应比Kimi快）：https://open.bigmodel.cn/usercenter/apikeys</tip-block>
    <tip-block>默认的免费接口是个大智障经常性出错或者答错，所以尽量自己去申请KIMI的接口权限。另外真的很推荐使用KIMI小程序或者网页端服务，大部分情况下都很够用</tip-block>
    <tip-block>这个AI答题功能也适用于蚂蚁庄园和蚂蚁新村，打开对应答题页面再点击AI答题即可</tip-block>
    <tip-block>AI类型可选：kimi、chatgml 留空或者乱填使用默认弱智AI. chatgml速度较快但后期可能需要付费，他和kimi之间的正确率各有优劣，请自行选择</tip-block>
    <van-field v-model="configs.ai_type" label="AI类型" label-width="14em" type="text" placeholder="留空使用默认配置" input-align="right"/>
    <van-field v-model="configs.kimi_api_key" label="KIMI密钥" label-width="14em" type="text" placeholder="留空使用默认AI接口" input-align="right"/>
    <van-field v-model="configs.chatgml_api_key" label="智谱清言密钥" label-width="14em" type="text" placeholder="留空使用默认AI接口" input-align="right"/>
  </div>
  `
}

const PatrolWalkerConfig = {
  mixins: [mixin_common],
  data () {
    return {
      timedUnit1: '',
      configs: {
        invite_friends_gaint_chance: false,
      }
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
  mounted () {
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/自动巡护.js' }).then(r => this.timedUnit1 = r)
  },
  template: `
  <div>
    <tip-block>对下述文件创建每天固定时间的定时任务即可，不过建议使用github actions(搜索 TonyJiangWJ/mimotion 按说明配置即可)刷步数，然后在步数达到1万以上后再触发，以便得到最大巡护次数</tip-block>
    <tip-block>unit/自动巡护.js{{timedUnit1|displayTime}}</tip-block>
    <van-divider content-position="left">
      自动巡护配置
    </van-divider>
    <switch-cell title="是否邀请好友获取巡护机会" v-model="configs.invite_friends_gaint_chance"/>
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
      cardTipsName: [],
      configs: {
        // 开启yolo目标检测
        detect_ball_by_yolo: true,
        yolo_confidence: 0.7,
        no_friend_list_countdown: true,
        is_cycle: true,
        cycle_times: 10,
        never_stop: true,
        force_group_mode: true,
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
        recheck_after_stroll: false,
        collect_rain_when_stroll: true,
        double_check_collect: true,
        fast_collect_mode: true,
        merge_countdown_by_gaps: true,
        limit_runnable_time_range: true,
        countdown_gaps: 30,
        friend_list_countdown_timeout: 10000,
        friend_list_max_scroll_down_time: 30,
        friend_list_end_content: '.*没有更多了.*',
        random_gesture_safe_range_top: '',
        random_gesture_safe_range_bottom: '',
        // 是否使用双击卡
        use_duplicate_card: false,
        // 双击卡使用时间段
        duplicate_card_using_time_ranges: '00:00-00:10',
        // 使用一键收
        use_one_key_collect: false,
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
        duplicate_card_using_time_ranges: {
          required: true,
          validate: () => false,
          message: v => {
            if (v) {
              let current_time_ranges = this.configs.duplicate_card_using_time_ranges.split(';')
              let timeRangeRegex = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/
              for (let i=0;i<current_time_ranges.length;i++) {
                let timeRange = current_time_ranges[i]
                if (!timeRangeRegex.test(timeRange)) {
                  return '时间范围格式不正确，多个时间段分号分隔如：00:00-00:10;07:00-07:10'
                }
                let times = timeRangeRegex.exec(timeRange)
                if (times[1] > times[2]) {
                  return '时间范围格式不正确，请确保-左侧小于等于右侧'
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
        random_gesture_safe_range_top: VALIDATOR.RANDOM_RANGE,
        random_gesture_safe_range_bottom: VALIDATOR.RANDOM_RANGE,
      }
    }
  },
  computed: {
    currentTimeRanges: function () {
      return (this.configs.duplicate_card_using_time_ranges || '').split(';')
    },
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
        <tip-block>YOLO目标检测需要 AutoJS修改版或者困鱼 版本支持，同时需要下载ONNX模型，运行 独立工具/模型下载.js 即可自动下载</tip-block>
        <tip-block>开启YOLO目标检测后，基本所有图像识别相关设置都可以不再进行配置。如果YOLO识别精度过低，可以在关于项目-开发模式
           打开启用开发模式，打开是否保存YOLO训练用数据 然后关闭开发模式。运行一段时间后将resources/trainData目录打包发送给开发者，进行进一步训练以便提高模型识别精度</tip-block>
        <tip-block>运行 独立工具/YOLOJ检测.js 可以查看模型识别效果</tip-block>
        <switch-cell title="使用YOLO模型识别检测元素" v-model="configs.detect_ball_by_yolo" />
        <tip-block>留空使用默认值即可</tip-block>
        <number-field v-if="configs.detect_ball_by_yolo" v-model="configs.yolo_confidence" label="yolo可信度过滤(0-1)" label-width="12em" placeholder="请输入0-1" ></number-field>
        <tip-block>注意 进入组队模式无法识别倒计时，请主动开启永不停止</tip-block>
        <switch-cell title="是否强制开启组队模式" v-model="configs.force_group_mode"/>
        <tip-block>当前版本仅通过逛一逛收取，排行榜中只识别倒计时信息不识别帮收和可收取，有一定几率会漏收倒计时刚刚结束的能量</tip-block>
        <switch-cell title="逛一逛结束后重复一遍" v-model="configs.recheck_after_stroll" label="逛一逛收集到能量后，重复逛一逛避免漏收倒计时刚刚结束的能量" title-style="flex:3.5;" />
        <switch-cell title="不去排行榜获取倒计时数据" v-model="configs.no_friend_list_countdown"/>
        <template v-if="!configs.no_friend_list_countdown">
        <number-field v-model="configs.friend_list_countdown_timeout" label="排行榜获取倒计时超时时间" label-width="12em" placeholder="请输入超时时间" >
          <template #right-icon><span>毫秒</span></template>
        </number-field>
        <number-field v-model="configs.friend_list_max_scroll_down_time" label="排行榜下拉最大次数" label-width="10em" placeholder="请输入最大次数" />
        <van-field v-model="configs.friend_list_end_content" label="排行榜底部判断控件文本" label-width="12em" placeholder="请输入底部判断文本" input-align="right" />
        <tip-block>排行榜使用了随机手势来上下滑动，如果触发了状态栏下拉等操作，请手动配置范围，否则留空就行。排行榜下滑时从底部滑动到顶部，返回首页时从顶部滑动到底部。</tip-block>
        <van-field v-model="configs.random_gesture_safe_range_top" :error-message="validationError.random_gesture_safe_range_top"
          error-message-align="right" label="随机滑动顶部起止范围" label-width="12em" type="text" placeholder="留空使用默认值如400-600" input-align="right" />
        <van-field v-model="configs.random_gesture_safe_range_bottom" :error-message="validationError.random_gesture_safe_range_bottom"
          error-message-align="right" label="随机滑动底部起止范围" label-width="12em" type="text" placeholder="例如1800-2000" input-align="right" />
        </template>
        <template v-else>
          <tip-block>关闭排行榜获取倒计时后，脚本将只根据自身能量倒计时来创建定时任务，无法知晓好友能量的倒计时时间。建议同时开启永不停止，实现全天随机的启动并收能量</tip-block>
        </template>
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
        <switch-cell title="是否二次校验能量球" v-model="configs.double_check_collect" />
        <switch-cell title="是否自动使用双击卡" v-model="configs.use_duplicate_card" />
        <template v-if="configs.use_duplicate_card">
          <tip-block>可以指定多个时间范围，脚本在指定时间范围内启动时将自动使用双击卡，格式如下：00:00-00:10;07:00-07:10</tip-block>
          <tip-block>需要注意的是，使用双击卡可能导致被支付宝风控检测为行为异常，这不是脚本导致的，单纯因为短时间内收集了太多能量导致的，请酌情使用</tip-block>
          <van-field v-model="configs.duplicate_card_using_time_ranges"
            :error-message="validationError.duplicate_card_using_time_ranges" error-message-align="right"
            label="指定使用双击卡的时间段" label-width="12em" placeholder="请输入使用的时间段" input-align="right" />
            <van-collapse v-model="cardTipsName">
              <van-collapse-item title="更多说明" name="1">
                <van-divider content-position="left">当前设置的区间</van-divider>
                <van-cell v-if="currentTimeRanges.length==0" title="无"/>
                <van-cell v-else v-for="timeRange in currentTimeRanges" :title="timeRange" :key="timeRange" style="overflow:auto;" />
                <tip-block>对于最优的时间范围，可以自行摸索，推荐0点后运行一次，可以多收取一次未过期的能量。其他时间段推荐的方式是：根据每天的收集统计数据，查看各个时间段收集的能量数据，选择适合自己的触发时间段。</tip-block>
                <tip-block>同时建议通过unit下的脚本控制自动定时任务触发的执行，避免高能量区间自动执行却未触发双击卡，或者未能在生效的5分钟之内收取最大数量的能量。</tip-block>
                <tip-block>脚本并不校验双击卡库存，请在自己双击卡充裕的情况下使用</tip-block>
                <tip-block>可以对 unit/自动使用双击卡-启用[禁用].js 创建定时任务，用于控制每周不同时间是否触发</tip-block>
                <tip-block>默认使用找图方式查找 用道具 按钮，找不到时使用OCR查找，但是OCR并不稳定因此请在 查找图片设置 中设置适合自己分辨率的实际图片，确保准确触发</tip-block>
              </van-collapse-item>
            </van-collapse>
        </template>
        <tip-block>开启快速收集后收取能量球间隔不再随机睡眠，但是有可能被检测为异常，谨慎开启</tip-block>
        <switch-cell title="快速收集模式" v-model="configs.fast_collect_mode" />
        <tip-block>开启一键收需要正确配置一键收的图片信息，请前往查找图片设置进行配置</tip-block>
        <switch-cell title="使用一键收" v-model="configs.use_one_key_collect" />
        <switch-cell title="逛一逛结束是否执行能量雨" v-model="configs.collect_rain_when_stroll" />
        <switch-cell title="是否限制0:30-6:50不可运行" title-style="flex:2;" v-model="configs.limit_runnable_time_range" />
      </van-cell-group>
    </div>
  `
}