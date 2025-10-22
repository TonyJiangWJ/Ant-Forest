/*
 * @Author: TonyJiangWJ
 * @Date: 2020-10-20 23:45:05
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-09-13 16:17:35
 * @Description: 封装了一些基于OpenCV的函数方法，用于识别特殊内容等
 */
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let _logUtils = singletonRequire('LogUtils')
let commonFunctions = singletonRequire('CommonFunction')
let TimeUtils = require('./TimeUtils.js')
let supportSIFT = false
importClass(java.util.ArrayList)
importClass(java.util.Arrays)
importClass(org.opencv.android.Utils)
importClass(org.opencv.calib3d.Calib3d)
importClass(org.opencv.core.Core)
importClass(org.opencv.core.CvType)
importClass(org.opencv.core.Mat)
importClass(org.opencv.core.MatOfDMatch)
importClass(org.opencv.core.MatOfFloat)
importClass(org.opencv.core.MatOfInt)
importClass(org.opencv.core.MatOfKeyPoint)
importClass(org.opencv.core.MatOfPoint2f)
importClass(org.opencv.core.KeyPoint)
importClass(org.opencv.core.Point)
importClass(org.opencv.core.Scalar)
importClass(org.opencv.core.Size)
importClass(org.opencv.features2d.DescriptorMatcher)
try {
  _logUtils.infoLog('当前OpenCV版本：' + org.opencv.core.Core.VERSION)
  importClass(org.opencv.features2d.SIFT)
  supportSIFT = true
} catch (e) {
  _logUtils.warnInfo('当前版本AutoJS 不支持SIFT')
}
importClass(org.opencv.imgcodecs.Imgcodecs)
importClass(org.opencv.imgproc.Imgproc)

runtime.getImages().initOpenCvIfNeeded()

