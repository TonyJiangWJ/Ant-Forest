
/**
 * 开发模式
 */
const DevelopConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        develop_mode: true,
        develop_saving_mode: true,
        cutAndSaveCountdown: true,
        cutAndSaveTreeCollect: true,
        saveBase64ImgInfo: true,
        enable_visual_helper: true,
        auto_check_update: true,
        clear_webview_cache: true,
        webview_loging: true,
      },
      showVConsole: window.vConsole && window.vConsole.isInited,
    }
  },
  watch: {
    showVConsole: function (newVal) {
      if (newVal) {
        window.vConsole = new VConsole()
      } else {
        window.vConsole && window.vConsole.destroy()
      }
    },
  },
  template: `
  <div>
  <van-cell-group>
    <switch-cell title="是否自动检测更新" v-model="configs.auto_check_update" />
    <switch-cell title="是否启用开发模式" v-model="configs.develop_mode" />
    <switch-cell title="是否显示VConsole" v-model="showVConsole" />
    <switch-cell title="下次打开配置时清空缓存" v-model="configs.clear_webview_cache" />
    <switch-cell title="打印webview日志" v-model="configs.webview_loging" />
    <template v-if="configs.develop_mode">
      <tip-block>脚本执行时保存图片等数据，未启用开发模式时依旧有效，请不要随意开启。部分功能需要下载master分支才能使用，release分支代码开启后可能无法正常运行</tip-block>
      <switch-cell title="是否保存倒计时图片" v-model="configs.cutAndSaveCountdown" />
      <switch-cell title="是否保存可收取能量球图片" v-model="configs.cutAndSaveTreeCollect" />
      <switch-cell title="是否保存一些开发用的数据" v-model="configs.develop_saving_mode" />
      <switch-cell title="是否倒计时图片base64" v-model="configs.saveBase64ImgInfo" />
      <switch-cell title="是否启用可视化辅助工具" v-model="configs.enable_visual_helper" />
    </template>
  </van-cell-group>
  </div>`
}