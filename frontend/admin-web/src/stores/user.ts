import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login, logout, getUserInfo } from '@/api/auth'
import { ElMessage } from 'element-plus'
import router from '@/router'

export interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar?: string
  email?: string
  phone?: string
  role: string
  permissions: string[]
  createdAt: string
}

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref<string>('')
    const userInfo = ref<UserInfo | null>(null)

    // 登录
    async function userLogin(loginForm: { username: string; password: string }) {
      try {
        const res = await login(loginForm)
        token.value = res.data.token
        await getUserInfoAction()
        ElMessage.success('登录成功')
        router.push({ name: 'Dashboard' })
      } catch (error: any) {
        ElMessage.error(error.message || '登录失败')
        throw error
      }
    }

    // 获取用户信息
    async function getUserInfoAction() {
      try {
        const res = await getUserInfo()
        userInfo.value = res.data
      } catch (error) {
        throw error
      }
    }

    // 退出登录
    async function userLogout() {
      try {
        await logout()
      } catch (error) {
        console.error('退出登录失败', error)
      } finally {
        token.value = ''
        userInfo.value = null
        router.push({ name: 'Login' })
        ElMessage.success('已退出登录')
      }
    }

    // 清除用户信息（用于被动退出）
    function clearUserInfo() {
      token.value = ''
      userInfo.value = null
    }

    return {
      token,
      userInfo,
      login: userLogin,
      getUserInfo: getUserInfoAction,
      logout: userLogout,
      clearUserInfo,
    }
  },
  {
    persist: {
      key: 'admin-user',
      paths: ['token'],
    },
  }
)