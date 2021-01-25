/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-05 09:12:00
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2021-01-09 17:33:25
 * @Description: 
 */
let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let WidgetUtils = require('../BaseWidgetUtils.js')
// 针对当前项目的公共方法封装，方便不同项目之间直接同步BaseCommonFunction不用再对比内容
let _ProjectWidgetUtils = files.exists(FileUtils.getCurrentWorkPath() + '/lib/ProjectWidgetUtils.js') ? require('../ProjectWidgetUtils.js') : null

module.exports = _ProjectWidgetUtils === null ? new WidgetUtils() : new _ProjectWidgetUtils()