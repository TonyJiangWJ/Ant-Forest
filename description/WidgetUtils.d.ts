declare module WidgetUtils {
    /**
   * 根据内容获取一个对象
   * 
   * @param {string} contentVal 
   * @param {number} timeout 
   * @param {boolean} containType 是否带回类型
   * @param {boolean} suspendWarning 是否隐藏warning信息
   */
  function widgetGetOne(contentVal, timeout, containType, suspendWarning): Object
}