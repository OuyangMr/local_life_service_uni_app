/**
 * 订单服务
 * @description 实现订单创建、状态跟踪、配送管理等功能
 */

import apiService, { buildQueryParams } from './api'
import type {
  CreateOrderRequest, ConfirmOrderRequest, OrderListRequest,
  OrderDetailResponse, OrderStatsResponse
} from '@/types/api'
import type { Order, PaginationInfo } from '@/types'
import { API_ENDPOINTS } from '@/constants'

class OrderService {
  /**
   * 创建订单
   */
  async createOrder(params: CreateOrderRequest): Promise<Order> {
    const response = await apiService.post<Order>(
      API_ENDPOINTS.ORDERS.CREATE,
      params,
      { showLoading: true, loadingText: '创建订单中...' }
    )
    return response.data
  }

  /**
   * 确认订单并支付
   */
  async confirmOrder(params: ConfirmOrderRequest): Promise<OrderDetailResponse> {
    const response = await apiService.post<OrderDetailResponse>(
      API_ENDPOINTS.ORDERS.CONFIRM(params.orderId),
      params,
      { showLoading: true, loadingText: '确认订单中...' }
    )
    return response.data
  }

  /**
   * 获取订单列表
   */
  async getOrderList(params: OrderListRequest): Promise<{
    orders: Order[]
    pagination: PaginationInfo
  }> {
    const queryString = buildQueryParams(params)
    const response = await apiService.get<{
      orders: Order[]
      pagination: PaginationInfo
    }>(`${API_ENDPOINTS.ORDERS.LIST}${queryString}`)
    return response.data
  }

  /**
   * 获取订单详情
   */
  async getOrderDetail(orderId: string): Promise<OrderDetailResponse> {
    const response = await apiService.get<OrderDetailResponse>(
      API_ENDPOINTS.ORDERS.DETAIL(orderId),
      { showLoading: true }
    )
    return response.data
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string, reason?: string): Promise<void> {
    await apiService.post(
      API_ENDPOINTS.ORDERS.CANCEL(orderId),
      { reason },
      { showLoading: true, loadingText: '取消中...' }
    )
  }

  /**
   * 获取订单统计
   */
  async getOrderStats(): Promise<OrderStatsResponse> {
    const response = await apiService.get<OrderStatsResponse>(API_ENDPOINTS.ORDERS.STATS)
    return response.data
  }
}

export const orderService = new OrderService()
export default orderService
