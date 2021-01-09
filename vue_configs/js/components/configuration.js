/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 13:16:53
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-09 18:48:03
 * @Description: 组件代码，传统方式，方便在手机上进行修改
 */
/**
 * 基础配置
 */
Vue.component('sample-configs', function (resolve, reject) {
  resolve({
    mixins: [mixin_common],
    data: function () {
      return {
        configs: {
          password: '',
          is_alipay_locked: false,
          alipay_lock_password: '',
          bang_offset: -90,
          auto_set_bang_offset: false,
          min_floaty_color: '',
          min_floaty_text_size: '',
          min_floaty_x: '',
          min_floaty_y: '',
          not_lingering_float_window: false,
          show_debug_log: false,
          show_engine_id: false,
          save_log_file: false,
          back_size: '',
          async_save_log_file: false,
          help_friend: false,
          is_cycle: false,
          cycle_times: 10,
          never_stop: false,
          reactive_time: 60,
          max_collect_wait_time: 60,
          delayStartTime: 5,
          request_capture_permission: true,
          capture_permission_button: 'START NOW|立即开始|允许',
          enable_call_state_control: false,
          auto_set_brightness: false,
          dismiss_dialog_if_locked: true,
          check_device_posture: false,
          check_distance: false,
          posture_threshold_z: 6,
          auto_lock: false,
          hasRootPermission: false,
          lock_x: 150,
          lock_y: 970,
          timeout_unlock: 1000,
          async_waiting_capture: true,
          capture_waiting_time: 500,
          develop_mode: false,
          develop_saving_mode: false,
          cutAndSaveCountdown: false,
          cutAndSaveTreeCollect: false,
          saveBase64ImgInfo: false,
          enable_visual_helper: false
        },
        device: {
          pos_x: 0,
          pos_y: 0,
          pos_z: 0,
          distance: 0
        },
        validations: {
          min_floaty_color: {
            validate: (v) => /^#[\dabcdef]{6}$/i.test(v),
            message: () => '颜色值格式不正确'
          },
          posture_threshold_z: {
            validate: v => {
              if (v === undefined || v === '') {
                return true
              }
              let value = parseInt(v)
              return value > 0 && value < 9
            },
            message: () => '请输入一个介于0-9的数字，推荐4-7之间'
          },
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
                    return '请输入一个正整数'
                  }
                }
              }
              return ''
            }
          }
        }
      }
    },
    methods: {
      saveConfigs: function () {
        console.log('save basic configs')
        if (this.configs.min_floaty_color && this.computedFloatyTextColor === '') {
          this.configs.min_floaty_color = ''
        }
        this.doSaveConfigs()
      },
      gravitySensorChange: function (data) {
        this.device.pos_x = data.x
        this.device.pos_y = data.y
        this.device.pos_z = data.z
      },
      distanceSensorChange: function (data) {
        this.device.distance = data.distance
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
    filters: {
      toFixed3: function (v) {
        if (v) {
          return v.toFixed(3)
        }
        return v
      }
    },
    mounted () {
      $app.registerFunction('saveBasicConfigs', this.saveConfigs)
      $app.registerFunction('gravitySensorChange', this.gravitySensorChange)
      $app.registerFunction('distanceSensorChange', this.distanceSensorChange)
      $app.registerFunction('reloadBasicConfigs', this.loadConfigs)
    },
    template: '<div>\
      <van-divider content-position="left">收集配置</van-divider>\
      <van-cell-group>\
        <switch-cell title="是否帮助收取" label="帮助收取会发送好友消息，容易打扰别人，不建议开启" title-style="flex:3.5;" v-model="configs.help_friend" />\
        <switch-cell title="是否循环" v-model="configs.is_cycle" />\
        <number-field v-if="configs.is_cycle" v-model="configs.cycle_times" label="循环次数" placeholder="请输入单次运行循环次数" />\
        <switch-cell title="是否永不停止" v-model="configs.never_stop" />\
        <template  v-if="configs.never_stop">\
          <tip-block>永不停止模式请不要全天24小时运行，具体见README</tip-block>\
          <tip-block>重新激活时间可以选择随机范围，按如下格式输入即可：30-40。{{reactiveTimeDisplay}}</tip-block>\
          <van-field v-model="configs.reactive_time" :error-message="validationError.reactive_time" error-message-align="right" label="重新激活时间" type="text" placeholder="请输入永不停止的循环间隔" input-align="right" >\
            <template #right-icon><span>分</span></template>\
          </van-field>\
        </template>\
        <template v-if="!configs.never_stop && !configs.is_cycle">\
          <tip-block>如果你想要脚本只执行一次，可以将计时模式最大等待时间设置为0</tip-block>\
          <number-field v-model="configs.max_collect_wait_time" label="计时模式最大等待时间" label-width="10em" placeholder="请输入最大等待时间" >\
            <template #right-icon><span>分</span></template>\
          </number-field>\
        </template>\
        <number-field v-model="configs.delayStartTime" label="延迟启动时间" label-width="10em" placeholder="请输入延迟启动时间" >\
          <template #right-icon><span>秒</span></template>\
        </number-field>\
        <switch-cell title="是否自动授权截图权限" v-model="configs.request_capture_permission" />\
        <van-field v-if="configs.request_capture_permission" v-model="configs.capture_permission_button" label="确定按钮文本" type="text" placeholder="请输入确定按钮文本" input-align="right" />\
        <tip-block>偶尔通过captureScreen获取截图需要等待很久，或者一直阻塞无法进行下一步操作，建议开启异步等待，然后设置截图等待时间</tip-block>\
        <switch-cell title="是否异步等待截图" v-model="configs.async_waiting_capture" />\
        <number-field v-if="configs.async_waiting_capture" v-model="configs.capture_waiting_time" label="获取截图超时时间" label-width="8em" placeholder="请输入超时时间" >\
          <template #right-icon><span>毫秒</span></template>\
        </number-field>\
        <switch-cell title="是否通话时暂停脚本" title-style="width: 10em;flex:2;" label="需要授权AutoJS获取通话状态，Pro版暂时无法使用" v-model="configs.enable_call_state_control" />\
      </van-cell-group>\
      <van-divider content-position="left">锁屏相关</van-divider>\
      <van-cell-group>\
        <van-field v-model="configs.password" label="锁屏密码" type="password" placeholder="请输入锁屏密码" input-align="right" />\
        <number-field v-model="configs.timeout_unlock" label="解锁超时时间" placeholder="请输入解锁超时时间">\
          <template #right-icon><span>毫秒</span></template>\
        </number-field>\
        <switch-cell title="支付宝是否锁定" v-model="configs.is_alipay_locked" />\
        <van-field v-if="configs.is_alipay_locked" v-model="configs.alipay_lock_password" label="手势密码" placeholder="请输入手势密码对应的九宫格数字" type="password" input-align="right" />\
        <switch-cell title="锁屏启动设置最低亮度" v-model="configs.auto_set_brightness" />\
        <switch-cell title="锁屏启动关闭弹窗提示" v-model="configs.dismiss_dialog_if_locked" />\
        <switch-cell title="锁屏启动时检测设备传感器" label="检测是否在裤兜内，防止误触" v-model="configs.check_device_posture" />\
        <template  v-if="configs.check_device_posture">\
          <switch-cell title="同时校验距离传感器" label="部分设备数值不准默认关闭" v-model="configs.check_distance" />\
          <tip-block>z轴重力加速度阈值（绝对值小于该值时判定为在兜里）</tip-block>\
          <tip-block>x: {{device.pos_x | toFixed3}} y: {{device.pos_y | toFixed3}} z: {{device.pos_z | toFixed3}} 距离传感器：{{device.distance}}</tip-block>\
          <number-field v-if="configs.check_device_posture" v-model="configs.posture_threshold_z" error-message-align="right" :error-message="validationError.posture_threshold_z" label="加速度阈值" placeholder="请输入加速度阈值" />\
        </template>\
        <switch-cell title="自动锁屏" label="脚本执行完毕后自动锁定屏幕" v-model="configs.auto_lock" />\
        <template v-if="configs.auto_lock && !configs.hasRootPermission">\
          <tip-block>自动锁屏功能默认仅支持MIUI12，其他系统需要自行扩展实现：extends/LockScreen.js</tip-block>\
          <number-field v-model="configs.lock_x" label="横坐标位置" placeholder="请输入横坐标位置" />\
          <number-field v-model="configs.lock_y" label="纵坐标位置" placeholder="请输入纵坐标位置" />\
        </template>\
      </van-cell-group>\
      <van-divider content-position="left">悬浮窗配置</van-divider>\
      <van-cell-group>\
        <swipe-color-input-field label="悬浮窗颜色" :error-message="validationError.min_floaty_color" v-model="configs.min_floaty_color" placeholder="悬浮窗颜色值 #FFFFFF"/>\
        <number-field v-model="configs.min_floaty_text_size" label-width="8em" label="悬浮窗字体大小" placeholder="请输入悬浮窗字体大小" >\
          <template #right-icon><span>sp</span></template>\
        </number-field>\
        <number-field v-model="configs.min_floaty_x" label="悬浮窗位置X" placeholder="请输入悬浮窗横坐标位置" />\
        <number-field v-model="configs.min_floaty_y" label="悬浮窗位置Y" placeholder="请输入悬浮窗纵坐标位置" />\
        <tip-block>刘海屏或者挖孔屏悬浮窗显示位置和实际目测位置不同，需要施加一个偏移量，一般是负值，脚本运行时会自动设置</tip-block>\
        <switch-cell title="下次执行时重新识别" v-model="configs.auto_set_bang_offset" />\
        <van-cell center title="当前偏移量">\
          <span>{{configs.auto_set_bang_offset ? "下次执行时重新识别": configs.bang_offset}}</span>\
        </van-cell>\
        <switch-cell title="不驻留前台" label="是否在脚本执行完成后不驻留前台，关闭倒计时悬浮窗" title-style="flex:3;" v-model="configs.not_lingering_float_window" />\
      </van-cell-group>\
      <van-divider content-position="left">日志配置</van-divider>\
      <van-cell-group>\
        <switch-cell title="是否显示debug日志" v-model="configs.show_debug_log" />\
        <switch-cell title="是否显示脚本引擎id" v-model="configs.show_engine_id" />\
        <switch-cell title="是否保存日志到文件" v-model="configs.save_log_file" />\
        <number-field v-if="configs.save_log_file" v-model="configs.back_size" label="日志文件滚动大小" label-width="8em" placeholder="请输入单个文件最大大小" >\
          <template #right-icon><span>KB</span></template>\
        </number-field>\
        <switch-cell title="是否异步保存日志到文件" v-model="configs.async_save_log_file" />\
      </van-cell-group>\
      <van-divider content-position="left">开发模式配置</van-divider>\
      <van-cell-group>\
        <switch-cell title="是否启用开发模式" v-model="configs.develop_mode" />\
        <template v-if="configs.develop_mode">\
          <tip-block>脚本执行时保存图片等数据，未启用开发模式时依旧有效，请不要随意开启。部分功能需要下载master分支才能使用，release分支代码开启后可能无法正常运行</tip-block>\
          <switch-cell title="是否保存倒计时图片" v-model="configs.cutAndSaveCountdown" />\
          <switch-cell title="是否保存可收取能量球图片" v-model="configs.cutAndSaveTreeCollect" />\
          <switch-cell title="是否保存一些开发用的数据" v-model="configs.develop_saving_mode" />\
          <switch-cell title="是否倒计时图片base64" v-model="configs.saveBase64ImgInfo" />\
          <switch-cell title="是否启用可视化辅助工具" v-model="configs.enable_visual_helper" />\
        </template>\
      </van-cell-group>\
    </div>'
  })
})