module.exports = {
  /**
   * 获取OpenCV版本号
   * @returns {string} OpenCV版本字符串
   */
  getOpenCvVersion: function () {
    return Core.VERSION
  },

  /**
   * 获取非零颜色值面积
   * 计算图像中非零像素的数量，通常用于计算二值化图像中目标区域的面积
   * @param {Mat} intervalImg - 输入的Mat图像对象
   * @returns {number} 非零像素的数量
   */
  getNoneZeroCount: function (intervalImg) {
    return Core.countNonZero(intervalImg.mat)
  },

  /**
   * 获取指定图片的颜色直方图的标准差
   * 
   * @param {Image} img - 输入图像
   * @param {boolean} isRgb - 是否处理RGB三通道，true则分别计算三个通道的标准差，false则按灰度图处理
   * @param {boolean} returnObject - 是否返回详细对象，true则返回包含各通道值和加权平均值的对象，false则返回加权平均值或单通道值
   * @returns {number|Object} 根据参数返回标准差值或详细信息对象
   */
  getStandardDeviation: function (img, isRgb, returnObject) {
    let mat = img.mat
    if (isRgb && mat.channels() >= 3) {
      // 处理RGB三通道 (OpenCV默认是BGR顺序)
      let channels = new ArrayList()
      Core.split(mat, channels)
      let result = []
      for (let i = 0; i < 3; i++) {
        let channelMat = channels.get(i)
        let hist = new Mat(256, 1, CvType.CV_8UC1)
        let histSize = new MatOfInt([256])
        let ranges = new MatOfFloat([0, 256])
        let mask = new Mat()
        Imgproc.calcHist(Arrays.asList(channelMat), new MatOfInt([0]), mask, hist, histSize, ranges)

        let resultList = []
        for (let row = 0; row < hist.rows(); row++) {
          resultList.push(hist.get(row, 0)[0])
        }
        let avg = resultList.reduce((a, b) => a += b) / resultList.length
        result.push(Math.sqrt(resultList.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b) / resultList.length))

        hist.release()
        mask.release()
        channelMat.release()
      }
      channels.clear()

      // 计算加权平均值
      let weightedAvg = calculateWeightedAverage(result)

      if (returnObject) {
        return {
          b: result[0],
          g: result[1],
          r: result[2],
          weighted: weightedAvg
        }
      } else {
        return weightedAvg
      }
    } else {
      // 按灰度图处理
      let channels = new MatOfInt([0])
      let mask = new Mat()
      let hist = new Mat(256, 1, CvType.CV_8UC1)
      let histSize = new MatOfInt([256])
      let ranges = new MatOfFloat([0, 256])

      Imgproc.calcHist(Arrays.asList(mat), channels, mask, hist, histSize, ranges)
      let resultList = []
      for (let row = 0; row < hist.rows(); row++) {
        resultList.push(hist.get(row, 0)[0])
      }
      let avg = resultList.reduce((a, b) => a += b) / resultList.length
      let stdDev = Math.sqrt(resultList.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b) / resultList.length)

      channels.release()
      mask.release()
      hist.release()
      ranges.release()
      histSize.release()

      return stdDev
    }
  },

  /**
   * 识别区域主色
   * 
   * @param {ImageWrapper} img - 输入图像
   * @param {boolean} isRgb - 是否处理RGB三通道，true则分别计算三个通道的中位数，false则按灰度图处理
   * @param {boolean} returnObject - 是否返回详细对象，true则返回包含各通道值和加权平均值的对象，false则返回加权平均值或单通道值
   * @returns {number|Object} 根据参数返回中位数值或详细信息对象
   */
  getMedian: function (img, isRgb, returnObject) {
    let mat = img.mat
    if (isRgb && mat.channels() >= 3) {
      // 处理RGB三通道 (OpenCV默认是BGR顺序)
      let channels = new ArrayList()
      Core.split(mat, channels)
      let result = []
      for (let i = 0; i < 3; i++) {
        let channelMat = channels.get(i)
        let hist = new Mat(256, 1, CvType.CV_8UC1)
        let histSize = new MatOfInt([256])
        let ranges = new MatOfFloat([0, 256])
        let mask = new Mat()

        Imgproc.calcHist(Arrays.asList(channelMat), new MatOfInt([0]), mask, hist, histSize, ranges)

        let t = channelMat.rows() * channelMat.cols() / 2.0
        let total = 0
        let med = -1
        for (let row = 0; row < hist.rows(); row++) {
          let val = hist.get(row, 0)[0]
          if ((total <= t) && (total + val >= t)) {
            med = row
            break
          }
          total += val
        }
        result.push(med)

        hist.release()
        mask.release()
        channelMat.release()
      }
      channels.clear()

      // 计算加权平均值
      let weightedAvg = Math.round(calculateWeightedAverage(result))

      if (returnObject) {
        return {
          b: result[0],
          g: result[1],
          r: result[2],
          weighted: weightedAvg
        }
      } else {
        return weightedAvg
      }
    } else {
      // 按灰度图处理
      let channels = new MatOfInt([0])
      let mask = new Mat()
      let hist = new Mat(256, 1, CvType.CV_8UC1)
      let histSize = new MatOfInt([256])
      let ranges = new MatOfFloat([0, 256])

      Imgproc.calcHist(Arrays.asList(mat), channels, mask, hist, histSize, ranges)

      let t = mat.rows() * mat.cols() / 2.0
      let total = 0
      let med = -1
      for (let row = 0; row < hist.rows(); row++) {
        let val = hist.get(row, 0)[0]
        if ((total <= t) && (total + val >= t)) {
          med = row
          break
        }
        total += val
      }

      channels.release()
      mask.release()
      hist.release()
      ranges.release()
      histSize.release()

      return med
    }
  },

  /**
   * 识别区域内的差异化均值，理论上颜色差异越大 返回的值也越大 
   * 
   * @param {*} hsvImg - HSV格式的图像
   * @param {boolean} isRgb - 是否处理RGB三通道（注意：此参数在HSV模式下主要用于控制返回格式），默认按HSV处理
   * @param {boolean} returnObject - 是否返回详细对象，true则返回包含各通道值和加权平均值的对象，false则返回加权平均值或单通道值
   * @returns {number|Object} 根据参数返回平均值或详细信息对象
   */
  getHistAverage: function (hsvImg, isRgb, returnObject) {
    let hsvMat = hsvImg.mat
    if (isRgb && hsvMat.channels() >= 3) {
      // 如果是RGB模式且有三个通道，则处理BGR图像的三个通道
      let channels = new ArrayList()
      Core.split(hsvMat, channels)
      let result = []
      for (let i = 0; i < 3; i++) {
        let channelMat = channels.get(i)
        let average = 0.0
        let hist = new Mat(256, 1, CvType.CV_8UC1)
        let histSize = new MatOfInt([256])
        let ranges = new MatOfFloat([0, 256])
        let mask = new Mat()

        Imgproc.calcHist(Arrays.asList([channelMat]), new MatOfInt([0]), mask, hist, histSize, ranges)

        for (let h = 0; h < hist.rows(); h++) {
          average += (hist.get(h, 0)[0] * h)
        }

        average = average / channelMat.size().height / channelMat.size().width
        result.push(average)

        hist.release()
        mask.release()
        channelMat.release()
      }
      channels.clear()

      // 计算加权平均值
      let weightedAvg = calculateWeightedAverage(result)

      if (returnObject) {
        return {
          b: result[0],
          g: result[1],
          r: result[2],
          weighted: weightedAvg
        }
      } else {
        return weightedAvg
      }
    } else {
      // 默认按HSV处理，计算Hue通道的平均值
      let average = 0.0
      let hist = new Mat(256, 1, CvType.CV_8UC1)
      let histSize = new MatOfInt([256])
      let ranges = new MatOfFloat([0, 256])
      let mask = new Mat()

      // compute the histogram for Hue channel (index 0)
      Imgproc.calcHist(Arrays.asList(hsvMat), new MatOfInt([0]), mask, hist, histSize, ranges)

      // get the average Hue value of the image
      for (let h = 0; h < hist.rows(); h++) {
        average += (hist.get(h, 0)[0] * h)
      }

      average = average / hsvMat.size().height / hsvMat.size().width

      hist.release()
      mask.release()
      ranges.release()
      histSize.release()

      return average
    }
  },

  /**
   * 读取图像文件
   * 根据文件路径读取图像，支持SIFT模式和普通模式
   * @param {string} imagePath - 图像文件路径
   * @param {number} flag - 读取标志位，默认为1（彩色图像）
   * @returns {Mat|ImageWrapper} 读取的图像对象
   */
  readImage: function (imagePath, flag) {
    if (!files.exists(imagePath) || files.isDir(imagePath)) throw new Error("文件不存在或为文件夹:" + imagePath)
    flag = typeof flag !== 'number' ? 1 : flag
    return supportSIFT ? Imgcodecs.imread(files.path(imagePath), flag) : images.read(files.path(imagePath))
  },

  /**
   * 简单读取图像文件
   * 使用普通方式读取图像文件
   * @param {string} imagePath - 图像文件路径
   * @returns {ImageWrapper} 读取的图像对象
   */
  readImageSimple: function (imagePath) {
    if (!files.exists(imagePath) || files.isDir(imagePath)) throw new Error("文件不存在或为文件夹:" + imagePath)
    return images.read(files.path(imagePath))
  },

  /**
   * 保存Mat图像到文件
   * 将OpenCV的Mat对象保存为图像文件
   * @param {Mat} mat - 要保存的Mat对象
   * @param {string} imagePath - 保存路径
   * @returns {boolean} 保存是否成功
   */
  saveImage: function (mat, imagePath) {
    if (!java.lang.Class.forName("org.opencv.core.Mat", true, context.getClass().getClassLoader()).isInstance(mat))
      throw new Error("参数类型不对")
    files.createWithDirs(imagePath)
    return Imgcodecs.imwrite(files.path(imgFile), mat)
  },

  /**
   * 简单保存图像到文件
   * 将普通图像对象保存为文件
   * @param {ImageWrapper} img - 要保存的图像对象
   * @param {string} imagePath - 保存路径
   */
  saveImageSimple: function (img, imagePath) {
    files.createWithDirs(imagePath)
    images.save(img, imagePath)
  },

  /**
   * 通过简单路径查找图像
   * 根据文件路径进行图像匹配查找
   * @param {string} originalImagePath - 原始图像路径
   * @param {string} templateImagePath - 模板图像路径
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @returns {SimplePointInfo|null} 匹配结果或null
   */
  findBySimplePath: function (originalImagePath, templateImagePath, region) {
    let originalImage = this.readImageSimple(originalImagePath)
    let templateImage = this.readImageSimple(templateImagePath)
    return this.findByImageSimple(originalImage, templateImage, region)
  },

  /**
   * 通过SIFT路径查找图像
   * 使用SIFT特征匹配算法根据文件路径查找图像
   * @param {string} originalImagePath - 原始图像路径
   * @param {string} templateImagePath - 模板图像路径
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @returns {SiftPointInfo|SimplePointInfo|null} 匹配结果或null
   */
  findBySIFTPath: function (originalImagePath, templateImagePath, region) {
    if (!supportSIFT) {
      return this.findBySimplePath(originalImagePath, templateImagePath, region)
    }
    let originalImage = this.readImage(originalImagePath)
    let templateImage = this.readImage(templateImagePath)
    return this.findBySIFTMat(originalImage, templateImage, region)
  },

  /**
   * 通过Base64字符串使用SIFT查找图像
   * 将Base64字符串转换为图像后使用SIFT算法查找
   * @param {ImageWrapper} originalImage - 原始图像
   * @param {string} base64 - 模板图像的Base64字符串
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @returns {SiftPointInfo|SimplePointInfo|null} 匹配结果或null
   */
  findBySIFTBase64: function (originalImage, base64, region) {
    return this.findBySIFT(originalImage, images.fromBase64(base64), region)
  },

  /**
   * 通过Base64字符串使用SIFT查找灰度图像
   * 将Base64字符串转换为灰度图像后使用SIFT算法查找
   * @param {ImageWrapper} originImg - 原始图像
   * @param {string} base64 - 模板图像的Base64字符串
   * @param {boolean} alreadyGray - 原始图像是否已经是灰度图
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @returns {SiftPointInfo|SimplePointInfo|null} 匹配结果或null
   */
  findBySIFTGrayBase64: function (originImg, base64, alreadyGray, region) {
    if (alreadyGray) {
      originImg = images.cvtColor(originImg, "GRAY2BGRA")
    } else {
      originImg = images.cvtColor(images.grayscale(originImg), "GRAY2BGRA")
    }
    return this.findBySIFT(originImg, images.fromBase64(base64), region)
  },

  /**
   * SIFT特征匹配
   * 使用SIFT特征匹配算法查找图像
   * @param {ImageWrapper} originalImage - 原始图像
   * @param {ImageWrapper} templateImage - 模板图像
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @returns {SiftPointInfo|SimplePointInfo|null} 匹配结果或null
   */
  findBySIFT: function (originalImage, templateImage, region) {
    if (!supportSIFT) {
      _logUtils.warnInfo(['当前不支持SIFT，使用普通找图匹配'])
      return this.findByImageSimple(originalImage, templateImage, region)
    } else {
      return this.findBySIFTMat(originalImage.getMat(), templateImage.getMat(), region)
    }
  },

  /**
   * SIFT特征匹配 
   * 使用SIFT特征匹配算法查找Mat图像
   * @param {Mat} originalImage - 原始图像Mat对象
   * @param {Mat} templateImage - 模板图像Mat对象
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @returns {SiftPointInfo} 匹配结果信息对象
   */
  findBySIFTMat: function (originalImage, templateImage, region) {
    if (!supportSIFT) {
      return this.findByImageSimple(images.matToImage(originalImage), images.matToImage(templateImage), region)
    }
    let start = new Date().getTime()
    let matsToRelease = []
    try {
      // 图像缩放参数
      let scaleFactor = 0.5 // 缩放到原来的50%

      if (region) {
        matsToRelease.push(originalImage)
        originalImage = new Mat(originalImage, buildRegionMat(region, originalImage))
      }

      let originalResource = new Mat()
      let templateResource = new Mat()
      matsToRelease.push(originalResource)
      matsToRelease.push(templateResource)

      // 创建缩放后的图像
      let resizedOriginal = new Mat()
      let resizedTemplate = new Mat()
      matsToRelease.push(resizedOriginal)
      matsToRelease.push(resizedTemplate)

      // 缩放图像
      Imgproc.resize(originalImage, resizedOriginal, new Size(0, 0), scaleFactor, scaleFactor, Imgproc.INTER_AREA)
      Imgproc.resize(templateImage, resizedTemplate, new Size(0, 0), scaleFactor, scaleFactor, Imgproc.INTER_AREA)

      // 创建SIFT检测器
      let sift = SIFT.create()

      // 创建特征点容器
      let originalKeyPoints = new MatOfKeyPoint()
      let templateKeyPoints = new MatOfKeyPoint()
      matsToRelease.push(originalKeyPoints)
      matsToRelease.push(templateKeyPoints)

      // 检测特征点（在缩放后的图像上）
      sift.detect(resizedOriginal, originalKeyPoints)
      sift.detect(resizedTemplate, templateKeyPoints)

      // 特征点数量检查
      if (templateKeyPoints.rows() < 2 || originalKeyPoints.rows() < 2) {
        _logUtils.debugInfo('特征点数量不足，无法进行匹配')
        return null
      }

      // 计算特征描述符
      sift.compute(resizedOriginal, originalKeyPoints, originalResource)
      sift.compute(resizedTemplate, templateKeyPoints, templateResource)

      _logUtils.debugInfo(['模板特征点个数: {}, 原图特征点个数: {}', templateKeyPoints.rows(), originalKeyPoints.rows()])

      // 特征点数量
      let allPoint = templateKeyPoints.rows()
      let matches = new ArrayList()

      // 使用暴力匹配器替代FLANN（在小数据集上更快）
      let descriptorMatcher = DescriptorMatcher.create(DescriptorMatcher.BRUTEFORCE)

      // KNN匹配特征点
      descriptorMatcher.knnMatch(templateResource, originalResource, matches, 2)

      // 匹配结果检查
      if (matches.size() === 0) {
        _logUtils.debugInfo('未找到匹配点')
        return null
      }

      // 简化匹配点筛选逻辑，只使用Ratio Test
      let goodMatchesList = new ArrayList()
      for (let i = 0; i < matches.size(); i++) {
        if (matches.get(i) && matches.get(i).toArray().length >= 2) {
          let matchArray = matches.get(i).toArray()
          let match = matchArray[0]
          // Lowe's Ratio Test
          if (match.distance <= 0.7 * matchArray[1].distance) {
            goodMatchesList.add(match)
          }
        }
      }

      let matchesPointCount = goodMatchesList.size()
      // 调整阈值计算
      let threshold = Math.max(4, Math.min(allPoint * 0.15, 10))
      _logUtils.debugInfo(['找到了匹配总数：{} 阈值：{}', matchesPointCount, threshold])

      // 如果匹配点数量不足阈值，返回null
      if (matchesPointCount < threshold) {
        return null
      }

      // 获取关键点列表
      let originalKeyPointList = originalKeyPoints.toList()
      let templateKeyPointList = templateKeyPoints.toList()
      let sencePoints = new ArrayList()
      let objectPoints = new ArrayList()

      // 提取匹配点的坐标
      for (let i = 0; i < goodMatchesList.size(); i++) {
        let goodMatch = goodMatchesList.get(i)
        if (goodMatch.trainIdx < originalKeyPointList.size() && goodMatch.queryIdx < templateKeyPointList.size()) {
          sencePoints.add(originalKeyPointList.get(goodMatch.trainIdx).pt)
          objectPoints.add(templateKeyPointList.get(goodMatch.queryIdx).pt)
        }
      }

      // 检查提取的点数量
      if (sencePoints.size() < 4 || objectPoints.size() < 4) {
        _logUtils.debugInfo('有效匹配点数量不足，无法计算单应性矩阵')
        return null
      }

      let objMatOfPoint2f = new MatOfPoint2f()
      let senceMatOfPoint2f = new MatOfPoint2f()
      objMatOfPoint2f.fromList(objectPoints)
      senceMatOfPoint2f.fromList(sencePoints)
      matsToRelease.push(objMatOfPoint2f)
      matsToRelease.push(senceMatOfPoint2f)

      // 寻找匹配的关键点的转换矩阵
      let homography = Calib3d.findHomography(objMatOfPoint2f, senceMatOfPoint2f, Calib3d.RANSAC, 3)

      // 检查单应性矩阵是否有效
      if (homography.empty()) {
        _logUtils.debugInfo('无法计算有效的单应性矩阵')
        return null
      }

      // 透视变换，用于矫正图像得到标准图片

      let templateCorners = new Mat(2, 2, CvType.CV_32FC2)
      let templateTransformResult = new Mat(2, 2, CvType.CV_32FC2)
      matsToRelease.push(templateCorners)
      matsToRelease.push(templateTransformResult)

      setCornerPosition(templateCorners, resizedTemplate)

      // 使用perspectiveTransform将模板图进行透视变换以矫正图像
      Core.perspectiveTransform(templateCorners, templateTransformResult, homography)

      // 返回匹配图片的四个边角点，并按缩放比例还原坐标
      let resultPoint = new SiftPointInfo(templateTransformResult)
      resultPoint.scale(1.0 / scaleFactor) // 还原到原始图像坐标

      if (region && region.length > 1) {
        resultPoint.offset(region[0], region[1])
      }

      return resultPoint
    } catch (e) {
      _logUtils.errorInfo('SIFT找图异常' + e)
      commonFunctions.printExceptionStack(e)
      return null
    } finally {
      _logUtils.debugInfo(['SIFT找图耗时：{}ms', new Date().getTime() - start])
      // 确保所有Mat对象都被正确释放
      matsToRelease.forEach(mat => {
        try {
          mat && mat.release && mat.release()
        } catch (releaseError) {
          // 忽略释放错误
        }
      })
    }
  },
  /**
   * SIFT特征匹配 查找多个对象 速度较慢
   * 使用SIFT特征匹配算法查找图像
   * @param {Mat} originalImage - 原始图像Mat对象
   * @param {Mat} templateImage - 模板图像Mat对象
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @param {number} maxTargets - 最大匹配目标数量
   * @returns {SiftPointInfo} 匹配结果信息对象
   */
  findBySIFTMultiple: function (originalImage, templateImage, region, maxTargets) {
    if (originalImage && templateImage) {
      return this.findBySIFTMatMultiple(originalImage.getMat(), templateImage.getMat(), region, maxTargets)
    } else {
      return []
    }
  },
  /**
   * SIFT特征匹配 查找多个对象 速度较慢
   * 使用SIFT特征匹配算法查找Mat图像
   * @param {Mat} originalImage - 原始图像Mat对象
   * @param {Mat} templateImage - 模板图像Mat对象
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @param {number} maxTargets - 最大匹配目标数量
   * @returns {SiftPointInfo} 匹配结果信息对象
   */
  findBySIFTMatMultiple: function (originalImage, templateImage, region, maxTargets) {
    if (!supportSIFT) {
      _logUtils.warnInfo(['当前不支持SIFT找图，使用普通找图查找目标'])
      return this.findByImageMultipleNMS(images.matToImage(originalImage), images.matToImage(templateImage), false, region, null, maxTargets)
    }
    let timeHelper = TimeUtils.start('findBySIFTMatMultiple')
    if (typeof maxTargets == 'undefined' || !maxTargets) {
      maxTargets = 3
    }
    let start = new Date().getTime()
    let matsToRelease = []
    let results = []

    try {
      // 图像缩放参数
      let scaleFactor = 0.85
      timeHelper.beginPhase('图像预处理')
      if (region) {
        matsToRelease.push(originalImage)
        originalImage = new Mat(originalImage, buildRegionMat(region, originalImage))
      }

      let originalResource = new Mat()
      let templateResource = new Mat()
      matsToRelease.push(originalResource)
      matsToRelease.push(templateResource)

      // 创建缩放后的图像
      let resizedOriginal = new Mat()
      let resizedTemplate = new Mat()
      matsToRelease.push(resizedOriginal)
      matsToRelease.push(resizedTemplate)

      // 缩放图像
      Imgproc.resize(originalImage, resizedOriginal, new Size(0, 0), scaleFactor, scaleFactor, Imgproc.INTER_AREA)
      Imgproc.resize(templateImage, resizedTemplate, new Size(0, 0), scaleFactor, scaleFactor, Imgproc.INTER_AREA)
      timeHelper.endPhase()
      timeHelper.beginPhase('SIFT特征匹配')
      // 创建SIFT检测器
      let sift = SIFT.create()

      // 创建特征点容器
      let originalKeyPoints = new MatOfKeyPoint()
      let templateKeyPoints = new MatOfKeyPoint()
      matsToRelease.push(originalKeyPoints)
      matsToRelease.push(templateKeyPoints)

      // 检测特征点
      sift.detect(resizedOriginal, originalKeyPoints)
      sift.detect(resizedTemplate, templateKeyPoints)
      // 特征点数量检查
      if (templateKeyPoints.rows() < 2 || originalKeyPoints.rows() < 2) {
        _logUtils.debugInfo('特征点数量不足，无法进行匹配')
        timeHelper.endPhase().stop(true)
        return []
      }

      // 计算特征描述符
      sift.compute(resizedOriginal, originalKeyPoints, originalResource)
      sift.compute(resizedTemplate, templateKeyPoints, templateResource)

      // 特征匹配
      let matches = new ArrayList()
      let descriptorMatcher = DescriptorMatcher.create(DescriptorMatcher.BRUTEFORCE)
      descriptorMatcher.knnMatch(templateResource, originalResource, matches, 2)

      if (matches.size() === 0) {
        _logUtils.debugInfo('未找到匹配点')
        timeHelper.endPhase().stop(true)
        return []
      }

      // 筛选好的匹配点
      let goodMatchesList = new ArrayList()
      for (let i = 0; i < matches.size(); i++) {
        if (matches.get(i) && matches.get(i).toArray().length >= 2) {
          let matchArray = matches.get(i).toArray()
          let match = matchArray[0]
          if (match.distance <= 0.7 * matchArray[1].distance) {
            goodMatchesList.add(match)
          }
        }
      }

      if (goodMatchesList.size() < 4) {
        timeHelper.endPhase().stop(true)
        return []
      }

      timeHelper.beginPhase('匹配点聚类')
      // 获取关键点列表
      let originalKeyPointList = originalKeyPoints.toList()
      let templateKeyPointList = templateKeyPoints.toList()

      // 收集所有匹配点的坐标
      let matchedPoints = []
      for (let i = 0; i < goodMatchesList.size(); i++) {
        let goodMatch = goodMatchesList.get(i)
        if (goodMatch.trainIdx < originalKeyPointList.size() && goodMatch.queryIdx < templateKeyPointList.size()) {
          let scenePoint = originalKeyPointList.get(goodMatch.trainIdx).pt
          let objectPoint = templateKeyPointList.get(goodMatch.queryIdx).pt
          matchedPoints.push({
            sceneX: scenePoint.x,
            sceneY: scenePoint.y,
            objectX: objectPoint.x,
            objectY: objectPoint.y,
            match: goodMatch
          })
        }
      }

      // 按空间位置聚类匹配点（简单的距离聚类）
      let clusters = this.clusterMatches(matchedPoints, 50) // 50像素为聚类半径
      timeHelper.endPhase().beginPhase('单应性矩阵计算')

      // 按聚类大小排序，大的聚类优先
      clusters.sort((a, b) => b.length - a.length)

      // 对每个聚类进行单应性矩阵计算
      for (let i = 0; i < clusters.length; i++) {
        let cluster = clusters[i]
        if (cluster.length < 4) continue

        let sencePoints = new ArrayList()
        let objectPoints = new ArrayList()

        for (let j = 0; j < cluster.length; j++) {
          sencePoints.add(new Point(cluster[j].sceneX, cluster[j].sceneY))
          objectPoints.add(new Point(cluster[j].objectX, cluster[j].objectY))
        }

        let objMatOfPoint2f = new MatOfPoint2f()
        let senceMatOfPoint2f = new MatOfPoint2f()
        objMatOfPoint2f.fromList(objectPoints)
        senceMatOfPoint2f.fromList(sencePoints)
        matsToRelease.push(objMatOfPoint2f)
        matsToRelease.push(senceMatOfPoint2f)

        // 计算单应性矩阵
        let homography = Calib3d.findHomography(objMatOfPoint2f, senceMatOfPoint2f, Calib3d.RANSAC, 3)

        if (!homography || homography.empty()) {
          continue
        }

        let templateCorners = new Mat(2, 2, CvType.CV_32FC2)
        let templateTransformResult = new Mat(2, 2, CvType.CV_32FC2)
        matsToRelease.push(templateCorners)
        matsToRelease.push(templateTransformResult)

        setCornerPosition(templateCorners, resizedTemplate)

        Core.perspectiveTransform(templateCorners, templateTransformResult, homography)

        let resultPoint = new SiftPointInfo(templateTransformResult)
        resultPoint.scale(1.0 / scaleFactor)

        // 计算匹配质量分数（基于匹配点数量和距离）
        let avgDistance = 0
        for (let j = 0; j < cluster.length; j++) {
          avgDistance += cluster[j].match.distance
        }
        avgDistance /= cluster.length

        // 分数 = 匹配点数量 * (1 - 平均距离)
        resultPoint.score = cluster.length * (1 - avgDistance)

        if (region && region.length > 1) {
          resultPoint.offset(region[0], region[1])
        }

        // 检查结果是否有效（在图像范围内）
        if (resultPoint.left >= 0 && resultPoint.top >= 0 &&
          resultPoint.right <= originalImage.width() &&
          resultPoint.bottom <= originalImage.height()) {
          results.push(resultPoint)
        }
      }

      timeHelper.endPhase().beginPhase('非极大值抑制')
      _logUtils.debugInfo(['找到{}个目标', results.length])

      // 如果不需要NMS或者只有一个结果，直接返回
      if (results.length <= 1) {
        timeHelper.endPhase().stop(true)
        return results.slice(0, maxTargets)
      }

      // 使用改进的非极大值抑制实现
      let boxes = results.map(result => {
        return {
          x: result.left,
          y: result.top,
          width: result.width(),
          height: result.height(),
          score: result.score,
          data: result
        }
      })

      // 按分数排序
      boxes.sort((a, b) => b.score - a.score)

      let nmsResults = []
      while (boxes.length > 0 && nmsResults.length < maxTargets) {
        let bestBox = boxes.shift()
        nmsResults.push(bestBox.data)

        // 过滤掉与当前最佳框重叠度过高的框
        boxes = boxes.filter(box => {
          return this.calculateIoU(bestBox, box) < 0.3 // 降低IOU阈值以提高多目标检测
        })
      }

      results = nmsResults
      timeHelper.endPhase().stop(true)
      return results
    } catch (e) {
      _logUtils.errorInfo('SIFT多目标找图异常' + e)
      commonFunctions.printExceptionStack(e)
      return []
    } finally {
      _logUtils.debugInfo(['SIFT多目标找图耗时：{}ms', new Date().getTime() - start])
      matsToRelease.forEach(mat => {
        try {
          mat && mat.release && mat.release()
        } catch (releaseError) {
          // 忽略释放错误
        }
      })
    }
  },

  /**
   * 改进的聚类算法 - 使用DBSCAN-like方法
   */
  clusterMatches: function (matchedPoints, clusterRadius) {
    let clusters = []
    let visited = new Array(matchedPoints.length).fill(false)

    // 计算所有点之间的距离矩阵（简化实现，避免重复计算）
    let distanceMatrix = []
    for (let i = 0; i < matchedPoints.length; i++) {
      distanceMatrix[i] = []
      for (let j = 0; j < matchedPoints.length; j++) {
        if (i === j) {
          distanceMatrix[i][j] = 0
        } else {
          let dx = matchedPoints[i].sceneX - matchedPoints[j].sceneX
          let dy = matchedPoints[i].sceneY - matchedPoints[j].sceneY
          distanceMatrix[i][j] = Math.sqrt(dx * dx + dy * dy)
        }
      }
    }

    for (let i = 0; i < matchedPoints.length; i++) {
      if (visited[i]) continue

      visited[i] = true
      let cluster = [matchedPoints[i]]
      let neighbors = this.findNeighbors(i, matchedPoints, distanceMatrix, clusterRadius)

      // 扩展聚类
      for (let j = 0; j < neighbors.length; j++) {
        let neighborIdx = neighbors[j]
        if (!visited[neighborIdx]) {
          visited[neighborIdx] = true
          let newNeighbors = this.findNeighbors(neighborIdx, matchedPoints, distanceMatrix, clusterRadius)
          neighbors = neighbors.concat(newNeighbors.filter(n => !neighbors.includes(n)))
          cluster.push(matchedPoints[neighborIdx])
        }
      }

      if (cluster.length >= 4) {
        clusters.push(cluster)
      }
    }

    return clusters
  },

  /**
   * 查找邻近点
   */
  findNeighbors: function (pointIdx, points, distanceMatrix, radius) {
    let neighbors = []
    for (let i = 0; i < points.length; i++) {
      if (i !== pointIdx && distanceMatrix[pointIdx][i] < radius) {
        neighbors.push(i)
      }
    }
    return neighbors
  },
  // 匹配点聚类算法
  clusterMatchesBad: function (matchedPoints, clusterRadius) {
    let clusters = []
    let used = new Array(matchedPoints.length).fill(false)

    for (let i = 0; i < matchedPoints.length; i++) {
      if (used[i]) continue

      let cluster = [matchedPoints[i]]
      used[i] = true

      for (let j = i + 1; j < matchedPoints.length; j++) {
        if (used[j]) continue

        let dx = matchedPoints[i].sceneX - matchedPoints[j].sceneX
        let dy = matchedPoints[i].sceneY - matchedPoints[j].sceneY
        let distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < clusterRadius) {
          cluster.push(matchedPoints[j])
          used[j] = true
        }
      }

      if (cluster.length >= 4) { // 至少需要4个点计算单应性矩阵
        clusters.push(cluster)
      }
    }

    // 按聚类大小排序，大的聚类优先
    clusters.sort((a, b) => b.length - a.length)
    return clusters
  },
  /**
   * 简单图像匹配查找
   * 使用Auto.js内置的图像匹配算法查找图像
   * @param {ImageWrapper} originalImage - 原始图像
   * @param {ImageWrapper} templateImage - 模板图像
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @returns {SimplePointInfo|null} 匹配结果或null
   */
  findByImageSimple: function (originalImage, templateImage, region) {
    let start = new Date().getTime()
    try {
      let point = images.findImage(originalImage, templateImage, { region: region })
      if (!point) {
        return null
      }
      return new SimplePointInfo(point, templateImage)
    } finally {
      _logUtils.debugInfo(['普通找图耗时：{}ms', new Date().getTime() - start])
      originalImage.recycle()
      templateImage.recycle()
    }
  },
  /**
   * 多目标图像匹配查找，默认进行灰度化处理，以便加快匹配速度，可通过参数控制强制使用彩色图片
   * 使用OpenCV的模版匹配算法查找图像
   * @param {ImageWrapper} originalImageWrapper - 原始图像
   * @param {ImageWrapper} templateImageWrapper - 模板图像
   * @param {boolean} forceRgb - 是否使用彩色图片匹配
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @param {number} threshold - 匹配阈值
   * @param {number} maxTargets - 最大目标数量
   * @param {number} nmsThreshold - NMS阈值
   * @returns {Array<SimplePointInfo>|null} 匹配结果或null
   */
  findByImageMultipleNMS: function (originalImageWrapper, templateImageWrapper, forceRgb, region, threshold, maxTargets, nmsThreshold) {
    threshold = threshold || 0.8
    maxTargets = maxTargets || 5
    nmsThreshold = nmsThreshold || 0.3

    let start = new Date().getTime()
    let matsToRelease = []
    let results = []
    let timeUtilHelper = TimeUtils.start('findByImageMultipleNMS')
    try {
      let originalImage = originalImageWrapper.getMat()
      let templateImage = templateImageWrapper.getMat()

      if (region) {
        matsToRelease.push(originalImage)
        originalImage = new Mat(originalImage, buildRegionMat(region, originalImage))
      }

      let originalGray = new Mat()
      let templateGray = new Mat()
      matsToRelease.push(originalGray)
      matsToRelease.push(templateGray)

      // ✅ 正确灰度转换（避免引用问题）
      if (originalImage.channels() > 1 && !forceRgb) {
        Imgproc.cvtColor(originalImage, originalGray, Imgproc.COLOR_BGR2GRAY)
      } else {
        originalImage.copyTo(originalGray); // 安全复制
      }

      if (templateImage.channels() > 1 && !forceRgb) {
        Imgproc.cvtColor(templateImage, templateGray, Imgproc.COLOR_BGR2GRAY)
      } else {
        templateImage.copyTo(templateGray)
      }

      let result = new Mat()
      matsToRelease.push(result)
      timeUtilHelper.beginPhase('模板匹配')
      // ✅ 模板匹配 当指定了forceRgb时，此时其实并未进行灰度化处理
      Imgproc.matchTemplate(originalGray, templateGray, result, Imgproc.TM_CCOEFF_NORMED)
      timeUtilHelper.endPhase('模板匹配')
      let resultWidth = result.cols()
      let resultHeight = result.rows()
      let templateWidth = templateGray.cols()
      let templateHeight = templateGray.rows()


      // ✅ 获取匹配结果数据
      let candidates = []
      // Rhino中遍历get执行速度太慢，降低采样率 以便提高速度
      let step = 2
      timeUtilHelper.beginPhase('获取匹配结果数据')
      // 使用get方法逐像素读取（这是Java OpenCV的标准做法）
      for (let y = 0; y < resultHeight; y += step) {
        for (let x = 0; x < resultWidth; x += step) {
          let value = result.get(y, x)[0]
          if (value >= threshold) {
            candidates.push({
              x: x,
              y: y,
              confidence: value,
              width: templateWidth,
              height: templateHeight
            })
          }
        }
      }
      timeUtilHelper.endPhase('获取匹配结果数据')

      // ✅ 关键优化2：按置信度排序（仅一次）
      candidates.sort((a, b) => b.confidence - a.confidence)

      timeUtilHelper.beginPhase('NMS标记计算')
      // ✅ 关键优化3：NMS 使用标记法（O(n)），避免反复 filter
      let used = new Array(candidates.length).fill(false)
      let finalDetections = []

      for (let i = 0; i < candidates.length && finalDetections.length < maxTargets; i++) {
        if (used[i]) continue

        let best = candidates[i]
        finalDetections.push(best)
        used[i] = true

        // 标记所有与 best 重叠超过 nmsThreshold 的候选框为已用
        for (let j = i + 1; j < candidates.length; j++) {
          if (used[j]) continue
          let iou = this.calculateIoU(best, candidates[j])
          if (iou >= nmsThreshold) {
            used[j] = true
          }
        }
      }
      timeUtilHelper.endPhase('NMS标记计算')
      // ✅ 构建最终结果
      timeUtilHelper.beginPhase('构建最终结果')
      for (let det of finalDetections) {
        let resultPoint = new SimplePointInfo({
          x: det.x,
          y: det.y,
        }, templateImageWrapper)
        resultPoint.confidence = det.confidence

        if (region && region.length >= 4) {
          resultPoint.offset(region[0], region[1])
        }

        results.push(resultPoint)
      }
      timeUtilHelper.endPhase('构建最终结果')
      // 打印各阶段耗时信息
      timeUtilHelper.stop(true)
      return results
    } catch (e) {
      _logUtils.errorInfo('模板匹配多目标找图NMS异常' + e)
      commonFunctions.printExceptionStack(e)
      return []
    } finally {
      _logUtils.debugInfo(['模板匹配多目标找图NMS耗时：{}ms', new Date().getTime() - start])
      matsToRelease.forEach(mat => {
        try {
          mat && mat.release && mat.release()
        } catch (releaseError) {
          // 忽略释放错误
        }
      })
    }
  },

  // 计算两个矩形的IoU（交并比）
  calculateIoU: function (rect1, rect2) {
    let x1 = Math.max(rect1.x, rect2.x)
    let y1 = Math.max(rect1.y, rect2.y)
    let x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width)
    let y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height)

    if (x2 <= x1 || y2 <= y1) return 0

    let intersection = (x2 - x1) * (y2 - y1)
    let area1 = rect1.width * rect1.height
    let area2 = rect2.width * rect2.height
    let union = area1 + area2 - intersection

    return intersection / union
  },

  /**
   * 通过Base64字符串查找灰度图像
   * 将Base64字符串转换为灰度图像后进行查找
   * @param {ImageWrapper} originImg - 原始图像
   * @param {string} base64 - 模板图像的Base64字符串
   * @param {boolean} alreadyGray - 原始图像是否已经是灰度图
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @returns {SimplePointInfo|null} 匹配结果或null
   */
  findByGrayBase64: function (originImg, base64, alreadyGray, region) {
    if (alreadyGray) {
      originImg = images.cvtColor(originImg, "GRAY2BGRA")
    } else {
      originImg = images.cvtColor(images.grayscale(originImg), "GRAY2BGRA")
    }
    return this.findByImageSimple(originImg, images.fromBase64(base64), region)
  },

  /**
   * 通过Base64字符串进行简单图像查找
   * 将Base64字符串转换为图像后进行简单查找
   * @param {ImageWrapper} originImg - 原始图像
   * @param {string} base64 - 模板图像的Base64字符串
   * @param {Array} region - 查找区域 [x, y, width, height]
   * @returns {SimplePointInfo|null} 匹配结果或null
   */
  findBySimpleBase64: function (originImg, base64, region) {
    return this.findByImageSimple(originImg, images.fromBase64(base64), region)
  },

  /**
   * 裁剪图像文件
   * 根据指定坐标裁剪图像文件
   * @param {string} imagePath - 图像文件路径
   * @param {number} x - 裁剪起始X坐标
   * @param {number} y - 裁剪起始Y坐标
   * @param {number} w - 裁剪宽度
   * @param {number} h - 裁剪高度
   * @returns {ImageWrapper} 裁剪后的图像
   */
  clipByPath: function (imagePath, x, y, w, h) {
    let originalImg = this.readImageSimple(imagePath)
    return images.clip(originalImg, x, y, w, h)
  },

  /**
   * 通过图像Base64获取区域
   * 使用图像匹配找到指定区域的位置
   * @param {ImageWrapper} screen - 屏幕截图
   * @param {string} imgBase64 - 目标图像的Base64字符串
   * @param {string} desc - 区域描述
   * @returns {Array|null} 区域坐标数组 [x, y, width, height] 或null
   */
  getRegionByImg: function (screen, imgBase64, desc) {
    if (!imgBase64) {
      return null
    }
    let imagePoint = this.findByGrayBase64(screen, imgBase64)
    if (!imagePoint) {
      imagePoint = this.findBySIFTGrayBase64(screen, imgBase64)
    }
    if (imagePoint) {
      let region = [
        imagePoint.left, imagePoint.top,
        imagePoint.width(), imagePoint.height()
      ]
      _logUtils.debugInfo(['通过图像检测到[{}]区域：{}', desc, JSON.stringify(region)])
      return region
    } else {
      _logUtils.debugInfo(['未能通过图像检测到[{}]区域', desc])
    }
    return null
  }
}

