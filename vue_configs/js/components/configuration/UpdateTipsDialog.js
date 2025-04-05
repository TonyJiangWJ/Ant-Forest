const UpdateTipsDialog = {
  name: 'UpdateTipsDialog',
  mixins: [mixin_common],
  data () {
    return {
      doNotAsk: false,
      showDialog: false,
    }
  },
  watch: {
    showDialog: function () {
      if (this.doNotAsk) {
        localStorage.setItem('doNotAskUpdate', true)
      }
    }
  },
  mounted () {
    if (localStorage.getItem('doNotAskUpdate') || sessionStorage.getItem('hadShownUpdateTips')) {
      return
    }
    sessionStorage.setItem('hadShownUpdateTips', true)
    this.showDialog = true
  },
  template: `
  <van-dialog v-model="showDialog" title="脚本说明" :show-confirm-button="true" close-on-click-overlay
  get-container="getContainer">
    <div style="overflow: scroll;padding: 2rem;">
      <van-cell-group>
        <div>运行 update/检查更新.js 可以在线更新脚本。也可以点击右上角的<van-icon class="menu-reference icon-settings" style="margin: 0 0.5rem"/>图标调出菜单，点击更新脚本进行更新。</div>
        <div>脚本常见问题可以进入<span style="margin: 0 0.2rem;box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 5px;background:#dddddd;">常见问题</span>菜单进行查看。未包含的问题请自己前往Github查看历史issues寻找是否有相应问题的解决方案。
        或者也可以加群询问，加群入口在<span style="margin: 0 0.2rem;box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 5px;background:#dddddd;">关于项目</span>里面，或者访问论坛查看：https://autoscripts.flarum.cloud</div>
        <div>部分功能说明可能只写在更新历史中，可以在关于项目中查看历史更新记录。</div>
        <van-checkbox v-model="doNotAsk" shape="square" style="padding-top: 2rem;">不再提示</van-checkbox>
      </van-cell-group>
    </div>
  </van-dialog>
  `
}

const AnnouncementDialog = {
  name: 'AnnouncementDialog',
  mixins: [mixin_common],
  data () {
    return {
      announcement: '脚本通知',
      announcedAt: '',
      doNotAsk: false,
      showAnnouncementDialog: false,
    }
  },
  watch: {
    showAnnouncementDialog: function () {
      if (this.doNotAsk) {
        for (let i = 0; i < localStorage.length; i++) {
          let key = localStorage.key(i);
          if (key.startsWith('doNotShowAnnounce')) {
            localStorage.removeItem(key)
          }
        }
        localStorage.setItem(this.localStorageKey, true)
      }
      if (!this.showAnnouncementDialog) {
        sessionStorage.setItem('hadShownAnnouncement', true)
      }
    }
  },
  methods: {
    checkAnnouncement: function () {
      API.get('https://tonyjiang.hatimi.top/mutual-help/announcement', {
        params: {
          category: 'ant-forest'
        }
      }).then(resp => {
        if (resp.announcement) {
          let data = resp.announcement
          this.announcedAt = data.updatedAt
          this.announcement = data.text
          if (localStorage.getItem(this.localStorageKey)) {
            return
          }
          this.showAnnouncementDialog = true
        }
      }).catch(e => {
        if (e.response && e.response.data && e.response.data.error) {
          sessionStorage.setItem('hadShownAnnouncement', true)
        }
      })
    }
  },
  computed: {
    localStorageKey: function () {
      return 'doNotShowAnnounce' + this.announcedAt
    }
  },
  mounted () {
    if (sessionStorage.getItem('hadShownAnnouncement')) {
      return
    }
    this.checkAnnouncement()
  },
  template: `
  <van-dialog v-model="showAnnouncementDialog" title="脚本通知" :show-confirm-button="true" close-on-click-overlay
  get-container="getContainer">
    <van-cell-group>
      <div style="overflow: scroll;">
        <van-cell-group>
          <div style="padding: 1rem;font-size:0.4rem;color: gray;">发布时间：{{announcedAt}}</div>
          <div style="padding: 0rem 1rem 1rem 1rem;" >{{announcement}}</div>
        </van-cell-group>
      </div>
      <div style="padding: 0 1rem 1rem;">
        <van-checkbox v-model="doNotAsk" shape="square" style="padding-top: 1rem;">不再提示</van-checkbox>
      </div>
    </van-cell-group>
  </van-dialog>
  `
}