require('../modules/init_if_needed.js')(runtime, global)

let permision = $power_manager.isIgnoringBatteryOptimizations(context.packageName)
console.log('是否授权:', permision);
if (!permision) {
  toastLog('请选择 无限制')
  $power_manager.requestIgnoreBatteryOptimizations()
} else {
  toastLog('当前已授权电量无限制')
}