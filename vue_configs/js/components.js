/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 13:16:53
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-30 00:21:25
 * @Description: 
 */
let mixin_common = {
  data: function () {
    return {
      switchSize: '1.24rem',
      tipTextSize: '0.7rem'
    }
  },
  methods: {
    loadConfigs: function () {
      $app.invoke('loadConfigs', {}, config => {
        Object.keys(this.configs).forEach(key => {
          console.log('load config key:[' + key + '] value: [' + config[key] + ']')
          this.$set(this.configs, key, config[key])
        })
      })
    },
    isNotEmpty: function (v) {
      return !(typeof v === 'undefined' || v === null || v === '')
    },
    doSaveConfigs: function (deleteFields) {
      console.log('执行保存配置')
      let newConfigs = {}
      Object.assign(newConfigs, this.configs)
      let errorFields = Object.keys(this.validationError)
      errorFields.forEach(key => {
        if (this.isNotEmpty(this.validationError[key])) {
          newConfigs[key] = ''
        }
      })
      if (deleteFields && deleteFields.length > 0) {
        deleteFields.forEach(key => {
          newConfigs[key] = ''
        })
      }
      $app.invoke('saveConfigs', newConfigs)
    },
    formatterSeconds: function (v) {
      if (v) {
        return v + '秒'
      }
      return ''
    },
    formatterMills: function (v) {
      if (v) {
        return v + '毫秒'
      }
      return ''
    },
    formatterFileSize: function (v) {
      if (v) {
        return v + 'KB'
      }
      return ''
    },
    formatterTextSize: function (v) {
      if (v) {
        return v + 'sp'
      }
      return ''
    }
  },
  computed: {
    validationError: function () {
      let errors = {}
      Object.keys(this.validations).forEach(key => {
        let { [key]: value } = this.configs
        let { [key]: validation } = this.validations
        if (this.isNotEmpty(value) && !validation.validate(value)) {
          errors[key] = validation.message(value)
        } else {
          errors[key] = ''
        }
      })
      return errors
    },
  },
  filters: {
    styleTextColor: function (v) {
      if (/^#[\dabcdef]{6}$/i.test(v)) {
        return 'color: ' + v + ';'
      } else {
        return ''
      }
    }
  },
  mounted () {
    this.loadConfigs()
  }
}

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
          enable_call_state_control: false,
          auto_set_brightness: false,
          dismiss_dialog_if_locked: true,
          check_device_posture: false,
          check_distance: false,
          posture_threshold_z: 6,
          auto_lock: false,
          lock_x: 150,
          lock_y: 970,
          timeout_unlock: 1000,
          timeout_findOne: 1000,
          timeout_existing: 8000,
          async_waiting_capture: true,
          capture_waiting_time: 500,
          develop_mode: false,
          develop_saving_mode: false,
          cutAndSaveCountdown: false,
          cutAndSaveTreeCollect: false,
          saveBase64ImgInfo: false
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
        console.log('执行保存配置')
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
    },
    template: '<div>\
      <van-divider content-position="left">锁屏相关</van-divider>\
      <van-cell-group>\
        <van-field v-model="configs.password" label="锁屏密码" type="password" placeholder="请输入锁屏密码" input-align="right" />\
        <van-field v-model="configs.timeout_unlock" label="解锁超时时间" type="number" placeholder="请输入解锁超时时间" input-align="right">\
          <span slot="right-icon">毫秒</span>\
        </van-field>\
        <van-cell center title="支付宝是否锁定">\
          <van-switch v-model="configs.is_alipay_locked" :size="switchSize" />\
        </van-cell>\
        <van-field v-if="configs.is_alipay_locked" v-model="configs.alipay_lock_password" label="手势密码" placeholder="请输入手势密码对应的九宫格数字" type="password" input-align="right" />\
        <van-cell center title="锁屏启动设置最低亮度">\
          <van-switch v-model="configs.auto_set_brightness" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="锁屏启动关闭弹窗提示">\
          <van-switch v-model="configs.dismiss_dialog_if_locked" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="锁屏启动时检测设备传感器" label="检测是否在裤兜内，防止误触" >\
          <van-switch v-model="configs.check_device_posture" :size="switchSize" />\
        </van-cell>\
        <template  v-if="configs.check_device_posture">\
          <van-cell center title="同时校验距离传感器" label="部分设备数值不准默认关闭" >\
            <van-switch v-model="configs.check_distance" :size="switchSize" />\
          </van-cell>\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">z轴重力加速度阈值（绝对值小于该值时判定为在兜里）</span>\
            </van-col>\
          </van-row>\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">x: {{device.pos_x | toFixed3}} y: {{device.pos_y | toFixed3}} z: {{device.pos_z | toFixed3}} 距离传感器：{{device.distance}}</span>\
            </van-col>\
          </van-row>\
          <van-field v-if="configs.check_device_posture" v-model="configs.posture_threshold_z" error-message-align="right" :error-message="validationError.posture_threshold_z" label="加速度阈值" type="number" placeholder="请输入加速度阈值" input-align="right" />\
        </template>\
        <van-cell center title="自动锁屏" label="脚本执行完毕后自动锁定屏幕">\
          <van-switch v-model="configs.auto_lock" :size="switchSize" />\
        </van-cell>\
        <template v-if="configs.auto_lock">\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">自动锁屏功能默认仅支持MIUI12，其他系统需要自行扩展实现：extends/LockScreen.js</span>\
            </van-col>\
          </van-row>\
          <van-field v-model="configs.lock_x" label="横坐标位置" type="number" placeholder="请输入横坐标位置" input-align="right" />\
          <van-field v-model="configs.lock_y" label="纵坐标位置" type="number" placeholder="请输入纵坐标位置" input-align="right" />\
        </template>\
      </van-cell-group>\
      <van-divider content-position="left">悬浮窗配置</van-divider>\
      <van-cell-group>\
        <van-field label="悬浮窗颜色" input-align="right" :error-message="validationError.min_floaty_color" error-message-align="right">\
          <input slot="input" v-model="configs.min_floaty_color" type="text" placeholder="悬浮窗颜色值 #FFFFFF"  class="van-field__control van-field__control--right" :style="configs.min_floaty_color | styleTextColor" />\
        </van-field>\
        <van-field v-model="configs.min_floaty_text_size" label-width="8em" label="悬浮窗字体大小" placeholder="请输入悬浮窗字体大小" type="number" input-align="right">\
          <span slot="right-icon">sp</span>\
        </van-field>\
        <van-field v-model="configs.min_floaty_x" label="悬浮窗位置X" type="number" placeholder="请输入悬浮窗横坐标位置" input-align="right" />\
        <van-field v-model="configs.min_floaty_y" label="悬浮窗位置Y" type="number" placeholder="请输入悬浮窗纵坐标位置" input-align="right" />\
        <van-row>\
          <van-col :span="22" :offset="1">\
            <span :style="\'color: gray;font-size: \' + tipTextSize">刘海屏或者挖孔屏悬浮窗显示位置和实际目测位置不同，需要施加一个偏移量，一般是负值，脚本运行时会自动设置</span>\
          </van-col>\
        </van-row>\
        <van-cell center title="下次执行时重新识别">\
          <van-switch v-model="configs.auto_set_bang_offset" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="当前偏移量">\
          <span>{{configs.auto_set_bang_offset ? "下次执行时重新识别": configs.bang_offset}}</span>\
        </van-cell>\
        <van-cell center title="不驻留前台" label="是否在脚本执行完成后不驻留前台，关闭倒计时悬浮窗" title-style="flex:3;">\
          <van-switch v-model="configs.not_lingering_float_window" :size="switchSize" />\
        </van-cell>\
      </van-cell-group>\
      <van-divider content-position="left">收集配置</van-divider>\
      <van-cell-group>\
        <van-cell center title="是否帮助收取">\
          <van-switch v-model="configs.help_friend" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否循环">\
          <van-switch v-model="configs.is_cycle" :size="switchSize" />\
        </van-cell>\
        <van-field v-if="configs.is_cycle" v-model="configs.cycle_times" label="循环次数" type="number" placeholder="请输入单次运行循环次数" input-align="right" />\
        <van-cell center v-if="!configs.is_cycle" title="是否永不停止">\
          <van-switch v-model="configs.never_stop" :size="switchSize" />\
        </van-cell>\
        <template  v-if="configs.never_stop">\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">永不停止模式请不要全天24小时运行，具体见README</span>\
            </van-col>\
          </van-row>\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">重新激活时间可以选择随机范围，按如下格式输入即可：30-40。{{reactiveTimeDisplay}}</span>\
            </van-col>\
          </van-row>\
          <van-field v-model="configs.reactive_time" :error-message="validationError.reactive_time" error-message-align="right" label="重新激活时间" type="text" placeholder="请输入永不停止的循环间隔" input-align="right" >\
            <span slot="right-icon">秒</span>\
          </van-field>\
        </template>\
        <van-field v-if="!configs.never_stop && !configs.is_cycle" v-model="configs.max_collect_wait_time" label="计时模式最大等待时间" label-width="10em" type="number" placeholder="请输入最大等待时间" input-align="right" >\
          <span slot="right-icon">秒</span>\
        </van-field>\
        <van-field v-model="configs.delayStartTime" label="延迟启动时间" label-width="10em" type="number" placeholder="请输入延迟启动时间" input-align="right" >\
          <span slot="right-icon">秒</span>\
        </van-field>\
        <van-cell center title="是否自动授权截图权限">\
          <van-switch v-model="configs.request_capture_permission" :size="switchSize" />\
        </van-cell>\
        <van-row>\
          <van-col :span="22" :offset="1">\
            <span :style="\'color: gray;font-size: \' + tipTextSize">偶尔通过captureScreen获取截图需要等待很久，或者一直阻塞无法进行下一步操作，建议开启异步等待，然后设置截图等待时间(默认500ms,需自行调试找到合适自己设备的数值)。失败多次后脚本会自动重启，重新获取截图权限</span>\
          </van-col>\
        </van-row>\
        <van-cell center title="是否异步等待截图">\
          <van-switch v-model="configs.async_waiting_capture" :size="switchSize" />\
        </van-cell>\
        <van-field v-if="configs.async_waiting_capture" v-model="configs.capture_waiting_time" label="获取截图超时时间" label-width="8em" type="number" placeholder="请输入超时时间" input-align="right" >\
          <span slot="right-icon">毫秒</span>\
        </van-field>\
        <van-cell center title="是否通话时暂停脚本" title-style="width: 10em;" label="需要授权AutoJS获取通话状态，Pro版暂时无法使用" title-style="flex:2;" >\
          <van-switch v-model="configs.enable_call_state_control" :size="switchSize" />\
        </van-cell>\
        <van-field v-model="configs.timeout_findOne" label="查找控件超时时间" label-width="8em" type="number" placeholder="请输入超时时间" input-align="right">\
          <span slot="right-icon">毫秒</span>\
        </van-field>\
        <van-field v-model="configs.timeout_existing" label="校验控件是否存在超时时间" label-width="12em" type="number" placeholder="请输入超时时间" input-align="right" >\
          <span slot="right-icon">毫秒</span>\
        </van-field>\
      </van-cell-group>\
      <van-divider content-position="left">日志配置</van-divider>\
      <van-cell-group>\
        <van-cell center title="是否显示debug日志">\
          <van-switch v-model="configs.show_debug_log" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否显示脚本引擎id">\
          <van-switch v-model="configs.show_engine_id" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否保存日志到文件">\
          <van-switch v-model="configs.save_log_file" :size="switchSize" />\
        </van-cell>\
        <van-field v-if="configs.save_log_file" v-model="configs.back_size" label="日志文件滚动大小" label-width="8em" type="number" placeholder="请输入单个文件最大大小" input-align="right" >\
          <span slot="right-icon">KB</span>\
        </van-field>\
        <van-cell v-if="configs.save_log_file" center title="是否异步保存日志到文件">\
          <van-switch v-model="configs.async_save_log_file" :size="switchSize" />\
        </van-cell>\
      </van-cell-group>\
      <van-divider content-position="left">开发模式配置</van-divider>\
      <van-cell-group>\
        <van-cell center title="是否启用开发模式">\
          <van-switch v-model="configs.develop_mode" :size="switchSize" />\
        </van-cell>\
        <template v-if="configs.develop_mode">\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">脚本执行时保存图片等数据，未启用开发模式时依旧有效，请不要随意开启</span>\
            </van-col>\
          </van-row>\
          <van-cell center title="是否保存倒计时图片">\
            <van-switch v-model="configs.cutAndSaveCountdown" :size="switchSize" />\
          </van-cell>\
          <van-cell center title="是否保存可收取能量球图片">\
            <van-switch v-model="configs.cutAndSaveTreeCollect" :size="switchSize" />\
          </van-cell>\
          <van-cell center title="是否保存一些开发用的数据">\
            <van-switch v-model="configs.develop_saving_mode" :size="switchSize" />\
          </van-cell>\
          <van-cell center title="是否倒计时图片base64">\
            <van-switch v-model="configs.saveBase64ImgInfo" :size="switchSize" />\
          </van-cell>\
        </template>\
      </van-cell-group>\
    </div>'
  })
})


