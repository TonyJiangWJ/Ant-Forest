/*
 * 悬浮窗按钮工具类，可拖拽、可停靠、可展开菜单的悬浮窗按钮组件
 * @Author: 原作者：大柒(531310591@qq.com) 修改者：TonyJiangWJ
 * @Refactor Powered by Qwen3-Coder @202508

 * @description
 * 提供一个位于屏幕边缘的圆形主按钮，具有以下核心功能：
 * 1.  拖拽移动：用户可以长按并拖拽主按钮到屏幕任意位置。
 * 2.  自动停靠：拖拽释放后，主按钮会自动平滑动画停靠到屏幕左侧或右侧边缘。
 * 3.  径向菜单：点击主按钮，会以径向（扇形）方式展开/收起一组自定义的菜单项。
 * 4.  屏幕旋转适配：监听屏幕方向变化，自动调整按钮和菜单的位置。
 * 5.  防误触：通过拖动阈值和动画锁，防止误触和动画冲突。
 *
 * @usage
 * 1.  导入模块: `let FloatyButton = require('./FloatyButton.js');`
 * 2.  创建实例: `let myFloatyButton = new FloatyButton(options);`
 *     `options` 是一个配置对象，用于自定义按钮和菜单：
 *     - logo_src: {string} 主按钮图标资源路径 (默认: '@drawable/ic_android_eat_js')
 *     - menu1_text/src/bg/on_click: {string/string/string/Function} 菜单项1的文本、图标、背景色和点击回调。
 *     - menu2_text/src/bg/on_click: {string/string/string/Function} 菜单项2的文本、图标、背景色和点击回调。
 *     - menu3_text/src/bg/on_click: {string/string/string/Function} 菜单项3的文本、图标、背景色和点击回调。
 *     - menu4_text/src/bg/on_click: {string/string/string/Function} 菜单项4的文本、图标、背景色和点击回调。
 *     - menu5_text/src/bg/on_click: {string/string/string/Function} 菜单项5的文本、图标、背景色和点击回调。
 *     (如果某个菜单项未提供 `text` 或 `src`，则会尝试显示 `text`，若也无则显示默认图标)
 * 3.  初始化: `myFloatyButton.init();` (构造函数中已自动调用)
 *
 * @example
 * let options = {
 *   logo_src: '@drawable/ic_my_logo',
 *   menu1_text: '设置',
 *   menu1_src: '@drawable/ic_settings',
 *   menu1_bg: '#4CAF50',
 *   menu1_on_click: function() { toastLog('设置被点击'); },
 *   menu2_text: '',
 *   menu2_src: '@drawable/ic_exit',
 *   menu2_bg: '#F44336',
 *   menu2_on_click: function() { toastLog('退出被点击'); exit(); }
 *   // ... 可继续配置 menu3, menu4, menu5
 * };
 * let myBtn = new FloatyButton(options);
 * // myBtn.init(); // 可选，构造函数已调用
 * // 悬浮窗会自动创建并显示
 *
 * @requires Auto.js Modify (已测试版本)
 * @requires ../config.js
 * @requires ./SingletonRequirer.js
 *
 * @version 2.1 (基于原作者第二版修改)
 * @lastmodified 2025-08-01
 */
let { config } = require('../config.js')(runtime, global);
let singletonRequire = require('./SingletonRequirer.js')(runtime, global);
let commonFunctions = singletonRequire('CommonFunction');

/**
 * FloatyButton 悬浮窗按钮类
 * @param {Object} options 配置选项
 */
