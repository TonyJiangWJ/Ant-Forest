/*
 * @Author: NickHopps 
 * @Last Modified by: NickHopps
 * @Last Modified time: 2019-04-08 08:38:08
 * @Description: 脚本更新
 */

importClass(java.io.File);
importClass(java.io.IOException);
importClass(java.io.InputStream);
importClass(java.io.FileOutputStream);
importClass(java.security.MessageDigest);

importPackage(Packages.okhttp3);

/**
 * 向服务器查询发生更改的文件列表
 * 
 * @param {*} server 提供更新文件的服务器地址
 * @param {*} path 本地需要更新文件的目录路径
 */
function GetChangedFileList(server, path) {
  const _server = server,
        _path = path,
        _processor = "generate_change_list.php";

  let _ignore_list = [".", "..", ".git"];

  const _generate_md5 = function(file) {
    let md5 = MessageDigest.getInstance("MD5");
    let hex = [];
    md5.update(file);
    md5.digest().forEach((byte) => {
      let temp = (0xFF & byte).toString(16);
      while (temp.length < 2) temp = "0" + temp;
      hex.push(temp);
    });
    return hex.join("");
  };

  const _generate_postdata = function func(path, data) {
    data = data || {};
    if (files.isEmptyDir(path)) return data;
    files.listDir(path).forEach(function(file_name) {
      let new_path = files.join(path, file_name);
      if (_ignore_list.indexOf(file_name) < 0) {
        if (!files.isDir(new_path)) {
          let file = files.readBytes(new_path);
          data[new_path.replace(_path, "")] = _generate_md5(file);
        } else {
          func(new_path, data);
        }
      }
    });
    return data;
  };

  return {
    get ignore_list() {
      return _ignore_list;
    },
    set ignore_list(arr) {
      _ignore_list = arr;
    },
    exec: function() {
      const postdata = _generate_postdata(_path);
      let url = _server + "/" + _processor;
      let res = http.postJson(url, postdata);
      if (res.statusCode != 200) {
        toastLog("请求失败: " + res.statusCode + " " + res.statusMessage);
      } else {
        return res.body.json();
      }
    }
  }
}

/**
 * 下载工具类，可监听下载进度
 * 
 * @param {*} url 下载链接
 * @param {*} path 保存地址
 * @param {*} listener 下载监听
 */
function DownloadUtil(url, path, listener) {
  const _url = url,
        _path = path,
        _listener = listener;

  let _len = -1,
      _total_bytes = 0,
      _input_stream = null,
      _output_stream = null,
      _file_temp = null,
      _file_dir = null,
      _buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 2048);
  
  return {
    download: function() {
      let client = new OkHttpClient();
      let request = new Request.Builder().url(_url).get().addHeader("Accept-Encoding", "identity").build();
      client.newCall(request).enqueue(new Callback({
        onFailure: function(call, err) {
          toast("请求失败");
          console.error("请求失败：" + err);
        },
        onResponse: function(call, res) {
          try {
            if (res.code() != 200) throw res.code() + " " + res.message();
            _total_bytes = res.body().contentLength();
            _input_stream = res.body().byteStream();
            _file_temp = new File(_path);
            _file_dir = _file_temp.getParentFile();
            if(!_file_dir.exists()) _file_dir.mkdirs();
            _output_stream = new FileOutputStream(_file_temp);
            while ((_len = _input_stream.read(_buffer)) != -1) {
              _output_stream.write(_buffer, 0, _len);
              _listener.onDownloading((_len / _total_bytes) * 100);
            }
            _output_stream.flush();
            _listener.onDownloadSuccess();
          } catch (err) {
            _listener.onDownloadFailed(err);
          } finally {
            try {
              if (_input_stream != null)
              _input_stream.close();
            } catch (err) {
              toast("文件流处理失败");
              console.error("文件流处理失败：" + err);
            }
          }
        }
      }));
    }
  }
}

(function main() {
  let server = "http://www.infiniture.cn";
  let local = "/sdcard/脚本/Ant-Forest-autoscript";

  let changed_files = new GetChangedFileList(server, local).exec();
  let remove_files = changed_files.remove || [];
  let update_files = changed_files.update || [];

  if (remove_files.length) {
    remove_files.forEach((file) => {
      let dir = files.join(local, file).replace(files.getName(file), '');
      files.remove(files.join(local, file));
      if (files.isEmptyDir(dir)) files.removeDir(dir);
      toastLog("更新完成");
    });
  } else if (update_files.length) {
    let downloadDialog = null;
    let res = http.get(server + "/ant-forest/CHANGELOG.md");
    if (res.statusCode != 200) {
      toastLog("请求失败: " + res.statusCode + " " + res.statusMessage);
    } else {
      dialogs.build({ 
        title: "发现新版本",
        content: res.body.string(),
        positive: "更新",
        negative: "取消",
      }).on("positive", () => {
        downloadDialog = dialogs.build({
          title: "更新中...",
          negative: "取消",
          progress: {
            max: 100,
            showMinMax: true
          },
          autoDismiss: false
        }).on("negative", () => {
          downloadDialog.dismiss();
          downloadDialog = null;
        }).show();
        
        let counter = 0,
            total = 0,
            realurl = update_files.map((uri) => {return server + "/ant-forest" + uri}),
            abspath = update_files.map((uri) => {return files.join(local, uri)});

        let callback = {
          onDownloadSuccess: function(file) {
            if (counter == update_files.length - 1) {
              downloadDialog.dismiss();
              downloadDialog = null;
              toastLog("更新完成");
            } else {
              counter++;
              new DownloadUtil(realurl[counter], abspath[counter], callback).download();
            }
          },
          onDownloading: function(progress) {
            downloadDialog.setProgress((total += progress) / update_files.length);
          },
          onDownloadFailed: function(err) {
            toast("下载失败");
            console.error("下载失败：" + err);
          }
        };
        new DownloadUtil(realurl[counter], abspath[counter], callback).download();
      }).show();
    } 
  } else {
    toastLog("当前已经是最新版本了");
  }
})();