const store = new Vuex.Store({
  state: {
    configSaveCallbacks: [],
    currentIndex: 0,
    currentTitle: '配置管理',
    titleMap: {}
  },
  getters: {
    getSaveCallbacks: state => {
      return state.configSaveCallbacks
    },
    getTitle: state => {
      return state.currentTitle
    },
    getTitleByPath: state => {
      return (path) => state.titleMap[path]
    }
  },
  mutations: {
    setIndex: (state, index) => {
      state.index = index
    },
    setTitle: (state, title) => {
      console.log('设置标题：', title)
      state.currentTitle = title
    },
    setTitleWithPath: (state, payload) => {
      console.log('设置标题：', payload.title)
      state.currentTitle = payload.title
      state.titleMap[payload.path] = payload.title
    },
  }
})