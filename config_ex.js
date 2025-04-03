
let is_pro = !!Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
let commonDefaultConfig = {
  is_pro: is_pro,
  // 开启websocket实时监控
  enable_websocket_hijack: false,
  // 记录解锁设备标志
  unlock_device_flag: 'normal',
  // 解锁密码
  password: '',
  // 是否无限尝试解锁，默认false，解锁失败三次直接退出执行
  infinite_retry_unlock: false,
  // 静音执行
  mute_exec: false,
  // 当等待时是否释放截图权限
  release_screen_capture_when_waiting: false,
  // 是否不设置自动启动
  not_setup_auto_start: false,
  disable_all_auto_start: false,
  // 解锁控件查找超时时间
  timeout_unlock: 1000,
  // 查找控件默认超时时间
  timeout_findOne: 1000,
  // 校验控件是否存在的默认超时时间
  timeout_existing: 8000,
  // 异步等待截图，当截图超时后重新获取截图 默认开启
  async_waiting_capture: true,
  // 异步截图等待超时时间
  capture_waiting_time: 500,
  // 截图最小间隔时间 避免连续截图失败 默认10ms
  capture_screen_gap: 10,
  // 显示调试日志
  show_debug_log: true,
  // 调试日志中是否显示引擎ID
  show_engine_id: false,
  // 日志保留天数
  log_saved_days: 3,
  // 开发模式
  develop_mode: false,
  // 开发保存模式 是否保存一些开发用的数据
  develop_saving_mode: false,
  // 是否保存YOLO训练用的图片数据
  save_yolo_train_data: false,
  // 是否开启YOLO识别
  detect_by_yolo: false,
  // 解锁时是否校验设备姿态
  check_device_posture: false,
  // 是否同时校验距离传感器
  check_distance: false,
  // 姿态z轴加速度阈值
  posture_threshold_z: 6,
  // 电量保护，低于该值延迟60分钟执行脚本
  battery_keep_threshold: 20,
  // 开发用开关，截图并保存一些图片
  auto_lock: device.sdkInt >= 28,
  // 自动锁屏时下拉状态栏工具中锁屏按钮位置
  lock_x: 150,
  lock_y: 970,
  // 设备宽高
  device_width: device.width,
  device_height: device.height,
  // 是否根据当前锁屏状态来设置屏幕亮度，当锁屏状态下启动时 设置为最低亮度，结束后设置成自动亮度
  auto_set_brightness: false,
  // 锁屏启动关闭提示框
  dismiss_dialog_if_locked: true,
  // 佛系模式 亮屏时自动设置5分钟的倒计时任务
  buddha_like_mode: false,
  // 是否自动允许截图权限
  request_capture_permission: true,
  // 自动允许时，查找的按钮控件文本
  capture_permission_button: 'START NOW|立即开始|允许',
  // 是否保存日志文件，如果设置为保存，则日志文件会按时间分片备份在logback/文件夹下
  save_log_file: true,
  // 异步写入日志文件
  async_save_log_file: true,
  // 默认单日志文件大小单位kb
  back_size: '100',
  // 控制台最大日志长度，仅免费版有用
  console_log_maximum_size: 1500,
  // 是否开启通话状态监听
  enable_call_state_control: false,
  // 单脚本模式 是否只运行一个脚本 不会同时使用其他的 开启单脚本模式 会取消任务队列的功能。
  // 比如同时使用蚂蚁庄园 则保持默认 false 否则设置为true 无视其他运行中的脚本
  single_script: false,
  // 滑动起始底部高度
  bottomHeight: 200,
  // 是否使用模拟的滑动，如果滑动有问题开启这个 当前默认关闭 经常有人手机上有虚拟按键 然后又不看文档注释的
  useCustomScrollDown: false,
  // 排行榜列表下滑速度 200毫秒 不要太低否则滑动不生效 仅仅针对useCustomScrollDown=true的情况
  scrollDownSpeed: 200,
  // 延迟启动时延 5秒 悬浮窗中进行的倒计时时间
  delayStartTime: 5,
  // 本地ocr优先级
  local_ocr_priority: 'auto',
  // 是否自动设置状态栏高度
  auto_set_bang_offset: true,
  // 当前状态栏偏移量
  bang_offset: 0,
  // 视频app，当前app前台时先退出到桌面再打开支付宝 避免小窗执行
  video_packages: [{ packageName: 'tv.danmaku.bili', appName: '哔哩哔哩' }],
  // 当以下包正在前台运行时，延迟执行
  skip_running_packages: [],
  // 默认情况下包名相同且重复多次时才提醒，开启后连续白名单跳过三次即提醒
  warn_skipped_ignore_package: false,
  // 当白名单跳过多次时 是否提示
  warn_skipped_too_much: false,
  // 开启可视化工具
  enable_visual_helper: false,
  // 当AutoJS崩溃时是否自动重启
  auto_restart_when_crashed: true,
  // 是否校验版本更新
  auto_check_update: true,
  // 设置无障碍权限时开启其他的无障碍权限
  other_accessisibility_services: '',
  // 不需要执行resolver
  noneed_resolve_dex: false,
  // 标记是否清除webview缓存
  clear_webview_cache: false,
  // 配置界面webview打印日志
  webview_loging: false,
  // 论坛地址
  forum_url: 'https://autoscripts.flarum.cloud/',
  // 是否在脚本执行完毕后发送通知
  show_summary_notice: true,
  // 使用手势杀死APP
  killAppWithGesture: true,
}


