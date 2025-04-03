
importClass(java.net.InetAddress)
importClass(java.net.NetworkInterface)


importClass(android.graphics.Bitmap)
importClass(java.io.ByteArrayOutputStream)
let { config } = require('../config.js')(runtime, global)
let plugin_websocket = (() => {
  if (!config.enable_websocket_hijack) {
    return null
  }
  try {
    return plugins.load('com.tony.websocket')
  } catch (e) {
    console.error('当前未安装websocket插件，加载失败' + e)
    return null
  }
})()

if (plugin_websocket == null) {
  config.enable_websocket_hijack && console.log('当前插件不支持 无法启动')
  module.exports = () => { }
} else {

  let ipAddress = getIpAddress()
  console.log('ipAddress', ipAddress)
  let connection = null
  let socketServer = plugin_websocket.createServer(8214, {
    onOpen: function (conn, handshake) {
      connection = conn
    },

    onClose: function (conn, code, reason, remote) {
      connection = null
    },

    onMessage: function (conn, message) {
      // 接收消息并根据消息结构进行处理
      // handleRequest(conn, message)
    },

    onByteMessage: function (conn, bytes) {

    },

    onError: function (conn, ex) {
      console.error('启动异常', ex)
      toastLog('服务启动异常')
    },
    onStart: function () {
      toastLog('服务已启动')
    }
  }
  )
  console.log('启动服务中')
  socketServer.start()
  
  threads.start(function () {
    events.on('exit', function () {
      toastLog('脚本退出执行 关闭websocket')
      socketServer.stop()
    })
  })

  function hijackCapture () {
    let oldCaptureScreen = captureScreen
    let newCaptureScreen = function () {
      let screen = oldCaptureScreen.apply(images, arguments)
      try {
        if (connection) {
          connection.send(convertToBytesFromBitmap(screen.getBitmap()))
        }
      } catch (e) {
        //
      }
      return screen
    }
    global['captureScreen'] = newCaptureScreen

    let oldConsole = console
    let functions = ['log', 'warn', 'error', 'verbose', 'info']
    functions.forEach(function (func) {
      let oldFunc = oldConsole[func]
      oldConsole[func] = function () {
        try {
          if (connection) {
            connection.send(JSON.stringify({ code: 'console', type: func, args: arguments }))
          }
        } catch (e) {
          //
        }
        return oldFunc.apply(oldConsole, arguments)
      }
    })
  }

  module.exports = hijackCapture


  function convertToBytesFromBitmap (bitmap) {
    let outputStream = new ByteArrayOutputStream();
    bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream); // 质量 90%
    return outputStream.toByteArray();
  }

}
function getIpAddress () {
  try {
    let networkInterfaces = NetworkInterface.getNetworkInterfaces();
    let ipAddresses = []
    while (networkInterfaces.hasMoreElements()) {
      let networkInterface = networkInterfaces.nextElement();

      // 遍历网络接口中的所有 IP 地址
      let inetAddresses = networkInterface.getInetAddresses();
      while (inetAddresses.hasMoreElements()) {
        let inetAddress = inetAddresses.nextElement();

        if (!inetAddress.isLoopbackAddress() && inetAddress.isSiteLocalAddress()) {
          console.verbose("IP Address: " + inetAddress.getHostAddress());
          ipAddresses.push(inetAddress.getHostAddress());
        }
      }
    }
    return ipAddresses
  } catch (e) {
    console.error(e)
  }
}