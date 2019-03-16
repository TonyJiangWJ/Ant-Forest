/*
 * @Author: NickHopps 
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-03-14 09:46:13
 * @Description: 脚本更新
 */

var server_path = "https://www.infiniture.cn/ant-forest",
    remote_file_temp = {},
    update_list = [],
    ignore_list = [".git"],
    downloadDialog = null,
    downloadId = -1;
    
// 获取文件更新状态
function get_update_status(local_path, remote_path) {
  let local_file = files.read(local_path, "utf-8");
  let file_name = files.getName(local_path);
  let res = http.get(remote_path + local_path.replace(files.cwd(), ""));
  if (res.statusCode != 200) {
    toastLog("请求失败: " + res.statusCode + " " + res.statusMessage);
  } else {
    let remote_file = res.body.string();
    remote_file_temp[file_name] = remote_file;
    return local_file !== remote_file;
  }
}

// 遍历所有本地文件，检测是否可更新
function check_update(path) {
  files.listDir(path).forEach(function(file) {
    let new_path = files.join(path, file);
    if (ignore_list.indexOf(file) < 0) {
      if (files.isDir(new_path)) {
        check_update(new_path);
      } else {
        if (get_update_status(new_path, server_path) == true) update_list.push(new_path);
      }
    }
  });
}

// 更新文件
function update(process) {
  let file = update_list[process];
  files.write(file, remote_file_temp[files.getName(file)], "utf-8");
  downloadDialog.setProgress(process + 1);
}

function stopDownload() {
  clearInterval(downloadId);
}

function startDownload() {
  downloadId = setInterval(()=>{
    let process = downloadDialog.getProgress();
    if (process >= update_list.length) {
      stopDownload();
      downloadDialog.dismiss();
      downloadDialog = null;
      toastLog("更新完成");
    } else {
      update(process);
    }
  }, 500);
}

function download() {
  downloadDialog = dialogs.build({
    title: "下载中...",
    negative: "取消",
    progress: {
      max: update_list.length,
      showMinMax: true
    },
    autoDismiss: false
  }).on("negative", () => {
    stopDownload();
    downloadDialog.dismiss();
    downloadDialog = null;
  }).show();
  //显示更新状态
  startDownload();
}

check_update(files.cwd());

if (update_list.length) {
  let releaseNotes = "";
  let res = http.get(server_path + "/CHANGELOG.md");
  if (res.statusCode != 200) {
    toastLog("请求失败: " + res.statusCode + " " + res.statusMessage);
  } else {
    releaseNotes = res.body.string();
    dialogs.build({
      title: "发现新版本",
      content: releaseNotes,
      positive: "更新",
      negative: "取消",
      neutral: "到浏览器下载"
    }).on("positive", download).on("neutral", () => {
      app.openUrl("https://github.com/Nick-Hopps/Ant-Forest-autoscript");
    }).show();
  }
} else {
  toastLog("当前已经是最新版本了");
}