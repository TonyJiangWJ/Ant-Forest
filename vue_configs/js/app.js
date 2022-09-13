/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 13:24:38
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-09-07 13:56:05
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
      showMenuDialog: false,
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
    },
    registerResizeWindow: function () {
      $app.registerFunction('resizeWindow', ({ height, width }) => {
        let newHeight = window.innerWidth / width * height
        if (newHeight > currentHeight) {
          currentHeight = newHeight
          console.log('设置高度为：' + newHeight)
          document.getElementById('app').style.height = currentHeight + 'px'
        }
      })
    },
    delayRegisterIfBridgeNotReady: function () {
      if ($app.mock && !$app.delay_off) {
        console.log('bridge 未完成注册 等待')
        let self = this
        setTimeout(() => {
          self.delayRegisterIfBridgeNotReady()
        }, 10)
      }
      this.registerResizeWindow()
    }
  },
  computed: {
    menuTitle: function () {
      return this.$store.getters.getTitle || '配置管理'
    }
  },
  watch: {
    '$route': function (to, from) {
      console.log('router changed from:', from.path, from.meta.index)
      console.log('router changed to:', to.path, to.meta.index)
      this.$store.commit('setIndex', to.meta.index)
      this.$store.commit('setTitle', to.meta.title || this.$store.getters.getTitleByPath(to.path))
      // this.transitionName = to.meta.index > from.meta.index ? 'view-push' : 'view-pop'
      this.transitionName = to.meta.index > from.meta.index ? 'slide-left' : 'slide-right'
      console.log('transitionName', this.transitionName)
      this.showBack = to.meta.index > 0
    },
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
    console.log('准备注册 resizeWindow ' + (typeof $app) + ' ' + (typeof $app.registerFunction) + ' is mock?' + $app.mock)
    this.delayRegisterIfBridgeNotReady()
  }
})