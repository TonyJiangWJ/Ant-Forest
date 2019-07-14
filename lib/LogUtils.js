/*
 * @Author: TonyJiangWJ
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-07-04 00:14:22
 * @Description: 日志工具
 */
let config = storages.create("ant_forest_config")
let { formatDate } = require('./DateUtil.js')
/**
 * 根据参数toast文本信息
 * @param {string} content 
 * @param {boolean} isToast 
 */
function showToast(content, logFunc, isToast, appendFile) {
  content = convertObjectContent(content)
  if (isToast) {
    toast(content)
  }
  if (config.get('save_log_file')) {
    appendLog(content)
    if (appendFile) {
      appendFile(content)
    }
  }
  logFunc(content)
}

function appendLog(content) {
  let string = formatDate(new Date(), 'HH:mm:ss.S') + ':' + content + '\n'
  files.append("./log-verboses.log", string);
}

function appendError(content) {
  let string = formatDate(new Date(), 'HH:mm:ss.S' + ':' + content + '\n')
  files.append('./log-errors.log', string)
}

function convertObjectContent(originContent) {
  if (typeof originContent === 'string') {
    return originContent
  } else if (Array.isArray(originContent)) {
    // let [maker, ...args] = originContent
    let maker = originContent[0]
    let args = originContent.slice(1)
    let regex = /(\{\})/g
    let matchResult = maker.match(regex)
    if (matchResult && args && matchResult.length > 0 && matchResult.length === args.length) {
      args.forEach((item, idx) => {
        maker = maker.replace('{}', item)
      })
      return maker
    }
  }
  console.error('参数不匹配[' + originContent + ']')
  return originContent
}


module.exports = {
  debugInfo: function (content, isToast) {
    if (config.get("show_debug_info")) {
      showToast(content, (c) => console.verbose(c), isToast)
    }
  },
  logInfo: function (content, isToast) {
    showToast(content, (c) => console.log(c), isToast)
  },
  infoLog: function (content, isToast) {
    showToast(content, (c) => console.info(c), isToast)
  },
  warnInfo: function (content, isToast) {
    showToast(content, (c) => console.warn(c), isToast)
  },
  errorInfo: function (content, isToast) {
    showToast(content, (c) => console.error(c), isToast, appendError)
  },
  clearLog: function () {
    files.write("./log-verboses.log", formatDate(new Date()) + " 开始\n")
    files.write("./log-errors.log", formatDate(new Date()) + " 开始\n")
  }
}