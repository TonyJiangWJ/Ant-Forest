
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
        save_yolo_train_data: true,
        sea_ball_train_save_data: true,
        save_home_train_data: true,
        save_no_energy_train_data: true,
        enable_visual_helper: true,
        auto_check_update: true,
        clear_webview_cache: true,
        webview_loging: true,
        enable_websocket_hijack: true,
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
    <switch-cell title="是否开启websocket监控" v-model="configs.enable_websocket_hijack" />
    <switch-cell title="是否启用开发模式" v-model="configs.develop_mode" />
    <switch-cell title="是否显示VConsole" v-model="showVConsole" />
    <switch-cell title="下次打开配置时清空缓存" v-model="configs.clear_webview_cache" />
    <switch-cell title="打印webview日志" v-model="configs.webview_loging" />
    <template v-if="configs.develop_mode">
      <tip-block>脚本执行时保存图片等数据，未启用开发模式时依旧有效，请不要随意开启。部分功能需要下载master分支才能使用，release分支代码开启后可能无法正常运行</tip-block>
      <switch-cell title="是否保存一些开发用的数据" v-model="configs.develop_saving_mode" />
      <switch-cell title="是否启用可视化辅助工具" v-model="configs.enable_visual_helper" />
      <switch-cell title="是否保存YOLO训练用的数据" v-model="configs.save_yolo_train_data" />
      <template v-if="!configs.save_yolo_train_data">
      <div style="padding-left: 10px;">
        <switch-cell title="是否保存神奇海洋训练用数据" v-model="configs.sea_ball_train_save_data" />
        <switch-cell title="是否保存首页训练用数据" v-model="configs.save_home_train_data" />
        <switch-cell title="是否保存能量收取失败数据" v-model="configs.save_no_energy_train_data" />
        <switch-cell title="是否保存一键收数据" v-model="configs.save_one_key_train_data" />
        <switch-cell title="是否保存一键收失败数据" v-model="configs.save_one_key_fail_train_data" />
      </div>
      </template>
    </template>
  </van-cell-group>
  </div>`
}