/**
 * 进阶配置
 */
Vue.component('advance-configs', function (resolve, reject) {
  resolve({
    mixins: [mixin_common],
    data: function () {
      return {
        mounted: false,
        hough_config: false,
        ocr_invoke_count: '',
        showTargetWateringAmount: false,
        wateringAmountColumns: [10, 18, 33, 66],
        showAddWhiteDialog: false,
        showAddWateringBlackDialog: false,
        showAddSkipRunningDialog: false,
        newWhite: '',
        newBlack: '',
        newSkipRunningPackage: '',
        newSkipRunningAppName: '',
        configs: {
          // 排行榜校验区域
          rank_check_left: null,
          rank_check_top: null,
          rank_check_width: null,
          rank_check_height: null,
          // 能量球所在范围
          auto_detect_tree_collect_region: true,
          tree_collect_left: null,
          tree_collect_top: null,
          tree_collect_width: null,
          tree_collect_height: null,
          // 底部校验区域
          bottom_check_left: 200,
          bottom_check_top: 200,
          bottom_check_width: 20,
          bottom_check_height: 20,
          bottom_check_gray_color: '#999999',
          // 逛一逛按钮区域
          stroll_button_left: null,
          stroll_button_top: null,
          stroll_button_width: null,
          stroll_button_height: null,
          single_script: false,
          auto_restart_when_crashed: true,
          collect_self_only: false,
          not_collect_self: false,
          recheck_rank_list: true,
          try_collect_by_stroll: true,
          collect_by_stroll_only: false,
          stroll_button_regenerate: true,
          limit_runnable_time_range: true,
          use_double_click_card: false,
          useCustomScrollDown: true,
          scrollDownSpeed: null,
          bottomHeight: null,
          wateringBack: true,
          wateringThreshold: null,
          targetWateringAmount: null,
          wateringBlackList: [],
          useOcr: false,
          useTesseracOcr: true,
          ocrThreshold: null,
          autoSetThreshold: true,
          saveBase64ImgInfo: false,
          apiKey: '',
          secretKey: '',
          try_collect_by_multi_touch: false,
          skip_own_watering_ball: false,
          hough_param1: null,
          hough_param2: null,
          hough_min_radius: null,
          hough_max_radius: null,
          hough_min_dst: null,
          stroll_button_region: '',
          rank_check_region: '',
          bottom_check_region: '',
          tree_collect_region: '',
          checkBottomBaseImg: true,
          friendListScrollTime: null,
          white_list: ['1', '2', '3'],
          thread_pool_size: '',
          thread_pool_max_size: '',
          thread_pool_queue_size: '',
          thread_pool_waiting_time: '',
          skip_running_packages: [{ packageName: 'com.tony.test', appName: 'test' }, { packageName: 'com.tony.test2', appName: 'test2' }],
          check_finger_by_pixels_amount: false,
          finger_img_pixels: 1800
        },
        validations: {
          stroll_button_region: {
            validate: v => /^(([^0](\d+)|(\d)\s*)\s*,){3}([^0](\d+)|(\d)\s*)\s*$/.test(v),
            message: () => '区域格式不正确'
          },
          rank_check_region: {
            validate: v => /^(([^0](\d+)|(\d)\s*)\s*,){3}([^0](\d+)|(\d)\s*)\s*$/.test(v),
            message: () => '区域格式不正确'
          },
          bottom_check_region: {
            validate: v => /^(([^0](\d+)|(\d)\s*)\s*,){3}([^0](\d+)|(\d)\s*)\s*$/.test(v),
            message: () => '区域格式不正确'
          },
          tree_collect_region: {
            validate: v => /^(([^0](\d+)|(\d)\s*)\s*,){3}([^0](\d+)|(\d)\s*)\s*$/.test(v),
            message: () => '区域格式不正确'
          },
          bottom_check_gray_color: {
            validate: (v) => /^#[\dabcdef]{6}$/i.test(v),
            message: () => '颜色值格式不正确'
          },
        }
      }
    },
    methods: {
      loadConfigs: function () {
        // 浏览器测试时使用
        this.configs.stroll_button_region = this.configs.stroll_button_left + ',' + this.configs.stroll_button_top + ',' + this.configs.stroll_button_width + ',' + this.configs.stroll_button_height
        this.configs.rank_check_region = this.configs.rank_check_left + ',' + this.configs.rank_check_top + ',' + this.configs.rank_check_width + ',' + this.configs.rank_check_height
        this.configs.bottom_check_region = this.configs.bottom_check_left + ',' + this.configs.bottom_check_top + ',' + this.configs.bottom_check_width + ',' + this.configs.bottom_check_height
        this.configs.tree_collect_region = this.configs.tree_collect_left + ',' + this.configs.tree_collect_top + ',' + this.configs.tree_collect_width + ',' + this.configs.tree_collect_height

        $app.invoke('loadConfigs', {}, config => {
          Object.keys(this.configs).forEach(key => {
            console.log('child load config key:[' + key + '] value: [' + config[key] + ']')
            this.$set(this.configs, key, config[key])
          })
          this.configs.stroll_button_region = this.configs.stroll_button_left + ',' + this.configs.stroll_button_top + ',' + this.configs.stroll_button_width + ',' + this.configs.stroll_button_height
          this.configs.rank_check_region = this.configs.rank_check_left + ',' + this.configs.rank_check_top + ',' + this.configs.rank_check_width + ',' + this.configs.rank_check_height
          this.configs.bottom_check_region = this.configs.bottom_check_left + ',' + this.configs.bottom_check_top + ',' + this.configs.bottom_check_width + ',' + this.configs.bottom_check_height
          this.configs.tree_collect_region = this.configs.tree_collect_left + ',' + this.configs.tree_collect_top + ',' + this.configs.tree_collect_width + ',' + this.configs.tree_collect_height
          if (this.configs.skip_running_packages && this.configs.skip_running_packages.length > 0) {
            if (!this.configs.skip_running_packages[0].packageName) {
              this.configs.skip_running_packages = []
            }
          }
          this.mounted = true
        })
      },
      isNotEmpty: function (v) {
        return !(typeof v === 'undefined' || v === null || v === '')
      },
      saveConfigs: function () {
        console.log('save advnace configs')
        this.doSaveConfigs(['stroll_button_region', 'rank_check_region', 'bottom_check_region', 'tree_collect_region'])
      },
      updateOcrInvokeCount: function (data) {
        this.ocr_invoke_count = data
      },
      selectedTargetAmount: function (val) {
        console.log(val)
        if (parseInt(val) > this.configs.wateringThreshold) {
          this.$toast('回馈数量大于浇水阈值，请重新选择')
        } else {
          this.showTargetWateringAmount = false
          this.configs.targetWateringAmount = val
        }
      },
      addWhite: function () {
        this.newWhite = ''
        this.showAddWhiteDialog = true
      },
      doAddWhite: function () {
        if (this.isNotEmpty(this.newWhite) && this.configs.white_list.indexOf(this.newWhite) < 0) {
          this.configs.white_list.push(this.newWhite)
        }
      },
      deleteWhite: function (idx) {
        this.$dialog.confirm({
          message: '确认要删除' + this.configs.white_list[idx] + '吗？'
        }).then(() => {
          this.configs.white_list.splice(idx, 1)
        }).catch(() => { })
      },
      addBlack: function () {
        this.newBlack = ''
        this.showAddWateringBlackDialog = true
      },
      doAddBlack: function () {
        if (this.isNotEmpty(this.newBlack) && this.configs.wateringBlackList.indexOf(this.newBlack) < 0) {
          this.configs.wateringBlackList.push(this.newBlack)
        }
      },
      deleteWaterBlack: function (idx) {
        this.$dialog.confirm({
          message: '确认要删除' + this.configs.wateringBlackList[idx] + '吗？'
        }).then(() => {
          this.configs.wateringBlackList.splice(idx, 1)
        }).catch(() => { })
      },
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
      showRealVisual: function () {
        $app.invoke('showRealtimeVisualConfig', {})
      },
      handlePackageChange: function (payload) {
        this.newSkipRunningAppName = payload.appName
        this.newSkipRunningPackage = payload.packageName
      }
    },
    computed: {
      strollButtonRegion: function () {
        return this.configs.stroll_button_region
      },
      rankCheckRegion: function () {
        return this.configs.rank_check_region
      },
      bottomCheckRegion: function () {
        return this.configs.bottom_check_region
      },
      treeCollectRegion: function () {
        return this.configs.tree_collect_region
      },
      visualConfigs: function () {
        return {
          // 排行榜校验区域
          rank_check_left: this.configs.rank_check_left,
          rank_check_top: this.configs.rank_check_top,
          rank_check_width: this.configs.rank_check_width,
          rank_check_height: this.configs.rank_check_height,
          // 能量球所在范围
          tree_collect_left: this.configs.tree_collect_left,
          tree_collect_top: this.configs.tree_collect_top,
          tree_collect_width: this.configs.tree_collect_width,
          tree_collect_height: this.configs.tree_collect_height,
          // 底部校验区域
          bottom_check_left: this.configs.bottom_check_left,
          bottom_check_top: this.configs.bottom_check_top,
          bottom_check_width: this.configs.bottom_check_width,
          bottom_check_height: this.configs.bottom_check_height,
          // 逛一逛按钮区域
          stroll_button_left: this.configs.stroll_button_left,
          stroll_button_top: this.configs.stroll_button_top,
          stroll_button_width: this.configs.stroll_button_width,
          stroll_button_height: this.configs.stroll_button_height,
        }
      },
      addedSkipPackageNames: function () {
        return this.configs.skip_running_packages.map(v => v.packageName)
      }
    },
    watch: {
      strollButtonRegion: function () {
        if (this.mounted && this.validations.stroll_button_region.validate(this.strollButtonRegion)) {
          let match = /^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/.exec(this.strollButtonRegion)
          this.configs.stroll_button_left = parseInt(match[1])
          this.configs.stroll_button_top = parseInt(match[2])
          this.configs.stroll_button_width = parseInt(match[3])
          this.configs.stroll_button_height = parseInt(match[4])
        }
      },
      rankCheckRegion: function () {
        if (this.mounted && this.validations.rank_check_region.validate(this.rankCheckRegion)) {
          let match = /^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/.exec(this.rankCheckRegion)
          this.configs.rank_check_left = parseInt(match[1])
          this.configs.rank_check_top = parseInt(match[2])
          this.configs.rank_check_width = parseInt(match[3])
          this.configs.rank_check_height = parseInt(match[4])
        }
      },
      bottomCheckRegion: function () {
        if (this.mounted && this.validations.bottom_check_region.validate(this.bottomCheckRegion)) {
          let match = /^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/.exec(this.bottomCheckRegion)
          this.configs.bottom_check_left = parseInt(match[1])
          this.configs.bottom_check_top = parseInt(match[2])
          this.configs.bottom_check_width = parseInt(match[3])
          this.configs.bottom_check_height = parseInt(match[4])
        }
      },
      treeCollectRegion: function () {
        if (this.mounted && this.validations.tree_collect_region.validate(this.treeCollectRegion)) {
          let match = /^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/.exec(this.treeCollectRegion)
          this.configs.tree_collect_left = parseInt(match[1])
          this.configs.tree_collect_top = parseInt(match[2])
          this.configs.tree_collect_width = parseInt(match[3])
          this.configs.tree_collect_height = parseInt(match[4])
        }
      },
      // 变更区域信息，用于实时展示
      visualConfigs: {
        handler: function (v) {
          console.log('区域信息变更 触发消息')
          $app.invoke('saveConfigs', v)
        },
        deep: true
      }
    },
    mounted () {
      $app.registerFunction('saveAdvanceConfigs', this.saveConfigs)
      $app.registerFunction('ocr_invoke_count', this.updateOcrInvokeCount)
      $app.registerFunction('reloadAdvanceConfigs', this.loadConfigs)
      // this.loadConfigs()
    },
    template: '<div>\
      <van-cell-group>\
        <tip-block>当需要使用多个脚本时不要勾选（如同时使用我写的蚂蚁庄园脚本），避免抢占前台</tip-block>\
        <switch-cell title="是否单脚本运行" v-model="configs.single_script" />\
        <tip-block>AutoJS有时候会莫名其妙的崩溃，但是授权了自启动权限之后又会自动启动。开启该选项之后会创建一个广播事件的定时任务，\
          当脚本执行过程中AutoJS崩溃自启，将重新开始执行脚本。如果脚本执行完毕，则不会触发执行</tip-block>\
        <switch-cell title="AutoJS崩溃自启后重启脚本" v-model="configs.auto_restart_when_crashed" />\
        <switch-cell title="只收自己的能量" v-model="configs.collect_self_only" />\
        <switch-cell title="不收自己的能量" v-model="configs.not_collect_self" />\
        <switch-cell title="是否在收集或帮助后重新检查排行榜" title-style="flex:2;" v-model="configs.recheck_rank_list" />\
        <switch-cell title="是否使用能量双击卡" v-model="configs.use_double_click_card" />\
        <switch-cell title="是否限制0:30-6:50不可运行" title-style="flex:2;" v-model="configs.limit_runnable_time_range" />\
        <switch-cell title="是否通过逛一逛收集能量" v-model="configs.try_collect_by_stroll" />\
        <template v-if="configs.try_collect_by_stroll">\
          <region-input-field v-if="!configs.stroll_button_regenerate"\
            :device-height="device.height" :device-width="device.width"\
            :error-message="validationError.stroll_button_region"\
            v-model="configs.stroll_button_region" label="逛一逛按钮区域" label-width="10em" />\
          <van-field :readonly="true" v-else value="下次运行时重新识别" label="逛一逛按钮区域" label-width="10em" type="text" input-align="right" />\
          <switch-cell title="下次运行时重新识别" v-model="configs.stroll_button_regenerate" />\
          <tip-block>开启仅识别倒计时可以仅通过逛一逛收取，排行榜中只识别倒计时信息不识别帮收和可收取，能够避免重复进入白名单或者保护罩好友页面，\
            但是也有一定几率会漏收倒计时刚刚结束的能量，请酌情选择是否开启</tip-block>\
          <switch-cell title="排行榜中仅识别倒计时" v-model="configs.collect_by_stroll_only" />\
        </template>\
        <switch-cell title="是否使用模拟滑动" v-model="configs.useCustomScrollDown" />\
        <template v-if="configs.useCustomScrollDown">\
          <number-field v-model="configs.scrollDownSpeed" label="模拟滑动速度" label-width="8em" />\
          <number-field v-model="configs.bottomHeight" label="模拟底部起始高度" label-width="8em" />\
        </template>\
      </van-cell-group>\
      <van-divider content-position="left">\
        图像分析相关\
        <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="showRealVisual">实时查看区域配置</van-button>\
      </van-divider>\
      <van-cell-group>\
        <switch-cell title="跳过好友浇水能量球" label="开启后自己手动收取" v-model="configs.skip_own_watering_ball" />\
        <region-input-field v-if="!configs.auto_detect_tree_collect_region"\
          :device-height="device.height" :device-width="device.width"\
          :error-message="validationError.tree_collect_region"\
          v-model="configs.tree_collect_region" label="能量球所在区域" label-width="10em" />\
        <van-field :readonly="true" v-else value="下次运行时重新识别" label="能量球所在区域" label-width="10em" type="text" input-align="right" />\
        <switch-cell title="下次运行时重新识别" v-model="configs.auto_detect_tree_collect_region" />\
        <switch-cell title="霍夫变换进阶配置" label="如非必要请不要随意修改" v-model="hough_config" />\
        <template v-if="hough_config">\
          <number-field v-model="configs.hough_param1" label="param1" placeholder="留空使用默认配置" label-width="8em" />\
          <number-field v-model="configs.hough_param2" label="param2" placeholder="留空使用默认配置" label-width="8em" />\
          <number-field v-model="configs.hough_min_radius" label="最小球半径" placeholder="留空使用默认配置" label-width="8em" />\
          <number-field v-model="configs.hough_max_radius" label="最大球半径" placeholder="留空使用默认配置" label-width="8em" />\
          <number-field v-model="configs.hough_min_dst" label="球心最小距离" placeholder="留空使用默认配置" label-width="8em" />\
        </template>\
        <region-input-field\
            :device-height="device.height" :device-width="device.width"\
            :error-message="validationError.rank_check_region"\
            v-model="configs.rank_check_region" label="排行榜校验区域" label-width="10em" />\
        <switch-cell title="基于图像判断列表底部" v-model="configs.checkBottomBaseImg" />\
        <template v-if="configs.checkBottomBaseImg">\
          <region-input-field\
            :device-height="device.height" :device-width="device.width"\
            :error-message="validationError.bottom_check_region"\
            v-model="configs.bottom_check_region" label="底部校验区域" label-width="10em" />\
          <color-input-field label="底部判断的灰度颜色值" label-width="10em" \
            placeholder="可收取颜色值 #FFFFFF" :error-message="validationError.bottom_check_gray_color" v-model="configs.bottom_check_gray_color"/>\
        </template>\
        <template v-else>\
          <tip-block>排行榜下拉的最大次数，使得所有数据都加载完，如果基于图像判断无效只能如此</tip-block>\
          <van-field v-model="configs.friendListScrollTime" label="排行榜下拉次数" label-width="10em" type="text" placeholder="请输入排行榜下拉次数" input-align="right" />\
        </template>\
        <tip-block>默认使用多点找色方式识别列表中的小手，失效后请打开基于像素点个数判断是否可收取，这是一个阈值当像素点个数小于给定的值之后就判定为可收取</tip-block>\
        <switch-cell title="基于像素点个数判断是否可收取" title-style="flex:2;" v-model="configs.check_finger_by_pixels_amount" />\
        <number-field v-if="configs.check_finger_by_pixels_amount" v-model="configs.finger_img_pixels" label="小手像素点个数" placeholder="小手像素点个数" label-width="8em" />\
        <tip-block>图像识别的线程池配置，如果过于卡顿，请调低线程池大小，同时增加线程池等待时间。</tip-block>\
        <number-field v-model="configs.thread_pool_size" label="线程池大小" placeholder="留空使用默认配置" label-width="8em" />\
        <number-field v-model="configs.thread_pool_max_size" label="线程池最大大小" placeholder="留空使用默认配置" label-width="8em" />\
        <number-field v-model="configs.thread_pool_queue_size" label="线程池等待队列大小" label-width="10em" placeholder="留空使用默认配置" />\
        <number-field v-model="configs.thread_pool_waiting_time" label="线程池等待时间" placeholder="留空使用默认配置" label-width="8em" >\
          <template #right-icon><span>秒</span></template>\
        </number-field>\
        <van-divider/>\
        <tip-block>当不启用以下任意一种OCR的时候会使用多点找色方式模拟识别倒计时，如果模拟识别不准确时可以看情况选择其中一种OCR方式</tip-block>\
        <tip-block v-if="configs.useTesseracOcr || configs.useOcr">{{ocr_invoke_count}}</tip-block>\
        <switch-cell title="是否启用自建OCR服务器识别倒计时" label="服务器到期时间2021-12-09" title-style="flex:2;" v-model="configs.useTesseracOcr" />\
        <switch-cell title="是否启用百度OCR倒计时" v-model="configs.useOcr" />\
        <template v-if="!configs.useTesseracOcr && configs.useOcr">\
          <tip-block>请填写百度AI平台申请的API_KEY和SECRET_KEY</tip-block>\
          <van-field v-model="configs.apiKey" label="" placeholder="apiKey" label-width="8em" type="text" input-align="right" />\
          <van-field v-model="configs.secretKey" label="" placeholder="secretKey" label-width="8em" type="password" input-align="right" />\
        </template>\
      </van-cell-group>\
      <van-divider content-position="left">\
        白名单设置\
        <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addWhite">增加</van-button>\
      </van-divider>\
      <van-cell-group>\
        <div style="max-height:10rem;overflow:scroll;padding:1rem;background:#f1f1f1;">\
        <van-swipe-cell v-for="(white,idx) in configs.white_list" :key="white" stop-propagation>\
          <van-cell :title="white" />\
          <template #right>\
            <van-button square type="danger" text="删除" @click="deleteWhite(idx)" />\
          </template>\
        </van-swipe-cell>\
        </div>\
      </van-cell-group>\
      <van-divider content-position="left">浇水设置</van-divider>\
      <van-cell-group>\
        <switch-cell title="是否浇水回馈" v-model="configs.wateringBack" />\
        <template v-if="configs.wateringBack">\
          <van-field v-model="configs.wateringThreshold" label="浇水阈值" placeholder="请输入浇水阈值" label-width="8em" type="text" input-align="right" />\
          <van-cell center title="浇水回馈数量" :value="configs.targetWateringAmount" @click="showTargetWateringAmount=true" />\
          <van-popup v-model="showTargetWateringAmount" position="bottom" :style="{ height: \'30%\' }">\
            <van-picker show-toolbar title="浇水数量" :columns="wateringAmountColumns" :default-index="0" @confirm="selectedTargetAmount" />\
          </van-popup>\
          <van-divider content-position="left">\
            浇水黑名单设置\
            <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addBlack">增加</van-button>\
          </van-divider>\
          <van-cell-group>\
            <div style="max-height:10rem;overflow:scroll;padding:1rem;background:#f1f1f1;">\
            <van-swipe-cell v-for="(black,idx) in configs.wateringBlackList" :key="black" stop-propagation>\
              <van-cell :title="black" />\
              <template #right>\
                <van-button square type="danger" text="删除" @click="deleteWaterBlack(idx)" />\
              </template>\
            </van-swipe-cell>\
            </div>\
          </van-cell-group>\
        </template>\
      </van-cell-group>\
      <van-divider content-position="left">\
        前台应用白名单设置\
        <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addSkipPackage">增加</van-button>\
      </van-divider>\
      <van-cell-group>\
        <div style="max-height:10rem;overflow:scroll;padding:1rem;background:#f1f1f1;">\
        <van-swipe-cell v-for="(skip,idx) in configs.skip_running_packages" :key="skip.packageName" stop-propagation>\
          <van-cell :title="skip.appName" :label="skip.packageName" />\
          <template #right>\
            <van-button square type="danger" text="删除" @click="deleteSkipPackage(idx)" style="height: 100%"/>\
          </template>\
        </van-swipe-cell>\
        </div>\
      </van-cell-group>\
      <van-dialog v-model="showAddWhiteDialog" title="增加白名单" show-cancel-button @confirm="doAddWhite" :get-container="getContainer">\
        <van-field v-model="newWhite" placeholder="请输入好友昵称" label="好友昵称" />\
      </van-dialog>\
      <van-dialog v-model="showAddWateringBlackDialog" title="增加浇水黑名单" show-cancel-button @confirm="doAddBlack" :get-container="getContainer">\
        <van-field v-model="newBlack" placeholder="请输入好友昵称" label="好友昵称" />\
      </van-dialog>\
      <van-dialog v-model="showAddSkipRunningDialog" show-cancel-button @confirm="doAddSkipPackage" :get-container="getContainer">\
        <template #title>\
          <installed-package-selector @value-change="handlePackageChange" :added-package-names="addedSkipPackageNames"/>\
        </template>\
        <van-field v-model="newSkipRunningAppName" placeholder="请输入应用名称" label="应用名称" />\
        <van-field v-model="newSkipRunningPackage" placeholder="请输入应用包名" label="应用包名" />\
      </van-dialog>\
    </div>'
  })
})

