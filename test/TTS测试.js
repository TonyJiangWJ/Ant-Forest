"ui";
let { config: _config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let TTSUtil = singletonRequire('TTSUtil')

// 全局变量
let isTTSInitialized = false;
let isSpeaking = false;

ui.layout(
  <vertical padding="16" bg="#f0f0f0">
    <text textSize="18sp" textStyle="bold" marginBottom="10">TTS文本朗读工具</text>

    <text textSize="14sp" marginTop="10">输入文本 (最大1500字符):</text>
    <input
      id="textInput"
      hint="请输入要朗读的文本..."
      lines="5"
      gravity="top|left"
      maxLength="1500"
      bg="#ffffff"
      padding="10"
      marginTop="5" />
    <text id="charCount" textSize="12sp" textColor="#666666" gravity="right">0/1500</text>

    <text textSize="14sp" marginTop="20">语速调节:</text>
    <seekbar
      id="speedSeek"
      max="200"
      progress="100"
      marginTop="5" />
    <text id="speedText" textSize="12sp" textColor="#333333">1.0x (正常语速)</text>

    <text textSize="14sp" marginTop="20">语调调节:</text>
    <seekbar
      id="pitchSeek"
      max="200"
      progress="100"
      marginTop="5" />
    <text id="pitchText" textSize="12sp" textColor="#333333">1.0x (正常语调)</text>

    <button
      id="initBtn"
      text="初始化TTS"
      marginTop="30"
      style="Widget.AppCompat.Button.Colored" />

    <button
      id="speakBtn"
      text="开始朗读"
      marginTop="15"
      style="Widget.AppCompat.Button.Colored"
      enabled="false" />

    <button
      id="syncFileBtn"
      text="开始合成文件"
      marginTop="15"
      style="Widget.AppCompat.Button.Colored"
      enabled="false" />

    <button
      id="deleteFilesBtn"
      text="删除所有生成的文件"
      marginTop="15"
      style="Widget.AppCompat.Button.Colored"
      bg="#ff6666" />

    <text id="statusText" textSize="12sp" marginTop="20" textColor="#666666">状态: 未初始化</text>
  </vertical>
);

// 设置字符计数监听
ui.textInput.addTextChangedListener(new android.text.TextWatcher({
  onTextChanged: function (s) {
    let count = s.length();
    ui.charCount.setText(count + "/1500");
    ui.speakBtn.setEnabled(count > 0 && isTTSInitialized && !isSpeaking);
    ui.syncFileBtn.setEnabled(count > 0 && isTTSInitialized && !isSpeaking);
  }
}));

// 语速调节监听
ui.speedSeek.setOnSeekBarChangeListener({
  onProgressChanged: function (seekBar, progress, fromUser) {
    let speed = (progress / 100).toFixed(1);
    let desc = "";
    if (speed < 1.0) desc = "(较慢)";
    else if (speed > 1.0) desc = "(较快)";
    else desc = "(正常语速)";
    ui.speedText.setText(speed + "x " + desc);
    TTSUtil.setSpeechRate(parseFloat(speed));
  }
});

// 语调调节监听
ui.pitchSeek.setOnSeekBarChangeListener({
  onProgressChanged: function (seekBar, progress, fromUser) {
    let pitch = (progress / 100).toFixed(1);
    let desc = "";
    if (pitch < 1.0) desc = "(较低)";
    else if (pitch > 1.0) desc = "(较高)";
    else desc = "(正常语调)";
    ui.pitchText.setText(pitch + "x " + desc);

    TTSUtil.setPitch(parseFloat(pitch));
  }
});

// 合成语音文件
ui.syncFileBtn.on("click", function () {
  let text = ui.textInput.getText().toString().trim();
  if (!text) {
    toast("请输入要合成的文本");
    return;
  }

  if (!isTTSInitialized) {
    toast("请先初始化TTS");
    return;
  }

  // 生成一个文件名（例如以时间戳命名）
  let fileName = "tts_output_" + new Date().getTime() + '.wav';

  ui.statusText.setText("状态: 正在合成语音文件...");
  ui.syncFileBtn.setEnabled(false);
  threads.start(function () {
    let result = TTSUtil.synthesizeToFile(text, fileName);
    if (result) {
      ui.statusText.setText("状态: 语音文件合成成功，文件名: " + fileName);
    } else {
      toast("语音文件合成失败");
      ui.statusText.setText("状态: 合成失败");
    }
    ui.syncFileBtn.setEnabled(true);
  });
});

// 初始化TTS
function initTTS () {
  ui.initBtn.setText("初始化中...");
  ui.initBtn.setEnabled(false);
  ui.statusText.setText("状态: 正在初始化TTS...");
  threads.start(function () {
    if (TTSUtil.initTTS()) {
      isTTSInitialized = true
      ui.initBtn.setText("初始化完成");
      ui.speakBtn.setEnabled(ui.textInput.getText().length() > 0);
      ui.syncFileBtn.setEnabled(ui.textInput.getText().length() > 0);
      ui.statusText.setText("状态: TTS初始化完成");
    } else {
      isTTSInitialized = false
      ui.statusText.setText("状态: TTS初始化失败");
      ui.initBtn.setText("初始化TTS");
      ui.initBtn.setEnabled(true);
      toast("TTS初始化失败");
    }
  })
}

// 朗读文本
function speakText (text) {
  isSpeaking = true;
  updateSpeakButtonState();
  ui.statusText.setText("状态: 正在朗读...");
  threads.start(function () {
    TTSUtil.speak(text)
    ui.statusText.setText("状态: 朗读完毕");
    isSpeaking = false
    updateSpeakButtonState();
  })
}

// 停止朗读
function stopSpeaking () {
  TTSUtil.stop()
  isSpeaking = false;
  updateSpeakButtonState();
  ui.statusText.setText("状态: 已停止朗读");
}

// 更新朗读按钮状态
function updateSpeakButtonState () {
  if (isSpeaking) {
    ui.speakBtn.setText("停止朗读");
  } else {
    ui.speakBtn.setText("开始朗读");
    ui.speakBtn.setEnabled(isTTSInitialized && ui.textInput.getText().length() > 0);
  }
}

// 按钮事件
ui.initBtn.on("click", function () {
  if (!isTTSInitialized) {
    initTTS();
  }
});

ui.speakBtn.on("click", function () {
  if (isSpeaking) {
    stopSpeaking();
  } else {
    let text = ui.textInput.getText().toString().trim();
    if (text) {
      speakText(text);
    }
  }
});

// 删除所有生成文件按钮事件
ui.deleteFilesBtn.on("click", function () {
  dialogs.confirm('确定要删除所有合成文件吗?', '删除后将无法恢复 将删除当前目录下所有以tts_output_开头的文件', (confirm) => {
   if (confirm) {
    ui.statusText.setText("状态: 正在删除合成文件");
     let fileList = files.listDir(files.cwd());
     for (let i = 0; i < fileList.length; i++) {
       if (fileList[i].startsWith("tts_output_")) {
        ui.statusText.setText("状态: 正在删除合成文件：" + fileList[i]);
         files.remove(fileList[i]);
       }
     }
     ui.statusText.setText("状态: 已删除所有合成文件");
   }
  })
})