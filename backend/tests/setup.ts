/**
 * Jest 测试环境设置
 * 在所有测试运行前执行的全局配置
 */

import { config } from 'dotenv'
import mongoose from 'mongoose'

// 加载测试环境变量
config({ path: '.env.test' })

// 全局测试设置
beforeAll(async () => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret'
  process.env.DATABASE_URL = 'mongodb://admin:password123@localhost:27017/local-life-test?authSource=admin'
  process.env.REDIS_URL = 'redis://localhost:6379/15'
  
  // 禁用日志输出
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
  console.info = jest.fn()
})

// 每个测试前清理数据库
beforeEach(async () => {
  // 清理测试数据库
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections
    for (const key in collections) {
      const collection = collections[key]
      await collection.deleteMany({})
    }
  }
})

// 全局测试清理
afterAll(async () => {
  // 关闭数据库连接
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close()
  }
  
  // 清理定时器
  jest.clearAllTimers()
  
  // 恢复所有模拟
  jest.restoreAllMocks()
})

// 每个测试文件前的设置
beforeEach(() => {
  // 清理所有模拟调用
  jest.clearAllMocks()
})

// 每个测试文件后的清理
afterEach(() => {
  // 清理定时器
  jest.clearAllTimers()
})

// 全局错误处理
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in tests:', error)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in tests:', error)
})

// Jest 扩展匹配器
expect.extend({
  // 自定义匹配器：检查MongoDB ObjectId
  toBeValidObjectId(received) {
    const pass = /^[0-9a-fA-F]{24}$/.test(received)
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false,
      }
    }
  },
  
  // 自定义匹配器：检查ISO日期字符串
  toBeValidISODate(received) {
    const date = new Date(received)
    const pass = !isNaN(date.getTime()) && received === date.toISOString()
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO date string`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO date string`,
        pass: false,
      }
    }
  },
  
  // 自定义匹配器：检查JWT token
  toBeValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
    const pass = typeof received === 'string' && jwtRegex.test(received)
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT token`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT token`,
        pass: false,
      }
    }
  }
})

// 声明自定义匹配器类型
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidObjectId(): R
      toBeValidISODate(): R
      toBeValidJWT(): R
    }
  }
}