Vue.component('advance-configs', function (resolve, reject) {
  resolve({
    mixins: [mixin_common],
    data: function () {
      return {
        hough_config: false,
        ocr_invoke_count: '',
        showTargetWateringAmount: false,
        wateringAmountColumns: [10, 18, 33, 66],
        showAddWhiteDialog: false,
        showAddWateringBlackDialog: false,
        newWhite: '',
        newBlack: '',
        configs: {
          // 排行榜校验区域
          rank_check_left: 250,
          rank_check_top: 250,
          rank_check_width: 550,
          rank_check_height: 130,
          // 能量球所在范围
          auto_detect_tree_collect_region: true,
          tree_collect_left: 150,
          tree_collect_top: 550,
          tree_collect_width: 800,
          tree_collect_height: 350,
          // 底部校验区域
          bottom_check_left: 600,
          bottom_check_top: 2045,
          bottom_check_width: 30,
          bottom_check_height: 20,
          bottom_check_gray_color: '#999999',
          // 逛一逛按钮区域
          stroll_button_left: 0,
          stroll_button_top: 0,
          stroll_button_width: 0,
          stroll_button_height: 0,
          single_script: false,
          collect_self_only: false,
          not_collect_self: false,
          recheck_rank_list: true,
          try_collect_by_stroll: true,
          stroll_button_regenerate: true,
          limit_runnable_time_range: true,
          use_double_click_card: false,
          useCustomScrollDown: true,
          scrollDownSpeed: 200,
          bottomHeight: 200,
          wateringBack: true,
          wateringThreshold: 40,
          targetWateringAmount: 10,
          wateringBlackList: [],
          useOcr: false,
          useTesseracOcr: true,
          ocrThreshold: 2600,
          autoSetThreshold: true,
          saveBase64ImgInfo: false,
          apiKey: '',
          secretKey: '',
          try_collect_by_multi_touch: false,
          direct_use_img_collect_and_help: true,
          hough_param1: 30,
          hough_param2: 30,
          hough_min_radius: null,
          hough_max_radius: null,
          hough_min_dst: null,
          stroll_button_region: '',
          rank_check_region: '',
          bottom_check_region: '',
          base_on_image: true,
          checkBottomBaseImg: true,
          friendListScrollTime: 0,
          white_list: ['1','2','3']
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
          bottom_check_gray_color: {
            validate: (v) => /^#[\dabcdef]{6}$/i.test(v),
            message: () => '颜色值格式不正确'
          },
        }
      }
    },
    methods: {
      isNotEmpty: function (v) {
        return !(typeof v === 'undefined' || v === null || v === '')
      },
      saveConfigs: function () {
        this.doSaveConfigs(['stroll_button_region', 'rank_check_region', 'bottom_check_region'])
      },
      updateOcrInvokeCount: function (data) {
        this.ocr_invoke_count = data
      },
      deleteWhite: function (idx) {
        this.$dialog.confirm({
          message: '确认要删除' + this.configs.white_list[idx] + '吗？'
        }).then(() => {
          this.configs.white_list.splice(idx, 1)
        }).catch(() => { })
      },
      deleteWaterBlack: function (idx) {
        this.$dialog.confirm({
          message: '确认要删除' + this.configs.wateringBlackList[idx] + '吗？'
        }).then(() => {
          this.configs.wateringBlackList.splice(idx, 1)
        }).catch(() => { })
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
      addBlack: function () {
        this.newBlack = ''
        this.showAddWateringBlackDialog = true
      },
      doAddBlack: function () {
        if (this.isNotEmpty(this.newBlack) && this.configs.wateringBlackList.indexOf(this.newBlack) < 0) {
          this.configs.wateringBlackList.push(this.newBlack)
        }
      },
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
      }
    },
    watch: {
      strollButtonRegion: function () {
        if (this.validations.stroll_button_region.validate(this.strollButtonRegion)) {
          let match = /^(([^0](\d+)|(\d)\s*)\s*,){3}([^0](\d+)|(\d)\s*)\s*$/.exec(this.strollButtonRegion)
          this.configs.stroll_button_left = parseInt(match[1])
          this.configs.stroll_button_top = parseInt(match[2])
          this.configs.stroll_button_width = parseInt(match[3])
          this.configs.stroll_button_height = parseInt(match[4])
        }
      },
      rankCheckRegion: function () {
        if (this.validations.rank_button_region.validate(this.rankCheckRegion)) {
          let match = /^(([^0](\d+)|(\d)\s*)\s*,){3}([^0](\d+)|(\d)\s*)\s*$/.exec(this.rankCheckRegion)
          this.configs.rank_check_left = parseInt(match[1])
          this.configs.rank_check_top = parseInt(match[2])
          this.configs.rank_check_width = parseInt(match[3])
          this.configs.rank_check_height = parseInt(match[4])
        }
      },
      bottomCheckRegion: function () {
        if (this.validations.bottom_button_region.validate(this.bottomCheckRegion)) {
          let match = /^(([^0](\d+)|(\d)\s*)\s*,){3}([^0](\d+)|(\d)\s*)\s*$/.exec(this.bottomCheckRegion)
          this.configs.bottom_check_left = parseInt(match[1])
          this.configs.bottom_check_top = parseInt(match[2])
          this.configs.bottom_check_width = parseInt(match[3])
          this.configs.bottom_check_height = parseInt(match[4])
        }
      }
    },
    watch: {
      configs: {
        handler: function (v) {
          this.configs.stroll_button_region = this.configs.stroll_button_left + ',' + this.configs.stroll_button_top + ',' + this.configs.stroll_button_width + ',' + this.configs.stroll_button_height
          this.configs.rank_check_region = this.configs.rank_check_left + ',' + this.configs.rank_check_top + ',' + this.configs.rank_check_width + ',' + this.configs.rank_check_height
          this.configs.bottom_check_region = this.configs.bottom_check_left + ',' + this.configs.bottom_check_top + ',' + this.configs.bottom_check_width + ',' + this.configs.bottom_check_height
        },
        deep: true
      }
    },
    mounted () {
      $app.registerFunction('saveAdvanceConfigs', this.saveConfigs)
      $app.registerFunction('ocr_invoke_count', this.updateOcrInvokeCount)},
    template: '<div>\
      <van-cell-group>\
        <van-row>\
          <van-col :span="22" :offset="1">\
            <span :style="\'color: gray;font-size: \' + tipTextSize">当需要使用多个脚本时不要勾选（如同时使用我写的蚂蚁庄园脚本），避免抢占前台</span>\
          </van-col>\
        </van-row>\
        <van-cell center title="是否单脚本运行">\
          <van-switch v-model="configs.single_script" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="只收自己的能量">\
          <van-switch v-model="configs.collect_self_only" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="不收自己的能量">\
          <van-switch v-model="configs.not_collect_self" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否在收集或帮助后重新检查排行榜" title-style="flex:2;">\
          <van-switch v-model="configs.recheck_rank_list" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否使用能量双击卡">\
          <van-switch v-model="configs.use_double_click_card" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否限制0:30-6:50不可运行" title-style="flex:2;">\
          <van-switch v-model="configs.limit_runnable_time_range" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否通过逛一逛收集能量">\
          <van-switch v-model="configs.try_collect_by_stroll" :size="switchSize" />\
        </van-cell>\
        <template v-if="configs.try_collect_by_stroll">\
          <van-field v-if="!configs.stroll_button_regenerate" :error-message="validationError.stroll_button_region" error-message-align="right" v-model="configs.stroll_button_region" label="逛一逛按钮区域" label-width="10em" type="text" placeholder="请输入校验区域" input-align="right" />\
          <van-field readonly="true" v-else value="下次运行时重新识别" label="逛一逛按钮区域" label-width="10em" type="text" input-align="right" />\
          <van-cell center title="下次运行时重新识别">\
            <van-switch v-model="configs.stroll_button_regenerate" :size="switchSize" />\
          </van-cell>\
        </template>\
        <van-cell center title="是否使用模拟滑动">\
          <van-switch v-model="configs.useCustomScrollDown" :size="switchSize" />\
        </van-cell>\
        <template v-if="configs.useCustomScrollDown">\
          <van-field v-model="configs.scrollDownSpeed" label="模拟滑动速度" label-width="8em" type="number" input-align="right" />\
          <van-field v-model="configs.bottomHeight" label="模拟底部起始高度" label-width="8em" type="number" input-align="right" />\
        </template>\
      </van-cell-group>\
      <van-divider content-position="left">图像分析相关</van-divider>\
      <van-cell-group>\
        <van-cell center title="是否通过图像分析收取">\
          <van-switch v-model="configs.direct_use_img_collect_and_help" :size="switchSize" />\
        </van-cell>\
        <template v-if="configs.direct_use_img_collect_and_help">\
          <van-cell center title="霍夫变换进阶配置" label="如非必要请不要随意修改">\
            <van-switch v-model="hough_config" :size="switchSize" />\
          </van-cell>\
          <template v-if="hough_config">\
            <van-field v-model="configs.hough_param1" label="param1" placeholder="留空使用默认配置" label-width="8em" type="number" input-align="right" />\
            <van-field v-model="configs.hough_param2" label="param2" placeholder="留空使用默认配置" label-width="8em" type="number" input-align="right" />\
            <van-field v-model="configs.hough_min_radius" label="最小球半径" placeholder="留空使用默认配置" label-width="8em" type="number" input-align="right" />\
            <van-field v-model="configs.hough_max_radius" label="最大球半径" placeholder="留空使用默认配置" label-width="8em" type="number" input-align="right" />\
            <van-field v-model="configs.hough_min_dst" label="球心最小距离" placeholder="留空使用默认配置" label-width="8em" type="number" input-align="right" />\
          </template>\
        </tempalte>\
        <van-cell center title="基于图像分析列表">\
          <van-switch v-model="configs.base_on_image" :size="switchSize" />\
        </van-cell>\
        <template v-if="configs.base_on_image">\
          <van-field :error-message="validationError.rank_check_region" error-message-align="right" v-model="configs.rank_check_region" label="排行榜校验区域" label-width="10em" type="text" placeholder="请输入校验区域" input-align="right" />\
          <van-cell center title="基于图像判断列表底部">\
            <van-switch v-model="configs.checkBottomBaseImg" :size="switchSize" />\
          </van-cell>\
          <template v-if="configs.checkBottomBaseImg">\
            <van-field :error-message="validationError.bottom_check_region" error-message-align="right" v-model="configs.bottom_check_region" label="底部校验区域" label-width="10em" type="text" placeholder="请输入校验区域" input-align="right" />\
            <van-field label="底部判断的灰度颜色值" label-width="10em" input-align="right" :error-message="validationError.bottom_check_gray_color" error-message-align="right">\
              <input slot="input" v-model="configs.bottom_check_gray_color" type="text" placeholder="可收取颜色值 #FFFFFF"  class="van-field__control van-field__control--right" :style="configs.bottom_check_gray_color | styleTextColor" />\
            </van-field>\
          </template>\
          <template v-else>\
            <van-row>\
              <van-col :span="22" :offset="1">\
                <span :style="\'color: gray;font-size: \' + tipTextSize">排行榜下拉的最大次数，使得所有数据都加载完，如果基于图像判断无效只能如此</span>\
              </van-col>\
            </van-row>\
            <van-field v-model="configs.friendListScrollTime" label="排行榜下拉次数" label-width="10em" type="text" placeholder="请输入排行榜下拉次数" input-align="right" />\
          </template>\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">图像识别的线程池配置，如果过于卡顿，请调低线程池大小，同时增加线程池等待时间。</span>\
            </van-col>\
          </van-row>\
          <van-field v-model="configs.thread_pool_size" label="线程池大小" placeholder="留空使用默认配置" label-width="8em" type="number" input-align="right" />\
          <van-field v-model="configs.thread_pool_max_size" label="线程池最大大小" placeholder="留空使用默认配置" label-width="8em" type="number" input-align="right" />\
          <van-field v-model="configs.thread_pool_queue_size" label="线程池等待队列大小" label-width="8em" placeholder="留空使用默认配置" label-width="8em" type="number" input-align="right" />\
          <van-field v-model="configs.thread_pool_waiting_time" label="线程池等待时间" placeholder="留空使用默认配置" label-width="8em" type="number" input-align="right" >\
            <span slot="right-icon">秒</span>\
          </van-field>\
          <van-divider/>\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">当不启用以下任意一种OCR的时候会使用多点找色方式模拟识别倒计时，如果模拟识别不准确时可以看情况选择其中一种OCR方式</span>\
            </van-col>\
          </van-row>\
          <van-row v-if="configs.useTesseracOcr || configs.useOcr">\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">{{ocr_invoke_count}}</span>\
            </van-col>\
          </van-row>\
          <van-cell center title="是否启用自建OCR服务器识别倒计时" label="服务器到期时间2020-12-12" title-style="flex:2;">\
            <van-switch v-model="configs.useTesseracOcr" :size="switchSize" />\
          </van-cell>\
          <van-cell v-if="!configs.useTesseracOcr" center title="是否启用百度OCR倒计时">\
            <van-switch v-model="configs.useOcr" :size="switchSize" />\
          </van-cell>\
          <template v-if="!configs.useTesseracOcr && configs.useOcr">\
            <van-row>\
              <van-col :span="22" :offset="1">\
                <span :style="\'color: gray;font-size: \' + tipTextSize">请填写百度AI平台申请的API_KEY和SECRET_KEY</span>\
              </van-col>\
            </van-row>\
            <van-field v-model="configs.apiKey" label="" placeholder="apiKey" label-width="8em" type="text" input-align="right" />\
            <van-field v-model="configs.secretKey" label="" placeholder="secretKey" label-width="8em" type="password" input-align="right" />\
          </template>\
        </template>\
      </van-cell-group>\
      <van-divider content-position="left">\
        白名单设置\
        <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addWhite">增加</van-button>\
      </van-divider>\
      <van-cell-group>\
        <div style="max-height:10rem;overflow:scroll;padding:1rem;background:#f1f1f1;">\
        <van-swipe-cell v-for="(white,idx) in configs.white_list">\
          <van-cell :title="white" />\
          <template #right>\
            <van-button square type="danger" text="删除" @click="deleteWhite(idx)" />\
          </template>\
        </van-swipe-cell>\
        </div>\
      </van-cell-group>\
      <van-divider content-position="left">浇水设置</van-divider>\
      <van-cell-group>\
        <van-cell center title="是否浇水回馈">\
          <van-switch v-model="configs.wateringBack" :size="switchSize" />\
        </van-cell>\
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
            <van-swipe-cell v-for="(black,idx) in configs.wateringBlackList">\
              <van-cell :title="black" />\
              <template #right>\
                <van-button square type="danger" text="删除" @click="deleteWaterBlack(idx)" />\
              </template>\
            </van-swipe-cell>\
            </div>\
          </van-cell-group>\
        </template>\
      </van-cell-group>\
      <van-dialog v-model="showAddWhiteDialog" title="增加白名单" show-cancel-button @confirm="doAddWhite">\
        <van-field v-model="newWhite" placeholder="请输入好友昵称" label="好友昵称" />\
      </van-dialog>\
      <van-dialog v-model="showAddWateringBlackDialog" title="增加浇水黑名单" show-cancel-button @confirm="doAddBlack">\
        <van-field v-model="newBlack" placeholder="请输入好友昵称" label="好友昵称" />\
      </van-dialog>\
    </div>'
  })
})
Vue.component('widget-configs', function (resolve, reject) {
  resolve({
    mixins: [mixin_common],
    data: function () {
      return {
        configs: {
          my_id: '',
          home_ui_content: '查看更多动态.*',
          friend_home_check_regex: '你收取TA|TA收取你',
          friend_home_ui_content: '你收取TA|TA收取你',
          friend_name_getting_regex: '(.*)的蚂蚁森林',
          enter_friend_list_ui_content: '查看更多好友',
          no_more_ui_content: '没有更多了',
          load_more_ui_content: '查看更多',
          do_watering_button_content: '送给\\s*TA|浇水送祝福',
          using_protect_content: '使用了保护罩',
          collectable_energy_ball_content: '收集能量\\d+克',
          can_collect_color: '#1da06a',
          can_help_color: '#f99236',
        },
        validations: {
          can_collect_color: {
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
            console.log('load config key:[' + key + '] value: [' + config[key] + ']')
            this.$set(this.configs, key, config[key])
          })
        })
      },
      isNotEmpty: function (v) {
        return !(typeof v === 'undefined' || v === null || v === '')
      },
      saveConfigs: function () {
        this.doSaveConfigs()
      }
    },
    computed: {
    },
    filters: {

    },
    mounted () {
      $app.registerFunction('saveWidgetConfigs', this.saveConfigs)
    },
    template: '<div>\
      <van-row>\
        <van-col :span="22" :offset="1">\
          <span :style="\'color: gray;font-size: \' + tipTextSize">一般情况下不需要修改这一块的配置，除非你的支付宝是英文的</span>\
        </van-col>\
      </van-row>\
      <van-row>\
        <van-col :span="22" :offset="1">\
          <span :style="\'color: gray;font-size: \' + tipTextSize">我的ID主要用来准确获取当前收集的能量数据，可不配置</span>\
        </van-col>\
      </van-row>\
      <van-field v-model="configs.my_id" label="我的ID" type="text" placeholder="" input-align="right" />\
      <van-field v-model="configs.home_ui_content" label="个人首页" type="text" placeholder="请输入个人首页控件文本" input-align="right" />\
      <van-field v-model="configs.friend_home_check_regex" label="判断是否好友首页" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field v-model="configs.friend_home_ui_content" label="好友首页" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field v-model="configs.friend_name_getting_regex" label="好友名称正则表达式" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field v-model="configs.enter_friend_list_ui_content" label="查看更多好友按钮" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field v-model="configs.using_protect_content" label="保护罩使用记录" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field v-model="configs.do_watering_button_content" label="确认浇水按钮" label-width="10em" type="text" placeholder="请输入待校验控件文本" input-align="right" />\
      <van-field label="列表中可收取的颜色" label-width="10em" input-align="right" :error-message="validationError.can_collect_color" error-message-align="right">\
        <input slot="input" v-model="configs.can_collect_color" type="text" placeholder="可收取颜色值 #FFFFFF"  class="van-field__control van-field__control--right" :style="configs.can_collect_color | styleTextColor" />\
      </van-field>\
      <van-field label="列表中可帮助的颜色" label-width="10em" input-align="right" :error-message="validationError.can_help_color" error-message-align="right">\
        <input slot="input" v-model="configs.can_help_color" type="text" placeholder="可收取颜色值 #FFFFFF"  class="van-field__control van-field__control--right" :style="configs.can_help_color | styleTextColor" />\
      </van-field>\
    </div>'
  })
})