importClass(java.io.StringWriter)
importClass(java.io.StringReader)
importClass(java.io.PrintWriter)
importClass(java.io.BufferedReader)
importClass(java.lang.StringBuilder)
let OpenCvUtil = require('../lib/OpenCvUtil.js')
let imgBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAEEAAABBCAYAAACO98lFAAAE+ElEQVR42uWbZ0srWxSG57fbu2Kv2Dt+sHcULNixY8desPfuuvfZMIfJJPFMokl2ziwYEBJ15smq79oxsrKyJCMjQ9LT011xlZeXS29vr2xtbcnb25t8fX2JkZSUJHFxcRITE+OKKzExUfjgS0tLZXJyUp6ensRIS0uT+Ph410CwXjgAIAyoQMeNEGJjY5VHGLm5uYqIGyFwkQ+N4uJiSUlJcS2EhIQEMciW5AW3QiAkjMbGRpUt3QqBy+js7JTs7Gx3QxgZGZHCwkJ3Q5ifn1dlwtUQdnZ2pKKiwt0Qzs/Ppba21t0QXl9fpbm52VXzgxeEz89P6erqUhOWayHI/zY6Oip0jq6GsLy8LA0NDe6GsL+/r0Ii2m4+MzNTpqam5PLyUgkkXBcXF2o8ZjDy9Tt2+wPh5uZGhQTJkV46GgBUVVXJ3d2d+DOeyVfp9wsBiWlxcVHpCtEAAQ/gIf9mvMfuEX4hYNvb24pcNIzVuLtTm5iYcA7h7OxMBgcHo2KY4l6tRk6jupWUlMjBwYHHa7zXFwRaA2B6QHh8fFTewB/SHcLz87PHgxYVFf15jZ+txnvtEO7v71WD6FEdsI+PD5Vo6uvrtZfb+BTtLu3P5Xku62u7u7te3m5Yf4ES09/fL3l5eVpD8BXXgbzus0+wUqNK4A06V4mQQsDNrq6ulDewi9AVRCAQKP8BQTBDAqGFbKvrPoIHcwqB5wkYAkaZ6enp0VaFfn9/97hfqzxorw63t7fBQaCsUC517RnYH1ptb29PeS4XPYO9hwgKAgmSQaSlpUVLOd7eLH1nY2NjwUHAoD07OyuVlZXaqU7clxMj0TtR0v1CwBvorNjl69Y8EabfTZCBhMK3EDAS0NLSkuob2NnpBIJPmLyFRsonjmBsN5L7jyFg5AYmMcZXnc8xdHd3eyV3px5sOImrk5MTqa6u1npxa58ekQwDktf+ZuSGhYUFdd5HRwBlZWVe9xzILsURBHLD9fW10hvy8/O1g0CHaw/hgIVWp0Yi6ujo0EqGI+7tzZOT3iBoCGTi9fV11ZklJydrAYESbi/tOTk5oYPA4EJY0KywydahWhwfH3vcIwvmoPYOgRikHx4epK+vL+LiC8Kw3QjXkEMw7fDwULliJFtqBCB7qx9MUxc0BP7h5uamtLW1RWSZy2rALrhSxoNewwVr9A+AaGpqUh1lOCEMDAx43Q/DXtghmD3EysqKWuhG6/HgH0OgrSZR4op1dXVReUT4xxBMYzNM54ZHhDs0tIFgJksGFw6IkriiZcP9qxAIDTI2XSX1OloOjv8qBGvV2NjYUAc/GLh0T5ghgWCKGkdHR6qhQgbHK3QNj5BBMFtsZo25uTmthq6wQjD7CFZ7q6ur0t7erqUeEXIIVq9Aj2DPyRkInb57FTYIphEeKNgcvNJFsww7BMKDnQE7gfHxcSXn01NEchoNOwRrT8GugHGYngIR19/Zw38Wgn3TRQWh0yREqCLhzBcRh2AFcXp6qrpNNkckz3AdFNECghXGy8uLWrXPzMyojpOlD9/dDKXCrRUE+wkTTqSSM1ixIZigaTKhEi6/eQRZWwgo26ZnoFewUCFUWAAhsJog/mkI/sQbJPa1tTWZnp6WoaEhpXEi5jCfkFSD8ZCogeALCuHC4UxCZnh4WFpbW6WmpkaVW2aVgoIClU8IIcTg1NRUNciRX0i6JrD/AIVK3he5NivGAAAAAElFTkSuQmCC'
// let img = images.fromBase64(imgBase64)

requestScreenCapture(false)
let img = captureScreen()

if (img) {
  try {
    toastLog('start get median:')
    let median = OpenCvUtil.getMedian(img)
    toastLog('median: ' + median)
    let avg = OpenCvUtil.getHistAverage(img)
    toastLog('avg: ' + avg)
  } catch (e) {
    printExceptionStack(e)
  }
} else {
  toastLog('图片已损坏')
}

function printExceptionStack (e) {
  if (e) {
    console.error(util.format('fileName: %s line:%s typeof e:%s', e.fileName, e.lineNumber, typeof e))
    let throwable = null
    if (e.javaException) {
      throwable = e.javaException
    } else if (e.rhinoException) {
      throwable = e.rhinoException
    }
    if (throwable) {
      let scriptTrace = new StringBuilder(e.message == null ? '' : e.message + '\n');
      let stringWriter = new StringWriter()
      let writer = new PrintWriter(stringWriter)
      throwable.printStackTrace(writer)
      writer.close()
      let bufferedReader = new BufferedReader(new StringReader(stringWriter.toString()))
      let line
      while ((line = bufferedReader.readLine()) != null) {
        scriptTrace.append("\n").append(line)
      }
      console.error(scriptTrace.toString())
    } else {
      let funcs = Object.getOwnPropertyNames(e)
      for (let idx in funcs) {
        let func_name = funcs[idx]
        console.verbose(func_name)
      }
    }
  }
}