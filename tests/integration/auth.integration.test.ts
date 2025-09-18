/**
 * 用户认证集成测试
 * 测试前后端用户认证API的完整流程
 */

import {
  getTestApiClient,
  generateTestToken,
  getTestUser,
  TEST_CONFIG
} from './setup'

describe('用户认证集成测试', () => {
  let apiClient: any
  let testUser: any
  let testMerchant: any

  beforeAll(async () => {
    apiClient = getTestApiClient()
    testUser = await getTestUser('user')
    testMerchant = await getTestUser('merchant')
  })

  describe('用户注册流程', () => {
    it('应该成功完成完整的用户注册流程', async () => {
      const phoneNumber = '13900139000'
      const password = 'newuser123'
      const nickname = '新用户'

      // 1. 发送短信验证码
      const smsResponse = await apiClient
        .post('/api/auth/send-sms')
        .send({
          phone: phoneNumber,
          type: 'register'
        })

      expect(smsResponse.status).toBe(200)
      expect(smsResponse.body.success).toBe(true)

      // 2. 验证短信验证码（测试环境返回验证码）
      const smsCode = smsResponse.body.data?.code || '123456'
      
      const verifyResponse = await apiClient
        .post('/api/auth/verify-sms')
        .send({
          phone: phoneNumber,
          code: smsCode,
          type: 'register'
        })

      expect(verifyResponse.status).toBe(200)
      expect(verifyResponse.body.success).toBe(true)

      // 3. 完成用户注册
      const registerResponse = await apiClient
        .post('/api/auth/register')
        .send({
          phone: phoneNumber,
          password,
          nickname,
          verificationCode: smsCode
        })

      expect(registerResponse.status).toBe(201)
      expect(registerResponse.body.success).toBe(true)
      expect(registerResponse.body.data).toHaveProperty('user')
      expect(registerResponse.body.data).toHaveProperty('tokens')
      expect(registerResponse.body.data.user.phone).toBe(phoneNumber)
      expect(registerResponse.body.data.user.nickname).toBe(nickname)
      expect(registerResponse.body.data.tokens).toHaveProperty('token')
      expect(registerResponse.body.data.tokens).toHaveProperty('refreshToken')
    })

    it('应该拒绝重复注册相同手机号', async () => {
      const existingPhone = testUser.phone

      const smsResponse = await apiClient
        .post('/api/auth/send-sms')
        .send({
          phone: existingPhone,
          type: 'register'
        })

      expect(smsResponse.status).toBe(409)
      expect(smsResponse.body.success).toBe(false)
      expect(smsResponse.body.message).toContain('手机号已注册')
    })

    it('应该拒绝无效的验证码', async () => {
      const phoneNumber = '13900139001'

      // 先发送验证码
      await apiClient
        .post('/api/auth/send-sms')
        .send({
          phone: phoneNumber,
          type: 'register'
        })

      // 使用错误的验证码注册
      const registerResponse = await apiClient
        .post('/api/auth/register')
        .send({
          phone: phoneNumber,
          password: 'password123',
          nickname: '测试用户',
          verificationCode: '000000' // 错误的验证码
        })

      expect(registerResponse.status).toBe(400)
      expect(registerResponse.body.success).toBe(false)
      expect(registerResponse.body.message).toContain('验证码错误')
    })
  })

  describe('用户登录流程', () => {
    it('应该成功登录有效用户', async () => {
      const loginResponse = await apiClient
        .post('/api/auth/login')
        .send({
          phone: testUser.phone,
          password: 'password123' // 测试数据中的密码
        })

      expect(loginResponse.status).toBe(200)
      expect(loginResponse.body.success).toBe(true)
      expect(loginResponse.body.data).toHaveProperty('user')
      expect(loginResponse.body.data).toHaveProperty('tokens')
      expect(loginResponse.body.data.user.id).toBe(testUser._id.toString())
      expect(loginResponse.body.data.user.phone).toBe(testUser.phone)
      expect(loginResponse.body.data.tokens).toHaveProperty('token')
      expect(loginResponse.body.data.tokens).toHaveProperty('refreshToken')
    })

    it('应该拒绝错误的密码', async () => {
      const loginResponse = await apiClient
        .post('/api/auth/login')
        .send({
          phone: testUser.phone,
          password: 'wrongpassword'
        })

      expect(loginResponse.status).toBe(401)
      expect(loginResponse.body.success).toBe(false)
      expect(loginResponse.body.message).toContain('用户不存在或密码错误')
    })

    it('应该拒绝不存在的用户', async () => {
      const loginResponse = await apiClient
        .post('/api/auth/login')
        .send({
          phone: '19900199000',
          password: 'password123'
        })

      expect(loginResponse.status).toBe(401)
      expect(loginResponse.body.success).toBe(false)
      expect(loginResponse.body.message).toContain('用户不存在或密码错误')
    })

    it('应该为不同用户类型返回正确的信息', async () => {
      // 测试普通用户登录
      const userLoginResponse = await apiClient
        .post('/api/auth/login')
        .send({
          phone: testUser.phone,
          password: 'password123'
        })

      expect(userLoginResponse.body.data.user.userType).toBe('user')

      // 测试商户用户登录
      const merchantLoginResponse = await apiClient
        .post('/api/auth/login')
        .send({
          phone: testMerchant.phone,
          password: 'password123'
        })

      expect(merchantLoginResponse.body.data.user.userType).toBe('merchant')
    })
  })

  describe('Token管理流程', () => {
    let userToken: string
    let refreshToken: string

    beforeAll(async () => {
      // 获取有效的token
      const loginResponse = await apiClient
        .post('/api/auth/login')
        .send({
          phone: testUser.phone,
          password: 'password123'
        })

      userToken = loginResponse.body.data.tokens.token
      refreshToken = loginResponse.body.data.tokens.refreshToken
    })

    it('应该能使用有效token访问受保护的资源', async () => {
      const profileResponse = await apiClient
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)

      expect(profileResponse.status).toBe(200)
      expect(profileResponse.body.success).toBe(true)
      expect(profileResponse.body.data.id).toBe(testUser._id.toString())
    })

    it('应该拒绝无token的受保护资源访问', async () => {
      const profileResponse = await apiClient
        .get('/api/auth/profile')

      expect(profileResponse.status).toBe(401)
      expect(profileResponse.body.success).toBe(false)
    })

    it('应该拒绝无效token的受保护资源访问', async () => {
      const profileResponse = await apiClient
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')

      expect(profileResponse.status).toBe(401)
      expect(profileResponse.body.success).toBe(false)
    })

    it('应该成功刷新有效的refreshToken', async () => {
      const refreshResponse = await apiClient
        .post('/api/auth/refresh-token')
        .send({
          refreshToken
        })

      expect(refreshResponse.status).toBe(200)
      expect(refreshResponse.body.success).toBe(true)
      expect(refreshResponse.body.data).toHaveProperty('token')
      expect(refreshResponse.body.data).toHaveProperty('refreshToken')
      expect(refreshResponse.body.data.token).not.toBe(userToken) // 新token应该不同
    })

    it('应该拒绝无效的refreshToken', async () => {
      const refreshResponse = await apiClient
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: 'invalid-refresh-token'
        })

      expect(refreshResponse.status).toBe(401)
      expect(refreshResponse.body.success).toBe(false)
    })
  })

  describe('用户信息管理', () => {
    let userToken: string

    beforeEach(async () => {
      // 每次测试前都获取新的token
      const loginResponse = await apiClient
        .post('/api/auth/login')
        .send({
          phone: testUser.phone,
          password: 'password123'
        })

      userToken = loginResponse.body.data.tokens.token
    })

    it('应该能获取用户信息', async () => {
      const profileResponse = await apiClient
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)

      expect(profileResponse.status).toBe(200)
      expect(profileResponse.body.success).toBe(true)
      expect(profileResponse.body.data).toMatchObject({
        id: testUser._id.toString(),
        phone: testUser.phone,
        nickname: testUser.nickname,
        userType: testUser.userType,
        vipLevel: testUser.vipLevel,
        balance: testUser.balance,
        isActive: true,
        isVerified: true
      })
    })

    it('应该能更新用户信息', async () => {
      const updateData = {
        nickname: '更新后的昵称',
        avatar: 'https://example.com/new-avatar.jpg'
      }

      const updateResponse = await apiClient
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)

      expect(updateResponse.status).toBe(200)
      expect(updateResponse.body.success).toBe(true)
      expect(updateResponse.body.data.nickname).toBe(updateData.nickname)
      expect(updateResponse.body.data.avatar).toBe(updateData.avatar)

      // 验证信息已保存
      const profileResponse = await apiClient
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)

      expect(profileResponse.body.data.nickname).toBe(updateData.nickname)
      expect(profileResponse.body.data.avatar).toBe(updateData.avatar)
    })

    it('应该能成功退出登录', async () => {
      const logoutResponse = await apiClient
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)

      expect(logoutResponse.status).toBe(200)
      expect(logoutResponse.body.success).toBe(true)

      // 退出后token应该失效
      const profileResponse = await apiClient
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)

      expect(profileResponse.status).toBe(401)
    })
  })

  describe('密码重置流程', () => {
    it('应该成功完成密码重置流程', async () => {
      const phoneNumber = testUser.phone
      const newPassword = 'newpassword123'

      // 1. 发送重置密码验证码
      const smsResponse = await apiClient
        .post('/api/auth/send-sms')
        .send({
          phone: phoneNumber,
          type: 'reset_password'
        })

      expect(smsResponse.status).toBe(200)
      expect(smsResponse.body.success).toBe(true)

      // 2. 重置密码
      const smsCode = smsResponse.body.data?.code || '123456'
      
      const resetResponse = await apiClient
        .post('/api/auth/reset-password')
        .send({
          phone: phoneNumber,
          verificationCode: smsCode,
          newPassword
        })

      expect(resetResponse.status).toBe(200)
      expect(resetResponse.body.success).toBe(true)

      // 3. 用新密码登录验证
      const loginResponse = await apiClient
        .post('/api/auth/login')
        .send({
          phone: phoneNumber,
          password: newPassword
        })

      expect(loginResponse.status).toBe(200)
      expect(loginResponse.body.success).toBe(true)

      // 4. 用旧密码登录应该失败
      const oldPasswordLogin = await apiClient
        .post('/api/auth/login')
        .send({
          phone: phoneNumber,
          password: 'password123'
        })

      expect(oldPasswordLogin.status).toBe(401)
    })

    it('应该拒绝未注册手机号的密码重置', async () => {
      const smsResponse = await apiClient
        .post('/api/auth/send-sms')
        .send({
          phone: '19900199999',
          type: 'reset_password'
        })

      expect(smsResponse.status).toBe(404)
      expect(smsResponse.body.success).toBe(false)
      expect(smsResponse.body.message).toContain('手机号未注册')
    })
  })

  describe('并发和安全测试', () => {
    it('应该正确处理并发登录请求', async () => {
      const loginPromises = Array(5).fill(0).map(() =>
        apiClient
          .post('/api/auth/login')
          .send({
            phone: testUser.phone,
            password: 'password123'
          })
      )

      const responses = await Promise.all(loginPromises)

      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.user.id).toBe(testUser._id.toString())
      })
    })

    it('应该正确处理频繁的验证码请求', async () => {
      const phone = '13900139999'
      const requests = []

      // 发送多个验证码请求
      for (let i = 0; i < 3; i++) {
        requests.push(
          apiClient
            .post('/api/auth/send-sms')
            .send({
              phone,
              type: 'register'
            })
        )
      }

      const responses = await Promise.all(requests)
      
      // 第一个请求应该成功
      expect(responses[0].status).toBe(200)
      
      // 后续请求可能因为频率限制而失败
      responses.slice(1).forEach(response => {
        expect([200, 429]).toContain(response.status) // 200成功或429频率限制
      })
    })
  })
})
