import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Merchant, LoginForm } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const merchant = ref<Merchant | null>(null)
  const token = ref<string>('')
  const isLoggedIn = computed(() => !!token.value && !!merchant.value)
  
  // 登录
  const login = async (loginForm: LoginForm) => {
    try {
      // 这里模拟登录API调用
      const response = await uni.request({
        url: '/api/merchant/login',
        method: 'POST',
        data: loginForm
      })
      
      if (response.data.code === 200) {
        token.value = response.data.data.token
        merchant.value = response.data.data.merchant
        
        // 保存到本地存储
        uni.setStorageSync('merchant_token', token.value)
        uni.setStorageSync('merchant_info', merchant.value)
        
        if (loginForm.rememberMe) {
          uni.setStorageSync('remember_account', loginForm.account)
        } else {
          uni.removeStorageSync('remember_account')
        }
        
        return { success: true }
      } else {
        return { 
          success: false, 
          message: response.data.message || '登录失败' 
        }
      }
    } catch (error) {
      console.error('登录错误:', error)
      return { 
        success: false, 
        message: '网络错误，请稍后重试' 
      }
    }
  }
  
  // 登出
  const logout = async () => {
    try {
      // 调用登出API
      await uni.request({
        url: '/api/merchant/logout',
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token.value}`
        }
      })
    } catch (error) {
      console.error('登出API调用失败:', error)
    } finally {
      // 清除状态和本地存储
      token.value = ''
      merchant.value = null
      uni.removeStorageSync('merchant_token')
      uni.removeStorageSync('merchant_info')
      
      // 跳转到登录页
      uni.reLaunch({
        url: '/pages/login/index'
      })
    }
  }
  
  // 初始化认证状态
  const initAuth = () => {
    const savedToken = uni.getStorageSync('merchant_token')
    const savedMerchant = uni.getStorageSync('merchant_info')
    
    if (savedToken && savedMerchant) {
      token.value = savedToken
      merchant.value = savedMerchant
    }
  }
  
  // 更新商户信息
  const updateMerchant = (updatedMerchant: Partial<Merchant>) => {
    if (merchant.value) {
      merchant.value = { ...merchant.value, ...updatedMerchant }
      uni.setStorageSync('merchant_info', merchant.value)
    }
  }
  
  // 检查token是否有效
  const validateToken = async () => {
    if (!token.value) return false
    
    try {
      const response = await uni.request({
        url: '/api/merchant/validate',
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token.value}`
        }
      })
      
      return response.data.code === 200
    } catch (error) {
      console.error('Token验证失败:', error)
      return false
    }
  }
  
  // 获取记住的账号
  const getRememberedAccount = () => {
    return uni.getStorageSync('remember_account') || ''
  }
  
  return {
    // 状态
    merchant,
    token,
    isLoggedIn,
    
    // 方法
    login,
    logout,
    initAuth,
    updateMerchant,
    validateToken,
    getRememberedAccount
  }
})
