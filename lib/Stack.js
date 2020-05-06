/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-06 22:22:39
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-06 22:22:54
 * @Description: 
 */

const Stack = function () {
  this.size = 0
  this.innerArray = []
  this.index = -1

  this.isEmpty = function () {
    return this.size === 0
  }

  this.push = function (val) {
    this.innerArray.push(val)
    this.index++
    this.size++
  }

  this.peek = function () {
    if (this.isEmpty()) {
      return null
    }
    return this.innerArray[this.index]
  }

  this.pop = function (val) {
    if (this.isEmpty()) {
      return null
    }
    this.size--
    return this.innerArray.splice(this.index--)[0]
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

module.exports = Stack