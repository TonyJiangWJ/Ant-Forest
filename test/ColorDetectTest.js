/*
 * @Author: TonyJiangWJ
 * @Date: 2019-12-04 18:09:36
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-12-04 21:39:34
 * @Description: 
 */
let ImgBasedFriendListScanner = require('../core/ImgBasedFriendListScanner')
requestScreenCapture(false)
let scanner = new ImgBasedFriendListScanner()
scanner.start()
// var paint = new Paint();
// //设置画笔为填充，则绘制出来的图形都是实心的
// paint.setStyle(Paint.STYLE.FILL);
// //设置画笔颜色为红色
// paint.setColor(colors.RED);
// //绘制一个从坐标(0, 0)到坐标(100, 100)的正方形
// canvas.drawRect(0, 0, 100, 100, paint);
sleep(2000)
log('再见') 