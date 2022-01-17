let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let commonFunction = sRequire('CommonFunction')

commonFunction.ensureRegionInScreen([100, 1000, 1000, 1500], 50, 50)

toastLog('done')