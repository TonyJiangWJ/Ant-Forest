/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 13:24:38
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-02 23:38:01
 * @Description: 
 */

Vue.use(vant);
let app = new Vue({
  router,
  store,
  el: '#app',
  data () {
    return {
      resourcePath: 'unknown',
      message: '',
      transitionName: 'view-pop',
      false: true,
      showBack: this.$route.path != '/',
      showMenuDialog: false
    }
  },
  methods: {
    invokeAutojsToast: function () {
      this.message = '点击触发toast'
      console.log('点击触发 toast')
      $app.invoke('toastLog', { message: 'Hello, this is from H5.' })
      this.message = '点击触发toast'
    },
    invokeAutojsCallback: function () {
      $app.invoke('callback', { message: 'invoke callback' }, (data) => {
        this.message = data.message
      })
    },
    clickedMenu: function (e) {
      e.stopPropagation()
      this.showMenuDialog = true
    },
    onClickBack: function () {
      this.$router.back()
    },
    resetDefaultConfigs: function () {
      $app.invoke('resetConfigs')
    },
    exportConfigs: function () {
      $app.invoke('exportConfigs')
    },
    restoreConfigs: function () {
      $app.invoke('restoreConfigs')
    },
    exportRuntimeStorage: function () {
      $app.invoke('exportRuntimeStorage')
    },
    restoreRuntimeStorage: function () {
      $app.invoke('restoreRuntimeStorage')
    },
    doUpdate: function () {
      $app.invoke('downloadUpdate')
    },
    getDialogContainer: function () {
      return document.querySelector('html')
    }
  },
  watch: {
    '$route': function (to, from) {
      console.log('router changed from:', from.path, from.meta.index)
      console.log('router changed to:', to.path, to.meta.index)
      // this.transitionName = to.meta.index > from.meta.index ? 'view-push' : 'view-pop'
      this.transitionName = to.meta.index > from.meta.index ? 'slide-left' : 'slide-right'
      console.log('transitionName', this.transitionName)
      this.showBack = to.meta.index > 0
    }
  },
  mounted () {
    this.$store.commit('setIndex', 1)
    setTimeout(function () {
      console.log('mounted currentHeight:', currentHeight, 'window height:', window.innerHeight)
      if (window.innerHeight > currentHeight) {
        currentHeight = window.innerHeight
        document.getElementById('app').style.height = currentHeight + 'px'
      }
    }, 1200)
    $app.registerFunction('resizeWindow', ({ height, width }) => {
      console.log('resizeWindow currentHeight:', currentHeight, 'window height:', window.innerHeight, 'webview height', height)
      console.log('resizeWindow window width:', window.innerWidth, 'webview width', width)
      console.log('body client height:', document.body.getBoundingClientRect().height)
      let newHeight = window.innerWidth / width * height
      if (newHeight > currentHeight) {
        currentHeight = newHeight
        console.log('设置高度为：' + newHeight)
        document.getElementById('app').style.height = currentHeight + 'px'
      }
    })
  }
})