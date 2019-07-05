
let { commonFunctions } = require('../lib/CommonFunction.js')

log('=============总收集排序==============')
commonFunctions.showCollectSummary()
log('=============今日收集排序==============')
commonFunctions.showCollectSummary('todayCollect')
log('=============帮助排序==============')
commonFunctions.showCollectSummary('todayHelp')