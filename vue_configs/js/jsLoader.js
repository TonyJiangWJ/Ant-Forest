/**
 * 配置需要异步加载的文件
 */
const loadJsList = [
  'https://fastly.jsdelivr.net/npm/axios@0.25.0/dist/axios.min.js',
  'https://fastly.jsdelivr.net/npm/js-base64@3.7.2/base64.min.js',
  './js/mdjs.min.js',
  './js/components/configuration/About.js',
  './js/components/configuration/ImageConfig.js',
  './js/components/configuration/DevelopConfig.js',
  './js/components/configuration/CommonConfigs.js',
  './js/components/configuration/AdvanceConfigs.js',
  './js/components/configuration/QuestionAnswer.js',
  './js/components/configuration/SampleConfigs.js',
  './js/components/configuration/WidgetConfigs.js',
  './js/components/configuration/AccountManage.js',
  './js/components/view/CollectSummary.js',
  './js/components/view/CollectChart.js',
  './js/components/view/DailyChart.js',
  './js/components/Index.js',
]
/**
 * 需要顺序加载的
 */
const mainJsList = [
  './js/routerIndex.js',
  './js/store.js',
  './js/app.js',
]
let start = new Date().getTime()
appendJs('./js/components/common.js')
  .then(() => {
    // 加载基础js 然后异步加载所有组件
    Promise.all(loadJsList.map(js => {
      console.log('异步加载：', js)
      return appendJs(js)
    })).then(_ => {
      // 组件加载完毕后 加载vue-router vuex app
      return asyncAppendJs(mainJsList)
    }).then(() => {
      console.log('加载所有js耗时：', (new Date().getTime() - start), 'ms')
    })
  })

// 加载CSS
const cssList = [
  'https://fastly.jsdelivr.net/npm/bootstrap@4.6.1/dist/css/bootstrap.min.css',
]
cssList.forEach((css) => appendCss(css))

//===============

function createElement (element) {
  return document.createElement(element)
}

function appendCss (url) {
  return new Promise((resolve, reject) => {
    let css = createElement('link')
    css.rel = "stylesheet"
    css.type = "text/css";
    css.href = url
    css.onreadystatechange = (_) => {
      if (css.readyState == 'loaded' || css.readyState == 'complete') {
        resolve()
      }
    }
    css.onerror = reject
    css.onload = resolve
    document.getElementsByTagName('head')[0].appendChild(css)
  })
}

/**
 * 异步加载js
 * @param {string} url 
 * @returns 
 */
function appendJs (url) {
  return new Promise((resolve, reject) => {
    let script = createElement('script')
    script.type = "text/javascript"
    script.src = url
    script.onreadystatechange = (_) => {
      if (script.readyState == 'loaded' || script.readyState == 'complete') {
        resolve()
      }
    }
    script.onerror = reject
    script.onload = resolve
    document.getElementsByTagName('head')[0].appendChild(script)
  })
}
/**
 * 按顺序同步加载
 */
async function asyncAppendJs (jsList) {
  for (var i = 0; i < jsList.length; i++) {
    console.log('同步加载：', jsList[i])
    await appendJs(jsList[i])
  }
}