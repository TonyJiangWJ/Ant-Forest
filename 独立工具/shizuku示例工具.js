"ui";

let isRunning = $shizuku.isRunning()
if (!isRunning) {
  toast('当前未授权shizuku服务，无法执行，请在抽屉界面打开shizuku服务')
  exit()
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
      let result = $shizuku('pm grant ' + context.getPackageName() + ' android.permission.WRITE_SECURE_SETTINGS')
      ui.textView.setText(JSON.stringify(result))
    }
  },
  {
    id: 'grantMedia',
    text: '获取截图权限',
    onClick: () => {
      let result = $shizuku('appops set ' + context.getPackageName() + ' PROJECT_MEDIA allow')
      ui.textView.setText(JSON.stringify(result))
    }
  },
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
      <button id="click" text="点击操作" />
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
      ${btns.map(btn => `<button id="${btn.id}" text="${btn.text}" />`).join('\n')}
      <linear gravity="center" align="center" >
        <button id="togglePointer" text="开启指针位置" />
        <button id="toggleTouches" text="开启触控反馈" />
      </linear>
      <text id="tips" text="shizuku可以执行一些高级的ADB命令，因此请勿随意执行来源不明的脚本，避免发生不必要的损失" />
      <scroll>
        <text id="textView" text="" />
      </scroll>
    </vertical>
  </frame>`
);
btns.forEach(btn => {
  ui[btn.id].on('click', btn.onClick)
})
ui.click.on('click', () => {
  let clickX = ui.clickX.getText(), clickY = ui.clickY.getText()
  threads.start(function () {
    $shizuku(`input tap ${clickX} ${clickY}`)
  })
})


ui.togglePointer.on('click', () => {
  if (isPointerEnabled()) {
    $shizuku('settings put system pointer_location 0')
    ui.togglePointer.setText('开启指针位置')
  } else {
    $shizuku('settings put system pointer_location 1')
    ui.togglePointer.setText('关闭指针位置')
  }
})


ui.toggleTouches.on('click', () => {
  if (isShowTouchesEnabled()) {
    $shizuku('settings put system show_touches 0')
    ui.toggleTouches.setText('开启触控反馈')
  } else {
    $shizuku('settings put system show_touches 1')
    ui.toggleTouches.setText('关闭触控反馈')
  }
})

if (isPointerEnabled()) {
  ui.run(function () {
    ui.togglePointer.setText('关闭指针位置')
  })
}
if (isShowTouchesEnabled()) {
  ui.run(function () {
    ui.toggleTouches.setText('关闭触控反馈')
  })
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