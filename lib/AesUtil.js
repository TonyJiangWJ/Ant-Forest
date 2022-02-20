/*
 * @Author: TonyJiangWJ
 * @Date: 2020-01-08 17:07:28
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-05 09:17:16
 * @Description: AES加密工具
 */
let CryptoJS = require('./crypto-js.js')

function AesUtil () {
  this.key = device.getAndroidId()
}

AesUtil.prototype.encrypt = function (message, key) {
  key = key || this.key
  if (key.length !== 8 && key.length !== 16 && key.length !== 32) {
    console.error('密码长度不正确必须为8/16/32位')
    return null
  }
  return CryptoJS.AES.encrypt(message, CryptoJS.enc.Utf8.parse(key), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  }).toString()
}

AesUtil.prototype.decrypt = function(encrypt, key) {
  key = key || this.key
  if (key.length !== 8 && key.length !== 16 && key.length !== 32) {
    console.error('密码长度不正确必须为8/16/32位')
    return null
  }
  try {
    return CryptoJS.AES.decrypt(encrypt, CryptoJS.enc.Utf8.parse(key), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8)
  } catch (e) {
    console.error('秘钥不正确无法解密')
    return null
  }
}

AesUtil.prototype.md5 = function (content) {
  if (content) {
    return CryptoJS.MD5(content)
  } else {
    return ''
  }
}

module.exports = new AesUtil()