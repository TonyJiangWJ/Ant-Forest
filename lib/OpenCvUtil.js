/*
 * @Author: TonyJiangWJ
 * @Date: 2020-10-20 23:45:05
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-10-15 14:47:45
 * @Description: 封装了一些基于OpenCV的函数方法，用于识别特殊内容等
 */
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let _logUtils = singletonRequire('LogUtils')
let commonFunctions = singletonRequire('CommonFunction')
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
  getOpenCvVersion: function () {
    return Core.VERSION
  },
  /**
   * 识别区域内的差异化均值，理论上颜色差异越大 返回的值也越大 
   * 
   * @param {*} hsvImg 
   */
  getHistAverage: function (hsvImg) {
    let hsvMat = hsvImg.mat
    let average = 0.0
    let hist = new Mat(256, 1, CvType.CV_8UC1)
    let histSize = new MatOfInt([256])
    let ranges = new MatOfFloat([0, 256])
    // compute the histogram
    Imgproc.calcHist(Arrays.asList(hsvMat), new MatOfInt([0]), new Mat(), hist, histSize, ranges)

    // get the average Hue value of the image
    // (sum(bin(h)*h))/(image-height*image-width)
    // -----------------
    // equivalent to get the hue of each pixel in the image, add them, and
    // divide for the image size (height and width)
    for (let h = 0; h < hist.rows(); h++) {
      // for each bin, get its value and multiply it for the corresponding
      // hue
      average += (hist.get(h, 0)[0] * h)
    }

    // return the average hue of the image
    average = average / hsvMat.size().height / hsvMat.size().width

    return average
  },
  /**
   * 识别区域主色
   * 
   * @param {*} img 
   */
  getMedian: function (img) {
    let mat = img.mat
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

    return med
  },
  /**
   * 获取指定图片的颜色直方图的标准差，请传入灰度图
   * 
   * @param {Image} img 
   */
  getStandardDeviation: function (img) {
    let mat = img.mat
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
    return Math.sqrt(resultList.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b) / resultList.length)
  },
  readImage: function (imagePath, flag) {
    if (!files.exists(imagePath) || files.isDir(imagePath)) throw new Error("文件不存在或为文件夹:" + imagePath)
    flag = typeof flag !== 'number' ? 1 : flag
    return supportSIFT ? Imgcodecs.imread(files.path(imagePath), flag) : images.read(files.path(imagePath))
  },
  readImageSimple: function (imagePath) {
    if (!files.exists(imagePath) || files.isDir(imagePath)) throw new Error("文件不存在或为文件夹:" + imagePath)
    return images.read(files.path(imagePath))
  },
  saveImage: function (mat, imagePath) {
    if (!java.lang.Class.forName("org.opencv.core.Mat", true, context.getClass().getClassLoader()).isInstance(mat))
      throw new Error("参数类型不对")
    files.createWithDirs(imagePath)
    return Imgcodecs.imwrite(files.path(imgFile), mat)
  },
  saveImageSimple: function (img, imagePath) {
    files.createWithDirs(imagePath)
    images.save(img, imagePath)
  },
  findBySimplePath: function (originalImagePath, templateImagePath, region) {
    let originalImage = this.readImageSimple(originalImagePath)
    let templateImage = this.readImageSimple(templateImagePath)
    return this.findByImageSimple(originalImage, templateImage, region)
  },
  findBySIFTPath: function (originalImagePath, templateImagePath, region) {
    if (!supportSIFT) {
      return this.findBySimplePath(originalImagePath, templateImagePath, region)
    }
    let originalImage = this.readImage(originalImagePath)
    let templateImage = this.readImage(templateImagePath)
    return this.findBySIFTMat(originalImage, templateImage, region)
  },
  findBySIFTBase64: function (originalImage, base64, region) {
    return this.findBySIFT(originalImage, images.fromBase64(base64), region)
  },
  findBySIFTGrayBase64: function (originImg, base64, alreadyGray, region) {
    if (alreadyGray) {
      originImg = images.cvtColor(originImg, "GRAY2BGRA")
    } else {
      originImg = images.cvtColor(images.grayscale(originImg), "GRAY2BGRA")
    }
    return this.findBySIFT(originImg, images.fromBase64(base64), region)
  },
  /**
   * SIFT特征匹配 来源 AutoJS Pro 高危内测群
   * @param {ImageWrapper} originalImage 
   * @param {ImageWrapper} templateImage
   * @returns 
   */
  findBySIFT: function (originalImage, templateImage, region) {
    if (!supportSIFT) {
      return this.findByImageSimple(originalImage, templateImage, region)
    } else {
      return this.findBySIFTMat(originalImage.getMat(), templateImage.getMat(), region)
    }
  },
  /**
   * SIFT特征匹配 来源 AutoJS Pro 高危内测群
   * @param {Mat} originalImage 
   * @param {Mat} templateImage
   * @returns {SiftPointInfo}
   */
  findBySIFTMat: function (originalImage, templateImage, region) {
    if (!supportSIFT) {
      return this.findByImageSimple(images.matToImage(originalImage), images.matToImage(templateImage), region)
    }
    let start = new Date().getTime()
    let matsToRelease = []
    try {
      if (region) {
        matsToRelease.push(originalImage)
        originalImage = new Mat(originalImage, buildRegion(region, img))
      }
      let originalResource = new Mat()
      let templateResource = new Mat()
      matsToRelease.push(originalResource)
      matsToRelease.push(templateResource)
      // 创建sift
      let sift = SIFT.create()
      // 创建特征点
      let originalKeyPoints = new MatOfKeyPoint()
      let templateKeyPoints = new MatOfKeyPoint()
      matsToRelease.push(originalKeyPoints)
      matsToRelease.push(templateKeyPoints)
      // 检测特征点
      sift.detect(originalImage, originalKeyPoints)
      sift.detect(templateImage, templateKeyPoints)
      sift.compute(originalImage, originalKeyPoints, originalResource)
      sift.compute(templateImage, templateKeyPoints, templateResource)
      _logUtils.debugInfo(['模板特征点个数 rows: {} cols: {}', templateKeyPoints.rows(), templateKeyPoints.cols()])
      let allPoint = templateKeyPoints.rows() * templateKeyPoints.cols()
      let matches = new ArrayList()
      let descriptorMatcher = DescriptorMatcher.create(DescriptorMatcher.FLANNBASED)
      descriptorMatcher.knnMatch(templateResource, originalResource, matches, 2)
      let maxDist = 0, minDist = 100
      for (let i = 0; i < templateKeyPoints.rows(); i++) {
        let distance = matches.get(i).distance
        maxDist = distance > maxDist ? distance : maxDist
        minDist = distance < minDist ? distance : minDist
      }

      let goodMatchesList = new ArrayList()
      for (i = 0; i < matches.size(); i++) {
        let match = matches.get(i).toArray()[0]
        if (match.distance <= 2 * minDist) {
          goodMatchesList.add(match)
        }
      }

      let matchesPointCount = goodMatchesList.size()
      let threshold = Math.max(4, allPoint * 0.4)
      _logUtils.debugInfo(['找到了匹配总数：{} 阈值：{}', matchesPointCount, threshold])
      if (matchesPointCount < threshold) {
        return null
      }

      let originalKeyPointList = originalKeyPoints.toList()
      let templateKeyPointList = templateKeyPoints.toList()
      let sencePoints = new ArrayList()
      let objectPoints = new ArrayList()

      for (i = 0; i < goodMatchesList.size(); i++) {
        let goodMatch = goodMatchesList.get(i)
        sencePoints.add(originalKeyPointList.get(goodMatch.trainIdx).pt)
        objectPoints.add(templateKeyPointList.get(goodMatch.queryIdx).pt)
      }
      let objMatOfPoint2f = new MatOfPoint2f()
      objMatOfPoint2f.fromList(objectPoints)
      let senceMatOfPoint2f = new MatOfPoint2f()
      senceMatOfPoint2f.fromList(sencePoints)
      matsToRelease.push(objMatOfPoint2f)
      matsToRelease.push(senceMatOfPoint2f)
      // 寻找匹配的关键点的转换
      let homography = Calib3d.findHomography(objMatOfPoint2f, senceMatOfPoint2f, Calib3d.RANSAC, 3)
      // 透视变换(Perspective Transformation)是将图片投影到一个新的视平面(Viewing Plane)，也称作投影映射(Projective Mapping)。
      let templateCorners = new Mat(2, 2, CvType.CV_32FC2)
      let templateTransformResult = new Mat(2, 2, CvType.CV_32FC2)
      matsToRelease.push(templateCorners)
      matsToRelease.push(templateTransformResult)
      setCornerPosition(templateCorners, templateImage)
      //使用 perspectiveTransform 将模板图进行透视变以矫正图象得到标准图片
      Core.perspectiveTransform(templateCorners, templateTransformResult, homography)
      // 返回匹配图片的四个边角点
      let resultPoint = new SiftPointInfo(templateTransformResult)
      if (region && region.length > 1) {
        resultPoint.offset(region[0], region[1])
      }
      return resultPoint
    } catch(e) {
      _logUtils.errorInfo('SIFT找图异常' + e)
      commonFunctions.printExceptionStack(e)
      return null
    } finally {
      _logUtils.debugInfo(['SIFT找图耗时：{}ms', new Date().getTime() - start])
      matsToRelease.forEach(mat => {
        mat && mat.release()
      })
    }
  },
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
  findByGrayBase64: function (originImg, base64, alreadyGray, region) {
    if (alreadyGray) {
      originImg = images.cvtColor(originImg, "GRAY2BGRA")
    } else {
      originImg = images.cvtColor(images.grayscale(originImg), "GRAY2BGRA")
    }
    return this.findByImageSimple(originImg, images.fromBase64(base64), region)
  },
  findBySimpleBase64: function (originImg, base64, region) {
    return this.findByImageSimple(originImg, images.fromBase64(base64), region)
  },
  clipByPath: function (imagePath, x, y, w, h) {
    let originalImg = this.readImageSimple(imagePath)
    return images.clip(originalImg, x, y, w, h)
  }
}

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

