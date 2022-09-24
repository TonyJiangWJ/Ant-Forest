module.exports = function(runtime, global) {
  function $power_manager() {}

  let powerManger = context.getSystemService(android.content.Context.POWER_SERVICE);

  $power_manager.isIgnoringBatteryOptimizations = function(pkg) {
      if (typeof(pkg) === 'undefined') {
          pkg = context.packageName;
      }
      return powerManger.isIgnoringBatteryOptimizations(pkg);
  }

  $power_manager.requestIgnoreBatteryOptimizations = function(forceRequest, pkg) {
      if (typeof(pkg) === 'undefined') {
          pkg = context.packageName;
      }
      let needRequest = !$power_manager.isIgnoringBatteryOptimizations()
      if (needRequest || forceRequest) {
          app.startActivity({
              action: 'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
              data: 'package:' + pkg
          });
      }
  }

  return $power_manager;
}