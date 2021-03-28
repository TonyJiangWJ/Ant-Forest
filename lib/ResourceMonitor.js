/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-11 18:28:23
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-14 23:37:28
 * @Description: 图片资源监听并自动回收
 */
let { config } = require('../config.js')(runtime, this)

let sRequire = require('./SingletonRequirer.js')(runtime, this)
let { debugInfo, debugForDev, infoLog, errorInfo } = sRequire('LogUtils')
let commonFunctions = sRequire('CommonFunction')
function isNullOrUndefined (val) {
  return val === null || typeof val === 'undefined'
}

module.exports = function (__runtime__, scope) {
  if (typeof scope.resourceMonitor === 'undefined' || scope.resourceMonitor === null) {
    let _o_images = require('__images__.js')(__runtime__, scope)
    debugInfo(['Is _origin_images null? {}.', isNullOrUndefined(_o_images)])
    function ResourceMonitor () {
      this.images = []
      // 需要长时间持有的图片，不会自动动态释放
      this.longHoldImages = []
      this.writeLock = threads.lock()
      this.init()
    }

    ResourceMonitor.prototype.releaseAll = function (undelegated) {
      if (this.images !== null) {
        debugInfo('释放图片，总数：' + (this.images.length + this.longHoldImages.length))
        this.writeLock.lock()
        try {
          this.recycleImages(this.images.splice(0), true)
          this.recycleImages(this.longHoldImages.splice(0), true)
          if (undelegated) {
            debugInfo('解除图像资源代理')
            this.images = null
            scope.images = _o_images
            scope.__asGlobal__(_o_images, ['captureScreen'])
            _o_images = null
          }
        } finally {
          this.writeLock.unlock()
        }
      }
    }

    ResourceMonitor.prototype.addLongHoldImage = function (img) {
      this.writeLock.lock()
      try {
        if (this.longHoldImages === null) {
          // this is only happen when engine stoped, just recycle img
          debugInfo('检测到脚本已停止，直接回收图片')
          img.recycle()
          return
        }
        this.longHoldImages.push({
          img: img,
          millis: new Date().getTime()
        })
        debugForDev('增加图片到长时间持有的监听列表，需要手动recycle，当前总数：' + this.longHoldImages.length)
      } finally {
        this.writeLock.unlock()
      }
    }

    ResourceMonitor.prototype.addImageToList = function (img) {
      debugForDev('准备获取图片资源锁')
      this.writeLock.lock()
      debugForDev('获取图片资源锁成功')
      try {
        if (this.images === null) {
          // this is only happen when engine stoped, just recycle img
          debugInfo('检测到脚本已停止，直接回收图片')
          img.recycle()
          return
        }
        this.images.push({
          img: img,
          millis: new Date().getTime()
        })
        debugForDev('增加图片到监听列表，当前总数：' + this.images.length)
        // 达到一定阈值后回收
        if (this.images.length > 50) {
          if (this.images.length > 100) {
            // 大于100张直接回收一半
            this.recycleImages(this.images.splice(0, 50))
          } else {
            let current = new Date().getTime()
            // 回收超过5秒钟的图片
            let forRecycle = this.images.filter(imageInfo => current - imageInfo.millis > 5000)
            this.recycleImages(forRecycle)
            this.images.splice(0, forRecycle.length)
          }
        }
      } finally {
        this.writeLock.unlock()
      }
    }

    function doRecycleImages (forRecycleList, desc) {
      let start = new Date().getTime()
      let count = 0
      forRecycleList.forEach(imageInfo => {
        try {
          imageInfo.img.recycle()
        } catch (e) {
          // console.warn('释放图片异常' + e)
          count++
        }
      })
      debugForDev(desc + '，耗时' + (new Date().getTime() - start) + (count > 0 ? ', 其中有：' + count + '自动释放了' : ''))
      forRecycleList = null
    }

    ResourceMonitor.prototype.recycleImages = function (forRecycleList, sync) {
      if (forRecycleList && forRecycleList.length > 0) {
        if (sync) {
          doRecycleImages(forRecycleList, '同步释放所有图片')
        } else {
          threads.start(function () {
            // 不太安全，可能没释放完就挂了 脚本结束时最好执行一下releaseAll
            doRecycleImages(forRecycleList, '异步释放图片')
          })
        }
      }
    }

    ResourceMonitor.prototype.init = function () {

      let that = this

      let M_Images = function () {
        _o_images.constructor.call(this)
      }
      M_Images.prototype = Object.create(_o_images.prototype)
      M_Images.prototype.constructor = M_Images

      M_Images.prototype.captureScreen = function () {
        let start = new Date().getTime()
        debugForDev('准备获取截图')
        let img = _o_images.captureScreen()
        debugForDev(['获取截图完成，耗时{}ms', (new Date().getTime() - start)])
        that.addImageToList(img)
        return img
      }

      /**
       * @param long_hold {boolean} 是否长期持有，不会被自动recycle，需要在代码中手动释放资源
       */
      M_Images.prototype.copy = function (origialImg, long_hold) {
        let newImg = _o_images.copy(origialImg)
        if (!long_hold) {
          that.addImageToList(newImg)
        } else {
          that.addLongHoldImage(newImg)
        }
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

      M_Images.prototype.isDelegated = function () {
        return true
      }

      M_Images.prototype.isValidImg = function (img) {
        try {
          img.ensureNotRecycled()
          return true
        } catch (e) {
          return false
        }
      }
      let mImages = new M_Images()

      let newImages = {}
      let imageFuncs = Object.getOwnPropertyNames(scope.images)
      let newFuncs = Object.getOwnPropertyNames(M_Images.prototype)



      for (let idx in imageFuncs) {
        let func_name = imageFuncs[idx]
        newImages[func_name] = scope.images[func_name]
      }

      for (let idx in newFuncs) {
        let func_name = newFuncs[idx]
        if (func_name !== 'constructor' && func_name !== 'init') {
          // console.verbose('override function: ' + func_name)
          newImages[func_name] = mImages[func_name]
        }
      }
      debugInfo('图片资源代理创建完毕，准备替换scope中的images')
      scope.images = newImages
      scope.__asGlobal__(mImages, ['captureScreen'])
      debugInfo('图片资源代理替换images完毕')
    }

    let resourceMonitor = new ResourceMonitor()

    commonFunctions.registerOnEngineRemoved(function () {
      infoLog('脚本执行结束, 释放图片资源')
      resourceMonitor.releaseAll(true)
    }, 'resourceMonitor')

    scope.resourceMonitor = resourceMonitor
  }

  return scope.resourceMonitor
}