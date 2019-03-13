function CommonFunctions() {
  this.show_temp_floaty = function (text) {
    floaty.closeAll()
    var w = floaty.rawWindow(
      <frame gravity="center" bg="#77ff0000">
        <text id="content" />
      </frame>
    )
    ui.run(function () {
      w.content.text(text)
    })
    w.setSize(-2, -2)

    setTimeout(function () {
      w.close()
    }, 2000)
  }

  this.common_delay = function (minutes, text) {
    if (typeof text === 'undefined' || text === '') {
      text = '距离下次运行还有['
    }

    minutes = typeof minutes != null ? minutes : 0
    if (minutes === 0) {
      return
    }
    let startTime = new Date().getTime()
    let timestampGap = minutes * 60000
    let i = 0
    for (;;) {
      let now = new Date().getTime()
      if (now - startTime > timestampGap) {
        break
      }
      i = (now - startTime) / 60000
      log(text + (minutes - i).toFixed(2) + ']分')
      this.show_temp_floaty(text + (minutes - i).toFixed(2) + ']分')
      sleep(30000)
    }
  }
}

module.exports = CommonFunctions