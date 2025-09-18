/**
 * 商户端认证 Store 单元测试
 * 测试认证状态管理、登录登出、本地存储同步等功能
 */

import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../src/stores/auth'
import {
  mockUniApi,
  resetUniMocks,
  createMockApiResponse,
  expectUniApiCall
} from '../helpers/testUtils'

describe('AuthStore', () => {
  let authStore: any
  let mockRequest: jest.Mock
  let mockSetStorageSync: jest.Mock
  let mockGetStorageSync: jest.Mock
  let mockRemoveStorageSync: jest.Mock

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    
    // 重置所有mock
    resetUniMocks()
    
    // Mock uni API
    mockRequest = mockUniApi('request')
    mockSetStorageSync = mockUniApi('setStorageSync')
    mockGetStorageSync = mockUniApi('getStorageSync')
    mockRemoveStorageSync = mockUniApi('removeStorageSync')
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      expect(authStore.merchant).toBeNull()
      expect(authStore.token).toBe('')
      expect(authStore.isLoggedIn).toBe(false)
    })
  })

  describe('登录功能', () => {
    it('应该成功登录并保存认证信息', async () => {
      const loginForm = {
        account: 'merchant@test.com',
        password: 'password123',
        rememberMe: true
      }
      
      const mockMerchant = {
        id: '1',
        name: '测试商户',
        email: 'merchant@test.com',
        phone: '13800138000'
      }
      
      const mockToken = 'mock_token_123'
      
      mockRequest.mockResolvedValue({
        data: {
          code: 200,
          data: {
            token: mockToken,
            merchant: mockMerchant
          }
        }
      })

      const result = await authStore.login(loginForm)

      expect(result.success).toBe(true)
      expect(authStore.token).toBe(mockToken)
      expect(authStore.merchant).toEqual(mockMerchant)
      expect(authStore.isLoggedIn).toBe(true)
      
      // 验证本地存储调用
      expect(mockSetStorageSync).toHaveBeenCalledWith('merchant_token', mockToken)
      expect(mockSetStorageSync).toHaveBeenCalledWith('merchant_info', mockMerchant)
      expect(mockSetStorageSync).toHaveBeenCalledWith('remember_account', loginForm.account)
    })

    it('应该在登录失败时返回错误信息', async () => {
      const loginForm = {
        account: 'merchant@test.com',
        password: 'wrong_password',
        rememberMe: false
      }
      
      mockRequest.mockResolvedValue({
        data: {
          code: 401,
          message: '账号或密码错误'
        }
      })

      const result = await authStore.login(loginForm)

      expect(result.success).toBe(false)
      expect(result.message).toBe('账号或密码错误')
      expect(authStore.token).toBe('')
      expect(authStore.merchant).toBeNull()
      expect(authStore.isLoggedIn).toBe(false)
      
      // 不应该保存认证信息
      expect(mockSetStorageSync).not.toHaveBeenCalledWith('merchant_token', expect.anything())
    })

    it('应该在记住账号时保存账号信息', async () => {
      const loginForm = {
        account: 'merchant@test.com',
        password: 'password123',
        rememberMe: true
      }
      
      mockRequest.mockResolvedValue({
        data: {
          code: 200,
          data: {
            token: 'token',
            merchant: { id: '1', name: 'test' }
          }
        }
      })

      await authStore.login(loginForm)

      expect(mockSetStorageSync).toHaveBeenCalledWith('remember_account', loginForm.account)
    })

    it('应该在不记住账号时清除保存的账号', async () => {
      const loginForm = {
        account: 'merchant@test.com',
        password: 'password123',
        rememberMe: false
      }
      
      mockRequest.mockResolvedValue({
        data: {
          code: 200,
          data: {
            token: 'token',
            merchant: { id: '1', name: 'test' }
          }
        }
      })

      await authStore.login(loginForm)

      expect(mockRemoveStorageSync).toHaveBeenCalledWith('remember_account')
    })
  })

  describe('登出功能', () => {
    beforeEach(() => {
      // 设置已登录状态
      authStore.token = 'test_token'
      authStore.merchant = { id: '1', name: '测试商户' }
    })

    it('应该成功登出并清除认证信息', async () => {
      const mockReLaunch = mockUniApi('reLaunch')
      mockRequest.mockResolvedValue({
        data: {
          code: 200,
          message: '登出成功'
        }
      })

      await authStore.logout()

      expect(authStore.token).toBe('')
      expect(authStore.merchant).toBeNull()
      expect(authStore.isLoggedIn).toBe(false)
      
      // 验证清除本地存储
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('merchant_token')
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('merchant_info')
      
      // 验证跳转到登录页
      expect(mockReLaunch).toHaveBeenCalledWith({
        url: '/pages/login/index'
      })
    })

    it('应该在API调用失败时仍然清除本地存储', async () => {
      const mockReLaunch = mockUniApi('reLaunch')
      mockRequest.mockRejectedValue(new Error('request:fail'))

      await authStore.logout()

      expect(authStore.token).toBe('')
      expect(authStore.merchant).toBeNull()
      
      // 即使API失败也应该清除本地存储
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('merchant_token')
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('merchant_info')
      
      // 验证跳转到登录页
      expect(mockReLaunch).toHaveBeenCalledWith({
        url: '/pages/login/index'
      })
    })
  })

  describe('认证初始化', () => {
    it('应该从本地存储恢复认证状态', () => {
      const savedToken = 'saved_token'
      const savedMerchant = {
        id: '1',
        name: '保存的商户',
        email: 'merchant@test.com'
      }
      
      mockGetStorageSync.mockImplementation((key: string) => {
        if (key === 'merchant_token') return savedToken
        if (key === 'merchant_info') return savedMerchant
        return ''
      })

      authStore.initAuth()

      expect(authStore.token).toBe(savedToken)
      expect(authStore.merchant).toEqual(savedMerchant)
      expect(authStore.isLoggedIn).toBe(true)
    })

    it('应该在没有保存的认证信息时保持未登录状态', () => {
      mockGetStorageSync.mockReturnValue('')

      authStore.initAuth()

      expect(authStore.token).toBe('')
      expect(authStore.merchant).toBeNull()
      expect(authStore.isLoggedIn).toBe(false)
    })
  })

  describe('商户信息更新', () => {
    beforeEach(() => {
      authStore.merchant = {
        id: '1',
        name: '原始商户',
        email: 'old@test.com',
        phone: '13800138000'
      }
    })

    it('应该成功更新商户信息', () => {
      const updatedInfo = {
        name: '更新后的商户',
        email: 'new@test.com'
      }

      authStore.updateMerchant(updatedInfo)

      expect(authStore.merchant.name).toBe('更新后的商户')
      expect(authStore.merchant.email).toBe('new@test.com')
      expect(authStore.merchant.phone).toBe('13800138000') // 保持不变
      
      // 验证更新后保存到本地存储
      expect(mockSetStorageSync).toHaveBeenCalledWith('merchant_info', authStore.merchant)
    })

    it('应该在没有商户信息时不执行更新', () => {
      authStore.merchant = null

      authStore.updateMerchant({ name: '新名称' })

      expect(authStore.merchant).toBeNull()
      expect(mockSetStorageSync).not.toHaveBeenCalled()
    })
  })

  describe('Token验证', () => {
    beforeEach(() => {
      authStore.token = 'test_token'
    })

    it('应该验证有效的token', async () => {
      mockRequest.mockResolvedValue({
        data: {
          code: 200,
          data: { valid: true }
        }
      })

      const result = await authStore.validateToken()

      expect(result).toBe(true)
      expectUniApiCall('request', {
        url: '/api/merchant/validate',
        method: 'GET',
        header: {
          'Authorization': `Bearer test_token`
        }
      })
    })

    it('应该处理无效的token', async () => {
      mockRequest.mockResolvedValue({
        data: {
          code: 401,
          data: { valid: false }
        }
      })

      const result = await authStore.validateToken()

      expect(result).toBe(false)
    })
  })

  describe('记住的账号', () => {
    it('应该返回记住的账号', () => {
      const rememberedAccount = 'merchant@test.com'
      mockGetStorageSync.mockReturnValue(rememberedAccount)

      const result = authStore.getRememberedAccount()

      expect(result).toBe(rememberedAccount)
      expect(mockGetStorageSync).toHaveBeenCalledWith('remember_account')
    })

    it('应该在没有记住的账号时返回空字符串', () => {
      mockGetStorageSync.mockReturnValue('')

      const result = authStore.getRememberedAccount()

      expect(result).toBe('')
    })
  })

  describe('计算属性', () => {
    it('应该在有token和商户信息时判断为已登录', () => {
      authStore.token = 'test_token'
      authStore.merchant = { id: '1', name: 'test' }

      expect(authStore.isLoggedIn).toBe(true)
    })

    it('应该在缺少token时判断为未登录', () => {
      authStore.token = ''
      authStore.merchant = { id: '1', name: 'test' }

      expect(authStore.isLoggedIn).toBe(false)
    })

    it('应该在缺少商户信息时判断为未登录', () => {
      authStore.token = 'test_token'
      authStore.merchant = null

      expect(authStore.isLoggedIn).toBe(false)
    })
  })
})
