
let { storage_name: _storage_name } = require('../../config.js')(runtime, this)
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let _logUtils = singletonRequire('LogUtils')
let formatDate = require('../DateUtil.js')
let RUNTIME_STORAGE = _storage_name + "_runtime"

function BaseStorageFactory (key) {
  this.key = key || 'EMPTY_DEFAULT_KEY'
  this.defaultValue = {}
  this.runtimeStorage = storages.create(RUNTIME_STORAGE)

  /**
   * 更新数据
   * @param {object} value 
   */
  this.updateStorageValue = function (value) {
    let today = formatDate(new Date(), 'yyyy-MM-dd')
    this.runtimeStorage.put(this.key, JSON.stringify({
      date: today,
      value: value
    }))
  }

  /**
   * 获取缓存中当天的数据，和时间相关，当天不存在则创建默认值
   */
  this.getTodaysRuntimeStorage = function () {
    let today = formatDate(new Date(), 'yyyy-MM-dd')
    let existStoreObjStr = this.runtimeStorage.get(this.key)
    if (existStoreObjStr) {
      try {
        let existStoreObj = JSON.parse(existStoreObjStr)
        if (existStoreObj.date === today) {
          // 兼容旧数据
          if (typeof existStoreObj.value === 'undefined') {
            let value = {}
            Object.assign(value, existStoreObj)
            existStoreObj.value = value
          }
          return existStoreObj.value
        }
      } catch (e) {
        _logUtils.errorInfo(["解析JSON数据失败, key:{} value:{} error:{}", this.key, existStoreObjStr, e])
      }
    }
    return this.createDefaultStorage(today)
  }

  /**
   * 获取缓存中的数据，和时间无关，不存在则创建默认值
   */
  this.getRuntimeStorage = function () {
    let existStoreObjStr = this.runtimeStorage.get(this.key)
    if (existStoreObjStr) {
      try {
        let existStoreObj = JSON.parse(existStoreObjStr)
        // 兼容旧数据
        if (typeof existStoreObj.value === 'undefined') {
          let value = {}
          Object.assign(value, existStoreObj)
          existStoreObj.value = value
        }
        return existStoreObj.value
      } catch (e) {
        _logUtils.errorInfo(["解析JSON数据失败, key:{} value:{} error:{}", this.key, existStoreObjStr, e])
      }
    }
    return this.createDefaultStorage(formatDate(new Date(), 'yyyy-MM-dd'))
  }

  /**
   * 创建默认数据
   * 
   * @param {string} date 日期
   */
  this.createDefaultStorage = function (date) {
    let initStore = this.getDefaultStorageValue(date)
    this.runtimeStorage.put(this.key, JSON.stringify(initStore))
    return initStore.value
  }

  /**
   * 获取初始值
   *
   * @param {string} date 指定日期
   */
  this.getDefaultStorageValue = function (date) {
    return {
      date: date,
      value: this.defaultValue
    }
  }

  /**
   * 
   * @param {*} defaultValue 
   */
  this.setDefault = function (defaultValue) {
    if (typeof defaultValue !== 'undefined') {
      this.defaultValue = defaultValue
    }
    return this
  }

}


const StorageFactory = function () {

  this.persistedStorageFactory = {}

  this.initFactoryByKey = function (key, defaultValue) {
    this.persistedStorageFactory[key] = new BaseStorageFactory(key).setDefault(defaultValue)
    _logUtils.debugForDev(['key:{} 当前值：{}', key, JSON.stringify(this.persistedStorageFactory[key].getRuntimeStorage())])
  }

  this.getFactoryByKey = function (key) {
    let factory = this.persistedStorageFactory[key]
    if (!factory) {
      factory = new BaseStorageFactory(key)
      this.persistedStorageFactory[key] = factory
    }
    return factory
  }

  /**
   * 根据key获取对应的值
   * 
   * @param {string} key 
   * @param {boolean} fullTime 是否和时间无关的数据，如果不传或者false获取当天的数据
   */
  this.getValueByKey = function (key, fullTime) {
    if (fullTime) {
      return this.getFactoryByKey(key).getRuntimeStorage()
    } else {
      return this.getFactoryByKey(key).getTodaysRuntimeStorage()
    }
  }

  /**
   * 更新数据
   * 
   * @param {string} key 
   * @param {object} value 
   */
  this.updateValueByKey = function (key, value) {
    return this.getFactoryByKey(key).updateStorageValue(value)
  }
}

module.exports = new StorageFactory()