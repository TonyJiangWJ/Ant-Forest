let singletonRequire = require('../SingletonRequirer.js')(runtime, global)
let FileUtils = singletonRequire('FileUtils')
let commonFunctions = singletonRequire('CommonFunction')
let { config: _config } = require('../../config.js')(runtime, global)
let { debugInfo, warnInfo, infoLog, errorInfo, logInfo } = singletonRequire('LogUtils')
let workpath = FileUtils.getCurrentWorkPath()
let $resolver = require(workpath + '/lib/AutoJSRemoveDexResolver.js')
$resolver()
checkAndLoadDex(workpath + '/lib/autojs-common.dex')
$resolver()
importClass(com.tony.autojs.sqlite.SQLiteHelper)
importClass(java.util.ArrayList)
importClass(java.util.Arrays)
importClass(java.util.HashMap)

module.exports = new SQLiteUtil()

function SQLiteUtil () {
  _this = this
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
      debugInfo(['建表语句：{}', table.tableCreate])
      /**
       * tableAlters代表变更脚本，数组中为字符串（配置时请在仅初始化表时使用字符串）或者对象：{ version: 1, sql: 'alter sql' }
       * 如果当前数据库版本号为0，则执行建表时初始化的alter语句。一般为创建索引
       * 如果当前数据库版本号不为0，则执行version大于当前版本号的alter语句
       */
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
    this.sqliteHelper = new SQLiteHelper(fileName, tables.map(table => new java.lang.String(table.tableCreate)).concat(initSqls), alterSqls, version, context)
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

  /**
   * 
   * @param {*} tableName 查询表名
   * @param {*} whereClause 查询语句 where子句如：'WHERE id = ?'
   * @param {*} params 参数列表如：[11]
   * @returns 
   */
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

  /**
   * 将函数参数转换成数据解析用的java对象，入参函数的返回值为利用cursor解析出来的数据
   *
   * the select column's sort should has the same sort with field converter's idx 
   * how the cursor convert to model object should defined in modelConverter function,
   * such as modelConverter: cursor => { return { fieldName1: cursor.getXX(0), fieldName2: cursor.getXX(1), fieldName3: cursor.getXX(2) } }
   * field's index should has the same sort with select column1, column2, column3 from table
   * or something else you can just return a specific value, such as modelConverter: cursor => cursor.getXX(0)
   *
   * @param {Function} modelConverter cursor => resultObject
   * @returns ModelFromCursorConverter java实例，实现了convert方法，参数为cursor，返回值为转换后的对象
   */
  function cursorModelConverter (modelConverter) {
    return createInterfaceOrJavaAdapter(SQLiteHelper.ModelFromCursorConverter, {
      convert: function (cursor) {
        return modelConverter(cursor)
      }
    })
  }

  /**
   * 创建固定顺序的结果解析器
   *
   * select columns by columnMapping's key sort, and convert to model by columnMapping's value
   * columnMapping = { columnName: [fieldName, parser, converter], ... }
   * converter: (cursor, idx) => cursor.getXX(idx)
   *
   * @param {Object} columnMapping 
   * @returns modelConverter as a function: cursor => resultObject,
   * the resultObject is a object with fieldName as key and cursor.getXX(idx) as value, idx is the columnMapping's key sort
   * eg. SELECT column1, column2, column3 FROM table will convert to { fieldName1: cursor.getXX(0), fieldName2: cursor.getXX(1), fieldName3: cursor.getXX(2) }
   */
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

  /**
   * 将js表结构定义信息转换成实际的java对象
   * 
   * @param {string} tableName 
   * @param {object} columnMapping 
   * @returns ModelIdentify 用于insert和update时将值转换成数据库对应的类型，以及查询时自动构造column列表
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
     * 创建表字段列表，保存列名，字段名和数据转换器
     * 
     * @param {object} columnMapping 键值对 保存 COLUMN_NAME => [fieldName, parser, converter]
     * @returns an array of SQLiteHelper.ColumnField
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

  /**
   * 创建java接口或者类继承的实例
   * 
   * @param {javaClass} clazzOrInterface java类或者接口
   * @param {function} extend 扩展实现的代码{ extendFunctionName: function() { ... } }
   * @returns 
   */
  function createInterfaceOrJavaAdapter (clazzOrInterface, extend) {
    return commonFunctions.createInterfaceOrJavaAdapter(clazzOrInterface, extend)
  }

  function createByES5 (targetDbData) {
    return 'CREATE TABLE ' + targetDbData.tableName + '(' +
      Object.keys(targetDbData.fieldConfig).map(function (key) {
        let { column, type, notNull, primaryKey, autoIncrement, defaultVal } = targetDbData.fieldConfig[key]
        var columnDefinition = column + ' ' + type
        if (primaryKey) {
          columnDefinition += ' PRIMARY KEY'
        }
        if (autoIncrement) {
          columnDefinition += ' AUTOINCREMENT'
        }
        if (notNull) {
          columnDefinition += ' NOT NULL'
        }
        if (defaultVal) {
          columnDefinition += ' DEFAULT ' + defaultVal
        }
        return columnDefinition;
      }).join(',\n') + ')'
  }

  function createByES6 (targetDbData) {
    return `CREATE TABLE ${targetDbData.tableName}(
      ${Object.keys(targetDbData.fieldConfig).map(key => {
      let { column, type, notNull, primaryKey, autoIncrement, defaultVal } = targetDbData.fieldConfig[key]
      return `${column} ${type}${primaryKey ? ' PRIMARY KEY' : ''}${autoIncrement ? ' AUTOINCREMENT' : ''}${notNull ? ' NOT NULL' : ''}${defaultVal ? ' DEFAULT ' + defaultVal : ''}`
    }).join(',\n')}
      )`
  }

  /**
   * 将表字段配置转换成建表语句和对应映射关系数据
   * 
   * @param {Object} targetDbData 表字段配置
   * @returns 
   */
  this.createDbConfig = function (targetDbData) {
    // 旧版本AutoJS不支持字符串模板，脚本无法执行请改为createByES5并删除createByES6 后续版本将懒得支持旧版本
    let tableCreate = createByES6(targetDbData)
    let columnMapping = {}
    Object.keys(targetDbData.fieldConfig).forEach(key => {
      let { column, parser } = targetDbData.fieldConfig[key]
      columnMapping[column] = parser(key)
    })
    return {
      tableName: targetDbData.tableName,
      tableAlters: targetDbData.tableAlters,
      tableCreate: tableCreate,
      columnMapping: columnMapping,
      fieldConfig: targetDbData.fieldConfig,
    }
  }
  /**
   * 构建convert使用
   */
  this.PARSER = {
    String: (fieldName) => {
      return [fieldName, value => new java.lang.String(value), (cursor, idx) => cursor.getString(idx)]
    },
    Integer: (fieldName) => {
      return [fieldName, value => new java.lang.Integer(value), (cursor, idx) => cursor.getInt(idx)]
    },
    Long: (fieldName) => {
      return [fieldName, value => new java.lang.Long(value), (cursor, idx) => cursor.getLong(idx)]
    },
    Double: (fieldName) => {
      return [fieldName, value => new java.lang.Double(value), (cursor, idx) => cursor.getDouble(idx)]
    },
    Date: (fieldName) => {
      return [fieldName, value => value ? formatDate(value) : null, (cursor, idx) => parseDate(cursor.getString(idx))]
    },
    // 其他待补充
  }

  function parseDate (dateStr) {
    let regex = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.(\d{1,3}))?/
    let result = regex.exec(dateStr)
    return new Date(result[1], parseInt(result[2]) - 1, result[3], result[4], result[5], result[6])
  }
  /**
   * 针对指定表创建dao对象，实现基础的增删改查功能
   *
   * @param {String} tableName 表名
   * @returns 
   */
  this.createDao = function (tableName) {
    return new BaseDao(tableName)
  }


  /**
   * 基础数据库操作 包含增删改查
   *
   * @param {String} tableName 
   */
  function BaseDao (tableName) {
    let sqliteUtil = _this
    /**
     * 列出所有数据
     * 
     * @returns 
     */
    this.list = function () {
      return sqliteUtil.query(tableName, '', [])
    }

    /**
     * 根据条件查询数据
     * 
     * @param {String} whereCaulse 
     * @param {List} params 
     * @returns 
     */
    this.query = function (whereCaulse, params) {
      return sqliteUtil.query(tableName, whereCaulse, params)
    }

    /**
     * 根据条件查询数量
     * 
     * @param {String} whereCaulse 
     * @param {List} params 
     * @returns 
     */
    this.count = function (whereCaulse, params) {
      return sqliteUtil.count(tableName, whereCaulse, params)
    }

    /**
     * 插入数据
     * 
     * @param {Object} data 
     * @returns 
     */
    this.insert = function (data) {
      data.createTime = new Date()
      data.modifyTime = new Date()
      return sqliteUtil.insert(tableName, data)
    }

    /**
     * 根据id更新数据
     * 
     * @param {Number} id 
     * @param {Object} data 
     * @returns 
     */
    this.updateById = function (id, data) {
      delete data.createTime
      data.modifyTime = new Date()
      return sqliteUtil.updateById(tableName, id, data)
    }

    /**
     * 根据id删除数据
     * 
     * @param {Number} id 
     * @returns 
     */
    this.deleteById = function (id) {
      return sqliteUtil.deleteById(tableName, id)
    }

    /**
     * 根据条件查询一条数据
     * 
     * @param {String} whereCaulse 
     * @param {List} params 
     * @returns 
     */
    this.selectOne = function (whereCaulse, params) {
      let list = sqliteUtil.query(tableName, whereCaulse + ' LIMIT 1', params)
      if (list && list.length > 0) {
        return list[0]
      }
      return null
    }

    this.selectById = function (id) {
      return sqliteUtil.selectById(tableName, id)
    }
  }

}
