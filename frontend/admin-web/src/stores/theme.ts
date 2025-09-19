import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore(
  'theme',
  () => {
    const isDark = ref(false)

    function toggleTheme() {
      isDark.value = !isDark.value
      updateTheme()
    }

    function setTheme(dark: boolean) {
      isDark.value = dark
      updateTheme()
    }

    function updateTheme() {
      if (isDark.value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }

    function initTheme() {
      updateTheme()
    }

    return {
      isDark,
      toggleTheme,
      setTheme,
      initTheme,
    }
  },
  {
    persist: {
      key: 'admin-theme',
    },
  }
)