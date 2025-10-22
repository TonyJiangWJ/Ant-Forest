/**
 * 挂起所有脚本
 * powered by qwen3-coder
 * optimized by TonyJiangWJ
 */
importClass(java.io.StringWriter)
importClass(java.io.StringReader)
importClass(java.io.PrintWriter)
importClass(java.io.BufferedReader)
importClass(java.lang.StringBuilder)
importClass(android.content.Intent)
importClass(android.view.View)
importClass('org.autojs.autojs.timing.TaskReceiver')
importClass(android.animation.ValueAnimator);
importClass(android.animation.TimeInterpolator);

let currentEngine = engines.myEngine()
let runningEngines = engines.all()
let runningSize = runningEngines.length
let currentSource = currentEngine.getSource() + ''
if (runningSize > 1) {
  runningEngines.forEach(compareEngine => {
    let compareSource = compareEngine.getSource() + ''
    if (currentEngine.id !== compareEngine.id && compareSource === currentSource) {
      // 强制关闭同名的脚本
      compareEngine.forceStop()
    }
  })
}

let { config, storage_name: _storage_name } = require('../config.js')(runtime, global)
let sRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let formatDate = require('../lib/DateUtil.js')
config.save_log_file = false
config.async_save_log_file = false
let commonFunction = sRequire('CommonFunction')
let logUtils = sRequire('LogUtils')
let runningQueueDispatcher = sRequire('RunningQueueDispatcher')
let NotificationHelper = sRequire('Notification')

// 插队运行
runningQueueDispatcher.addRunningTask(true)

// 标记是否停止线程
let stop = false
// 固定通知ID
const NOTICE_ID = 1111

// --- 新增变量：时间管理 ---
let suspendStartTime = new Date(); // 记录挂起开始时间
let countdownEndTime = null;       // 记录倒计时结束时间
// --- 悬浮窗相关变量 ---
let floatyBtn = null; // 主按钮悬浮窗
let waitListMenu = null; // 菜单悬浮窗
let isMenuOpen = false; // 菜单状态
let noMoreAskHide = false // 不再询问是否关闭悬浮窗
let downX, downY, moving = false; // 拖动相关变量
let floatyReady = false; // 标记悬浮窗是否完全初始化

// --- 数据相关变量 ---
// 循环次数 控制数据刷新频率 在刚启动或者点击了悬浮窗后 提高刷新率 时间长了之后降低
let loopTime = 0
// 等待队列
let waitList = []
// 固定的菜单按钮
const FIXED_ITEM_LIST = [ // 使用常量
  {
    color: "#4CAF50", // 绿色，区分时间信息
    text: "挂起开始时间: " + formatDate(suspendStartTime, 'HH:mm:ss'),
    name: 'startTime'
  },
  {
    color: "#40d2ff",
    text: "当前等待中任务数：0",
    name: 'waitCount'
  },

  {
    color: "#FF9800", // 橙色，区分倒计时设置
    text: "设置倒计时退出",
    name: 'setCountdown'
  },
  {
    color: "#FF4081",
    text: "结束挂起",
    name: 'exit'
  },
  {
    color: "#ffdf40",
    text: "关闭悬浮窗", // 修改文本
    name: 'hide'
  }
]

// 缓存上次数据，避免重复更新
let lastWaitingQueueStr = ''
let lastDataSource = null

commonFunction.registerOnEngineRemoved(function () {
  runningQueueDispatcher.removeRunningTask()
  NotificationHelper.cancelNotice(NOTICE_ID)
  stop = true
  // 脚本退出时清理可能存在的监听器
  try {
    events.removeAllKeyDownListeners("volume_down")
  } catch (e) { }
})

NotificationHelper.createNotification('当前等待中任务数：0', '当前无任务等待执行中', NOTICE_ID)

// 生成圆形背景
function createCircleDrawable (color) {
  let drawable = new android.graphics.drawable.GradientDrawable();
  drawable.setShape(android.graphics.drawable.GradientDrawable.OVAL);
  drawable.setColor(android.graphics.Color.parseColor(color));
  return drawable;
}

