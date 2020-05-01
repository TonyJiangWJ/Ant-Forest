/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-30 14:12:07
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-30 21:05:35
 * @Description: 扩展全局点击方式 收取能量
 */

module.exports = function () {
  // 循环点击1080P 分辨率下的区域(起始[150, 400]-结束[850, 800])，其他分辨率根据实际情况微调  
  // 模拟一个梯形点击区域 目前是两层 如果想要快一点可以改成一层 
  // BaseScanner.js 中的默认方式是一层 有可能会漏收 但是速度相对较快
  for (let x = 200; x <= 900; x += 100) {
    for (let y = 650; y <= 750; y += 100) {
      let px = x
      let py = x < 550 ? y - (0.5 * x - 150) : y - (-0.5 * x + 400)
      automator.click(px, py)
      sleep(20)
    }
  }

  // 一层
  /*
  let y = 700
  for (let x = 200; x <= 900; x += 100) {
    let px = x
    let py = x < 550 ? y - (0.5 * x - 150) : y - (-0.5 * x + 400)
    automator.click(px, py)
    sleep(20)
  }
  */
}