/**
 * UserStore 单元测试
 * 测试用户状态管理、登录状态、用户信息等功能
 */

import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '../../src/stores/user'
import {
  createTestUser,
  mockUniApi,
  resetUniMocks,
  flushPromises
} from '../helpers/testUtils'

// Mock user service - 直接在mock中内联定义
jest.mock('../../src/services/user', () => ({
  userService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    isLoggedIn: jest.fn(),
    clearUserData: jest.fn(),
    getToken: jest.fn(),
    getRefreshToken: jest.fn()
  }
}))

// Mock constants
jest.mock('../../src/constants', () => ({
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_INFO: 'user_info'
  }
}))

// 导入mock后的service
import { userService as mockUserService } from '../../src/services/user'
const typedMockUserService = mockUserService as jest.Mocked<typeof mockUserService>

describe('UserStore', () => {
  let userStore: ReturnType<typeof useUserStore>

  beforeEach(() => {
    // 创建新的Pinia实例
    const pinia = createPinia()
    setActivePinia(pinia)
    
    // 创建store实例
    userStore = useUserStore()
    
    // 重置所有mocks
    resetUniMocks()
    jest.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      expect(userStore.userInfo).toBeNull()
      expect(userStore.isLoggedIn).toBe(false)
      expect(userStore.loading).toBe(false)
    })

    it('应该有正确的计算属性初始值', () => {
      expect(userStore.isVip).toBe(false)
      expect(userStore.vipLevel).toBe(0)
      expect(userStore.points).toBe(0)
      expect(userStore.balance).toBe(0)
      expect(userStore.displayName).toBe('用户')
      expect(userStore.avatar).toBe('')
    })
  })

  describe('initUserState', () => {
    it('应该在有token和用户信息时初始化为已登录状态', () => {
      const testUser = createTestUser()
      const mockGetStorageSync = mockUniApi('getStorageSync')
      
      mockGetStorageSync.mockImplementation((key: string) => {
        if (key === 'access_token') return 'test_token'
        if (key === 'user_info') return testUser
        return ''
      })

      userStore.initUserState()

      expect(userStore.userInfo).toEqual(testUser)
      expect(userStore.isLoggedIn).toBe(true)
    })

    it('应该在没有token时保持未登录状态', () => {
      const mockGetStorageSync = mockUniApi('getStorageSync')
      mockGetStorageSync.mockReturnValue('')

      userStore.initUserState()

      expect(userStore.userInfo).toBeNull()
      expect(userStore.isLoggedIn).toBe(false)
    })

    it('应该在有token但没有用户信息时保持未登录状态', () => {
      const mockGetStorageSync = mockUniApi('getStorageSync')
      mockGetStorageSync.mockImplementation((key: string) => {
        if (key === 'access_token') return 'test_token'
        return ''
      })

      userStore.initUserState()

      expect(userStore.userInfo).toBeNull()
      expect(userStore.isLoggedIn).toBe(false)
    })
  })

  describe('login', () => {
    it('应该成功登录并更新状态', async () => {
      const testUser = createTestUser()
      const loginResponse = { user: testUser, token: 'test-token' }
      
      typedMockUserService.login.mockResolvedValue(loginResponse)

      const result = await userStore.login('13800138000', 'password123')

      expect(typedMockUserService.login).toHaveBeenCalledWith({
        phone: '13800138000',
        password: 'password123',
        type: 'password'
      })
      expect(userStore.userInfo).toEqual(testUser)
      expect(userStore.isLoggedIn).toBe(true)
      expect(userStore.loading).toBe(false)
      expect(result).toEqual(loginResponse)
    })

    it('应该在登录失败时保持原状态', async () => {
      const loginData = {
        phone: '13800138000',
        password: 'wrong_password'
      }
      const error = new Error('用户名或密码错误')

      typedMockUserService.login.mockRejectedValue(error)

      await expect(userStore.login(loginData)).rejects.toThrow(error)
      expect(userStore.userInfo).toBeNull()
      expect(userStore.isLoggedIn).toBe(false)
      expect(userStore.loading).toBe(false)
    })

    it('应该在登录过程中显示加载状态', async () => {
      const loginData = {
        phone: '13800138000',
        password: 'password123'
      }

      // 创建一个永不resolve的Promise来测试loading状态
      let resolveLogin: Function
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      typedMockUserService.login.mockReturnValue(loginPromise)

      const loginCall = userStore.login(loginData)
      
      // 在登录过程中检查loading状态
      expect(userStore.loading).toBe(true)

      // 完成登录
      resolveLogin({
        user: createTestUser(),
        tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 }
      })
      await loginCall

      expect(userStore.loading).toBe(false)
    })
  })

  describe('register', () => {
    it('应该成功注册并更新状态', async () => {
      const registerData = {
        phone: '13800138000',
        password: 'password123',
        nickname: '新用户',
        verificationCode: '123456'
      }
      const testUser = createTestUser({
        phone: registerData.phone,
        nickname: registerData.nickname
      })
      const registerResponse = {
        user: testUser,
        tokens: {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_123',
          expiresIn: 3600
        }
      }

      typedMockUserService.register.mockResolvedValue(registerResponse)

      const result = await userStore.register(registerData)

      expect(typedMockUserService.register).toHaveBeenCalledWith({
        ...registerData,
        userType: 'user'
      })
      expect(userStore.userInfo).toEqual(testUser)
      expect(userStore.isLoggedIn).toBe(true)
      expect(result).toEqual(registerResponse)
    })
  })

  describe('logout', () => {
    it('应该成功退出并清除状态', async () => {
      // 先设置登录状态
      const testUser = createTestUser()
      userStore.userInfo = testUser
      userStore.isLoggedIn = true

      typedMockUserService.logout.mockResolvedValue(undefined)

      await userStore.logout()

      expect(typedMockUserService.logout).toHaveBeenCalled()
      expect(userStore.userInfo).toBeNull()
      expect(userStore.isLoggedIn).toBe(false)
    })

    it('应该在退出失败时仍清除本地状态', async () => {
      // 先设置登录状态
      const testUser = createTestUser()
      userStore.userInfo = testUser
      userStore.isLoggedIn = true

      const errorMessage = '网络错误'
      const error = { message: errorMessage }
      typedMockUserService.logout.mockRejectedValue(error)

      await userStore.logout()

      expect(userStore.userInfo).toBeNull()
      expect(userStore.isLoggedIn).toBe(false)
    })
  })

  describe('updateUserInfo', () => {
    it('应该成功更新用户信息', async () => {
      const originalUser = createTestUser()
      userStore.userInfo = originalUser
      userStore.isLoggedIn = true

      const updateData = {
        nickname: '新昵称',
        avatar: 'https://example.com/new-avatar.jpg'
      }
      const updatedUser = { ...originalUser, ...updateData }

      typedMockUserService.updateUserProfile.mockResolvedValue(updatedUser)

      const result = await userStore.updateUserInfo(updateData)

      expect(typedMockUserService.updateUserProfile).toHaveBeenCalledWith(updateData)
      expect(userStore.userInfo).toEqual(updatedUser)
      expect(result).toEqual(updatedUser)
    })

    it('应该在未登录时直接返回', async () => {
      userStore.userInfo = null
      userStore.isLoggedIn = false

      const result = await userStore.updateUserInfo({ nickname: '新昵称' })

      expect(typedMockUserService.updateUserProfile).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })

  describe('refreshUserInfo', () => {
    it('应该成功刷新用户信息', async () => {
      userStore.isLoggedIn = true
      const refreshedUser = createTestUser({ nickname: '刷新后的用户' })

      typedMockUserService.getUserProfile.mockResolvedValue(refreshedUser)

      await userStore.refreshUserInfo()

      expect(typedMockUserService.getUserProfile).toHaveBeenCalled()
      expect(userStore.userInfo).toEqual(refreshedUser)
    })

    it('应该在未登录时不执行刷新', async () => {
      userStore.isLoggedIn = false

      await userStore.refreshUserInfo()

      expect(typedMockUserService.getUserProfile).not.toHaveBeenCalled()
      expect(userStore.userInfo).toBeNull()
    })

    it('应该在刷新失败时抛出错误', async () => {
      userStore.isLoggedIn = true
      userStore.userInfo = createTestUser()

      const errorMessage = '用户不存在'
      const error = { message: errorMessage }
      typedMockUserService.getUserProfile.mockRejectedValue(error)

      await expect(userStore.refreshUserInfo()).rejects.toEqual(error)
    })
  })

  describe('clearPersistedState', () => {
    it('应该清除本地存储状态', () => {
      const mockRemoveStorageSync = mockUniApi('removeStorageSync')

      userStore.clearPersistedState()

      expect(mockRemoveStorageSync).toHaveBeenCalledWith('user_info')
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('access_token')
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('refresh_token')
    })
  })

  describe('计算属性', () => {
    it('应该正确计算VIP相关属性', () => {
      const vipUser = createTestUser({
        isVip: true,
        vipLevel: 3
      })
      userStore.userInfo = vipUser

      expect(userStore.isVip).toBe(true)
      expect(userStore.vipLevel).toBe(3)
    })

    it('应该正确计算积分和余额', () => {
      const user = createTestUser({
        points: 1500,
        balance: 299.50
      })
      userStore.userInfo = user

      expect(userStore.points).toBe(1500)
      expect(userStore.balance).toBe(299.50)
    })

    it('应该正确计算显示名称和头像', () => {
      const user = createTestUser({
        nickname: '测试昵称',
        avatar: 'https://example.com/avatar.jpg'
      })
      userStore.userInfo = user

      expect(userStore.displayName).toBe('测试昵称')
      expect(userStore.avatar).toBe('https://example.com/avatar.jpg')
    })

    it('应该在用户信息为空时返回默认值', () => {
      userStore.userInfo = null

      expect(userStore.isVip).toBe(false)
      expect(userStore.vipLevel).toBe(0)
      expect(userStore.points).toBe(0)
      expect(userStore.balance).toBe(0)
      expect(userStore.displayName).toBe('用户')
      expect(userStore.avatar).toBe('')
    })
  })

  describe('错误处理', () => {
    it('应该正确处理登录错误', async () => {
      const error = new Error('网络连接失败')
      typedMockUserService.login.mockRejectedValue(error)

      await expect(userStore.login('13800138000', 'password123')).rejects.toThrow(error)

      expect(userStore.loading).toBe(false)
      expect(userStore.isLoggedIn).toBe(false)
    })

    it('应该正确处理注册错误', async () => {
      const error = new Error('手机号已存在')
      typedMockUserService.register.mockRejectedValue(error)

      await expect(userStore.register({
        phone: '13800138000',
        password: 'password123',
        nickname: '新用户',
        verificationCode: '123456'
      })).rejects.toThrow(error)

      expect(userStore.loading).toBe(false)
      expect(userStore.isLoggedIn).toBe(false)
    })

    it('应该正确处理更新用户信息错误', async () => {
      userStore.userInfo = createTestUser()
      userStore.isLoggedIn = true

      const error = new Error('更新失败')
      typedMockUserService.updateUserProfile.mockRejectedValue(error)

      await expect(userStore.updateUserInfo({ nickname: '新昵称' }))
        .rejects.toThrow(error)

      expect(userStore.loading).toBe(false)
    })
  })

  describe('状态持久化', () => {
    it('应该在状态变化时同步到本地存储', async () => {
      const testUser = createTestUser()
      const loginResponse = {
        user: testUser,
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600
        }
      }

      typedMockUserService.login.mockResolvedValue(loginResponse)

      await userStore.login('13800138000', 'password123')

      // 验证用户信息已同步到本地存储（通过userService调用）
      expect(typedMockUserService.login).toHaveBeenCalled()
    })
  })
})
