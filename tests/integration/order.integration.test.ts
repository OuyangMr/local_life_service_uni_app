/**
 * 订单管理集成测试
 * 测试完整的订单创建、管理和支付流程
 */

import {
  getTestApiClient,
  generateTestToken,
  getTestUser,
  getTestStore,
  getTestProducts,
  TEST_CONFIG
} from './setup'

describe('订单管理集成测试', () => {
  let apiClient: any
  let testUser: any
  let testVipUser: any
  let testMerchant: any
  let testStore: any
  let testProducts: any[]
  let userToken: string
  let vipUserToken: string
  let merchantToken: string

  beforeAll(async () => {
    apiClient = getTestApiClient()
    testUser = await getTestUser('user')
    
    // 获取VIP用户
    const { User } = await import('../../backend/src/models/User')
    testVipUser = await User.findOne({ isVip: true })
    
    testMerchant = await getTestUser('merchant')
    testStore = await getTestStore()
    testProducts = await getTestProducts()

    // 生成认证token
    userToken = generateTestToken(testUser._id.toString(), 'user')
    vipUserToken = generateTestToken(testVipUser._id.toString(), 'user')
    merchantToken = generateTestToken(testMerchant._id.toString(), 'merchant')
  })

  describe('订单创建流程', () => {
    it('应该成功创建包间预订订单', async () => {
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2小时后
        duration: 3,
        items: [
          {
            name: '豪华包间',
            quantity: 1,
            price: 200,
            total: 600 // 3小时 * 200/小时
          }
        ],
        totalAmount: 600,
        paymentMethod: 'wechat'
      }

      const response = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        userId: testUser._id.toString(),
        storeId: testStore._id.toString(),
        type: 'booking',
        status: 'pending',
        totalAmount: 600,
        paymentMethod: 'wechat'
      })
      expect(response.body.data).toHaveProperty('orderNumber')
      expect(response.body.data.orderNumber).toMatch(/^ORD\d+$/)
    })

    it('应该为VIP用户应用折扣', async () => {
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duration: 2,
        items: [
          {
            name: '豪华包间',
            quantity: 1,
            price: 200,
            total: 400
          }
        ],
        totalAmount: 400,
        paymentMethod: 'wechat'
      }

      const response = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${vipUserToken}`)
        .send(orderData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.discountAmount).toBeGreaterThan(0)
      expect(response.body.data.finalAmount).toBeLessThan(response.body.data.totalAmount)
    })

    it('应该成功创建商品订单', async () => {
      const product1 = testProducts[0]
      const product2 = testProducts[1]
      
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'product',
        items: [
          {
            productId: product1._id.toString(),
            name: product1.name,
            quantity: 2,
            price: product1.price,
            total: product1.price * 2
          },
          {
            productId: product2._id.toString(),
            name: product2.name,
            quantity: 1,
            price: product2.price,
            total: product2.price
          }
        ],
        totalAmount: product1.price * 2 + product2.price,
        paymentMethod: 'wechat'
      }

      const response = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.type).toBe('product')
      expect(response.body.data.items).toHaveLength(2)
    })

    it('应该拒绝预订时间过早的订单', async () => {
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30分钟后
        duration: 2,
        items: [
          {
            name: '包间',
            quantity: 1,
            price: 200,
            total: 400
          }
        ],
        totalAmount: 400,
        paymentMethod: 'wechat'
      }

      const response = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('预订时间至少需要提前1小时')
    })

    it('应该拒绝未登录用户创建订单', async () => {
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duration: 2,
        totalAmount: 400
      }

      const response = await apiClient
        .post('/api/orders')
        .send(orderData)

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
  })

  describe('订单查询流程', () => {
    let testOrderId: string

    beforeAll(async () => {
      // 创建一个测试订单
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duration: 2,
        items: [{ name: '测试包间', quantity: 1, price: 200, total: 400 }],
        totalAmount: 400,
        paymentMethod: 'wechat'
      }

      const response = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)

      testOrderId = response.body.data.id
    })

    it('应该能获取用户的订单列表', async () => {
      const response = await apiClient
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('items')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page')
      expect(response.body.data.items.length).toBeGreaterThan(0)
      
      // 验证只返回当前用户的订单
      response.body.data.items.forEach((order: any) => {
        expect(order.userId).toBe(testUser._id.toString())
      })
    })

    it('应该支持按状态筛选订单', async () => {
      const response = await apiClient
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ status: 'pending', page: 1, limit: 10 })

      expect(response.status).toBe(200)
      response.body.data.items.forEach((order: any) => {
        expect(order.status).toBe('pending')
      })
    })

    it('应该支持按时间范围筛选订单', async () => {
      const today = new Date().toISOString().split('T')[0]
      
      const response = await apiClient
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ 
          startDate: today,
          endDate: today,
          page: 1, 
          limit: 10 
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('应该能获取订单详情', async () => {
      const response = await apiClient
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testOrderId)
      expect(response.body.data.userId).toBe(testUser._id.toString())
    })

    it('商户应该能查看所属店铺的订单', async () => {
      const response = await apiClient
        .get('/api/orders')
        .set('Authorization', `Bearer ${merchantToken}`)
        .query({ page: 1, limit: 10 })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      
      // 验证返回的是该商户店铺的订单
      response.body.data.items.forEach((order: any) => {
        expect(order.storeId).toBe(testStore._id.toString())
      })
    })

    it('应该拒绝访问其他用户的订单详情', async () => {
      // 创建另一个用户的token
      const { User } = await import('../../backend/src/models/User')
      const otherUser = await User.findOne({ userType: 'user', _id: { $ne: testUser._id } })
      const otherUserToken = generateTestToken(otherUser._id.toString(), 'user')

      const response = await apiClient
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('订单状态管理', () => {
    let testOrderId: string

    beforeEach(async () => {
      // 为每个测试创建新订单
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duration: 2,
        items: [{ name: '测试包间', quantity: 1, price: 200, total: 400 }],
        totalAmount: 400,
        paymentMethod: 'wechat'
      }

      const response = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)

      testOrderId = response.body.data.id
    })

    it('商户应该能更新订单状态', async () => {
      const updateData = {
        status: 'confirmed',
        notes: '订单已确认'
      }

      const response = await apiClient
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('confirmed')

      // 验证状态已更新
      const orderResponse = await apiClient
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(orderResponse.body.data.status).toBe('confirmed')
    })

    it('应该拒绝普通用户更新订单状态', async () => {
      const updateData = {
        status: 'confirmed'
      }

      const response = await apiClient
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('应该拒绝无效的状态转换', async () => {
      // 先将订单设为已完成
      await apiClient
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ status: 'completed' })

      // 尝试将已完成的订单改回pending
      const response = await apiClient
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ status: 'pending' })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('无效的状态转换')
    })
  })

  describe('订单取消流程', () => {
    let testOrderId: string

    beforeEach(async () => {
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4小时后
        duration: 2,
        items: [{ name: '测试包间', quantity: 1, price: 200, total: 400 }],
        totalAmount: 400,
        paymentMethod: 'wechat'
      }

      const response = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)

      testOrderId = response.body.data.id
    })

    it('用户应该能取消自己的订单', async () => {
      const cancelData = {
        reason: '临时有事'
      }

      const response = await apiClient
        .post(`/api/orders/${testOrderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(cancelData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)

      // 验证订单状态已改为取消
      const orderResponse = await apiClient
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(orderResponse.body.data.status).toBe('cancelled')
    })

    it('商户应该能取消任何状态的订单', async () => {
      // 先确认订单
      await apiClient
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({ status: 'confirmed' })

      // 商户取消已确认的订单
      const cancelData = {
        reason: '店铺维护'
      }

      const response = await apiClient
        .post(`/api/orders/${testOrderId}/cancel`)
        .set('Authorization', `Bearer ${merchantToken}`)
        .send(cancelData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('应该在取消时间太晚时拒绝用户取消', async () => {
      // 创建一个预订时间很近的订单
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(), // 1.5小时后
        duration: 2,
        items: [{ name: '测试包间', quantity: 1, price: 200, total: 400 }],
        totalAmount: 400,
        paymentMethod: 'wechat'
      }

      const createResponse = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)

      const nearOrderId = createResponse.body.data.id

      const cancelResponse = await apiClient
        .post(`/api/orders/${nearOrderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: '临时有事' })

      expect(cancelResponse.status).toBe(400)
      expect(cancelResponse.body.success).toBe(false)
      expect(cancelResponse.body.message).toContain('订单开始前2小时内不可取消')
    })
  })

  describe('订单统计功能', () => {
    beforeAll(async () => {
      // 创建一些不同状态的订单用于统计
      const orders = [
        { status: 'completed', amount: 300 },
        { status: 'completed', amount: 500 },
        { status: 'pending', amount: 200 },
        { status: 'cancelled', amount: 400 }
      ]

      for (const orderInfo of orders) {
        const orderData = {
          storeId: testStore._id.toString(),
          type: 'booking',
          bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          duration: 2,
          items: [{ name: '测试包间', quantity: 1, price: orderInfo.amount / 2, total: orderInfo.amount }],
          totalAmount: orderInfo.amount,
          paymentMethod: 'wechat'
        }

        const createResponse = await apiClient
          .post('/api/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderData)

        if (orderInfo.status !== 'pending') {
          await apiClient
            .put(`/api/orders/${createResponse.body.data.id}/status`)
            .set('Authorization', `Bearer ${merchantToken}`)
            .send({ status: orderInfo.status })
        }
      }
    })

    it('用户应该能获取自己的订单统计', async () => {
      const response = await apiClient
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ period: 'today' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('totalOrders')
      expect(response.body.data).toHaveProperty('totalAmount')
      expect(response.body.data).toHaveProperty('completedOrders')
      expect(response.body.data).toHaveProperty('pendingOrders')
      expect(response.body.data).toHaveProperty('cancelledOrders')
    })

    it('商户应该能获取店铺的订单统计', async () => {
      const response = await apiClient
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${merchantToken}`)
        .query({ period: 'today' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.totalOrders).toBeGreaterThan(0)
    })

    it('应该支持不同的统计时间周期', async () => {
      const periods = ['today', 'week', 'month', 'all']
      
      for (const period of periods) {
        const response = await apiClient
          .get('/api/orders/stats')
          .set('Authorization', `Bearer ${userToken}`)
          .query({ period })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveProperty('totalOrders')
      }
    })
  })

  describe('错误处理和边界条件', () => {
    it('应该处理无效的订单ID', async () => {
      const response = await apiClient
        .get('/api/orders/invalid-id')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该处理不存在的订单', async () => {
      const fakeOrderId = '507f1f77bcf86cd799439011'
      
      const response = await apiClient
        .get(`/api/orders/${fakeOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
    })

    it('应该处理无效的订单数据', async () => {
      const invalidOrderData = {
        storeId: 'invalid-store-id',
        type: 'invalid-type',
        totalAmount: -100 // 负数金额
      }

      const response = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidOrderData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该处理并发订单创建', async () => {
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duration: 2,
        items: [{ name: '测试包间', quantity: 1, price: 200, total: 400 }],
        totalAmount: 400,
        paymentMethod: 'wechat'
      }

      const promises = Array(3).fill(0).map(() =>
        apiClient
          .post('/api/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send(orderData)
      )

      const responses = await Promise.all(promises)

      responses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })

      // 验证生成的订单号是唯一的
      const orderNumbers = responses.map(r => r.body.data.orderNumber)
      const uniqueOrderNumbers = [...new Set(orderNumbers)]
      expect(uniqueOrderNumbers.length).toBe(orderNumbers.length)
    })
  })
})
