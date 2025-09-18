/**
 * API服务单元测试
 * 测试HTTP请求封装、拦截器、错误处理等功能
 */

import { apiService as api } from '../../src/services/api'
import {
  createMockApiResponse,
  mockUniApi,
  createUniRequestSuccess,
  createUniRequestFail,
  expectUniApiCall,
  resetUniMocks,
  flushPromises
} from '../helpers/testUtils'

// Mock constants
jest.mock('../../src/constants', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:3000',
    TIMEOUT: 10000,
    RETRY_COUNT: 3
  },
  ERROR_CODES: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    SERVER_ERROR: 'SERVER_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED'
  },
  getErrorMessage: jest.fn((code: string) => `Error: ${code}`),
  STORAGE_KEYS: {
    TOKEN: 'token',
    USER_INFO: 'userInfo'
  }
}))

describe('API Service', () => {
  beforeEach(() => {
    resetUniMocks()
    jest.clearAllMocks()
  })

  describe('GET请求', () => {
    it('应该成功发送GET请求', async () => {
      const responseData = { message: 'success', data: { id: 1 } }
      const mockRequest = mockUniApi('request')
      
      // Mock成功响应
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: responseData,
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      const result = await api.get('/test')

      expect(result).toEqual(responseData)
      expectUniApiCall('request', {
        url: 'http://localhost:3000/test',
        method: 'GET'
      })
    })

    it('应该支持查询参数', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await api.get('/test', { page: 1, limit: 10 })

      expectUniApiCall('request', {
        url: 'http://localhost:3000/test?page=1&limit=10',
        method: 'GET'
      })
    })

    it('应该处理空的查询参数', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await api.get('/test', { page: 1, empty: '', undefined: undefined, null: null })

      expectUniApiCall('request', {
        url: 'http://localhost:3000/test?page=1',
        method: 'GET'
      })
    })
  })

  describe('POST请求', () => {
    it('应该成功发送POST请求', async () => {
      const requestData = { name: 'test', value: 123 }
      const responseData = { success: true, id: 1 }
      const mockRequest = mockUniApi('request')
      
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: responseData,
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      const result = await api.post('/test', requestData)

      expect(result).toEqual(responseData)
      expectUniApiCall('request', {
        url: 'http://localhost:3000/test',
        method: 'POST',
        data: requestData
      })
    })

    it('应该设置正确的Content-Type', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await api.post('/test', { data: 'test' })

      expectUniApiCall('request', {
        header: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    })
  })

  describe('PUT和DELETE请求', () => {
    it('应该成功发送PUT请求', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await api.put('/test/1', { name: 'updated' })

      expectUniApiCall('request', {
        url: 'http://localhost:3000/test/1',
        method: 'PUT',
        data: { name: 'updated' }
      })
    })

    it('应该成功发送DELETE请求', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await api.delete('/test/1')

      expectUniApiCall('request', {
        url: 'http://localhost:3000/test/1',
        method: 'DELETE'
      })
    })
  })

  describe('认证Token处理', () => {
    it('应该自动添加Authorization头', async () => {
      // Mock getStorageSync返回token
      const mockGetStorageSync = mockUniApi('getStorageSync')
      mockGetStorageSync.mockReturnValue('test-token')

      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await api.get('/protected')

      expectUniApiCall('request', {
        header: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      })
    })

    it('应该在没有token时不添加Authorization头', async () => {
      const mockGetStorageSync = mockUniApi('getStorageSync')
      mockGetStorageSync.mockReturnValue('')

      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await api.get('/public')

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.not.objectContaining({
            'Authorization': expect.anything()
          })
        })
      )
    })
  })

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.fail({
            errMsg: 'request:fail'
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await expect(api.get('/test')).rejects.toThrow('网络连接失败')
    })

    it('应该处理HTTP错误状态码', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { message: 'Not Found' },
            statusCode: 404,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await expect(api.get('/notfound')).rejects.toThrow()
    })

    it('应该处理401未授权错误', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { message: 'Unauthorized' },
            statusCode: 401,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      // Mock相关的uni API
      const mockRemoveStorageSync = mockUniApi('removeStorageSync')
      const mockShowToast = mockUniApi('showToast')
      const mockReLaunch = mockUniApi('reLaunch')

      await expect(api.get('/protected')).rejects.toThrow()
      
      // 验证清除token和跳转登录页
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('token')
      expect(mockReLaunch).toHaveBeenCalledWith({ url: '/pages/auth/login' })
    })

    it('应该处理500服务器错误', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { message: 'Internal Server Error' },
            statusCode: 500,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await expect(api.get('/error')).rejects.toThrow('服务器内部错误')
    })
  })

  describe('请求重试机制', () => {
    it('应该在网络错误时自动重试', async () => {
      const mockRequest = mockUniApi('request')
      let callCount = 0
      
      mockRequest.mockImplementation((options: any) => {
        callCount++
        setTimeout(() => {
          if (callCount < 3) {
            options.fail({ errMsg: 'request:fail' })
          } else {
            options.success({
              data: { success: true },
              statusCode: 200,
              header: {}
            })
          }
        }, 0)
        return { abort: jest.fn() }
      })

      const result = await api.get('/retry-test')
      
      expect(result).toEqual({ success: true })
      expect(callCount).toBe(3)
    })

    it('应该在达到最大重试次数后抛出错误', async () => {
      const mockRequest = mockUniApi('request')
      
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.fail({ errMsg: 'request:fail' })
        }, 0)
        return { abort: jest.fn() }
      })

      await expect(api.get('/always-fail')).rejects.toThrow()
      expect(mockRequest).toHaveBeenCalledTimes(4) // 1次原始请求 + 3次重试
    })
  })

  describe('请求拦截器', () => {
    it('应该执行响应拦截器', async () => {
      const responseInterceptor = jest.fn((response) => {
        response.intercepted = true
        return response
      })
      
      api.addResponseInterceptor(responseInterceptor)

      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      const result = await api.get('/test')
      
      expect(responseInterceptor).toHaveBeenCalledWith({ success: true })
      expect(result.intercepted).toBe(true)
    })

    it('应该执行错误拦截器', async () => {
      const errorInterceptor = jest.fn((error) => {
        throw new Error('Custom error')
      })
      
      api.addErrorInterceptor(errorInterceptor)

      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.fail({ errMsg: 'request:fail' })
        }, 0)
        return { abort: jest.fn() }
      })

      await expect(api.get('/test')).rejects.toThrow('Custom error')
      expect(errorInterceptor).toHaveBeenCalled()
    })
  })

  describe('加载状态', () => {
    it('应该在showLoading为true时显示加载', async () => {
      const mockShowLoading = mockUniApi('showLoading')
      const mockHideLoading = mockUniApi('hideLoading')
      const mockRequest = mockUniApi('request')
      
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await api.request({
        url: '/test',
        method: 'GET',
        showLoading: true,
        loadingText: '加载中...'
      })

      expect(mockShowLoading).toHaveBeenCalledWith({
        title: '加载中...',
        mask: true
      })
      expect(mockHideLoading).toHaveBeenCalled()
    })

    it('应该在请求失败时也隐藏加载', async () => {
      const mockShowLoading = mockUniApi('showLoading')
      const mockHideLoading = mockUniApi('hideLoading')
      const mockRequest = mockUniApi('request')
      
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.fail({ errMsg: 'request:fail' })
        }, 0)
        return { abort: jest.fn() }
      })

      await expect(api.request({
        url: '/test',
        method: 'GET',
        showLoading: true
      })).rejects.toThrow()

      expect(mockShowLoading).toHaveBeenCalled()
      expect(mockHideLoading).toHaveBeenCalled()
    })
  })

  describe('请求超时', () => {
    it('应该使用自定义超时时间', async () => {
      const mockRequest = mockUniApi('request')
      mockRequest.mockImplementation((options: any) => {
        setTimeout(() => {
          options.success({
            data: { success: true },
            statusCode: 200,
            header: {}
          })
        }, 0)
        return { abort: jest.fn() }
      })

      await api.request({
        url: '/test',
        method: 'GET',
        timeout: 5000
      })

      expectUniApiCall('request', {
        timeout: 5000
      })
    })
  })

  describe('并发请求管理', () => {
    it('应该正确处理多个并发请求', async () => {
      const mockRequest = mockUniApi('request')
      let requestCount = 0
      
      mockRequest.mockImplementation((options: any) => {
        const currentRequest = ++requestCount
        setTimeout(() => {
          options.success({
            data: { id: currentRequest },
            statusCode: 200,
            header: {}
          })
        }, Math.random() * 100) // 随机延迟
        return { abort: jest.fn() }
      })

      const promises = [
        api.get('/test1'),
        api.get('/test2'),
        api.get('/test3')
      ]

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      expect(mockRequest).toHaveBeenCalledTimes(3)
    })
  })
})
