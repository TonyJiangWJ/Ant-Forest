const store = new Vuex.Store({
  state: {
    configSaveCallbacks: [],
    currentIndex: 0
  },
  getters: {
    getSaveCallbacks: state => {
      return state.configSaveCallbacks
    }
  },
  mutations: {
    setIndex: (state, index) => {
      state.index = index
    }
  }
})