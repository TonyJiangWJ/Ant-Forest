/**
 * Yolo训练辅助工具，记录截图图片，用于PC端训练
 */
let { config } = require('../../config.js')(runtime, global)
let sRequire = require('../SingletonRequirer.js')(runtime, global)
let fileUtils = sRequire('FileUtils')
let logUtils = sRequire('LogUtils')
let formatDate = require('../DateUtil.js')
let YoloDetection = sRequire('YoloDetectionUtil')
let _commonFunctions = singletonRequire('CommonFunction')
// 代理图片处理
let resourceMonitor = require('../ResourceMonitor.js')(runtime, global)


importClass(java.util.concurrent.LinkedBlockingQueue)
importClass(java.util.concurrent.ThreadPoolExecutor)
importClass(java.util.concurrent.TimeUnit)
importClass(java.util.concurrent.CountDownLatch)
importClass(java.util.concurrent.ThreadFactory)
importClass(java.util.concurrent.Executors)
function YoloTrainHelper () {
  let currentPath = fileUtils.getCurrentWorkPath()
  this.threadPool = new ThreadPoolExecutor(1, 1, 60,
    TimeUnit.SECONDS, new LinkedBlockingQueue(256),
    new ThreadFactory({
      newThread: function (runnable) {
        let thread = Executors.defaultThreadFactory().newThread(runnable)
        thread.setName('train-helper-' + thread.getName())
        return thread
      }
    })
  )
  let self = this
  // 注册生命周期结束后关闭线程池
  _commonFunctions.registerOnEngineRemoved(function () {
    if (self.threadPool !== null) {
      self.threadPool.shutdown()
    }
  }, 'shutdown train helper thread pool')

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

    if (!(config.save_yolo_train_data || forceSave)) {
      return
    }
    if (!image) {
      logUtils.debugInfo(['{} 对应图片无效 跳过保存', desc])
      return
    }
    image = images.copy(image, true)
    this.threadPool.execute(function () {
      try {
        self.doSaveImageWithLabels(image, desc, labels, parentDir)
      } catch (e) {
        logUtils.warnInfo(['{} 保存YOLO训练用图片异常: {}', desc, e])
      } finally {
        image.recycle()
      }
    })
  }

  this.doSaveImageWithLabels = function (image, desc, labels, parentDir) {
    if (YoloDetection.enabled && !labels) {
      let result = YoloDetection.forward(image)
      if (result && result.length > 0) {
        labels = result.map(box => {
          return {
            name: box.label,
            region: [box.x, box.y, box.width, box.height],
            confidence: box.confidence
          }
        })
      }
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
      imagePath: imageId + '.jpg',
      imageData: null,
      imageWidth: targetWidth,
      imageHeight: targetHeight,
      text: desc || 'unknown',
      version: "2.3.6",
      flags: {},
      shapes: (labels || []).map(label => {
        return {
          label: label.name,
          score: label.confidence || null,
          shape_type: label.shape || 'rectangle',
          points: convertPoints(label.region, ratio)
        }
      })
    }
    if (labelJson.shapes.length == 0) {
      logUtils.debugInfo(['{}标签数据为空 对应imageId: {}', desc || 'unknown', imageId])
    }
    files.write(labelJsonPath, JSON.stringify(labelJson))
    logUtils.debugInfo(['已记录对应label信息到：{}', labelJsonPath])
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

  /**
   * 转换为anylabeling points格式[[left, top],[right, bottom]]
   * @param {*} region 
   * @param {*} ratio 
   * @returns 
   */
  function convertPoints (region, ratio) {
    if (region && region.length == 4) {
      region = region.map(v => v * ratio)
      return [
        [region[0], region[1]],
        [region[0] + region[2], region[1] + region[3]]
      ]
    }
    return []
  }
}


module.exports = new YoloTrainHelper()