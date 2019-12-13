/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-06 11:33:42
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-13 22:52:07
 * @Description: 
 */
runtime.loadDex('../lib/autojs-tools.dex')
importClass(com.tony.BitCheck)
importClass(java.util.HashMap)
let checker = new BitCheck(2160 << 11 | 1080)
let count = 0
let start


count = 0
start = new Date().getTime()
for (let x = 0; x < 1080; x++) {
  for (let y = 0; y < 2160; y++) {
    count++
    if (!checker.isUnchecked(y << 11 | x)) {
      console.log('[' + x + ',' + y + '] 已经校验过')
    }
  }
}
console.log('Java位校验完成 总数:' + count + ' 耗时:' + (new Date().getTime() - start) + 'ms')

let hashCheck = {}
count = 0
start = new Date().getTime()
for (let x = 0; x < 1080; x++) {
  for (let y = 0; y < 2160; y++) {
    count++
    let key = y << 11 | x
    if (!hashCheck[key]) {
      hashCheck[key] = true
    }
  }
}
console.log('hash校验完成 总数:' + count + ' 耗时:' + (new Date().getTime() - start) + 'ms')


let hashMap = new HashMap(2160 * 1080)
count = 0
start = new Date().getTime()
for (let x = 0; x < 1080; x++) {
  for (let y = 0; y < 2160; y++) {
    count++
    let key = y << 11 | x
    if (!hashMap.get(key)) {
      hashMap.put(key, true)
    }
  }
}
console.log('hashMap校验完成 总数:' + count + ' 耗时:' + (new Date().getTime() - start) + 'ms')


