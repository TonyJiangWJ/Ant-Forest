
let { config: _config, storage_name: _storage_name } = require('../config.js')(runtime, this)
const pointNumberStorage = storages.create(_storage_name + '_tesserac_point_num')
let md5Map = pointNumberStorage.get('md5_number_map')
console.log('md5 map: ' + JSON.stringify(md5Map))
let clear = false
if (clear) {
  pointNumberStorage.put('md5_number_map', {})
}