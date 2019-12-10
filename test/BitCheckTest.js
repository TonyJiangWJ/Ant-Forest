const CheckBit = function () {
  this.BUFFER_LENGTH = Math.ceil((1080 * 10000 + 2160) / 8)
  this.BYTE_SIZE = 1 << 3
  this.bytes = []
  this.init()
}

CheckBit.prototype.init = function () {
  this.bytes = Array(this.BUFFER_LENGTH + 1).join(0).split('')
}

CheckBit.prototype.setBit = function (val) {
  let idx = ~~(val / this.BYTE_SIZE)
  let posi = 1 << (val % this.BYTE_SIZE)
  let unset = (this.bytes[idx] & posi) !== posi
  this.bytes[idx] = this.bytes[idx] | posi
  return unset
}

CheckBit.prototype.isUnchecked = function (point) {
  return this.setBit(point.x * 10000 + point.y)
}

let checker = new CheckBit()
//checker.init()
let count = 0
let s = new Date().getTime()
for (let i = 0; i < 1080; i++) {
  for (let j = 0; j < 2160; j++) {
    count++
    checker.isUnchecked({ x: i, y: j })
  }
}
console.log("总数:" + count + " 总耗时:" + (new Date().getTime() - s) + 'ms')