/************************
 * 依赖加载
 ***********************/
var Automator = require("./lib/Automator.js");
var Unlock = require("./lib/Unlock.js");
var Ant_forest = require("./core/Ant_forest.js");
var scheduler = require('./lib/scheduler.js')
let CommonFunctions = require("./lib/CommonFunction.js")
let formatDate = require("./lib/DateUtil.js");
let DateCompare = require("./lib/DateCompare.js");
let commonFunctions = new CommonFunctions()
var automator = Automator();
var config = require("./config.js");
var unlock = Unlock(automator, config);
var ant_forest = Ant_forest(automator, unlock, config);

app.startActivity({
  action: 'VIEW',
  data: 'alipays://platformapi/startapp?appId=60000002'
})

sleep(2000)

commonFunctions.debug('有背包' + descContains('背包'))
commonFunctions.debug('有浇水' + descContains('浇水'))