// 创建悬浮窗
function createFloatyWindows () {
  loopTime = 0
  floatyReady = false; // 重置准备状态
  // 创建主按钮悬浮窗
  floatyBtn = floaty.rawWindow(
    <frame
      visibility="gone"
      id="out_container"
      w="41dp" h="41dp"
      bg="#FFFFFF"
      alpha="0.8"
      padding="5dp">
      <frame id="bg" w="30dp" h="30dp" bg="#FF4081">
        <text id="waitCount" textSize="20sp" textColor="#FFFFFF"
          text="0" gravity="center" />
      </frame>
    </frame>
  );
  // 创建菜单悬浮窗
  waitListMenu = floaty.rawWindow(
    <vertical id="menu" w="auto" h="auto" visibility="gone">
      <grid id="grid" spanCount="1" padding="12dp">
        <card cardCornerRadius="8dp" cardElevation="2dp" layout_height="35dp"
          margin="2dp" cardBackgroundColor="{{this.color}}">
          <text text="{{this.text}}" textSize="12sp"
            textColor="#FFFFFF" gravity="center" />
        </card>
      </grid>
    </vertical>
  );
  // 绑定事件
  bindFloatyEvents();
  // 设置样式和初始位置
  ui.post(() => {
    if (!floatyBtn || !waitListMenu) return; // 防止在关闭过程中调用
    try {
      let bg = createCircleDrawable("#ff5500");
      floatyBtn.bg.setBackgroundDrawable(bg);
      let outBg = createCircleDrawable("#ffffff")
      floatyBtn.out_container.setBackgroundDrawable(outBg);
      floatyBtn.setPosition(-0.2 * floatyBtn.getWidth(), 300); // 初始位置
      setTimeout(() => {
        if (floatyBtn && floatyBtn.out_container) {
          floatyBtn.out_container.attr("visibility", "visible")
        }
      }, 50);
      // 初始化菜单数据
      waitListMenu.grid.setDataSource(FIXED_ITEM_LIST.map(item => ({ // 使用常量
        text: item.text,
        color: item.color,
        name: item.name
      })));
      floatyReady = true; // 标记悬浮窗已准备就绪
      // 悬浮窗创建完成后立即更新一次UI
      postUiUpdate();
    } catch (e) {
      logUtils.errorInfo("初始化悬浮窗UI时出错: " + e);
      // 如果初始化失败，尝试关闭
      closeFloatyWindows();
      startVolumeKeyListener(); // 启动监听以便重新打开
    }
  });
}

// 集中处理悬浮窗关闭逻辑
function closeFloatyWindows () {
  try {
    if (floatyBtn) {
      floatyBtn.close();
      floatyBtn = null;
    }
    if (waitListMenu) {
      waitListMenu.close();
      waitListMenu = null;
    }
    floatyReady = false;
    lastDataSource = null; // 清空数据源缓存
  } catch (e) {
    logUtils.errorInfo("关闭悬浮窗时出错: " + e);
  }
}

// 绑定悬浮窗事件
function bindFloatyEvents () {
  if (!floatyBtn || !waitListMenu) return;
  // 菜单点击操作
  floatyBtn.bg.on("click", () => {
    // 菜单点击 提高刷新率
    loopTime = 0
    if (!isMenuOpen) openMenu();
    else closeMenu();
  });
  // 主按钮触摸：拖动
  floatyBtn.bg.setOnTouchListener(function (view, event) {
    if (!floatyBtn) return true; // 防止空指针
    switch (event.getAction()) {
      case event.ACTION_DOWN:
        downX = event.getRawX();
        downY = event.getRawY();
        moving = false;
        return true;
      case event.ACTION_MOVE:
        let dx = event.getRawX() - downX;
        let dy = event.getRawY() - downY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          moving = true;
          floatyBtn.setPosition(floatyBtn.getX() + dx, floatyBtn.getY() + dy);
          downX = event.getRawX();
          downY = event.getRawY();
        }
        return true;
      case event.ACTION_UP:
        if (!moving && floatyBtn) view.performClick();
        // --- 多次弹跳动画 (使用 ValueAnimator 和自定义逻辑) ---
        if (floatyBtn) {
          // 获取当前 X 坐标
          let startX = floatyBtn.getX();
          // 计算目标贴边 X 坐标 (中心点)
          let targetEdgeX = startX < device.width / 2 ?
            -0.2 * floatyBtn.getWidth() :
            device.width - 0.8 * floatyBtn.getWidth();

          // 计算初始偏移量 (从起始点到目标点的距离)
          let initialOffset = Math.min(200, startX - targetEdgeX);

          // 创建 ValueAnimator，动画时长从 0 到 1 (代表动画进度)
          let animator = ValueAnimator.ofFloat([0, 1]);
          let totalDuration = 300; // 总动画时长 (毫秒)，可以调整
          animator.setDuration(totalDuration);

          // 添加更新监听器，实现弹跳逻辑
          animator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener({
            onAnimationUpdate: function (animation) {
              // 获取当前动画进度 (0.0 到 1.0)
              let progress = animation.getAnimatedFraction();

              // --- 自定义弹跳衰减逻辑 ---
              // 1. 振幅随时间指数衰减
              // 2. 频率可以固定或随时间略微变化
              let amplitude = initialOffset * Math.pow(0.1, progress); // 0.1 是衰减因子，越小衰减越快
              // 3. 使用正弦函数模拟振荡
              let frequency = 3; // 弹跳次数，可以调整
              let oscillation = Math.sin(progress * Math.PI * frequency); // PI * frequency 控制弹跳周期

              // 4. 计算当前帧的 X 偏移量
              let currentOffset = amplitude * oscillation;

              // 5. 计算并设置悬浮窗的最终 X 坐标
              let newX = targetEdgeX + currentOffset;
              // 在动画更新时，手动设置悬浮窗的新 X 坐标
              if (floatyBtn) { // 再次检查 floatyBtn 是否仍然存在
                floatyBtn.setPosition(newX, floatyBtn.getY());
              }
            }
          }));

          // 可选：添加动画结束监听器，确保最终位置精确
          animator.addListener(new android.animation.AnimatorListenerAdapter({
            onAnimationEnd: function (animation) {
              if (floatyBtn) {
                floatyBtn.setPosition(targetEdgeX, floatyBtn.getY()); // 确保最终停在目标位置
                // log("Animation ended, final position set.");
              }
            }
          }));

          // 启动动画
          animator.start();
        }
        // --- 多次弹跳动画结束 ---
        return true;
    }
    return true;
  });
  // 子按钮点击事件
  waitListMenu.grid.on("item_click", (item) => {
    let handler = menuHandler[item.name]
    if (handler) {
      handler(item)
    }
    closeMenu()
  });
}

