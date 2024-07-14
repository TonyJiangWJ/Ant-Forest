"ui";

importClass(android.graphics.drawable.GradientDrawable)
importClass(android.graphics.drawable.RippleDrawable)
importClass(android.content.res.ColorStateList)
let isRunning = $shizuku.isRunning()
if (!isRunning) {
  toast('当前未授权shizuku服务，无法执行，请在抽屉界面打开shizuku服务')
  // exit()
}
let contextData = {
  mediaAllowed: false
}
let btns = [
  {
    id: 'swipe',
    text: '滑动操作',
    onClick: () => {
      let clickX = ui.clickX.getText(), clickY = ui.clickY.getText()
      let endX = ui.endX.getText(), endY = ui.endY.getText()
      threads.start(function () {
        $shizuku(`input swipe ${clickX} ${clickY} ${endX} ${endY}`)
      })
    }
  },
  {
    id: 'lockScreen',
    text: '锁屏',
    onClick: () => {
      $shizuku('input keyevent KEYCODE_POWER')
    }
  },
  {
    id: 'pmList',
    text: '获取第三方应用包名',
    onClick: () => {
      let result = $shizuku('pm list package -3')
      ui.textView.setText(result.result)
    }
  },
  {
    id: 'grantSecure',
    text: '获取Secure权限(自动授权无障碍用)',
    onClick: () => {
      let permit = 'grant'
      if (contextData.secureGranted) {
        permit = 'revoke'
      }
      let result = $shizuku('pm ' + permit + ' ' + context.getPackageName() + ' android.permission.WRITE_SECURE_SETTINGS')
      ui.textView.setText(JSON.stringify(result))
      if (result.code === 0) {
        ui.textView.setText(ui.textView.getText() + "\n权限设置成功")
      } else {
        ui.textView.setText(ui.textView.getText() + "\n权限设置失败")
      }
      loadAndSetSecureButton()
    }
  },
  {
    id: 'touchBlock',
    text: '允许不可信触摸(悬浮窗不遮挡点击)',
    onClick: () => {
      let permit = '0'
      if (contextData.trustedTouch) {
        permit = '1'
      }
      let result = $shizuku('settings put global block_untrusted_touches ' + permit)
      ui.textView.setText(JSON.stringify(result))
      if (result.code === 0) {
        ui.textView.setText(ui.textView.getText() + "\n权限设置成功")
      } else {
        ui.textView.setText(ui.textView.getText() + "\n权限设置失败")
      }
      loadAndSetTouchBlockStatus()
    }
  },
  {
    id: 'grantMedia',
    text: '获取截图权限',
    onClick: () => {
      let targetPermission = 'allow'
      if (contextData.mediaAllowed) {
        targetPermission = 'deny'
      }
      let result = $shizuku('appops set ' + context.getPackageName() + ' PROJECT_MEDIA ' + targetPermission)
      ui.textView.setText(JSON.stringify(result))
      if (result.code === 0) {
        ui.textView.setText(ui.textView.getText() + "\n权限设置成功")
      } else {
        ui.textView.setText(ui.textView.getText() + "\n权限设置失败")
      }
      loadAndSetMediaButton()
    }
  },
  {
    type: 'input',
    id: 'shellInput',
    text: '请输入shell命令',
    value: 'sh /sdcard/Android/data/com.omarea.vtools/up.sh'
  },
  {
    id: 'executeShell',
    text: '执行shell命令',
    onClick: () => {
      let shellCmd = ui.shellInput.getText()
      ui.run(() => {
        ui.textView.setText("执行命令：" + shellCmd)
      })
      let result = $shizuku(shellCmd)
      ui.run(() => {
        ui.textView.setText(ui.textView.getText() + "\n" + JSON.stringify(result))
      })
    }
  },
  {
    id: 'openSetting',
    text: '打开设置',
    ignoreShizuku: true,
    onClick: () => {
      app.startActivity(new Intent(android.provider.Settings.ACTION_DEVICE_INFO_SETTINGS))
    }
  },
  {
    id: 'openDevelop',
    text: '打开开发者选项',
    ignoreShizuku: true,
    onClick: () => {
      app.startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS))
    }
  }
]
ui.layout(
  `<frame>
    <vertical h="auto" align="center" margin="0 50">
      <linear gravity="center">
        <linear>
          <text w="56" gravity="center" color="#111111" size="16">x:</text>
          <input id="clickX" w="*" h="40" inputType="number" text="100" />
        </linear>
        <linear>
          <text w="56" gravity="center" color="#111111" size="16">y:</text>
          <input id="clickY" w="*" h="40" inputType="number" text="500" />
        </linear>
      </linear>
      <button id="click" text="点击操作" marginLeft="30" marginRight="30" marginTop="5" marginBottom="5" h="30" />
      <linear gravity="center" >
        <linear>
          <text w="100" gravity="center" color="#111111" size="16">结束点x:</text>
          <input id="endX" w="*" h="40" inputType="number" text="500" />
        </linear>
        <linear>
          <text w="100" gravity="center" color="#111111" size="16">结束点y:</text>
          <input id="endY" w="*" h="40" inputType="number" text="1200" />
        </linear>
      </linear>
      ${btns.map(btn => {
    if (btn.type === 'input') {
      return `<text gravity="left" color="#111111" size="16" marginLeft="10">${btn.text}:</text>
          <input id="${btn.id}" w="*" text="${btn.value}" marginLeft="10" marginRight="10" />`
    } else {
      return `<button id="${btn.id}" text="${btn.text}" marginLeft="30" marginRight="30" marginTop="5" marginBottom="5" h="30" />`
    }
  }).join('\n')}
      <linear gravity="center" align="center" >
        <button id="togglePointer" text="开启指针位置" marginLeft="10" marginRight="10" marginTop="5" marginBottom="5" h="30" />
        <button id="toggleTouches" text="开启触控反馈" marginLeft="10" marginRight="10" marginTop="5" marginBottom="5" h="30" />
      </linear>
      <text id="tips" text="shizuku可以执行一些高级的ADB命令，因此请勿随意执行来源不明的脚本，避免发生不必要的损失" marginLeft="10" marginRight="10" marginTop="5"/>
      <scroll>
        <text id="textView" text="" marginLeft="10" marginRight="10" marginTop="5" />
      </scroll>
    </vertical>
  </frame>`
);
if (!isRunning) {
  ui.run(function () {
    ui.tips.setText('当前未授权shizuku服务，无法执行，请在抽屉界面打开shizuku服务')
  })
}
// 设置按钮样式

