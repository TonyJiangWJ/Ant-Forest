/*
 * @Author: TonyJiangWJ
 * @Date: 2020-05-06 13:38:24
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-06 13:40:33
 * @Description: 
 */

const Queue = function () {
  this.size = 0
  this.innerArray = []
  this.index = -1

  this.isEmpty = function () {
    return this.size === 0
  }

  this.enqueue = function (val) {
    this.innerArray.push(val)
    this.index++
    this.size++
  }

  this.peek = function () {
    if (this.isEmpty()) {
      return null
    }
    return this.innerArray[0]
  }

  this.dequeue = function (val) {
    if (this.isEmpty()) {
      return null
    }
    this.size--
    return this.innerArray.splice(0, 1)[0]
  }

  this.print = function () {
    if (this.isEmpty()) {
      return
    }
    this.innerArray.forEach(val => {
      console.log(val)
    })
  }
}

module.exports = Queue