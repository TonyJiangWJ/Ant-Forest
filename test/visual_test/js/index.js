/*
 * @Author: TonyJiangWJ
 * @Date: 2020-12-25 10:12:37
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-25 21:38:03
 * @Description: 
 */
const router = new VueRouter({
  routes: [
    { path: '/', component: Index },
    { path: '/image_balls', component: BallImageDataVisualTest },
    { path: '/common_image_test', component: CommonImageTest },
  ]
})

