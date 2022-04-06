let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let sqliteUtil = singletonRequire('SQLiteUtil')
let filePath = files.cwd() + '/testTable.db'

let TEST_TABLE = {
  tableName: 'TEST_TABLE',
  // 定义建表语句
  tableCreate: `
  CREATE TABLE TEST_TABLE (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    CUST_NAME VARCHAR(32) NULL,
    AGE INTEGER NULL,
    CREATE_TIME BIGINT NOT NULL,
    MODIFY_TIME BIGINT NOT NULL
  )
  `,
  // 初始化时的更新语句，因为建表语句只会执行一条，可以将创建索引的放到alters中
  tableAlters: [
    'ALTER TABLE TEST_TABLE ADD COLUMN SEX VARCHAR(2)',
    'create index idx_cust_name on TEST_TABLE (CUST_NAME)'
  ],
  // 定义参数和表字段的映射关系 以及JS类型转Java
  columnMapping: {
    ID: ['id', value => new java.lang.Integer(parseInt(value))],
    CUST_NAME: ['custName', value => value],
    AGE: ['age', value => new java.lang.Integer(parseInt(value))],
    SEX: ['sex', value => value],
    CREATE_TIME: ['createTime', value => new java.lang.Long(value.getTime())],
    MODIFY_TIME: ['modifyTime', value => new java.lang.Long(value.getTime())],
  },
  // 定义查询结果cursor到JS对象的转换 字段顺序和columnMapping匹配
  modelConverter: function (cursor) {
    return {
      id: cursor.getInt(0),
      custName: cursor.getString(1),
      age: cursor.getInt(2),
      sex: cursor.getString(3),
      // 日期使用时间戳保存
      createTime: new Date(cursor.getLong(4)),
      modifyTime: new Date(cursor.getLong(5)),
    }
  }
}

let ENERGY_COLLECT_DATA = {
  tableName: 'ENERGY_COLLECT_DATA',
  tableCreate: `
  create table ENERGY_COLLECT_DATA (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    FRIEND_NAME VARCHAR(32) NOT NULL,
    COLLECT_ENERGY INTEGER NOT NULL DEFAULT 0,
    WATER_ENERGY INTEGER NULL DEFAULT 0,
    COLLECT_DATE VARCHAR(16) NOT NULL,
    CREATE_TIME BIGINT NULL
  )
  `,
  tableAlters: [
    'create index idx_date_friend on ENERGY_COLLECT_DATA(COLLECT_DATE,FRIEND_NAME)'
  ],
  columnMapping: {
    ID: ['id', id => new java.lang.Integer(parseInt(id))],
    FRIEND_NAME: ['friendName', value => value],
    COLLECT_ENERGY: ['collectEnergy', value => new java.lang.Integer(parseInt(value))],
    WATER_ENERGY: ['waterEnergy', value => new java.lang.Integer(parseInt(value))],
    COLLECT_DATE: ['collectDate', value => value],
    CREATE_TIME: ['createTime', value => value ? value.getTime() : null],
  },
  modelConverter: function (cursor) {
    return {
      id: parseInt(cursor.getInt(0)),
      friendName: cursor.getString(1),
      collectEnergy: cursor.getInt(2),
      waterEnergy: cursor.getInt(3),
      collectDate: cursor.getString(4),
      createTime: new Date(cursor.getLong(5)),
    }
  }
}

// 初始化数据库
sqliteUtil.initDbTables(filePath, [TEST_TABLE, ENERGY_COLLECT_DATA], 1)

// 插入
let id = sqliteUtil.insert(TEST_TABLE.tableName, {
  custName: '测试插入名称',
  age: 19,
  sex: '男',
  createTime: new Date(),
  modifyTime: new Date()
})

// 根据id获取数据
let recordResult = sqliteUtil.selectById(TEST_TABLE.tableName, id)
console.log('查询数据内容 id:',id, ' 对象：', JSON.stringify(recordResult))

// 更新
console.log('更新结果', sqliteUtil.updateById(TEST_TABLE.tableName, id, {
  custName: '测试修改名称',
  sex: '女',
  age: 20
}))

// 查询总数 无参数
console.log('总记录数：', sqliteUtil.count(TEST_TABLE.tableName, null, null))

// 查询所有结果
let listResult = sqliteUtil.query(TEST_TABLE.tableName, null, null)
console.log('总结果数：', listResult.length, ' 结果集：', JSON.stringify(listResult))

// 删除
console.log('删除结果', sqliteUtil.deleteById(TEST_TABLE.tableName, id))

// 查询总数 无参数
console.log('删除后总记录数：', sqliteUtil.count(TEST_TABLE.tableName, null, null))

// 查询所有结果
listResult = sqliteUtil.query(TEST_TABLE.tableName, null, null)
console.log('删除后总结果数：', listResult.length, ' 结果集：', JSON.stringify(listResult))
