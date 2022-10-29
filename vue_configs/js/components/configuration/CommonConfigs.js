
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
        multi_device_login: false,
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
        buddha_like_mode: false,
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
  unmounted () {
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
      <tip-block>仅限在支付宝账号管理-登录设置-开启可信设备自动登录后才有效，否则需要密码登录，无法使用此功能自动登录</tip-block>
      <switch-cell title="多设备自动登录" v-model="configs.multi_device_login" />
      <switch-cell title="支付宝是否锁定" v-model="configs.is_alipay_locked" />
      <van-field v-if="configs.is_alipay_locked" v-model="configs.alipay_lock_password" label="手势密码" placeholder="请输入手势密码对应的九宫格数字" type="password" input-align="right" />
      <switch-cell title="锁屏启动设置最低亮度" v-model="configs.auto_set_brightness" />
      <tip-block>启用佛系模式之后，如果屏幕未锁定，则认定手机正在使用中，自动延迟五分钟，等待下次运行时状态为已锁屏才继续运行。由其他脚本触发的不受此模式限制</tip-block>
      <switch-cell title="启用佛系模式" v-model="configs.buddha_like_mode" />
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
        release_screen_capture_when_waiting: false,
        not_setup_auto_start: true,
        disable_all_auto_start: true,
      },
      validations: {
        min_floaty_color: VALIDATOR.COLOR,
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
      <tip-block>刘海屏或者挖孔屏悬浮窗显示位置和实际目测位置不同，需要施加一个偏移量，一般是负值，脚本运行时会自动设置，非异形屏请自行修改为0</tip-block>
      <switch-cell title="下次执行时重新识别" v-model="configs.auto_set_bang_offset" />
      <number-field v-if="!configs.auto_set_bang_offset" v-model="configs.bang_offset" label="偏移量" label-width="12em" />
      <van-cell center title="偏移量" v-else>
        <span>下次执行时重新识别</span>
      </van-cell>
      <switch-cell title="不自动设置定时任务" label="是否在脚本执行完成后不自动设置定时任务，仅保留倒计时悬浮窗" title-style="flex:3;" v-model="configs.not_setup_auto_start" />
      <switch-cell v-if="configs.not_setup_auto_start" title="完全关闭定时任务功能" label="完全禁止脚本设置定时任务，只保留部分延迟机制的定时任务" title-style="flex:3;" v-model="configs.disable_all_auto_start" />
      <switch-cell v-if="!configs.not_setup_auto_start" title="不驻留前台" label="是否在脚本执行完成后不驻留前台，关闭倒计时悬浮窗" title-style="flex:3;" v-model="configs.not_lingering_float_window" />
      <switch-cell v-if="!configs.not_setup_auto_start && !configs.not_lingering_float_window" title="释放截图权限"
        label="是否在脚本显示悬浮窗倒计时等待时释放截图权限，可以降低等待时的CPU占用率，启用后等待时间大于5分钟才会释放"
        title-style="flex:3;" v-model="configs.release_screen_capture_when_waiting" />
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
        // 日志保留天数
        log_saved_days: 3,
        back_size: '1024',
        async_save_log_file: true,
        console_log_maximum_size: 1500,
      }
    }
  },
  methods: {
    showLogs: function () {
      $app.invoke('showLogs', {})
    },
    showAutoJSLogs: function () {
      $app.invoke('openConsole', {})
    }
  },
  template: `
  <div>
    <tip-block>
      <van-button style="margin-left: 0.4rem;margin-right:0.4rem" plain hairline type="primary" size="mini" @click="showLogs">查看脚本日志</van-button>
      仅提供脚本所维护的日志信息，如遇报错请查看AutoJS软件自带日志
      <van-button style="margin-left: 0.4rem;margin-right:0.4rem" plain hairline type="primary" size="mini" @click="showAutoJSLogs">查看AutoJS日志</van-button>
    </tip-block>
    <van-cell-group>
      <tip-block v-if="!configs.is_pro">控制台保留的日志行数，避免运行时间长后保留太多的无用日志，导致内存浪费</tip-block>
      <number-field v-if="!configs.is_pro" v-model="configs.console_log_maximum_size" label="控制台日志最大保留行数" label-width="12em" />
      <switch-cell title="是否显示debug日志" v-model="configs.show_debug_log" />
      <switch-cell title="是否显示脚本引擎id" v-model="configs.show_engine_id" />
      <switch-cell title="是否保存日志到文件" v-model="configs.save_log_file" />
      <number-field v-if="configs.save_log_file" v-model="configs.back_size" label="日志文件滚动大小" label-width="8em" placeholder="请输入单个文件最大大小" >
        <template #right-icon><span>KB</span></template>
      </number-field>
      <number-field v-if="configs.save_log_file" v-model="configs.log_saved_days" label="日志文件保留天数" label-width="8em" placeholder="请输入日志文件保留天数" >
        <template #right-icon><span>天</span></template>
      </number-field>
      <switch-cell title="是否异步保存日志到文件" v-model="configs.async_save_log_file" />
    </van-cell-group>
  </div>`
}


