import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/admin'
    },
    {
        path: '/edit/:id?',
        name: 'edit',
        component: () => import('../views/EditorPage.vue'),
        meta: {
            // 这个页面需要登录后才能访问。
            requiresAuth: true
        }
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('../views/Login.vue'),
        meta: {
            // 登录页是公开页面，未登录用户可以访问。
            requiresAuth: false
        }
    },
    {
        path: '/admin',
        name: 'admin',
        component: () => import('../views/adminPage.vue'),
        meta: {
            // 文档管理页需要登录后才能访问。
            requiresAuth: true
        }
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

router.beforeEach((to) => {
    // 登录成功后，你的 auth store 会把 token 写入 localStorage。
    // 这里直接读 localStorage，而不是 useAuthStore()，是为了避免 router 初始化早于 Pinia 安装时产生时序问题。
    const accessToken = localStorage.getItem('accessToken')

    // 只要目标路由的 meta.requiresAuth === true，就认为它是受保护页面。
    // 目前 /admin 和 /edit/:id? 都是受保护页面。
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

    // 情况 1：用户访问受保护页面，但本地没有 accessToken。
    // 这说明用户没有登录，或者登录信息已经被清掉。
    // 此时跳转到登录页，并用 query.redirect 记住原本想去的地址。
    if (requiresAuth && !accessToken) {
        return {
            path: '/login',
            query: {
                redirect: to.fullPath
            }
        }
    }

    // 情况 2：用户已经登录，还访问 /login。
    // 这种情况通常发生在用户手动输入 /login，或者登录成功后又回退。
    // 这里直接送回首页，首页又会重定向到 /admin。
    if (to.path === '/login' && accessToken) {
        return '/'
    }

    // 其他情况正常放行。
    return true
})

export default router
