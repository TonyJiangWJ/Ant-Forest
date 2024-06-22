
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
