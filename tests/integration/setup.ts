/**
 * 集成测试环境设置
 * 配置测试数据库、启动测试服务器、初始化测试数据
 */

import { config } from 'dotenv'
import mongoose from 'mongoose'
import { createServer } from 'http'
import express from 'express'
import request from 'supertest'

// 加载测试环境变量
config({ path: '.env.test' })

// 全局测试配置
let testServer: any
let mongoConnection: mongoose.Connection

// 测试环境配置
const TEST_CONFIG = {
  // 数据库配置
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/local-life-test',
  REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6379/15',
  
  // 服务器配置
  API_PORT: process.env.TEST_API_PORT || 3001,
  API_BASE_URL: process.env.TEST_API_BASE_URL || 'http://localhost:3001',
  
  // 外部服务Mock配置
  MOCK_PAYMENT_SERVICE: true,
  MOCK_SMS_SERVICE: true,
  MOCK_WECHAT_API: true,
}

// 导出配置供测试使用
export { TEST_CONFIG }

// 全局测试前设置
beforeAll(async () => {
  console.log('🚀 开始集成测试环境初始化...')
  
  // 设置测试环境变量
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret-key'
  process.env.DATABASE_URL = TEST_CONFIG.DATABASE_URL
  process.env.REDIS_URL = TEST_CONFIG.REDIS_URL
  
  // 连接测试数据库
  await connectTestDatabase()
  
  // 启动测试服务器
  await startTestServer()
  
  // 初始化测试数据
  await initTestData()
  
  console.log('✅ 集成测试环境初始化完成')
}, 60000)

// 全局测试后清理
afterAll(async () => {
  console.log('🧹 开始清理集成测试环境...')
  
  // 清理测试数据
  await cleanupTestData()
  
  // 关闭测试服务器
  await stopTestServer()
  
  // 断开数据库连接
  await disconnectTestDatabase()
  
  console.log('✅ 集成测试环境清理完成')
}, 30000)

// 每个测试套件前的设置
beforeEach(async () => {
  // 可以在这里重置某些状态或清理特定数据
})

// 每个测试套件后的清理
afterEach(async () => {
  // 清理测试产生的临时数据
  await cleanupTestData()
})

/**
 * 连接测试数据库
 */
async function connectTestDatabase(): Promise<void> {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_CONFIG.DATABASE_URL, {
        // 数据库连接选项
      })
      mongoConnection = mongoose.connection
      console.log('📁 测试数据库连接成功')
    }
  } catch (error) {
    console.error('❌ 测试数据库连接失败:', error)
    throw error
  }
}

/**
 * 断开测试数据库连接
 */
async function disconnectTestDatabase(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close()
      console.log('📁 测试数据库连接已关闭')
    }
  } catch (error) {
    console.error('❌ 关闭测试数据库连接失败:', error)
  }
}

/**
 * 启动测试服务器
 */
async function startTestServer(): Promise<void> {
  try {
    // 动态导入后端应用
    const { createApp } = await import('../../backend/src/index')
    const app = createApp()
    
    testServer = createServer(app)
    
    await new Promise<void>((resolve, reject) => {
      testServer.listen(TEST_CONFIG.API_PORT, (error: any) => {
        if (error) {
          reject(error)
        } else {
          console.log(`🚀 测试服务器已启动: ${TEST_CONFIG.API_BASE_URL}`)
          resolve()
        }
      })
    })
  } catch (error) {
    console.error('❌ 启动测试服务器失败:', error)
    throw error
  }
}

/**
 * 停止测试服务器
 */
async function stopTestServer(): Promise<void> {
  try {
    if (testServer) {
      await new Promise<void>((resolve) => {
        testServer.close(() => {
          console.log('🚀 测试服务器已关闭')
          resolve()
        })
      })
    }
  } catch (error) {
    console.error('❌ 关闭测试服务器失败:', error)
  }
}

/**
 * 初始化测试数据
 */
async function initTestData(): Promise<void> {
  try {
    // 创建测试用户
    await createTestUsers()
    
    // 创建测试商户和店铺
    await createTestStores()
    
    // 创建测试商品
    await createTestProducts()
    
    console.log('📦 测试数据初始化完成')
  } catch (error) {
    console.error('❌ 初始化测试数据失败:', error)
    throw error
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      const collections = mongoose.connection.collections
      
      for (const key in collections) {
        const collection = collections[key]
        await collection.deleteMany({})
      }
    }
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error)
  }
}

