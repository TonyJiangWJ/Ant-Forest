/**
 * 代理runtime中的方法，目前针对loadDex进行优化
 * @param {ScriptRuntime} __global__ 
 * @returns 
 */
module.exports = function (__global__) {
  
  /**
   * 代理loadDex，相同路径的dex文件不再重复加载
   * 使用：
   *   require('./lib/Runtimes')(global)
   *   checkAndLoadDex(pathToDexFile)
   * 当检测到当前脚本未加载过此文件则执行加载，如果已加载则跳过加载
   * @returns 
   */
  function delegateLoadDex() {
    if (__global__.delegated_loadDex) {
      console.warn('loadDex已经代理')
      return
    }
    __global__.loadedDex = {}
    console.info('代理runtime.loadDex')
    let checkAndLoadDex = function (filePath) {
      if (!__global__._running_status && !__global__._noCheck) {
        console.warn('当前脚本未加入运行队列，请检查是否正确控制加载顺序')
        try {
          foo()
        } catch (error) {
            console.warn(error.stack)
        }
      }
      console.verbose('准备校验文件是否加载', filePath)
      let fullPath = files.path(filePath)
      if (__global__.loadedDex[fullPath]) {
        console.log(fullPath, '已加载')
        return true
      }
      console.verbose('未加载', filePath)
      __global__.loadedDex[fullPath] = true
      runtime.loadDex(filePath)
    }
    // 挂载到全局
    __global__['checkAndLoadDex'] = checkAndLoadDex
    __global__.delegated_loadDex = true
  }

  // 执行代理
  delegateLoadDex()
}