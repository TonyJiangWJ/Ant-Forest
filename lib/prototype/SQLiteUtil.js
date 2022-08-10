let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')
let { config: _config } = require('../../config.js')(runtime, global)
let { debugInfo, warnInfo, infoLog, errorInfo, logInfo } = singletonRequire('LogUtils')
let workpath = FileUtils.getCurrentWorkPath()
let $resolver = require(workpath + '/lib/AutoJSRemoveDexResolver.js')
$resolver()
runtime.loadDex(workpath + '/lib/autojs-common.dex')
$resolver()
importClass(com.tony.autojs.sqlite.SQLiteHelper)
importClass(java.util.ArrayList)
importClass(java.util.Arrays)
importClass(java.util.HashMap)

module.exports = new SQLiteUtil()

function SQLiteUtil () {

  this.sqliteHelper = null
  this.tableIdentifyMap = {}
  this.fullColumnConvertMap = {}
  this.initSuccess = false
  const COUNT_CONVERTER = createInterfaceOrJavaAdapter(SQLiteHelper.ModelFromCursorConverter, {
    convert: function (cursor) {
      return parseInt(cursor.getLong(0))
    }
  })
  /**
   * 初始化sqlite 读取表结构信息
   * @param {string} fileName sqlite文件全路径
   * @param {Array} tables 定义表信息
   * @param {number} version 数据库版本号
   */
  this.initDbTables = function (fileName, tables, version) {
    version = version || 1
    if (this.sqliteHelper != null) {
      warnInfo('sqlite 已初始化，关闭原连接')
      this.sqliteHelper.close()
      this.tableIdentifyMap = {}
    }
    let currentVersion = SQLiteHelper.getDbVersion(fileName)
    debugInfo(['当前数据库版本号：{} 新版本号：{}', currentVersion, version])
    // 表结构变更 和 初始化 脚本
    let initSqls = []
    let alterSqls = tables.map(table => {
        let alters = table.tableAlters || []
        return alters.map(sql => {
          if (typeof sql === 'string') {
            if (currentVersion === 0) {
              return sql
            }
          } else if (sql.version > currentVersion) {
            return sql.sql
          }
          return null
        }).filter(v => v != null)
      })
      .filter(alters => alters != null && alters.length > 0)
      .reduce((a, b) => a.concat(b), [])
    if (currentVersion === 0) {
      initSqls = alterSqls
      alterSqls = []
    }
    if (initSqls.length > 0) {
      debugInfo(['待执行的初始化 sqls: {}', JSON.stringify(initSqls)])
    } else if (alterSqls.length > 0) {
      debugInfo(['待执行的alter sqls: {}', JSON.stringify(alterSqls)])
    }
    this.sqliteHelper = new SQLiteHelper(fileName, tables.map(table => table.tableCreate).concat(initSqls), alterSqls, version, context)
    let self = this
    tables.forEach(table => {
      try {
        debugInfo(['准备初始化表数据:{}', table.tableName])
        table.modelConverter = table.modelConverter || createModelConverter(table.columnMapping)
        let tableName = table.tableName
        debugInfo(['准备初始化表数据IdentifyMap:{}', table.tableName])
        self.tableIdentifyMap[tableName] = tableIdentifyConverter(tableName, table.columnMapping)
        debugInfo(['准备初始化表数据ColumnConvertMap:{}', table.tableName])
        self.fullColumnConvertMap[tableName] = cursorModelConverter(table.modelConverter)
      } catch (e) {
        errorInfo(['初始化数据库失败 {} {}', table.tableName, e])
      }
    })
    this.initSuccess = true
    debugInfo(['初始化数据库成功'])
    commonFunctions.registerOnEngineRemoved(function () {
      self.sqliteHelper.close()
    }, 'close sqlite connection')
  }

  this.getDbVersion = function (fileName) {
    return SQLiteHelper.getDbVersion(fileName)
  }

  this.checkIdentify = function (tableName) {
    if (!this.initSuccess) {
      errorInfo('sqlite未初始化')
      return null
    }
    let identify = this.tableIdentifyMap[tableName]
    if (!identify) {
      errorInfo(['获取「{}」模型定义对象失败', tableName])
      return null
    }
    return identify
  }

  this.insert = function (tableName, source) {
    if (typeof source === 'undefined' || source === null) {
      errorInfo('参数为空 无法插入')
      return -1
    }
    let identify = this.checkIdentify(tableName)
    if (!identify) {
      return -1
    }
    return this.sqliteHelper.insertWithModel(identify, source)
  }

  this.updateById = function (tableName, id, source) {
    if (typeof id === 'undefined' || id === null || id === '') {
      errorInfo('参数id为空 无法更新')
      return -1
    }
    if (typeof source === 'undefined' || source === null) {
      errorInfo('参数为空 无法更新')
      return -1
    }
    let identify = this.checkIdentify(tableName)
    if (!identify) {
      return -1
    }
    return this.sqliteHelper.updateByIdWithModel(identify, id, source)
  }

  this.selectById = function (tableName, id) {
    if (typeof id === 'undefined' || id === null || id === '') {
      errorInfo('参数id为空 无法查询')
      return null
    }
    let identify = this.checkIdentify(tableName)
    if (!identify) {
      return null
    }
    let columnConverter = this.fullColumnConvertMap[tableName]
    if (!columnConverter) {
      errorInfo('参数映射不存在，无法查询')
      return null
    }
    return this.sqliteHelper.selectById(identify, id, columnConverter)
  }

  this.deleteById = function (tableName, id) {
    if (typeof id === 'undefined' || id === null || id === '') {
      errorInfo('参数id为空 无法删除')
      return null
    }
    if (typeof tableName === 'undefined' || id === null || id === '') {
      errorInfo('参数tableName为空 无法删除')
      return null
    }
    return this.sqliteHelper.deleteById(tableName, id)
  }

  this.query = function (tableName, whereClause, params) {
    whereClause = whereClause || ''
    let identify = this.checkIdentify(tableName)
    if (!identify) {
      return []
    }
    let columnConverter = this.fullColumnConvertMap[tableName]
    if (!columnConverter) {
      errorInfo('参数映射不存在，无法查询')
      return null
    }
    let resultList = this.sqliteHelper.rawQueryWithModel(
      'SELECT ' + identify.getBaseColumnList() + ' FROM ' + tableName + ' ' + whereClause,
      params, columnConverter
    )
    if (resultList != null) {
      return runtime.bridges.bridges.toArray(resultList)
    }
    return []
  }

  this.count = function (tableName, whereClause, params) {
    whereClause = whereClause || ''
    let count = this.sqliteHelper.rawQueryWithModel('SELECT COUNT(*) FROM ' + tableName + ' ' + whereClause, params, COUNT_CONVERTER)
    return count && count.length > 0 ? count[0] : 0
  }

  this.rawQuery = function (sql, params, converter) {
    let resultList = this.sqliteHelper.rawQueryWithModel(sql, params, cursorModelConverter(converter))
    if (resultList != null) {
      return runtime.bridges.bridges.toArray(resultList)
    }
    return []
  }

  this.rawCount = function (sql, params) {
    let count = this.sqliteHelper.rawQueryWithModel(sql, params)
    return count && count.length > 0 ? count[0] : 0
  }

  this.execSql = function (sql, params) {
    this.sqliteHelper.rawExecute(sql, params)
  }

  function cursorModelConverter (converter) {
    return createInterfaceOrJavaAdapter(SQLiteHelper.ModelFromCursorConverter, {
      convert: function (cursor) {
        return converter(cursor)
      }
    })
  }

  /**
   * 将js表结构定义信息转换成实际的java对象
   * 
   * @param {string} tableName 
   * @param {object} columnMapping 
   * @returns 
   */
  function tableIdentifyConverter (tableName, columnMapping) {
    let tableIdentify = createInterfaceOrJavaAdapter(SQLiteHelper.ModelIdentify, {
      getValueByKey: function (fieldName, object) {
        let value = object[fieldName]
        if (typeof value === 'undefined' || value === null) {
          return null
        }
        return value
      }
    })
    tableIdentify.setTableName(tableName)
    tableIdentify.setColumnFields(convertColumnMapping(columnMapping))
    return tableIdentify

    /**
     * 
     * @param {object} columnMapping 键值对 保存 COLUMN_NAME => [fieldName, converter]
     * @returns 
     */
    function convertColumnMapping (columnMapping) {
      let columnFields = new ArrayList()
      Object.keys(columnMapping).forEach(columnName => {
        try {
          let columnInfo = columnMapping[columnName]
          if (!columnInfo || columnInfo.length < 2) {
            errorInfo(['字段映射信息错误：{}', columnName, JSON.stringify(columnInfo)])
            return
          }
          let columnField = new SQLiteHelper.ColumnField(columnName, columnInfo[0], createInterfaceOrJavaAdapter(SQLiteHelper.DataAdapter, {
            convert: columnInfo[1]
          }))
          columnFields.add(columnField)
        } catch (e) {
          errorInfo(['生成字段映射失败{} {}', columnName, e])
        }
      })
      return columnFields
    }
  }

  function createModelConverter (columnMapping) {
    return cursor => {
      let result = {}
      Object.keys(columnMapping).map((columnName, idx) => {
        let fieldInfo = columnMapping[columnName]
        result[fieldInfo[0]] = fieldInfo[2](cursor, idx)
      })
      return result
    }
  }

  function createInterfaceOrJavaAdapter (clazzOrInterface, extend) {
    return commonFunctions.createInterfaceOrJavaAdapter(clazzOrInterface, extend)
  }
}