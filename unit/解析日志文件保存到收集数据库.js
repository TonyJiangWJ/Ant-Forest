let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let fileUtils = sRequire('FileUtils')
let AntForestDao = sRequire('AntForestDao')
// SingletonRequirer为单例模式 AntForestDao中已初始化 不需要再次初始化
let sqliteUtil = sRequire('SQLiteUtil')
console.show()

let logPath = fileUtils.getCurrentWorkPath() + '/logs/'

let start = new Date()
let REGEX = /(\d{4}(-\d{2}){2} (\d{2}:?){3}\.\d+).*收取好友:(.*) 能量 (\d+)g(.*浇水(\d+)g)?/
let fullLogs = []
let listDirResult = fileUtils.listDirs(logPath + 'logback', (file) => /log\.\d+\.log/.test(file.getName()))
let logInfoFileList = listDirResult.resultList
if (logInfoFileList && logInfoFileList.length > 0) {
  logInfoFileList.forEach(logFile => {
    let backReadResult = getAllMatchedLog(logFile.fullPath)
    fullLogs = fullLogs.concat(backReadResult.result)
    displayResult(backReadResult)
  })
}
let readResult = getAllMatchedLog(logPath + 'log.log')
displayResult(readResult)
fullLogs = fullLogs.concat(readResult.result)
// sqliteUtil.execSql('DELETE FROM ENERGY_COLLECT_DATA WHERE ID>=?', [868])
fileWriter = files.open('./collect-summary.txt', 'w')
// fullLogs.forEach(line => fileWriter.writeline(line + '\n'))
fileWriter.writelines(fullLogs)
fileWriter.close()
toastLog('统计日志保存完毕 耗时' + (new Date() - start) + 'ms')
function displayResult(readResult) {
  let result = readResult.result || []
  console.log('读取结果：' + readResult.filePath)
  result.forEach(line => {
    let resolveLineResult = REGEX.exec(line)
    let collectTime = resolveLineResult[1]
    let friendName = resolveLineResult[4]
    let collectEnergy = resolveLineResult[5]
    let waterEnergy = resolveLineResult[7]
    if (waterEnergy != null) {
      console.warn('有浇水数据')
    }
    console.verbose(`解析内容 收集时间: ${collectTime} 好友:${friendName} 收集能量: ${collectEnergy} 浇水: ${waterEnergy}`)
    let regex = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.(\d{1,3}))?/
    let result = regex.exec(collectTime)
    let date = new Date(result[1], parseInt(result[2]) - 1, result[3], result[4], result[5], result[6])
    AntForestDao.saveFriendCollect(friendName, collectEnergy, waterEnergy, date)
    console.log(line)
  })
}

function getAllMatchedLog(logPath) {
  console.verbose('读取日志内容：', logPath)
  let start = new Date()
  let readResult = fileUtils.readForwardLines(logPath, null, null, (line) => REGEX.test(line))
  let resultList = []
  resultList = readResult.result
  while (readResult.readIndex < readResult.total - 1) {
    readResult = fileUtils.readForwardLines(logPath, null, readResult.readIndex, (line) => REGEX.test(line))
    resultList = resultList.concat(readResult.result)
  }
  console.warn('读取文件内容耗时：' + (new Date() - start) + 'ms')
  let result = Object.create(readResult)
  result.result = resultList
  return result
}