let singletonRequire = require('../SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let { debugInfo, warnInfo } = singletonRequire('LogUtils')
let workpath = FileUtils.getCurrentWorkPath()
let $resolver = require(workpath + '/lib/AutoJSRemoveDexResolver.js')
$resolver()
runtime.loadDex(workpath + '/lib/autojs-common.dex')
importClass(com.tony.autojs.common.ProcessMappedShare)
$resolver()
/**
 * 进程间通讯工具 实现脚本建通信功能
 */
function ProcessShare () {
  // 缓冲区大小
  this.bufferSize = 1024
  // 是否循环订阅消息
  this.isLoop = false
  // 监听文件的间隔时间 默认1000ms
  this.interval = 1000

  this.setBufferSize = function (size) {
    this.bufferSize = size
    return this
  }

  this.loop = function () {
    this.isLoop = true
    return this
  }

  this.setInterval = function (interval) {
    this.interval = interval || 1000
    return this
  }

  /**
   * 订阅文件消息 收到消息后回调
   * 
   * @param {function} resolve 读取消息后的回调
   * @param {number} timeout  订阅超时时间，超时后自动停止线程 默认60秒 循环订阅模式下无效
   * @param {string} filePath 消息文件路径 默认为当前main.js所在文件夹下的.share
   */
  this.subscribe = function (resolve, timeout, filePath) {
    timeout = timeout || 60
    filePath = filePath || '.share'
    filePath = workpath + '/' + filePath
    debugInfo(['订阅文件消息：{}', filePath])
    let subscriber = ProcessMappedShare
      .newSubscriber(filePath, this.bufferSize, runtime)
      .setLoop(this.isLoop)
      .setInterval(this.interval)
      .timeout(timeout)
    subscriber.subscribe(new ProcessMappedShare.Callback({
      call: function (str) {
        debugInfo(['从文件:{} 中 读取消息:{}', filePath, str])
        resolve(str)
      }
    }))
    return subscriber
  }

  /**
   * 发送文件消息
   * 
   * @param {string} message  消息内容 默认不能超过1024字节
   * @param {string} filePath 消息文件路径 默认为当前main.js所在文件夹下的.share
   */
  this.postInfo = function (message, filePath) {
    filePath = filePath || '.share'
    filePath = workpath + '/' + filePath
    debugInfo(['向文件:{}中写入消息:{}', filePath, message])
    ProcessMappedShare.newProvider(filePath, this.bufferSize, runtime).postInfo(message)
  }
}

module.exports = new ProcessShare()