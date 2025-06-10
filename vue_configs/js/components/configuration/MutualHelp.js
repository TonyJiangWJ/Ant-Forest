
/**
 * 扭蛋互助
 */
const MutualHelp = {
  mixins: [mixin_common],
  data () {
    return {
      category: 'forestTreasureHunt',
      deviceId: '11234',
      text: '',
      getText: '',
      myText: '',
      updatedAt: '',
      expiredAt: '',
      remainDays: '',
      dailyCount: 0,
      invalidCount: 0,
      total: 0,
      url: 'https://tonyjiang.hatimi.top/mutual-help',
      loading: false,
      uploading: false,
      showAnnouncementDialog: false,
      doNotAsk: false,
      announcement: '',
      announcedAt: '',
    }
  },
  methods: {
    upload () {
      if (!this.text) {
        vant.Toast.fail('请先输入你的互助码')
        return
      }
      this.uploading = true
      API.post(this.url + '/upload', {
        deviceId: this.deviceId,
        category: this.category,
        text: this.text
      }).then(resp => {
        vant.Toast.success('上传成功')
        this.getMine()
        this.uploading = false
      }).catch(e => {
        this.uploading = false
        if (e.response && e.response.data && e.response.data.error) {
          vant.Toast.fail('上传失败，' + e.response.data.error)
          return
        }
        vant.Toast.fail('上传失败，请稍后重试')
      })
    },
    confirmUsed () {
      this.$dialog.confirm({
        title: '是否确认已使用过',
        message: '确认的话将在1天内不再显示这个好友的互助码'
      }).then(() => {
        API.post(this.url + '/used', {
          category: this.category,
          deviceId: this.deviceId,
          text: this.getText,
        }).then(resp => {
          this.getText = ''
        }).catch(e => {
          if (e.response && e.response.data && e.response.data.error) {
            vant.Toast.fail("操作失败：" + e.response.data.error)
            return
          }
          vant.Toast.faild('标记失败，请稍后重试')
        })
      })
    },
    getMine () {
      API.get(this.url + "/mine", {
        params: {
          deviceId: this.deviceId,
          category: this.category
        }
      }).then(resp => {
        console.log('get mine:', resp)
        let record = resp.record
        if (record) {
          this.myText = record.text
          this.updatedAt = record.updatedAt
          this.dailyCount = record.dailyCount
          this.invalidCount = record.invalidCount
          this.expiredAt = record.expiredAt
          this.remainDays = record.remainDays
        }
      }).catch(e => { })
    },
    getTotalAvailable () {
      API.get(this.url + '/count', {
        params: {
          category: this.category,
          deviceId: this.deviceId
        }
      }).then(resp => {
        this.total = resp.count
      })
    },
    openByAlipay: function () {
      if (!this.getText) {
        return
      }
      $nativeApi.request('copyAndOpen', { text: this.getText, urlSchema: 'alipays://platformapi/startapp?appId=20001003&keyword=' + encodeURI(this.getText) + '&v2=true', packageName: 'com.eg.android.AlipayGphone' })
    },
    randomGet () {
      this.loading = true
      API.get(this.url + '/random', {
        params: {
          deviceId: this.deviceId,
          category: this.category,
        }
      }).then(resp => {

        this.loading = false
        if (resp) {
          console.log('resp:', JSON.stringify(resp))
          if (resp.record) {
            this.getText = resp.record.text
            this.total = resp.total
            this.$dialog.confirm({
              message: '是否通过支付宝打开？'
            }).then(() => {
              this.openByAlipay()
            }).catch(() => {
              $nativeApi.request('copyText', { text: this.getText })
              vant.Toast.success('互助码获取成功，已复制到剪切板')
            })
            return
          }
        }
        vant.Toast.fail('提取数据失败，请稍后重试')
      }).catch(e => {
        let append = ''
        if (e.response) {
          append = e.response.data.error
        }
        vant.Toast.fail('请求失败' + append);
        this.loading = false
      })
    },
    markInvalid () {
      this.$dialog.confirm({
        title: '是否提交报告这个互助码无效',
        message: '多人报告无效后，将移除这个好友的互助码，请勿随便提交无效'
      }).then(() => {
        API.post(this.url + '/invalid', {
          category: this.category,
          deviceId: this.deviceId,
          text: this.getText,
        }).then(resp => {
          this.getText = ''
        }).catch(e => {
          if (e.response && e.response.data && e.response.data.error) {
            vant.Toast.fail("操作失败：" + e.response.data.error)
            return
          }
          vant.Toast.faild('标记失败，请稍后重试')
        })
      })
    },
    getDeviceId: function () {
      $nativeApi.request('getDeviceId', {}).then(resp => {
        this.deviceId = resp.deviceId
        this.getMine()
        this.getTotalAvailable()
      })
    },
    getAnnouncement: function () {
      if (sessionStorage.getItem('doNotShowMutualAnn')) {
        return
      }
      API.get(this.url + '/announcement', {
        params: {
          category: this.category
        },
      }).then(resp => {
        if (resp.announcement) {
          let data = resp.announcement
          this.announcedAt = data.updatedAt
          if (localStorage.getItem(this.localStorageKey)) {
            return
          }
          this.announcement = data.text
          this.showAnnouncementDialog = true
        }
      }).catch(e => { })
    },
  },
  watch: {
    showAnnouncementDialog: function () {
      if (this.doNotAsk) {
        for (let i = 0; i < localStorage.length; i++) {
          let key = localStorage.key(i);
          if (key.startsWith('doNotShowMutualAnnounce')) {
            localStorage.removeItem(key)
          }
        }
        localStorage.setItem(this.localStorageKey, true)
      }
      if (!this.showAnnouncementDialog) {
        sessionStorage.setItem('doNotShowMutualAnn', true)
      }
    }
  },
  computed: {
    hasUploaded: function () {
      console.log('check has uploaded', !!this.myText)
      return !!this.myText
    },
    localStorageKey: function () {
      return 'doNotShowAnnounce' + this.announcedAt
    }
  },
  mounted () {
    if ($app.mock) {
      this.url = 'http://localhost:4324'
      this.getText = 'B:/kIAwEt754fv 或💪.f.u 置💪此消息打开支付宝搜🔍，来森林抽1吨能量  U:/n MF0765 2020/06/12'
      this.getMine()
      this.getTotalAvailable()
    }
    this.getDeviceId()
    this.getAnnouncement()
  },
  template: `
  <div>
    <van-cell-group>
      <tip-block>处理过的口令码可以在获取后直接通过支付宝打开。如果是https链接的，需要通过浏览器打开获取到互助码，再去支付宝搜索，否则直接进入支付宝会没有响应。</tip-block>
      <tip-block>目前每天可以能帮他人助力6次，如果当前获取的口令无效，请重新获取另一个。</tip-block>
      <tip-block>当前可用总数：{{total}}</tip-block>
      <van-field
        v-model="getText"
        rows="1"
        autosize
        label="互助码"
        type="textarea"
        readonly
      />
      <div style="display: flex;padding: 1rem;flex-direction: column;justify-content: center;gap: 0.5rem;">
        <van-button plain type="info" @click="randomGet" :loading="loading">随机获取一个互助码</van-button>
        <van-button plain type="primary" v-if="!!this.getText" @click="openByAlipay" :loading="loading">通过支付宝打开</van-button>
        <van-button plain type="warning" confirmUsed v-if="!!this.getText" @click="confirmUsed" :loading="loading">我已使用</van-button>
        <van-button plain type="danger" v-if="!!this.getText" @click="markInvalid" :loading="loading">标记失效</van-button>
      </div>
      <tip-block>打开森林寻宝活动页面，然后点击邀请好友助力，跳转微信后互助码就在剪贴板了，回到当前页面粘贴到下面进行上传即可。后续其他人可以通过这个功能获取到你的互助码，这样就能互相助力了。</tip-block>
      <tip-block>口令有效期只有三天，所以上传完之后，三天内没有更新的会被删除，请不定期更新一下自己的口令码，新上传的将自动覆盖旧口令。</tip-block>
      <van-field
        v-model="text"
        rows="1"
        autosize
        label="上传互助码"
        type="textarea"
        :error-message="validationError.text"
        placeholder="请输入互助码"
      />
      <div style="display:grid;padding:1rem;text-align=center;">
        <van-button plain type="primary" style="margin:0.5rem 1rem;" @click="upload" :loading="uploading">上传</van-button>
      </div>
      <div v-if="hasUploaded">
        <van-field readonly autosize rows="1" label="我的口令" type="textarea" v-model="myText"/>
        <van-field readonly autosize rows="1" label-width="7rem" label="最后更新时间" type="textarea" v-model="updatedAt"/>
        <van-field readonly autosize rows="1" label-width="7rem" label="过期时间" type="textarea" v-model="expiredAt"/>
        <tip-block>被获取了不一定被使用，这里仅供参考。</tip-block>
        <van-field readonly autosize rows="1" label-width="7rem" label="当日被获取次数" type="textarea" v-model="dailyCount"/>
        <tip-block :tip-font-color="invalidCount > 0 ? 'red' : 'gray'">如果三人及以上提交无效，当前口令将被删除，请重新上传新的口令。</tip-block>
        <van-field readonly autosize rows="1" label-width="7rem" label="报告无效的次数" type="textarea" v-model="invalidCount"/>
      </div>

    </van-cell-group>
    <van-dialog v-model="showAnnouncementDialog" title="公告信息" :show-confirm-button="true"
      close-on-click-overlay get-container="getContainer">
      <div style="overflow: scroll;">
        <van-cell-group>
          <div style="padding: 1rem;font-size:0.4rem;color: gray;">发布时间：{{announcedAt}}</div>
          <div style="padding: 0rem 1rem 1rem 1rem;" >{{announcement}}</div>
        </van-cell-group>
      </div>
      <div style="padding: 0 1rem 1rem;">
        <van-checkbox v-model="doNotAsk" shape="square" style="padding-top: 1rem;">不再提示</van-checkbox>
      </div>
    </van-dialog>
  </div>
  `
}
