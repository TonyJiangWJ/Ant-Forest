/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-23 23:13:31
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-25 15:01:49
 * @Description: 
 */
importClass(android.content.Context)
importClass(android.content.SharedPreferences)

let lockableStorages = {
  requireCount: 0
}
lockableStorages.create = function (name) {
  return new LockableStorage(name)
}

lockableStorages.remove = function (name) {
  return this.create(name).clear()
}

module.exports = lockableStorages


// 支持锁的同步操作storage
function LockableStorage (name) {
  this.NAME_PREFIX = "autojs.localstorage.sync."
  this.mSharedPreferences = context.getSharedPreferences(this.NAME_PREFIX + name, Context.MODE_PRIVATE)

  this.put = function (key, stringValue) {
    return this.mSharedPreferences.edit()
      .putString(key, stringValue)
      .commit()
  }

  this.get = function (key, defaultValue) {
    defaultValue = defaultValue || null
    return this.mSharedPreferences.getString(key, defaultValue)
  }

  this.clear = function () {
    return this.mSharedPreferences.edit().clear().commit()
  }
}