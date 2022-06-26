/*
 * @Author: TonyJiangWJ
 * @Date: 2022-05-15 13:16:06
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2022-06-13 15:08:54
 * @Description: 
 */
try {
 importPackage(Packages["okhttp3"])
} catch(e) {
  //
}
try {
  importClass("okhttp3.OkHttpClient")
  importClass("okhttp3.FormBody")
  importClass("okhttp3.Request")
} catch (e) {
  //
}
module.exports = function (userName, password, walkStep, deviceId) {
  let accessToken = getAccessToken(userName, password)
  if (accessToken == null) {
    console.error('获取accessToken失败')
    return false
  }
  let loginResult = login(accessToken, deviceId)
  if (loginResult == null) {
    console.error('登录失败')
    return false
  }
  return changeWalkingStep(loginResult.userId, loginResult.appToken, walkStep, deviceId)


  function getAccessToken (userName, password) {
    let requestUrl = 'https://api-user.huami.com/registrations/' + userName + '/tokens'
    let requestBody = new FormBody.Builder()
      .add("client_id", "HuaMi")
      .add("password", password)
      .add("redirect_uri", "https://s3-us-west-2.amazonaws.com/hm-registration/successsignin.html")
      .add("token", "access")
      .build()
    let request = new Request.Builder()
      .addHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8")
      .addHeader("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2")
      .url(requestUrl)
      .post(requestBody)
      .build()
    let client = new OkHttpClient.Builder().followRedirects(false).followSslRedirects(false).build()
    let response = client.newCall(request).execute()
    let location = response.header("Location")
    let regex = /.*access=([^&]+)&\w+=/
    if (!regex.test(location)) {
      console.error('请求access token失败')
      return null
    }
    let accessToken = regex.exec(location)[1]
    return accessToken
  }

  function login (accessToken, deviceId) {
    let loginUrl = "https://account.huami.com/v2/client/login"
    let requestBody = new FormBody.Builder()
      .add("app_name", "com.xiaomi.hm.health")
      .add("app_version", "6.0.1")
      .add("code", accessToken)
      .add("country_code", "unknown")
      .add("device_id", deviceId)
      .add("device_model", "android_phone")
      .add("grant_type", "access_token")
      .add("third_name", "huami")
      .add("allow_registration", "false")
      .add("dn", "account.huami.com%2Capi-user.huami.com%2Capi-watch…m%2Capp-analytics.huami.com%2Capi-mifit.huami.com")
      .add("source", "com.xiaomi.hm.health%3A6.0.1%3A50545")
      .add("lang", "zh")
      .build()
    let request = new Request.Builder()
      .addHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8")
      .addHeader("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2")
      .url(loginUrl)
      .post(requestBody)
      .build()
    let client = new OkHttpClient.Builder().followRedirects(false).followSslRedirects(false).build()
    let response = client.newCall(request).execute()
    if (response.isSuccessful()) {
      let responseBody = response.body()
      if (responseBody != null) {
        let responseString = responseBody.string()
        let resultJson = JSON.parse(responseString)
        let tokenInfo = resultJson.token_info
        if (tokenInfo != null) {
          let userId = tokenInfo.user_id
          let appToken = tokenInfo.app_token
          return { userId: userId, appToken: appToken }
        }
      }
    }
    return null
  }

  function changeWalkingStep (userId, appToken, walkStep, deviceId) {
    let date = new java.text.SimpleDateFormat("yyyy-MM-dd").format(new Date())
    let timeStamp = new Date().getTime()
    let jsonData = "[{\"data_hr\":\"//////9L////////////Vv///////////0v///////////9e/////0n/a///S////////////0b//////////1FK////////////R/////////////////9PTFFpaf9L////////////R////////////0j///////////9K////////////Ov///////////zf///86/zr/Ov88/zf/Pf///0v/S/8/////////////Sf///////////z3//////0r/Ov//////S/9L/zb/Sf9K/0v/Rf9H/zj/Sf9K/0//N////0D/Sf83/zr/Pf9M/0v/Ov9e////////////S////////////zv//z7/O/83/zv/N/83/zr/N/86/z//Nv83/zn/Xv84/zr/PP84/zj/N/9e/zr/N/89/03/P/89/z3/Q/9N/0v/Tv9C/0H/Of9D/zz/Of88/z//PP9A/zr/N/86/zz/Nv87/0D/Ov84/0v/O/84/zf/MP83/zH/Nv83/zf/N/84/zf/Of82/zf/OP83/zb/Mv81/zX/R/9L/0v/O/9I/0T/S/9A/zn/Pf89/zn/Nf9K/07/N/83/zn/Nv83/zv/O/9A/0H/Of8//zj/PP83/zj/S/87/zj/Nv84/zf/Of83/zf/Of83/zb/Nv9L/zj/Nv82/zb/N/85/zf/N/9J/zf/Nv83/zj/Nv84/0r/Sv83/zf/MP///zb/Mv82/zb/Of85/z7/Nv8//0r/S/85/0H/QP9B/0D/Nf89/zj/Ov83/zv/Nv8//0f/Sv9O/0ZeXv///////////1X///////////9B////////////TP///1b//////0////////////9N/////////v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+\",\"date\":\"\",\"data\":[{\"start\":0,\"stop\":1439,\"value\":\"UA8AUBQAUAwAUBoAUAEAYCcAUBkAUB4AUBgAUCAAUAEAUBkAUAwAYAsAYB8AYB0AYBgAYCoAYBgAYB4AUCcAUBsAUB8AUBwAUBIAYBkAYB8AUBoAUBMAUCEAUCIAYBYAUBwAUCAAUBgAUCAAUBcAYBsAYCUAATIPYD0KECQAYDMAYB0AYAsAYCAAYDwAYCIAYB0AYBcAYCQAYB0AYBAAYCMAYAoAYCIAYCEAYCYAYBsAYBUAYAYAYCIAYCMAUB0AUCAAUBYAUCoAUBEAUC8AUB0AUBYAUDMAUDoAUBkAUC0AUBQAUBwAUA0AUBsAUAoAUCEAUBYAUAwAUB4AUAwAUCcAUCYAUCwKYDUAAUUlEC8IYEMAYEgAYDoAYBAAUAMAUBkAWgAAWgAAWgAAWgAAWgAAUAgAWgAAUBAAUAQAUA4AUA8AUAkAUAIAUAYAUAcAUAIAWgAAUAQAUAkAUAEAUBkAUCUAWgAAUAYAUBEAWgAAUBYAWgAAUAYAWgAAWgAAWgAAWgAAUBcAUAcAWgAAUBUAUAoAUAIAWgAAUAQAUAYAUCgAWgAAUAgAWgAAWgAAUAwAWwAAXCMAUBQAWwAAUAIAWgAAWgAAWgAAWgAAWgAAWgAAWgAAWgAAWREAWQIAUAMAWSEAUDoAUDIAUB8AUCEAUC4AXB4AUA4AWgAAUBIAUA8AUBAAUCUAUCIAUAMAUAEAUAsAUAMAUCwAUBYAWgAAWgAAWgAAWgAAWgAAWgAAUAYAWgAAWgAAWgAAUAYAWwAAWgAAUAYAXAQAUAMAUBsAUBcAUCAAWwAAWgAAWgAAWgAAWgAAUBgAUB4AWgAAUAcAUAwAWQIAWQkAUAEAUAIAWgAAUAoAWgAAUAYAUB0AWgAAWgAAUAkAWgAAWSwAUBIAWgAAUC4AWSYAWgAAUAYAUAoAUAkAUAIAUAcAWgAAUAEAUBEAUBgAUBcAWRYAUA0AWSgAUB4AUDQAUBoAXA4AUA8AUBwAUA8AUA4AUA4AWgAAUAIAUCMAWgAAUCwAUBgAUAYAUAAAUAAAUAAAUAAAUAAAUAAAUAAAUAAAUAAAWwAAUAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAeSEAeQ8AcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcBcAcAAAcAAAcCYOcBUAUAAAUAAAUAAAUAAAUAUAUAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcCgAeQAAcAAAcAAAcAAAcAAAcAAAcAYAcAAAcBgAeQAAcAAAcAAAegAAegAAcAAAcAcAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcCkAeQAAcAcAcAAAcAAAcAwAcAAAcAAAcAIAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcCIAeQAAcAAAcAAAcAAAcAAAcAAAeRwAeQAAWgAAUAAAUAAAUAAAUAAAUAAAcAAAcAAAcBoAeScAeQAAegAAcBkAeQAAUAAAUAAAUAAAUAAAUAAAUAAAcAAAcAAAcAAAcAAAcAAAcAAAegAAegAAcAAAcAAAcBgAeQAAcAAAcAAAcAAAcAAAcAAAcAkAegAAegAAcAcAcAAAcAcAcAAAcAAAcAAAcAAAcA8AeQAAcAAAcAAAeRQAcAwAUAAAUAAAUAAAUAAAUAAAUAAAcAAAcBEAcA0AcAAAWQsAUAAAUAAAUAAAUAAAUAAAcAAAcAoAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAYAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcBYAegAAcAAAcAAAegAAcAcAcAAAcAAAcAAAcAAAcAAAeRkAegAAegAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAEAcAAAcAAAcAAAcAUAcAQAcAAAcBIAeQAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcBsAcAAAcAAAcBcAeQAAUAAAUAAAUAAAUAAAUAAAUBQAcBYAUAAAUAAAUAoAWRYAWTQAWQAAUAAAUAAAUAAAcAAAcAAAcAAAcAAAcAAAcAMAcAAAcAQAcAAAcAAAcAAAcDMAeSIAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcAAAcBQAeQwAcAAAcAAAcAAAcAMAcAAAeSoAcA8AcDMAcAYAeQoAcAwAcFQAcEMAeVIAaTYAbBcNYAsAYBIAYAIAYAIAYBUAYCwAYBMAYDYAYCkAYDcAUCoAUCcAUAUAUBAAWgAAYBoAYBcAYCgAUAMAUAYAUBYAUA4AUBgAUAgAUAgAUAsAUAsAUA4AUAMAUAYAUAQAUBIAASsSUDAAUDAAUBAAYAYAUBAAUAUAUCAAUBoAUCAAUBAAUAoAYAIAUAQAUAgAUCcAUAsAUCIAUCUAUAoAUA4AUB8AUBkAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAAfgAA\",\"tz\":32,\"did\":\"\",\"src\":24}],\"summary\":\"\",\"source\":24,\"type\":0}]"
    let summary = generateData(walkStep)
    let postData = JSON.parse(jsonData)[0]
    postData.date = date
    postData.did = deviceId
    postData.summary = JSON.stringify(summary)
    jsonData = JSON.stringify([postData])
    // console.verbose(jsonData)
    let url = "https://api-mifit-cn.huami.com/v1/data/band_data.json?&t=" + timeStamp
    let requestBody = new FormBody.Builder()
      .add("userid", "" + userId)
      .add("last_sync_data_time", (timeStamp / 1000 - 3600).toFixed(0))
      .add("device_type", "0")
      .add("last_deviceid", deviceId)
      .add("data_json", jsonData)
      .build()
    let request = new Request.Builder()
      .addHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8")
      .addHeader("apptoken", appToken)
      .url(url)
      .post(requestBody)
      .build()
    let client = new OkHttpClient.Builder().followRedirects(false).followSslRedirects(false).build()
    let response = client.newCall(request).execute()
    if (response.isSuccessful()) {
      let responseBody = response.body()
      if (responseBody != null) {
        let result = JSON.parse(responseBody.string())
        return result.message === 'success'
      }
    }
    return false
  }

  function generateData(totalWalk) {
    return {
      v: 6,
      slp: { st: 1628296479, ed: 1628296479, dp: 0, lt: 0, wk: 0, usrSt: -1440, usrEd: -1440, wc: 0, is: 0, lb: 0, to: 0, dt: 0, rhr: 0, ss: 0,},
      stp: generateStep(totalWalk),
      goal: 8000,
      tz: "28800",
    }
  }
  
  /**
   * 自动生成当天步数详细数据
   * step/dis mode1: 1.47+-0.08 3: 1.21+-0.04 4: 1.06+-0.02
   * step/cal mode1: 55+-3 3: 28+-3 4: 19+-2
   * @param {*} walk 
   * @returns 
   */
  function generateStep(walk) {
    let generateStage = []
    let left = walk
    let totalTime = new Date().getHours() * 60 + new Date().getMinutes()
    let currentTime = 0
    while (currentTime < totalTime) {
      let stop = currentTime + randomGap()
      generateStage.push({
        start: currentTime,
        stop: stop,
      })
      currentTime = stop + randomGap(5, 15)
    }
  
    for (let i = generateStage.length - 1; i >= 0 && left > 0; i--) {
      let randomStep = randomGap(500, 2000)
      left -= randomStep
      generateStage[i].step = randomStep
      let mode = randomMode()
      generateStage[i].mode = mode
      generateStage[i].dis = Math.ceil(generateDis(randomStep, mode))
      generateStage[i].cal = Math.ceil(generateCal(randomStep, mode))
    }
  
    generateStage = generateStage.filter((v) => v.cal)
    return {
      ttl: walk,
      dis: generateStage.map((v) => v.dis).reduce((a, b) => (a += b), 0),
      cal: generateStage.map((v) => v.cal).reduce((a, b) => (a += b), 0),
      wk: generateStage
        .filter((v) => v.mode == 1)
        .map((v) => v.cal)
        .reduce((a, b) => (a += b), 0),
      rn: generateStage
        .filter((v) => v.mode == 3)
        .map((v) => v.cal)
        .reduce((a, b) => (a += b), 0),
      runDist: generateStage
        .filter((v) => v.mode != 1)
        .map((v) => v.dis)
        .reduce((a, b) => (a += b), 0),
      runCal: generateStage
        .filter((v) => v.mode == 4)
        .map((v) => v.cal)
        .reduce((a, b) => (a += b), 0),
      stage: generateStage,
    }
  }
  
  function randomMode() {
    return [1, 3, 4][Math.ceil(Math.random() * 10) % 3]
  }
  
  function randomGap(min, max) {
    min = min || 10
    max = max || 30
    return min + (Math.ceil(Math.random() * 999) % (max - min))
  }
  
  function generateDis(step, mode) {
    switch (mode) {
      case 1:
        return step / randomRate(1.47, 0.08)
      case 3:
        return step / randomRate(1.21, 0.04)
      default:
        return step / randomRate(1.06, 0.02)
    }
  }
  
  function generateCal(step, mode) {
    switch (mode) {
      case 1:
        return step / randomRate(55, 3)
      case 3:
        return step / randomRate(28, 3)
      default:
        return step / randomRate(19, 2)
    }
  }
  
  function randomRate(basic, s) {
    return basic - s + (Math.random() % (2 * s))
  }
}