function buildRegion (region, img) {
  if (region == undefined) {
    region = [];
  }
  var x = region[0] === undefined ? 0 : region[0];
  var y = region[1] === undefined ? 0 : region[1];
  var width = region[2] === undefined ? img.getWidth() - x : region[2];
  var height = region[3] === undefined ? (img.getHeight() - y) : region[3];
  var r = new org.opencv.core.Rect(x, y, width, height);
  if (x < 0 || y < 0 || x + width > img.width || y + height > img.height) {
    throw new Error("out of region: region = [" + [x, y, width, height] + "], image.size = [" + [img.width, img.height] + "]");
  }
  return r;
}
function buildRegionMat (region, mat) {
  if (region == undefined) {
    region = [];
  }
  var x = region[0] === undefined ? 0 : region[0];
  var y = region[1] === undefined ? 0 : region[1];
  var width = region[2] === undefined ? mat.cols() - x : region[2];
  var height = region[3] === undefined ? (mat.rows() - y) : region[3];
  var r = new org.opencv.core.Rect(x, y, width, height);
  if (x < 0 || y < 0 || x + width > mat.cols() || y + height > mat.rows()) {
    throw new Error("out of region: region = [" + [x, y, width, height] + "], image.size = [" + [mat.cols(), mat.rows()] + "]");
  }
  return r;
}


