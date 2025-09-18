/**
 * UserService 单元测试
 * 测试用户认证、信息管理、积分查询等功能
 */

import userService from '../../src/services/user'
import {
  createMockApiResponse,
  mockUniApi,
  resetUniMocks,
  expectUniApiCall,
  createTestUser,
  flushPromises
} from '../helpers/testUtils'

// Mock API service
jest.mock('../../src/services/api', () => ({
  apiService: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}))

// Get the mocked API service
import { apiService } from '../../src/services/api'
const mockApiService = apiService as jest.Mocked<typeof apiService>

// Mock constants
jest.mock('../../src/constants', () => ({
  API_ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      LOGOUT: '/auth/logout',
      REFRESH_TOKEN: '/auth/refresh-token',
      SEND_SMS: '/auth/send-sms',
      VERIFY_SMS: '/auth/verify-sms',
      RESET_PASSWORD: '/auth/reset-password'
    },
    USER: {
      PROFILE: '/user/profile',
      UPDATE_PROFILE: '/user/profile',
      STATS: '/user/stats',
      POINT_RECORDS: '/user/point-records',
      POINT_STATS: '/user/point-stats'
    }
  },
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_INFO: 'user_info'
  }
}))

describe('UserService', () => {
  beforeEach(() => {
    resetUniMocks()
    jest.clearAllMocks()
  })

  describe('用户认证', () => {
    describe('login', () => {
      it('应该成功登录并保存认证信息', async () => {
        const loginData = {
          phone: '13800138000',
          password: 'password123'
        }
        const userData = createTestUser()
        const tokens = {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_123',
          expiresIn: 3600
        }
        const mockResponse = createMockApiResponse({
          user: userData,
          tokens
        })

        mockApiService.post.mockResolvedValue(mockResponse)
        const mockSetStorageSync = mockUniApi('setStorageSync')

        const result = await userService.login(loginData)

        expect(mockApiService.post).toHaveBeenCalledWith(
          '/auth/login',
          loginData,
          { showLoading: true, loadingText: '登录中...' }
        )
        expect(mockSetStorageSync).toHaveBeenCalledWith('access_token', tokens.accessToken)
        expect(mockSetStorageSync).toHaveBeenCalledWith('refresh_token', tokens.refreshToken)
        expect(mockSetStorageSync).toHaveBeenCalledWith('user_info', userData)
        expect(result).toEqual({ user: userData, tokens })
      })

      it('应该在登录失败时不保存认证信息', async () => {
        const loginData = {
          phone: '13800138000',
          password: 'wrong_password'
        }
        const mockResponse = {
          success: false,
          message: '用户名或密码错误',
          data: null
        }

        mockApiService.post.mockResolvedValue(mockResponse)
        const mockSetStorageSync = mockUniApi('setStorageSync')

        await expect(userService.login(loginData)).rejects.toThrow()
        expect(mockSetStorageSync).not.toHaveBeenCalled()
      })
    })

    describe('register', () => {
      it('应该成功注册并保存认证信息', async () => {
        const registerData = {
          phone: '13800138000',
          password: 'password123',
          smsCode: '123456',
          nickname: '测试用户'
        }
        const userData = createTestUser({ phone: registerData.phone, nickname: registerData.nickname })
        const tokens = {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_123',
          expiresIn: 3600
        }
        const mockResponse = createMockApiResponse({
          user: userData,
          tokens
        })

        mockApiService.post.mockResolvedValue(mockResponse)
        const mockSetStorageSync = mockUniApi('setStorageSync')

        const result = await userService.register(registerData)

        expect(mockApiService.post).toHaveBeenCalledWith(
          '/auth/register',
          registerData,
          { showLoading: true, loadingText: '注册中...' }
        )
        expect(mockSetStorageSync).toHaveBeenCalledWith('access_token', tokens.accessToken)
        expect(mockSetStorageSync).toHaveBeenCalledWith('refresh_token', tokens.refreshToken)
        expect(mockSetStorageSync).toHaveBeenCalledWith('user_info', userData)
        expect(result).toEqual({ user: userData, tokens })
      })
    })

    describe('logout', () => {
      it('应该成功退出并清除本地存储', async () => {
        const mockResponse = createMockApiResponse(null)
        mockApiService.post.mockResolvedValue(mockResponse)
        
        const mockRemoveStorageSync = mockUniApi('removeStorageSync')

        await userService.logout()

        expect(mockApiService.post).toHaveBeenCalledWith('/auth/logout')
        expect(mockRemoveStorageSync).toHaveBeenCalledWith('access_token')
        expect(mockRemoveStorageSync).toHaveBeenCalledWith('refresh_token')
        expect(mockRemoveStorageSync).toHaveBeenCalledWith('user_info')
      })

      it('应该在API调用失败时仍然清除本地存储', async () => {
        mockApiService.post.mockRejectedValue(new Error('Network error'))
        const mockRemoveStorageSync = mockUniApi('removeStorageSync')

        await userService.logout()

        expect(mockRemoveStorageSync).toHaveBeenCalledWith('access_token')
        expect(mockRemoveStorageSync).toHaveBeenCalledWith('refresh_token')
        expect(mockRemoveStorageSync).toHaveBeenCalledWith('user_info')
      })
    })

    describe('refreshToken', () => {
      it('应该成功刷新token', async () => {
        const newTokens = {
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
          expiresIn: 3600
        }
        const mockResponse = createMockApiResponse({ tokens: newTokens })
        
        mockApiService.post.mockResolvedValue(mockResponse)
        const mockGetStorageSync = mockUniApi('getStorageSync')
        const mockSetStorageSync = mockUniApi('setStorageSync')
        
        mockGetStorageSync.mockReturnValue('old_refresh_token')

        const result = await userService.refreshToken()

        expect(mockApiService.post).toHaveBeenCalledWith(
          '/auth/refresh-token',
          { refreshToken: 'old_refresh_token' }
        )
        expect(mockSetStorageSync).toHaveBeenCalledWith('access_token', newTokens.accessToken)
        expect(mockSetStorageSync).toHaveBeenCalledWith('refresh_token', newTokens.refreshToken)
        expect(result).toEqual({ tokens: newTokens })
      })

      it('应该在没有refreshToken时抛出错误', async () => {
        const mockGetStorageSync = mockUniApi('getStorageSync')
        mockGetStorageSync.mockReturnValue('')

        await expect(userService.refreshToken()).rejects.toThrow('无刷新令牌')
      })
    })

    describe('sendSms', () => {
      it('应该成功发送短信验证码', async () => {
        const smsData = {
          phone: '13800138000',
          type: 'login' as const
        }
        const mockResponse = createMockApiResponse(null)
        
        mockApiService.post.mockResolvedValue(mockResponse)

        await userService.sendSms(smsData)

        expect(mockApiService.post).toHaveBeenCalledWith('/auth/send-sms', smsData)
      })
    })

    describe('verifySms', () => {
      it('应该成功验证短信验证码', async () => {
        const verifyData = {
          phone: '13800138000',
          code: '123456',
          type: 'login' as const
        }
        const mockResponse = createMockApiResponse(null)
        
        mockApiService.post.mockResolvedValue(mockResponse)

        await userService.verifySms(verifyData)

        expect(mockApiService.post).toHaveBeenCalledWith('/auth/verify-sms', verifyData)
      })
    })

    describe('resetPassword', () => {
      it('应该成功重置密码', async () => {
        const resetData = {
          phone: '13800138000',
          smsCode: '123456',
          newPassword: 'new_password123'
        }
        const mockResponse = createMockApiResponse(null)
        
        mockApiService.post.mockResolvedValue(mockResponse)

        await userService.resetPassword(resetData)

        expect(mockApiService.post).toHaveBeenCalledWith(
          '/auth/reset-password',
          resetData,
          { showLoading: true, loadingText: '重置密码中...' }
        )
      })
    })
  })

  describe('用户信息管理', () => {
    describe('getCurrentUser', () => {
      it('应该从本地存储获取用户信息', () => {
        const userData = createTestUser()
        const mockGetStorageSync = mockUniApi('getStorageSync')
        mockGetStorageSync.mockReturnValue(userData)

        const result = userService.getCurrentUser()

        expect(mockGetStorageSync).toHaveBeenCalledWith('user_info')
        expect(result).toEqual(userData)
      })

      it('应该在没有用户信息时返回null', () => {
        const mockGetStorageSync = mockUniApi('getStorageSync')
        mockGetStorageSync.mockReturnValue('')

        const result = userService.getCurrentUser()

        expect(result).toBeNull()
      })
    })

    describe('getUserProfile', () => {
      it('应该成功获取用户档案', async () => {
        const userData = createTestUser()
        const mockResponse = createMockApiResponse(userData)
        
        mockApiService.get.mockResolvedValue(mockResponse)

        const result = await userService.getUserProfile()

        expect(mockApiService.get).toHaveBeenCalledWith('/user/profile')
        expect(result).toEqual(userData)
      })
    })

    describe('updateUserProfile', () => {
      it('应该成功更新用户档案并同步本地存储', async () => {
        const updateData = {
          nickname: '新昵称',
          avatar: 'https://example.com/new-avatar.jpg'
        }
        const updatedUser = createTestUser(updateData)
        const mockResponse = createMockApiResponse(updatedUser)
        
        mockApiService.put.mockResolvedValue(mockResponse)
        const mockSetStorageSync = mockUniApi('setStorageSync')

        const result = await userService.updateUserProfile(updateData)

        expect(mockApiService.put).toHaveBeenCalledWith(
          '/user/profile',
          updateData,
          { showLoading: true, loadingText: '更新中...' }
        )
        expect(mockSetStorageSync).toHaveBeenCalledWith('user_info', updatedUser)
        expect(result).toEqual(updatedUser)
      })
    })

    describe('getUserStats', () => {
      it('应该成功获取用户统计信息', async () => {
        const statsData = {
          totalOrders: 10,
          totalSpent: 1500.50,
          totalPoints: 2000,
          level: 'gold',
          nextLevelPoints: 500
        }
        const mockResponse = createMockApiResponse(statsData)
        
        mockApiService.get.mockResolvedValue(mockResponse)

        const result = await userService.getUserStats()

        expect(mockApiService.get).toHaveBeenCalledWith('/user/stats')
        expect(result).toEqual(statsData)
      })
    })
  })

  describe('积分管理', () => {
    describe('getPointRecords', () => {
      it('应该成功获取积分记录列表', async () => {
        const params = {
          page: 1,
          limit: 20,
          type: 'earn' as const
        }
        const recordsData = {
          items: [
            {
              id: '1',
              type: 'earn',
              points: 100,
              description: '消费获得积分',
              createdAt: new Date().toISOString()
            }
          ],
          total: 1,
          page: 1,
          limit: 20
        }
        const mockResponse = createMockApiResponse(recordsData)
        
        mockApiService.get.mockResolvedValue(mockResponse)

        const result = await userService.getPointRecords(params)

        expect(mockApiService.get).toHaveBeenCalledWith('/user/point-records', params)
        expect(result).toEqual(recordsData)
      })

      it('应该支持不传递参数', async () => {
        const recordsData = {
          items: [],
          total: 0,
          page: 1,
          limit: 20
        }
        const mockResponse = createMockApiResponse(recordsData)
        
        mockApiService.get.mockResolvedValue(mockResponse)

        await userService.getPointRecords()

        expect(mockApiService.get).toHaveBeenCalledWith('/user/point-records', undefined)
      })
    })

    describe('getPointStats', () => {
      it('应该成功获取积分统计信息', async () => {
        const statsData = {
          totalEarned: 5000,
          totalSpent: 2000,
          currentBalance: 3000,
          thisMonthEarned: 500,
          thisMonthSpent: 200
        }
        const mockResponse = createMockApiResponse(statsData)
        
        mockApiService.get.mockResolvedValue(mockResponse)

        const result = await userService.getPointStats()

        expect(mockApiService.get).toHaveBeenCalledWith('/user/point-stats')
        expect(result).toEqual(statsData)
      })
    })
  })

  describe('工具方法', () => {
    describe('isLoggedIn', () => {
      it('应该在有token时返回true', () => {
        const mockGetStorageSync = mockUniApi('getStorageSync')
        mockGetStorageSync.mockReturnValue('valid_token')

        const result = userService.isLoggedIn()

        expect(mockGetStorageSync).toHaveBeenCalledWith('access_token')
        expect(result).toBe(true)
      })

      it('应该在没有token时返回false', () => {
        const mockGetStorageSync = mockUniApi('getStorageSync')
        mockGetStorageSync.mockReturnValue('')

        const result = userService.isLoggedIn()

        expect(result).toBe(false)
      })
    })

    describe('clearUserData', () => {
      it('应该清除所有用户相关数据', () => {
        const mockRemoveStorageSync = mockUniApi('removeStorageSync')

        userService.clearUserData()

        expect(mockRemoveStorageSync).toHaveBeenCalledWith('access_token')
        expect(mockRemoveStorageSync).toHaveBeenCalledWith('refresh_token')
        expect(mockRemoveStorageSync).toHaveBeenCalledWith('user_info')
      })
    })

    describe('getToken', () => {
      it('应该返回存储的访问令牌', () => {
        const token = 'test_access_token'
        const mockGetStorageSync = mockUniApi('getStorageSync')
        mockGetStorageSync.mockReturnValue(token)

        const result = userService.getToken()

        expect(mockGetStorageSync).toHaveBeenCalledWith('access_token')
        expect(result).toBe(token)
      })
    })

    describe('getRefreshToken', () => {
      it('应该返回存储的刷新令牌', () => {
        const refreshToken = 'test_refresh_token'
        const mockGetStorageSync = mockUniApi('getStorageSync')
        mockGetStorageSync.mockReturnValue(refreshToken)

        const result = userService.getRefreshToken()

        expect(mockGetStorageSync).toHaveBeenCalledWith('refresh_token')
        expect(result).toBe(refreshToken)
      })
    })
  })

  describe('错误处理', () => {
    it('应该正确处理API错误', async () => {
      const error = new Error('API Error')
      mockApiService.get.mockRejectedValue(error)

      await expect(userService.getUserProfile()).rejects.toThrow('API Error')
    })

    it('应该正确处理网络错误', async () => {
      const networkError = new Error('Network request failed')
      mockApiService.post.mockRejectedValue(networkError)

      await expect(userService.login({
        phone: '13800138000',
        password: 'password123'
      })).rejects.toThrow('Network request failed')
    })
  })
})
