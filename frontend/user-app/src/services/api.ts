/**
 * API基础服务
 * @description 封装uni.request，实现统一的请求拦截、响应处理、错误处理
 */

import type { ApiResponse, ErrorResponse, AnyApiResponse } from '@/types/api'
import { API_CONFIG, ERROR_CODES, getErrorMessage, STORAGE_KEYS } from '@/constants'

// ============================= 请求配置接口 =============================

/** 请求配置接口 */
export interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  header?: Record<string, string>
  timeout?: number
  retry?: number
  showLoading?: boolean
  loadingText?: string
  showError?: boolean
}

/** 响应拦截器类型 */
export type ResponseInterceptor = (response: AnyApiResponse) => AnyApiResponse | Promise<AnyApiResponse>

/** 错误拦截器类型 */
export type ErrorInterceptor = (error: any) => any | Promise<any>

// ============================= API服务类 =============================

class ApiService {
  private baseURL: string
  private timeout: number
  private retryCount: number
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL
    this.timeout = API_CONFIG.TIMEOUT
    this.retryCount = API_CONFIG.RETRY_COUNT
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }

  /**
   * 添加错误拦截器
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor)
  }

  /**
   * 获取请求头
   */
  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    }

    // 添加认证token
    const token = uni.getStorageSync(STORAGE_KEYS.ACCESS_TOKEN)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  /**
   * 处理响应数据
   */
  private async processResponse(response: any): Promise<AnyApiResponse> {
    let result = response.data as AnyApiResponse

    // 应用响应拦截器
    for (const interceptor of this.responseInterceptors) {
      result = await interceptor(result)
    }

    return result
  }

  /**
   * 处理错误
   */
  private async processError(error: any): Promise<never> {
    let processedError = error

    // 应用错误拦截器
    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError)
    }

    throw processedError
  }

  /**
   * 发送请求
   */
  private async sendRequest<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    const {
      url,
      method = 'GET',
      data,
      header,
      timeout = this.timeout,
      retry = 0,
      showLoading = false,
      loadingText = '加载中...',
      showError = true,
    } = config

    // 显示加载提示
    if (showLoading) {
      uni.showLoading({
        title: loadingText,
        mask: true,
      })
    }

    try {
      const response = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
        uni.request({
          url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
          method: method as any,
          data,
          header: this.getHeaders(header),
          timeout,
          success: resolve,
          fail: reject,
        })
      })

      // 隐藏加载提示
      if (showLoading) {
        uni.hideLoading()
      }

      // 检查HTTP状态码
      if (response.statusCode !== 200) {
        throw new Error(`HTTP ${response.statusCode}: ${response.errMsg}`)
      }

      // 处理响应
      const result = await this.processResponse(response)

      // 检查业务状态
      if (!result.success) {
        const errorResponse = result as ErrorResponse
        const error = new Error(errorResponse.message)
        error.name = errorResponse.code || ERROR_CODES.UNKNOWN_ERROR
        throw error
      }

      return result as ApiResponse<T>
    } catch (error: any) {
      // 隐藏加载提示
      if (showLoading) {
        uni.hideLoading()
      }

      // 重试逻辑
      if (retry > 0 && this.shouldRetry(error)) {
        await this.delay(API_CONFIG.RETRY_DELAY)
        return this.sendRequest({ ...config, retry: retry - 1 })
      }

      // 显示错误提示
      if (showError) {
        const message = this.getErrorMessage(error)
        uni.showToast({
          title: message,
          icon: 'none',
          duration: 2000,
        })
      }

      // 处理错误
      await this.processError(error)
    }
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any): boolean {
    // 网络错误或超时错误才重试
    return error.name === 'timeout' || error.message.includes('network')
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(error: any): string {
    if (error.name && error.name in ERROR_CODES) {
      return getErrorMessage(error.name)
    }
    return error.message || getErrorMessage(ERROR_CODES.UNKNOWN_ERROR)
  }

  // ============================= 公共请求方法 =============================

  /**
   * GET请求
   */
  async get<T = any>(url: string, params?: Record<string, any> | Partial<RequestConfig>, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    // 如果第二个参数包含URL、method等请求配置属性，则作为config处理
    if (params && (
      'url' in params || 
      'method' in params || 
      'data' in params || 
      'header' in params || 
      'timeout' in params || 
      'retry' in params || 
      'showLoading' in params
    )) {
      return this.sendRequest<T>({
        url,
        method: 'GET',
        ...(params as Partial<RequestConfig>),
      })
    }
    
    // 否则作为查询参数处理
    let finalUrl = url
    if (params && typeof params === 'object') {
      const queryParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, String(value))
        }
      })
      const queryString = queryParams.toString()
      if (queryString) {
        finalUrl = url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`
      }
    }
    
    return this.sendRequest<T>({
      url: finalUrl,
      method: 'GET',
      ...config,
    })
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.sendRequest<T>({
      url,
      method: 'POST',
      data,
      ...config,
    })
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.sendRequest<T>({
      url,
      method: 'PUT',
      data,
      ...config,
    })
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.sendRequest<T>({
      url,
      method: 'DELETE',
      ...config,
    })
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<ApiResponse<T>> {
    return this.sendRequest<T>({
      url,
      method: 'PATCH',
      data,
      ...config,
    })
  }

  /**
   * 通用请求方法
   */
  async request<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    return this.sendRequest<T>(config)
  }

  /**
   * 上传文件
   */
  async upload<T = any>(
    url: string,
    filePath: string,
    name: string = 'file',
    formData?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
        filePath,
        name,
        formData,
        header: this.getHeaders(),
        success: (response) => {
          try {
            const result = JSON.parse(response.data) as ApiResponse<T>
            if (result.success) {
              resolve(result)
            } else {
              reject(new Error(result.message))
            }
          } catch (error) {
            reject(new Error('响应数据解析失败'))
          }
        },
        fail: reject,
      })
    })
  }

  /**
   * 下载文件
   */
  async download(url: string, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const downloadTask = uni.downloadFile({
        url: url.startsWith('http') ? url : `${this.baseURL}${url}`,
        success: (response) => {
          if (response.statusCode === 200) {
            resolve(response.tempFilePath)
          } else {
            reject(new Error(`下载失败: ${response.statusCode}`))
          }
        },
        fail: reject,
      })

      if (onProgress) {
        downloadTask.onProgressUpdate((res) => {
          onProgress(res.progress)
        })
      }
    })
  }
}

// ============================= 实例化和配置 =============================

/** API服务实例 */
export const apiService = new ApiService()

// 添加默认响应拦截器
apiService.addResponseInterceptor(async (response) => {
  // 检查token是否即将过期
  if (response.success && 'data' in response) {
    const newToken = (response as any).headers?.['X-New-Access-Token']
    if (newToken) {
      uni.setStorageSync(STORAGE_KEYS.ACCESS_TOKEN, newToken)
    }
  }
  return response
})

// 添加默认错误拦截器
apiService.addErrorInterceptor(async (error) => {
  // 处理认证错误
  if (error.name === ERROR_CODES.TOKEN_EXPIRED || error.name === ERROR_CODES.TOKEN_INVALID) {
    // 清除本地存储的认证信息
    uni.removeStorageSync(STORAGE_KEYS.ACCESS_TOKEN)
    uni.removeStorageSync(STORAGE_KEYS.REFRESH_TOKEN)
    uni.removeStorageSync(STORAGE_KEYS.USER_INFO)
    
    // 跳转到登录页
    uni.reLaunch({
      url: '/pages/auth/login',
    })
  }
  
  return error
})

// ============================= 工具函数 =============================

/**
 * 构建查询参数
 */
export function buildQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)))
      } else {
        searchParams.append(key, String(value))
      }
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * 检查网络状态
 */
export function checkNetworkStatus(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.getNetworkType({
      success: (res) => {
        resolve(res.networkType !== 'none')
      },
      fail: () => {
        resolve(false)
      },
    })
  })
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('重试次数已达上限')
}

// 导出默认实例
export default apiService
