/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 13:24:38
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-25 21:31:29
 * @Description: 
 */

Vue.use(vant);
let app = new Vue({
  router,
  el: '#app',
  data () {
    return {
      resourcePath: 'unknown',
      message: '',
      activeTab: '1',
      showMenuDialog: false,
      clientHeight: 0
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
    getDialogContainer: function () {
      return document.querySelector('html')
    },
    back: function () {
      this.$router.back()
    }
  },
  mounted() {
    // vant.Toast('vue加载完成');
    let self = this
    setTimeout(function () {
      self.clientHeight = document.querySelector('html').clientHeight
      console.log('client-height:' + self.clientHeight)
    }, 200)
    $app.registerFunction('clickBack', this.back)
    // document.getElementById('app').style.minHeight = this.clientHeight + 'px'
  }
})