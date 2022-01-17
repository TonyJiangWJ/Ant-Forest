/**********
 * 
 * 封装了storages的操作，所有数据保存在 config.js中定义的storage_name + '_runtime' 下，可以通过后续的功能直接导出这些缓存数据
 * 简化了创建和更新的过程，同时可以实现缓存的自动过期，仅当天有效
 * 0.外部使用时通过singletonRequire('StorageFactory')获取当前脚本全局的storageFactory
 * 1.初始化 storageFactory.initFactoryByKey(${KEY}, ${defaultValue}) 指定key和默认值 初始化时已存在数据不会被覆盖
 * 2.获取数据 通过key来获取 storageFactory.getValueByKey(${KEY}[,true]) 通过指定key获取缓存数据，默认缓存数据仅当天有效，失效后返回默认值；第二个参数可选，代表不需要将缓存数据过期
 * 3.更新数据 storageFactory.updateValueByKey(${KEY}, ${VALUE}) 更新新的值到KEY对应的缓存中
 * 
 * 注意事项：该方法不是线程安全的 尽量不要在多线程中获取和更新值
 **********/


let { storage_name: _storage_name } = require('../../config.js')(runtime, global)
let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let _logUtils = singletonRequire('LogUtils')
let formatDate = require('../DateUtil.js')
let RUNTIME_STORAGE = _storage_name + "_runtime"

/**
 * 内部实际保存的Storage对象
 * 
 * @param {string} key 
 */
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


/**
 * 对外使用的StorageFactory 通过KEY获取缓存的storage数据
 */
const StorageFactory = function () {

  /**
   * 当前已经持久化的storage信息
   */
  this.persistedStorageFactory = {}

  /**
   * 初始化一个存储对象
   * 
   * @param {string} key 缓存键
   * @param {object} defaultValue 初始值
   */
  this.initFactoryByKey = function (key, defaultValue) {
    this.persistedStorageFactory[key] = new BaseStorageFactory(key).setDefault(defaultValue)
    _logUtils.debugForDev(['key:{} 当前值：{}', key, JSON.stringify(this.persistedStorageFactory[key].getRuntimeStorage())])
  }

  /**
   * 通过缓存键获取缓存对象，不存在时会自动初始化 此时默认值为{}
   * 
   * @param {string} key 
   * @returns 
   */
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