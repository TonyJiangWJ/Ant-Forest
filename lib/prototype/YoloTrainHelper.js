/**
 * Yolo训练辅助工具，记录截图图片，用于PC端训练
 */
let { config } = require('../../config.js')(runtime, global)
let sRequire = require('../SingletonRequirer.js')(runtime, global)
let fileUtils = sRequire('FileUtils')
let logUtils = sRequire('LogUtils')
let formatDate = require('../DateUtil.js')

function YoloTrainHelper () {
  let currentPath = fileUtils.getCurrentWorkPath()

  /**
   * labels格式 [{ name: '标签名称', shape: 'rectangle'/默认格式,暂不支持其他格式/, region: [left,top,with,height] }]
   * 
   * @param {*} image 图片
   * @param {string} desc 描述当前图片信息
   * @param {List} labels 标签列表
   * @param {string} parentDir 父级目录
   * @param {boolean} 是否强制保存
   */
  this.saveImageWithLabels = function (image, desc, labels, parentDir, forceSave) {
    try {
      if (!(config.save_yolo_train_data || forceSave)) {
        return
      }
      if (!image) {
        logUtils.debugInfo(['{} 对应图片无效 跳过保存', desc])
        return
      }
      // 指定压缩后图片的目标宽度(横向取高度640 纵向取宽度640)
      let ratio = 640 / Math.min(image.width, image.height)
      let targetWidth = ratio * image.width
      let targetHeight = ratio * image.height
      // 对图片进行压缩，否则浪费手机空间
      let resizedImg = images.resize(image, [targetWidth, targetHeight])
      let imageId = new Date().getTime() + '' + Math.ceil(Math.random() * 1000)
      // 设置后缀，避免憨批的系统相册读取它
      let imageName = imageId + '.jpg.data'
      let savePath = currentPath + '/resources/trainData/' + (parentDir ? parentDir + '/' : '') + formatDate(new Date(), 'yyyyMMdd') + '/'
      files.ensureDir(savePath)
      let imagePath = savePath + imageName
      // 保存并指定格式为jpg
      images.save(resizedImg, imagePath, 'jpg')
      logUtils.debugInfo(['已记录图片信息到：{}', imagePath])
      let labelJsonPath = savePath + imageId + '.json'
      let labelJson = {
        imageId: imageId,
        desc: desc || 'unknown',
        labels: (labels || []).map(label => {
          return {
            name: label.name,
            confidence: label.confidence || null,
            shape: label.shape || 'rectangle',
            region: convertRetion(label.region, ratio)
          }
        })
      }
      if (labelJson.labels.length == 0) {
        logUtils.debugInfo(['{}标签数据为空 对应imageId: {}', desc || 'unknown', imageId])
      }
      files.write(labelJsonPath, JSON.stringify(labelJson))
      logUtils.debugInfo(['已记录对应label信息到：{}', labelJsonPath])
    } catch (e) {
      logUtils.warnInfo(['{} 保存YOLO训练用图片异常: {}', desc, e])
    }
  }

  /**
   * 只保存图片 无标签数据，后期手动标注
   *
   * @param {*} image 
   * @param {*} desc 
   * @param {string} parentDir 父级目录
   * @param {boolean} 是否强制保存
   */
  this.saveImage = function (image, desc, parentDir, forceSave) {
    this.saveImageWithLabels(image, desc, null, parentDir, forceSave)
  }

  function convertRetion (region, ratio) {
    if (region && region.length == 4) {
      return region.map(v => v * ratio)
    }
    return []
  }
}


module.exports = new YoloTrainHelper()