function CanvasDrawer (canvas, paint, offset) {
  this.canvas = canvas
  if (!paint) {
    let Typeface = android.graphics.Typeface
    paint = new Paint()
    paint.setStrokeWidth(1)
    paint.setTypeface(Typeface.DEFAULT_BOLD)
    paint.setTextAlign(Paint.Align.LEFT)
    paint.setAntiAlias(true)
    paint.setStrokeJoin(Paint.Join.ROUND)
    paint.setDither(true)
    paint.setTextSize(30)
  }
  this.paint = paint
  offset = offset || 0

  this.color = '#ffffff'
  this.textSize = 20

  this.drawText = function (text, position, color, textSize) {
    this.color = color || this.color
    this.textSize = textSize || this.textSize
    drawText(text, position, this.canvas, this.paint, this.color, this.textSize)
  }

  this.drawRectAndText = function (text, position, color, textSize) {
    this.color = color || this.color
    this.textSize = textSize || this.textSize
    this.paint.setTextSize(this.textSize)
    drawRectAndText(text, position, this.color, this.canvas, this.paint)
  }

  this.drawCircleAndText = function (text, circleInfo, color, textSize) {
    this.color = color || this.color
    this.textSize = textSize || this.textSize
    this.paint.setTextSize(this.textSize)
    drawCircleAndText(text, circleInfo, this.color, this.canvas, this.paint)
  }

  function convertArrayToRect (a) {
    // origin array left top width height
    // left top right bottom
    return new android.graphics.Rect(a[0], a[1] + offset, (a[0] + a[2]), (a[1] + offset + a[3]))
  }

  function getPositionDesc (position) {
    return position[0] + ', ' + position[1] + ' w:' + position[2] + ',h:' + position[3]
  }

  function getRectCenter (position) {
    return {
      x: parseInt(position[0] + position[2] / 2),
      y: parseInt(position[1] + position[3] / 2)
    }
  }

  function drawRectAndText (desc, position, colorStr, canvas, paint) {
    let color = colors.parseColor(colorStr)

    paint.setStrokeWidth(1)
    paint.setStyle(Paint.Style.STROKE)
    paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
    canvas.drawRect(convertArrayToRect(position), paint)
    paint.setStrokeWidth(1)
    paint.setTextSize(20)
    paint.setStyle(Paint.Style.FILL)
    // 文字背景阴影色
    paint.setARGB(255, 136, 136, 136)
    canvas.drawText(desc, position[0] + 2, position[1] + offset - 2, paint)
    // 为文字设置反色
    paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
    canvas.drawText(desc, position[0], position[1] + offset, paint)
    paint.setTextSize(10)
    paint.setStrokeWidth(1)
    paint.setARGB(255, 0, 0, 0)
  }

  function drawCircleAndText (desc, circleInfo, colorStr, canvas, paint) {
    let color = colors.parseColor(colorStr)

    // 文字背景阴影色
    paint.setARGB(255, 136, 136, 136)
    drawText(desc, { x: circleInfo.x + 2, y: circleInfo.y - 2 }, canvas, paint)
    // 文字反色
    paint.setARGB(255, 255 - (color >> 16 & 0xff), 255 - (color >> 8 & 0xff), 255 - (color & 0xff))
    drawText(desc, { x: circleInfo.x, y: circleInfo.y }, canvas, paint)
    paint.setStrokeWidth(3)
    paint.setStyle(Paint.Style.STROKE)
    paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
    canvas.drawCircle(circleInfo.x, circleInfo.y + offset, circleInfo.radius, paint)
  }

  function drawText (text, position, canvas, paint, colorStr, textSize) {
    textSize = textSize || 20
    paint.setStrokeWidth(1)
    paint.setStyle(Paint.Style.FILL)
    paint.setTextSize(textSize)

    // 文字背景阴影色
    paint.setARGB(255, 136, 136, 136)
    canvas.drawText(text, position.x + 2, position.y + offset - 2, paint)
    if (colorStr) {
      let color = colors.parseColor(colorStr)
      paint.setARGB(255, color >> 16 & 0xff, color >> 8 & 0xff, color & 0xff)
    } else {
      paint.setARGB(255, 0, 0, 255)
    }
    canvas.drawText(text, position.x, position.y + offset, paint)
  }

  function drawCoordinateAxis (canvas, paint) {
    let width = canvas.width
    let height = canvas.height
    paint.setStyle(Paint.Style.FILL)
    paint.setTextSize(10)
    let colorVal = colors.parseColor('#65f4fb')
    paint.setARGB(255, colorVal >> 16 & 0xFF, colorVal >> 8 & 0xFF, colorVal & 0xFF)
    for (let x = 50; x < width; x += 50) {
      paint.setStrokeWidth(0)
      canvas.drawText(x, x, 10 + offset, paint)
      paint.setStrokeWidth(0.5)
      canvas.drawLine(x, 0, x + offset, height, paint)
    }

    for (let y = 50; y < height; y += 50) {
      paint.setStrokeWidth(0)
      canvas.drawText(y, 0, y + offset, paint)
      paint.setStrokeWidth(0.5)
      canvas.drawLine(0, y + offset, width, y + offset, paint)
    }
  }
}

module.exports = CanvasDrawer