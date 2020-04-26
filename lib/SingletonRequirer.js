/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-25 20:25:10
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-25 20:34:17
 * @Description: 导入单例模式的工具类
 */
module.exports = function (_runtime_, scope) {

  if (typeof scope.singletonRequirer === 'undefined') {
    scope.singletonRequirerInfo = {
      useCount: 0,
      moduleMap: {}
    }

    scope.singletonRequirer = (moduleName, showRequireInfo) => {
      // console.verbose('准备导入模块[' + moduleName + ']')
      if (typeof scope[moduleName] === 'undefined') {
        // console.verbose(moduleName + '暂时不存在，需要require导入')
        let prototypes = require('./prototype/' + moduleName + '.js')
        if (!prototypes) {
          console.error('导入模块：[' + moduleName + ']失败，请检查代码')
        }
        scope[moduleName] = prototypes
        scope.singletonRequirerInfo.moduleMap[moduleName] = {
          useCount: 0
        }
      } else {
        // console.verbose(moduleName + '已经存在, 已调用次数：' + scope.singletonRequirerInfo.moduleMap[moduleName].useCount)
      }
      scope.singletonRequirerInfo.moduleMap[moduleName].useCount += 1

      if (showRequireInfo) {
        console.info('singletonRequirer调用次数：' + scope.singletonRequirerInfo.useCount)
        Object.keys(scope.singletonRequirerInfo.moduleMap).forEach(key => {
          console.info('module: ' + key + ' 调用次数：' + scope.singletonRequirerInfo.moduleMap[key].useCount)
        })
      }
      return scope[moduleName]
    }
  }
  scope.singletonRequirerInfo.useCount += 1
  return scope.singletonRequirer
}