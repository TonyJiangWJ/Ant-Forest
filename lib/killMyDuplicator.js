// 杀死当前同名脚本
module.exports = () => {
  let currentEngine = engines.myEngine()
  let runningEngines = engines.all()
  let runningSize = runningEngines.length
  let currentSource = currentEngine.getSource() + ''
  if (runningSize > 1) {
    runningEngines.forEach(engine => {
      let compareEngine = engine
      let compareSource = compareEngine.getSource() + ''
      if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
        // 强制关闭同名的脚本
        compareEngine.forceStop()
      }
    })
  }
}