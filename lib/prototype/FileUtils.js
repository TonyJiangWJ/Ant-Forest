/*
 * @Author: TonyJiangWJ
 * @Date: 2019-08-05 14:36:13
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-25 15:24:10
 * @Description: 
 */
let printExceptionStack = require('../PrintExceptionStack.js')
require('../AutoJSRemoveDexResolver.js')()
let dateFormat = require('../DateUtil.js')
runtime.loadDex(getCurrentWorkPath() + '/lib/autojs-common.dex')
importClass(java.io.File)
importClass(java.io.RandomAccessFile)
importClass(java.util.ArrayList)
try {
  importClass(com.tony.file.FileReader)
} catch (e) {
  console.error('加载失败，强制关闭AutoJS', e)
  console.error('此异常常常发生在闪退之后，需要强制重启AutoJS')
  let limit = 3
  while (limit > 0) {
    toastLog('java类加载失败，将在' + limit-- + '秒后关闭AutoJS 请授予自启动权限')
    sleep(1000)
  }
  java.lang.System.exit(0)
}
let FILE_READER = new FileReader(runtime)

function getRealMainScriptPath (parentDirOnly) {
  let currentPath = files.cwd()
  if (files.exists(currentPath + '/main.js')) {
    return currentPath + (parentDirOnly ? '' : '/main.js')
  }
  let paths = currentPath.split('/')

  do {
    paths = paths.slice(0, paths.length - 1)
    currentPath = paths.reduce((a, b) => a += '/' + b)
  } while (!files.exists(currentPath + '/main.js') && paths.length > 0)
  if (paths.length > 0) {
    return currentPath + (parentDirOnly ? '' : '/main.js')
  }
}

/**
 * 获取当前脚本的运行工作路径，main.js所在的文件夹
 */
function getCurrentWorkPath () {
  return getRealMainScriptPath(true)
}

/**
 * 按行读取最后N行数据
 * 
 * @param {string} fileName 文件路径 支持相对路径
 * @param {number} num 读取的行数
 * @param {number} startReadIndex 当前读取偏移量
 * @param {function} filter (line) => check(line) 过滤内容
 * @returns { result: 行数据列表, readIndex: 当前读取偏移量, total: 文件总大小, filePath: 文件路径 }
 */
const readLastLines = function (fileName, num, startReadIndex, filter) {
  let fileLineMatcher = null
  if (filter) {
    fileLineMatcher = new FileReader.FileFilter({
      match: function (v) {
        return filter(v)
      }
    })
  }
  let startStamp = new Date().getTime()
  try {
    startReadIndex = startReadIndex || -1
    num = num || 1000
    return FILE_READER.readLastLines(new java.lang.String(fileName), new java.lang.Long(num), new java.lang.Long(startReadIndex), fileLineMatcher)
  } finally {
    console.verbose('文件读取耗时：', new Date().getTime() - startStamp, 'ms')
  }
}

/**
 * 按行读取前N行数据
 * 
 * @param {string} fileName 文件路径 支持相对路径
 * @param {number} num 读取的行数
 * @param {number} startReadIndex 当前读取偏移量
 * @param {function} filter (line) => check(line) 过滤内容
 * @returns { result: 行数据列表, readIndex: 当前读取偏移量, total: 文件总大小, filePath: 文件路径 }
 */
const readForwardLines = function (fileName, num, startReadIndex, filter) {
  let fileLineMatcher = null
  if (filter) {
    fileLineMatcher = new FileReader.FileFilter({
      match: function (v) {
        return filter(v)
      }
    })
  }
  let startStamp = new Date().getTime()
  try {
    startReadIndex = startReadIndex || 0
    num = num || 1000
    return FILE_READER.readForwardLines(new java.lang.String(fileName), new java.lang.Long(num), new java.lang.Long(startReadIndex), fileLineMatcher)
  } finally {
    console.verbose('文件读取耗时：', new Date().getTime() - startStamp, 'ms')
  }
}

/**
 * 按行读取最后N行数据
 * 
 * @param {string} fileName 文件路径 支持相对路径
 * @param {number} num 读取的行数
 * @param {number} startReadIndex 当前读取偏移量
 * @param {function} filter (line) => check(line) 过滤内容
 * @returns { result: 行数据列表, readIndex: 当前读取偏移量, total: 文件总大小, filePath: 文件路径 }
 * @deprecated 太慢了 改用java dex
 */
