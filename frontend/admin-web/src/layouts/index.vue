<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="sidebarWidth" class="layout-sidebar">
      <div class="sidebar-logo" @click="router.push('/')">
        <div class="logo-icon">M</div>
        <transition name="el-fade-in">
          <div v-if="!appStore.sidebarCollapse" class="logo-title">管理平台</div>
        </transition>
      </div>
      <el-scrollbar>
        <el-menu
          :default-active="activeMenu"
          :collapse="appStore.sidebarCollapse"
          :unique-opened="true"
          :collapse-transition="false"
          router
        >
          <sidebar-item
            v-for="route in menuRoutes"
            :key="route.path"
            :item="route"
            :base-path="route.path"
          />
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container>
      <!-- 顶部导航 -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon class="sidebar-toggle" @click="appStore.toggleSidebar">
            <component :is="appStore.sidebarCollapse ? 'Expand' : 'Fold'" />
          </el-icon>
          <breadcrumb />
        </div>
        <div class="header-right">
          <el-tooltip content="刷新" placement="bottom">
            <el-icon class="header-icon" @click="refreshPage">
              <Refresh />
            </el-icon>
          </el-tooltip>
          <el-tooltip content="全屏" placement="bottom">
            <el-icon class="header-icon" @click="toggleFullscreen">
              <FullScreen />
            </el-icon>
          </el-tooltip>
          <el-tooltip :content="themeStore.isDark ? '浅色模式' : '深色模式'" placement="bottom">
            <el-icon class="header-icon" @click="themeStore.toggleTheme">
              <component :is="themeStore.isDark ? 'Sunny' : 'Moon'" />
            </el-icon>
          </el-tooltip>
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" :src="userStore.userInfo?.avatar">
                {{ userStore.userInfo?.nickname?.charAt(0) }}
              </el-avatar>
              <span class="user-name">{{ userStore.userInfo?.nickname }}</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <div class="user-dropdown-info">
                    <div class="info-name">{{ userStore.userInfo?.nickname }}</div>
                    <div class="info-role">{{ userStore.userInfo?.role }}</div>
                  </div>
                </el-dropdown-item>
                <el-dropdown-item divided command="profile">
                  <el-icon><User /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <el-icon><Lock /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="layout-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <keep-alive :include="cachedViews">
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { dynamicRoutes } from '@/router'
import SidebarItem from './components/SidebarItem.vue'
import Breadcrumb from './components/Breadcrumb.vue'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const themeStore = useThemeStore()

// 侧边栏宽度
const sidebarWidth = computed(() => {
  return appStore.sidebarCollapse ? '64px' : '240px'
})

// 当前激活的菜单
const activeMenu = computed(() => {
  const { meta, path } = route
  if (meta.activeMenu) {
    return meta.activeMenu as string
  }
  return path
})

// 菜单路由
const menuRoutes = computed(() => {
  return dynamicRoutes.filter((route) => !route.meta?.hidden)
})

// 缓存的视图
const cachedViews = ref<string[]>(['Dashboard'])

// 刷新页面
const refreshPage = () => {
  router.go(0)
}

// 全屏切换
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }
}

// 处理下拉菜单命令
const handleCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'password':
      router.push('/password')
      break
    case 'logout':
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
      await userStore.logout()
      break
  }
}
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
}

.layout-sidebar {
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  transition: width $transition-duration;

  .sidebar-logo {
    height: $header-height;
    display: flex;
    align-items: center;
    padding: 0 20px;
    cursor: pointer;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, $primary-color, #764ba2);
      border-radius: $radius-base;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 20px;
      font-weight: bold;
      flex-shrink: 0;
    }

    .logo-title {
      margin-left: 12px;
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      white-space: nowrap;
    }
  }

  :deep(.el-menu) {
    border: none;
    background-color: transparent;

    .el-menu-item,
    .el-sub-menu__title {
      height: 48px;
      line-height: 48px;

      &:hover {
        background-color: var(--el-fill-color-light);
      }
    }

    .el-menu-item.is-active {
      background-color: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
    }
  }
}

.layout-header {
  height: $header-height;
  padding: 0 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .header-left {
    display: flex;
    align-items: center;

    .sidebar-toggle {
      font-size: 20px;
      cursor: pointer;
      margin-right: 20px;

      &:hover {
        color: var(--el-color-primary);
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-icon {
      font-size: 18px;
      cursor: pointer;
      padding: 8px;
      border-radius: $radius-base;
      transition: all $transition-duration;

      &:hover {
        background-color: var(--el-fill-color-light);
        color: var(--el-color-primary);
      }
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: $radius-base;
      transition: background-color $transition-duration;

      &:hover {
        background-color: var(--el-fill-color-light);
      }

      .user-name {
        font-size: 14px;
        color: var(--el-text-color-primary);
      }
    }
  }
}

.layout-main {
  background-color: var(--el-bg-color-page);
  padding: $spacing-lg;
}

.user-dropdown-info {
  padding: 8px 0;

  .info-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .info-role {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}
</style>