// 更新UI界面
function postUiUpdate () {
  // 在UI线程中更新界面 (需要检查悬浮窗是否存在)
  ui.run(function () {
    if (stop) {
      return
    }
    // 只有当悬浮窗存在且准备就绪时才更新UI
    if (floatyBtn && waitListMenu && floatyReady) {
      let countText = waitList.length + '';
      // 优化：只在文本真正改变时才更新
      if (floatyBtn.waitCount && floatyBtn.waitCount.getText() !== countText) {
        floatyBtn.waitCount.setText(countText);
      }
      // 更新固定项文本 (开始时间)
      FIXED_ITEM_LIST[0].text = '挂起开始时间: ' + formatDate(suspendStartTime, 'HH:mm:ss');
      FIXED_ITEM_LIST[1].text = '当前等待中任务数：' + waitList.length; // 更新固定项文本

      // 构建新的数据源并只在变化时更新
      let newDataSource = FIXED_ITEM_LIST.map(item => ({
        text: item.text,
        color: item.color,
        name: item.name
      }));

      // 添加动态等待任务项
      newDataSource = newDataSource.concat(waitList.map(item => ({
        text: item,
        color: '#ffc640',
        name: 'task',
      })))
      // 比较数据源是否真的发生变化
      let newDataSourceStr = JSON.stringify(newDataSource)
      if (!lastDataSource || lastDataSource !== newDataSourceStr) {
        lastDataSource = newDataSourceStr
        if (waitListMenu.grid) {
          waitListMenu.grid.setDataSource(newDataSource)
        }
      }
    }
  })
}