/**
* 计算RGB三通道的加权平均值
* 使用标准的RGB权重：R=0.299, G=0.587, B=0.114
* @param {Array} values - 包含三个通道值的数组 [B, G, R] (OpenCV默认BGR顺序)
* @returns {number} 加权平均值
*/
function calculateWeightedAverage (values) {
  // OpenCV中默认是BGR顺序，所以索引0是Blue，1是Green，2是Red
  return values[2] * 0.299 + values[1] * 0.587 + values[0] * 0.114
}

/**
 * 设置模板图像的角点位置
 * 用于SIFT匹配中的透视变换
 * @param {Mat} templateCorners - 角点坐标矩阵 new Mat(2, 2, CvType.CV_32FC2)
 * @param {Mat} templateImage - 模板图像
 */
function setCornerPosition (templateCorners, templateImage) {
  var tp = util.java.array('double', 2)
  tp[0] = 0
  tp[1] = 0
  templateCorners.put(0, 0, tp)
  tp[0] = templateImage.cols()
  templateCorners.put(1, 0, tp)
  tp[1] = templateImage.rows()
  templateCorners.put(1, 1, tp)
  tp[0] = 0
  templateCorners.put(0, 1, tp)
}

/**
 * 构建查找区域（基于图像）
 * 根据图像尺寸构建OpenCV的Rect区域对象
 * @param {Array} region - 区域数组 [x, y, width, height]
 * @param {ImageWrapper} img - 图像对象
 * @returns {org.opencv.core.Rect} OpenCV的Rect对象
 */
