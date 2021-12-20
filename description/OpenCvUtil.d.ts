/*
 * @Author: TonyJiangWJ
 * @Date: 2020-10-20 23:45:05
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-29 22:55:31
 * @Description: 封装了一些基于OpenCV的函数方法，用于识别特殊内容等
 */
declare module OpenCvUtil {
  /**
   * 识别区域内的差异化均值，理论上颜色差异越大 返回的值也越大
   *
   * @param {ImageWrapper} hsvImg
   */
  function getHistAverage(hsvImg: ImageWrapper): Number
  /**
   * 识别区域主色
   *
   * @param {ImageWrapper} img
   */
  function getMedian(img: ImageWrapper)
  /**
   * 获取指定图片的颜色直方图的标准差，请传入灰度图
   *
   * @param {Image} img
   */
  function getStandardDeviation(img: ImageWrapper)
  function readImage(imagePath: String, flag: Number): Mat
  function findBySIFTPath(
    originalImagePath: String,
    templateImagePath: String
  ): Array
  /**
   * SIFT特征匹配 来源 AutoJS Pro 高危内测群
   * @param {ImageWrapper} originalImage 
   * @param {ImageWrapper} templateImage
   * @returns {SiftPointInfo}
   */
  function findBySIFT(originalImage, templateImage): Array
}
