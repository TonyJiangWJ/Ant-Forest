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
        main_account_username: '',
        accounts: [{ account: 'a', accountName: '小A' }],
        main_userid: '',
        to_main_by_user_id: true,
        watering_main_account: true,
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
      $app.invoke('changeAlipayAccount', { account: this.configs.main_account })
    },
    executeCollect: function () {
      $app.invoke('executeTargetScript', '/unit/循环切换小号并收集能量.js')
    },
    executeRain: function () {
      $app.invoke('executeTargetScript', '/unit/循环切换小号并执行能量雨收集.js')
    },
    executeWalking: function () {
      $app.invoke('executeTargetScript', '/unit/循环切换小号用于同步数据.js')
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
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/循环切换小号用于同步数据.js' }).then(r => this.timedUnit3 = r)
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
      <switch-cell title="小号收集完成后对大号浇水" v-model="configs.watering_main_account" />
      <template v-if="configs.watering_main_account">
        <switch-cell title="使用userid跳转大号" v-model="configs.to_main_by_user_id" />
        <template v-if="configs.to_main_by_user_id">
          <tip-block>使用神秘代码直接跳转大号界面，需要获取大号的USER_ID，为2088开头的字符串，可以登录网页版支付宝，然后进入个人首页，右键查看网页源代码，搜索2088即可找到。关闭或者为空则会使用控件方式直接查找大号</tip-block>
          <van-field v-model="configs.main_userid" label="主账号USERID" label-width="10em" placeholder="输入2088开头的userId" type="text" input-align="right" />
        </template>
      </template>
    </van-cell-group>
    <van-divider content-position="left">
      工具脚本
    </van-divider>
    <tip-block>一键操作，或者对相应文件设置每日定时任务</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeCollect">执行</van-button>unit/循环切换小号并收集能量.js{{timedUnit1|displayTime}}</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeRain">执行</van-button>unit/循环切换小号并执行能量雨收集.js{{timedUnit2|displayTime}}</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeWalking">执行</van-button>unit/循环切换小号用于同步数据.js{{timedUnit3|displayTime}}</tip-block>
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

const WalkingData = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        walking_accounts: [{ account: 'a', password: '小A', randomRange: '' }],
        pushplus_token: '',
        pushplus_walking_data: true,
      },
      showAddAccountDialog: false,
      isEdit: false,
      newAccount: '',
      newPassword: '',
      randomRange: '18000-25000',
      editIdx: '',
      timedUnit1: 'test',
    }
  },
  methods: {
    addAccount: function () {
      this.newAccount = ''
      this.newPassword = ''
      this.randomRange = '18000-25000'
      this.showAddAccountDialog = true
      this.isEdit = false
    },
    editAccount: function (idx) {
      let target = this.configs.walking_accounts[idx]
      this.editIdx = idx
      this.isEdit = true
      this.newAccount = target.account
      this.newPassword = target.password
      this.randomRange = target.randomRange || '18000-25000'
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
      if (this.isNotEmpty(this.newAccount) && this.isNotEmpty(this.newPassword) && this.configs.walking_accounts.map(v => v.account).indexOf(this.newAccount) < 0) {
        this.configs.walking_accounts.push({ account: this.newAccount, password: this.newPassword, randomRange: this.randomRange })
      }
    },
    doEditAccount: function () {
      if (this.isNotEmpty(this.newAccount) && this.isNotEmpty(this.newPassword)) {
        let newAccount = this.newAccount
        let editIdx = this.editIdx
        if (this.configs.walking_accounts.filter((v, idx) => v.account == newAccount && idx != editIdx).length > 0) {
          return
        }
        this.configs.walking_accounts[editIdx] = { account: this.newAccount, password: this.newPassword, randomRange: this.randomRange }
      }
    },
    deleteAccount: function (idx) {
      this.$dialog.confirm({
        message: '确认要删除' + this.configs.walking_accounts[idx].account + '吗？'
      }).then(() => {
        this.configs.walking_accounts.splice(idx, 1)
        if (this.configs.walking_accounts.map(v => v.account).indexOf(this.configs.main_account) < 0) {
          this.configs.main_account = ''
        }
      }).catch(() => { })
    },
    executeWalkingData: function () {
      $app.invoke('executeTargetScript', '/unit/小米运动刷步数.js')
    },
  },
  filters: {
    displayTime: value => {
      if (typeof value === 'string') {
        return `[${value}]`
      }
      return ''
    }
  },
  mounted () {
    $nativeApi.request('queryTargetTimedTaskInfo', { path: '/unit/小米运动刷步数.js' }).then(r => this.timedUnit1 = r)
  },
  template: `
  <div>
    <van-cell-group>
      <switch-cell title="完成后是否推送步数结果" title-style="flex:3;"  v-model="configs.pushplus_walking_data" />
      <template v-if="configs.pushplus_walking_data">
        <tip-block>完成后通过pushplus推送消息，发送每个账号刷了多少步数，请前往官网获取token</tip-block>
        <van-field v-model="configs.pushplus_token" label="pushplusToken" label-width="10em" placeholder="输入token" type="text" input-align="right" />
      </template>
    </van-cell-group>
    <van-divider content-position="left">
      工具脚本
    </van-divider>
    <tip-block>一键操作，或者对相应文件设置每日定时任务</tip-block>
    <tip-block><van-button plain hairline type="primary" size="mini" style="margin-right: 0.3rem;" @click="executeWalkingData">执行</van-button>unit/小米运动刷步数.js{{timedUnit1|displayTime}}</tip-block>
    <van-divider content-position="left">
      管理账号
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addAccount">增加</van-button>
    </van-divider>
    <van-cell-group>
      <div style="overflow:scroll;padding:1rem;background:#f1f1f1;">
        <van-swipe-cell v-for="(accountInfo,idx) in configs.walking_accounts" :key="accountInfo.account" stop-propagation>
          <van-cell :title="accountInfo.account" :label="accountInfo.randomRange">
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
    <tip-block>下载小米运动APP 现在名字叫 Zepp Life<br/>
    注册账号 手机号可以直接注册 邮箱的需要选择地区为 其他<br/>
    脚本中保存密码并不安全，建议使用邮箱注册并设置不常用的密码<br/>
    注册登录后这一步非常重要 否则刷的步数无意义：登录后进入APP的第三方接入 绑定到支付宝。一个小米运动账号可绑定多个支付宝，建议一对一绑定 可以控制步数<br/>
    然后配置一下用户名密码 手机号的需要增加+86前缀 邮箱的不需要<br/>
    运行刷步数脚本即可自动刷步数数据 如果不需要随机的步数将min和max改成相同即可 或者可以将范围改大一些<br/>
    运行完毕后APP将会被踢出登录，先试一下 数据能到支付宝之后就可以将APP卸载，后续每天修改步数后都会通过华米自有协议同步到支付宝中不再需要打开APP<br/>
    对刷步数脚本设置一个每日自动执行的定时任务即可每天自动刷步数了 建议时间为晚上</tip-block>
    
    <van-dialog v-model="showAddAccountDialog" title="增加账号" show-cancel-button @confirm="confirmAction" :get-container="getContainer">
      <van-field v-model="newAccount" placeholder="请输入账号手机号请加+86" label="账号名" />
      <van-field v-model="newPassword" type="password" placeholder="请输入密码" label="密码" />
      <van-field v-model="randomRange" type="text" placeholder="请输入随机范围" label="随机范围" />
    </van-dialog>
  </div>
  `
}