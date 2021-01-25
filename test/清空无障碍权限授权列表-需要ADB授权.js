/*
 * @Author: TonyJiangWJ
 * @Date: 2021-01-07 17:27:27
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-11 15:24:18
 * @Description: 
 */
importClass(android.content.Context)
importClass(android.provider.Settings)
function closeAllAccessibility () {
  try {
    let enabledServices = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
    console.log('当前已启用无障碍功能的服务:' + enabledServices)

    let lock = threads.lock()
    let complete = lock.newCondition()
    let confirmDialog = dialogs.build({
      title: '当前已开启无障碍服务的列表，是否清空？',
      content: enabledServices,
      positive: '确定',
      positiveColor: '#f9a01c',
      negative: '取消',
      cancelable: false
    }).on('positive', () => {
        lock.lock()
        try {
          Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, '')
          Settings.Secure.putString(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED, '0')
          toastLog('关闭无障碍服务成功')
          complete.signal()
        } finally {
          lock.unlock()
        }
        confirmDialog.dismiss()
      })
      .on('negative', () => {
        continueRunning = false
        lock.lock()
        try {
          complete.signal()
        } finally {
          lock.unlock()
        }
        confirmDialog.dismiss()
      })
      .show()
    complete.await()
  } catch (e) {
    console.error('关闭异常' + e)
  }
}

closeAllAccessibility()