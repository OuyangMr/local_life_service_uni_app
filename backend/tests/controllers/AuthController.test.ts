/**
 * AuthController 单元测试
 * 测试用户认证相关的所有功能
 */

import request from 'supertest'
import mongoose from 'mongoose'
import { User } from '../../src/models/User'
import { AuthController } from '../../src/controllers/AuthController'
import { cache } from '../../src/config/redis'
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  generateTestToken,
  connectTestDatabase,
  disconnectTestDatabase,
  cleanupDatabase,
  expectApiResponse,
  expectErrorResponse
} from '../helpers/testUtils'

// Mock外部依赖
jest.mock('../../src/config/redis')
jest.mock('../../src/utils/logger')

const mockCache = cache as jest.Mocked<typeof cache>

describe('AuthController', () => {
  beforeAll(async () => {
    await connectTestDatabase()
  })

  afterAll(async () => {
    await disconnectTestDatabase()
  })

  beforeEach(async () => {
    await cleanupDatabase()
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      // 准备测试数据
      const phone = '13800138000'
      const password = 'test123456'
      const verificationCode = '123456'
      
      // Mock缓存中的验证码
      mockCache.get.mockResolvedValue(verificationCode)
      mockCache.del.mockResolvedValue(1)
      mockCache.set.mockResolvedValue('OK')

      // Mock请求和响应
      const req = createMockRequest({
        body: { phone, password, verificationCode },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent')
      })
      const res = createMockResponse()

      // 执行测试
      await AuthController.register(req as any, res as any)

      // 验证结果
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '注册成功',
          data: expect.objectContaining({
            user: expect.objectContaining({
              phone,
              userType: 'user'
            }),
            tokens: expect.objectContaining({
              token: expect.any(String),
              refreshToken: expect.any(String),
              expiresIn: 24 * 60 * 60
            })
          })
        })
      )

      // 验证用户是否已保存到数据库
      const savedUser = await User.findOne({ phone })
      expect(savedUser).toBeTruthy()
      expect(savedUser?.phone).toBe(phone)
      expect(savedUser?.isVerified).toBe(true)
    })

    it('应该在验证码错误时返回错误', async () => {
      const phone = '13800138000'
      const password = 'test123456'
      const verificationCode = '123456'
      
      // Mock缓存返回不同的验证码
      mockCache.get.mockResolvedValue('654321')

      const req = createMockRequest({
        body: { phone, password, verificationCode }
      })
      const res = createMockResponse()

      // 执行测试并期望抛出错误
      await expect(AuthController.register(req as any, res as any))
        .rejects.toThrow('验证码错误或已过期')
    })

    it('应该在手机号已注册时返回错误', async () => {
      // 先创建一个用户
      const existingUser = new User(createTestUser({
        phone: '13800138000'
      }))
      await existingUser.save()

      const phone = '13800138000'
      const password = 'test123456'
      const verificationCode = '123456'
      
      mockCache.get.mockResolvedValue(verificationCode)

      const req = createMockRequest({
        body: { phone, password, verificationCode }
      })
      const res = createMockResponse()

      // 执行测试并期望抛出错误
      await expect(AuthController.register(req as any, res as any))
        .rejects.toThrow('手机号已注册')
    })

    it('应该处理邀请码逻辑', async () => {
      const phone = '13800138000'
      const password = 'test123456'
      const verificationCode = '123456'
      const inviteCode = 'INVITE123'
      
      mockCache.get.mockResolvedValue(verificationCode)
      mockCache.del.mockResolvedValue(1)
      mockCache.set.mockResolvedValue('OK')

      const req = createMockRequest({
        body: { phone, password, verificationCode, inviteCode },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent')
      })
      const res = createMockResponse()

      await AuthController.register(req as any, res as any)

      // 验证用户保存了邀请码
      const savedUser = await User.findOne({ phone })
      expect(savedUser?.invitedBy).toBe(inviteCode)
    })
  })

  describe('login', () => {
    let testUser: any

    beforeEach(async () => {
      // 创建测试用户
      testUser = new User(createTestUser({
        phone: '13800138000',
        password: 'test123456'
      }))
      await testUser.save()
    })

    it('应该成功登录有效用户', async () => {
      const phone = '13800138000'
      const password = 'test123456'
      
      mockCache.set.mockResolvedValue('OK')

      const req = createMockRequest({
        body: { phone, password },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent')
      })
      const res = createMockResponse()

      await AuthController.login(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '登录成功',
          data: expect.objectContaining({
            user: expect.objectContaining({
              phone,
              id: testUser._id.toString()
            }),
            tokens: expect.objectContaining({
              token: expect.any(String),
              refreshToken: expect.any(String)
            })
          })
        })
      )
    })

    it('应该在用户不存在时返回错误', async () => {
      const phone = '13800138001' // 不存在的手机号
      const password = 'test123456'

      const req = createMockRequest({
        body: { phone, password }
      })
      const res = createMockResponse()

      await expect(AuthController.login(req as any, res as any))
        .rejects.toThrow('用户不存在或密码错误')
    })

    it('应该在密码错误时返回错误', async () => {
      const phone = '13800138000'
      const password = 'wrongpassword'

      const req = createMockRequest({
        body: { phone, password }
      })
      const res = createMockResponse()

      await expect(AuthController.login(req as any, res as any))
        .rejects.toThrow('用户不存在或密码错误')
    })

    it('应该在账户被禁用时返回错误', async () => {
      // 禁用用户账户
      testUser.isActive = false
      await testUser.save()

      const phone = '13800138000'
      const password = 'test123456'

      const req = createMockRequest({
        body: { phone, password }
      })
      const res = createMockResponse()

      await expect(AuthController.login(req as any, res as any))
        .rejects.toThrow('账户已被禁用')
    })
  })

  describe('refreshToken', () => {
    let testUser: any
    let validRefreshToken: string

    beforeEach(async () => {
      testUser = new User(createTestUser())
      await testUser.save()
      validRefreshToken = generateTestToken(testUser._id.toString(), 'user')
    })

    it('应该成功刷新有效的token', async () => {
      mockCache.get.mockResolvedValue(validRefreshToken)
      mockCache.set.mockResolvedValue('OK')

      const req = createMockRequest({
        body: { refreshToken: validRefreshToken }
      })
      const res = createMockResponse()

      await AuthController.refreshToken(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token刷新成功',
          data: expect.objectContaining({
            token: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: 24 * 60 * 60
          })
        })
      )
    })

    it('应该在缺少refreshToken时返回错误', async () => {
      const req = createMockRequest({
        body: {}
      })
      const res = createMockResponse()

      await expect(AuthController.refreshToken(req as any, res as any))
        .rejects.toThrow('缺少刷新Token')
    })

    it('应该在refreshToken无效时返回错误', async () => {
      mockCache.get.mockResolvedValue(null)

      const req = createMockRequest({
        body: { refreshToken: 'invalid-token' }
      })
      const res = createMockResponse()

      await expect(AuthController.refreshToken(req as any, res as any))
        .rejects.toThrow('刷新Token无效')
    })
  })

  describe('logout', () => {
    it('应该成功退出登录', async () => {
      const userId = new mongoose.Types.ObjectId().toString()
      const token = 'test-token'
      
      mockCache.del.mockResolvedValue(1)

      const req = createMockRequest({
        user: { id: userId },
        headers: { authorization: `Bearer ${token}` },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent')
      })
      const res = createMockResponse()

      await AuthController.logout(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '退出成功'
        })
      )
    })

    it('应该在没有用户信息时也能正常退出', async () => {
      const req = createMockRequest({
        user: undefined
      })
      const res = createMockResponse()

      await AuthController.logout(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '退出成功'
        })
      )
    })
  })

  describe('sendSmsCode', () => {
    it('应该成功发送注册验证码', async () => {
      const phone = '13800138000'
      const type = 'register'
      
      mockCache.set.mockResolvedValue('OK')

      const req = createMockRequest({
        body: { phone, type }
      })
      const res = createMockResponse()

      // 设置开发环境
      process.env.NODE_ENV = 'development'

      await AuthController.sendSmsCode(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '验证码发送成功',
          data: expect.objectContaining({
            code: expect.stringMatching(/^\d{6}$/)
          })
        })
      )
    })

    it('应该在手机号已注册时拒绝发送注册验证码', async () => {
      // 先创建用户
      const testUser = new User(createTestUser({
        phone: '13800138000'
      }))
      await testUser.save()

      const phone = '13800138000'
      const type = 'register'

      const req = createMockRequest({
        body: { phone, type }
      })
      const res = createMockResponse()

      await expect(AuthController.sendSmsCode(req as any, res as any))
        .rejects.toThrow('手机号已注册')
    })

    it('应该在手机号未注册时拒绝发送登录验证码', async () => {
      const phone = '13800138000'
      const type = 'login'

      const req = createMockRequest({
        body: { phone, type }
      })
      const res = createMockResponse()

      await expect(AuthController.sendSmsCode(req as any, res as any))
        .rejects.toThrow('手机号未注册')
    })
  })

  describe('verifySmsCode', () => {
    it('应该成功验证正确的验证码', async () => {
      const phone = '13800138000'
      const code = '123456'
      const type = 'register'
      
      mockCache.get.mockResolvedValue(code)
      mockCache.del.mockResolvedValue(1)

      const req = createMockRequest({
        body: { phone, code, type }
      })
      const res = createMockResponse()

      await AuthController.verifySmsCode(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '验证码验证成功'
        })
      )
    })

    it('应该在验证码错误时返回错误', async () => {
      const phone = '13800138000'
      const code = '123456'
      const type = 'register'
      
      mockCache.get.mockResolvedValue('654321') // 不同的验证码

      const req = createMockRequest({
        body: { phone, code, type }
      })
      const res = createMockResponse()

      await expect(AuthController.verifySmsCode(req as any, res as any))
        .rejects.toThrow('验证码错误或已过期')
    })
  })

  describe('resetPassword', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = new User(createTestUser({
        phone: '13800138000'
      }))
      await testUser.save()
    })

    it('应该成功重置密码', async () => {
      const phone = '13800138000'
      const verificationCode = '123456'
      const newPassword = 'newPassword123'
      
      mockCache.get.mockResolvedValue(verificationCode)
      mockCache.del.mockResolvedValue(1)

      const req = createMockRequest({
        body: { phone, verificationCode, newPassword },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-user-agent')
      })
      const res = createMockResponse()

      await AuthController.resetPassword(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '密码重置成功，请重新登录'
        })
      )

      // 验证密码已更新
      const updatedUser = await User.findById(testUser._id)
      const isNewPasswordValid = await updatedUser?.comparePassword(newPassword)
      expect(isNewPasswordValid).toBe(true)
    })

    it('应该在验证码错误时返回错误', async () => {
      const phone = '13800138000'
      const verificationCode = '123456'
      const newPassword = 'newPassword123'
      
      mockCache.get.mockResolvedValue('654321')

      const req = createMockRequest({
        body: { phone, verificationCode, newPassword }
      })
      const res = createMockResponse()

      await expect(AuthController.resetPassword(req as any, res as any))
        .rejects.toThrow('验证码错误或已过期')
    })
  })

  describe('getProfile', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = new User(createTestUser())
      await testUser.save()
    })

    it('应该成功获取用户信息', async () => {
      const req = createMockRequest({
        user: { id: testUser._id.toString() }
      })
      const res = createMockResponse()

      await AuthController.getProfile(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取用户信息成功',
          data: expect.objectContaining({
            id: testUser._id.toString(),
            phone: testUser.phone,
            userType: testUser.userType
          })
        })
      )
    })

    it('应该在未登录时返回错误', async () => {
      const req = createMockRequest({
        user: undefined
      })
      const res = createMockResponse()

      await expect(AuthController.getProfile(req as any, res as any))
        .rejects.toThrow('未登录')
    })
  })

  describe('updateProfile', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = new User(createTestUser())
      await testUser.save()
    })

    it('应该成功更新用户信息', async () => {
      const updateData = {
        nickname: '新昵称',
        avatar: 'https://example.com/new-avatar.jpg',
        location: {
          type: 'Point',
          coordinates: [116.404, 39.915]
        }
      }

      const req = createMockRequest({
        user: { id: testUser._id.toString() },
        body: updateData
      })
      const res = createMockResponse()

      await AuthController.updateProfile(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '用户信息更新成功',
          data: expect.objectContaining({
            nickname: updateData.nickname,
            avatar: updateData.avatar
          })
        })
      )

      // 验证数据库中的数据已更新
      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser?.nickname).toBe(updateData.nickname)
      expect(updatedUser?.avatar).toBe(updateData.avatar)
    })

    it('应该在未登录时返回错误', async () => {
      const req = createMockRequest({
        user: undefined,
        body: { nickname: '新昵称' }
      })
      const res = createMockResponse()

      await expect(AuthController.updateProfile(req as any, res as any))
        .rejects.toThrow('未登录')
    })
  })
})
