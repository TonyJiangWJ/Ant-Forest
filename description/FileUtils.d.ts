declare module FileUtils {
  /**
   * 获取main.js所在路径
   *
   * @param parentDirOnly 只显示文件夹目录
   */
  declare function getRealMainScriptPath(parentDirOnly: boolean): String
  /**
   * 获取main.js所在文件夹
   */
  declare function getCurrentWorkPath(): String
  /**
   * 按行读取最后N行数据
   *
   * @param {string} fileName 文件路径 支持相对路径
   * @param {number} num 读取的行数
   * @param {number} startReadIndex 当前读取偏移量
   * @param {function} filter (line) => check(line) 过滤内容
   * @returns { result: 行数据列表, readIndex: 当前读取偏移量, total: 文件总大小, filePath: 文件路径 }
   */
  function readLastLines(
    fileName: String,
    num: number,
    startReadIndex: number,
    filter: function
  ): Object
  /**
   * 按行读取前N行数据
   *
   * @param {string} fileName 文件路径 支持相对路径
   * @param {number} num 读取的行数
   * @param {number} startReadIndex 当前读取偏移量
   * @param {function} filter (line) => check(line) 过滤内容
   * @returns { result: 行数据列表, readIndex: 当前读取偏移量, total: 文件总大小, filePath: 文件路径 }
   */
  function readForwardLines(
    fileName: String,
    num: number,
    startReadIndex: number,
    filter: function
  ): Object

  /**
   * 列出文件夹下的所有文件
   * 
   * @param {string} path 文件路径 支持相对路径
   * @param {function} filter (file) => check(line) 过滤文件 参数为File
   * @returns { resultList: 文件列表, path: 当前路径 }
   */
  function listDirs(path: String, filter: function): Object
}
