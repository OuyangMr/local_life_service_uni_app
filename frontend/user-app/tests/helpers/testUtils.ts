/**
 * 前端测试工具函数
 * 提供测试中常用的工具方法
 */

import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { ComponentPublicInstance } from 'vue'

// 创建测试用的Pinia实例
export const createTestPinia = () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}

// 创建组件挂载选项
export const createMountOptions = (overrides: any = {}) => {
  return {
    global: {
      plugins: [createTestPinia()],
      mocks: {
        $t: (key: string) => key, // Mock i18n
        $route: {
          path: '/',
          params: {},
          query: {}
        },
        $router: {
          push: jest.fn(),
          replace: jest.fn(),
          go: jest.fn(),
          back: jest.fn()
        }
      },
      stubs: {
        // Stub uni-app components
        'uni-button': true,
        'uni-input': true,
        'uni-text': true,
        'uni-view': true,
        'uni-image': true,
        'uni-navigator': true,
        'uni-form': true,
        'uni-form-item': true,
        'uni-picker': true,
        'uni-switch': true,
        'uni-checkbox': true,
        'uni-radio': true,
        'uni-textarea': true,
        'uni-swiper': true,
        'uni-swiper-item': true
      }
    },
    ...overrides
  }
}

// 挂载组件的便捷方法
export const mountComponent = (component: any, options: any = {}) => {
  return mount(component, createMountOptions(options))
}

// 创建测试用户数据
export const createTestUser = (overrides: Partial<any> = {}) => {
  return {
    id: 'user_123',
    phone: '13800138000',
    nickname: '测试用户',
    avatar: 'https://example.com/avatar.jpg',
    userType: 'user',
    vipLevel: 'bronze',
    balance: 100,
    points: 500,
    isVip: false,
    location: {
      latitude: 39.915,
      longitude: 116.404
    },
    ...overrides
  }
}

// 创建测试店铺数据
export const createTestStore = (overrides: Partial<any> = {}) => {
  return {
    id: 'store_123',
    name: '测试KTV',
    description: '这是一个测试KTV',
    category: 'ktv',
    address: '测试地址123号',
    location: {
      latitude: 39.915,
      longitude: 116.404
    },
    phone: '400-123-4567',
    businessHours: {
      start: '10:00',
      end: '02:00'
    },
    rating: 4.5,
    reviewCount: 100,
    images: ['https://example.com/image1.jpg'],
    status: 'active',
    distance: 1.2,
    priceRange: {
      min: 100,
      max: 500
    },
    tags: ['KTV', '包间'],
    ...overrides
  }
}

// 创建测试商品数据
export const createTestProduct = (overrides: Partial<any> = {}) => {
  return {
    id: 'product_123',
    storeId: 'store_123',
    name: '测试商品',
    description: '这是一个测试商品',
    category: 'drink',
    price: 50,
    memberPrice: 45,
    images: ['https://example.com/product1.jpg'],
    stock: 100,
    unit: '份',
    tags: ['热门', '推荐'],
    status: 'available',
    ...overrides
  }
}

// 创建测试订单数据
export const createTestOrder = (overrides: Partial<any> = {}) => {
  return {
    id: 'order_123',
    orderNumber: 'ORD' + Date.now(),
    userId: 'user_123',
    storeId: 'store_123',
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
        id: 'item_1',
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

// 创建测试预订数据
export const createTestBooking = (overrides: Partial<any> = {}) => {
  return {
    id: 'booking_123',
    userId: 'user_123',
    storeId: 'store_123',
    roomId: 'room_123',
    bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    duration: 3,
    status: 'confirmed',
    totalAmount: 600,
    verificationCode: '123456',
    notes: '生日聚会',
    ...overrides
  }
}

// Mock API响应
export const createMockApiResponse = <T>(data: T, success = true) => {
  return {
    success,
    message: success ? '操作成功' : '操作失败',
    data,
    timestamp: new Date().toISOString()
  }
}

// Mock分页响应
export const createMockPaginationResponse = <T>(
  items: T[], 
  page = 1, 
  limit = 10, 
  total?: number
) => {
  const actualTotal = total ?? items.length
  return {
    success: true,
    message: '获取数据成功',
    data: {
      items: items.slice((page - 1) * limit, page * limit),
      total: actualTotal,
      page,
      limit,
      totalPages: Math.ceil(actualTotal / limit),
      hasNext: page * limit < actualTotal,
      hasPrev: page > 1
    },
    timestamp: new Date().toISOString()
  }
}

// 等待异步操作
export const flushPromises = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// 等待Vue的下一个tick
export const nextTick = async () => {
  await flushPromises()
}

// 触发组件事件
export const triggerEvent = async (wrapper: VueWrapper<ComponentPublicInstance>, eventName: string, data?: any) => {
  await wrapper.trigger(eventName, data)
  await nextTick()
}

// 设置组件props
export const setProps = async (wrapper: VueWrapper<ComponentPublicInstance>, props: Record<string, any>) => {
  await wrapper.setProps(props)
  await nextTick()
}

// Mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}
  
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value.toString()
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key]
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key])
      }),
      key: jest.fn((index: number) => Object.keys(store)[index] || null),
      get length() {
        return Object.keys(store).length
      }
    },
    writable: true
  })
  
  return store
}

// Mock uni-app API的便捷方法
export const mockUniApi = (apiName: string, mockImplementation?: any) => {
  const mock = jest.fn(mockImplementation)
  ;(global.uni as any)[apiName] = mock
  return mock
}

// 创建成功的uni.request响应
export const createUniRequestSuccess = (data: any) => {
  return {
    success: (callback: Function) => {
      callback({
        data,
        statusCode: 200,
        header: {}
      })
    },
    fail: jest.fn(),
    complete: jest.fn()
  }
}

// 创建失败的uni.request响应
export const createUniRequestFail = (error: any) => {
  return {
    success: jest.fn(),
    fail: (callback: Function) => {
      callback(error)
    },
    complete: jest.fn()
  }
}

// 验证uni-app API调用
export const expectUniApiCall = (apiName: string, expectedParams?: any) => {
  const mockApi = (global.uni as any)[apiName]
  expect(mockApi).toHaveBeenCalled()
  
  if (expectedParams) {
    expect(mockApi).toHaveBeenCalledWith(
      expect.objectContaining(expectedParams)
    )
  }
}

// 重置所有uni-app API mocks
export const resetUniMocks = () => {
  Object.keys(global.uni).forEach(key => {
    if (jest.isMockFunction((global.uni as any)[key])) {
      (global.uni as any)[key].mockReset()
    }
  })
}

// 验证组件文本内容
export const expectComponentText = (wrapper: VueWrapper<ComponentPublicInstance>, selector: string, expectedText: string) => {
  const element = wrapper.find(selector)
  expect(element.exists()).toBe(true)
  expect(element.text()).toContain(expectedText)
}

// 验证组件是否显示
export const expectComponentVisible = (wrapper: VueWrapper<ComponentPublicInstance>, selector: string) => {
  const element = wrapper.find(selector)
  expect(element.exists()).toBe(true)
  expect(element.isVisible()).toBe(true)
}

// 验证组件是否隐藏
export const expectComponentHidden = (wrapper: VueWrapper<ComponentPublicInstance>, selector: string) => {
  const element = wrapper.find(selector)
  if (element.exists()) {
    expect(element.isVisible()).toBe(false)
  }
}
