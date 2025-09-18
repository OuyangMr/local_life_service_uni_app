/**
 * NotificationService 单元测试
 * 测试通知服务的各种功能
 */

import { NotificationService } from '../../src/services/NotificationService'
import { cache } from '../../src/config/redis'
import { getWebSocketServer } from '../../src/websocket/server'
import {
  connectTestDatabase,
  disconnectTestDatabase,
  cleanupDatabase,
  generateObjectId
} from '../helpers/testUtils'

// Mock外部依赖
jest.mock('../../src/config/redis')
jest.mock('../../src/websocket/server')
jest.mock('../../src/utils/logger', () => ({
  BusinessLogger: {
    error: jest.fn(),
    info: jest.fn(),
    userAction: jest.fn(),
    orderEvent: jest.fn(),
    paymentEvent: jest.fn(),
    systemError: jest.fn(),
    securityEvent: jest.fn()
  },
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

const mockCache = cache as jest.Mocked<typeof cache>
const mockGetWebSocketServer = getWebSocketServer as jest.MockedFunction<typeof getWebSocketServer>

describe('NotificationService', () => {
  const mockWsServer = {
    notifyOrderStatusUpdate: jest.fn(),
    notifyPaymentSuccess: jest.fn(),
    notifyOrderCreated: jest.fn(),
    notifyRoomStatusUpdate: jest.fn(),
    sendToUser: jest.fn(),
    sendToStore: jest.fn(),
    broadcast: jest.fn()
  }

  beforeAll(async () => {
    await connectTestDatabase()
  })

  afterAll(async () => {
    await disconnectTestDatabase()
  })

  beforeEach(async () => {
    await cleanupDatabase()
    jest.clearAllMocks()
    
    // 设置WebSocket服务器mock
    mockGetWebSocketServer.mockReturnValue(mockWsServer as any)
    
    // 设置缓存mock默认返回值
    mockCache.set.mockResolvedValue('OK')
    mockCache.get.mockResolvedValue(null)
    mockCache.del.mockResolvedValue(1)
    mockCache.llen.mockResolvedValue(0)
    mockCache.lpush.mockResolvedValue(1)
    mockCache.lrange.mockResolvedValue([])
    mockCache.ltrim.mockResolvedValue('OK')
  })

  describe('notifyOrderStatusUpdate', () => {
    const orderId = generateObjectId()
    const userId = generateObjectId()
    const storeId = generateObjectId()
    const orderData = {
      orderNumber: 'ORD12345',
      totalAmount: 300,
      items: []
    }

    it('应该成功发送订单状态更新通知', async () => {
      await NotificationService.notifyOrderStatusUpdate(
        orderId,
        userId,
        storeId,
        'confirmed',
        orderData
      )

      // 验证WebSocket通知
      expect(mockWsServer.notifyOrderStatusUpdate).toHaveBeenCalledWith(
        orderId,
        userId,
        storeId,
        'confirmed',
        orderData
      )

      // 验证通知已缓存
      expect(mockCache.lpush).toHaveBeenCalledWith(
        `notifications:${userId}`,
        expect.stringContaining('"type":"order_status"')
      )
    })

    it('应该处理不同的订单状态', async () => {
      const statuses = ['pending', 'confirmed', 'completed', 'cancelled']
      
      for (const status of statuses) {
        await NotificationService.notifyOrderStatusUpdate(
          orderId,
          userId,
          storeId,
          status,
          orderData
        )
        
        expect(mockWsServer.notifyOrderStatusUpdate).toHaveBeenCalledWith(
          orderId,
          userId,
          storeId,
          status,
          orderData
        )
      }
    })

    it('应该在WebSocket失败时仍然缓存通知', async () => {
      mockWsServer.notifyOrderStatusUpdate.mockImplementation(() => {
        throw new Error('WebSocket error')
      })

      await NotificationService.notifyOrderStatusUpdate(
        orderId,
        userId,
        storeId,
        'confirmed',
        orderData
      )

      // 即使WebSocket失败，通知仍应被缓存
      expect(mockCache.lpush).toHaveBeenCalled()
    })
  })

  describe('notifyPaymentSuccess', () => {
    const orderId = generateObjectId()
    const userId = generateObjectId()
    const storeId = generateObjectId()
    const paymentData = {
      amount: 300,
      method: 'wechat',
      transactionId: 'TXN12345'
    }

    it('应该成功发送支付成功通知', async () => {
      await NotificationService.notifyPaymentSuccess(
        orderId,
        userId,
        storeId,
        paymentData
      )

      expect(mockWsServer.notifyPaymentSuccess).toHaveBeenCalledWith(
        orderId,
        userId,
        storeId,
        paymentData
      )

      expect(mockCache.lpush).toHaveBeenCalledWith(
        `notifications:${userId}`,
        expect.stringContaining('"type":"payment_success"')
      )
    })

    it('应该包含正确的支付信息', async () => {
      await NotificationService.notifyPaymentSuccess(
        orderId,
        userId,
        storeId,
        paymentData
      )

      const cachedNotification = JSON.parse(
        (mockCache.lpush as jest.Mock).mock.calls[0][1]
      )

      expect(cachedNotification.data).toMatchObject({
        orderId,
        amount: paymentData.amount,
        method: paymentData.method
      })
    })
  })

  describe('notifyOrderCreated', () => {
    const orderId = generateObjectId()
    const userId = generateObjectId()
    const storeId = generateObjectId()
    const orderData = {
      orderNumber: 'ORD12345',
      totalAmount: 300,
      bookingTime: new Date().toISOString()
    }

    it('应该向用户和商户都发送通知', async () => {
      await NotificationService.notifyOrderCreated(
        orderId,
        userId,
        storeId,
        orderData
      )

      expect(mockWsServer.notifyOrderCreated).toHaveBeenCalledWith(
        orderId,
        userId,
        storeId,
        orderData
      )

      // 验证向用户发送通知
      expect(mockCache.lpush).toHaveBeenCalledWith(
        `notifications:${userId}`,
        expect.stringContaining('"type":"order_created"')
      )

      // 验证向商户发送通知
      expect(mockCache.lpush).toHaveBeenCalledWith(
        `store_notifications:${storeId}`,
        expect.stringContaining('"type":"new_order"')
      )
    })
  })

  describe('notifyRoomStatusUpdate', () => {
    const roomId = generateObjectId()
    const storeId = generateObjectId()
    const roomData = {
      name: '豪华包间001',
      status: 'available'
    }

    it('应该向商户发送房间状态更新通知', async () => {
      await NotificationService.notifyRoomStatusUpdate(
        roomId,
        storeId,
        'available',
        roomData
      )

      expect(mockWsServer.notifyRoomStatusUpdate).toHaveBeenCalledWith(
        roomId,
        storeId,
        'available',
        roomData
      )

      expect(mockCache.lpush).toHaveBeenCalledWith(
        `store_notifications:${storeId}`,
        expect.stringContaining('"type":"room_status"')
      )
    })
  })

  describe('cacheNotification', () => {
    const userId = generateObjectId()
    const notification = {
      type: 'test',
      title: '测试通知',
      message: '这是一个测试通知',
      data: { test: true },
      timestamp: new Date()
    }

    it('应该成功缓存通知', async () => {
      await NotificationService.cacheNotification(userId, notification)

      expect(mockCache.lpush).toHaveBeenCalledWith(
        `notifications:${userId}`,
        JSON.stringify(notification)
      )
    })

    it('应该限制缓存通知数量', async () => {
      await NotificationService.cacheNotification(userId, notification)

      expect(mockCache.ltrim).toHaveBeenCalledWith(
        `notifications:${userId}`,
        0,
        99 // 保留最新的100条通知
      )
    })
  })

  describe('getUserNotifications', () => {
    const userId = generateObjectId()

    it('应该返回用户的通知列表', async () => {
      const mockNotifications = [
        JSON.stringify({
          type: 'order_status',
          title: '订单状态更新',
          message: '您的订单已确认',
          timestamp: new Date()
        }),
        JSON.stringify({
          type: 'payment_success',
          title: '支付成功',
          message: '支付完成',
          timestamp: new Date()
        })
      ]

      mockCache.lrange.mockResolvedValue(mockNotifications)

      const result = await NotificationService.getUserNotifications(userId, 1, 10)

      expect(mockCache.lrange).toHaveBeenCalledWith(
        `notifications:${userId}`,
        0,
        9
      )

      expect(result.notifications).toHaveLength(2)
      expect(result.notifications[0]).toMatchObject({
        type: 'order_status',
        title: '订单状态更新'
      })
    })

    it('应该支持分页', async () => {
      await NotificationService.getUserNotifications(userId, 2, 5)

      expect(mockCache.lrange).toHaveBeenCalledWith(
        `notifications:${userId}`,
        5, // (page - 1) * limit
        9  // page * limit - 1
      )
    })

    it('应该返回通知总数', async () => {
      mockCache.llen.mockResolvedValue(15)
      mockCache.lrange.mockResolvedValue([])

      const result = await NotificationService.getUserNotifications(userId, 1, 10)

      expect(result.total).toBe(15)
      expect(result.hasMore).toBe(true)
    })
  })

  describe('markNotificationAsRead', () => {
    const userId = generateObjectId()
    const notificationId = 'notification_123'

    it('应该标记通知为已读', async () => {
      await NotificationService.markNotificationAsRead(userId, notificationId)

      expect(mockCache.set).toHaveBeenCalledWith(
        `notification_read:${userId}:${notificationId}`,
        '1',
        24 * 60 * 60 // 24小时过期
      )
    })
  })

  describe('clearUserNotifications', () => {
    const userId = generateObjectId()

    it('应该清除用户的所有通知', async () => {
      await NotificationService.clearUserNotifications(userId)

      expect(mockCache.del).toHaveBeenCalledWith(`notifications:${userId}`)
    })
  })

  describe('sendCustomNotification', () => {
    const userId = generateObjectId()
    const title = '自定义通知'
    const message = '这是一个自定义通知消息'
    const data = { custom: true }

    it('应该发送自定义通知', async () => {
      await NotificationService.sendCustomNotification(userId, title, message, data)

      expect(mockWsServer.sendToUser).toHaveBeenCalledWith(
        userId,
        'notification',
        expect.objectContaining({
          title,
          message,
          data
        })
      )

      expect(mockCache.lpush).toHaveBeenCalledWith(
        `notifications:${userId}`,
        expect.stringContaining(title)
      )
    })
  })

  describe('broadcastNotification', () => {
    const title = '系统通知'
    const message = '系统维护通知'
    const data = { type: 'system' }

    it('应该广播通知给所有用户', async () => {
      await NotificationService.broadcastNotification(title, message, data)

      expect(mockWsServer.broadcast).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          title,
          message,
          data
        })
      )
    })
  })

  describe('getOrderStatusText', () => {
    it('应该返回正确的状态文本', () => {
      expect(NotificationService.getOrderStatusText('pending')).toBe('等待确认')
      expect(NotificationService.getOrderStatusText('confirmed')).toBe('已确认')
      expect(NotificationService.getOrderStatusText('completed')).toBe('已完成')
      expect(NotificationService.getOrderStatusText('cancelled')).toBe('已取消')
      expect(NotificationService.getOrderStatusText('unknown')).toBe('未知状态')
    })
  })

  describe('error handling', () => {
    it('应该优雅处理缓存错误', async () => {
      mockCache.lpush.mockRejectedValue(new Error('Cache error'))

      // 这应该不会抛出错误
      await expect(
        NotificationService.notifyOrderStatusUpdate(
          generateObjectId(),
          generateObjectId(),
          generateObjectId(),
          'confirmed',
          { orderNumber: 'ORD123' }
        )
      ).resolves.toBeUndefined()
    })

    it('应该优雅处理WebSocket错误', async () => {
      mockWsServer.notifyOrderStatusUpdate.mockImplementation(() => {
        throw new Error('WebSocket disconnected')
      })

      // 这应该不会抛出错误
      await expect(
        NotificationService.notifyOrderStatusUpdate(
          generateObjectId(),
          generateObjectId(),
          generateObjectId(),
          'confirmed',
          { orderNumber: 'ORD123' }
        )
      ).resolves.toBeUndefined()
    })
  })
})
