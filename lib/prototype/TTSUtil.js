
importClass(android.speech.tts.TextToSpeech.Engine)
importClass(java.util.Locale)
importClass(android.os.Bundle)
importClass(android.os.ParcelFileDescriptor)
importClass(android.speech.tts.TextToSpeech)
importClass(android.speech.tts.TextToSpeech.OnInitListener)
importClass(android.speech.tts.UtteranceProgressListener)
importClass(android.os.Build)
importClass(java.util.UUID)
importClass(java.util.HashMap)
importClass(java.io.File)

let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')
let { config } = require('../../config.js')(runtime, global)
let LogUtils = singletonRequire('LogUtils')

function TTSUtil () {
  let textToSpeech = null

  let isInitialized = false
  let initializing = false
  this.speechRate = 1.0
  this.pitch = 1.0
  this.language = Locale.CHINESE
  let self = this
  let initDisposable = threads.disposable()
  let lockers = {}

  this.ttsListener = {
    onInitSuccess: function () {
      console.log("TTS初始化成功")
    },
    onInitFailed: function (message) {
      console.error(message)
    },
    onStart: function (utteranceId) { },
    onDone: function (utteranceId) { },
    onError: function (utteranceId) { }
  }
  this.fileListener = {
    onFileFailed: function (e) {
      console.error('合成文件失败', e)
    }
  }

  let initListener = {
    onInit: function (status) {
      toastLog('TTS初始化中...')
      if (status == TextToSpeech.SUCCESS) {
        let result = textToSpeech.setLanguage(self.language);
        if (result == TextToSpeech.LANG_MISSING_DATA ||
          result == TextToSpeech.LANG_NOT_SUPPORTED) {
          isInitialized = false;
          toastLog('不支持语言：' + self.language.getDisplayName());
          if (self.ttsListener != null) {
            self.ttsListener.onInitFailed("不支持的语言: " + self.language.getDisplayName());
          }
        } else {
          isInitialized = true;
          toastLog("TTS初始化成功");
          // 设置语速和音调
          textToSpeech.setSpeechRate(self.speechRate);
          textToSpeech.setPitch(self.pitch);
          if (self.ttsListener != null) {
            self.ttsListener.onInitSuccess();
          }
        }
      } else {
        toastLog('TTS初始化失败')
        isInitialized = false;
        if (self.ttsListener != null) {
          self.ttsListener.onInitFailed("TTS初始化失败");
        }
      }
      initDisposable.setAndNotify(isInitialized)
      initializing = false
    }
  }
  let onUtteranceProgressListener = new UtteranceProgressListener({
    onStart: function (utteranceId) {
      if (self.ttsListener != null) {
        self.ttsListener.onStart(utteranceId);
      }
    },
    onDone: function (utteranceId) {
      if (self.ttsListener != null) {
        self.ttsListener.onDone(utteranceId);
      }
      let lockInfo = lockers[utteranceId]
      if (lockInfo != null) {
        lockInfo.done()
      }
    },
    onError: function (utteranceId) {
      let lockInfo = lockers[utteranceId]
      if (lockInfo != null) {
        lockInfo.done()
      }
      // 根据参数类型和数量来区分不同的重载方法
      if (arguments.length === 1) {
        if (self.ttsListener != null) {
          self.ttsListener.onError(utteranceId, "朗读出错");
        }
      } else {
        errorCode = arguments[1];
        if (self.ttsListener != null) {
          self.ttsListener.onError(utteranceId, "朗读错误码: " + errorCode);
        }
      }
    }
  })
  this.initTTS = function () {
    if (isInitialized && textToSpeech != null || initializing == true) {
      return
    }
    initializing = true
    if (ui.isUiThread()) {
      throw new Error('TTS初始化不能在UI线程中 请在新线程中调用')
    }
    try {
      LogUtils.debugInfo('正在初始化TTS中，请稍后')
      textToSpeech = new TextToSpeech(context, initListener);
      textToSpeech.setOnUtteranceProgressListener(onUtteranceProgressListener);
      if (initDisposable.blockedGet()) {
        LogUtils.debugInfo('TTS初始化成功')
        commonFunctions.registerOnEngineRemoved(this.destroy, 'shutdown tts')
        return true
      } else {
        LogUtils.debugInfo('TTS初始化失败')
      }
    } catch (e) {
      LogUtils.errorInfo(["初始化TTS失败" + e]);
      if (this.ttsListener != null) {
        this.ttsListener.onInitFailed("初始化失败: " + e);
      }
    }
    return false
  }

  this.speak = function (text, addToQueue) {
    if (!isInitialized || textToSpeech == null) {
      LogUtils.errorInfo("TTS未初始化或已销毁");
      return null;
    }

    if (text == null || typeof text == 'undefined' || text == '') {
      LogUtils.warnInfo("朗读文本为空");
      return null;
    }

    if (ui.isUiThread()) {
      throw new Error('TTS朗读不能在UI线程中 请在新线程中调用')
    }

    let utteranceId = UUID.randomUUID().toString();
    queueMode = addToQueue ? TextToSpeech.QUEUE_ADD : TextToSpeech.QUEUE_FLUSH;
    this.buildLocker(utteranceId, () => textToSpeech.speak(text, queueMode, null, utteranceId))
    return utteranceId;
  }

  this.buildLocker = function (utteranceId, operator) {
    const lock = threads.lock()
    const condition = lock.newCondition()
    let lockInfo = {
      done: function () {
        lock.lock()
        try {
          condition.signal()
        } finally {
          lock.unlock()
          delete lockers[utteranceId]
        }
      }
    }
    lockers[utteranceId] = lockInfo
    lock.lock()
    let result = null
    try {
      result = operator()
      condition.await()
    } finally {
      lock.unlock()
    }
    return result
  }

  /**
     * 将文本合成到WAV文件
     * @param text 要合成的文本
     * @param fileName 文件名（不含扩展名）
     * @return 是否开始合成
     */
  this.synthesizeToFile = function (text, fileName) {
    if (!isInitialized || textToSpeech == null) {
      LogUtils.errorInfo("TTS未初始化");
      return false;
    }

    if (text == null || typeof text == 'undefined' || text == '') {
      LogUtils.warnInfo("文本为空");
      return false;
    }

    if (ui.isUiThread()) {
      throw new Error('TTS合成不能在UI线程中执行 请在新线程中调用')
    }
    let utteranceId = UUID.randomUUID().toString();
    let filePath = files.path(fileName);

    try {
      let file = new File(filePath);
      if (file.exists()) {
        file.delete();
      }

      let fileDescriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_WRITE_ONLY | ParcelFileDescriptor.MODE_CREATE);

      let params = new Bundle();
      params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId);

      let result = this.buildLocker(utteranceId, () => textToSpeech.synthesizeToFile(text, params, fileDescriptor, utteranceId))
      fileDescriptor.close(); // 重要：使用完后关闭

      return result == TextToSpeech.SUCCESS;

    } catch (e) {
      LogUtils.errorInfo("合成文件失败" + e);
      if (this.fileListener != null) {
        this.fileListener.onFileFailed("合成失败: " + e.message);
      }
      return false;
    }
  }


  this.stop = function () {
    if (textToSpeech != null) {
      textToSpeech.stop();
    }
  }

  /**
   * 暂停朗读（部分设备支持）
   */
  this.pause = function () {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && textToSpeech != null) {
      textToSpeech.playSilentUtterance(1, TextToSpeech.QUEUE_FLUSH, null);
    }
  }

  /**
   * 设置语速
   * @param rate 语速 (0.5-2.0)
   */
  this.setSpeechRate = function (rate) {
    this.speechRate = Math.max(0.1, Math.min(2.0, rate));
    if (textToSpeech != null) {
      textToSpeech.setSpeechRate(rate);
    }
  }

  /**
   * 获取当前语速
   * @return 语速
   */
  this.getSpeechRate = function () {
    return self.speechRate;
  }

  /**
   * 设置音调
   * @param pitch 音调 (0.5-2.0)
   */
  this.setPitch = function (pitch) {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
    if (textToSpeech != null) {
      textToSpeech.setPitch(pitch);
    }
  }

  /**
   * 获取当前音调
   * @return 音调
   */
  this.getPitch = function () {
    return self.pitch;
  }


  /**
   * 设置语言
   * @param language 语言
   */
  this.setLanguage = function (language) {
    this.language = language;
    if (textToSpeech != null && isInitialized) {
      textToSpeech.setLanguage(language);
    }
  }

  /**
   * 检查是否支持某种语言
   * @param locale 语言
   * @return 支持状态
   */
  this.isLanguageAvailable = function (locale) {
    if (textToSpeech != null) {
      return textToSpeech.isLanguageAvailable(locale);
    }
    return TextToSpeech.LANG_NOT_SUPPORTED;
  }

  /**
   * 获取支持的语言列表
   * @return 语言列表
   */
  this.getAvailableLanguages = function () {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && textToSpeech != null) {
      return textToSpeech.getAvailableLanguages();
    }
    return {}
  }

  /**
   * 设置TTS监听器
   * @param listener 监听器
   */
  this.setOnTTSListener = function (listener) {
    this.ttsListener = listener;
  }

  /**
   * 检查是否正在朗读
   * @return 是否正在朗读
   */
  this.isSpeaking = function () {
    return textToSpeech != null && textToSpeech.isSpeaking();
  }

  /**
   * 销毁TTS
   */
  this.destroy = function () {
    if (textToSpeech != null) {
      textToSpeech.stop();
      textToSpeech.shutdown();
      textToSpeech = null;
      isInitialized = false;
    }
  }

  /**
   * 检查TTS是否已初始化
   * @return 是否已初始化
   */
  this.isInitialized = function () {
    return isInitialized;
  }

}

module.exports = new TTSUtil()

/**
 * @usage
 * let tts = singletonRequire('TTSUtil')
 * tts.initTTS()
 * toastLog('开始朗读')
 * tts.speak('是的，主要是到时候进京证都难办，肯定产能会受限')
 *
 * toastLog('朗读完毕')
 *
 * log('开始写入文件')
 * tts.synthesizeToFile('是的，主要是到时候进京证都难办，肯定产能会受限', './tts.mp3')
 * toastLog('写入文件完毕')
 *
 * tts.destroy()
 */
