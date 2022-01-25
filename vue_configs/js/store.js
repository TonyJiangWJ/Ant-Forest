const store = new Vuex.Store({
  state: {
    configSaveCallbacks: [],
    currentIndex: 0,
    currentTitle: '配置管理'
  },
  getters: {
    getSaveCallbacks: state => {
      return state.configSaveCallbacks
    },
    getTitle: state => {
      return state.currentTitle
    }
  },
  mutations: {
    setIndex: (state, index) => {
      state.index = index
    },
    setTitle: (state, title) => {
      state.currentTitle = title
    }
  }
})