function buildRegion (region, img) {
  if (region == undefined) {
    region = []
  }
  var x = region[0] === undefined ? 0 : region[0]
  var y = region[1] === undefined ? 0 : region[1]
  var width = region[2] === undefined ? img.getWidth() - x : region[2]
  var height = region[3] === undefined ? (img.getHeight() - y) : region[3]
  var r = new org.opencv.core.Rect(x, y, width, height)
  if (x < 0 || y < 0 || x + width > img.width || y + height > img.height) {
    throw new Error("out of region: region = [" + [x, y, width, height] + "], image.size = [" + [img.width, img.height] + "]")
  }
  return r
}

/**
 * 构建查找区域（基于Mat）
 * 根据Mat尺寸构建OpenCV的Rect区域对象
 * @param {Array} region - 区域数组 [x, y, width, height]
 * @param {Mat} mat - Mat对象
 * @returns {org.opencv.core.Rect} OpenCV的Rect对象
 */
function buildRegionMat (region, mat) {
  if (region == undefined) {
    region = []
  }
  var x = region[0] === undefined ? 0 : region[0]
  var y = region[1] === undefined ? 0 : region[1]
  var width = region[2] === undefined ? mat.cols() - x : region[2]
  var height = region[3] === undefined ? (mat.rows() - y) : region[3]
  var r = new org.opencv.core.Rect(x, y, width, height)
  if (x < 0 || y < 0 || x + width > mat.cols() || y + height > mat.rows()) {
    throw new Error("out of region: region = [" + [x, y, width, height] + "], image.size = [" + [mat.cols(), mat.rows()] + "]")
  }
  return r
}

