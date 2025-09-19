import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore(
  'app',
  () => {
    // 侧边栏折叠状态
    const sidebarCollapse = ref(false)
    
    // 设备类型
    const device = ref<'desktop' | 'mobile'>('desktop')
    
    // 页面加载状态
    const pageLoading = ref(false)

    // 切换侧边栏
    function toggleSidebar() {
      sidebarCollapse.value = !sidebarCollapse.value
    }

    // 设置侧边栏状态
    function setSidebarCollapse(collapse: boolean) {
      sidebarCollapse.value = collapse
    }

    // 设置设备类型
    function setDevice(type: 'desktop' | 'mobile') {
      device.value = type
      // 移动端自动折叠侧边栏
      if (type === 'mobile') {
        sidebarCollapse.value = true
      }
    }

    // 设置页面加载状态
    function setPageLoading(loading: boolean) {
      pageLoading.value = loading
    }

    return {
      sidebarCollapse,
      device,
      pageLoading,
      toggleSidebar,
      setSidebarCollapse,
      setDevice,
      setPageLoading,
    }
  },
  {
    persist: {
      key: 'admin-app',
      paths: ['sidebarCollapse'],
    },
  }
)