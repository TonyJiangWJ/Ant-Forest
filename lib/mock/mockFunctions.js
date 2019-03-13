function log(str) {
  console.log(str)
}

function toast(str) {
  console.log("toast: " + str)
}

function sleep(sleep) {
  console.log("sleep:" + sleep)
  setTimeout(function () {
    log("timeout")
  }, sleep)
}

module.exports = {
  log,
  toast,
  sleep
}