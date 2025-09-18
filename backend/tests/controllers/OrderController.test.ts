/**
 * OrderController 单元测试
 * 测试订单管理相关的所有功能
 */

import mongoose from 'mongoose'
import { Order } from '../../src/models/Order'
import { User } from '../../src/models/User'
import { Store } from '../../src/models/Store'
import { Room } from '../../src/models/Room'
import { OrderController } from '../../src/controllers/OrderController'
import {
  createMockRequest,
  createMockResponse,
  createTestUser,
  createTestStore,
  createTestRoom,
  createTestOrder,
  connectTestDatabase,
  disconnectTestDatabase,
  cleanupDatabase,
  expectApiResponse,
  expectPaginationResponse,
  expectErrorResponse
} from '../helpers/testUtils'

// Mock外部依赖
jest.mock('../../src/utils/logger')
jest.mock('../../src/services/NotificationService')

describe('OrderController', () => {
  let testUser: any
  let merchantUser: any
  let testStore: any
  let testRoom: any

  beforeAll(async () => {
    await connectTestDatabase()
  })

  afterAll(async () => {
    await disconnectTestDatabase()
  })

  beforeEach(async () => {
    await cleanupDatabase()
    jest.clearAllMocks()

    // 创建测试用户
    testUser = new User(createTestUser({
      userType: 'user'
    }))
    await testUser.save()

    merchantUser = new User(createTestUser({
      phone: '13800138001',
      userType: 'merchant'
    }))
    await merchantUser.save()

    // 创建测试店铺
    testStore = new Store(createTestStore({
      ownerId: merchantUser._id,
      status: 'active'
    }))
    await testStore.save()

    // 创建测试包间
    testRoom = new Room(createTestRoom({
      storeId: testStore._id
    }))
    await testRoom.save()
  })

  describe('createOrder', () => {
    const orderData = {
      storeId: '',
      roomId: '',
      type: 'booking',
      bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时后
      duration: 3,
      items: [
        {
          name: '豪华包间',
          quantity: 1,
          price: 200,
          total: 600
        }
      ],
      totalAmount: 600,
      paymentMethod: 'wechat'
    }

    beforeEach(() => {
      orderData.storeId = testStore._id.toString()
      orderData.roomId = testRoom._id.toString()
    })

    it('应该成功创建订单', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        body: orderData
      })
      const res = createMockResponse()

      await OrderController.createOrder(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '订单创建成功',
          data: expect.objectContaining({
            orderNumber: expect.stringMatching(/^ORD\d+$/),
            userId: testUser._id.toString(),
            storeId: testStore._id.toString(),
            roomId: testRoom._id.toString(),
            type: 'booking',
            status: 'pending',
            totalAmount: 600,
            paymentMethod: 'wechat'
          })
        })
      )

      // 验证订单已保存到数据库
      const savedOrder = await Order.findOne({ userId: testUser._id })
      expect(savedOrder).toBeTruthy()
      expect(savedOrder?.totalAmount).toBe(600)
      expect(savedOrder?.status).toBe('pending')
    })

    it('应该在未登录时返回错误', async () => {
      const req = createMockRequest({
        user: undefined,
        body: orderData
      })
      const res = createMockResponse()

      await expect(OrderController.createOrder(req as any, res as any))
        .rejects.toThrow('需要登录')
    })

    it('应该在店铺不存在时返回错误', async () => {
      const invalidStoreId = new mongoose.Types.ObjectId()
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        body: {
          ...orderData,
          storeId: invalidStoreId.toString()
        }
      })
      const res = createMockResponse()

      await expect(OrderController.createOrder(req as any, res as any))
        .rejects.toThrow('店铺不存在')
    })

    it('应该在包间不存在时返回错误', async () => {
      const invalidRoomId = new mongoose.Types.ObjectId()
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        body: {
          ...orderData,
          roomId: invalidRoomId.toString()
        }
      })
      const res = createMockResponse()

      await expect(OrderController.createOrder(req as any, res as any))
        .rejects.toThrow('包间不存在')
    })

    it('应该在包间不可用时返回错误', async () => {
      // 将包间状态设为不可用
      testRoom.status = 'occupied'
      await testRoom.save()

      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        body: orderData
      })
      const res = createMockResponse()

      await expect(OrderController.createOrder(req as any, res as any))
        .rejects.toThrow('包间当前不可用')
    })

    it('应该在预订时间过早时返回错误', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        body: {
          ...orderData,
          bookingTime: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后，小于最小提前时间
        }
      })
      const res = createMockResponse()

      await expect(OrderController.createOrder(req as any, res as any))
        .rejects.toThrow('预订时间至少需要提前1小时')
    })

    it('应该为VIP用户提供折扣', async () => {
      // 设置用户为VIP
      testUser.isVip = true
      testUser.vipLevel = 'gold'
      await testUser.save()

      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user',
          vipLevel: 'gold'
        },
        body: orderData
      })
      const res = createMockResponse()

      await OrderController.createOrder(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(201)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      
      // VIP用户应该享受折扣
      expect(response.data.discountAmount).toBeGreaterThan(0)
      expect(response.data.finalAmount).toBeLessThan(response.data.totalAmount)
    })
  })

  describe('getOrders', () => {
    beforeEach(async () => {
      // 创建测试订单
      const orders = [
        createTestOrder({
          userId: testUser._id,
          storeId: testStore._id,
          status: 'pending',
          createdAt: new Date('2023-01-01')
        }),
        createTestOrder({
          userId: testUser._id,
          storeId: testStore._id,
          status: 'confirmed',
          createdAt: new Date('2023-01-02')
        }),
        createTestOrder({
          userId: merchantUser._id, // 其他用户的订单
          storeId: testStore._id,
          status: 'completed',
          createdAt: new Date('2023-01-03')
        })
      ]

      await Order.insertMany(orders)
    })

    it('应该返回当前用户的订单列表', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        query: {
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await OrderController.getOrders(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.success).toBe(true)
      expect(response.data.items).toHaveLength(2) // 只返回当前用户的订单
      expect(response.pagination.total).toBe(2)
    })

    it('应该支持按状态筛选', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        query: {
          status: 'pending',
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await OrderController.getOrders(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.data.items).toHaveLength(1)
      expect(response.data.items[0].status).toBe('pending')
    })

    it('应该支持按时间范围筛选', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        query: {
          startDate: '2023-01-01',
          endDate: '2023-01-01',
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await OrderController.getOrders(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.data.items).toHaveLength(1)
    })

    it('商户应该看到所属店铺的所有订单', async () => {
      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant',
          storeId: testStore._id.toString()
        },
        query: {
          page: '1',
          limit: '10'
        }
      })
      const res = createMockResponse()

      await OrderController.getOrders(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.data.items).toHaveLength(3) // 商户能看到所有订单
    })
  })

  describe('getOrderById', () => {
    let testOrder: any

    beforeEach(async () => {
      testOrder = new Order(createTestOrder({
        userId: testUser._id,
        storeId: testStore._id
      }))
      await testOrder.save()
    })

    it('应该成功获取订单详情', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        params: { id: testOrder._id.toString() }
      })
      const res = createMockResponse()

      await OrderController.getOrderById(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取订单详情成功',
          data: expect.objectContaining({
            _id: testOrder._id,
            orderNumber: testOrder.orderNumber,
            userId: testUser._id.toString()
          })
        })
      )
    })

    it('应该在订单不存在时返回错误', async () => {
      const nonExistentId = new mongoose.Types.ObjectId()
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        params: { id: nonExistentId.toString() }
      })
      const res = createMockResponse()

      await expect(OrderController.getOrderById(req as any, res as any))
        .rejects.toThrow('订单不存在')
    })

    it('应该拒绝访问其他用户的订单', async () => {
      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'user'
        },
        params: { id: testOrder._id.toString() }
      })
      const res = createMockResponse()

      await expect(OrderController.getOrderById(req as any, res as any))
        .rejects.toThrow('无权限查看此订单')
    })

    it('商户应该能查看所属店铺的订单', async () => {
      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant',
          storeId: testStore._id.toString()
        },
        params: { id: testOrder._id.toString() }
      })
      const res = createMockResponse()

      await OrderController.getOrderById(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('updateOrderStatus', () => {
    let testOrder: any

    beforeEach(async () => {
      testOrder = new Order(createTestOrder({
        userId: testUser._id,
        storeId: testStore._id,
        status: 'pending'
      }))
      await testOrder.save()
    })

    it('商户应该能更新订单状态', async () => {
      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant',
          storeId: testStore._id.toString()
        },
        params: { id: testOrder._id.toString() },
        body: {
          status: 'confirmed',
          notes: '订单已确认'
        }
      })
      const res = createMockResponse()

      await OrderController.updateOrderStatus(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '订单状态更新成功',
          data: expect.objectContaining({
            status: 'confirmed'
          })
        })
      )

      // 验证数据库中的状态已更新
      const updatedOrder = await Order.findById(testOrder._id)
      expect(updatedOrder?.status).toBe('confirmed')
    })

    it('应该拒绝普通用户更新订单状态', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        params: { id: testOrder._id.toString() },
        body: { status: 'confirmed' }
      })
      const res = createMockResponse()

      await expect(OrderController.updateOrderStatus(req as any, res as any))
        .rejects.toThrow('只有商户可以更新订单状态')
    })

    it('应该拒绝无效的状态转换', async () => {
      // 设置订单状态为已完成
      testOrder.status = 'completed'
      await testOrder.save()

      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant',
          storeId: testStore._id.toString()
        },
        params: { id: testOrder._id.toString() },
        body: { status: 'pending' }
      })
      const res = createMockResponse()

      await expect(OrderController.updateOrderStatus(req as any, res as any))
        .rejects.toThrow('无效的状态转换')
    })
  })

  describe('cancelOrder', () => {
    let testOrder: any

    beforeEach(async () => {
      testOrder = new Order(createTestOrder({
        userId: testUser._id,
        storeId: testStore._id,
        status: 'pending',
        bookingTime: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4小时后
      }))
      await testOrder.save()
    })

    it('用户应该能取消自己的订单', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        params: { id: testOrder._id.toString() },
        body: { reason: '临时有事' }
      })
      const res = createMockResponse()

      await OrderController.cancelOrder(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '订单取消成功'
        })
      )

      // 验证订单状态已更新
      const cancelledOrder = await Order.findById(testOrder._id)
      expect(cancelledOrder?.status).toBe('cancelled')
    })

    it('应该在取消时间太晚时返回错误', async () => {
      // 设置预订时间为1小时后（不满足取消时间要求）
      testOrder.bookingTime = new Date(Date.now() + 1 * 60 * 60 * 1000)
      await testOrder.save()

      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        params: { id: testOrder._id.toString() },
        body: { reason: '临时有事' }
      })
      const res = createMockResponse()

      await expect(OrderController.cancelOrder(req as any, res as any))
        .rejects.toThrow('订单开始前2小时内不可取消')
    })

    it('应该在订单已确认后拒绝取消', async () => {
      testOrder.status = 'confirmed'
      await testOrder.save()

      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        params: { id: testOrder._id.toString() },
        body: { reason: '临时有事' }
      })
      const res = createMockResponse()

      await expect(OrderController.cancelOrder(req as any, res as any))
        .rejects.toThrow('订单当前状态不允许取消')
    })

    it('商户应该能取消任何状态的订单', async () => {
      testOrder.status = 'confirmed'
      await testOrder.save()

      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant',
          storeId: testStore._id.toString()
        },
        params: { id: testOrder._id.toString() },
        body: { reason: '店铺维护' }
      })
      const res = createMockResponse()

      await OrderController.cancelOrder(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
    })
  })

  describe('getOrderStats', () => {
    beforeEach(async () => {
      // 创建不同状态的订单用于统计
      const today = new Date()
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      
      const orders = [
        createTestOrder({
          userId: testUser._id,
          storeId: testStore._id,
          status: 'completed',
          totalAmount: 300,
          createdAt: today
        }),
        createTestOrder({
          userId: testUser._id,
          storeId: testStore._id,
          status: 'completed',
          totalAmount: 500,
          createdAt: today
        }),
        createTestOrder({
          userId: testUser._id,
          storeId: testStore._id,
          status: 'pending',
          totalAmount: 200,
          createdAt: today
        }),
        createTestOrder({
          userId: testUser._id,
          storeId: testStore._id,
          status: 'completed',
          totalAmount: 400,
          createdAt: yesterday
        })
      ]

      await Order.insertMany(orders)
    })

    it('用户应该能获取自己的订单统计', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        query: {
          period: 'today'
        }
      })
      const res = createMockResponse()

      await OrderController.getOrderStats(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.success).toBe(true)
      expect(response.data).toMatchObject({
        totalOrders: 3, // 今天的订单
        totalAmount: 1000, // 今天的总金额（300 + 500 + 200）
        completedOrders: 2,
        pendingOrders: 1,
        cancelledOrders: 0,
        completedAmount: 800 // 已完成订单金额（300 + 500）
      })
    })

    it('商户应该能获取店铺的订单统计', async () => {
      const req = createMockRequest({
        user: {
          id: merchantUser._id.toString(),
          userType: 'merchant',
          storeId: testStore._id.toString()
        },
        query: {
          period: 'all'
        }
      })
      const res = createMockResponse()

      await OrderController.getOrderStats(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.data.totalOrders).toBe(4) // 所有订单
      expect(response.data.totalAmount).toBe(1400) // 总金额
    })

    it('应该支持不同的时间周期', async () => {
      const req = createMockRequest({
        user: {
          id: testUser._id.toString(),
          userType: 'user'
        },
        query: {
          period: 'week'
        }
      })
      const res = createMockResponse()

      await OrderController.getOrderStats(req as any, res as any)

      expect(res.status).toHaveBeenCalledWith(200)
      const response = (res.json as jest.Mock).mock.calls[0][0]
      expect(response.data.totalOrders).toBe(4) // 一周内的所有订单
    })
  })
})
