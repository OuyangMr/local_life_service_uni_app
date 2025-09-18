/**
 * 测试工具函数
 * 提供测试中常用的工具方法
 */

import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { Request, Response } from 'express'
import { User } from '../../src/models/User'
import { Store } from '../../src/models/Store'
import { Room } from '../../src/models/Room'
import { Order } from '../../src/models/Order'

// 生成测试用的ObjectId
export const generateObjectId = () => new mongoose.Types.ObjectId().toString()

// 生成测试用的JWT token
export const generateTestToken = (userId: string, role: string = 'user') => {
  return jwt.sign(
    { 
      userId, 
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '24h' }
  )
}

// 创建模拟的Express Request对象
export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: undefined,
    ip: '127.0.0.1',
    method: 'GET',
    url: '/',
    ...overrides
  }
}

// 创建模拟的Express Response对象
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis()
  }
  return res
}

// 创建测试用户数据
export const createTestUser = (overrides: Partial<any> = {}) => {
  return {
    _id: generateObjectId(),
    phone: '13800138000',
    password: 'test123456', // 添加默认密码
    nickname: 'testuser',
    avatar: 'https://example.com/avatar.jpg',
    userType: 'user',
    vipLevel: 0,
    vipExpireAt: null,
    balance: 0,
    totalSpent: 0,
    preferredStores: [],
    isActive: true,
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// 创建测试商户数据
export const createTestStore = (overrides: Partial<any> = {}) => {
  return {
    _id: generateObjectId(),
    name: '测试KTV',
    description: '这是一个测试KTV',
    category: 'ktv',
    address: '测试地址123号',
    location: {
      type: 'Point',
      coordinates: [116.404, 39.915]
    },
    phone: '13800138999', // 有效的手机号码格式
    businessHours: {
      open: '10:00', // 修正字段名
      close: '02:00', // 修正字段名
      isOpen24Hours: false,
      isClosed: false
    },
    priceRange: {
      min: 50,
      max: 500
    },
    rating: 4.5,
    reviewCount: 100,
    images: ['https://example.com/image1.jpg'],
    status: 'active',
    isVerified: true,
    ownerId: generateObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// 创建测试包间数据
export const createTestRoom = (overrides: Partial<any> = {}) => {
  return {
    _id: generateObjectId(),
    storeId: generateObjectId(),
    name: '豪华包间001',
    type: 'luxury',
    capacity: 10,
    hourlyRate: 200,
    amenities: ['KTV', '音响', '麦克风'],
    images: ['https://example.com/room1.jpg'],
    videoUrl: 'https://example.com/room-video.mp4',
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// 创建测试订单数据
export const createTestOrder = (overrides: Partial<any> = {}) => {
  return {
    _id: generateObjectId(),
    orderNumber: 'ORD' + Date.now(),
    userId: generateObjectId(),
    storeId: generateObjectId(),
    roomId: generateObjectId(),
    type: 'booking',
    status: 'pending',
    bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时后
    duration: 2,
    totalAmount: 400,
    discountAmount: 0,
    finalAmount: 400,
    paymentMethod: 'wechat',
    paymentStatus: 'pending',
    items: [
      {
        name: '包间预订',
        quantity: 1,
        price: 200,
        total: 400
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// 创建测试菜品数据
export const createTestDish = (overrides: Partial<any> = {}) => {
  return {
    _id: generateObjectId(),
    storeId: generateObjectId(),
    name: '测试菜品',
    description: '这是一个测试菜品',
    category: 'drink',
    price: 50,
    memberPrice: 45,
    images: ['https://example.com/dish1.jpg'],
    stock: 100,
    unit: '份',
    tags: ['热门', '推荐'],
    status: 'available',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

// 等待指定时间
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 清理测试数据库
export const cleanupDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections
    
    for (const key in collections) {
      const collection = collections[key]
      await collection.deleteMany({})
    }
  }
}

// 连接测试数据库
export const connectTestDatabase = async () => {
  const mongoUrl = process.env.DATABASE_URL || 'mongodb://localhost:27017/local-life-test'
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUrl)
  }
}

// 断开测试数据库
export const disconnectTestDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close()
  }
}

// 创建测试场景数据
export const createTestScenario = async () => {
  // 创建测试用户
  const user = new User(createTestUser())
  await user.save()
  
  // 创建测试商户
  const store = new Store(createTestStore())
  await store.save()
  
  // 创建测试包间
  const room = new Room(createTestRoom({ storeId: store._id }))
  await room.save()
  
  return { user, store, room }
}

// 模拟中间件
export const mockAuthMiddleware = (user?: any) => {
  return (req: any, res: any, next: any) => {
    if (user) {
      req.user = user
    }
    next()
  }
}

// HTTP状态码断言
export const expectHttpStatus = (response: any, expectedStatus: number) => {
  expect(response.status).toBe(expectedStatus)
}

// API响应格式断言
export const expectApiResponse = (response: any, expectedData?: any) => {
  expect(response.body).toHaveProperty('success')
  expect(response.body).toHaveProperty('message')
  expect(response.body).toHaveProperty('data')
  
  if (expectedData) {
    expect(response.body.data).toMatchObject(expectedData)
  }
}

// 分页响应格式断言
export const expectPaginationResponse = (response: any) => {
  expectApiResponse(response)
  expect(response.body.data).toHaveProperty('items')
  expect(response.body.data).toHaveProperty('total')
  expect(response.body.data).toHaveProperty('page')
  expect(response.body.data).toHaveProperty('limit')
  expect(response.body.data).toHaveProperty('totalPages')
}

// 错误响应格式断言
export const expectErrorResponse = (response: any, expectedMessage?: string) => {
  expect(response.body).toHaveProperty('success', false)
  expect(response.body).toHaveProperty('message')
  expect(response.body).toHaveProperty('error')
  
  if (expectedMessage) {
    expect(response.body.message).toContain(expectedMessage)
  }
}
