/**
 * 前端测试环境设置
 * 在所有测试运行前执行的全局配置
 */

import { config } from '@vue/test-utils'
import { createPinia } from 'pinia'

// 全局测试设置
beforeAll(() => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test'
  
  // 禁用日志输出
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
  console.info = jest.fn()
})

// 全局测试清理
afterAll(() => {
  // 清理定时器
  jest.clearAllTimers()
  
  // 恢复所有模拟
  jest.restoreAllMocks()
})

// 每个测试前的设置
beforeEach(() => {
  // 清理所有模拟调用
  jest.clearAllMocks()
})

// 每个测试后的清理
afterEach(() => {
  // 清理定时器
  jest.clearAllTimers()
})

// Vue Test Utils 全局配置
config.global.plugins = [createPinia()]

// Mock uni-app API
const mockUni = {
  // 网络请求
  request: jest.fn(),
  
  // 本地存储
  setStorage: jest.fn(),
  getStorage: jest.fn(),
  removeStorage: jest.fn(),
  clearStorage: jest.fn(),
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  clearStorageSync: jest.fn(),
  
  // 导航
  navigateTo: jest.fn(),
  redirectTo: jest.fn(),
  switchTab: jest.fn(),
  navigateBack: jest.fn(),
  reLaunch: jest.fn(),
  
  // 界面
  showToast: jest.fn(),
  hideToast: jest.fn(),
  showModal: jest.fn(),
  showActionSheet: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  
  // 扫码
  scanCode: jest.fn(),
  
  // 权限设置 - 新增的权限相关API
  getSetting: jest.fn(),
  openSetting: jest.fn(),
  authorize: jest.fn(),
  
  // 地理位置
  getLocation: jest.fn(),
  chooseLocation: jest.fn(),
  
  // 系统信息
  getSystemInfo: jest.fn(),
  getSystemInfoSync: jest.fn(),
  
  // 网络状态
  getNetworkType: jest.fn(),
  onNetworkStatusChange: jest.fn(),
  
  // 剪贴板
  setClipboardData: jest.fn(),
  getClipboardData: jest.fn(),
  
  // 分享
  share: jest.fn(),
  
  // 支付
  requestPayment: jest.fn(),
  
  // WebSocket
  connectSocket: jest.fn(),
  sendSocketMessage: jest.fn(),
  closeSocket: jest.fn(),
  onSocketOpen: jest.fn(),
  onSocketError: jest.fn(),
  onSocketMessage: jest.fn(),
  onSocketClose: jest.fn(),
  
  // 文件操作
  chooseImage: jest.fn(),
  previewImage: jest.fn(),
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
  
  // 设备
  vibrateLong: jest.fn(),
  vibrateShort: jest.fn(),
  
  // 其他
  getCurrentPages: jest.fn(() => []),
  createSelectorQuery: jest.fn(() => ({
    select: jest.fn(() => ({
      boundingClientRect: jest.fn()
    }))
  }))
}

// 将 uni 挂载到全局
;(global as any).uni = mockUni

// Mock getCurrentPages
;(global as any).getCurrentPages = jest.fn(() => [])

// Mock getApp
;(global as any).getApp = jest.fn(() => ({
  globalData: {}
}))

// Jest 扩展匹配器
expect.extend({
  // 检查是否为有效的uni-app页面路径
  toBeValidUniPath(received) {
    const isValid = typeof received === 'string' && received.startsWith('/')
    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid uni-app path`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid uni-app path`,
        pass: false,
      }
    }
  },
  
  // 检查是否为有效的store状态
  toBeValidStoreState(received) {
    const isValid = typeof received === 'object' && received !== null
    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid store state`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid store state`,
        pass: false,
      }
    }
  }
})

// 声明自定义匹配器类型
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUniPath(): R
      toBeValidStoreState(): R
    }
  }
}
