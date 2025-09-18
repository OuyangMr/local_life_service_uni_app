/**
 * 支付服务
 * @description 集成微信支付，处理支付创建、状态查询、回调处理
 */

import apiService from './api'
import type {
  CreatePaymentRequest, PaymentResponse, PaymentStatusResponse
} from '@/types/api'
import { API_ENDPOINTS } from '@/constants'

class PaymentService {
  /**
   * 创建支付
   */
  async createPayment(params: CreatePaymentRequest): Promise<PaymentResponse> {
    const response = await apiService.post<PaymentResponse>(
      API_ENDPOINTS.PAYMENTS.CREATE,
      params,
      { showLoading: true, loadingText: '创建支付中...' }
    )
    return response.data
  }

  /**
   * 微信支付
   */
  async wechatPay(params: CreatePaymentRequest): Promise<void> {
    const paymentResult = await this.createPayment({
      ...params,
      method: 'wechat'
    })

    return new Promise((resolve, reject) => {
      uni.requestPayment({
        provider: 'wxpay',
        ...paymentResult.paymentData,
        success: () => {
          uni.showToast({
            title: '支付成功',
            icon: 'success'
          })
          resolve()
        },
        fail: (error) => {
          if (error.errMsg.includes('cancel')) {
            uni.showToast({
              title: '支付已取消',
              icon: 'none'
            })
          } else {
            uni.showToast({
              title: '支付失败',
              icon: 'none'
            })
          }
          reject(error)
        }
      })
    })
  }

  /**
   * 查询支付状态
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    const response = await apiService.get<PaymentStatusResponse>(
      API_ENDPOINTS.PAYMENTS.STATUS(paymentId)
    )
    return response.data
  }

  /**
   * 申请退款
   */
  async requestRefund(paymentId: string, amount: number, reason: string): Promise<void> {
    await apiService.post(
      API_ENDPOINTS.PAYMENTS.REFUND(paymentId),
      { amount, reason },
      { showLoading: true, loadingText: '申请退款中...' }
    )
  }
}

export const paymentService = new PaymentService()
export default paymentService
