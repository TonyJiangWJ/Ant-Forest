
/**
 * 关于项目
 */
const About = {
  data () {
    return {
      version: 'develop_version',
      githubUrl: '',
      giteeUrl: '',
      qq_group: '',
      qq_group_url: '',
      forum_url: '',
    }
  },
  methods: {
    openGithubUrl: function () {
      console.log('点击url')
      $app.invoke('openUrl', { url: this.githubUrl })
    },
    openGiteeUrl: function () {
      console.log('点击url')
      $app.invoke('openUrl', { url: this.giteeUrl })
    },
    openDevelopMode: function () {
      this.$router.push('/about/develop')
    },
    checkForUpdate: function () {
      $app.invoke('downloadUpdate')
    },
    openQQGroup: function () {
      if (this.qq_group_url) {
        $app.invoke('openUrl', { url: this.qq_group_url })
      }
    },
    showReleases: function () {
      this.$router.push('/about/releases')
    },
    openForum: function () {
      if (this.forum_url) {
        $app.invoke('openUrl', { url: this.forum_url })
      }
    }
  },
  computed: {
    githubShort: function () {
      if (this.githubUrl) {
        return this.githubUrl.replace(/https:\/\/(\w+\.)\w+\//, '')
      }
      return ''
    },
    giteeShort: function () {
      if (this.giteeUrl) {
        return this.giteeUrl.replace(/https:\/\/(\w+\.)\w+\//, '')
      }
      return ''
    }
  },
  mounted () {
    window.$nativeApi.request('getLocalVersion').then(r => {
      this.version = r.versionName
    })
    window.$nativeApi.request('loadConfigs').then(config => {
      this.githubUrl = config.github_url
      this.giteeUrl = config.gitee_url
      this.qq_group = config.qq_group
      this.qq_group_url = config.qq_group_url
    })
  },
  template: `
  <div class="about">
    <van-cell-group>
      <van-cell :title="getLabelByConfigKey('version')" :value="version"/>
      <van-cell title="检测更新" value="点击更新" @click="checkForUpdate"/>
      <van-cell title="更新历史" value="点击查看" @click="showReleases"/>
      <van-cell title="作者" value="TonyJiangWJ"/>
      <van-cell title="Email" value="TonyJiangWJ@gmail.com"/>
      <van-cell v-if="qq_group" :title="getLabelByConfigKey('qq_group')" :value="qq_group" @click="openQQGroup"/>
      <van-cell value-class="long-value" v-if="forum_url" title="论坛" :value="forum_url" @click="openForum"/>
      <van-cell value-class="long-value" v-if="githubShort" title="Github" :value="githubShort" @click="openGithubUrl"/>
      <van-cell value-class="long-value" v-if="giteeShort" title="Gitee" :value="giteeShort" @click="openGiteeUrl"/>
      <van-cell title="开发模式" @click="openDevelopMode" is-link />
    </van-cell-group>
    <tip-block>本脚本免费使用，更新渠道只有Github<template v-if="giteeShort">和Gitee</template>，请不要被其他引流渠道欺骗了</tip-block>
  </div>
  `
}


const Sponsor = {
  mixins: [mixin_common],
  data () {
    return {
      category: 'hongbao',
      deviceId: '11234',
      url: 'https://tonyjiang.hatimi.top/mutual-help',
      loading: false,
      announcement: '',
      announcedAt: '',
      showAnnouncementDialog: false,
    }
  },
  methods: {
    getDeviceId: function () {
      $nativeApi.request('getDeviceId', {}).then(resp => {
        this.deviceId = resp.deviceId
        this.getMine()
        this.getTotalAvailable()
      })
    },
    getAnnouncement: function () {
      API.get(this.url + '/announcement', {
        params: {
          category: this.category,
          deviceId: this.deviceId,
        },
      }).then(resp => {
        if (resp.announcement) {
          let data = resp.announcement
          this.announcedAt = data.updatedAt
          this.announcement = data.text
          this.showAnnouncementDialog = true
        }
      }).catch(e => { })
    },
    openByAlipay: function () {
      if (!this.announcement) {
        return
      }
      $nativeApi.request('copyAndOpen', { text: this.announcement, urlSchema: 'alipays://platformapi/startapp?appId=20001003&keyword=' + encodeURI(this.announcement) + '&v2=true', packageName: 'com.eg.android.AlipayGphone' })
    },
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
    this.getDeviceId()
  },
  template: `
  <div>
    <van-cell-group>
      <tip-block>获取红包码，使用红包后作者每一个大概能获取一分钱收益。赞助作者，让作者更有动力开发。</tip-block>
      <tip-block>也可以直接运行 unit/支持作者.js 来快速获取红包码。如果你不嫌烦的话可以给 unit/支持作者自动版.js 设置定时任务，每天自动领取。</tip-block>
      <van-field
        v-model="announcement"
        rows="1"
        autosize
        label="红包码"
        type="textarea"
        readonly
      />
      <div style="display: flex;padding: 1rem;flex-direction: column;justify-content: center;gap: 0.5rem;">
        <van-button plain type="info" @click="getAnnouncement" :loading="loading">获取红包码</van-button>
        <van-button plain type="primary" v-if="!!this.announcement" @click="openByAlipay" :loading="loading">通过支付宝打开</van-button>
      </div>
    </van-cell-group>
  </div>
  `
}