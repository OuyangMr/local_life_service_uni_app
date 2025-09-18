/**
 * 商户端测试工具函数
 * 基于用户端成功经验的测试helper
 */

import { VueWrapper } from '@vue/test-utils'

// 全局mock对象存储
const globalMocks: { [key: string]: jest.Mock } = {}

/**
 * Mock uni API
 */
export function mockUniApi(apiName: string): jest.Mock {
  if (!globalMocks[apiName]) {
    globalMocks[apiName] = jest.fn()
  }
  
  // 确保uni对象存在
  if (typeof global.uni === 'undefined') {
    global.uni = {}
  }
  
  global.uni[apiName] = globalMocks[apiName]
  return globalMocks[apiName]
}

/**
 * 重置所有uni mocks
 */
export function resetUniMocks() {
  Object.keys(globalMocks).forEach(key => {
    globalMocks[key].mockReset()
  })
}

/**
 * 创建mock API响应
 */
export function createMockApiResponse<T>(data: T, success: boolean = true) {
  return {
    success,
    data,
    code: success ? 200 : 400,
    message: success ? 'success' : 'error'
  }
}

/**
 * 验证uni API调用
 */
export function expectUniApiCall(apiName: string, expectedParams?: any) {
  const mockFn = globalMocks[apiName]
  expect(mockFn).toHaveBeenCalled()
  
  if (expectedParams) {
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining(expectedParams)
    )
  }
}

/**
 * 创建组件挂载选项
 */
export function createMountOptions(options: any = {}) {
  return {
    global: {
      plugins: [],
      mocks: {
        $t: (key: string) => key,
        ...options.mocks
      },
      stubs: {
        'uni-popup': true,
        'uni-icons': true,
        ...options.stubs
      },
      ...options.global
    },
    ...options
  }
}

/**
 * 触发组件事件
 */
export async function triggerEvent(
  wrapper: VueWrapper<any>, 
  selector: string, 
  event: string = 'click'
) {
  const element = wrapper.find(selector)
  if (element.exists()) {
    await element.trigger(event)
  }
}

/**
 * 设置组件props
 */
export async function setProps(wrapper: VueWrapper<any>, props: any) {
  await wrapper.setProps(props)
}

/**
 * 等待所有Promise完成
 */
export async function flushPromises() {
  await new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * 验证组件是否可见
 */
export function expectComponentVisible(wrapper: VueWrapper<any>, selector: string) {
  expect(wrapper.find(selector).exists()).toBe(true)
}

/**
 * 验证组件是否隐藏
 */
export function expectComponentHidden(wrapper: VueWrapper<any>, selector: string) {
  expect(wrapper.find(selector).exists()).toBe(false)
}

/**
 * 生成测试用的ObjectId
 */
export function generateTestObjectId(): string {
  return Math.random().toString(16).substr(2, 24)
}

// 设置全局测试环境
beforeEach(() => {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  
  // Mock sessionStorage
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  }
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })
  
  // Mock console methods
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  
  // Mock global uni object
  global.uni = {
    request: jest.fn(),
    setStorageSync: jest.fn(),
    getStorageSync: jest.fn(),
    removeStorageSync: jest.fn(),
    showToast: jest.fn(),
    showModal: jest.fn(),
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    navigateTo: jest.fn(),
    redirectTo: jest.fn(),
    reLaunch: jest.fn(),
    switchTab: jest.fn(),
    navigateBack: jest.fn(),
    scanCode: jest.fn(),
    authorize: jest.fn(),
    getSetting: jest.fn(),
    openSetting: jest.fn(),
    getSystemInfo: jest.fn()
  }
})

afterEach(() => {
  // 清理mock
  jest.clearAllMocks()
  resetUniMocks()
})
