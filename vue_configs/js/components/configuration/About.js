const About = {
  data () {
    return {
      version: 'develop_version',
    }
  },
  methods: {
    openGithubUrl: function () {
      console.log('点击url')
      $app.invoke('openUrl', { url: 'https://github.com/TonyJiangWJ/Ant-Forest' })
    },
    openGiteeUrl: function () {
      $app.invoke('openUrl', { url: 'https://gitee.com/TonyJiangWJ/Ant-Forest' })
    },
    openDevelopMode: function () {
      this.$router.push('/about/develop')
    },
    checkForUpdate: function () {
      $app.invoke('downloadUpdate')
    },
  },
  mounted () {
    window.$nativeApi.request('getLocalVersion').then(r => {
      this.version = r.versionName
    })
  },
  template: `
  <div class="about">
    <van-cell-group>
      <van-cell title="版本" :value="version"/>
      <van-cell title="检测更新" value="点击更新" @click="checkForUpdate"/>
      <van-cell title="作者" value="TonyJiangWJ"/>
      <van-cell title="Email" value="TonyJiangWJ@gmail.com"/>
      <van-cell title="QQ交流群" value="524611323"/>
      <van-cell title="Github" value="TonyJiangWJ/Ant-Forest" @click="openGithubUrl"/>
      <van-cell title="Gitee" value="TonyJiangWJ/Ant-Forest" @click="openGiteeUrl"/>
      <van-cell title="开发模式" @click="openDevelopMode" is-link />
    </van-cell-group>
    <tip-block>本脚本免费使用，更新渠道只有Github和Gitee，请不要被其他引流渠道欺骗了</tip-block>
  </div>
  `
}