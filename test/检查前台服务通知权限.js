importClass(android.provider.Settings)
importClass(android.net.Uri)
let result = context.getPackageManager().checkPermission(android.Manifest.permission.FOREGROUND_SERVICE, context.getPackageName());
console.info('授权结果', result)
if (result == 0) {
  toastLog('应用已获得前台服务权限')
} else {
  toastLog('应用没有前台服务权限')
}
// setForeground()
setNoticePermission()

function setForeground() {
  let intent = new Intent();
  intent.setAction(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
  let uri = android.net.Uri.fromParts("package", context.getPackageName(), null);
  intent.setData(uri);
  app.startActivity(intent);
}

function setNoticePermission() {
  let intent = new Intent();
  intent.setAction(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);

  // 适配不同的 Android 版本 Build.VERSION_CODES.O=26
  if (device.sdkInt >= 26) {
      intent.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.getPackageName());
  } else {
      intent.putExtra("app_package", context.getPackageName());
      intent.putExtra("app_uid", context.getApplicationInfo().uid);
  }

  app.startActivity(intent);
}