
const router = new VueRouter({
  scrollBehavior(to, from, savedPosition) {
    console.log('savedPosition', savedPosition)
    if (savedPosition) {
        return savedPosition
    }
    return {x: 0, y: 0}
  },
  routes: [
    { path: '/', component: Index, meta: { index: 0 } },
    { path: '/basic/rain', component: RainConfig, meta: { index: 1 } },
    { path: '/basic/collect', component: CollectConfig, meta: { index: 1 } },
    { path: '/advance/region', component: RegionConfig, meta: { index: 1 } },
    { path: '/advance/region/ocr', component: OcrConfig, meta: { index: 2 } },
    { path: '/advance/region/threadPool', component: ThreadPoolConfig, meta: { index: 2 } },
    { path: '/advance/protect', component: ProtectedListConfig, meta: { index: 1 } },
    { path: '/advance/white', component: WhiteListConfig, meta: { index: 1 } },
    { path: '/advance/water', component: WaterBackConfig, meta: { index: 1 } },
    { path: '/basic/lock', component: LockConfig, meta: { index: 1 } },
    { path: '/basic/floaty', component: FloatyConfig, meta: { index: 1 } },
    { path: '/basic/log', component: LogConfig, meta: { index: 1 } },
    { path: '/advance/skipPackage', component: SkipPackageConfig, meta: { index: 1 } },
    { path: '/advance/common', component: AdvanceCommonConfig, meta: { index: 1 } },
    { path: '/content_widget_config', component: WidgetConfigs, meta: { index: 1 } },
    { path: '/about', component: About, meta: { index: 1 } },
    { path: '/about/develop', component: DevelopConfig, meta: { index:2 } },
  ]
})

