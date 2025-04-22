let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let FloatyInstance = singletonRequire('FloatyUtil')
let logFloaty = singletonRequire('LogFloaty')
try {
  importPackage(Packages["okhttp3"])
} catch (e) {
  //
}
try {
  importClass("okhttp3.OkHttpClient")
  importClass("okhttp3.FormBody")
  importClass("okhttp3.MediaType")
  importClass("okhttp3.RequestBody")
  importClass("okhttp3.Request")
} catch (e) {
  //
}


function inspectAnswer (content, answers) {
  if (!content) {
    return null
  }
  content = content.replace(/[\r\n]/g, '')
  let regex = /.*<answer>(\d+)<\/answer>(.*<describe>)(.*)<\/describe>/
  let match = regex.exec(content)
  if (match && match.length > 1) {
    console.verbose('答案解析：', JSON.stringify(match))
    let answerIdx = parseInt(match[1]) - 1
    let valid = true
    if (answerIdx < 0 || answerIdx > 1) {
      valid = false
      logFloaty.pushErrorLog('傻逼AI，没有按规则回答，无法正确解析 尝试自动纠正，如失败请手动答题')
      for (let tryIdx = 0; tryIdx < answers.length; tryIdx++) {
        if (content.indexOf(answers[tryIdx]) > -1) {
          valid = true
          answerIdx = tryIdx
        }
      }
    }
    return { valid: valid, answerIdx: answerIdx, describe: match[3] }
  } else {
    logFloaty.pushErrorLog('答案解析失败，请通过日志信息自己判断或者再次尝试')
  }
  return undefined
}

/**
 * 构建请求内容
 * @param {*} question 题目信息
 * @param {*} answers  回答选项
 * @returns 
 */
function buildRequest (question, answers) {
  let content = `${question} 选项：1、${answers[0]} 2、${answers[1]} 请严格按照以下规则先回答答案选项的顺序号：1或者2，然后再附加解释信息。
   回答时按如下结构返回：<answer>1</answer><describe>xxxx</describe>`
  console.verbose('构造请求：', content)
  return content
}


function aiRequest (content, type, key) {
  tryTime = 3
  do {
    let executor = null
    if (typeof key !== 'undefined' && key !== '') {
      if (type === 'kimi') {
        executor = new KimiRequestExecutor(key)
      } else if (type === 'chatgml') {
        executor = new ChatGMLRequestExecutor(key)
      }
    }
    if (!executor) {
      executor = new YqCloudRequestExecutor()
    }
    let result = executor.execute(content)
    if (result) {
      return result
    }
    logFloaty.pushErrorLog('接口请求失败，尝试重试[' + --tryTime + ']次')
    sleep(1000 * (3-tryTime))
  } while (tryTime > 0)
}

function AiRequestExecutor () {
  this.name = 'AiRequestExecutor'
}

AiRequestExecutor.prototype.execute = function (question) {
  //
  let client = new OkHttpClient().newBuilder()
    .callTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
    .build();
  let request = this.buildRequestData(question)
  try {
    let response = client.newCall(request).execute();
    if (!response.isSuccessful()) {
      logFloaty.pushErrorLog(this.name + '接口请求失败，状态码：' + response.code())
      logFloaty.pushErrorLog('错误信息：' + response.body().string())
      return
    }
    let responseBody = response.body().string();
    console.verbose(this.name, '请求结果', responseBody)
    return this.inspectResponse(responseBody)
  } catch (e) {
    logFloaty.pushErrorLog(this.name + '接口请求异常' + e.message)
  }
}

// openai通用结构
AiRequestExecutor.prototype.inspectResponse = function (responseBody) {
  try {
    let responseJson = JSON.parse(responseBody)
    let choices = responseJson.choices
    let content = choices[0].message.content
    return content
  } catch (e) {
    logFloaty.pushErrorLog(this.name + '接口返回数据解析失败')
    logFloaty.pushErrorLog(responseBody)
  }
}

AiRequestExecutor.prototype.buildRequestData = function (question) { }

function YqCloudRequestExecutor () {
  this.name = 'YqCloud'
}
YqCloudRequestExecutor.prototype = Object.create(AiRequestExecutor.prototype)
YqCloudRequestExecutor.prototype.constructor = YqCloudRequestExecutor

YqCloudRequestExecutor.prototype.buildRequestData = function (question) {
  logFloaty.logQueue.push('使用YqCloud接口请求,可能并不稳定', '#888888')
  let requestData = {
    "prompt": question,
    "apikey": "",
    "system": "",
    "withoutContext": false,
    "userId": 'yqcloud' + new Date().getTime(),
    "network": true
  }
  let mediaType = MediaType.parse("application/json");
  let body = RequestBody.create(mediaType, JSON.stringify(requestData));
  return new Request.Builder()
    .url("https://api.binjie.fun/api/generateStream")
    .method("POST", body)
    .addHeader("Referer", "https://chat18.aichatos.xyz")
    .addHeader("origin", "https://chat18.aichatos.xyz")
    .addHeader("User-Agent", "Apifox/1.0.0 (https://apifox.com)")
    .addHeader("Content-Type", "application/json")
    .addHeader("Accept", "*/*")
    .addHeader("Host", "api.binjie.fun")
    .addHeader("Connection", "keep-alive")
    .build();
}
// 返回结果为字符串 直接返回即可
YqCloudRequestExecutor.prototype.inspectResponse = resp => resp

