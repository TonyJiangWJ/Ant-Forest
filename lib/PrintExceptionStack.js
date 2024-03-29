importClass(java.io.StringWriter)
importClass(java.io.StringReader)
importClass(java.io.PrintWriter)
importClass(java.io.BufferedReader)
importClass(java.lang.StringBuilder)

module.exports = function printExceptionStack(e, logger) {
  logger = logger || new DefaultLogger()
  if (e) {
    logger.errorInfo(util.format('fileName: %s line:%s typeof e:%s', e.fileName, e.lineNumber, typeof e))
    let throwable = null
    if (e.javaException) {
      throwable = e.javaException
    } else if (e.rhinoException) {
      throwable = e.rhinoException
    }
    if (throwable) {
      let scriptTrace = new StringBuilder(e.message == null ? '' : e.message + '\n')
      let stringWriter = new StringWriter()
      let writer = new PrintWriter(stringWriter)
      throwable.printStackTrace(writer)
      writer.close()
      let bufferedReader = new BufferedReader(new StringReader(stringWriter.toString()))
      let line
      while ((line = bufferedReader.readLine()) != null) {
        scriptTrace.append("\n").append(line)
      }
      logger.errorInfo(scriptTrace.toString())
    } else {
      let funcs = Object.getOwnPropertyNames(e)
      for (let idx in funcs) {
        let func_name = funcs[idx]
        logger.debugInfo(func_name)
      }
    }
  }
}

function DefaultLogger() {
  this.errorInfo = function(str) {
    console.error(str)
  }
  this.debugInfo = function(str) {
    console.verbose(str)
  }
}