function FloatyButton(options) {
  options = options || {};
  importClass(android.animation.ObjectAnimator);
  importClass(android.animation.AnimatorSet);
  importClass(android.view.animation.BounceInterpolator);
  importClass(android.view.View);
  importClass(java.util.concurrent.LinkedBlockingQueue);
  importClass(java.util.concurrent.ThreadPoolExecutor);
  importClass(java.util.concurrent.TimeUnit);
  importClass(java.util.concurrent.ThreadFactory);
  importClass(java.util.concurrent.Executors);
  importClass(android.content.BroadcastReceiver);
  importClass(android.content.ContextWrapper);
  importClass(android.content.IntentFilter);

  const _this = this;
  // 注册监听屏幕旋转广播
  let intentChangedListener; // 优化：命名更清晰
  // 定义拖动阈值常量
  const DRAG_THRESHOLD = 30;

  this.threadPool = new ThreadPoolExecutor(
    4, 4, 60,
    TimeUnit.SECONDS, new LinkedBlockingQueue(16),
    new ThreadFactory({
      newThread: function (runnable) {
        let thread = Executors.defaultThreadFactory().newThread(runnable);
        thread.setName('hold-floaty-' + thread.getName());
        return thread;
      }
    })
  );

  /**
   * 在线程池中执行任务
   * @param {Function} callback 要执行的回调函数
   */
  this.runInThreadPool = function (callback) {
    _this.threadPool.execute(function () {
      try {
        callback();
      } catch (e) {
        console.error('执行异常: ' + e);
        commonFunctions.printExceptionStack(e);
      }
    });
  };

  this.init = function () {
    /************** 可修改参数 (Constants) **************/
    // 按钮大小 (dp)
    const buttonSizeDp = 42;
    // 图标大小 (dp)
    const iconSizeDp = 30;
    // 按钮停靠时X值增量，感觉按钮停靠两边太靠外面则减小该值
    const dockOffsetDp = 4;
    // 菜单展开圆的半径 (dp)
    const menuRadiusDp = 230;
    // 菜单展开动画播放时间 (ms)
    const menuAnimationDuration = 200;
    // 按钮停靠动画播放时间 (ms)
    const dockAnimationDuration = 300;

    // menu菜单数据可自行修改
    // 添加方法在buttonConfig里面先写好对应内容,然后在menu悬浮窗里面添加一个按钮布局并填写信息
    // 也可以不需要下面数据 直接在悬浮窗手动输入信息
    // 优化：变量命名更清晰
    const buttonConfig = {
      'logo': {
        name: "logo", // 不可修改
        src: options.logo_src || '@drawable/ic_android_eat_js',
      },
      'menu_1': {
        name: "menu_1",
        text: options.menu1_text || '',
        src: options.menu1_src || '@drawable/ic_perm_identity_black_48dp',
        bg: options.menu1_bg || "#009687",
      },
      'menu_2': {
        name: "menu_2",
        text: options.menu2_text || '',
        src: options.menu2_src || '@drawable/ic_assignment_black_48dp',
        bg: options.menu2_bg || "#ee534f",
      },
      'menu_3': {
        name: "menu_3",
        text: options.menu3_text || '',
        src: options.menu3_src || '@drawable/ic_play_arrow_black_48dp',
        bg: options.menu3_bg || "#40a5f3",
      },
      'menu_4': {
        name: "menu_4",
        text: options.menu4_text || '',
        src: options.menu4_src || '@drawable/ic_clear_black_48dp',
        bg: options.menu4_bg || "#fbd834",
      },
      'menu_5': {
        name: "menu_5",
        text: options.menu5_text || '',
        src: options.menu5_src || '@drawable/ic_settings_black_48dp',
        bg: options.menu5_bg || "#bfc1c0",
      }
    };

    /************** 工具函数和变量 **************/
    // 获取dp转px值
    const scale = context.getResources().getDisplayMetrics().density;
    const buttonRadiusPx = Math.floor(buttonSizeDp * scale + 0.5) / 2; // 按钮半径 (px)

    /**
     * DP转PX
     * @param {number} dp
     * @returns {number} px
     */
    function dp2px(dp) {
      return Math.floor(dp * scale + 0.5);
    }

    /**
     * PX转DP
     * @param {number} px
     * @returns {number} dp
     */
    function px2dp(px) {
      return Math.floor(px / scale + 0.5);
    }

    /************** 系统变量 **************/
    // 菜单展开状态记录值
    let isMenuExpanded = false;
    // 按钮左右方向记录值 false:左 true:右
    let isDockedRight = false;
    // 屏幕方向记录值 false:竖 true:横
    let isLandscape = false; // 注意：true表示横屏，false表示竖屏
    // 动画播放开关记录值 防止动画播放冲突
    let isAnimating = false;
    // 菜单按钮视图信息
    const menuViews = []; // 使用 const，因为数组引用不变，只是内容变化
    // menu展开坐标 (预先计算)
    // 优化：变量命名更清晰
    const menuPositionsX = new Array(); // 使用 const，因为数组引用不变
    const menuPositionsY = new Array(); // 使用 const，因为数组引用不变
    // 屏幕宽高
    let screenWidth = device.width;
    let screenHeight = device.height;
    // 主按钮Y值所在屏幕百分比,屏幕旋转时调整控件位置
    let buttonVerticalRatio = 0.5;
    // 按钮停靠时隐藏到屏幕的X值 (px)
    let dockHiddenOffsetPx = 0;
    // 初始化数据标志
    let isInitialized = false;

    /************** UI组件定义 **************/
    // 自定义控件 按钮
    const butLogoLayout = (function () { // IIFE 返回的构造函数，使用 const
      util.extend(butLogoLayout, ui.Widget);

      function butLogoLayout() {
        ui.Widget.call(this);
        this.defineAttr("name", (view, attr, value, defineSetter) => {
          view._name.setText(value);
        });
        this.defineAttr("text", (view, attr, value, defineSetter) => {
          if (typeof value != 'undefined' && value && value != undefined && value != 'undefined') {
            view._text.setVisibility(View.VISIBLE);
            console.log('set text:', value);
            view._img.setVisibility(View.GONE);
            view._text.setText(value);
          }
        });
        this.defineAttr("src", (view, attr, value, defineSetter) => {
          view._img.attr("src", value);
        });
        this.defineAttr("bg", (view, attr, value, defineSetter) => {
          view._bg.attr("cardBackgroundColor", value);
          view._img.attr("tint", "#ffffff");
          menuViews[menuViews.length] = view; // 收集菜单视图
        });
      };

      butLogoLayout.prototype.render = function () {
        return `
            <card id="_bg" w="${buttonSizeDp}" h="${buttonSizeDp}" cardCornerRadius="${buttonSizeDp}" cardBackgroundColor="#99ffffff"
                cardElevation="0" foreground="?selectableItemBackground" gravity="center" >
                <img id="_img" w="${iconSizeDp}" src="#ffffff" circle="true" />
                <text id="_text" text="0" visibility="gone" textSize="20sp" textColor="#ffffff" gravity="center" layout_gravity="center" textStyle='bold' />
                <text id="_name" text="0" visibility="gone" textSize="1" />
            </card>
        `;
      };

      butLogoLayout.prototype.onViewCreated = function (view) {
        view.on("click", () => {
          if (view._name.text() != "logo") {
            menuOnClick(view); // 处理菜单点击
          }
          eval(this._onClick); // 执行可能的额外点击逻辑
        });
      };

      ui.registerWidget("butLogo-layout", butLogoLayout);
      return butLogoLayout;
    })();

    /************** 悬浮窗创建 **************/
    /**
     * 悬浮窗
     * menu菜单悬浮窗
     * 可在此处添加按钮
     * 参数一个都不能少
     */
    const w_menu = floaty.rawWindow( // 悬浮窗对象引用不变，使用 const
      `<frame id="menu" w="${dp2px(menuRadiusDp)}px" h="${dp2px(menuRadiusDp)}px" visibility="gone" >
          <butLogo-layout name="${buttonConfig.menu_1.name}" text="${buttonConfig.menu_1.text}" src="${buttonConfig.menu_1.src}" bg="${buttonConfig.menu_1.bg}" layout_gravity="center" />
          <butLogo-layout name="${buttonConfig.menu_2.name}" text="${buttonConfig.menu_2.text}" src="${buttonConfig.menu_2.src}" bg="${buttonConfig.menu_2.bg}" layout_gravity="center" />
          <butLogo-layout name="${buttonConfig.menu_3.name}" text="${buttonConfig.menu_3.text}" src="${buttonConfig.menu_3.src}" bg="${buttonConfig.menu_3.bg}" layout_gravity="center" />
          <butLogo-layout name="${buttonConfig.menu_4.name}" text="${buttonConfig.menu_4.text}" src="${buttonConfig.menu_4.src}" bg="${buttonConfig.menu_4.bg}" layout_gravity="center" />
          <butLogo-layout name="${buttonConfig.menu_5.name}" text="${buttonConfig.menu_5.text}" src="${buttonConfig.menu_5.src}" bg="${buttonConfig.menu_5.bg}" layout_gravity="center" />
      </frame>`
    );

    // 主按钮悬浮窗  无需更改
    // 不能设置bg参数
    const w_logo = floaty.rawWindow( // 悬浮窗对象引用不变，使用 const
      `<butLogo-layout id="_but" name="${buttonConfig.logo.name}" src="${buttonConfig.logo.src}" alpha="0.4" visibility="invisible" />`
    );

    // 主按钮动画悬浮窗  无需更改
    // 不能设置bg参数
    const w_logo_a = floaty.rawWindow( // 悬浮窗对象引用不变，使用 const
      `<butLogo-layout id="_but" name="${buttonConfig.logo.name}" src="${buttonConfig.logo.src}" alpha="0" />`
    );
    w_logo_a.setSize(-1, -1);
    w_logo_a.setTouchable(false);
    w_logo_a._but.attr('visibility', 'gone');

    /************** 菜单位置计算 **************/
    // 计算menu菜单在圆上的X,Y值
    // 计算每个菜单的角度
    const deg = 360 / (menuViews.length * 2 - 2); // 常量，使用 const
    let degree = 0; // 循环内变量，每次外层循环重置
    for (let i = 0; i < 2; i++) {
      degree = 0; // 重置角度
      menuPositionsX[i] = []; // 初始化内层数组 // 优化：变量命名
      menuPositionsY[i] = []; // 初始化内层数组 // 优化：变量命名
      for (let j = 0; j < menuViews.length; j++) {
        menuPositionsX[i][j] = parseInt(0 + Math.cos(Math.PI * 2 / 360 * (degree - 90)) * menuRadiusDp); // 优化：变量命名
        menuPositionsY[i][j] = parseInt(0 + Math.sin(Math.PI * 2 / 360 * (degree - 90)) * menuRadiusDp); // 优化：变量命名
        i ? degree -= deg : degree += deg;
      }
    }

    /************** 广播接收器 **************/
    const filter = new IntentFilter(); // IntentFilter 对象引用不变，使用 const
    filter.addAction("android.intent.action.CONFIGURATION_CHANGED");
    new ContextWrapper(context).registerReceiver(
      intentChangedListener = new BroadcastReceiver({ // 优化：变量命名
        onReceive: function (context, intent) {
          log("屏幕方向发生变化");
          getScreenDirection();
        }
      }),
      filter
    );

    /************** 初始化和屏幕方向处理 **************/
    _this.runInThreadPool(function () {
      sleep(100);
      // 确保UI加载完成后再初始化位置
      if (w_logo._but.getWidth() && !isInitialized) {
        isInitialized = true;
        dockHiddenOffsetPx = -dp2px(parseInt((px2dp(w_logo._but.getWidth()) - iconSizeDp + dockOffsetDp) / 2));
        getScreenDirection(); // 获取初始屏幕方向并设置位置
        _this.runInThreadPool(() => {
          sleep(50);
          ui.run(() => {
            w_logo._but.attr("visibility", "visible"); // 显示主按钮
          });
        });
      }
    });

    /**
     * 屏幕旋转处理函数
     */
    function getScreenDirection() {
      importPackage(android.content);
      let dockX = 0; // 临时计算变量 // 优化：变量命名更明确
      // 判断当前屏幕方向
      if (context.getResources().getConfiguration().orientation == 1) {
        isLandscape = false;
        // 优化：拆分连续赋值，提高可读性
        if (device.width < device.height) {
          screenWidth = device.width;
          screenHeight = device.height;
        } else {
          screenWidth = device.height;
          screenHeight = device.width;
        }
      } else {
        isLandscape = true;
        // 优化：拆分连续赋值，提高可读性
        if (device.width > device.height) {
          screenWidth = device.width;
          screenHeight = device.height;
        } else {
          screenWidth = device.height;
          screenHeight = device.width;
        }
      }
      // 根据按钮方向和屏幕尺寸计算停靠X位置
      if (isDockedRight) {
         dockX = screenWidth - dp2px(buttonSizeDp) + (dp2px((buttonSizeDp - iconSizeDp) / 2));
      } else {
         dockX = 0 + dockHiddenOffsetPx;
      }
      _this.runInThreadPool(function () {
        sleep(50);
        ui.run(() => {
          w_logo.setPosition(dockX, screenHeight * buttonVerticalRatio); // 设置主按钮位置
          // 如果菜单是展开的，重新调整菜单位置
          if (isMenuExpanded) {
            animation_menu(null, true);
          }
        });
      });
    }

    /************** 核心功能函数 **************/
    /**
     * menu菜单按钮被点击事件
     * 可在这个函数内添加每个菜单要触发的功能
     * @param {*} view //menu按钮视图信息
     * view._bg : menu背景颜色
     * view._name : menu name名
     * view._img : menu src图片
     */
    function menuOnClick(view) {
      switch (view._name.text()) {
        case "menu_1":
          options.menu1_on_click && options.menu1_on_click();
          break;
        case "menu_2":
          options.menu2_on_click && options.menu2_on_click();
          break;
        case "menu_3":
          options.menu3_on_click && options.menu3_on_click();
          break;
        case "menu_4":
          options.menu4_on_click && options.menu4_on_click();
          break;
        case "menu_5":
          options.menu5_on_click && options.menu5_on_click();
          break;
      }
      animation_menu(); // 点击菜单项后，收起菜单
    }

    /**
     * 菜单展开/收起动画
     * @param {MotionEvent} event 触发事件（用于定位）
     * @param {boolean} isScreenRotation 是否是屏幕旋转触发的调整
     */
    function animation_menu(event, isScreenRotation) {
      // 如果是展开状态且不是屏幕旋转，则需要重新定位菜单
      if (!isMenuExpanded && isScreenRotation === undefined) {
        // Y值定位: 将菜单中心对齐到按钮中心
        // 优化：变量命名更清晰，并添加注释
        const menuCircleOffset = dp2px(menuRadiusDp / 2) - (buttonRadiusPx * 2);
        // 优化：变量命名，并添加注释
        let menuCenterX = 0;
        // 优化：变量命名，并添加注释
        let menuCenterY = (windowY + (event.getRawY() - touchStartY)) - (dp2px(menuRadiusDp / 2) - buttonRadiusPx);
        // X值定位
        if (isDockedRight) {
          menuCenterX = screenWidth - menuCircleOffset - (buttonRadiusPx) + (dockHiddenOffsetPx * 2);
        } else {
          menuCenterX = 0;
        }
        // 定位悬浮窗
        // 优化：变量命名，并调整计算以提高可读性
        const menuWindowX = menuCenterX + dockHiddenOffsetPx - menuCircleOffset;
        w_menu.setPosition(menuWindowX, menuCenterY);
        w_logo._but.attr("alpha", "1"); // 主按钮变亮
      } else {
        w_logo._but.attr("alpha", "0.4"); // 主按钮变暗
      }

      _this.runInThreadPool(function () {
        sleep(50);
        ui.run(function () {
          // 优化：直接声明最终动画集合数组
          const allAnimators = [];
          isAnimating = true; // 设置动画状态为播放中

          if (isScreenRotation !== undefined) {
            // 如果是屏幕旋转导致的调整，先隐藏菜单
            w_menu.menu.attr("alpha", "0");
            w_menu.menu.attr("visibility", "gone");
          } else {
            // 否则，设置为可见
            w_menu.menu.attr("visibility", "visible");
          }

          // 根据按钮方向确定使用哪组坐标
          const orientationIndex = isDockedRight ? 1 : 0; // 使用 const 并明确命名

          if (isMenuExpanded) {
            // log("关闭动画")
            // 收起动画：从当前位置移动到中心(0,0)，并缩小
            for (let i = 0; i < menuViews.length; i++) {
              // 优化：直接创建ObjectAnimator并添加到allAnimators数组
              allAnimators.push(ObjectAnimator.ofFloat(menuViews[i]._bg, "translationX", menuPositionsX[orientationIndex][i], 0));
              allAnimators.push(ObjectAnimator.ofFloat(menuViews[i]._bg, "translationY", menuPositionsY[orientationIndex][i], 0));
              allAnimators.push(ObjectAnimator.ofFloat(menuViews[i]._bg, "scaleX", 1, 0));
              allAnimators.push(ObjectAnimator.ofFloat(menuViews[i]._bg, "scaleY", 1, 0));
            }
          } else {
            // 展开动画：从中心(0,0)移动到计算好的位置，并放大
            for (let i = 0; i < menuViews.length; i++) {
              // 优化：直接创建ObjectAnimator并添加到allAnimators数组
              allAnimators.push(ObjectAnimator.ofFloat(menuViews[i]._bg, "translationX", 0, menuPositionsX[orientationIndex][i]));
              allAnimators.push(ObjectAnimator.ofFloat(menuViews[i]._bg, "translationY", 0, menuPositionsY[orientationIndex][i]));
              allAnimators.push(ObjectAnimator.ofFloat(menuViews[i]._bg, "scaleX", 0, 1));
              allAnimators.push(ObjectAnimator.ofFloat(menuViews[i]._bg, "scaleY", 0, 1));
            }
          }

          // 优化：变量命名更清晰
          const animatorSet = new AnimatorSet();
          // 动画集合
          animatorSet.playTogether(allAnimators); // 优化：使用合并后的数组
          // 动画执行时间
          animatorSet.setDuration(menuAnimationDuration);
          animatorSet.start();

          // 创建一个定时器 在动画执行完毕后 解除动画的占用
          _this.runInThreadPool(function () {
            sleep(menuAnimationDuration + 10);
            isAnimating = false; // 动画结束，释放状态
            ui.run(function () {
              if (isMenuExpanded) {
                // 如果之前是展开状态，现在动画结束表示已收起
                w_menu.menu.attr("visibility", "gone");
                w_menu.menu.attr("alpha", "1");
                // 将菜单窗口移出屏幕外（可选优化，避免遮挡）
                w_menu.setPosition(-(device.width || 1080), w_menu.getY());
              }
              isMenuExpanded = !isMenuExpanded; // 切换菜单状态
            });
          });
        });
      });
    }

    /**
     * 动画 logo停靠动画
     * @param {MotionEvent} event 触发停靠的触摸事件
     */
    function animation_port(event) {
      isAnimating = true; // 设置动画状态为播放中

      // 优化：重新计算dockHiddenOffsetPx值 (根据按钮实际宽度微调) - 可考虑提取为函数
      if (isDockedRight) {
        dockHiddenOffsetPx = +dp2px(parseInt((px2dp(w_logo._but.getWidth()) - iconSizeDp + dockOffsetDp) / 2));
      } else {
        dockHiddenOffsetPx = -dp2px(parseInt((px2dp(w_logo._but.getWidth()) - iconSizeDp + dockOffsetDp) / 2));
      }

      // 优化：变量命名更清晰
      let targetDockX = 0;
      // 优化：变量命名更清晰，用于动画路径
      const startXAndTargetX = [];

      // 如果isDockedRight值为真 则停靠在右边 否则停靠在左边
      // 优化：使用 if...else 替代长三元，提高可读性
      if (isDockedRight) {
        targetDockX = screenWidth - dp2px(buttonSizeDp) + dockHiddenOffsetPx;
        startXAndTargetX[0] = windowX + (event.getRawX() - touchStartX);
        startXAndTargetX[1] = targetDockX;
      } else {
        targetDockX = 0 + dockHiddenOffsetPx;
        startXAndTargetX[0] = windowX + (event.getRawX() - touchStartX);
        startXAndTargetX[1] = targetDockX;
      }

      // 动画信息 - 使用辅助窗口 w_logo_a 来执行移动动画
      w_logo_a._but.attr("visibility", "visible"); // 显示辅助按钮

      // 优化：变量命名更具描述性
      const xAnimator = ObjectAnimator.ofFloat(w_logo_a._but, "translationX", startXAndTargetX);
      const yAnimator = ObjectAnimator.ofFloat(w_logo_a._but, "translationY", windowY + (event.getRawY() - touchStartY), windowY + (event.getRawY() - touchStartY));
      const mainAlphaAnimator = ObjectAnimator.ofFloat(w_logo._but, "alpha", 0, 0); // 主按钮透明
      const auxAlphaAnimator = ObjectAnimator.ofFloat(w_logo_a._but, "alpha", 0.4, 0.4); // 辅助按钮显示

      // 优化：变量命名
      const interpolator = new BounceInterpolator(); // 弹跳插值器
      xAnimator.setInterpolator(interpolator);

      // 优化：变量命名
      const animatorSet = new AnimatorSet();
      animatorSet.playTogether(
        xAnimator, yAnimator, mainAlphaAnimator, auxAlphaAnimator
      );
      animatorSet.setDuration(dockAnimationDuration);
      animatorSet.start();

      // 在动画中间时间点，将主窗口移动到目标位置
      _this.runInThreadPool(function () {
        sleep(dockAnimationDuration / 2);
        w_logo.setPosition(targetDockX, windowY + (event.getRawY() - touchStartY)); // 优化：使用已计算的 targetDockX
      });

      // 在动画结束后，清理状态
      _this.runInThreadPool(function () {
        sleep(dockAnimationDuration + 10);
        ui.run(() => {
          w_logo._but.attr("alpha", "0.4"); // 恢复主按钮透明度
          w_logo_a._but.attr("alpha", "0"); // 隐藏辅助按钮
          w_logo_a._but.attr("visibility", "gone"); // 隐藏辅助按钮视图

          // 记录Y值所在百分比，用于屏幕旋转后定位
          buttonVerticalRatio = (Math.round(w_logo.getY() / screenHeight * 100) / 100);

          _this.runInThreadPool(function () {
            sleep(10);
            // 确保主按钮最终可见且透明度正确
            w_logo._but.attr("alpha", "0.4");
          });

          isAnimating = false; // 动画结束，释放状态
        });
      });
    }

    /************** 触摸事件处理 **************/
    // 记录按键被按下时的触摸坐标
    let touchStartX = 0, touchStartY = 0; // 使用 let，因为会在触摸事件中更新 // 优化：命名更清晰
    // 记录按键被按下时的悬浮窗位置
    let windowX, windowY; // 使用 let，因为会在触摸事件中更新
    // 记录按键被按下的时间以便判断长按等动作
    let downTime; // 使用 let，因为会在触摸事件中更新
    let isDragging = false; // 是否已判定为拖动，使用 let

    w_logo._but.setOnTouchListener(function (view, event) {
      // 如果动画正在播放中 则退出该事件
      if (isAnimating) {
        // toastLog('animating ' + _this.threadPool.getActiveCount()); // 可选调试信息
        return true;
      }

      switch (event.getAction()) {
        // 手指按下
        case event.ACTION_DOWN:
          touchStartX = event.getRawX(); // 优化：命名更清晰
          touchStartY = event.getRawY(); // 优化：命名更清晰
          windowX = w_logo.getX();
          windowY = w_logo.getY();
          downTime = new Date().getTime();
          isDragging = false; // 显式在按下时重置拖动标志
          return true;

        // 手指移动
        case event.ACTION_MOVE:
          // 如果菜单展开为真 则退出,展开时禁止触发移动事件
          if (isMenuExpanded) {
            return true;
          }
          if (!isDragging) {
            // 如果移动的距离大于阈值 则判断为移动 isDragging为真
            // 优化：使用定义的常量
            if (Math.abs(event.getRawY() - touchStartY) > DRAG_THRESHOLD || Math.abs(event.getRawX() - touchStartX) > DRAG_THRESHOLD) {
              view.attr("alpha", "1"); // 拖动时按钮变亮
              isDragging = true;
            }
          } else {
            // 移动手指时调整主按钮logo悬浮窗位置
            w_logo.setPosition(windowX + (event.getRawX() - touchStartX), windowY + (event.getRawY() - touchStartY)); // 优化：使用更清晰的变量名
          }
          return true;

        // 手指弹起
        case event.ACTION_UP:
          // 如果在动画正在播放中则退出事件 无操作
          if (isAnimating) {
            return true;
          }
          // 如果控件移动小于阈值 则判断为点击 否则为拖动
          // 优化：使用定义的常量
          if (Math.abs(event.getRawY() - touchStartY) < DRAG_THRESHOLD && Math.abs(event.getRawX() - touchStartX) < DRAG_THRESHOLD) {
            // 点击动作 执行菜单 展开/关闭 动作
            animation_menu(event);
          } else if (!isMenuExpanded) {
            // 移动弹起  判断要停靠的方向
            if (windowX + (event.getRawX() - touchStartX) < screenWidth / 2) { // 优化：使用更清晰的变量名
              isDockedRight = false; // 停靠左边
            } else {
              isDockedRight = true; // 停靠右边
            }
            animation_port(event); // 执行停靠动画
          }
          isDragging = false; // 重置拖动标志
          return true;
      }
      return true;
    });

  }; // End of this.init

  // 注册引擎关闭时的清理函数
  commonFunctions.registerOnEngineRemoved(function () {
    if (intentChangedListener != null) { // 优化：使用更新后的变量名
      // 关闭 屏幕旋转监听广播
      new ContextWrapper(context).unregisterReceiver(intentChangedListener); // 优化：使用更新后的变量名
    }
    _this.threadPool.shutdown(); // 关闭线程池
  }, 'recycle floaty button');

  // 执行初始化
  this.init();
}

module.exports = FloatyButton;