/**
 * 用户服务
 * @description 实现用户登录、获取用户信息、等级管理、积分查询等功能
 */

import { apiService } from './api'
import type {
  LoginRequest, LoginResponse, RegisterRequest, SendSmsRequest,
  ResetPasswordRequest, RefreshTokenResponse, UpdateUserRequest,
  UserStatsResponse, PointRecordListRequest, PointStatsResponse
} from '@/types/api'
import type { User, PointRecord } from '@/types'
import { API_ENDPOINTS, STORAGE_KEYS } from '@/constants'

class UserService {
  // ============================= 认证相关 =============================

  /**
   * 用户登录
   */
  async login(params: LoginRequest): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      params,
      { showLoading: true, loadingText: '登录中...' }
    )

    // 保存认证信息
    if (response.success) {
      const { user, tokens } = response.data
      uni.setStorageSync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
      uni.setStorageSync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
      uni.setStorageSync(STORAGE_KEYS.USER_INFO, user)
      return response.data
    } else {
      throw new Error(response.message || '登录失败')
    }
  }

  /**
   * 用户注册
   */
  async register(params: RegisterRequest): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      params,
      { showLoading: true, loadingText: '注册中...' }
    )

    // 保存认证信息
    if (response.success) {
      const { user, tokens } = response.data
      uni.setStorageSync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
      uni.setStorageSync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
      uni.setStorageSync(STORAGE_KEYS.USER_INFO, user)
    }

    return response.data
  }

  /**
   * 发送短信验证码
   */
  async sendSmsCode(params: SendSmsRequest): Promise<{ code?: string }> {
    const response = await apiService.post<{ code?: string }>(
      '/auth/send-sms',
      params,
      { showLoading: true, loadingText: '发送中...' }
    )
    return response.data
  }

  /**
   * 验证短信验证码
   */
  async verifySmsCode(phone: string, code: string): Promise<boolean> {
    const response = await apiService.post<{ valid: boolean }>(
      '/auth/verify-sms',
      { phone, code }
    )
    return response.data?.valid || false
  }

  /**
   * 重置密码
   */
  async resetPassword(params: ResetPasswordRequest): Promise<void> {
    await apiService.post(
      '/auth/reset-password',
      params,
      { showLoading: true, loadingText: '重置密码中...' }
    )
  }

  /**
   * 刷新Token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = uni.getStorageSync(STORAGE_KEYS.REFRESH_TOKEN)
    if (!refreshToken) {
      throw new Error('无刷新令牌')
    }

    const response = await apiService.post<RefreshTokenResponse>(
      '/auth/refresh-token',
      { refreshToken }
    )

    // 更新tokens
    if (response.success) {
      uni.setStorageSync(STORAGE_KEYS.ACCESS_TOKEN, response.data.accessToken)
      if (response.data.refreshToken) {
        uni.setStorageSync(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken)
      }
    }

    return response.data
  }

  /**
   * 退出登录
   */
  async logout(): Promise<void> {
    try {
      await apiService.post(API_ENDPOINTS.AUTH.LOGOUT)
    } catch (error) {
      // 忽略退出登录的错误
      console.warn('Logout API error:', error)
    } finally {
      // 清除本地存储
      this.clearAuthData()
    }
  }

  /**
   * 微信小程序授权登录
   */
  async wechatLogin(): Promise<LoginResponse> {
    return new Promise((resolve, reject) => {
      // 获取微信授权码
      uni.login({
        provider: 'weixin',
        success: async (loginRes) => {
          try {
            const response = await this.login({
              phone: '',
              code: loginRes.code,
              type: 'wechat'
            })
            resolve(response)
          } catch (error) {
            reject(error)
          }
        },
        fail: reject
      })
    })
  }

  /**
   * 获取微信用户信息
   */
  async getWechatUserInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      uni.getUserInfo({
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: reject
      })
    })
  }

  // ============================= 用户信息管理 =============================

  /**
   * 获取用户信息
   */
  async getUserProfile(): Promise<User> {
    const response = await apiService.get<User>(API_ENDPOINTS.USER.PROFILE)
    
    // 更新本地缓存
    if (response.success) {
      uni.setStorageSync(STORAGE_KEYS.USER_INFO, response.data)
    }
    
    return response.data
  }

  /**
   * 更新用户信息
   */
  async updateUserProfile(params: UpdateUserRequest): Promise<User> {
    const response = await apiService.put<User>(
      '/user/profile',
      params,
      { showLoading: true, loadingText: '更新中...' }
    )

    // 更新本地缓存
    if (response.success) {
      uni.setStorageSync(STORAGE_KEYS.USER_INFO, response.data)
    }

    return response.data
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<UserStatsResponse> {
    const response = await apiService.get<UserStatsResponse>(API_ENDPOINTS.USER.STATS)
    return response.data
  }

  // ============================= 积分相关 =============================

  /**
   * 获取积分统计
   */
  async getPointStats(): Promise<PointStatsResponse> {
    const response = await apiService.get<PointStatsResponse>('/user/point-stats')
    return response.data
  }

  /**
   * 获取积分记录列表
   */
  async getPointRecords(params: PointRecordListRequest): Promise<{
    records: PointRecord[]
    pagination: any
  }> {
    const response = await apiService.get<{
      records: PointRecord[]
      pagination: any
    }>('/user/point-records', params)
    return response.data
  }

  /**
   * 使用积分
   */
  async redeemPoints(points: number, orderId?: string): Promise<void> {
    await apiService.post(
      API_ENDPOINTS.POINTS.REDEEM,
      { points, orderId },
      { showLoading: true, loadingText: '使用积分中...' }
    )
  }

  // ============================= 收藏相关 =============================

  /**
   * 获取收藏列表
   */
  async getFavorites(): Promise<any[]> {
    const response = await apiService.get<any[]>(API_ENDPOINTS.USER.FAVORITES)
    return response.data
  }

  /**
   * 添加收藏
   */
  async addFavorite(storeId: string): Promise<void> {
    await apiService.post(API_ENDPOINTS.USER.FAVORITES, { storeId })
  }

  /**
   * 取消收藏
   */
  async removeFavorite(storeId: string): Promise<void> {
    await apiService.delete(`${API_ENDPOINTS.USER.FAVORITES}/${storeId}`)
  }

  // ============================= 权限相关 =============================

  /**
   * 检查用户是否已登录
   */
  isLoggedIn(): boolean {
    return !!uni.getStorageSync(STORAGE_KEYS.ACCESS_TOKEN)
  }

  /**
   * 获取本地用户信息
   */
  getLocalUserInfo(): User | null {
    return uni.getStorageSync(STORAGE_KEYS.USER_INFO) || null
  }

  /**
   * 获取当前用户信息 (测试兼容方法)
   */
  getCurrentUser(): User | null {
    return this.getLocalUserInfo()
  }

  /**
   * 获取访问令牌
   */
  getToken(): string | null {
    return uni.getStorageSync(STORAGE_KEYS.ACCESS_TOKEN) || null
  }

  /**
   * 获取刷新令牌
   */
  getRefreshToken(): string | null {
    return uni.getStorageSync(STORAGE_KEYS.REFRESH_TOKEN) || null
  }

  /**
   * 清除用户数据 (测试兼容方法)
   */
  clearUserData(): void {
    this.clearAuthData()
  }

  /**
   * 发送短信验证码 (测试兼容方法)
   */
  async sendSms(params: SendSmsRequest): Promise<{ code?: string }> {
    return this.sendSmsCode(params)
  }

  /**
   * 验证短信验证码 (测试兼容方法)
   */
  async verifySms(params: { phone: string; code: string; type?: string }): Promise<boolean> {
    return this.verifySmsCode(params.phone, params.code)
  }

  /**
   * 检查用户权限
   */
  checkPermission(permission: string): boolean {
    const user = this.getLocalUserInfo()
    if (!user) return false

    // 根据用户类型和VIP等级检查权限
    switch (permission) {
      case 'vip_discount':
        return user.isVip
      case 'no_deposit_booking':
        return user.vipLevel >= 1
      case 'priority_support':
        return user.vipLevel >= 2
      default:
        return true
    }
  }

  /**
   * 获取用户当前价格（根据VIP等级）
   */
  getCurrentPrice(originalPrice: number, vipPrice?: number): number {
    const user = this.getLocalUserInfo()
    if (!user || !user.isVip || !vipPrice) {
      return originalPrice
    }
    return vipPrice
  }

  // ============================= 工具方法 =============================

  /**
   * 清除认证数据
   */
  clearAuthData(): void {
    uni.removeStorageSync(STORAGE_KEYS.ACCESS_TOKEN)
    uni.removeStorageSync(STORAGE_KEYS.REFRESH_TOKEN)
    uni.removeStorageSync(STORAGE_KEYS.USER_INFO)
  }

  /**
   * 构建查询字符串
   */
  private buildQueryString(params?: Record<string, any>): string {
    const searchParams = new URLSearchParams()
    
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(item => searchParams.append(key, String(item)))
        } else {
          searchParams.append(key, String(value))
        }
      }
    })
    
    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ''
  }

  /**
   * 检查并自动刷新Token
   */
  async checkAndRefreshToken(): Promise<void> {
    const token = uni.getStorageSync(STORAGE_KEYS.ACCESS_TOKEN)
    if (!token) return

    try {
      // 这里可以添加Token过期检查逻辑
      // 如果Token即将过期，自动刷新
      await this.refreshToken()
    } catch (error) {
      // 刷新失败，清除认证数据
      this.clearAuthData()
      throw error
    }
  }

  /**
   * 确保用户已登录
   */
  async ensureLoggedIn(): Promise<User> {
    if (!this.isLoggedIn()) {
      uni.reLaunch({
        url: '/pages/auth/login'
      })
      throw new Error('User not logged in')
    }

    try {
      return await this.getUserProfile()
    } catch (error) {
      // 获取用户信息失败，可能是Token过期
      await this.checkAndRefreshToken()
      return await this.getUserProfile()
    }
  }
}

// 导出服务实例
export const userService = new UserService()
export default userService
