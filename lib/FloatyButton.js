/*
 * @Author: 原作者：大柒 修改者：TonyJiangWJ
 * @QQ: 531310591@qq.com
 * @Version: Auto.Js Pro
 * @LastEditors: 大柒
 * @Date: 2019-05-12 17:08:18
 * @LastEditTime: 2019-05-13 18:00:12
 * @Description: 
 * 第二版Aotu.JS悬浮窗
 * 推荐使用Auto,JS Pro版本
 * 不知到在哪里下载PRO版本的请加群 662377009
 * 修复了上一版的BUG,优化了部分细节
 * 当屏幕方向发生变化时,悬浮窗自动调整位置
 * 修复快速双击主按钮,产生的错误
 * 数据更加直观,常量值可修改全局变量不可修改
 * 优化了停靠动画衔接,拖动按钮时更加流畅
 *  菜单触发事件全部集中在 menuOnClick() 函数
 *  自行添加响应功能
 *  如果发现BUG请联系我
 *  QQ:531310591
 */

let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('./SingletonRequirer.js')(runtime, global)
let commonFunctions = singletonRequire('CommonFunction')

function FloatyButton (options) {
  options = options || {}

  importClass(android.animation.ObjectAnimator)
  importClass(android.animation.AnimatorSet)
  importClass(android.view.animation.BounceInterpolator)
  importClass(android.view.View)

  importClass(android.content.BroadcastReceiver);
  importClass(android.content.ContextWrapper);
  importClass(android.content.IntentFilter);

  let _this = this

  //注册监听屏幕旋转广播
  let intent_CHANGED
  this.threadPool = new ThreadPoolExecutor(4, 4, 60,
    TimeUnit.SECONDS, new LinkedBlockingQueue(16),
    new ThreadFactory({
      newThread: function (runnable) {
        let thread = Executors.defaultThreadFactory().newThread(runnable)
        thread.setName('hold-floaty-' + thread.getName())
        return thread
      }
    })
  )

  this.runInThreadPool = function (callback) {
    _this.threadPool.execute(function () {
      try {
        callback()
      } catch (e) {
        console.error('执行异常' + e)
        commonFunctions.printExceptionStack(e)
      }
    })
  }

  this.init = function () {
    /**************可修改参数 */
    //按钮大小
    const but_w_h = 42;
    //图标大小
    const but_w = 30;
    //按钮停靠时X值 增量 感觉按钮停靠两边太靠外面则减小该值 
    const port_x = 4;
    //菜单展开圆的半径
    const menu_r = 230
    //菜单展开动画播放时间 可自行修改
    const animation_time = 200
    //按钮停靠动画播放时间 可自行修改
    const animation_time_1 = 300

    //menu菜单数据可自行修改
    //添加方法在but_data里面先写好对应内容,然后在menu悬浮窗里面添加一个按钮布局并填写信息
    //也可以不需要下面数据 直接在悬浮窗手动输入信息
    const but_data = {
      'logo': {
        name: "logo",//不可修改
        src: options.logo_src || 'https://pro.autojs.org/images/logo.png',
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
    }

    //获取dp转px值
    var scale = context.getResources().getDisplayMetrics().density;
    var but_r = Math.floor(but_w_h * scale + 0.5) / 2
    //DP转PX
    function dp2px (dp) {
      return Math.floor(dp * scale + 0.5);
    }
    //PX转DP
    function px2dp (px) {
      return Math.floor(px / scale + 0.5);
    }

    /**
     * menu菜单按钮被点击事件
     * 可在这个函数内添加每个菜单要触发的功能
     * @param {*} view //menu按钮视图信息
     * view._bg : menu背景颜色
     * view._name : menu name名
     * view._img : menu src图片
     */
    function menuOnClick (view) {
      switch (view._name.text()) {
        case "menu_1":
          options.menu1_on_click && options.menu1_on_click()
          break;
        case "menu_2":
          options.menu2_on_click && options.menu2_on_click()
          break;
        case "menu_3":
          options.menu3_on_click && options.menu3_on_click()
          break;
        case "menu_4":
          options.menu4_on_click && options.menu4_on_click()
          break;
        case "menu_5":
          options.menu5_on_click && options.menu5_on_click()
          break;
      }
      animation_menu();
    }


    /**************以下为系统函数 */

    //菜单展开状态记录值
    var menu_switch = false;
    //按钮左右方向记录值 false:左 true:右
    var but_orientation = false;
    //屏幕方向记录值 false:竖 true:横
    var screen_rotation = false;
    //动画播放开关记录值 防止动画播放冲突
    var animation_state = false;
    //菜单按钮视图信息
    var menu_view = [];
    //menu展开坐标
    var menu_X = new Array(); menu_Y = new Array();
    //屏幕宽高
    var _w = device.width; _h = device.height;
    //主按钮Y值所在屏幕百分比,屏幕旋转时调整控件位置
    var _z = 0.5

    //自定义控件 按钮
    var butLogoLayout = (function () {
      util.extend(butLogoLayout, ui.Widget);
      function butLogoLayout () {
        ui.Widget.call(this);
        this.defineAttr("name", (view, attr, value, defineSetter) => {
          view._name.setText(value)
        })
        this.defineAttr("text", (view, attr, value, defineSetter) => {
          if (typeof value != 'undefined' && value && value != undefined && value != 'undefined') {
            view._text.setVisibility(View.VISIBLE)
            console.log('set text:', value)
            view._img.setVisibility(View.GONE)
            view._text.setText(value)
          }
        })
        this.defineAttr("src", (view, attr, value, defineSetter) => {
          view._img.attr("src", value)
        })
        this.defineAttr("bg", (view, attr, value, defineSetter) => {
          view._bg.attr("cardBackgroundColor", value)
          view._img.attr("tint", "#ffffff")
          menu_view[menu_view.length] = view;
        })
      };
      butLogoLayout.prototype.render = function () {
        return `
          <card id="_bg" w="${but_w_h}" h="${but_w_h}" cardCornerRadius="${but_w_h}" cardBackgroundColor="#99ffffff"
            cardElevation="0" foreground="?selectableItemBackground" gravity="center" >
            <img id="_img" w="${but_w}" src="#ffffff" circle="true" />
            <text id="_text" text="0" visibility="gone" textSize="20sp" textColor="#ffffff" gravity="center" layout_gravity="center" textStyle='bold' />
            <text id="_name" text="0" visibility="gone" textSize="1" />
          </card>
        `;
      };
      butLogoLayout.prototype.onViewCreated = function (view) {
        view.on("click", () => {
          if (view._name.text() != "logo") {
            menuOnClick(view)
          }
          eval(this._onClick);
        });
      };
      ui.registerWidget("butLogo-layout", butLogoLayout);
      return butLogoLayout;
    })();

    /**
     * 悬浮窗
     * menu菜单悬浮窗
     * 可在此处添加按钮
     * 参数一个都不能少
     */
    var w_menu = floaty.rawWindow(
      `<frame id="menu" w="${dp2px(menu_r)}px" h="${dp2px(menu_r)}px" visibility="gone" >//
        <butLogo-layout name="${but_data.menu_1.name}" text="${but_data.menu_1.text}" src="${but_data.menu_1.src}" bg="${but_data.menu_1.bg}" layout_gravity="center" />
        <butLogo-layout name="${but_data.menu_2.name}" text="${but_data.menu_2.text}" src="${but_data.menu_2.src}" bg="${but_data.menu_2.bg}" layout_gravity="center" />
        <butLogo-layout name="${but_data.menu_3.name}" text="${but_data.menu_3.text}" src="${but_data.menu_3.src}" bg="${but_data.menu_3.bg}" layout_gravity="center" />
        <butLogo-layout name="${but_data.menu_4.name}" text="${but_data.menu_4.text}" src="${but_data.menu_4.src}" bg="${but_data.menu_4.bg}" layout_gravity="center" />
        <butLogo-layout name="${but_data.menu_5.name}" text="${but_data.menu_5.text}" src="${but_data.menu_5.src}" bg="${but_data.menu_5.bg}" layout_gravity="center" />
      </frame>`
    )

    //主按钮悬浮窗  无需更改
    //不能设置bg参数
    var w_logo = floaty.rawWindow(
      `<butLogo-layout id="_but" name="${but_data.logo.name}" src="${but_data.logo.src}" alpha="0.4" visibility="invisible" />`
    )

    //主按钮动画悬浮窗  无需更改
    //不能设置bg参数
    var w_logo_a = floaty.rawWindow(
      `<butLogo-layout id="_but" name="${but_data.logo.name}" src="${but_data.logo.src}" alpha="0" />`
    )
    w_logo_a.setSize(-1, -1)
    w_logo_a.setTouchable(false)

    //计算menu菜单在圆上的X,Y值
    //计算每个菜单的角度
    var deg = 360 / (menu_view.length * 2 - 2);
    var degree = 0;
    for (let i = 0; i < 2; i++) {
      degree = 0;
      menu_X[i] = [];
      menu_Y[i] = [];
      for (let j = 0; j < menu_view.length; j++) {
        menu_X[i][j] = parseInt(0 + Math.cos(Math.PI * 2 / 360 * (degree - 90)) * menu_r);
        menu_Y[i][j] = parseInt(0 + Math.sin(Math.PI * 2 / 360 * (degree - 90)) * menu_r);
        i ? degree -= deg : degree += deg;
      }
    }

    filter = new IntentFilter();
    filter.addAction("android.intent.action.CONFIGURATION_CHANGED");
    new ContextWrapper(context).registerReceiver(intent_CHANGED = new BroadcastReceiver({
      onReceive: function (context, intent) {
        log("屏幕方向发生变化\n" + intent_CHANGED)
        getScreenDirection()
      }
    }), filter)


    //按钮停靠时隐藏到屏幕的X值
    var but_logo_r = 0
    //初始化数据
    var data__ = false
    _this.runInThreadPool(function () {
      sleep(100)
      if (w_logo._but.getWidth() && !data__) {
        data__ == true;
        but_logo_r = -dp2px(parseInt((px2dp(w_logo._but.getWidth()) - but_w + port_x) / 2));
        getScreenDirection();
        _this.runInThreadPool(() => {
          sleep(50)
          ui.run(() => { w_logo._but.attr("visibility", "visible") });
        })
      }
    });


    //屏幕旋转处理
    function getScreenDirection () {
      importPackage(android.content);
      let X = 0
      if (context.getResources().getConfiguration().orientation == 1) {
        screen_rotation = false
        device.width < device.height ? (_w = device.width, _h = device.height) : (_w = device.height, _h = device.width)
      } else {
        screen_rotation = true
        device.width > device.height ? (_w = device.width, _h = device.height) : (_w = device.height, _h = device.width)
      }
      but_orientation ? X = _w - dp2px(but_w_h) + (dp2px((but_w_h - but_w) / 2)) : X = 0 + but_logo_r
      _this.runInThreadPool(function () {
        sleep(50)
        ui.run(() => {
          w_logo.setPosition(X, _h * _z)
          if (menu_switch) { animation_menu(w_menu.menu, true) }
        })
      });
    }

    //菜单展开收起动画
    function animation_menu (event, E) {
      //如果展开状态为假  则重新定位菜单menu位置 
      if (!menu_switch && E == undefined) {
        //Y值定位
        let but_rrr = dp2px(menu_r / 2) - (but_r * 2)
        let X = 0, Y = (windowY + (event.getRawY() - y)) - (dp2px(menu_r / 2) - but_r)
        //X值定位
        but_orientation ? X = _w - but_rrr - (but_r) + (but_logo_r * 2) : X = 0;
        //定位悬浮窗
        w_menu.setPosition(X + but_logo_r - but_rrr, Y)
        w_logo._but.attr("alpha", "1")
      } else {
        w_logo._but.attr("alpha", "0.4")
      }
      _this.runInThreadPool(function () {
        sleep(50)
        ui.run(function () {
          let animationX = [], animationY = [], slX = [], slY = [];
          animation_state = true;
          E != undefined ? w_menu.menu.attr("alpha", "0") : w_menu.menu.attr("visibility", "visible")
          but_orientation ? e = 1 : e = 0;
          if (menu_switch) {
            // log("关闭动画")
            for (let i = 0; i < menu_view.length; i++) {
              animationX[i] = ObjectAnimator.ofFloat(menu_view[i]._bg, "translationX", menu_X[e][i], 0);
              animationY[i] = ObjectAnimator.ofFloat(menu_view[i]._bg, "translationY", menu_Y[e][i], 0);
              slX[i] = ObjectAnimator.ofFloat(menu_view[i]._bg, "scaleX", 1, 0)
              slY[i] = ObjectAnimator.ofFloat(menu_view[i]._bg, "scaleY", 1, 0)
            }
          } else {
            for (let i = 0; i < menu_view.length; i++) {
              animationX[i] = ObjectAnimator.ofFloat(menu_view[i]._bg, "translationX", 0, menu_X[e][i]);
              animationY[i] = ObjectAnimator.ofFloat(menu_view[i]._bg, "translationY", 0, menu_Y[e][i]);
              slX[i] = ObjectAnimator.ofFloat(menu_view[i]._bg, "scaleX", 0, 1)
              slY[i] = ObjectAnimator.ofFloat(menu_view[i]._bg, "scaleY", 0, 1)
            }
          }
          //集合所有动画数据到animation数组里面
          let animation = []
          for (let i = 0; i < animationX.length; i++) {
            animation[animation.length] = animationX[i];
            animation[animation.length] = animationY[i];
            animation[animation.length] = slX[i];
            animation[animation.length] = slY[i];
          }
          set = new AnimatorSet();
          //动画集合
          set.playTogether(animation);
          //动画执行时间
          set.setDuration(animation_time);
          set.start();
          //创建一个定时器 在动画执行完毕后 解除动画的占用
          _this.runInThreadPool(function () {
            sleep(animation_time + 10)
            animation_state = false;
            ui.run(function () {
              menu_switch ? (menu_switch = false, w_menu.menu.attr("visibility", "gone"), w_menu.menu.attr("alpha", "1")) : menu_switch = true
            })
          });
        })
      });
    }

    /**
     * 动画 logo停靠动画
     */
    function animation_port (event) {
      animation_state = true;
      let X = []; PX = 0; animator = {}, animatorY = {}, animatorA = {};
      //重新计算but_logo_r值
      but_orientation ? but_logo_r = +dp2px(parseInt((px2dp(w_logo._but.getWidth()) - but_w + port_x) / 2)) : but_logo_r = -dp2px(parseInt((px2dp(w_logo._but.getWidth()) - but_w + port_x) / 2))
      //如果but_orientation值为真 则停靠在右边 否则停靠在左边
      but_orientation ? (PX = _w - dp2px(but_w_h) + but_logo_r, X = [windowX + (event.getRawX() - x), PX]) : (PX = 0 + but_logo_r, X = [windowX + (event.getRawX() - x), PX])
      //动画信息
      w_logo_a._but.attr("visibility", "visible")
      animator = ObjectAnimator.ofFloat(w_logo_a._but, "translationX", X);
      animatorY = ObjectAnimator.ofFloat(w_logo_a._but, "translationY", windowY + (event.getRawY() - y), windowY + (event.getRawY() - y));
      animatorA = ObjectAnimator.ofFloat(w_logo._but, "alpha", 0, 0);
      animatorA1 = ObjectAnimator.ofFloat(w_logo_a._but, "alpha", 0.4, 0.4);
      mTimeInterpolator = new BounceInterpolator();
      animator.setInterpolator(mTimeInterpolator);
      set = new AnimatorSet();
      set.playTogether(
        animator, animatorY, animatorA, animatorA1
      )
      set.setDuration(animation_time_1);
      set.start();
      _this.runInThreadPool(function () {
        sleep(animation_time_1 / 2)
        w_logo.setPosition(PX, windowY + (event.getRawY() - y))
      });
      _this.runInThreadPool(function () {
        sleep(animation_time_1 + 10)
        ui.run(() => {
          w_logo._but.attr("alpha", "0.4")
          w_logo_a._but.attr("alpha", "0")
          w_logo_a._but.attr("visibility", "invisible")
          //记录Y值所在百分比
          _z = (Math.round(w_logo.getY() / _h * 100) / 100)
          _this.runInThreadPool(function () {
            sleep(10)
            w_logo._but.attr("alpha", "0.4")
          });
          animation_state = false;
        })
      });
    }

    //记录按键被按下时的触摸坐标
    var x = 0,
      y = 0;
    //记录按键被按下时的悬浮窗位置
    var windowX, windowY;
    //记录按键被按下的时间以便判断长按等动作
    var downTime; yd = false;
    w_logo._but.setOnTouchListener(function (view, event) {
      //如果动画正在播放中 则退出该事件
      if (animation_state) {
        toastLog('animating ' + _this.threadPool.getActiveCount())
        return true
      }
      switch (event.getAction()) {
        //手指按下
        case event.ACTION_DOWN:
          x = event.getRawX();
          y = event.getRawY();
          windowX = w_logo.getX();
          windowY = w_logo.getY();
          downTime = new Date().getTime();
          return true
        //手指移动
        case event.ACTION_MOVE:
          //如果展开为真 则退出,展开时禁止触发移动事件
          if (menu_switch) { return true }
          if (!yd) {
            //如果移动的距离大于30值 则判断为移动 yd为真
            if (Math.abs(event.getRawY() - y) > 30 || Math.abs(event.getRawX() - x) > 30) { view.attr("alpha", "1"); yd = true }
          } else {
            //移动手指时调整主按钮logo悬浮窗位置
            w_logo.setPosition(windowX + (event.getRawX() - x), windowY + (event.getRawY() - y));
          }
          return true
        //手指弹起
        case event.ACTION_UP:
          //如果在动画正在播放中则退出事件 无操作           
          if (animation_state) { return }
          //如果控件移动小于 30 则判断为点击 否则为点击
          if (Math.abs(event.getRawY() - y) < 30 && Math.abs(event.getRawX() - x) < 30) {
            //点击动作 执行菜单 展开 关闭 动作
            animation_menu(event)
            //否则如果展开为真 则退出,展开时禁止触发停靠动画事件
          } else if (!menu_switch) {
            //移动弹起  判断要停靠的方向
            windowX + (event.getRawX() - x) < _w / 2 ? but_orientation = false : but_orientation = true;
            animation_port(event)
          }
          yd = false
          return true
      }
      return true
    });


  }

  commonFunctions.registerOnEngineRemoved(function () {
    if (intent_CHANGED != null) {
      //关闭 屏幕旋转监听广播
      new ContextWrapper(context).unregisterReceiver(intent_CHANGED);
    }
    _this.threadPool.shutdown()
  }, 'recycle floaty button')

  this.init()
}

module.exports = FloatyButton