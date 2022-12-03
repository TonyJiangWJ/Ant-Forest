// 杀死当前同名脚本 see killMyDuplicator
(()=>{let g=engines.myEngine();var e=engines.all(),n=e.length;let r=g.getSource()+"";1<n&&e.forEach(e=>{var n=e.getSource()+"";g.id!==e.id&&n==r&&e.forceStop()})})();

require('../modules/init_if_needed.js')(runtime, this)
let FloatyButton = require('../lib/FloatyButton.js')
let winBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF+GlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDYgNzkuZGFiYWNiYiwgMjAyMS8wNC8xNC0wMDozOTo0NCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIyLjQgKE1hY2ludG9zaCkiIHhtcDpDcmVhdGVEYXRlPSIyMDIyLTExLTI4VDE3OjExOjQwKzA4OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMi0xMS0yOFQxNzoxNDoyMyswODowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMi0xMS0yOFQxNzoxNDoyMyswODowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo3OTZlNTAxYS0yNWNlLTRlNDYtOWEyNi05N2IyODhlOTFhNzQiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDo2NzFiODhmYS0yMTJkLWMzNGQtYWEzNS1kNmE0YThlMGIzNjgiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpiMDc0YzM0Zi0zN2MzLTQ4MjQtOWY2ZS03YTE4Mzk5MmFiNTciPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmIwNzRjMzRmLTM3YzMtNDgyNC05ZjZlLTdhMTgzOTkyYWI1NyIgc3RFdnQ6d2hlbj0iMjAyMi0xMS0yOFQxNzoxMTo0MCswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIyLjQgKE1hY2ludG9zaCkiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjc5NmU1MDFhLTI1Y2UtNGU0Ni05YTI2LTk3YjI4OGU5MWE3NCIgc3RFdnQ6d2hlbj0iMjAyMi0xMS0yOFQxNzoxNDoyMyswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIyLjQgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+4X3UggAADItJREFUeNrlm3mQFPUVxz/dM7P37uw5CrvILSCigagcHgHRqKgxYgU1HsSkomg8UFLGJJp/VDQmGo8oakLEhHjElEdS4gVGTRQ0cnuxgCBBBIRd9j6mZzp/zLfZ387u7O4cC1b5qqZmpo/Xv/d+736vLdd1+TqDH8CyrAPxLB9wGDAUqNL/HMACWoF2YDewGdgKRPp7Qa7rxhjQz5AHHAd8AzgCGAuMAAI6ZwNNQAuwHVgHfACsB1boXP9yoR9gADAHeAlwe/g0AvW9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'
let inspectConfig = {
  capture: true,
  save_history: true,
  save_data_js: true,
  save_img_js: true,
}
let floatyButton = new FloatyButton({
  logo_src: winBase64,
  menu2_text: '截',
  menu2_on_click: function () {
    floatyButton.runInThreadPool(function () {
      let mainScriptPath = getRealMainScriptPath(true)
      ui.run(function () {
        engines.execScriptFile(mainScriptPath + "/独立工具/获取当前页面的布局信息.js", {
          path: mainScriptPath + "/独立工具/", arguments: {
            immediate: true,
            capture: true,
            save_data_js: inspectConfig.save_data_js,
            save_history: inspectConfig.save_history,
            save_img_js: inspectConfig.save_img_js
          }
        })
      })
    })
  },
  menu3_text: '啾',
  menu3_on_click: function () {
    floatyButton.runInThreadPool(function () {
      let mainScriptPath = getRealMainScriptPath(true)
      ui.run(function () {
        engines.execScriptFile(mainScriptPath + "/独立工具/获取当前页面的布局信息.js", {
          path: mainScriptPath + "/独立工具/", arguments: {
            immediate: true,
            capture: inspectConfig.capture,
            save_data_js: inspectConfig.save_data_js,
            save_history: inspectConfig.save_history,
            save_img_js: inspectConfig.save_img_js
          }
        })
      })
    })
  },
  menu4_on_click: function () {
    exit()
  },
  menu5_on_click: function () {
    let arr = ["保存uiobjects.json", "保存data.js", "保存img.js", "保存历史数据"]
    let selected = [inspectConfig.capture ? 0 : null, inspectConfig.save_data_js ? 1 : null, inspectConfig.save_img_js ? 2 : null, inspectConfig.save_history ? 3 : null].filter(v => v != null)
    mDialogs.build({
      title: "设置",
      buttonRippleColor: "#000000",
      itemsSelectMode: "multi",
      cancelable: false,
      items: arr,
      itemsSelectedIndex: selected,
      positive: '确定'
    }).on("multi_choice", (indices, items, dialog) => {
      toastLog(`您选择的项目为${JSON.stringify(indices)}, 选项为${JSON.stringify(items)}`);
      inspectConfig.capture = indices.indexOf(0) > -1
      inspectConfig.save_data_js = indices.indexOf(1) > -1
      inspectConfig.save_img_js = indices.indexOf(2) > -1
      inspectConfig.save_history = indices.indexOf(3) > -1
    }).show()
  }
})


setInterval(() => { }, 1000);

function getRealMainScriptPath (parentDirOnly) {
  let currentPath = files.cwd()
  if (files.exists(currentPath + '/main.js')) {
    return currentPath + (parentDirOnly ? '' : '/main.js')
  }
  let paths = currentPath.split('/')

  do {
    paths = paths.slice(0, paths.length - 1)
    currentPath = paths.reduce((a, b) => a += '/' + b)
  } while (!files.exists(currentPath + '/main.js') && paths.length > 0)
  if (paths.length > 0) {
    return currentPath + (parentDirOnly ? '' : '/main.js')
  }
}