/**
 * 白名单设置
 */
const WhiteListConfig = {
  mixins: [mixin_common],
  data() {
    return {
      showAddWhiteDialog: false,
      newWhite: '',
      configs: {
        white_list: ['1', '2', '3'],
      }
    }
  },
  methods: {
    saveConfigs: function () {
      this.doSaveConfigs()
      $app.invoke('updateProtectList', { protectList: this.protectList })
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
  },
  template: `
  <div>
    <van-divider content-position="left">
      白名单设置
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addWhite">增加</van-button>
    </van-divider>
    <tip-block>配置不收取的好友</tip-block>
    <van-cell-group>
      <div style="overflow:scroll;padding:1rem;background:#f1f1f1;">
      <van-swipe-cell v-for="(white,idx) in configs.white_list" :key="white" stop-propagation>
        <van-cell :title="white" />
        <template #right>
          <van-button square type="danger" text="删除" @click="deleteWhite(idx)" />
        </template>
      </van-swipe-cell>
      </div>
    </van-cell-group>
    <van-dialog v-model="showAddWhiteDialog" title="增加白名单" show-cancel-button @confirm="doAddWhite" :get-container="getContainer">
      <van-field v-model="newWhite" placeholder="请输入好友昵称" label="好友昵称" />
    </van-dialog>
  </div>
  `
}
/**
 * 浇水设置
 */
const WaterBackConfig = {
  mixins: [mixin_common],
  data() {
    return {
      showAddWateringBlackDialog: false,
      showTargetWateringAmount: false,
      wateringAmountColumns: [10, 18, 33, 66],
      newBlack: '',
      configs: {
        wateringBack: true,
        wateringThreshold: null,
        targetWateringAmount: null,
        wateringBlackList: [],
      },
      validations: {
        wateringThreshold: VALIDATOR.P_INT
      }
    }
  },
  methods: {
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
    selectedTargetAmount: function (val) {
      console.log(val)
      if (parseInt(val) > this.configs.wateringThreshold) {
        this.$toast('回馈数量大于浇水阈值，请重新选择')
      } else {
        this.showTargetWateringAmount = false
        this.configs.targetWateringAmount = val
      }
    },
  },
  template: `
  <div>
    <van-divider content-position="left">浇水设置</van-divider>
    <van-cell-group>
      <switch-cell title="是否浇水回馈" v-model="configs.wateringBack" />
      <template v-if="configs.wateringBack">
        <van-field v-model="configs.wateringThreshold" label="浇水阈值" placeholder="请输入浇水阈值" label-width="8em" type="text" input-align="right" />
        <van-cell center title="浇水回馈数量" :value="configs.targetWateringAmount" @click="showTargetWateringAmount=true" />
        <van-popup v-model="showTargetWateringAmount" position="bottom" :style="{ height: '30%' }">
          <van-picker show-toolbar title="浇水数量" :columns="wateringAmountColumns" :default-index="0" @confirm="selectedTargetAmount" />
        </van-popup>
        <van-divider content-position="left">
          浇水黑名单设置
          <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addBlack">增加</van-button>
        </van-divider>
        <van-cell-group>
          <div style="overflow:scroll;padding:1rem;background:#f1f1f1;">
          <van-swipe-cell v-for="(black,idx) in configs.wateringBlackList" :key="black" stop-propagation>
            <van-cell :title="black" />
            <template #right>
              <van-button square type="danger" text="删除" @click="deleteWaterBlack(idx)" />
            </template>
          </van-swipe-cell>
          </div>
        </van-cell-group>
      </template>
    </van-cell-group>
    <van-dialog v-model="showAddWateringBlackDialog" title="增加浇水黑名单" show-cancel-button @confirm="doAddBlack" :get-container="getContainer">
      <van-field v-model="newBlack" placeholder="请输入好友昵称" label="好友昵称" />
    </van-dialog>
  </div>
  `
}
/**
 * 保护罩设置
 */
const ProtectedListConfig = {
  mixins: [mixin_common],
  data() {
    return {
      protectList: [{ name: 'friendName', timeout: '2021-01-25 23:23:23' }],
      newProtectedName: '',
      expireTime: '',
      currentDate: new Date(),
      showAddProtectedDialog: false,
      editProtected: false,
      editProtectedIdx: -1
    }
  },
  methods: {
    saveConfigs: function () {
      $app.invoke('updateProtectList', { protectList: this.protectList })
    },
    addProtected: function () {
      this.newProtectedName = ''
      this.expireTime = new Date()
      this.showAddProtectedDialog = true
      this.editProtected = false
    },
    changeProtect: function (idx) {
      this.newProtectedName = this.protectList[idx].name
      this.expireTime = new Date(this.protectList[idx].timeout.replace(/-/g,'/'))
      this.showAddProtectedDialog = true
      this.editProtected = true
      this.editProtectedIdx = idx
    },
    doAddProtected: function () {
      if (this.newProtectedName && this.expireTime) {
        console.log('name:', this.newProtectedName, 'time:', this.expireTime)
        if (this.editProtected) {
          this.editProtected = false
          this.protectList[this.editProtectedIdx].timeout = formatDate(this.expireTime)
          return
        }
        if (this.protectList.filter(v => v.name === this.newProtectedName).length > 0) {
          this.$notify({ message: '该好友已在白名单中', type: 'warning'})
          return
        }
        this.protectList.push({
          name: this.newProtectedName,
          timeout: formatDate(this.expireTime)
        })
      } else {
        this.showAddProtectedDialog = true
      }
    },
    beforeProtectedClose: function (action, done) {
      if (action === 'confirm') {
        let pass = true
        if (!(this.newProtectedName && this.expireTime)) {
          this.$notify({ message: '请输入好友昵称和过期时间', type: 'warning'})
          pass = false
        }
        done(pass)
      } else {
        done()
      }
    },
    deleteProtect: function (idx) {
      this.$dialog.confirm({
        message: '确认要删除' + this.protectList[idx].name + '吗？'
      }).then(() => {
        $nativeApi.request('removeFromProtectList', { name: this.protectList[idx].name }).then(resp => {
          if (resp.success) {
            this.loadProtectedList()
          }
        })
      }).catch(() => { })
    },
    loadProtectedList: function () {
      $nativeApi.request('loadProtectedList', {}).then(resp => {
        this.protectList = (resp.protectList || [])
        this.sortProtectList()
      })
    },
    sortProtectList: function () {
      this.protectList = this.protectList.sort((a,b)=> a.timeout > b.timeout ? 1 : -1)
    }
  },
  watch: {
    showAddProtectedDialog: {
      handler: function (v) {
        // 关闭弹窗时进行排序
        if (!v && this.protectList && this.protectList.length > 0) {
          this.sortProtectList()
        }
      }
    }
  },
  mounted() {
    this.loadProtectedList()
  },
  template: `
  <div>
    <van-divider content-position="left">
      好友保护罩使用记录
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addProtected">增加</van-button>
    </van-divider>
    <van-cell-group>
      <div style="overflow:scroll;padding:1rem;background:#f1f1f1;">
        <van-swipe-cell v-for="(protectInfo,idx) in protectList" :key="protectInfo.name" stop-propagation>
          <van-cell :title="protectInfo.name" :label="'超时时间:' + protectInfo.timeout" />
          <template #right>
            <div style="display: flex;height: 100%;">
              <van-button square type="primary" text="修改" @click="changeProtect(idx)" style="height: 100%" />
              <van-button square type="danger" text="删除" @click="deleteProtect(idx)" style="height: 100%" />
            </div>
          </template>
        </van-swipe-cell>
      </div>
    </van-cell-group>
    <van-dialog v-model="showAddProtectedDialog" show-cancel-button @confirm="doAddProtected" :get-container="getContainer" title="增加保护罩使用好友" :before-close="beforeProtectedClose">
      <van-field v-model="newProtectedName" placeholder="请输入好友昵称" label="好友昵称" :readonly="editProtected" />
      <van-datetime-picker v-model="expireTime" type="datetime" title="请选择保护罩到期时间" :min-date="currentDate" :show-toolbar="false"/>
    </van-dialog>
  </div>
  `
}

/**
 * 高级设置
 */
const AdvanceCommonConfig = {
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        single_script: true,
        auto_restart_when_crashed: true,
        useCustomScrollDown: true,
        scrollDownSpeed: null,
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
  methods: {
    doAuthADB: function () {
      $app.invoke('doAuthADB', {})
    }
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
      <switch-cell title="是否使用模拟滑动" v-model="configs.useCustomScrollDown" />
      <template v-if="configs.useCustomScrollDown">
        <number-field v-model="configs.scrollDownSpeed" label="模拟滑动速度" label-width="8em" />
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
  data() {
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

/**
 * 区域信息配置以及图像识别相关配置
 */
const RegionConfig = {
  mixins: [mixin_common],
  data() {
    return {
      mounted: false,
      hough_config: false,
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
        checkBottomBaseImg: true,
        bottom_check_left: 200,
        bottom_check_top: 200,
        bottom_check_width: 20,
        bottom_check_height: 20,
        bottom_check_gray_color: '#999999',
        // 逛一逛按钮区域
        stroll_button_regenerate: true,
        stroll_button_left: null,
        stroll_button_top: null,
        stroll_button_width: null,
        stroll_button_height: null,
        // 区域信息字符串
        stroll_button_region: '',
        rank_check_region: '',
        bottom_check_region: '',
        tree_collect_region: '',
        // 能量球识别配置
        skip_own_watering_ball: true,
        hough_param1: null,
        hough_param2: null,
        hough_min_radius: null,
        hough_max_radius: null,
        hough_min_dst: null,
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

        this.mounted = true
      })
    },
    showRealVisual: function () {
      $app.invoke('showRealtimeVisualConfig', {})
    },
    openGrayDetector: function () {
      $app.invoke('openGrayDetector', {})
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
    },
  },
  template: `
  <div>
    <div ref="top-block"></div>
    <van-divider content-position="left">
      图像分析相关
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="showRealVisual">实时查看区域配置</van-button>
    </van-divider>
    <tip-block>区域输入框左滑可以通过滑块输入数值，也可以通过取色工具获取目标区域信息：<van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="openGrayDetector">打开取色工具</van-button></tip-block>
    <region-input-field v-if="!configs.stroll_button_regenerate"
      :device-height="device.height" :device-width="device.width"
      :error-message="validationError.stroll_button_region"
      v-model="configs.stroll_button_region" label="逛一逛按钮区域" label-width="10em" />
    <van-field :readonly="true" v-else value="下次运行时重新识别" label="逛一逛按钮区域" label-width="10em" type="text" input-align="right" />
    <switch-cell title="下次运行时重新识别" v-model="configs.stroll_button_regenerate" />
    <van-cell-group>
      <switch-cell title="跳过好友浇水能量球" label="开启后自己手动收取" v-model="configs.skip_own_watering_ball" />
      <region-input-field v-if="!configs.auto_detect_tree_collect_region"
        :device-height="device.height" :device-width="device.width"
        :error-message="validationError.tree_collect_region"
        v-model="configs.tree_collect_region" label="能量球所在区域" label-width="10em" />
      <van-field :readonly="true" v-else value="下次运行时重新识别" label="能量球所在区域" label-width="10em" type="text" input-align="right" />
      <switch-cell title="下次运行时重新识别" v-model="configs.auto_detect_tree_collect_region" />
      <switch-cell title="霍夫变换进阶配置" label="如非必要请不要随意修改" v-model="hough_config" />
      <template v-if="hough_config">
        <number-field v-model="configs.hough_param1" label="param1" placeholder="留空使用默认配置" label-width="8em" />
        <number-field v-model="configs.hough_param2" label="param2" placeholder="留空使用默认配置" label-width="8em" />
        <number-field v-model="configs.hough_min_radius" label="最小球半径" placeholder="留空使用默认配置" label-width="8em" />
        <number-field v-model="configs.hough_max_radius" label="最大球半径" placeholder="留空使用默认配置" label-width="8em" />
        <number-field v-model="configs.hough_min_dst" label="球心最小距离" placeholder="留空使用默认配置" label-width="8em" />
      </template>
      <region-input-field
          :device-height="device.height" :device-width="device.width"
          :error-message="validationError.rank_check_region"
          v-model="configs.rank_check_region" label="排行榜校验区域" label-width="10em" />
      <switch-cell title="基于图像判断列表底部" v-model="configs.checkBottomBaseImg" />
      <template v-if="configs.checkBottomBaseImg">
        <region-input-field
          :device-height="device.height" :device-width="device.width"
          :error-message="validationError.bottom_check_region"
          v-model="configs.bottom_check_region" label="底部校验区域" label-width="10em" />
        <color-input-field label="底部判断的灰度颜色值" label-width="10em" 
          placeholder="可收取颜色值 #FFFFFF" :error-message="validationError.bottom_check_gray_color" v-model="configs.bottom_check_gray_color"/>
      </template>
      <template v-else>
        <tip-block>排行榜下拉的最大次数，使得所有数据都加载完，如果基于图像判断无效只能如此</tip-block>
        <van-field v-model="configs.friendListScrollTime" label="排行榜下拉次数" label-width="10em" type="text" placeholder="请输入排行榜下拉次数" input-align="right" />
      </template>
      <van-cell title="ocr配置" is-link @click="routerTo('/advance/region/ocr')" />
      <van-cell title="线程池配置" is-link @click="routerTo('/advance/region/threadPool')" />
    </van-cell-group>
  </div>
  `
}

const OcrConfig = {
  mixins: [mixin_common],
  data() {
    return {
      ocr_invoke_count: '已使用10次剩余490次',
      configs: {
        // ocr相关
        useOcr: true,
        ocrThreshold: null,
        autoSetThreshold: true,
        apiKey: '',
        secretKey: '',
        // 排行榜识别配置
        check_finger_by_pixels_amount: true,
        finger_img_pixels: 1800,
      }
    }
  },
  mounted() {
    $nativeApi.request('ocrInvokeCount', {}).then(resp => {
      this.ocr_invoke_count = resp
    })
  },
  template: `
  <div>
    <van-cell-group>
      <tip-block>默认使用多点找色方式识别列表中的小手，失效后请打开基于像素点个数判断是否可收取，这是一个阈值当像素点个数小于给定的值之后就判定为可收取</tip-block>
      <switch-cell title="基于像素点个数判断是否可收取" title-style="flex:2;" v-model="configs.check_finger_by_pixels_amount" />
      <number-field v-if="configs.check_finger_by_pixels_amount" v-model="configs.finger_img_pixels" label="小手像素点个数" placeholder="小手像素点个数" label-width="8em" />
      <tip-block>当不启用百度OCR的时候会使用多点找色方式模拟识别倒计时，如果模拟识别不准确时可以看情况选择百度OCR方式</tip-block>
      <tip-block v-if="configs.useOcr">{{ocr_invoke_count}}</tip-block>
      <switch-cell title="是否启用百度OCR倒计时" v-model="configs.useOcr" />
      <template v-if="configs.useOcr">
        <tip-block>请填写百度AI平台申请的API_KEY和SECRET_KEY</tip-block>
        <van-field v-model="configs.apiKey" label="" placeholder="apiKey" label-width="8em" type="text" input-align="right" />
        <van-field v-model="configs.secretKey" label="" placeholder="secretKey" label-width="8em" type="password" input-align="right" />
      </template>
      <template v-if="configs.useOcr">
        <tip-block>通过图片中非白色的像素点阈值筛选当前图片是否进行OCR请求 理论上像素点越多数值越小 越有必要进行OCR识别 从而节省识别次数</tip-block>
        <switch-cell title="是否自动判断OCR像素阈值" v-model="configs.autoSetThreshold"/>
        <number-field v-model="configs.ocrThreshold" label="OCR像素阈值" placeholder="留空使用默认配置" label-width="8em" />
      </template>
    </van-cell-group>
  </div>`
}

const ThreadPoolConfig = {
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        thread_pool_size: '5',
        thread_pool_max_size: '5',
        thread_pool_queue_size: '16',
        thread_pool_waiting_time: '5',
      }
    }
  },
  template: `
  <div>
    <van-cell-group>
      <tip-block>图像识别的线程池配置，如果过于卡顿，请调低线程池大小，同时增加线程池等待时间。</tip-block>
      <number-field v-model="configs.thread_pool_size" label="线程池大小" placeholder="留空使用默认配置" label-width="8em" />
      <number-field v-model="configs.thread_pool_max_size" label="线程池最大大小" placeholder="留空使用默认配置" label-width="8em" />
      <number-field v-model="configs.thread_pool_queue_size" label="线程池等待队列大小" label-width="10em" placeholder="留空使用默认配置" />
      <number-field v-model="configs.thread_pool_waiting_time" label="线程池等待时间" placeholder="留空使用默认配置" label-width="8em" >
        <template #right-icon><span>秒</span></template>
      </number-field>
    </van-cell-group>
  </div>`
}