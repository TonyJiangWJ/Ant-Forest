/*
 * @Author: TonyJiangWJ
 * @Date: 2020-10-20 23:45:05
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-29 22:55:31
 * @Description: 封装了一些基于OpenCV的函数方法，用于识别特殊内容等
 */
importClass(org.opencv.core.CvType)
importClass(org.opencv.core.Mat)
importClass(org.opencv.core.MatOfInt)
importClass(org.opencv.core.MatOfFloat)
importClass(org.opencv.imgproc.Imgproc)
importClass(java.util.Arrays)
runtime.getImages().initOpenCvIfNeeded()
module.exports = {
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
  }
}
