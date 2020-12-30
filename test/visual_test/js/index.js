/*
 * @Author: TonyJiangWJ
 * @Date: 2020-12-25 10:12:37
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-30 09:17:18
 * @Description: 
 */
const router = new VueRouter({
  routes: [
    { path: '/', component: Index },
    { path: '/image_balls', component: BallImageDataVisualTest },
    { path: '/ball_detect', component: BallDetectVisualTest },
    { path: '/common_image_test', component: CommonImageTest },
  ]
})

