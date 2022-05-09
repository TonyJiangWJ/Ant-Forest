/**
 * 支付宝多账号管理
 */
const AlipayAccountManage = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        enable_multi_account: false,
        main_account: '',
        accounts: [{ account: 'a', accountName: '小A' }]
      },
      showAddAccountDialog: false,
      isEdit: false,
      newAccount: '',
      newAccountName: '',
      editIdx: '',
      editMain: false,
      timedUnit1: 'test',
      timedUnit2: '',
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
    },
    changeAccount: function () {
      $app.invoke('changeAlipayAccount', { account: this.configs.main_account })
    },
    executeRain: function () {
      $app.invoke('executeRainCycle')
    },
    executeCollect: function () {
      $app.invoke('executeCollectCycle')
    }
  },
  filters: {
    displayTime: value => {
      if (value) {
        return `[${value}]`
      }
      return ''
    }
  },
  mounted () {
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/循环切换小号并收集能量.js' }).then(r => this.timedUnit1 = r)
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/循环切换小号并执行能量雨收集.js' }).then(r => this.timedUnit2 = r)
  },
  template: `
  <div>
    <van-cell-group>
      <!--<switch-cell title="是否启用多账号切换" v-model="configs.enable_multi_account" />-->
      <van-cell title="当前主账号" :value="configs.main_account" >
        <template #right-icon v-if="configs.main_account">
          <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="changeAccount">切换账号</van-button>
        </template>
      </van-cell>
    </van-cell-group>
    <tip-block>一键操作，或者对相应文件设置每日定时任务</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeRain">执行</van-button>unit/循环切换小号并收集能量.js{{timedUnit1|displayTime}}</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeCollect">执行</van-button>unit/循环切换小号并执行能量雨收集.js{{timedUnit2|displayTime}}</tip-block>
    <van-divider content-position="left">
      管理账号
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addAccount">增加</van-button>
    </van-divider>
    <tip-block>多账号管理，用于自动执行小号收集、浇水[暂不支持]、能量雨等</tip-block>
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