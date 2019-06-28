const undefinedToZero = function (fieldValue) {
  return typeof fieldValue === 'undefined' ? 0 : fieldValue
}

function DateCompare(date) {

  this.year = undefinedToZero(date.getUTCFullYear())
  this.month = undefinedToZero(date.getUTCMonth())
  this.date = undefinedToZero(date.getUTCDate())
  this.hours = undefinedToZero(date.getUTCHours())
  this.minutes = undefinedToZero(date.getUTCMinutes())
  this.seconds = undefinedToZero(date.getUTCSeconds())
  this.milliseconds = undefinedToZero(date.getUTCMilliseconds())
  this.originDate = date


  this.getCompareDateField = function () {
    return this.year * 10000 + this.month * 100 + this.date
  }

  this.getCompareTimeField = function () {
    return (this.hours * 3600 + this.minutes * 60 + this.seconds) * 1000 + this.milliseconds
  }

  /**
   * 自定义比较，比较各个字段
   */
  this.customCompareTo = function (date) {
    // 先比较日期
    if (this.getCompareDateField() > targetDate.getCompareDateField()) {
      return 1
    } else if (this.getCompareDateField() < targetDate.getCompareDateField()) {
      return -1
    }
    // 日期相等，比较时间
    if (this.getCompareTimeField() > targetDate.getCompareTimeField()) {
      return 1
    } else if (this.getCompareTimeField() < targetDate.getCompareTimeField()) {
      return -1
    } else {
      return 0
    }
  }

  this.compareTo = function (date) {
    if (this.getTime() > date.getTime()) {
      return 1
    } else if (this.getTime() < date.getTime()) {
      return -1
    } else {
      return 0
    }
  }

  this.getTime = function () {
    return this.originDate.getTime()
  }
}

module.exports = DateCompare