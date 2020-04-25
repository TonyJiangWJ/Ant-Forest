let AesUtil = require('../lib/AesUtil.js')
let Base64 = require('../lib/Base64.js')
let CryptoJS = require('../lib/crypto-js.js')
var key = device.getAndroidId()  //秘钥必须为：8/16/32位
var message = "123456";
console.show()
console.log('秘钥：' + key)
// 加密
let encrypt = AesUtil.encrypt(message, key)
console.log("encrypted: " + encrypt);

// 解密
console.log("decrypted: " + AesUtil.decrypt(encrypt, key));

key = key + key
encrypt = CryptoJS.AES.encrypt(message, CryptoJS.enc.Utf8.parse(key), {
  mode: CryptoJS.mode.ECB,
  padding: CryptoJS.pad.Pkcs7
})
console.log('加密内容：' + encrypt)

let decrypt = CryptoJS.AES.decrypt(encrypt, CryptoJS.enc.Utf8.parse(key), {
  mode: CryptoJS.mode.ECB,
  padding: CryptoJS.pad.Pkcs7
}).toString(CryptoJS.enc.Utf8)

console.log('解密内容：' + decrypt)