/**
 * 控件配置
 */
Vue.component('widget-configs', function (resolve, reject) {
  resolve({
    mixins: [mixin_common],
    data: function () {
      return {
        configs: {
          my_id: '',
          home_ui_content: '查看更多动态.*',
          friend_home_check_regex: '你收取TA|TA收取你',
          friend_name_getting_regex: '(.*)的蚂蚁森林',
          enter_friend_list_ui_content: '查看更多好友',
          stroll_end_ui_content: '返回我的森林',
          no_more_ui_content: '没有更多了',
          load_more_ui_content: '查看更多',
          do_watering_button_content: '送给\\s*TA|浇水送祝福',
          using_protect_content: '使用了保护罩',
          collectable_energy_ball_content: '收集能量\\d+克',
          can_collect_color_gray: '#828282',
          can_help_color: '#f99236',
          help_and_notify: '知道了.*去提醒',
          collectable_lower: '#a5c600',
          collectable_upper: '#ffff5d',
          helpable_lower: '#6f0028',
          helpable_upper: '#ffb2b2',
          valid_collectable_lower: '#77cc00',
          valid_collectable_upper: '#ffff91',
          timeout_findOne: 1000,
          timeout_existing: 8000,
        },
        validations: {
          can_collect_color_gray: {
            validate: (v) => /^#[\dabcdef]{6}$/i.test(v),
            message: () => '颜色值格式不正确'
          },
          can_help_color: {
            validate: (v) => /^#[\dabcdef]{6}$/i.test(v),
            message: () => '颜色值格式不正确'
          },
        }
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
    template: '<div>\
      <tip-block>一般情况下不需要修改这一块的配置，除非你的支付宝是英文的</tip-block>\
      <tip-block>我的ID主要用来准确获取当前收集的能量数据，可不配置</tip-block>\
      <van-field v-model="configs.my_id" label="我的ID" type="text" placeholder="" input-align="right" />\
      <van-field v-model="configs.home_ui_content" label="个人首页" type="text" placeholder="请输入个人首页控件文本" input-align="right" />\
      <van-field v-model="configs.friend_home_check_regex" label="判断是否好友首页" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field v-model="configs.friend_name_getting_regex" label="好友名称正则表达式" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field v-model="configs.enter_friend_list_ui_content" label="查看更多好友按钮" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field v-model="configs.stroll_end_ui_content" label="逛一逛结束文本" label-width="10em" type="text" placeholder="逛一逛结束文本" input-align="right" />\
      <van-field v-model="configs.using_protect_content" label="保护罩使用记录" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field v-model="configs.help_and_notify" label="帮助收取，提醒按钮" label-width="10em" type="text" placeholder="请输入提醒按钮控件文本" input-align="right" />\
      <van-field v-model="configs.do_watering_button_content" label="确认浇水按钮" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <color-input-field label="列表中可收取的颜色灰度值" label-width="10em" \
              placeholder="可收取颜色值 #FFFFFF" :error-message="validationError.can_collect_color_gray" v-model="configs.can_collect_color_gray"/>\
      <color-input-field label="列表中可帮助的颜色" label-width="10em" \
              placeholder="可帮助颜色值 #FFFFFF" :error-message="validationError.can_help_color" v-model="configs.can_help_color"/>\
      <number-field v-model="configs.timeout_findOne" label="查找控件超时时间" label-width="8em" placeholder="请输入超时时间">\
        <template #right-icon><span>毫秒</span></template>\
      </number-field>\
      <number-field v-model="configs.timeout_existing" label="校验控件是否存在超时时间" label-width="12em" placeholder="请输入超时时间" >\
        <template #right-icon><span>毫秒</span></template>\
      </number-field>\
      <tip-block>以下配置为执行优化使用，尽量不要修改除非出问题了</tip-block>\
      <color-input-field label="可收取颜色值起始值" label-width="10em" placeholder="颜色值 #FFFFFF" v-model="configs.collectable_lower"/>\
      <color-input-field label="可收取颜色值结束值" label-width="10em" placeholder="颜色值 #FFFFFF" v-model="configs.collectable_upper"/>\
      <color-input-field label="可帮助颜色值起始值" label-width="10em" placeholder="颜色值 #FFFFFF" v-model="configs.helpable_lower"/>\
      <color-input-field label="可帮助颜色值结束值" label-width="10em" placeholder="颜色值 #FFFFFF" v-model="configs.helpable_upper"/>\
      <color-input-field label="有效球颜色值起始值" label-width="10em" placeholder="颜色值 #FFFFFF" v-model="configs.valid_collectable_lower"/>\
      <color-input-field label="有效球颜色值结束值" label-width="10em" placeholder="颜色值 #FFFFFF" v-model="configs.valid_collectable_upper"/>\
    </div>'
  })
})