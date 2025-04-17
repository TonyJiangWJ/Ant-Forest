/**
 * 支付宝多账号管理
 */
const AlipayAccountManage = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        enable_multi_account: false,
        main_account: 'a',
        main_account_username: '小A',
        accounts: [{ account: 'a', accountName: '小A' }],
        main_userid: '',
        to_main_by_user_id: true,
        watering_main_account: true,
        watering_main_at: 'rain',
        main_account_avatar: '',
      },
      showAddAccountDialog: false,
      isEdit: false,
      newAccount: '',
      newAccountName: '',
      editIdx: '',
      editMain: false,
      timedUnit1: 'test',
      timedUnit2: '',
      timedUnit3: '',
      timedUnit4: '',
      waterAtOptions: [
        { text: '能量雨', value: 'rain' },
        { text: '收集能量', value: 'collect' },
        { text: '独立浇水', value: 'standalone' },
      ],
    }
  },
  methods: {
    addAccount: function () {
      this.newAccount = ''
      this.newAccountName = ''
      this.showAddAccountDialog = true
      this.isEdit = false
    },
    editAccount: function (idx) {
      let target = this.configs.accounts[idx]
      this.editIdx = idx
      this.isEdit = true
      this.editMain = this.configs.accounts[idx].account == this.configs.main_account
      this.newAccount = target.account
      this.newAccountName = target.accountName
      this.showAddAccountDialog = true
    },
    confirmAction: function () {
      if (this.isEdit) {
        this.doEditAccount()
      } else {
        this.doAddAccount()
      }
    },
    doAddAccount: function () {
      if (this.isNotEmpty(this.newAccount) && this.isNotEmpty(this.newAccountName) && this.configs.accounts.map(v => v.account).indexOf(this.newAccount) < 0) {
        this.configs.accounts.push({ account: this.newAccount, accountName: this.newAccountName })
      }
      if (!this.configs.main_account && this.configs.accounts.length > 0) {
        this.configs.main_account = this.configs.accounts[0].account
      }
    },
    doEditAccount: function () {
      if (this.isNotEmpty(this.newAccount) && this.isNotEmpty(this.newAccountName)) {
        let newAccount = this.newAccount
        let editIdx = this.editIdx
        if (this.configs.accounts.filter((v, idx) => v.account == newAccount && idx != editIdx).length > 0) {
          return
        }
        this.configs.accounts[editIdx] = { account: this.newAccount, accountName: this.newAccountName }
        if (this.editMain) {
          this.configs.main_account = this.newAccount
          this.configs.main_account_username = this.newAccountName
        }
      }
    },
    deleteAccount: function (idx) {
      this.$dialog.confirm({
        message: '确认要删除' + this.configs.accounts[idx].account + '吗？'
      }).then(() => {
        this.configs.accounts.splice(idx, 1)
        if (this.configs.accounts.map(v => v.account).indexOf(this.configs.main_account) < 0) {
          this.configs.main_account = ''
        }
      }).catch(() => { })
    },
    changeMainAccount: function (idx) {
      this.configs.main_account = this.configs.accounts[idx].account
      this.configs.main_account_username = this.configs.accounts[idx].accountName
    },
    changeAccount: function () {
      this.doSaveConfigs()
      $app.invoke('changeAlipayAccount', { account: this.configs.main_account })
    },
    executeCollect: function () {
      this.doSaveConfigs()
      $app.invoke('executeTargetScript', '/unit/循环切换小号并收集能量.js')
    },
    executeRain: function () {
      this.doSaveConfigs()
      $app.invoke('executeTargetScript', '/unit/循环切换小号并执行能量雨收集.js')
    },
    executeWalking: function () {
      this.doSaveConfigs()
      $app.invoke('executeTargetScript', '/unit/循环切换小号用于同步数据.js')
    },
    executeWatering: function () {
      this.doSaveConfigs()
      $app.invoke('executeTargetScript', '/unit/循环切换小号并大号浇水.js')
    },
    waterAtChanged: function () {
      let desc = ''
      switch (this.configs.watering_main_at) {
        case 'rain':
          desc = '将在执行能量雨时进行浇水'
          break
        case 'collect':
          desc = '将在执行小号能量收集时浇水'
          break
        case 'standalone':
          desc = '只通过独立脚本浇水'
          break
      }
      this.$toast(desc)
    },
    onConfigLoad (config) {
      this.configs.main_account_avatar = config.image_config.main_account_avatar
    },
    doSaveConfigs (deleteFields) {
      console.log('执行保存配置')
      let newConfigs = this.filterErrorFields(this.configs)
      if (deleteFields && deleteFields.length > 0) {
        deleteFields.forEach(key => {
          newConfigs[key] = ''
        })
      }
      $app.invoke('saveConfigs', newConfigs)
      if (this.configs.main_account_avatar) {
        // 保存图片扩展配置
        $app.invoke('saveExtendConfigs', { configs: { main_account_avatar: this.configs.main_account_avatar }, prepend: 'image' })
      }
    },
    getAvatar: function () {
      $nativeApi.request('getAvatar', {}).then(resp => {
        $app.invoke('loadConfigs', {}, config => {
          this.configs.main_account_avatar = config.image_config.main_account_avatar
        })
      })
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
  mounted () {
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/循环切换小号并收集能量.js' }).then(r => this.timedUnit1 = r)
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/循环切换小号并执行能量雨收集.js' }).then(r => this.timedUnit2 = r)
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/循环切换小号用于同步数据.js' }).then(r => this.timedUnit3 = r)
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/循环切换小号并大号浇水.js' }).then(r => this.timedUnit4 = r)
  },
  template: `
  <div>
    <van-cell-group>
      <!--<switch-cell :title="getLabelByConfigKey('enable_multi_account')" v-model="configs.enable_multi_account" />-->
      <tip-block>当多个账号的名称匹配相同时，需要通过头像来区分主账号，不过还是建议使用邮箱登录来增加区分度而不是手机号登录。</tip-block>
      <van-cell :title="getLabelByConfigKey('main_account')" :value="configs.main_account" >
        <template #right-icon v-if="configs.main_account">
          <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="changeAccount">切换账号</van-button>
          <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="getAvatar">自动提取头像</van-button>
        </template>
      </van-cell>
      <base64-image-viewer title="主账号头像" v-model="configs.main_account_avatar"/>
      <switch-cell :title="getLabelByConfigKey('watering_main_account')" v-model="configs.watering_main_account" />
      <template v-if="configs.watering_main_account">
       <tip-block>默认使用大号昵称查找大号入口，如果小号首页无法找到大号则无法进行浇水，请自行获取userId以确保百分百跳转大号</tip-block>
        <switch-cell :title="getLabelByConfigKey('to_main_by_user_id')" v-model="configs.to_main_by_user_id" />
        <template v-if="configs.to_main_by_user_id">
          <tip-block>使用神秘代码直接跳转大号界面，需要获取大号的USER_ID，为2088开头的字符串，可以登录网页版支付宝，然后进入个人首页，右键查看网页源代码，搜索2088即可找到。关闭或者为空则会使用控件方式直接查找大号</tip-block>
          <van-field v-model="configs.main_userid" :label="getLabelByConfigKey('main_userid')" label-width="10em" placeholder="输入2088开头的userId" type="text" input-align="right" />
        </template>
        <van-cell :title="getLabelByConfigKey('watering_main_at')">
          <template #right-icon>
            <van-dropdown-menu active-color="#1989fa" class="cell-dropdown">
              <van-dropdown-item v-model="configs.watering_main_at" :options="waterAtOptions" @change="waterAtChanged"/>
            </van-dropdown-menu>
          </template>
        </van-cell>
      </template>
    </van-cell-group>
    <van-divider content-position="left">
      工具脚本
    </van-divider>
    <tip-block>一键操作，或者对相应文件设置每日定时任务</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeWatering">执行</van-button>unit/循环切换小号并大号浇水.js{{timedUnit4|displayTime}}</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeCollect">执行</van-button>unit/循环切换小号并收集能量.js{{timedUnit1|displayTime}}</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeRain">执行</van-button>unit/循环切换小号并执行能量雨收集.js{{timedUnit2|displayTime}}</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeWalking">执行</van-button>unit/循环切换小号用于同步数据.js{{timedUnit3|displayTime}}</tip-block>
    <van-divider content-position="left">
      管理账号
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addAccount">增加</van-button>
    </van-divider>
    <tip-block>多账号管理，用于自动执行小号收集、浇水、能量雨、同步设备步数等</tip-block>
    <tip-block>配置账号切换界面的脱敏账号和昵称并勾选一个主账号</tip-block>
    <van-radio-group v-model="configs.main_account">
      <van-cell-group>
        <div style="overflow:scroll;padding:1rem;background:#f1f1f1;">
          <van-swipe-cell v-for="(accountInfo,idx) in configs.accounts" :key="accountInfo.account" stop-propagation>
            <van-cell :title="accountInfo.account" :label="accountInfo.accountName" clickable  @click="changeMainAccount(idx)">
              <template #right-icon>
                <van-radio :name="accountInfo.account" />
              </template>
            </van-cell>
            <template #right>
              <div style="display: flex;height: 100%;">
                <van-button square type="primary" text="修改" @click="editAccount(idx)" style="height: 100%" />
                <van-button square type="danger" text="删除" @click="deleteAccount(idx)" style="height: 100%" />
              </div>
            </template>
          </van-swipe-cell>
        </div>
      </van-cell-group>
    </van-radio-group>
    <van-dialog v-model="showAddAccountDialog" title="增加账号" show-cancel-button @confirm="confirmAction" :get-container="getContainer">
    <van-field v-model="newAccountName" placeholder="请输入账号昵称，用于能量雨赠送" label="昵称" />
      <van-field v-model="newAccount" placeholder="请输入带星号的脱敏账号名称" label="账号名" />
    </van-dialog>
  </div>
  `
}
