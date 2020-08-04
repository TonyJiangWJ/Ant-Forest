let resolver = require('../lib/AutoJSRemoveDexResolver.js')
resolver()
runtime.loadDex('../lib/autojs-tools.dex')
importClass(com.tony.BitCheck)
resolver()
let checker = new BitCheck(2160 << 8 | 200)
//checker.init()
let count = 0
let error = false
let s = new Date().getTime()
for (let i = 0; i < 200; i++) {
  for (let j = 0; j < 2160; j++) {
    count++
    if (!checker.isUnchecked(j << 8 | i)) {
      console.log('异常：' + i + ',' + j)
      error = true
      break
    }
  }
  if (error) {
    break
  }
}
console.log("总数:" + count + " 总耗时:" + (new Date().getTime() - s) + 'ms')

let start = new Date().getTime()
BitCheck.main(null)
console.log('cost time:' + (new Date().getTime() - start))