function MatchPoint () {
  this.offset = (dx, dy) => {
    this.left += dx;
    this.top += dy;
    this.right += dx;
    this.bottom += dy;
  }
  this.width = () => {
    return Math.floor(this.right - this.left)
  }

  this.height = () => {
    return Math.floor(this.bottom - this.top)
  }

  this.centerX = () => this.left + this.width() / 2
  this.centerY = () => this.top + this.height() / 2

  this.roundX = () => Math.round(this.left)
  this.roundY = () => Math.round(this.top)
}

function SiftPointInfo (corners) {
  MatchPoint.call(this)
  this.left = corners.get(0, 0)[0]
  this.right = corners.get(1, 0)[0]
  this.top = corners.get(0, 0)[1]
  this.bottom = corners.get(0, 1)[1]

  SiftPointInfo.prototype = Object.create(MatchPoint.prototype)
  SiftPointInfo.prototype.constructor = SiftPointInfo
}

function SimplePointInfo (point, tempImg) {
  MatchPoint.call(this)
  this.left = point.x
  this.right = point.x + tempImg.getWidth()
  this.top = point.y
  this.bottom = point.y + tempImg.getHeight()

  SimplePointInfo.prototype = Object.create(MatchPoint.prototype)
  SimplePointInfo.prototype.constructor = SimplePointInfo
}
