/*
 * @Author: TonyJiangWJ
 * @Date: 2020-08-04 17:30:20
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-08-04 20:26:21
 * @Description: 
 */
let FileUtils = require('./prototype/FileUtils.js')
const _resolver = () => {
  console.verbose('run resolver')
  sleep(1000)
  try {
    let packageName = context.getPackageName()
    console.verbose('packageName: ' + packageName)
    if (packageName === 'org.autojs.autojs') {
      runtime.loadDex(FileUtils.getCurrentWorkPath() + '/lib/reflect_resolve.dex')
      importClass(com.top_level_no_same_name.ReflectResolver)
      importClass(com.top_level_no_same_name.Logger)

      let logger = new Logger({
        info: function (msg) {
          console.verbose(msg)
        }
      })
      let classloader = org.mozilla.javascript.ContextFactory.getGlobal().getApplicationClassLoader()
      console.verbose(ReflectResolver.removeAllDexClassLoader(classloader, logger))
    }
  } catch (e) {
    let errorInfo = e + ''
    console.error('发生异常' + errorInfo)
    if (/importClass must be called/.test(errorInfo)) {
      toastLog('请强制关闭AutoJS并重新启动')
      exit()
    }
  }
}

module.exports = _resolver