// let rippleDrawable = new RippleDrawable(ColorStateList.valueOf(colors.parseColor('#144A2D')), shapeDrawable, null);
// shapeDrawable.setColor(ContextCompat.getColor(this, R.color.button_background_color)); // 按钮的背景色

btns.forEach(btn => {
  if (!btn.onClick) {
    return
  }
  setButtonStyle(ui[btn.id])
});
// setButtonStyle(ui.click)
// setButtonStyle(ui.togglePointer)
// setButtonStyle(ui.toggleTouches)
['click', 'togglePointer', 'toggleTouches'].forEach(btnId => {
  if (ui[btnId]) {
    setButtonStyle(ui[btnId])
  }
})

function setButtonStyle (btn) {
  let shapeDrawable = new GradientDrawable();
  shapeDrawable.setShape(GradientDrawable.RECTANGLE);
  let radius = util.java.array('float', 8)
  for (let i = 0; i < 8; i++) {
    radius[i] = 20
  }
  shapeDrawable.setCornerRadii(radius); // 调整这里的数值来控制圆角的大小
  shapeDrawable.setColor(colors.parseColor('#3FBE7B')); // 按钮的背景色
  shapeDrawable.setPadding(10, 10, 10, 10); // 调整这里的数值来控制按钮的内边距
  // shapeDrawable.setStroke(5, colors.parseColor('#FFEE00')); // 调整这里的数值来控制按钮的边框宽度和颜色
  btn.setShadowLayer(10, 5, 5, colors.parseColor('#888888'))
  btn.setBackground(new RippleDrawable(ColorStateList.valueOf(colors.parseColor('#27985C')), shapeDrawable, null))
}

function setEnabledStyle (id) {
  changeButtonStork(id, '#00FF2F')
}

function setDisabledStyle (id) {
  changeButtonStork(id, '#AA0022')
}

function changeButtonStork (id, color) {
  if (contextData[id]) {
    contextData[id].setStroke(5, colors.parseColor(color)); // 调整这里的数值来控制按钮的边框宽度和颜色
    return
  }
  let btn = ui[id]
  let shapeDrawable = new GradientDrawable();
  shapeDrawable.setShape(GradientDrawable.RECTANGLE);
  let radius = util.java.array('float', 8)
  for (let i = 0; i < 8; i++) {
    radius[i] = 20
  }
  shapeDrawable.setCornerRadii(radius); // 调整这里的数值来控制圆角的大小
  shapeDrawable.setColor(colors.parseColor('#3FBE7B')); // 按钮的背景色
  shapeDrawable.setPadding(10, 10, 10, 10); // 调整这里的数值来控制按钮的内边距
  shapeDrawable.setStroke(5, colors.parseColor(color)); // 调整这里的数值来控制按钮的边框宽度和颜色
  btn.setShadowLayer(10, 5, 5, colors.parseColor('#888888'))
  btn.setBackground(new RippleDrawable(ColorStateList.valueOf(colors.parseColor('#27985C')), shapeDrawable, null))
  contextData[id] = shapeDrawable
}


