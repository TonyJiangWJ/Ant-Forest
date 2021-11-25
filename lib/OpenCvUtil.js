/*
 * @Author: TonyJiangWJ
 * @Date: 2020-10-20 23:45:05
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-29 22:55:31
 * @Description: 封装了一些基于OpenCV的函数方法，用于识别特殊内容等
 */
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
  console.info('当前OpenCV版本：' + org.opencv.core.Core.VERSION)
  importClass(org.opencv.features2d.SIFT)
  supportSIFT = true
} catch (e) {
  console.warn('当前版本AutoJS 不支持SIFT')
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
  findBySimplePath: function (originalImagePath, templateImagePath) {
    let originalImage = this.readImageSimple(originalImagePath)
    let templateImage = this.readImageSimple(templateImagePath)
    return this.findByImageSimple(originalImage, templateImage)
  },
  findBySIFTPath: function (originalImagePath, templateImagePath) {
    let originalImage = this.readImage(originalImagePath)
    let templateImage = this.readImage(templateImagePath)
    return this.findBySIFT(originalImage, templateImage)
  },
  /**
   * SIFT特征匹配 来源 AutoJS Pro 高危内测群
   * @param {*} originalImage 
   * @param {*} templateImage 
   * @returns 
   */
  findBySIFT: function (originalImage, templateImage) {
    if (!supportSIFT) {
      return this.findByImageSimple(originalImage, templateImage)
    }
    let matsToRelease = [originalImage, templateImage]
    try {
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

      let matches = new ArrayList()
      let descriptorMatcher = DescriptorMatcher.create(DescriptorMatcher.FLANNBASED)
      descriptorMatcher.knnMatch(templateResource, originalResource, matches, 2)
      let maxDist = 0, minDist = 100
      for (let i = 0; i < templateKeyPoints.rows; i++) {
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
      if (matchesPointCount < 4) {
        return null
      }
      console.verbose('找到了匹配总数：' + matchesPointCount)

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
      return new SiftPointInfo(templateTransformResult)
    } finally {
      matsToRelease.forEach(mat => {
        mat && mat.release()
      })
    }
  },
  findByImageSimple: function (originalImage, templateImage) {
    try {
      let point = images.findImage(originalImage, templateImage)
      if (!point) {
        return null
      }
      return new SimplePointInfo(point, templateImage)
    } finally {
      originalImage.recycle()
      templateImage.recycle()
    }
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

function SiftPointInfo (corners) {
  this.left = corners.get(0, 0)[0]
  this.right = corners.get(1, 0)[0]
  this.top = corners.get(0, 0)[1]
  this.bottom = corners.get(0, 1)[1]

  this.width = () => {
    return this.right - this.left
  }

  this.height = () => {
    return this.bottom - this.top
  }
}

function SimplePointInfo (point, tempImg) {
  this.left = point.x
  this.right = point.x + tempImg.getWidth()
  this.top = point.y
  this.bottom = point.y + tempImg.getHeight()

  this.width = () => {
    return this.right - this.left
  }

  this.height = () => {
    return this.bottom - this.top
  }
}