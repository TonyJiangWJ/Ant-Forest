/*
 * @Author: TonyJiangWJ
 * @Date: 2020-04-25 20:25:10
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-27 23:38:15
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
        let prototypes = checkAndRequireRealModule(moduleName)
        if (!prototypes) {
          console.error('导入模块：[' + moduleName + ']失败，请检查代码')
          toast('导入模块：[' + moduleName + ']失败，请检查代码')
          exit()
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

function tryRequire (filePath) {
  try {
    return require(filePath)
  } catch (e) {
    console.warn('加载[' + filePath + ']异常：' + e)
  }
  return null
}

function checkAndRequireRealModule (moduleName) {
  // console.verbose('准备导入模块：' + moduleName)
  let fileName = './prototype/' + moduleName + '.js'
  // 模块名称匹配
  let tryRequired = tryRequire(fileName)
  if (tryRequired) {
    return tryRequired
  } else {
    console.verbose('[' + fileName + ']不存在')
  }
  // 不小心输入了.js结尾
  fileName = './prototype/' + moduleName
  tryRequired = tryRequire(fileName)
  if (tryRequired) {
    return tryRequired
  } else {
    console.verbose('[' + fileName + ']不存在')
  }
  // lib下查找 模块名称匹配的
  fileName = './' + moduleName + '.js'
  tryRequired = tryRequire(fileName)
  if (tryRequired) {
    return tryRequired
  } else {
    console.verbose('[' + fileName + ']不存在')
  }
  // lib下查找 文件名称匹配的
  fileName = './' + moduleName
  tryRequired = tryRequire(fileName)
  if (tryRequired) {
    return tryRequired
  } else {
    console.verbose('[' + fileName + ']不存在')
  }
  // 都无匹配
  return null
}