// 设置按钮点击事件

btns.forEach(btn => {
  if (isRunning || btn.ignoreShizuku) {
    if (!btn.onClick) {
      return
    }
    ui[btn.id].on('click', btn.onClick)
  }
})
if (isRunning) {
  ui.click.on('click', () => {
    let clickX = ui.clickX.getText(), clickY = ui.clickY.getText()
    threads.start(function () {
      $shizuku(`input tap ${clickX} ${clickY}`)
    })
  })
  ui.togglePointer.on('click', () => {
    if (isPointerEnabled()) {
      $shizuku('settings put system pointer_location 0')
      setDisabledStyle('togglePointer')
      ui.togglePointer.setText('开启指针位置')
    } else {
      $shizuku('settings put system pointer_location 1')
      setEnabledStyle('togglePointer')
      ui.togglePointer.setText('关闭指针位置')
    }
  })

  ui.toggleTouches.on('click', () => {
    if (isShowTouchesEnabled()) {
      $shizuku('settings put system show_touches 0')
      setDisabledStyle('toggleTouches')
      ui.toggleTouches.setText('开启触控反馈')
    } else {
      $shizuku('settings put system show_touches 1')
      setEnabledStyle('toggleTouches')
      ui.toggleTouches.setText('关闭触控反馈')
    }
  })

  if (isPointerEnabled()) {
    ui.run(function () {
      setEnabledStyle('togglePointer')
      ui.togglePointer.setText('关闭指针位置')
    })
  } else {
    ui.run(function () {
      setDisabledStyle('togglePointer')
    })
  }
  if (isShowTouchesEnabled()) {
    ui.run(function () {
      setEnabledStyle('toggleTouches')
      ui.toggleTouches.setText('关闭触控反馈')
    })
  } else {
    ui.run(function () {
      setDisabledStyle('toggleTouches')
    })
  }

  loadAndSetMediaButton()
  loadAndSetSecureButton()
  loadAndSetTouchBlockStatus()
}
function isPointerEnabled () {
  // 是否开启指针位置
  let enabled = $shizuku('settings get system pointer_location').result
  enabled = (enabled || '').replace(/\n/, '')
  return enabled == '1'
}

function isShowTouchesEnabled () {
  // 是否开启触控反馈
  let enabled = $shizuku('settings get system show_touches').result
  enabled = (enabled || '').replace(/\n/, '')
  return enabled == '1'
}

function loadAndSetMediaButton () {
  threads.start(function () {
    let result = $shizuku('appops get ' + context.getPackageName() + ' PROJECT_MEDIA')
    if (result.code == 0) {
      if (result.result.indexOf('allow') > -1) {
        contextData.mediaAllowed = true
      } else {
        contextData.mediaAllowed = false
      }
      ui.run(() => {
        if (contextData.mediaAllowed) {
          setEnabledStyle('grantMedia')
          ui.grantMedia.setText('撤销截图权限')
        } else {
          setDisabledStyle('grantMedia')
          ui.grantMedia.setText('授权截图权限')
        }
      })
    }
  })
}

function loadAndSetSecureButton () {
  threads.start(function () {
    ui.run(() => {
      ui.grantSecure.setText('加载中...')
    })
    let result = $shizuku('dumpsys -T 200 package ' + context.getPackageName() + ' | grep SECURE')
    if (result.code == 0) {
      contextData.secureGranted = result.result.indexOf('granted=true') > -1
      ui.run(() => {
        if (contextData.secureGranted) {
          setEnabledStyle('grantSecure')
          ui.grantSecure.setText('撤销Secure权限(自动授权无障碍用)')
        } else {
          setDisabledStyle('grantSecure')
          ui.grantSecure.setText('获取Secure权限(自动授权无障碍用)')
        }
      })
    } else {
      ui.run(() => {
        setDisabledStyle('grantSecure')
        ui.grantSecure.setText('获取Secure权限(自动授权无障碍用)')
      })
    }
  })
}


function loadAndSetTouchBlockStatus () {
  let result = $shizuku('settings get global block_untrusted_touches')
  if (result.code == 0) {
    ui.run(() => {
      ui.textView.setText('执行成功：' + JSON.stringify(result))
      if (result.result.indexOf('0') > -1) {
        contextData.trustedTouch = true
        setEnabledStyle('touchBlock')
        ui.touchBlock.setText('阻止不可信触摸(悬浮窗将遮挡点击)')
      } else {
        contextData.trustedTouch = false
        setDisabledStyle('touchBlock')
        ui.touchBlock.setText('允许不可信触摸(悬浮窗不遮挡点击)')
      }
    })
  } else {
    ui.run(() => {
      ui.textView.setText('执行失败：' + JSON.stringify(result))
    })
  }
}