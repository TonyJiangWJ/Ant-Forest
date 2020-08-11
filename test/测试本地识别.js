/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-10 14:00:15
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-11 17:19:48
 * @Description: 
 */
let numberUtil = require('../lib/MockNumberOcrUtil.js')
let base64 = 'iVBORw0KGgoAAAANSUhEUgAAAC0AAAAuCAYAAAC8jpA0AAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAAAD/SURBVGiB7ZjLDoQgDEWpmf//ZWZFgoZqX7kV07NkVE7g0qlSa623zTiyBSyUNIotpX+Wm3o/n10iEl/7xPwsbh6VNCcwxu/kIxHHQ7Ji2lW18t1Mr1ZwROH6W++djclq3LI7ppWeJ0fkmIhO86TGQ1KFVmOmkqfBsxPcvSJpVCmTkhYPT3l8TcnT7KZbGvWHMmM+iJwsIv+h8ZAKaxquFa/JtIZQaVS+qQW82Hr76+3iYTm46dIWSvoJb6kbmF4CshuoiscdkTXcJD0LWGU8Eftuw5R98K6I4yER566Jrj6qeHDfOtA7EdIwoak6jaKkUZQ0ipJGUdIojowPiF7+y7lXeDdmQ8oAAAAASUVORK5CYII='
let start = new Date().getTime()
let result = numberUtil.getImageNumber(base64)
let end = new Date().getTime()
log('识别结果：' + result + '耗时：' + (end - start) + 'ms')
console.show()
