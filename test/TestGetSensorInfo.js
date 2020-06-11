/*
 * @Author: TonyJiangWJ
 * @Date: 2020-06-09 23:17:34
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-06-09 23:48:25
 * @Description: 
 */

let disposable = threads.disposable()
sensors.ignoresUnsupportedSensor = true
let sensor = sensors.register('gravity', sensors.delay.ui)
let count = 0
let start = new Date().getTime()
let ax = 0, ay = 0, az = 0
//监听数据
sensor.on('change', (event, gx, gy, gz) => {
  count++
  log("[%d]重力加速度: %d, %d, %d", count, gx, gy, gz)
  ax += Math.abs(gx)
  ay += Math.abs(gy)
  az += Math.abs(gz)
  if (new Date().getTime() - start > 1000) {
    log(util.format('总数：%d [%d, %d, %d]', count, ax, ay, az))
    disposable.setAndNotify({ ax: ax / count, ay: ay / count, az: az / count })
  }
})
let distanceCount = 0
let totalDistance = 0
sensors.register("proximity", sensors.delay.ui).on("change", (event, d) => {
  log(util.format("当前距离: %d", d))
  totalDistance += d
  distanceCount++
})

let result = disposable.blockedGet()

log(util.format('平均重力加速度：%d %d %d 平均距离：%d', result.ax, result.ay, result.az, (totalDistance / distanceCount)))
toastLog('done')
sensors.unregisterAll()
