/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-11 18:28:23
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-11 22:08:08
 * @Description: 图片资源监听并自动回收
 */

module.exports = function (__runtime__, scope) {
  if (typeof scope.resourceMonitor === 'undefined' || scope.resourceMonitor === null) {
    let _o_images = scope.images
    function ResourceMonitor () {
      this.images = []
      this.writeLock = threads.lock()
      this.init()
    }

    ResourceMonitor.prototype.releaseAll = function () {
      console.verbose('释放图片，总数：' + this.images.length)
      try {
        this.writeLock.lock()
        this.recycleImages(this.images.splice(0))
      } finally {
        this.writeLock.unlock()
      }
    }

    ResourceMonitor.prototype.addImageToList = function (img) {

      try {
        this.writeLock.lock()
        this.images.push(img)
        // 达到一定阈值后回收
        if (this.images.length > 50) {
          this.recycleImages(this.images.splice(0, 50))
        }
      } finally {
        this.writeLock.unlock()
      }
    }

    ResourceMonitor.prototype.recycleImages = function (forRecycleList) {
      if (forRecycleList && forRecycleList.length > 0) {
        threads.start(function () {
          forRecycleList.forEach(img => {
            try {
              if (img.mat !== null) {
                img.recycle()
              }
            } catch (e) { }
          })
        })
      }
    }

    ResourceMonitor.prototype.init = function () {

      let that = this

      const M_Images = function () {
        _o_images.constructor.call(this)
      }
      M_Images.prototype = Object.create(_o_images.constructor.prototype)
      M_Images.prototype.constructor = _o_images.constructor

      M_Images.prototype.captureScreen = function () {
        let img = _o_images.captureScreen()
        that.addImageToList(img)
        return img
      }

      M_Images.prototype.copy = function (origialImg) {
        let newImg = _o_images.copy(origialImg)
        that.addImageToList(newImg)
        return newImg
      }

      M_Images.prototype.read = function (path) {
        let newImg = _o_images.read(path)
        that.addImageToList(newImg)
        return newImg
      }

      M_Images.prototype.load = function (path) {
        let newImg = _o_images.load(path)
        that.addImageToList(newImg)
        return newImg
      }

      M_Images.prototype.clip = function (img, x, y, w, h) {
        let newImg = _o_images.clip(img, x, y, w, h)
        that.addImageToList(newImg)
        return newImg
      }

      M_Images.prototype.interval = function (img, color, threshold) {
        let intervalImg = _o_images.interval(img, color, threshold)
        that.addImageToList(intervalImg)
        return intervalImg
      }

      M_Images.prototype.grayscale = function (img) {
        let grayImg = _o_images.grayscale(img)
        that.addImageToList(grayImg)
        return grayImg
      }

      M_Images.prototype.inRange = function (img) {


      }

      M_Images.prototype.threshold = function (img, threshold, maxVal, type) {
        let nImg = _o_images.threshold(img, threshold, maxVal, type)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.inRange = function (img, lowerBound, upperBound) {
        let nImg = _o_images.inRange(img, lowerBound, upperBound)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.adaptiveThreshold = function (img, maxValue, adaptiveMethod, thresholdType, blockSize, C) {
        let nImg = _o_images.adaptiveThreshold(img, maxValue, adaptiveMethod, thresholdType, blockSize, C)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.blur = function (img, size, point, type) {
        let nImg = _o_images.blur(img, size, point, type)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.medianBlur = function (img, size) {
        let nImg = _o_images.medianBlur(img, size)
        that.addImageToList(nImg)
        return nImg
      }


      M_Images.prototype.gaussianBlur = function (img, size, sigmaX, sigmaY, type) {
        let nImg = _o_images.gaussianBlur(img, size, sigmaX, sigmaY, type)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.cvtColor = function (img, code, dstCn) {
        let nImg = _o_images.cvtColor(img, code, dstCn)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.resize = function (img, size, interpolation) {
        let nImg = _o_images.resize(img, size, interpolation)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.scale = function (img, fx, fy, interpolation) {
        let nImg = _o_images.scale(img, fx, fy, interpolation)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.rotate = function (img, degree, x, y) {
        let nImg = _o_images.rotate(img, degree, x, y)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.concat = function (img1, img2, direction) {
        let nImg = _o_images.concat(img1, img2, direction)
        that.addImageToList(nImg)
        return nImg
      }


      M_Images.prototype.fromBase64 = function (base64) {
        let nImg = _o_images.fromBase64(base64)
        that.addImageToList(nImg)
        return nImg
      }

      M_Images.prototype.fromBytes = function (bytes) {
        let nImg = _o_images.fromBytes(bytes)
        that.addImageToList(nImg)
        return nImg
      }


      M_Images.prototype.matToImage = function (img) {
        let nImg = _o_images.matToImage(img)
        that.addImageToList(nImg)
        return nImg
      }

      let mImages = new M_Images()

      scope.__asGlobal__(mImages, ['captureScreen'])
    }

    scope.resourceMonitor = new ResourceMonitor()
  }

  return scope.resourceMonitor
}