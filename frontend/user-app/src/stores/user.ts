/**
 * 用户状态管理
 * @description 使用Pinia管理用户登录状态、用户信息、积分余额
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { userService } from '@/services/user'
import { STORAGE_KEYS } from '@/constants'

export const useUserStore = defineStore('user', () => {
  // ============================= 状态 =============================
  
  /** 用户信息 */
  const userInfo = ref<User | null>(null)
  
  /** 登录状态 */
  const isLoggedIn = ref(false)
  
  /** 加载状态 */
  const loading = ref(false)

  // ============================= 计算属性 =============================
  
  /** 是否为VIP用户 */
  const isVip = computed(() => userInfo.value?.isVip || false)
  
  /** VIP等级 */
  const vipLevel = computed(() => userInfo.value?.vipLevel || 0)
  
  /** 积分余额 */
  const points = computed(() => userInfo.value?.points || 0)
  
  /** 余额 */
  const balance = computed(() => userInfo.value?.balance || 0)
  
  /** 用户显示名称 */
  const displayName = computed(() => userInfo.value?.nickname || '用户')
  
  /** 用户头像 */
  const avatar = computed(() => userInfo.value?.avatar || '')

  // ============================= 方法 =============================
  
  /**
   * 初始化用户状态
   */
  function initUserState() {
    const token = uni.getStorageSync(STORAGE_KEYS.ACCESS_TOKEN)
    const cachedUserInfo = uni.getStorageSync(STORAGE_KEYS.USER_INFO)
    
    if (token && cachedUserInfo) {
      isLoggedIn.value = true
      userInfo.value = cachedUserInfo
    }
  }

  /**
   * 从本地存储加载用户信息
   * @alias initUserState
   */
  function loadUserFromStorage() {
    return initUserState()
  }

  /**
   * 登录
   */
  async function login(phone: string, password: string) {
    loading.value = true
    try {
      const response = await userService.login({
        phone,
        password,
        type: 'password'
      })
      
      isLoggedIn.value = true
      userInfo.value = response.user
      
      return response
    } finally {
      loading.value = false
    }
  }

  /**
   * 微信登录
   */
  async function wechatLogin() {
    loading.value = true
    try {
      const response = await userService.wechatLogin()
      
      isLoggedIn.value = true
      userInfo.value = response.user
      
      return response
    } finally {
      loading.value = false
    }
  }

  /**
   * 注册
   */
  async function register(params: {
    phone: string
    password: string
    nickname: string
    verificationCode: string
  }) {
    loading.value = true
    try {
      const response = await userService.register({
        ...params,
        userType: 'user'
      })
      
      isLoggedIn.value = true
      userInfo.value = response.user
      
      return response
    } finally {
      loading.value = false
    }
  }

  /**
   * 退出登录
   */
  async function logout() {
    loading.value = true
    try {
      await userService.logout()
    } finally {
      isLoggedIn.value = false
      userInfo.value = null
      loading.value = false
    }
  }

  /**
   * 刷新用户信息
   */
  async function refreshUserInfo() {
    if (!isLoggedIn.value) return
    
    try {
      const user = await userService.getUserProfile()
      userInfo.value = user
      return user
    } catch (error) {
      console.error('刷新用户信息失败:', error)
      throw error
    }
  }

  /**
   * 更新用户信息
   */
  async function updateUserInfo(params: { nickname?: string; avatar?: string }) {
    if (!isLoggedIn.value) return
    
    loading.value = true
    try {
      const user = await userService.updateUserProfile(params)
      userInfo.value = user
      return user
    } finally {
      loading.value = false
    }
  }

  /**
   * 检查用户权限
   */
  function checkPermission(permission: string): boolean {
    return userService.checkPermission(permission)
  }

  /**
   * 获取用户价格（根据VIP等级）
   */
  function getUserPrice(originalPrice: number, vipPrice?: number): number {
    return userService.getCurrentPrice(originalPrice, vipPrice)
  }

  /**
   * 确保用户已登录
   */
  async function ensureLoggedIn() {
    if (!isLoggedIn.value) {
      uni.reLaunch({
        url: '/pages/auth/login'
      })
      throw new Error('用户未登录')
    }
    
    try {
      await refreshUserInfo()
    } catch (error) {
      // 如果刷新失败，可能是token过期，跳转到登录页
      await logout()
      uni.reLaunch({
        url: '/pages/auth/login'
      })
      throw error
    }
  }

  // ============================= 持久化 =============================
  
  /**
   * 持久化状态
   */
  function persistState() {
    if (userInfo.value) {
      uni.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo.value)
    }
  }

  /**
   * 清除持久化状态
   */
  function clearPersistedState() {
    uni.removeStorageSync(STORAGE_KEYS.USER_INFO)
    uni.removeStorageSync(STORAGE_KEYS.ACCESS_TOKEN)
    uni.removeStorageSync(STORAGE_KEYS.REFRESH_TOKEN)
  }

  // 监听用户信息变化，自动持久化
  function $subscribe() {
    // Pinia会自动处理订阅
  }

  return {
    // 状态
    userInfo,
    isLoggedIn,
    loading,
    
    // 计算属性
    isVip,
    vipLevel,
    points,
    balance,
    displayName,
    avatar,
    
    // 方法
    initUserState,
    loadUserFromStorage,
    login,
    wechatLogin,
    register,
    logout,
    refreshUserInfo,
    updateUserInfo,
    checkPermission,
    getUserPrice,
    ensureLoggedIn,
    persistState,
    clearPersistedState,
  }
})
