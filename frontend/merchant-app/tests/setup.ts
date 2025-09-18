/**
 * 商户端测试环境设置
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

// 全局清理
afterEach(() => {
  // 清理Vue Test Utils全局配置
  config.global = {}
  
  // 重置所有Jest mocks
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

// 全局测试结束后清理
afterAll(() => {
  // 恢复console方法
  jest.restoreAllMocks()
})

// 配置Vue Test Utils全局配置
config.global.plugins = [createPinia()]

// Mock uni-app全局对象
global.uni = {
  // 存储相关
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  clearStorageSync: jest.fn(),
  
  // 网络请求
  request: jest.fn(),
  
  // 导航相关
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  redirectTo: jest.fn(),
  switchTab: jest.fn(),
  reLaunch: jest.fn(),
  
  // 界面相关
  showToast: jest.fn(),
  showModal: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showActionSheet: jest.fn(),
  
  // 设备相关
  getSystemInfoSync: jest.fn(() => ({
    platform: 'devtools',
    version: '1.0.0',
    screenWidth: 375,
    screenHeight: 667,
    statusBarHeight: 20
  })),
  
  // 文件相关
  chooseImage: jest.fn(),
  previewImage: jest.fn(),
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
  
  // 其他常用API
  createSelectorQuery: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    boundingClientRect: jest.fn().mockReturnThis(),
    exec: jest.fn()
  })),
  
  // 支付相关
  requestPayment: jest.fn(),
  
  // 位置相关
  getLocation: jest.fn(),
  chooseLocation: jest.fn(),
  
  // 扫码相关
  scanCode: jest.fn(),
  
  // 分享相关
  share: jest.fn(),
  
  // 监听相关
  onNetworkStatusChange: jest.fn(),
  offNetworkStatusChange: jest.fn()
}

// Mock uni-app页面生命周期
global.getCurrentPages = jest.fn(() => [
  {
    route: 'pages/index/index',
    options: {}
  }
])

// Mock uni-app组件
global.Component = jest.fn()
global.Page = jest.fn()
global.App = jest.fn()

// Mock fetch (如果需要)
global.fetch = jest.fn()

// Mock XMLHttpRequest (如果需要)
global.XMLHttpRequest = jest.fn()

// Mock window对象的uni-app特定属性
Object.defineProperty(window, 'wx', {
  value: global.uni,
  writable: true
})

// 环境变量Mock
process.env.UNI_PLATFORM = 'h5'