/**
 * 高级设置
 */
const AdvanceCommonConfig = {
  mixins: [mixin_common],
  data () {
    return {
      activeNames: [],
      enabledServices: 'com.taobao.idlefishs.modify.opencv4/org.autojs.autojs.timing.work.AlarmManagerProvider:com.taobao.idlefishs.modify.opencv4/org.autojs.autojs.timing.work.AlarmManagerProvider:com.taobao.idlefishs.modify.opencv4/org.autojs.autojs.timing.work.AlarmManagerProvider',
      configs: {
        single_script: true,
        auto_restart_when_crashed: true,
        useCustomScrollDown: true,
        bottomHeight: null,
        other_accessisibility_services: '',
        // 截图相关
        async_waiting_capture: true,
        capture_waiting_time: 500,
        request_capture_permission: true,
        capture_permission_button: 'START NOW|立即开始|允许',
        is_pro: false,
        enable_call_state_control: true,
      }
    }
  },
  computed: {
    accessibilityServices: function () {
      if (!this.configs.other_accessisibility_services || this.configs.other_accessisibility_services.length == 0) {
        return []
      }
      return this.configs.other_accessisibility_services.split(':')
    },
    enabledAccessibilityServices: function () {
      if (!this.enabledServices || this.enabledServices.length == 0) {
        return []
      }
      return this.enabledServices.split(':')
    },
  },
  methods: {
    doAuthADB: function () {
      $app.invoke('doAuthADB', {})
      let _this = this
      setTimeout(() => {
        _this.getEnabledServices()
      }, 2000)
    },
    copyText: function (text) {
      console.log('复制文本：', text)
      $app.invoke('copyText', { text })
    },
    getEnabledServices: function () {
      $nativeApi.request('getEnabledServices', {}).then(resp => {
        this.enabledServices = resp.enabledServices
      })
    }
  },
  mounted() {
    this.getEnabledServices()
  },
  template: `
  <div>
    <van-cell-group>
      <tip-block>当需要使用多个脚本时不要勾选（如同时使用我写的蚂蚁庄园脚本），避免抢占前台</tip-block>
      <switch-cell title="是否单脚本运行" v-model="configs.single_script" />
      <tip-block>AutoJS有时候会莫名其妙的崩溃，但是授权了自启动权限之后又会自动启动。开启该选项之后会创建一个广播事件的定时任务，
        当脚本执行过程中AutoJS崩溃自启，将重新开始执行脚本。如果脚本执行完毕，则不会触发执行</tip-block>
      <switch-cell title="AutoJS崩溃自启后重启脚本" title-style="flex:2;" v-model="configs.auto_restart_when_crashed" />
      <tip-block>拥有ADB权限时，授权AutoJS无障碍权限的同时授权其他应用无障碍服务权限 多个服务用:分隔
        <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="doAuthADB">触发授权</van-button>
      </tip-block>
      <van-field v-model="configs.other_accessisibility_services" label="无障碍服务service" label-width="10em" type="text" placeholder="请输入" input-align="right" stop-propagation />
      <van-collapse v-model="activeNames">
        <van-collapse-item title="查看无障碍服务列表" name="1">
          <van-divider content-position="left">当前设置的无障碍服务</van-divider>
          <van-cell v-if="accessibilityServices.length==0" title="无"/>
          <van-cell v-else v-for="service in accessibilityServices" :title="service" :key="service" style="overflow:auto;" />
          <van-divider content-position="left">当前已启用的无障碍服务</van-divider>
          <van-cell v-if="enabledAccessibilityServices.length==0" title="无"/>
          <van-cell v-else v-for="service in enabledAccessibilityServices" :title="service" :key="service" style="overflow:auto;">
            <template #right-icon>
              <van-button plain hairline type="primary" size="mini" style="margin-left: 0.3rem;width: 2rem;" @click="copyText(service)">复制</van-button>
            </template>
          </van-cell>
        </van-collapse-item>
      </van-collapse>
      <switch-cell title="是否使用模拟滑动" v-model="configs.useCustomScrollDown" />
      <template v-if="configs.useCustomScrollDown">
        <number-field v-model="configs.bottomHeight" label="模拟底部起始高度" label-width="8em" />
      </template>
      <switch-cell title="是否自动授权截图权限" v-model="configs.request_capture_permission" />
      <van-field v-if="configs.request_capture_permission" v-model="configs.capture_permission_button" label="确定按钮文本" type="text" placeholder="请输入确定按钮文本" input-align="right" />
      <tip-block>偶尔通过captureScreen获取截图需要等待很久，或者一直阻塞无法进行下一步操作，建议开启异步等待，然后设置截图等待时间</tip-block>
      <switch-cell title="是否异步等待截图" v-model="configs.async_waiting_capture" />
      <number-field v-if="configs.async_waiting_capture" v-model="configs.capture_waiting_time" label="获取截图超时时间" label-width="8em" placeholder="请输入超时时间" >
        <template #right-icon><span>毫秒</span></template>
      </number-field>
      <switch-cell v-if="!configs.is_pro" title="是否通话时暂停脚本" title-style="width: 10em;flex:2;" label="需要授权AutoJS获取通话状态，Pro版暂时无法使用" v-model="configs.enable_call_state_control" />
    </van-cell-group>
  </div>`
}
/**
 * 前台应用白名单
 */
