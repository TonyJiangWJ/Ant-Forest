let { config } = require('../config.js')(runtime, global)
let fakeWalkData = require('../lib/FakeWalkDataUtil.js')
let pushClient = require('../lib/PushPlusUtil.js')
let formatDate = require('../lib/DateUtil.js')
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')

/**
 * 下载小米运动APP 现在名字叫 Zepp Life
 * 注册一个账号  手机号可以直接注册 邮箱的需要选择地区为 其他
 * 这一步非常重要 否则刷的步数无意义：登录后进入APP的第三方接入 绑定到支付宝
 * 然后在下面的accounts中配置一下用户名密码 手机号的需要增加+86前缀 邮箱的不需要
 * 然后运行当前脚本即可自动刷步数数据 如果不需要随机的步数将min和max改成相同即可 或者可以将范围改大一些
 * 运行完毕后APP将会被踢出登录，先试一下 数据能到支付宝之后就可以将APP卸载，后续每天修改步数后都会通过华米自有协议同步到支付宝中不再需要打开APP
 * 
 * 对当前脚本设置一个每日自动执行的定时任务即可每天自动刷步数了 建议时间为晚上
 */

// console.show()
/**
 * 配置需要自动生成步数数据的账号 手机号的需要增加+86前缀
 * min,max 设置一个随机的范围 生成随机的步数
 */

let accounts = config.walking_accounts.map(v => {
  let randomRange = /(\d+)-(\d+)/
  let result = randomRange.exec(v.randomRange)
  let min = 18000, max = 25000
  if (result && result.length > 2) {
    min = parseInt(result[1])
    max = parseInt(result[2])
  }
  return {
    userName: v.account,
    password: v.password,
    min: min,
    max: max
  }
})
let total = accounts.length
if (total <= 0) {
  toastLog('无账号，不刷步数')
}
let generateResult = []
accounts.forEach((config, idx) => {
  let existsData = commonFunctions.getTodaysWalkingData(config.userName)
  console.verbose('获取缓存中当前账号', config.userName, '的历史刷新步数', existsData)
  config.min = Math.max(existsData, config.min)
  let resultStep = generateFakeWalkStep(config)
  if (resultStep == false) {
    generateResult.push({ userName: config.userName, result: '修改步数失败，请查看日志' })
  } else {
    commonFunctions.updateFakeWalkingData(config.userName, resultStep)
    generateResult.push({ userName: config.userName, result: '修改步数成功，随机步数：' + resultStep })
  }
  if (idx < total - 1) {
    console.log('延迟五秒钟执行下一个')
    // 延迟五秒钟
    sleep(5000)
  }
})

if (generateResult.length > 0 && config.pushplus_walking_data && config.pushplus_token) {
  let content = '<div><span>修改时间：' + formatDate(new Date()) + '</span><br/>'
  content += '<ul>'
  content += generateResult.map(result => '<li><span>' + result.userName + '</span>' + result.result + '</li>').join('')
  content += '</ul></div>'
  pushClient.pushHtml('小米运动修改步数完成', content)
}


function generateFakeWalkStep (config) {
  let step = generateRandomStep(config.min, config.max)
  let result = fakeWalkData(config.userName, config.password, step, device.getAndroidId())
  if (result) {
    toastLog('账号' + config.userName + '修改步数成功 随机步数：' + step)
    return step
  } else {
    toastLog('账号' + config.userName + '修改步数失败')
    return false
  }
}

function generateRandomStep (min, max) {
  min = min || 8000
  max = max || 15000
  if (min == max) {
    return min
  }
  if (min > max) {
    min = min + max
    max = min - max
    min = min - max
  }
  return min + parseInt((Math.random() * max) % (max - min))
}

