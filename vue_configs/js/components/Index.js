let Index = {
  mixins: [mixin_methods],
  data: function () {
    return {
      menuItems: [
        {
          title: '锁屏设置',
          link: '/basic/lock'
        },
        {
          title: '能量雨设置',
          link: '/basic/rain'
        },
        {
          title: '收集设置',
          link: '/basic/collect'
        },
        {
          title: '图像识别相关设置',
          link: '/advance/region'
        },
        {
          title: '好友保护罩使用记录',
          link: '/advance/protect'
        },
        {
          title: '白名单设置',
          link: '/advance/white'
        },
        {
          title: '浇水回馈设置',
          link: '/advance/water'
        },
        {
          title: '悬浮窗设置',
          link: '/basic/floaty'
        },
        {
          title: '日志设置',
          link: '/basic/log'
        },
        {
          title: '前台应用白名单设置',
          link: '/advance/skipPackage'
        },
        {
          title: '高级设置',
          link: '/advance/common'
        },
        // {
        //   title: '基础设置',
        //   link: '/basic_config'
        // },
        // {
        //   title: '进阶设置',
        //   link: '/advance_config'
        // },
        {
          title: '控件文本设置',
          link: '/content_widget_config'
        },
        {
          title: '关于项目',
          link: '/about'
        },
        {
          title: '常见问题',
          link: '/QA'
        },
        {
          title: '脚本说明README',
          link: '/readme'
        },
      ]
    }
  },
  methods: {
    routerTo: function (item) {
      this.$router.push(item.link)
      this.$store.commit('setTitle', item.title)
    }
  },
  template: `<div>
    <van-cell-group>
      <van-cell :title="item.title" is-link v-for="item in menuItems" :key="item.link" @click="routerTo(item)"/>
    </van-cell-group>
  </div>`
}
