runtime.loadDex('../lib/autojs-common.dex')
importClass(com.tony.autojs.sqlite.SQLiteHelper)
importClass(java.util.ArrayList)
importClass(java.util.Arrays)
importClass(java.util.HashMap)
let filePath = files.cwd() + '/testTable.db'

let TEST_TABLE = {
  tableName: 'TEST_TABLE',
  tableCreate: `
  CREATE TABLE TEST_TABLE (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    CUST_NAME VARCHAR(32) NULL,
    AGE INTEGER NULL,
    CREATE_TIME BIGINT NOT NULL,
    MODIFY_TIME BIGINT NOT NULL
  )
  `,
  resultMapping: {
    ID: {
      fieldName: 'id',
      convert: value => new java.lang.Integer(value)
    },
    CUST_NAME: {
      fieldName: 'custName',
      convert: value => value
    },
    AGE: {
      fieldName: 'age',
      convert: value => new java.lang.Integer(value)
    },
    CREATE_TIME: {
      fieldName: 'createTime',
      convert: value => new java.lang.Long(value.getTime())
    },
    MODIFY_TIME: {
      fieldName: 'modifyTime',
      convert: value => new java.lang.Long(value.getTime())
    },
  },
  modelConverter: function (cursor) {
    return {
      id: cursor.getInt(0),
      custName: cursor.getString(1),
      age: cursor.getInt(2),
      createTime: new Date(cursor.getLong(3)),
      modifyTime: new Date(cursor.getLong(4)),
    }
  }
}

let tableIdentify = new SQLiteHelper.ModelIdentify({
  getValueByKey: function (fieldName, object) {
    let value = object[fieldName]
    if (typeof value === 'undefined' || value === null) {
      return null
    }
    return value
  }
})
tableIdentify.setTableName(TEST_TABLE.tableName)
tableIdentify.setColumnFields(convertResultMapping(TEST_TABLE.resultMapping))

let fullColumnConverter = new SQLiteHelper.ModelFromCursorConverter({
  convert: function (cursor) {
    return {
      id: cursor.getInt(0),
      custName: cursor.getString(1),
      age: cursor.getInt(2),
      createTime: new Date(cursor.getLong(3)),
      modifyTime: new Date(cursor.getLong(4)),
    }
  }
})

let sqliteHelper = new SQLiteHelper(filePath, Arrays.asList(TEST_TABLE.tableCreate), null, 1, context)
let id = sqliteHelper.insert(TEST_TABLE.tableName, convertJSONToMap({
  custName: '客户1',
  age: 18,
  createTime: new Date(),
  modifyTime: new Date()
}))
console.info('插入数据完成 id：', id)

let result = sqliteHelper.updateById(TEST_TABLE.tableName, '1', convertJSONToMap({
  custName: '测试更新客户名',
  age: 20
}))
console.info('更新数据完成 result:', result)

let id2 = sqliteHelper.insertWithModel(tableIdentify, {
  custName: '客户2',
  age: 18,
  createTime: new Date(),
  modifyTime: new Date()
})
console.info('插入数据完成 id：', id2)

let result2 = sqliteHelper.updateByIdWithModel(tableIdentify, '2', {
  custName: '测试更新客户名2',
  age: 22
})
console.info('更新数据完成 result:', result2)

let data2 = sqliteHelper.selectById(tableIdentify, '2', fullColumnConverter)
console.info('data2:', JSON.stringify(data2))


let allData = runtime.bridges.bridges.toArray(sqliteHelper.rawQueryWithModel('SELECT ID,CUST_NAME,AGE,CREATE_TIME,MODIFY_TIME FROM TEST_TABLE WHERE ID > ? LIMIT 0, 10', ["1"], fullColumnConverter))
console.info('全部数据：', JSON.stringify(allData))

let countColumnConverter = new SQLiteHelper.ModelFromCursorConverter({
  convert: function (cursor) {
    return parseInt(cursor.getLong(0))
  }
})
let count = sqliteHelper.rawQueryWithModel('SELECT COUNT(*) FROM TEST_TABLE', null, countColumnConverter)
console.info('当前总数量：', count && count.length > 0 ? count[0] : 0)

let deleteResult = sqliteHelper.deleteById(tableIdentify.tableName, id2)
console.info('删除id:', id2, '结果', deleteResult)

function convertJSONToMap (obj) {
  let paramsMap = new HashMap()
  Object.keys(TEST_TABLE.resultMapping).forEach(columnName => {
    let fieldInfo = TEST_TABLE.resultMapping[columnName]
    let value = obj[fieldInfo.fieldName]
    if (typeof value !== 'undefined' && value != null) {
      paramsMap.put(columnName, fieldInfo.convert(value))
    }
  })
  return paramsMap
}

function convertResultMapping (resultMapping) {
  let columnFields = new ArrayList()
  Object.keys(resultMapping).forEach(columnName => {
    let columnInfo = resultMapping[columnName]
    let columnField = new SQLiteHelper.ColumnField(columnName, columnInfo.fieldName, new JavaAdapter(SQLiteHelper.DataAdapter, {
      convert: function (value) {
        return columnInfo.convert(value)
      }
    }))
    columnFields.add(columnField)
  })
  return columnFields
}