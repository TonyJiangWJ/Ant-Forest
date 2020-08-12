/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-10 13:50:58
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-12 10:03:20
 * @Description: 
 */
let NumberConfig = require('../number_config.js')
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('./SingletonRequirer.js')(runtime, this)
let { debugInfo, logInfo, debugForDev } = singletonRequire('LogUtils')

module.exports = (() => {
  const MockNumberOcrUtil = function () {

  }

  /**
   * 校验某个数字是否存在 并返回坐标和对应数字
   * 
   * @param {integer} number 校验是否存在的数字
   * @param {object} img 待校验图片
   * @param {boolean} forceRight 强制校验右半部分
   */
  MockNumberOcrUtil.prototype.checkIsExists = function (number, img, forceRight) {
    let startX = img.width - 45 > 0 ? img.width - 45 : 0
    let width = img.width - 45 > 0 ? 45 : img.width
    let height = img.height > 45 ? 45 : img.height
    if (forceRight) {
      startX += 19
      width -= 19
    }
    let point = images.findMultiColors(img, '#FFFFFF', NumberConfig[number], { region: [startX, 0, width, height] })
    if (point) {
      return {
        point: point,
        num: number
      }
    }
    return null
  }

  /**
   * 识别图片中的数字
   * 
   * @param {object}} img 图片必须是1080P下的倒计时图片，区域为65*65 数字的区域约为45*45 其他分辨率的进行适当缩放再识别 图片必须为三通道图片，单通道灰度图因为多点找色的bug无法使用
   */
  MockNumberOcrUtil.prototype.doRecognize = function (img) {
    let start = new Date().getTime()
    if (img) {
      // 先二值化
      img = images.interval(img, '#FFFFFF', 10)
    } else {
      return null
    }

    debugForDev(['image after interval: data:image/png;base64,{}', images.toBase64(img)])

    let result = []
    let n = 0
    while (n <= 9) {
      let find = this.checkIsExists(n, img)
      result.push(find)
      if (find && find.point.x < 19) {
        result.push(this.checkIsExists(n, img, true))
      }
      n++
    }
    result = result.filter(r => r !== null)
    debugInfo(['result: {} 耗时：{}ms', JSON.stringify(result), new Date().getTime() - start])
    return result.sort((a, b) => a.point.x < b.point.x ? -1 : 1).map(a => a.num).reduce((a, b) => { a += b; return a }, '')
  }

  /**
   * 获取base64对应图片中的数字 将base64转换成图片然后进行识别
   * 
   * @param {string} imgBase64 
   */
  MockNumberOcrUtil.prototype.getImageNumber = function (imgBase64) {
    let img = images.fromBase64(imgBase64)
    if (img) {
      return this.doRecognize(img)
    }
    return null
  }

  return new MockNumberOcrUtil()
})()