/**
 * 创建测试用户
 */
async function createTestUsers(): Promise<void> {
  const { User } = await import('../../backend/src/models/User')
  
  const testUsers = [
    {
      phone: '13800138000',
      nickname: '测试用户1',
      password: 'password123',
      userType: 'user',
      isVip: false,
      vipLevel: 'bronze',
      balance: 1000,
      points: 500
    },
    {
      phone: '13800138001', 
      nickname: '测试VIP用户',
      password: 'password123',
      userType: 'user',
      isVip: true,
      vipLevel: 'gold',
      balance: 5000,
      points: 2000
    },
    {
      phone: '13800138002',
      nickname: '测试商户',
      password: 'password123',
      userType: 'merchant',
      isVip: false,
      vipLevel: 'bronze',
      balance: 0,
      points: 0
    }
  ]
  
  for (const userData of testUsers) {
    const user = new User(userData)
    await user.save()
  }
}

/**
 * 创建测试商户和店铺
 */
async function createTestStores(): Promise<void> {
  const { Store } = await import('../../backend/src/models/Store')
  const { User } = await import('../../backend/src/models/User')
  
  const merchantUser = await User.findOne({ userType: 'merchant' })
  if (!merchantUser) return
  
  const testStores = [
    {
      name: '测试KTV店铺',
      description: '这是一个用于集成测试的KTV店铺',
      category: 'ktv',
      address: '测试地址123号',
      location: {
        type: 'Point',
        coordinates: [116.404, 39.915]
      },
      phone: '400-123-4567',
      businessHours: {
        start: '10:00',
        end: '02:00'
      },
      priceRange: {
        min: 100,
        max: 500
      },
      rating: 4.5,
      reviewCount: 100,
      images: ['https://example.com/store1.jpg'],
      status: 'active',
      isVerified: true,
      ownerId: merchantUser._id,
      tags: ['KTV', '包间', '聚会']
    }
  ]
  
  for (const storeData of testStores) {
    const store = new Store(storeData)
    await store.save()
  }
}

/**
 * 创建测试商品
 */
async function createTestProducts(): Promise<void> {
  const { Dish } = await import('../../backend/src/models/Dish')
  const { Store } = await import('../../backend/src/models/Store')
  
  const testStore = await Store.findOne({ status: 'active' })
  if (!testStore) return
  
  const testProducts = [
    {
      storeId: testStore._id,
      name: '可乐',
      description: '冰爽可乐',
      category: 'drink',
      price: 15,
      memberPrice: 12,
      images: ['https://example.com/cola.jpg'],
      stock: 100,
      unit: '瓶',
      status: 'available',
      tags: ['饮料', '热门']
    },
    {
      storeId: testStore._id,
      name: '爆米花',
      description: '香甜爆米花',
      category: 'snack',
      price: 25,
      memberPrice: 20,
      images: ['https://example.com/popcorn.jpg'],
      stock: 50,
      unit: '份',
      status: 'available',
      tags: ['零食', '推荐']
    }
  ]
  
  for (const productData of testProducts) {
    const product = new Dish(productData)
    await product.save()
  }
}

/**
 * 获取测试API客户端
 */
export function getTestApiClient() {
  const { createApp } = require('../../backend/src/index')
  const app = createApp()
  return request(app)
}

/**
 * 生成测试JWT Token
 */
export function generateTestToken(userId: string, userType: string = 'user'): string {
  const jwt = require('jsonwebtoken')
  return jwt.sign(
    { 
      id: userId,
      userType,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key',
    { expiresIn: '24h' }
  )
}

/**
 * 获取测试用户
 */
export async function getTestUser(userType: string = 'user') {
  const { User } = await import('../../backend/src/models/User')
  return await User.findOne({ userType })
}

/**
 * 获取测试店铺
 */
export async function getTestStore() {
  const { Store } = await import('../../backend/src/models/Store')
  return await Store.findOne({ status: 'active' })
}

/**
 * 获取测试商品
 */
export async function getTestProducts() {
  const { Dish } = await import('../../backend/src/models/Dish')
  return await Dish.find({ status: 'available' })
}

// 错误处理
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in integration tests:', error)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in integration tests:', error)
  process.exit(1)
})
