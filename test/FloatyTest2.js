let _FloatyInstance = typeof FloatyInstance === 'undefined' ? (
  function () {
    return require('../lib/FloatyUtil.js')
  })() : FloatyInstance

module.exports = {
  tester: {
    run: function () {
      _FloatyInstance.setFloatyInfo({ x: 300, y: 1600 }, 'Hello? Anyone here?')
    }
  }
}