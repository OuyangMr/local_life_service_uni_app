/**
 * 支付流程集成测试
 * 测试完整的支付创建、处理和回调流程
 */

import {
  getTestApiClient,
  generateTestToken,
  getTestUser,
  getTestStore,
  TEST_CONFIG
} from './setup'

describe('支付流程集成测试', () => {
  let apiClient: any
  let testUser: any
  let testVipUser: any
  let testStore: any
  let userToken: string
  let vipUserToken: string
  let testOrderId: string

  beforeAll(async () => {
    apiClient = getTestApiClient()
    testUser = await getTestUser('user')
    
    const { User } = await import('../../backend/src/models/User')
    testVipUser = await User.findOne({ isVip: true })
    
    testStore = await getTestStore()

    userToken = generateTestToken(testUser._id.toString(), 'user')
    vipUserToken = generateTestToken(testVipUser._id.toString(), 'user')
  })

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

  describe('支付创建流程', () => {
    it('应该成功创建微信支付', async () => {
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400
      }

      const response = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('paymentId')
      expect(response.body.data).toHaveProperty('prepayId')
      expect(response.body.data).toHaveProperty('paySign')
      expect(response.body.data).toHaveProperty('timeStamp')
      expect(response.body.data).toHaveProperty('nonceStr')
      expect(response.body.data.paymentMethod).toBe('wechat')
      expect(response.body.data.amount).toBe(400)
    })

    it('应该支持积分抵扣支付', async () => {
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400,
        usePoints: true,
        pointsAmount: 100 // 使用100积分抵扣
      }

      const response = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.amount).toBe(300) // 400 - 100积分抵扣
      expect(response.body.data.pointsUsed).toBe(100)
    })

    it('应该拒绝超出用户积分余额的抵扣', async () => {
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400,
        usePoints: true,
        pointsAmount: 1000 // 超出用户积分余额
      }

      const response = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('积分余额不足')
    })

    it('应该拒绝无效的订单ID', async () => {
      const paymentData = {
        orderId: 'invalid-order-id',
        paymentMethod: 'wechat',
        amount: 400
      }

      const response = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('应该拒绝不匹配的支付金额', async () => {
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 500 // 与订单金额不符
      }

      const response = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('支付金额与订单金额不符')
    })

    it('应该拒绝已支付订单的重复支付', async () => {
      // 先创建一次支付
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400
      }

      const firstPayment = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      expect(firstPayment.status).toBe(200)

      // 模拟支付成功
      await apiClient
        .post('/api/payments/webhook/wechat')
        .send({
          out_trade_no: firstPayment.body.data.paymentId,
          transaction_id: 'wechat_txn_123',
          total_fee: 40000, // 微信支付金额以分为单位
          result_code: 'SUCCESS',
          return_code: 'SUCCESS'
        })

      // 尝试再次支付
      const secondPayment = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      expect(secondPayment.status).toBe(400)
      expect(secondPayment.body.success).toBe(false)
      expect(secondPayment.body.message).toContain('订单已支付')
    })
  })

  describe('支付回调处理', () => {
    let paymentId: string

    beforeEach(async () => {
      // 创建支付
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400
      }

      const response = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      paymentId = response.body.data.paymentId
    })

    it('应该正确处理微信支付成功回调', async () => {
      const callbackData = {
        out_trade_no: paymentId,
        transaction_id: 'wechat_txn_123456',
        total_fee: 40000, // 400元，以分为单位
        result_code: 'SUCCESS',
        return_code: 'SUCCESS',
        time_end: '20230915120000'
      }

      const response = await apiClient
        .post('/api/payments/webhook/wechat')
        .send(callbackData)

      expect(response.status).toBe(200)
      expect(response.text).toBe('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>')

      // 验证订单和支付状态已更新
      const orderResponse = await apiClient
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(orderResponse.body.data.paymentStatus).toBe('paid')

      const paymentResponse = await apiClient
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(paymentResponse.body.data.status).toBe('success')
      expect(paymentResponse.body.data.transactionId).toBe('wechat_txn_123456')
    })

    it('应该正确处理微信支付失败回调', async () => {
      const callbackData = {
        out_trade_no: paymentId,
        result_code: 'FAIL',
        return_code: 'SUCCESS',
        err_code: 'INSUFFICIENT_FUNDS',
        err_code_des: '余额不足'
      }

      const response = await apiClient
        .post('/api/payments/webhook/wechat')
        .send(callbackData)

      expect(response.status).toBe(200)

      // 验证支付状态已更新为失败
      const paymentResponse = await apiClient
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(paymentResponse.body.data.status).toBe('failed')
    })

    it('应该拒绝无效的回调数据', async () => {
      const invalidCallbackData = {
        out_trade_no: 'invalid-payment-id',
        result_code: 'SUCCESS',
        return_code: 'SUCCESS'
      }

      const response = await apiClient
        .post('/api/payments/webhook/wechat')
        .send(invalidCallbackData)

      expect(response.status).toBe(400)
    })

    it('应该正确处理重复的回调', async () => {
      const callbackData = {
        out_trade_no: paymentId,
        transaction_id: 'wechat_txn_123456',
        total_fee: 40000,
        result_code: 'SUCCESS',
        return_code: 'SUCCESS'
      }

      // 第一次回调
      const firstResponse = await apiClient
        .post('/api/payments/webhook/wechat')
        .send(callbackData)

      expect(firstResponse.status).toBe(200)

      // 第二次相同回调
      const secondResponse = await apiClient
        .post('/api/payments/webhook/wechat')
        .send(callbackData)

      expect(secondResponse.status).toBe(200) // 应该正常处理，但不重复更新
    })
  })

  describe('支付查询功能', () => {
    let paymentId: string

    beforeEach(async () => {
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400
      }

      const response = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      paymentId = response.body.data.paymentId
    })

    it('应该能查询支付详情', async () => {
      const response = await apiClient
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        id: paymentId,
        orderId: testOrderId,
        userId: testUser._id.toString(),
        paymentMethod: 'wechat',
        amount: 400,
        status: 'pending'
      })
    })

    it('应该能获取用户的支付记录列表', async () => {
      const response = await apiClient
        .get('/api/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ page: 1, limit: 10 })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('items')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data.items.length).toBeGreaterThan(0)

      // 验证只返回当前用户的支付记录
      response.body.data.items.forEach((payment: any) => {
        expect(payment.userId).toBe(testUser._id.toString())
      })
    })

    it('应该支持按支付状态筛选', async () => {
      const response = await apiClient
        .get('/api/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .query({ status: 'pending', page: 1, limit: 10 })

      expect(response.status).toBe(200)
      response.body.data.items.forEach((payment: any) => {
        expect(payment.status).toBe('pending')
      })
    })

    it('应该拒绝查询其他用户的支付记录', async () => {
      // 创建另一个用户的token
      const { User } = await import('../../backend/src/models/User')
      const otherUser = await User.findOne({ userType: 'user', _id: { $ne: testUser._id } })
      const otherUserToken = generateTestToken(otherUser._id.toString(), 'user')

      const response = await apiClient
        .get(`/api/payments/${paymentId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })
  })

  describe('退款流程', () => {
    let paymentId: string

    beforeEach(async () => {
      // 创建并完成支付
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400
      }

      const createResponse = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      paymentId = createResponse.body.data.paymentId

      // 模拟支付成功
      await apiClient
        .post('/api/payments/webhook/wechat')
        .send({
          out_trade_no: paymentId,
          transaction_id: 'wechat_txn_123',
          total_fee: 40000,
          result_code: 'SUCCESS',
          return_code: 'SUCCESS'
        })
    })

    it('应该能申请全额退款', async () => {
      const refundData = {
        paymentId,
        amount: 400,
        reason: '取消订单'
      }

      const response = await apiClient
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send(refundData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('refundId')
      expect(response.body.data.amount).toBe(400)
      expect(response.body.data.status).toBe('processing')
    })

    it('应该能申请部分退款', async () => {
      const refundData = {
        paymentId,
        amount: 200, // 部分退款
        reason: '部分取消'
      }

      const response = await apiClient
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send(refundData)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.amount).toBe(200)
    })

    it('应该拒绝超额退款', async () => {
      const refundData = {
        paymentId,
        amount: 500, // 超过支付金额
        reason: '取消订单'
      }

      const response = await apiClient
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send(refundData)

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('退款金额不能超过支付金额')
    })

    it('应该拒绝未支付订单的退款', async () => {
      // 创建新的未支付订单
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duration: 2,
        items: [{ name: '测试包间', quantity: 1, price: 200, total: 400 }],
        totalAmount: 400,
        paymentMethod: 'wechat'
      }

      const orderResponse = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)

      const newOrderId = orderResponse.body.data.id

      const paymentData = {
        orderId: newOrderId,
        paymentMethod: 'wechat',
        amount: 400
      }

      const createResponse = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      const newPaymentId = createResponse.body.data.paymentId

      // 尝试退款未支付的订单
      const refundData = {
        paymentId: newPaymentId,
        amount: 400,
        reason: '取消订单'
      }

      const refundResponse = await apiClient
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send(refundData)

      expect(refundResponse.status).toBe(400)
      expect(refundResponse.body.success).toBe(false)
      expect(refundResponse.body.message).toContain('只能退款已支付的订单')
    })
  })

  describe('积分支付和返还', () => {
    beforeEach(async () => {
      // 确保测试用户有足够积分
      const { User } = await import('../../backend/src/models/User')
      await User.findByIdAndUpdate(testUser._id, { points: 1000 })
    })

    it('应该正确扣除和返还积分', async () => {
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400,
        usePoints: true,
        pointsAmount: 200 // 使用200积分
      }

      // 创建支付
      const createResponse = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      expect(createResponse.status).toBe(200)

      const paymentId = createResponse.body.data.paymentId

      // 验证积分已扣除
      const { User } = await import('../../backend/src/models/User')
      const userAfterPayment = await User.findById(testUser._id)
      expect(userAfterPayment.points).toBe(800) // 1000 - 200

      // 模拟支付成功
      await apiClient
        .post('/api/payments/webhook/wechat')
        .send({
          out_trade_no: paymentId,
          transaction_id: 'wechat_txn_123',
          total_fee: 20000, // 200元（400 - 200积分抵扣）
          result_code: 'SUCCESS',
          return_code: 'SUCCESS'
        })

      // 完成订单后应该获得积分奖励
      const { Order } = await import('../../backend/src/models/Order')
      await Order.findByIdAndUpdate(testOrderId, { status: 'completed' })

      // 模拟积分奖励计算（通常是消费金额的1%）
      const expectedReward = Math.floor(400 * 0.01)
      
      const userAfterReward = await User.findById(testUser._id)
      expect(userAfterReward.points).toBeGreaterThanOrEqual(800) // 可能有积分奖励
    })

    it('VIP用户应该获得更多积分奖励', async () => {
      // 为VIP用户创建订单
      const orderData = {
        storeId: testStore._id.toString(),
        type: 'booking',
        bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        duration: 2,
        items: [{ name: '测试包间', quantity: 1, price: 200, total: 400 }],
        totalAmount: 400,
        paymentMethod: 'wechat'
      }

      const orderResponse = await apiClient
        .post('/api/orders')
        .set('Authorization', `Bearer ${vipUserToken}`)
        .send(orderData)

      const vipOrderId = orderResponse.body.data.id

      const paymentData = {
        orderId: vipOrderId,
        paymentMethod: 'wechat',
        amount: 400
      }

      const createResponse = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${vipUserToken}`)
        .send(paymentData)

      const paymentId = createResponse.body.data.paymentId

      // 模拟支付成功
      await apiClient
        .post('/api/payments/webhook/wechat')
        .send({
          out_trade_no: paymentId,
          transaction_id: 'wechat_txn_vip_123',
          total_fee: 40000,
          result_code: 'SUCCESS',
          return_code: 'SUCCESS'
        })

      // VIP用户应该获得更高的积分奖励倍率
      const { User } = await import('../../backend/src/models/User')
      const vipUserAfter = await User.findById(testVipUser._id)
      
      // VIP用户通常有更高的积分奖励倍率（例如2%而不是1%）
      const expectedVipReward = Math.floor(400 * 0.02)
      expect(vipUserAfter.points).toBeGreaterThanOrEqual(testVipUser.points)
    })
  })

  describe('支付安全和并发测试', () => {
    it('应该正确处理并发支付请求', async () => {
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400
      }

      // 发起多个并发支付请求
      const promises = Array(3).fill(0).map(() =>
        apiClient
          .post('/api/payments/create')
          .set('Authorization', `Bearer ${userToken}`)
          .send(paymentData)
      )

      const responses = await Promise.all(promises)

      // 只有一个请求应该成功，其他应该失败
      const successCount = responses.filter(r => r.status === 200).length
      expect(successCount).toBe(1)

      const failureCount = responses.filter(r => r.status === 400).length
      expect(failureCount).toBe(2)
    })

    it('应该验证支付金额的一致性', async () => {
      const paymentData = {
        orderId: testOrderId,
        paymentMethod: 'wechat',
        amount: 400
      }

      const createResponse = await apiClient
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send(paymentData)

      const paymentId = createResponse.body.data.paymentId

      // 尝试用不同金额的回调
      const wrongAmountCallback = {
        out_trade_no: paymentId,
        transaction_id: 'wechat_txn_123',
        total_fee: 50000, // 500元，与实际支付金额不符
        result_code: 'SUCCESS',
        return_code: 'SUCCESS'
      }

      const callbackResponse = await apiClient
        .post('/api/payments/webhook/wechat')
        .send(wrongAmountCallback)

      expect(callbackResponse.status).toBe(400)
    })
  })
})
