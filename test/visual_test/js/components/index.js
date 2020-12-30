/*
 * @Author: TonyJiangWJ
 * @Date: 2020-12-25 10:12:37
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-30 20:40:06
 * @Description: 
 */
let Index = {
  mixins: [mixin_methods],
  data: function () {
    return {}
  },
  template: '<div>\
    <tip-block>可视化辅助工具</tip-block>\
    <van-row type="flex" justify="center" style="margin: 1.5rem 0;">\
      <router-link to="/image_balls"><van-button plain hairline type="primary">能量球校验</van-button></router-link>\
    </van-row>\
    <van-row type="flex" justify="center" style="margin: 1.5rem 0;">\
      <router-link to="/ball_detect"><van-button plain hairline type="primary">能量球识别</van-button></router-link>\
    </van-row>\
    <van-row type="flex" justify="center" style="margin: 1.5rem 0;">\
      <router-link to="/common_image_test"><van-button plain hairline type="primary">通用图片测试工具</van-button></router-link>\
    </van-row>\
  </div>'
}