// 菜单处理函数
const menuHandler = {
  'startTime': (item) => { // 点击开始时间项，可以显示更详细信息或无操作
    toastLog("挂起开始于: " + formatDate(suspendStartTime));
  },
  'setCountdown': (item) => { // 设置倒计时
    dialogs.rawInput("设置倒计时 (分钟):", "30", (input) => {
      let minutes = parseInt(input);
      if (!isNaN(minutes) && minutes > 0) {
        countdownEndTime = new Date(Date.now() + minutes * 60 * 1000);
        // 如果设置了倒计时，则添加或更新倒计时显示项
        if (countdownEndTime) {
          let now = new Date();
          let timeLeft = countdownEndTime.getTime() - now.getTime();
          if (timeLeft > 0) {
            // 找到 'setCountdown' 的索引，插入在其后
            let countdownIndex = FIXED_ITEM_LIST.findIndex(item => item.name === 'setCountdown');
            if (countdownIndex !== -1) {
              FIXED_ITEM_LIST[countdownIndex].text = "自动退出时间：" + formatDate(countdownEndTime, 'HH:mm:ss')
              FIXED_ITEM_LIST[countdownIndex].color = "#2196F3"
              postUiUpdate();
            }
          } else {
            // 时间已到，重置 countdownEndTime (虽然线程会处理退出，但这里也清理一下)
            countdownEndTime = null;
          }
        }
        postUiUpdate(); // 立即更新UI显示倒计时
      } else {
        toastLog("请输入有效的分钟数");
      }
    });
  },
  'exit': (item) => {
    let content = ''
    if (waitList.length > 0) {
      content = '当前有 ' + waitList.length + ' 个任务在等待中，结束挂起后将从队列第一个开始运行脚本'
    }
    dialogs.confirm('确定要结束挂起吗?', content, (confirm) => {
      if (confirm) {
        safeExit()
      }
    })
  },
  'hide': (item) => { // 现在是关闭功能
    function confirmClose (confirm) {
      if (confirm) {
        noMoreAskHide = true
        // 执行关闭动画
        if (floatyBtn && floatyBtn.out_container) {
          floatyBtn.out_container.animate()
            .scaleX(0)
            .scaleY(0)
            .setDuration(200)
            .withEndAction(() => {
              // 动画结束后真正关闭悬浮窗
              closeFloatyWindows(); // 使用集中关闭函数
              // 启动音量键监听线程来重新显示
              startVolumeKeyListener();
            })
            .start();
        } else {
          // 如果悬浮窗已经不存在了，直接启动监听
          closeFloatyWindows(); // 确保资源释放
          startVolumeKeyListener();
        }
      }
    }
    if (noMoreAskHide) {
      confirmClose(true)
    } else {
      dialogs.confirm('确定要关闭悬浮窗吗?', '悬浮窗关闭后，可以双击音量下键重新显示', confirmClose)
    }
  },
  'task': (item) => {
    dialogs.confirm('确定要执行这个任务吗?', item.text, (confirm) => {
      if (confirm) {
        toastLog('执行任务：' + item.text)
        runningQueueDispatcher.doAddRunningTask({ source: item.text })
        engines.execScriptFile(item.text, {
          path: item.text.substring(0, item.text.lastIndexOf('/')),
          arguments: { triggerImmediately: true }
        })
        exit()
      }
    })
  }
}

// 启动音量键监听
function startVolumeKeyListener () {
  threads.start(function () {
    events.removeAllKeyDownListeners("volume_down")
    events.observeKey()
    let clickTimes = []; // 记录点击时间
    events.onKeyDown("volume_down", function (event) {
      let now = Date.now();
      clickTimes.push(now);
      // 移除超过1秒的旧记录
      clickTimes = clickTimes.filter(time => now - time <= 1000);
      if (clickTimes.length >= 2) {
        // 检查最近两次点击是否在300ms内 (双击)
        let recentClicks = clickTimes.slice(-2);
        if (recentClicks[1] - recentClicks[0] <= 300 && recentClicks[1] - recentClicks[0] > 0) {
          // toastLog('双击音量下键，重新显示悬浮窗')
          events.removeAllKeyDownListeners("volume_down")
          clickTimes = []; // 清空记录
          // 重新创建悬浮窗
          createFloatyWindows();
        }
      } else {
        // 单击提示
        // toastLog('单击音量下键') // 可以取消注释来调试
      }
    });
  });
}

// 辅助函数 - 打开菜单
function openMenu () {
  if (!waitListMenu || !floatyBtn) return;
  isMenuOpen = true;
  // 强制测量一次，拿到菜单实际宽度
  waitListMenu.setSize(-2, -2);
  waitListMenu.menu.measure(0, 0);
  const menuW = waitListMenu.menu.getMeasuredWidth();
  const menuH = waitListMenu.menu.getMeasuredHeight();
  // 判断左右
  const isLeft = floatyBtn.getX() < device.width / 2;
  const isUp = floatyBtn.getY() < device.height / 2;
  const padding = floatyBtn.getWidth() / 2
  // 计算横坐标
  const x = isLeft ? 0 : device.width - menuW - padding;
  const y = isUp ? floatyBtn.getY() + padding : floatyBtn.getY() - menuH + padding;
  waitListMenu.setPosition(x, y);
  setTimeout(() => {
    if (!waitListMenu || !waitListMenu.menu) return;
    waitListMenu.menu.attr("visibility", "visible");
    // 动画：左侧原点不变；右侧原点改为右侧
    waitListMenu.menu.scaleX = 0;
    waitListMenu.menu.scaleY = 0;
    waitListMenu.menu.pivotX = isLeft ? 0 : device.width;
    waitListMenu.menu.pivotY = isUp ? floatyBtn.getY() - menuH : floatyBtn.getY() + menuH;
    waitListMenu.menu.animate()
      .scaleX(1)
      .scaleY(1)
      .setDuration(200)
      .start();
  }, 50)
}

