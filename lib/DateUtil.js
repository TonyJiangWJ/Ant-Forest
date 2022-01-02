/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-10 19:41:12
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-04-25 20:36:33
 * @Description: 日期格式化工具
 */
module.exports = function (date, fmt) {
  if (typeof fmt === 'undefined') {
    fmt = "yyyy-MM-dd HH:mm:ss"
  }

  var o = {
    'M+': date.getMonth() + 1, // 月份
    'd+': date.getDate(), // 日
    'h+': date.getHours() % 12 === 0 ? 12 : date.getHours() % 12, // 小时
    'H+': date.getHours(), // 小时
    'm+': date.getMinutes(), // 分
    's+': date.getSeconds(), // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
    'S': date.getMilliseconds() // 毫秒
  }
  var week = {
    '0': '\u65e5',
    '1': '\u4e00',
    '2': '\u4e8c',
    '3': '\u4e09',
    '4': '\u56db',
    '5': '\u4e94',
    '6': '\u516d'
  }
  let execResult
  if (/(y+)/.test(fmt)) {
    execResult = /(y+)/.exec(fmt)
    fmt = fmt.replace(execResult[1], (date.getFullYear() + '').substring(4 - execResult[1].length))
  }
  if (/(E+)/.test(fmt)) {
    execResult = /(E+)/.exec(fmt)
    fmt = fmt.replace(execResult[1], ((execResult[1].length > 1) ? (execResult[1].length > 2 ? '\u661f\u671f' : '\u5468') : '') + week[date.getDay() + ''])
  }
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      execResult = new RegExp('(' + k + ')').exec(fmt)
      fmt = fmt.replace(execResult[1], (execResult[1].length === 1) ? (o[k]) : (('00' + o[k]).substring(('' + o[k]).length)))
    }
  }
  return fmt
}