module.exports = function (buttonWindow, handleClick, handleDown, handleUp) {
  this.eventStartX = null
  this.eventStartY = null
  this.windowStartX = buttonWindow.getX()
  this.windowStartY = buttonWindow.getY()
  this.eventKeep = false
  this.eventMoving = false
  this.touchDownTime = new Date().getTime()

  this.createListener = function () {
    let _this = this
    return new android.view.View.OnTouchListener((view, event) => {
      try {
        switch (event.getAction()) {
          case event.ACTION_DOWN:
            handleDown && handleDown()
            _this.eventStartX = event.getRawX();
            _this.eventStartY = event.getRawY();
            _this.windowStartX = buttonWindow.getX();
            _this.windowStartY = buttonWindow.getY();
            _this.eventKeep = true; //按下,开启计时
            _this.touchDownTime = new Date().getTime()
            break;
          case event.ACTION_MOVE:
            var sx = event.getRawX() - _this.eventStartX;
            var sy = event.getRawY() - _this.eventStartY;
            if (!_this.eventMoving && _this.eventKeep && getDistance(sx, sy) >= 10) {
              _this.eventMoving = true;
            }
            if (_this.eventMoving && _this.eventKeep) {
              ui.post(() => {
                buttonWindow.setPosition(_this.windowStartX + sx, _this.windowStartY + sy);
              })
            }
            break;
          case event.ACTION_UP:
            handleUp && handleUp()
            if (!_this.eventMoving && _this.eventKeep && _this.touchDownTime > new Date().getTime() - 1000) {
              handleClick && handleClick()
            }
            _this.eventKeep = false;
            _this.touchDownTime = 0;
            _this.eventMoving = false;
            break;
        }
      } catch (e) {
        console.error('异常' + e)
      }
      return true;
    })
  }
}

function getDistance(dx, dy) {
  return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
}