const jsReadLastLines = function (fileName, num, startReadIndex, filter) {
  filter = filter || function (v) { return true }
  let startStamp = new Date().getTime()
  num = num || 1000
  let filePath = files.path(fileName)
  if (!files.exists(filePath)) {
    console.error('文件不存在：', filePath, fileName)
    return null
  }
  let rf = null;
  let result = new ArrayList();
  try {
    rf = new RandomAccessFile(filePath, "r");
    let fileLength = rf.length();
    let start = rf.getFilePointer();// 返回此文件中的当前偏移量
    let readIndex = startReadIndex || start + fileLength - 1;
    let line;
    rf.seek(readIndex);// 设置偏移量为文件末尾
    console.verbose('设置偏移量', readIndex)
    console.verbose('开始位置', start)
    let c = -1;
    let lineCount = 0;
    while (readIndex > start) {
      c = rf.read();
      // console.verbose('read c', c)
      if (c == 10 || c == 13) {
        line = rf.readLine();
        // console.verbose('读取行', line)
        if (line != null) {
          line = new java.lang.String(new java.lang.String(line).getBytes("ISO-8859-1"), "UTF-8");
          if (filter(line + '')) {
            result.add(line);
            lineCount++;
          }
        }
        readIndex--;
      }
      if (lineCount >= num) {
        break;
      }
      readIndex--;
      rf.seek(readIndex);
    }
    console.verbose('最终长度：', result.size())
    java.util.Collections.reverse(result);
    return { result: runtime.bridges.toArray(result), readIndex: readIndex, total: fileLength, filePath: filePath }
  } catch (e) {
    printExceptionStack(e)
    return null;
  } finally {
    console.verbose('文件读取耗时：', new Date().getTime() - startStamp, 'ms')
    try {
      if (rf != null)
        rf.close();
    } catch (e) {
      printExceptionStack(e)
    }
  }
}

/**
 * 列出文件夹下的所有文件
 * 
 * @param {string} path 文件路径 支持相对路径
 * @param {function} filter (file) => check(line) 过滤文件 参数为File
 * @returns { resultList: 文件列表, path: 当前路径 }
 */
const listDirs = function (path, filter) {
  filter = filter || function () { return true }
  let filePath = files.path(path)
  if (!files.exists(filePath)) {
    return { path: filePath, resultList: [], error: '文件路径不存在' }
  }
  let dir = new File(filePath)
  if (!dir.isDirectory()) {
    dir = dir.getParentFile()
  }
  let fileArray = dir.listFiles()
  if (fileArray === null) {
    return { path: filePath, resultList: [], error: '文件路径无权限' }
  }
  let resultList = []
  for (let i = 0; i < fileArray.length; i++) {
    let subFile = fileArray[i]
    if (filter(subFile)) {
      let fileName = subFile.getName() + ''
      resultList.push({
        name: fileName,
        fullPath: subFile.getAbsolutePath() + '',
        isDir: subFile.isDirectory(),
        fileSize: subFile.length(),
        lastModified: subFile.lastModified(),
        lastModifiedStr: dateFormat(new Date(subFile.lastModified())),
        type: (() => {
          if (subFile.isDirectory()) {
            return 'dir'
          }
          let type = fileName.substring(fileName.lastIndexOf('.'))
          if (type && type.length > 1) {
            return type.substring(1)
          }
          return 'unknown'
        })()
      })
    }
  }
  return {
    path: dir.getAbsolutePath() + '', resultList: resultList.sort((d1, d2) => {
      // 文件夹类型放在最前面 其他的对比类型和名称
      if (d1.isDir) {
        if (!d2.isDir) {
          return -1
        }
        return d1.name > d2.name ? -1 : 1
      }
      if (d2.isDir) {
        return 1
      }
      return d1.type > d2.type ? 1 :
        (d1.type === d2.type ? (d1.name > d2.name ? 1 : -1) : -1)
    })
  }
}

module.exports = {
  getRealMainScriptPath: getRealMainScriptPath,
  getCurrentWorkPath: getCurrentWorkPath,
  readLastLines: readLastLines,
  readForwardLines: readForwardLines,
  jsReadLastLines: jsReadLastLines,
  listDirs: listDirs,
}