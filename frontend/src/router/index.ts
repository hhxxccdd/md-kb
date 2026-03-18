//导入路由核心方法 + Ts类型越苏
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

//定义路由规则数组
const routes:Array<RouteRecordRaw> = [
    //重定向：默认/跳转到/home
    {
        path:'/',
        redirect:'/edit'
    },
    {
        path:'/edit',
        name:'edit',
        component:() => import('../views/EditorPage.vue')
    },
    {
         path:'/test',
        name:'test',
        component:() => import('../views/seeTest.vue')
    }
]

const router = createRouter({
    history:createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router
