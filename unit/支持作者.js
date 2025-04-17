let tipDisposable = threads.disposable()
let showTipDialog = dialogs.build({
  title: '在线获取红包口令码',
  content: '此工具用于便携获取红包码，使用红包后作者每一个大概能获取一分钱收益。赞助作者，让作者更有动力开发。',
  positive: '确认获取',
  positiveColor: '#f9a01c',
  negative: '取消',
  negativeColor: 'red',
  cancelable: false
}).on('positive', function () {
  tipDisposable.setAndNotify({ continue: true })
  showTipDialog.dismiss()
}).on('negative', function () {
  tipDisposable.setAndNotify({ continue: false })
  showTipDialog.dismiss()
}).show()
let response = tipDisposable.blockedGet()
if (!response.continue) {
  exit()
}
toastLog('请求服务接口获取中，请稍后')
let disposable = threads.disposable()
let defaultCode = 'g:/NabWAyj54mL 或.復-置此消息打开支付宝，鸿抱天天有，好上添好  Q:/L MU5958 2020/04/11'
http.get('https://tonyjiang.hatimi.top/mutual-help/announcement?category=hongbao&deviceId=' + device.getAndroidId(), {}, (res, err) => {
  if (err) {
    console.error('请求异常', err)
    disposable.setAndNotify({ success: false, error: '请求异常' + err })
    return
  }
  if (res.body) {
    let responseStr = res.body.string()
    console.log('获取响应：', responseStr)
    try {
      let data = JSON.parse(responseStr)
      if (data.announcement) {
        console.log('红包口令码：' + data.announcement.text)
        disposable.setAndNotify({ success: true, text: data.announcement.text })
      } else if (data.error) {
        toastLog(data.error)
        disposable.setAndNotify({ success: false, erorr: data.error })
      }
    } catch (e) {
      console.error('执行异常' + e)
      disposable.setAndNotify({ success: false, erorr: '执行异常，具体见日志' })
    }
  }
})

let result = disposable.blockedGet()
if (result.success) {

  let confirmDialog = dialogs.build({
    title: '获取到红包口令码，是否打开？',
    content: '' + result.text,
    positive: '确认',
    positiveColor: '#f9a01c',
    negative: '取消',
    negativeColor: 'red',
    cancelable: false
  })
    .on('positive', () => {
      confirmDialog.dismiss()
      setClip(result.text)
      app.startActivity({
        action: 'VIEW',
        data: 'alipays://platformapi/startapp?appId=20001003&keyword=' + encodeURI(result.text) + '&v2=true',
        packageName: 'com.eg.android.AlipayGphone'
      })
    })
    .on('negative', () => {
      confirmDialog.dismiss()
    })
    .show()
} else {
  let confirmDialog = dialogs.build({
    title: '获取红包口令码失败',
    content: '是否使用默认口令打开（可能失效）？失败原因：' + result.error,
    positive: '使用默认口令',
    positiveColor: '#f9a01c',
    negative: '取消',
    negativeColor: 'red',
    cancelable: false
  })
    .on('positive', () => {
      setClip(defaultCode)
      app.startActivity({
        action: 'VIEW',
        data: 'alipays://platformapi/startapp?appId=20001003&keyword=' + encodeURI(defaultCode) + '&v2=true',
        packageName: 'com.eg.android.AlipayGphone'
      })
      confirmDialog.dismiss()
    })
    .on('negative', () => {
      confirmDialog.dismiss()
    })
    .show()
}