/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-20 13:09:28
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-11-23 10:32:13
 * @Description: 
 */
let { config: _config, storage_name } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let { debugInfo, logInfo, errorInfo, warnInfo, infoLog, debugForDev, developSaving } = singletonRequire('LogUtils')
const HoughHelper = function () {
  this.toFixed = function (val, fixed) {
    return val && !isNaN(val) ? val.toFixed(fixed || 2) : val
  }

  this.dailyBalls = {
    invalidBalls: [],
    helpBalls: [],
    collectBalls: [],
    waterBalls: []
  }
  this.nightlyBalls = {
    invalidBalls: [],
    helpBalls: [],
    collectBalls: [],
    waterBalls: []
  }
  let storedBallInfoStr = storages.create(storage_name + '_hough_data').get('hough_balls')
  if (storedBallInfoStr) {
    let { dailyBalls, nightlyBalls } = JSON.parse(storedBallInfoStr)
    this.dailyBalls = dailyBalls || this.dailyBalls
    this.nightlyBalls = nightlyBalls || this.nightlyBalls
  }

  // functions
  this.addInvalidBall = function (ballInfo, isNight) {
    !isNight ? this.dailyBalls.invalidBalls.push(ballInfo) : this.nightlyBalls.invalidBalls.push(ballInfo)
  }
  this.addCollectBall = function (ballInfo, isNight) {
    !isNight ? this.dailyBalls.collectBalls.push(ballInfo) : this.nightlyBalls.collectBalls.push(ballInfo)
  }
  this.addHelpBall = function (ballInfo, isNight) {
    !isNight ? this.dailyBalls.helpBalls.push(ballInfo) : this.nightlyBalls.helpBalls.push(ballInfo)
  }
  this.addWaterBall = function (ballInfo, isNight) {
    !isNight ? this.dailyBalls.waterBalls.push(ballInfo) : this.dailyBalls.waterBalls.push(ballInfo)
  }

  this.summary = function () {
    debugInfo('balls summary')
    this.getTargetSummary('daily invalid', this.dailyBalls.invalidBalls.filter(b => !b.isOwn))
    this.getTargetSummary('daily collect', this.dailyBalls.collectBalls.filter(b => !b.isOwn))
    this.getTargetSummary('daily help', this.dailyBalls.helpBalls.filter(b => !b.isOwn))
    this.getTargetSummary('daily water', this.dailyBalls.waterBalls.filter(b => !b.isOwn))
    debugInfo('=======================================')
    this.getTargetSummary('night invalid', this.nightlyBalls.invalidBalls.filter(b => !b.isOwn))
    this.getTargetSummary('night collect', this.nightlyBalls.collectBalls.filter(b => !b.isOwn))
    this.getTargetSummary('night help', this.nightlyBalls.helpBalls.filter(b => !b.isOwn))
    this.getTargetSummary('night water', this.nightlyBalls.waterBalls.filter(b => !b.isOwn))
    debugInfo('=======================================')
    this.getTargetSummary('total invalid', this.nightlyBalls.invalidBalls.concat(this.dailyBalls.invalidBalls).filter(b => !b.isOwn))
    this.getTargetSummary('total collect', this.nightlyBalls.collectBalls.concat(this.dailyBalls.collectBalls).filter(b => !b.isOwn))
    this.getTargetSummary('total help', this.nightlyBalls.helpBalls.concat(this.dailyBalls.helpBalls).filter(b => !b.isOwn))
    this.getTargetSummary('total water', this.nightlyBalls.waterBalls.concat(this.dailyBalls.waterBalls).filter(b => !b.isOwn))
  }

  this.getTargetSummary = function (desc, balls) {
    if (!balls || balls.length === 0) {
      return
    }
    let summaryInfos = balls.reduce((a, b) => {
      a.maxMedianBottom = a.maxMedianBottom || a.medianBottom
      a.minMedianBottom = a.minMedianBottom || a.medianBottom
      a.maxMedian = a.maxMedian || a.median
      a.minMedian = a.minMedian || a.median
      a.maxAvg = a.maxAvg || a.avg
      a.minAvg = a.minAvg || a.avg
      a.maxStd = a.maxStd || a.std
      a.minStd = a.minStd || a.std
      return {
        medianBottom: a.medianBottom + b.medianBottom,
        median: a.median + b.median,
        avg: a.avg + b.avg,
        std: a.std + b.std,
        maxMedianBottom: a.maxMedianBottom > b.medianBottom ? a.maxMedianBottom : b.medianBottom,
        minMedianBottom: a.minMedianBottom > b.medianBottom ? b.medianBottom : a.minMedianBottom,
        maxMedian: a.maxMedian > b.median ? a.maxMedian : b.median,
        minMedian: a.minMedian > b.median ? b.median : a.minMedian,
        maxAvg: a.maxAvg > b.avg ? a.maxAvg : b.avg,
        minAvg: a.minAvg > b.avg ? b.avg : a.minAvg,
        maxStd: a.maxStd > b.std ? a.maxStd : b.std,
        minStd: a.minStd > b.std ? b.std : a.minStd
      }
    })
    debugInfo([
      '{} ball average info:\tmedianBottom[{}({},{})]\tmedian[{}({},{})]\tavg[{}({},{})]\tstd[{}({},{})]',
      desc, this.toFixed(summaryInfos.medianBottom / balls.length), this.toFixed(summaryInfos.minMedianBottom), this.toFixed(summaryInfos.maxMedianBottom),
      this.toFixed(summaryInfos.median / balls.length), this.toFixed(summaryInfos.minMedian), this.toFixed(summaryInfos.maxMedian),
      this.toFixed(summaryInfos.avg / balls.length), this.toFixed(summaryInfos.minAvg), this.toFixed(summaryInfos.maxAvg),
      this.toFixed(summaryInfos.std / balls.length), this.toFixed(summaryInfos.minStd), this.toFixed(summaryInfos.maxStd),
    ])
  }

  this.persistence = function () {
    this.summary()
    storages.create(storage_name + '_hough_data').put('hough_balls', JSON.stringify({
      dailyBalls: this.dailyBalls,
      nightlyBalls: this.nightlyBalls
    }))
  }
}

module.exports = HoughHelper