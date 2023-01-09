const UpdateTipsDialog = {
  name: 'UpdateTipsDialog',
  mixins: [mixin_common],
  data() {
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
  mounted() {
    if (localStorage.getItem('doNotAskUpdate') || sessionStorage.getItem('hashShownUpdateTips')) {
      return
    }
    sessionStorage.setItem('hashShownUpdateTips', true)
    this.showDialog = true
  },
  template: `
  <van-dialog v-model="showDialog" title="脚本说明" :show-confirm-button="true" close-on-click-overlay
  get-container="getContainer">
    <div style="overflow: scroll;padding: 2rem;">
      <van-cell-group>
        <div>运行 update/检查更新.js 可以在线更新脚本。也可以点击右上角的<van-icon class="menu-reference icon-settings" style="margin: 0 0.5rem"/>图标调出菜单，点击更新脚本进行更新。</div>
        <div>脚本常见问题可以进入最底下的<span style="margin: 0 0.2rem;box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 5px;background:#dddddd;">常见问题</span>菜单进行查看。未包含的问题请自己前往Github查看历史issues寻找是否有相应问题的解决方案。
        或者也可以加群询问，加群入口在<span style="margin: 0 0.2rem;box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 5px;background:#dddddd;">关于项目</span>里面，部分功能说明可能只写在更新历史中，可以在关于项目中查看历史更新记录</div>
        <van-checkbox v-model="doNotAsk" shape="square" style="padding-top: 2rem;">不再提示</van-checkbox>
      </van-cell-group>
    </div>
  </van-dialog>
  `
}