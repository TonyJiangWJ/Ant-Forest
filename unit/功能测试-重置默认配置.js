/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-12 11:27:11
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-19 14:19:45
 * @Description: 
 */
let { config, default_config, storage_name: _storage_name } = require('../config.js')(runtime, this)
let storageConfig = storages.create(_storage_name)
let allSame = true


function objectEquals (x, y) {
  'use strict';

  if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
  // after this just checking type of one would be enough
  if (x.constructor !== y.constructor) { return false; }
  // if they are functions, they should exactly refer to same one (because of closures)
  if (x instanceof Function) { return x === y; }
  // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
  if (x instanceof RegExp) { return x === y; }
  if (x === y || x.valueOf() === y.valueOf()) { return true; }
  if (Array.isArray(x) && x.length !== y.length) { return false; }

  // if they are dates, they must had equal valueOf
  if (x instanceof Date) { return false; }

  // if they are strictly equal, they both need to be object at least
  if (!(x instanceof Object)) { return false; }
  if (!(y instanceof Object)) { return false; }

  // recursive object equality check
  var p = Object.keys(x);
  return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
    p.every(function (i) { return objectEquals(x[i], y[i]); });
}

Object.keys(default_config).forEach(key => {
  let currentVal = config[key]
  let defaultVal = default_config[key]
  config[key] = defaultVal
  storageConfig.put(key, defaultVal)
  if (!objectEquals(currentVal, defaultVal)) {
    allSame = false
    log('[' + key + ']当前配置：' + currentVal + ' 重置为默认：' + defaultVal)
  }
})
toastLog('完成！' + (allSame ? '全部配置和默认值相同' : '重置了默认值，详情见日志'))