/**
 * 匹配点基类
 * 定义匹配点的基本属性和方法
 */
function MatchPoint () {
  /**
   * 偏移坐标
   * @param {number} dx - X轴偏移量
   * @param {number} dy - Y轴偏移量
   */
  this.offset = (dx, dy) => {
    this.left += dx
    this.top += dy
    this.right += dx
    this.bottom += dy
  }

  // 缩放坐标
  this.scale = function (scaleFactor) {
    let width = this.right - this.left
    let height = this.bottom - this.top
    this.left *= scaleFactor
    this.top *= scaleFactor
    this.right = this.left + width * scaleFactor
    this.bottom = this.top + height * scaleFactor
  }

  /**
   * 获取宽度
   * @returns {number} 区域宽度
   */
  this.width = () => {
    return Math.floor(this.right - this.left)
  }

  /**
   * 获取高度
   * @returns {number} 区域高度
   */
  this.height = () => {
    return Math.floor(this.bottom - this.top)
  }

  /**
   * 获取中心X坐标
   * @returns {number} 中心X坐标
   */
  this.centerX = () => this.left + this.width() / 2

  /**
   * 获取中心Y坐标
   * @returns {number} 中心Y坐标
   */
  this.centerY = () => this.top + this.height() / 2

  /**
   * 获取四舍五入的X坐标
   * @returns {number} 四舍五入后的X坐标
   */
  this.roundX = () => Math.round(this.left)

  /**
   * 获取四舍五入的Y坐标
   * @returns {number} 四舍五入后的Y坐标
   */
  this.roundY = () => Math.round(this.top)

  // 模拟bounds方法
  this.bounds = () => this
}

/**
 * SIFT匹配点信息类
 * 继承自MatchPoint，用于存储SIFT匹配的结果信息
 * @param {Mat} corners - 角点坐标矩阵
 */
function SiftPointInfo (corners) {
  MatchPoint.call(this)
  this.left = corners.get(0, 0)[0]
  this.right = corners.get(1, 0)[0]
  this.top = corners.get(0, 0)[1]
  this.bottom = corners.get(0, 1)[1]

  SiftPointInfo.prototype = Object.create(MatchPoint.prototype)
  SiftPointInfo.prototype.constructor = SiftPointInfo
}

/**
 * 简单匹配点信息类
 * 继承自MatchPoint，用于存储简单图像匹配的结果信息
 * @param {Point} point - 匹配点坐标
 * @param {ImageWrapper} tempImg - 模板图像
 */
function SimplePointInfo (point, tempImg) {
  MatchPoint.call(this)
  this.left = point.x
  this.right = point.x + tempImg.getWidth()
  this.top = point.y
  this.bottom = point.y + tempImg.getHeight()

  SimplePointInfo.prototype = Object.create(MatchPoint.prototype)
  SimplePointInfo.prototype.constructor = SimplePointInfo
}