const SkipPackageConfig = {
  mixins: [mixin_common],
  data () {
    return {
      newSkipRunningPackage: '',
      newSkipRunningAppName: '',
      showAddSkipRunningDialog: false,
      configs: {
        warn_skipped_ignore_package: true,
        warn_skipped_too_much: true,
        skip_running_packages: [{ packageName: 'com.tony.test', appName: 'test' }, { packageName: 'com.tony.test2', appName: 'test2' }],
      }
    }
  },
  methods: {
    addSkipPackage: function () {
      this.newSkipRunningPackage = ''
      this.newSkipRunningAppName = ''
      this.showAddSkipRunningDialog = true
    },
    doAddSkipPackage: function () {
      if (!this.isNotEmpty(this.newSkipRunningAppName)) {
        vant.Toast('请输入应用名称')
        return
      }
      if (!this.isNotEmpty(this.newSkipRunningPackage)) {
        vant.Toast('请输入应用包名')
        return
      }
      if (this.addedSkipPackageNames.indexOf(this.newSkipRunningPackage) < 0) {
        this.configs.skip_running_packages.push({ packageName: this.newSkipRunningPackage, appName: this.newSkipRunningAppName })
      }
    },
    deleteSkipPackage: function (idx) {
      this.$dialog.confirm({
        message: '确认要删除' + this.configs.skip_running_packages[idx].packageName + '吗？'
      }).then(() => {
        this.configs.skip_running_packages.splice(idx, 1)
      }).catch(() => { })
    },
    handlePackageChange: function (payload) {
      this.newSkipRunningAppName = payload.appName
      this.newSkipRunningPackage = payload.packageName
    },
  },
  computed: {
    addedSkipPackageNames: function () {
      return this.configs.skip_running_packages.map(v => v.packageName)
    }
  },
  template: `
  <div>
    <van-divider content-position="left">
      前台应用白名单设置
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addSkipPackage">增加</van-button>
    </van-divider>
    <van-cell-group>
      <switch-cell title="当前台白名单跳过次数过多时提醒" label="当白名单跳过3次之后会toast提醒，按音量下可以直接执行" title-style="width: 12em;flex:2;" v-model="configs.warn_skipped_too_much" />
      <switch-cell v-if="configs.warn_skipped_too_much" title="是否无视前台包名" title-style="width: 10em;flex:2;" label="默认情况下包名相同且重复多次时才提醒，开启后连续白名单跳过三次即提醒" v-model="configs.warn_skipped_ignore_package" />
      <div style="min-height:10rem;overflow:scroll;padding:1rem;background:#f1f1f1;">
        <van-swipe-cell v-for="(skip,idx) in configs.skip_running_packages" :key="skip.packageName" stop-propagation>
          <van-cell :title="skip.appName" :label="skip.packageName" />
          <template #right>
            <van-button square type="danger" text="删除" @click="deleteSkipPackage(idx)" style="height: 100%"/>
          </template>
        </van-swipe-cell>
      </div>
    </van-cell-group>
    <van-dialog v-model="showAddSkipRunningDialog" show-cancel-button @confirm="doAddSkipPackage" :get-container="getContainer">
      <template #title>
        <installed-package-selector @value-change="handlePackageChange" :added-package-names="addedSkipPackageNames"/>
      </template>
      <van-field v-model="newSkipRunningAppName" placeholder="请输入应用名称" label="应用名称" />
      <van-field v-model="newSkipRunningPackage" placeholder="请输入应用包名" label="应用包名" />
    </van-dialog>
  </div>`
}