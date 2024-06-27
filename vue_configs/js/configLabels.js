const CONFIG_LABELS = {
  about: {
    version: '版本',
    qq_group: 'QQ交流群',
  },
  accountManage: {
    enable_multi_account: '是否启用多账号切换',
    main_account: '当前主账号',
    watering_main_account: '小号收集完成后对大号浇水',
    to_main_by_user_id: '使用userid跳转大号',
    main_userid: '主账号USERID',
    watering_main_at: '大号浇水时机',
  },
  waterBack: {
    wateringBack: '是否浇水回馈',
    wateringThreshold: '浇水阈值',
    targetWateringAmount: '浇水回馈数量',
    wateringBlackList: '浇水数量',
  },
  regionConfig: {
    
  }
}

const PAGES = Object.keys(CONFIG_LABELS)

function getLabelByConfigKey(key) {
  for (let page of PAGES) {
    if (CONFIG_LABELS[page][key]) {
      return CONFIG_LABELS[page][key]
    }
  }
  return key
}

/**
 * getLabelByConfigKey 简化写法
 * @param {String} key 
 * @returns 
 */
function $t(key) {
  return getLabelByConfigKey(key)
}