// 辅助函数 - 关闭菜单
function closeMenu () {
  if (!waitListMenu) return;
  isMenuOpen = false;
  waitListMenu.menu.animate()
    .scaleX(0)
    .scaleY(0)
    .setDuration(200)
    .withEndAction(() => {
      if (!waitListMenu || !waitListMenu.menu) return;
      waitListMenu.menu.attr("visibility", "gone");
      waitListMenu.setSize(0, 0);
      // 判断左右 (需要检查floatyBtn是否存在)
      if (floatyBtn) {
        const isLeft = floatyBtn.getX() < device.width / 2;
        waitListMenu.setPosition(isLeft ? 0 : device.width, floatyBtn.getY()); // 扔出屏幕
      }
    }).start();
}

// 生成用于停止当前脚本的代码
function buildScript () { // 移除了未使用的参数
  return `
  engines.all().filter(engine => (engine.getSource() + '').endsWith('挂起所有脚本.js')).forEach(engine => engine.forceStop());
  `
}

// 初始创建悬浮窗
createFloatyWindows();

//  使用线程和缓存机制
let updateThread = threads.start(function () {
  while (!stop) {
    try {
      // --- 新增：检查倒计时是否结束 ---
      if (countdownEndTime) {
        let now = new Date();
        if (now >= countdownEndTime) {
          safeExit(); // 自动退出脚本
          return
        }
      }
      // 将耗时操作放在线程中执行
      runningQueueDispatcher.renewalRunningTask(null, null, true)
      let waitingQueueStr = runningQueueDispatcher.getStorage().get("waitingQueue") || '[]'
      // 只有数据发生变化时才处理
      if (waitingQueueStr !== lastWaitingQueueStr) {
        lastWaitingQueueStr = waitingQueueStr
        let waitingQueue = []
        try {
          waitingQueue = JSON.parse(waitingQueueStr)
        } catch (e) {
          logUtils.errorInfo('JSON解析等待队列失败:', e)
          waitingQueue = []
        }
        if (waitingQueue && waitingQueue.length > 0) {
          // 更新等待列表
          waitList = waitingQueue.map((task) => task.source)
          let scriptPath = waitingQueue[0].source
          let startScriptIntent = new Intent(context, TaskReceiver)
          startScriptIntent.setAction(new Date().getTime() + '')
          startScriptIntent.putExtra('script', buildScript()) // 使用无参函数
          startScriptIntent.putExtra('triggerByNotice', new Date().getTime() + '')
          NotificationHelper.createNotification(
            '当前等待中任务数：' + waitingQueue.length,
            '点击可以执行第一个任务：' + scriptPath.replace('/storage/emulated/0', '').replace('/sdcard', ''),
            NOTICE_ID, true, startScriptIntent
          )
        } else {
          waitList = []; // 明确清空列表
          NotificationHelper.createNotification('当前等待中任务数：0', '当前无任务等待执行中', NOTICE_ID)
        }
        postUiUpdate() // 统一更新UI
      }
    } catch (e) {
      logUtils.errorInfo('更新等待队列时出错:' + e)
    }
    // 优化刷新频率逻辑
    let sleepTime;
    if (loopTime > 30) {
      sleepTime = 60000; // 1分钟
    } else if (loopTime > 20) {
      sleepTime = 30000; // 30秒
      loopTime++; // 只在这里增加
    } else {
      sleepTime = 5000; // 5秒
      loopTime++;
    }
    if (countdownEndTime) {
      let remain = countdownEndTime.getTime() - new Date().getTime()
      sleepTime = sleepTime > remain ? remain : sleepTime
    }
    sleep(sleepTime);
  }
})

// 脚本退出时清理线程和资源
events.on('exit', function () {
  stop = true; // 设置停止标志
  if (updateThread && updateThread.isAlive()) {
    updateThread.interrupt()
  }
  // 使用集中关闭函数确保清理所有悬浮窗
  closeFloatyWindows();
  try {
    events.removeAllKeyDownListeners("volume_down");
  } catch (e) {
    // 忽略移除监听器时的错误
  }
})

// 安全退出 避免ui更新时出错
function safeExit () {
  stop = true
  setTimeout(() => {
    exit()
  }, 200)
}