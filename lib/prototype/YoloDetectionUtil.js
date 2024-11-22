

let { config } = require('../../config.js')(runtime, global)
let sRequire = require('../SingletonRequirer.js')(runtime, global)
let { debugInfo, warnInfo, errorInfo, infoLog, logInfo, debugForDev } = sRequire('LogUtils')
let fileUtils = sRequire('FileUtils')

let currentPath = fileUtils.getCurrentWorkPath()
let yoloSupport = false
try {
  importClass(com.stardust.autojs.onnx.YoloV8Predictor)
  importClass(java.io.File)
  importClass(java.io.RandomAccessFile)
  importClass(java.lang.StringBuilder)
  importClass("ai.onnxruntime.OnnxTensor")
  importClass("ai.onnxruntime.OrtEnvironment")
  importClass("ai.onnxruntime.OrtException")
  importClass("ai.onnxruntime.OrtSession")
  yoloSupport = true
} catch (e) {
  warnInfo(e)
  debugInfo(['当前版本AutoJS不支持yolo'])
}


let modelPath = currentPath + (config.yolo_model_path || '/config_data/forest_lite.onnx')
if (yoloSupport && !files.exists(modelPath)) {
  warnInfo(['yolo预训练模型不存在，请通过{}下载模型并放置以下路径：{}', config.yolo_onnx_model_url, modelPath])
  yoloSupport = false
}
let labelList = checkYoloModelValid(modelPath)


function YoloDetection () {
  this.enabled = yoloSupport && config.detect_by_yolo
  this.labels = labelList
  if (yoloSupport) {
    let predictor = new YoloV8Predictor(modelPath)
    let shapeSize = config.yolo_shape_size || 320
    predictor.setShapeSize(shapeSize, shapeSize)
    predictor.setConfThreshold(config.yolo_confidence_threshold || 0.5)

    let labels = java.util.Arrays.asList(
      labelList
    )
    predictor.setLabels(labels)
    this.predictor = predictor
  }

  this.forward = function (img, filterOption) {
    filterOption = filterOption || {}
    if (!this.enabled) {
      return
    }
    let start = new Date()
    let resultList = util.java.toJsArray(this.predictor.predictYolo(img.mat))
    debugForDev(['yolo detect result:{}', JSON.stringify(resultList)])
    resultList = resultList.map(box => {
      return {
        label: box.label,
        classId: box.clsId,
        x: box.left,
        y: box.top,
        width: box.right - box.left,
        height: box.bottom - box.top,
        confidence: box.confidence,
        centerX: box.left + (box.right - box.left) / 2,
        centerY: box.top + (box.bottom - box.top) / 2
      }
    }).filter(result => {
      if (filterOption.labelRegex) {
        if (!new RegExp(filterOption.labelRegex).test(result.label)) {
          return false
        }
      }
      if (filterOption.confidence) {
        if (result.confidence < filterOption.confidence) {
          return false
        }
      }
      if (filterOption.clsIds && filterOption.clsIds.length > 0) {
        if (filterOption.clsIds.indexOf(result.classId) < 0) {
          return false
        }
      }
      if (typeof filterOption.boundsInside == 'function') {
        if (!filterOption.boundsInside(result)) {
          return false
        }
      }
      if (typeof filterOption.filter == 'function') {
        if (!filterOption.filter(result)) {
          return false
        }
      }
      return true
    })
    debugInfo(['yolo 识别耗时：{}ms', new Date() - start])
    return resultList
  }

  this.validLabels = function (labels) {
    if (!this.enabled) {
      return
    }
    labels = labels || config.yolo_labels
    let result = labels.filter(label => this.labels.indexOf(label) < 0)
    if (result.length > 0) {
      warnInfo(['检测到未知标签：{} 请确认已更新最新版模型', result])
      warnInfo(['当前模型中支持的标签：{}', this.labels])
      return false
    } else {
      infoLog(['当前模型标签有效：{}', this.labels])
      return true
    }
  }

  this.checkYoloModelValid = checkYoloModelValid
}

module.exports = new YoloDetection()

// inner functions

function checkYoloModelValid (modelPath) {
  if (yoloSupport == false) {
    return null
  }
  let metaNames
  try {
    let environment = OrtEnvironment.getEnvironment()
    let session = environment.createSession(modelPath, new OrtSession.SessionOptions())
    metaNames = session.getMetadata().getCustomMetadata().get("names")
    let modelVersion = session.getMetadata().getCustomMetadata().get("model_version")
    let description = session.getMetadata().getCustomMetadata().get("description")
    infoLog(['模型描述：{}', description])
    infoLog(['模型版本：{}', modelVersion])
    environment.close()
    session.close()
  } catch (e) {
    errorInfo(['yolo模型文件格式不正确，请检查模型文件'], true)
    return null
  }
  debugForDev('metadata names:' + metaNames)
  let regex = /^.*(\{.*\})/
  let checkResult = regex.exec(metaNames)
  if (!checkResult || checkResult.length < 1) {
    warnInfo(['yolo模型文件格式不正确，请检查模型文件'])
    yoloSupport = false
    return null
  }
  let jsonStr = checkResult[1]
  try {
    debugForDev('extra json:' + jsonStr)
    let modelLabels = JSON.parse(jsonStr.replace(/'/g, '"'))
    let labelList = Object.keys(modelLabels).map(k => modelLabels[k])
    debugForDev('当前模型支持的标签：' + labelList)
    return labelList
  } catch (e) {
    warnInfo(['模型标签解析失败，请检查模型是否正确'])
    yoloSupport = false
  }
  return null
}

function readLastLine (filePath) {
  let file = new File(filePath)
  let raf = new RandomAccessFile(file, "r");
  let fileLength = file.length() - 1;
  let sb = new StringBuilder();
  const LINE_BREAK = '\n'.charCodeAt(0);
  // Set the file pointer to the last character of the file
  raf.seek(fileLength);
  for (let pointer = fileLength; pointer >= 0; pointer--) {
    raf.seek(pointer);
    let c = raf.read();
    if (c == LINE_BREAK) {
      if (pointer != fileLength) {
        break;
      }
    }
    sb.append(String.fromCharCode(c));
  }

  raf.close();
  return sb.reverse().toString().trim();
}