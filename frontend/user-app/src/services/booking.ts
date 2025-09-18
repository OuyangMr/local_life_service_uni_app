/**
 * 预订服务
 * @description 实现预订创建、状态查询、核销验证等功能
 */

import apiService, { buildQueryParams } from './api'
import type {
  CreateBookingRequest, ConfirmBookingRequest, BookingListRequest,
  BookingDetailResponse
} from '@/types/api'
import type { Booking, PaginationInfo } from '@/types'
import { API_ENDPOINTS } from '@/constants'

class BookingService {
  /**
   * 创建预订
   */
  async createBooking(params: CreateBookingRequest): Promise<Booking> {
    const response = await apiService.post<Booking>(
      API_ENDPOINTS.BOOKINGS.CREATE,
      params,
      { showLoading: true, loadingText: '创建预订中...' }
    )
    return response.data
  }

  /**
   * 确认预订并支付
   */
  async confirmBooking(params: ConfirmBookingRequest): Promise<BookingDetailResponse> {
    const response = await apiService.post<BookingDetailResponse>(
      API_ENDPOINTS.BOOKINGS.UPDATE(params.bookingId),
      params,
      { showLoading: true, loadingText: '确认预订中...' }
    )
    return response.data
  }

  /**
   * 获取预订列表
   */
  async getBookingList(params: BookingListRequest): Promise<{
    bookings: Booking[]
    pagination: PaginationInfo
  }> {
    const queryString = buildQueryParams(params)
    const response = await apiService.get<{
      bookings: Booking[]
      pagination: PaginationInfo
    }>(`${API_ENDPOINTS.BOOKINGS.LIST}${queryString}`)
    return response.data
  }

  /**
   * 获取预订详情
   */
  async getBookingDetail(bookingId: string): Promise<BookingDetailResponse> {
    const response = await apiService.get<BookingDetailResponse>(
      API_ENDPOINTS.BOOKINGS.DETAIL(bookingId),
      { showLoading: true }
    )
    return response.data
  }

  /**
   * 取消预订
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    await apiService.post(
      API_ENDPOINTS.BOOKINGS.CANCEL(bookingId),
      { reason },
      { showLoading: true, loadingText: '取消中...' }
    )
  }

  /**
   * 预订签到
   */
  async checkinBooking(bookingId: string): Promise<void> {
    await apiService.post(
      API_ENDPOINTS.BOOKINGS.CHECKIN(bookingId),
      {},
      { showLoading: true, loadingText: '签到中...' }
    )
  }

  /**
   * 预订核销
   */
  async verifyBooking(verificationCode: string): Promise<Booking> {
    const response = await apiService.post<Booking>(
      API_ENDPOINTS.BOOKINGS.VERIFY,
      { verificationCode },
      { showLoading: true, loadingText: '核销中...' }
    )
    return response.data
  }
}

export const bookingService = new BookingService()
export default bookingService
