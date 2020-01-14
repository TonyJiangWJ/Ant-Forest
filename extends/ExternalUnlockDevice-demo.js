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
}