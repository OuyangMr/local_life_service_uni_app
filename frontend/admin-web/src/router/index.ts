import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

// 静态路由
const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: {
      title: '登录',
      hidden: true,
      requiresAuth: false,
    },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: {
      title: '404',
      hidden: true,
      requiresAuth: false,
    },
  },
]

// 动态路由
export const dynamicRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '数据看板',
          icon: 'DataAnalysis',
          affix: true,
        },
      },
    ],
  },
  {
    path: '/merchant',
    component: () => import('@/layouts/index.vue'),
    redirect: '/merchant/list',
    meta: {
      title: '商户管理',
      icon: 'Shop',
    },
    children: [
      {
        path: 'list',
        name: 'MerchantList',
        component: () => import('@/views/merchant/list.vue'),
        meta: {
          title: '商户列表',
        },
      },
      {
        path: 'audit',
        name: 'MerchantAudit',
        component: () => import('@/views/merchant/audit.vue'),
        meta: {
          title: '商户审核',
        },
      },
    ],
  },
  {
    path: '/user',
    component: () => import('@/layouts/index.vue'),
    redirect: '/user/list',
    meta: {
      title: '用户管理',
      icon: 'User',
    },
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: () => import('@/views/user/list.vue'),
        meta: {
          title: '用户列表',
        },
      },
      {
        path: 'level',
        name: 'UserLevel',
        component: () => import('@/views/user/level.vue'),
        meta: {
          title: '会员等级',
        },
      },
    ],
  },
  {
    path: '/order',
    component: () => import('@/layouts/index.vue'),
    redirect: '/order/list',
    meta: {
      title: '订单管理',
      icon: 'DocumentCopy',
    },
    children: [
      {
        path: 'list',
        name: 'OrderList',
        component: () => import('@/views/order/list.vue'),
        meta: {
          title: '订单列表',
        },
      },
      {
        path: 'refund',
        name: 'OrderRefund',
        component: () => import('@/views/order/refund.vue'),
        meta: {
          title: '退款处理',
        },
      },
    ],
  },
  {
    path: '/finance',
    component: () => import('@/layouts/index.vue'),
    redirect: '/finance/transaction',
    meta: {
      title: '财务管理',
      icon: 'Wallet',
    },
    children: [
      {
        path: 'transaction',
        name: 'Transaction',
        component: () => import('@/views/finance/transaction.vue'),
        meta: {
          title: '交易流水',
        },
      },
      {
        path: 'settlement',
        name: 'Settlement',
        component: () => import('@/views/finance/settlement.vue'),
        meta: {
          title: '商户结算',
        },
      },
      {
        path: 'report',
        name: 'FinanceReport',
        component: () => import('@/views/finance/report.vue'),
        meta: {
          title: '财务报表',
        },
      },
    ],
  },
  {
    path: '/marketing',
    component: () => import('@/layouts/index.vue'),
    redirect: '/marketing/coupon',
    meta: {
      title: '营销管理',
      icon: 'Present',
    },
    children: [
      {
        path: 'coupon',
        name: 'Coupon',
        component: () => import('@/views/marketing/coupon.vue'),
        meta: {
          title: '优惠券管理',
        },
      },
      {
        path: 'activity',
        name: 'Activity',
        component: () => import('@/views/marketing/activity.vue'),
        meta: {
          title: '活动管理',
        },
      },
      {
        path: 'points',
        name: 'Points',
        component: () => import('@/views/marketing/points.vue'),
        meta: {
          title: '积分管理',
        },
      },
    ],
  },
  {
    path: '/content',
    component: () => import('@/layouts/index.vue'),
    redirect: '/content/banner',
    meta: {
      title: '内容管理',
      icon: 'Document',
    },
    children: [
      {
        path: 'banner',
        name: 'Banner',
        component: () => import('@/views/content/banner.vue'),
        meta: {
          title: '轮播图管理',
        },
      },
      {
        path: 'notice',
        name: 'Notice',
        component: () => import('@/views/content/notice.vue'),
        meta: {
          title: '公告管理',
        },
      },
      {
        path: 'help',
        name: 'Help',
        component: () => import('@/views/content/help.vue'),
        meta: {
          title: '帮助中心',
        },
      },
    ],
  },
  {
    path: '/system',
    component: () => import('@/layouts/index.vue'),
    redirect: '/system/admin',
    meta: {
      title: '系统设置',
      icon: 'Setting',
    },
    children: [
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('@/views/system/admin.vue'),
        meta: {
          title: '管理员管理',
        },
      },
      {
        path: 'role',
        name: 'Role',
        component: () => import('@/views/system/role.vue'),
        meta: {
          title: '角色管理',
        },
      },
      {
        path: 'log',
        name: 'Log',
        component: () => import('@/views/system/log.vue'),
        meta: {
          title: '操作日志',
        },
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('@/views/system/config.vue'),
        meta: {
          title: '系统配置',
        },
      },
    ],
  },
  // 404 路由放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    meta: {
      hidden: true,
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...staticRoutes, ...dynamicRoutes],
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const token = userStore.token
  const requiresAuth = to.meta.requiresAuth !== false

  // 设置页面标题
  document.title = `${to.meta.title || '管理后台'} - 本地生活服务管理平台`

  if (requiresAuth) {
    if (!token) {
      ElMessage.warning('请先登录')
      next({ name: 'Login', query: { redirect: to.fullPath } })
    } else {
      // 如果还没有用户信息，获取用户信息
      if (!userStore.userInfo) {
        try {
          await userStore.getUserInfo()
          next()
        } catch (error) {
          userStore.logout()
          ElMessage.error('获取用户信息失败，请重新登录')
          next({ name: 'Login' })
        }
      } else {
        next()
      }
    }
  } else {
    // 如果已登录且访问登录页，重定向到首页
    if (token && to.name === 'Login') {
      next({ name: 'Dashboard' })
    } else {
      next()
    }
  }
})

export default router