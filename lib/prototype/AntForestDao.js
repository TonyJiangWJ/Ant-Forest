let { config } = require('../../config.js')(runtime, global)
let dateFormat = require('../DateUtil.js')
let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let sqliteUtil = singletonRequire('SQLiteUtil')
let fileUtils = singletonRequire('FileUtils')
let logUtils = singletonRequire('LogUtils')
let dbFileName = fileUtils.getCurrentWorkPath() + '/config_data/ant_forest.db'
const createDbConfig = sqliteUtil.createDbConfig
const PARSER = sqliteUtil.PARSER
/**
 * 能量收集数据
 */
let EnergyCollectData = createDbConfig({
  tableName: 'ENERGY_COLLECT_DATA',
  tableAlters: [
    'create index idx_date_friend on ENERGY_COLLECT_DATA(COLLECT_DATE,FRIEND_NAME)'
  ],
  fieldConfig: {
    id: { column: 'ID', type: 'INTEGER', primaryKey: true, autoIncrement: true, parser: PARSER.Integer },
    friendName: { column: 'FRIEND_NAME', type: 'VARCHAR(32)', notNull: true, parser: PARSER.String },
    friendEnergy: { column: 'FRIEND_ENERGY', type: 'INTEGER', notNull: true, parser: PARSER.Integer },
    collectEnergy: { column: 'COLLECT_ENERGY', type: 'INTEGER', notNull: true, parser: PARSER.Integer },
    waterEnergy: { column: 'WATER_ENERGY', type: 'INTEGER', parser: PARSER.Integer },
    collectDate: { column: 'COLLECT_DATE', type: 'VARCHAR(10)', notNull: true, parser: PARSER.String },
    createTime: { column: 'CREATE_TIME', type: 'DATETIME', parser: PARSER.Date },
  }
})

/**
 * 定义自己的能量值数据
 */
let MyEnergyData = createDbConfig({
  tableName: 'MY_ENERGY_DATA',
  tableAlters: [
    'create index idx_date on MY_ENERGY_DATA(ENERGY_DATE,ENERGY)',
  ],
  fieldConfig: {
    id: { column: 'ID', type: 'INTEGER', primaryKey: true, autoIncrement: true, parser: PARSER.Integer },
    energy: { column: 'ENERGY', type: 'INTEGER', notNull: true, parser: PARSER.Integer, defaultVal: '0' },
    energyDate: { column: 'ENERGY_DATE', type: 'VARCHAR(10)', notNull: true, parser: PARSER.String },
    createTime: { column: 'CREATE_TIME', type: 'DATETIME', parser: PARSER.Date },
  },
})