module.exports = (default_config, CONFIG_STORAGE_NAME, PROJECT_NAME) => {
  let config = {}
  let currentEngine = engines.myEngine().getSource() + ''
  let isRunningMode = currentEngine.endsWith('/config.js') && typeof module === 'undefined'
  // 文件更新后直接生效，不使用缓存的值
  let no_cache_configs = ['release_access_token', 'code_version']
  let securityFields = ['password', 'alipay_lock_password']
  let objFields = []
  let storageConfig = storages.create(CONFIG_STORAGE_NAME)
  let AesUtil = require('./lib/AesUtil.js')
  let aesKey = device.getAndroidId()

  // 复制公共配置
  Object.assign(default_config, commonDefaultConfig)
  Object.keys(default_config).forEach(key => {
    let storedVal = storageConfig.get(key)
    if (typeof storedVal !== 'undefined' && no_cache_configs.indexOf(key) < 0) {
      config[key] = getConfigValue(storedVal, key)
    } else {
      config[key] = default_config[key]
    }
  })


  config.scaleRate = (() => {
    let width = config.device_width
    if (width >= 1440) {
      return 1440 / 1080
    } else if (width < 1000) {
      return 720 / 1080
    } else {
      if (config.device_width * config.device_height > 3000000) {
        // K50U 1.5k屏幕
        return config.device_width / 1080
      }
      return 1
    }
  })()

  // 覆写配置信息
  config.overwrite = (key, value) => {
    let storage_name = CONFIG_STORAGE_NAME
    let config_key = key
    if (key.indexOf('.') > -1) {
      let keyPair = key.split('.')
      storage_name = CONFIG_STORAGE_NAME + '_' + keyPair[0]
      key = keyPair[1]
      config_key = keyPair[0] + '_config'
      if (!config.hasOwnProperty(config_key) || !config[config_key].hasOwnProperty(key)) {
        return
      }
      config[config_key][key] = value
    } else {
      if (!config.hasOwnProperty(config_key)) {
        return
      }
      config[config_key] = value
    }
    console.verbose('覆写配置', storage_name, key)
    storages.create(storage_name).put(key, value)
  }

  config.persistCurrentScriptInfo = () => {
    let PUB_INFO_STORAGE = storages.create('PUB_INFO_STORAGE')
    let allStorage = PUB_INFO_STORAGE.get("all_storage") || []
    if (!allStorage.find(v => v.key == CONFIG_STORAGE_NAME)) {
      allStorage.push({ key: CONFIG_STORAGE_NAME, value: PROJECT_NAME })
      PUB_INFO_STORAGE.put("all_storage", allStorage)
      console.info('保存当前脚本配置信息', CONFIG_STORAGE_NAME, PROJECT_NAME)
    }
  }
  config.persistCurrentScriptInfo()

  config.getAllStorages = () => {
    let PUB_INFO_STORAGE = storages.create('PUB_INFO_STORAGE')
    return PUB_INFO_STORAGE.get("all_storage")
  }

  config.syncConfig = (key, syncFunc) => {
    let storage_name = CONFIG_STORAGE_NAME
    allStorage = config.getAllStorages()
    let otherStorageKeys = allStorage.filter(v => v.key != CONFIG_STORAGE_NAME)
    if (otherStorageKeys.length <= 0) {
      return
    }
    let otherStorageValues = otherStorageKeys.map((storageInfo) => {
      let storageKey = storageInfo.key
      let storageDesc = storageInfo.value
      if (key.indexOf('.') > -1) {
        let keyPair = key.split('.')
        storage_name = storageKey + '_' + keyPair[0]
        key = keyPair[1]
        return { storageKey, storageDesc, value: storages.create(storage_name).get(key) }
      }
      return { storageKey, storageDesc, value: storages.create(storageKey).get(key) }
    })
    syncFunc(otherStorageValues)
  }



  /**
   * 脚本更新后自动恢复一些不太稳定的配置
   */
  config.resetConfigsIfNeeded = function (resetFlag, resetFields) {
    if (config[resetFlag]) {
      resetFields.forEach(key => {
        config[key] = default_config[key]
        storageConfig.put(key, default_config[key])
      })
      storageConfig.put(resetFlag, false)
    }
  }

  config.prepareImageConfig = function (imageFields) {
    if (!imageFields || imageFields.length <= 0) {
      return
    }
    // 扩展配置
    let workpath = getCurrentWorkPath()
    let configDataPath = workpath + '/config_data/'
    let default_image_config = {};
    imageFields.forEach(key => {
      if (!files.exists(configDataPath + key + '.data')) {
        default_image_config[key] = ''
        return
      }
      default_image_config[key] = files.read(configDataPath + key + '.data')
    })
    default_config.image_config = default_image_config
    config.image_config = convertDefaultData(default_image_config, CONFIG_STORAGE_NAME + '_image')
  }

  config.exportIfNeeded = function (_module, dataChangeCallback) {
    if (!isRunningMode) {
      _module.exports = function (__runtime__, scope) {
        if (typeof scope.config_instance === 'undefined') {
          console.verbose('config未实例化，准备实例化config.js')

          scope.config_instance = {
            config: config,
            default_config: default_config,
            storage_name: CONFIG_STORAGE_NAME,
            securityFields: securityFields,
            project_name: PROJECT_NAME
          }
          config.subscribe_changes = function () {
            if (config._subscribed) {
              retrun
            }
            // 运行main.js时监听配置是否变更 实现动态更新配置
            let processShare = require('./lib/prototype/ProcessShare.js')
            processShare
              // 设置缓冲区大小为2MB
              .setBufferSize(2048 * 1024)
              .loop().setInterval(scope.subscribe_interval).subscribe(function (newConfigInfos) {
                try {
                  newConfigInfos = JSON.parse(newConfigInfos)
                  Object.keys(newConfigInfos).forEach(key => {
                    scope.config_instance.config[key] = getConfigValue(newConfigInfos[key], key)
                    typeof dataChangeCallback == 'function' && dataChangeCallback(key, scope.config_instance.config[key])
                  })
                  if (scope.subscribe_callback) {
                    scope.subscribe_callback(scope.config_instance.config)
                  }
                } catch (e) {
                  console.error('接收到config变更消息，但是处理发生异常', newConfigInfos, e)
                }
              }, -1, scope.subscribe_file_name || '.configShare')
            config._subscribed = true
          }
        }
        return scope.config_instance
      }
    } else {
      toastLog('可视化配置工具已经迁移，下次请直接运行`可视化配置.js`, 三秒后将自动启动')
      setTimeout(function () {
        engines.execScriptFile(files.cwd() + "/可视化配置.js", { path: files.cwd() })
      }, 3000)
    }
  }

  return config

  function convertDefaultData (default_config, config_storage_name) {
    let config_storage = storages.create(config_storage_name)
    let configData = {}
    Object.keys(default_config).forEach(key => {
      configData[key] = config_storage.get(key, default_config[key])
    })
    return configData
  }
  function resetImgDefault (default_config, config_storage_name) {
    let config_storage = storages.create(config_storage_name)
    let configData = {}
    Object.keys(default_config).forEach(key => {
      configData[key] = default_config[key]
      config_storage.put(key, default_config[key])
    })
    return configData
  }

  function getCurrentWorkPath () {
    let currentPath = files.cwd()
    if (files.exists(currentPath + '/main.js')) {
      return currentPath
    }
    let paths = currentPath.split('/')

    do {
      paths = paths.slice(0, paths.length - 1)
      currentPath = paths.reduce((a, b) => a += '/' + b)
    } while (!files.exists(currentPath + '/main.js') && paths.length > 0)
    if (paths.length > 0) {
      return currentPath
    }
  }

  function getConfigValue (configValue, key) {
    if (securityFields.indexOf(key) > -1) {
      try {
        configValue = AesUtil.decrypt(configValue, aesKey) || configValue
        if (objFields.indexOf(key) > -1) {
          configValue = JSON.parse(configValue)
        }
      } catch (e) {
        console.error('解密字段失败：', key)
      }
    }
    return configValue
  }


}
