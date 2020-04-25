let { config: _config } = require('../config.js')(runtime, this)
module.exports = function (obj) {
  this.__proto__ = obj

  this.unlock = function (password) {
    // 自行定制化解锁方式，这里展示PIN密码的解锁
    if (typeof password !== 'string') throw new Error('密码应为字符串！')
    // 模拟按键
    let button = null
    for (let i = 0; i < password.length; i++) {
      let key_id = 'com.android.systemui:id/key' + password[i]
      if ((button = id(key_id).findOne(_config.timeout_findOne)) !== null) {
        button.click()
      }
      sleep(100)
    }
    // 解锁完毕后返回check_lock方法，模块自动判断是否成功
    return this.check_lock()
  }


  /**
   * 一般情况下仅仅重写unlock即可，点亮、滑动、校验等等都在Unlock中实现了通用方式
   * 但是如果机型特殊，可以直接重写run_unlock()方法
   * 在run_unlock中编写自己的解锁方式
   */
  this.run_unlock = function () {
    // 在这个里面编写解锁逻辑
  }

  /**
   * 又或者只有某一个小方法不适用，可以只修改对应的方法即可
   * 具体方法见Unlock中定义的方法 比如failed、check_unlock、swipe_layer等等
   */
  
}