function KimiRequestExecutor (key) {
  this.name = 'Kimi'
  this.key = key || config.kimi_api_key
}
KimiRequestExecutor.prototype = Object.create(AiRequestExecutor.prototype)
KimiRequestExecutor.prototype.constructor = KimiRequestExecutor
KimiRequestExecutor.prototype.buildRequestData = function (question) {
  logFloaty.logQueue.push('使用KIMI接口请求', '#888888')
  let requestData = {
    "model": "moonshot-v1-8k",
    "messages": [
      {
        "role": "system",
        "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你是一个答题小助手，回答时根据提示响应简短的答案，不需要附带过多的解释内容。同时，你会拒绝一些涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。"
      },
      {
        "role": "user",
        "content": question
      }
    ],
    "temperature": 0.3
  }
  let mediaType = MediaType.parse("application/json");
  let body = RequestBody.create(mediaType, JSON.stringify(requestData));
  return new Request.Builder()
    .url("https://api.moonshot.cn/v1/chat/completions")
    .method("POST", body)
    .addHeader("Authorization", "Bearer " + this.key)
    .addHeader("Content-Type", "application/json")
    .addHeader("Accept", "*/*")
    .addHeader("Host", "api.moonshot.cn")
    .build();
}


function ChatGMLRequestExecutor (key) {
  this.name = 'ChatGML'
  this.key = key || config.chatgml_api_key
}
ChatGMLRequestExecutor.prototype = Object.create(AiRequestExecutor.prototype)
ChatGMLRequestExecutor.prototype.constructor = ChatGMLRequestExecutor
ChatGMLRequestExecutor.prototype.buildRequestData = function (question) {
  logFloaty.logQueue.push('使用智谱清言接口请求', '#888888')
  let requestData = {
    "model": "glm-4",
    "messages": [
      {
        "role": "user",
        "content": question
      }
    ]
  }
  let mediaType = MediaType.parse("application/json");
  let body = RequestBody.create(mediaType, JSON.stringify(requestData));
  return new Request.Builder()
    .url("https://open.bigmodel.cn/api/paas/v4/chat/completions")
    .method("POST", body)
    .addHeader("Authorization", "Bearer " + this.key)
    .addHeader("Content-Type", "application/json")
    .addHeader("Accept", "*/*")
    .addHeader("Host", "open.bigmodel.cn")
    .build();
}

function getQuestionInfo (type, key) {
  logFloaty.pushLog('开始获取题目信息')
  FloatyInstance.setFloatyText('正在获取题目信息...')
  let questionWidget = selector().className('android.widget.TextView').depth(17).filter(v => v.bounds().left < 200).findOne(2000)
  let answerWidgets = null
  let t = threads.start(function () {
    answerWidgets = selector().className('android.widget.TextView').depth(18).untilFind()
  })
  t.join(5000)
  t.interrupt()
  if (!(questionWidget && answerWidgets)) {
    logFloaty.pushErrorLog('题目信息获取失败')
    FloatyInstance.setFloatyText('题目信息获取失败')
    return
  }
  let question = questionWidget.text()
  let answers = []
  let answerPosition = []
  for (let i = 0; i < answerWidgets.length; i++) {
    let widget = answerWidgets[i]
    let bs = widget.bounds()
    answers.push(widget.text())
    answerPosition.push({ left: bs.left, top: bs.top, x: bs.centerX(), y: bs.centerY() })
  }
  logFloaty.pushLog(question)
  logFloaty.pushLog(JSON.stringify(answers))
  if (question && answers.length === 2) {
    FloatyInstance.setFloatyText('请求AI接口中...')
    let start = new Date().getTime()
    let response = aiRequest(buildRequest(question, answers), type, key)
    logFloaty.pushLog('请求耗时：' + (new Date().getTime() - start) + 'ms', '#888888')
    logFloaty.pushLog('请求AI接口 答案为:' + response)
    let result = inspectAnswer(response, answers)
    if (result) {
      if (!result.valid) {
        return null
      }
      let answerWidget = answerPosition[result.answerIdx]
      let target = { x: answerWidget.left, y: answerWidget.y }
      FloatyInstance.setFloatyInfo(target, '解释信息：' + result.describe)
      logFloaty.pushLog('答案位置：' + JSON.stringify(target))
      logFloaty.pushLog('答案解释：' + result.describe)
      return { target: { x: answerWidget.x, y: target.y }, describe: result.describe }
    } else {
      FloatyInstance.setFloatyText('接口请求失败')
    }
  } else {
    logFloaty.pushErrorLog('题目信息获取失败')
    FloatyInstance.setFloatyText('题目信息获取失败')
  }
  return null
}

module.exports = {
  aiRequest,
  buildRequest,
  getQuestionInfo
}