function AntForestDao () {
  this.init = function () {
    sqliteUtil.initDbTables(dbFileName, [EnergyCollectData, MyEnergyData], 1)
  }

  /**
   * 保存当前能量值数据
   * 
   * @param {number} energy 
   * @returns 
   */
  this.saveMyEnergy = function (energy) {
    let sourceData = { energy: energy, energyDate: dateFormat(new Date(), 'yyyy-MM-dd'), createTime: new Date() }
    let exists = sqliteUtil.count(MyEnergyData.tableName, 'WHERE ENERGY=? AND ENERGY_DATE=?', [sourceData.energy, sourceData.energyDate])
    if (exists > 0) {
      logUtils.debugInfo('存在重复数据不再插入新值')
      return 0
    }
    logUtils.debugInfo(['保存当前能量值数据：{}', JSON.stringify(sourceData)])
    return sqliteUtil.insert(MyEnergyData.tableName, sourceData)
  }

  /**
   * 保存收集好友的能量数
   * 
   * @param {string} friendName 好友名称
   * @param {number} friendEnergy 好友当前能量
   * @param {number} collectEnergy 收集能量数
   * @param {number} waterEnergy 浇水能量数
   * @returns 
   */
  this.saveFriendCollect = function (friendName, friendEnergy, collectEnergy, waterEnergy, collectTime) {
    collectEnergy = collectEnergy || 0
    waterEnergy = waterEnergy || 0
    collectTime = collectTime || new Date()
    let sourceData = {
      friendName: friendName,
      friendEnergy: friendEnergy,
      collectEnergy: collectEnergy,
      waterEnergy: waterEnergy,
      collectDate: dateFormat(collectTime, 'yyyy-MM-dd'),
      createTime: collectTime,
    }
    let exists = sqliteUtil.count(EnergyCollectData.tableName, 'WHERE FRIEND_NAME=? AND CREATE_TIME=?', [sourceData.friendName, dateFormat(sourceData.createTime)])
    if (exists > 0) {
      logUtils.debugInfo('存在重复数据不再插入新值')
      return 0
    }
    logUtils.debugInfo(['保存好友收集数据：{}', JSON.stringify(sourceData)])
    return sqliteUtil.insert(EnergyCollectData.tableName, sourceData)
  }

  /**
   * 根据指定日期查询好友当日被收取的能量数据
   *
   * @param {Object} queryInfo 查询参数 { collectDate, friendName, orderBy }
   * @returns 
   */
  this.pageGroupedCollectInfo = function (queryInfo) {
    queryInfo = queryInfo || {}
    let { whereClause, params, orderBy } = buildCollectQueryClause(queryInfo)
    let total = sqliteUtil.count(EnergyCollectData.tableName, whereClause, params)
    let pageResult = {
      total: total
    }

    let start = queryInfo.start || 0
    let size = queryInfo.size || 30
    pageResult.current = start
    pageResult.size = size
    if (total > 0) {
      params.push(start * size)
      params.push(size)
      let result = sqliteUtil.rawQuery('SELECT FRIEND_NAME, SUM(COLLECT_ENERGY) COLLECT_ENERGY, SUM(WATER_ENERGY) WATER_ENERGY, COLLECT_DATE FROM ENERGY_COLLECT_DATA ' + whereClause + ' GROUP BY FRIEND_NAME ' + orderBy + ' LIMIT ?, ?',
        params, cursor => {
          return {
            friendName: cursor.getString(0),
            collectEnergy: cursor.getInt(1),
            waterEnergy: cursor.getInt(2),
            collectDate: cursor.getString(3),
          }
        })
      pageResult.result = result
    }
    return pageResult
  }

  /**
   * 分页查询收集数据
   * 
   * @param {object} queryInfo 
   * @returns 
   */
  this.pageCollectInfo = function (queryInfo) {
    queryInfo = queryInfo || {}
    let { whereClause, params, orderBy } = buildCollectQueryClause(queryInfo)
    let total = sqliteUtil.count(EnergyCollectData.tableName, whereClause, params)
    let pageResult = {
      total: total
    }

    let start = queryInfo.start || 0
    let size = queryInfo.size || 30
    pageResult.current = start
    pageResult.size = size
    if (total > 0) {
      params.push(start * size)
      params.push(size)
      let result = sqliteUtil.query(EnergyCollectData.tableName, whereClause + orderBy + ' LIMIT ?, ?', params)
      pageResult.result = result
    }
    return pageResult
  }

  this.getCollectSummary = function (queryInfo) {
    queryInfo = queryInfo || {}
    let { whereClause, params } = buildCollectQueryClause(queryInfo)
    let result = sqliteUtil.rawQuery('SELECT SUM(COLLECT_ENERGY) totalCollect, SUM(WATER_ENERGY) totalWater FROM ENERGY_COLLECT_DATA ' + whereClause, params, cursor => {
      return {
        totalCollect: cursor.getInt(0),
        totalWater: cursor.getInt(1)
      }
    })
    if (result && result.length > 0) {
      return result[0]
    } else {
      return {
        totalCollect: 0,
        totalWater: 0
      }
    }
  }

  this.getMyEnergyIncreased = function (date) {
    let allData = sqliteUtil.rawQuery('select ENERGY from MY_ENERGY_DATA where ENERGY_DATE=? order by CREATE_TIME', [date], cursor => {
      return parseInt(cursor.getInt(0))
    })
    if (allData.length > 1) {
      return allData[allData.length - 1] - allData[0]
    }
    return 0
  }

  this.getMyEnergyByDate = function (date) {
    return sqliteUtil.rawQuery('select ENERGY,CREATE_TIME from MY_ENERGY_DATA where ENERGY_DATE=? order by CREATE_TIME', [date], cursor => {
      return {
        energy: parseInt(cursor.getInt(0)),
        createTime: cursor.getString(1)
      }
    })
  }

  /**
   * 获取某一日 某一时间之后收集的能量数量 不包含自身增加的
   *
   * @param {string} date 
   * @param {string} time 
   * @returns 
   */
  this.getCollectInTimeRange = function (date, time) {
    logUtils.debugInfo(['查询参数 date:{} time: {}', date, time])
    let resultList = sqliteUtil.rawQuery('select sum(COLLECT_ENERGY) from ENERGY_COLLECT_DATA where COLLECT_DATE=? and CREATE_TIME>?', [date, time],
      cursor => {
        return {
          increased: parseInt(cursor.getInt(0))
        }
      })
    if (resultList && resultList.length > 0) {
      return { increased: resultList[0].increased }
    }
    return { increased: 0 }
  }

  /**
   * 获取某一日 某个时间段内增加的能量值 存在合种浇水的可能 所以并不太准
   *
   * @param {string} date 
   * @param {string} timeStart
   * @param {string} timeEnd
   * @returns 
   */
   this.getIncreasedInTimeRange = function (date, timeStart,  timeEnd) {
    logUtils.debugInfo(['查询参数 date:{} time: {}-{}', date, timeStart,  timeEnd])
    let resultList = sqliteUtil.rawQuery('select max(ENERGY) - min(ENERGY) from MY_ENERGY_DATA where ENERGY_DATE=? and CREATE_TIME>? and CREATE_TIME<=?', [date, timeStart, timeEnd],
      cursor => {
        return {
          increased: parseInt(cursor.getInt(0))
        }
      })
    if (resultList && resultList.length > 0) {
      return { increased: resultList[0].increased }
    }
    return { increased: 0 }
  }

  this.queryDailyCollectByDate = function (start, end) {
    let whereClause = 'WHERE 1=1'
    let params = []
    if (start) {
      whereClause += ' AND COLLECT_DATE>=?'
      params.push(start)
    }
    if (end) {
      whereClause += ' AND COLLECT_DATE<=?'
      params.push(end)
    }
    return sqliteUtil.rawQuery('select sum(COLLECT_ENERGY) COLLECT_ENERGY,SUM(WATER_ENERGY) WATER_ENERGY, COLLECT_DATE from ENERGY_COLLECT_DATA ' + whereClause + ' GROUP BY COLLECT_DATE order by COLLECT_DATE',
     params, cursor => {
       return {
         collectEnergy: parseInt(cursor.getInt(0)),
         waterEnergy: parseInt(cursor.getInt(1)),
         collectDate: cursor.getString(2),
       }
     })
  }

  this.queryMyDailyEnergyByDate = function (start, end) {
    let whereClause = 'WHERE ENERGY>0'
    let params = []
    if (start) {
      whereClause += ' AND ENERGY_DATE>=?'
      params.push(start)
    }
    if (end) {
      whereClause += ' AND ENERGY_DATE<=?'
      params.push(end)
    }
    return sqliteUtil.rawQuery('select ENERGY,ENERGY_DATE from MY_ENERGY_DATA where id in (select MAX(ID) from MY_ENERGY_DATA ' + whereClause + ' GROUP BY ENERGY_DATE)', params,
      cursor => {
        return {
          energy: parseInt(cursor.getInt(0)),
          energyDate: cursor.getString(1),
        }
      }
    )
  }


  function buildCollectQueryClause (queryInfo) {
    let whereClause = ''
    let params = []
    if (isNotEmpty(queryInfo.collectDate)) {
      whereClause += ' AND COLLECT_DATE=?'
      params.push(queryInfo.collectDate)
    }
    if (isNotEmpty(queryInfo.friendName)) {
      whereClause += " AND FRIEND_NAME LIKE '%?%'"
      params.push(queryInfo.friendName)
    }
    if (whereClause !== '') {
      whereClause = 'WHERE 1=1' + whereClause
    }
    let orderBy = 'CREATE_TIME'
    if (isNotEmpty(queryInfo.orderBy)) {
      orderBy = queryInfo.orderBy
    }
    orderBy = ' ORDER BY ' + orderBy
    return {
      whereClause: whereClause, params: params, orderBy: orderBy
    }
  }

  function isNotEmpty (val) {
    return typeof val !== 'undefined' && val !== null && val !== ''
  }
}

function parseDate (dateStr) {
  let regex = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.(\d{1,3}))?/
  let result = regex.exec(dateStr)
  return new Date(result[1], parseInt(result[2]) - 1, result[3], result[4], result[5], result[6])
}
module.exports = new AntForestDao()