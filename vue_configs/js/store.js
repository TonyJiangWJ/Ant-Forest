const store = new Vuex.Store({
  state: {
    configSaveCallbacks: [],
    currentIndex: 0,
    currentTitle: '配置管理',
    titleMap: {},
    currentFields: [],
    extendPrepend: '',
    configChangedCallback: null
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
    },
    getCurrentFields: state => {
      return state.currentFields
    },
    getExtendPrepend: state => {
      return state.extendPrepend
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
    setCurrentFields: (state, currentFields) => {
      state.currentFields = currentFields
    },
    setExtendPrepend: (state, prepend) => {
      state.extendPrepend = prepend
    },
    setConfigChangedCallback: (state, callback) => {
      state.configChangedCallback = callback
    },
    configChanged: (state) => {
      if (state.configChangedCallback) {
        state.configChangedCallback()
      }
    },
    clearConfig: (state) => {
      state.currentFields = []
      state.extendPrepend = ''
      state.configChangedCallback = null
    }
  }
})