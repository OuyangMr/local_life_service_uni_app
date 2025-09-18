/**
 * 订单状态管理
 * @description 管理当前订单状态、历史订单、实时状态更新
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Order, OrderStatus } from '@/types'
import { orderService } from '@/services/order'

export const useOrderStore = defineStore('order', () => {
  // ============================= 状态 =============================
  
  /** 当前订单 */
  const currentOrder = ref<Order | null>(null)
  
  /** 订单列表 */
  const orders = ref<Order[]>([])
  
  /** 加载状态 */
  const loading = ref(false)
  
  /** WebSocket连接状态 */
  const wsConnected = ref(false)

  // ============================= 计算属性 =============================
  
  /** 待付款订单数量 */
  const pendingPaymentCount = computed(() =>
    orders.value.filter(order => order.status === 'pending').length
  )
  
  /** 进行中订单数量 */
  const activeOrderCount = computed(() =>
    orders.value.filter(order => 
      ['paid', 'confirmed', 'preparing', 'delivering'].includes(order.status)
    ).length
  )
  
  /** 已完成订单数量 */
  const completedOrderCount = computed(() =>
    orders.value.filter(order => order.status === 'completed').length
  )

  // ============================= 方法 =============================
  
  /**
   * 创建订单
   */
  async function createOrder(params: {
    storeId: string
    spaceId?: string
    bookingId?: string
    items: Array<{
      productId: string
      quantity: number
      specs: Record<string, string>
    }>
    notes?: string
  }) {
    loading.value = true
    try {
      const order = await orderService.createOrder(params)
      currentOrder.value = order
      
      // 添加到订单列表
      const existingIndex = orders.value.findIndex(o => o.id === order.id)
      if (existingIndex > -1) {
        orders.value[existingIndex] = order
      } else {
        orders.value.unshift(order)
      }
      
      return order
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取订单列表
   */
  async function fetchOrders(params?: {
    status?: OrderStatus[]
    page?: number
    pageSize?: number
  }) {
    loading.value = true
    try {
      const result = await orderService.getOrderList(params || {})
      orders.value = result.orders
      return result
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取订单详情
   */
  async function fetchOrderDetail(orderId: string) {
    loading.value = true
    try {
      const order = await orderService.getOrderDetail(orderId)
      
      // 更新当前订单
      if (currentOrder.value?.id === orderId) {
        currentOrder.value = order
      }
      
      // 更新订单列表中的订单
      const existingIndex = orders.value.findIndex(o => o.id === orderId)
      if (existingIndex > -1) {
        orders.value[existingIndex] = order
      }
      
      return order
    } finally {
      loading.value = false
    }
  }

  /**
   * 取消订单
   */
  async function cancelOrder(orderId: string, reason?: string) {
    loading.value = true
    try {
      await orderService.cancelOrder(orderId, reason)
      
      // 更新订单状态
      updateOrderStatus(orderId, 'cancelled')
      
      uni.showToast({
        title: '订单已取消',
        icon: 'success'
      })
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新订单状态
   */
  function updateOrderStatus(orderId: string, status: OrderStatus) {
    // 更新当前订单
    if (currentOrder.value?.id === orderId) {
      currentOrder.value.status = status
    }
    
    // 更新订单列表
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      order.status = status
    }
  }

  /**
   * 处理实时订单状态更新
   */
  function handleOrderStatusUpdate(data: {
    orderId: string
    status: OrderStatus
    estimatedTime?: number
    message?: string
  }) {
    const { orderId, status, estimatedTime, message } = data
    
    updateOrderStatus(orderId, status)
    
    // 更新预估时间
    if (estimatedTime) {
      const order = orders.value.find(o => o.id === orderId)
      if (order) {
        order.estimatedTime = estimatedTime
      }
    }
    
    // 显示状态更新提示
    if (message) {
      uni.showToast({
        title: message,
        icon: 'none'
      })
    }
  }

  /**
   * 设置当前订单
   */
  function setCurrentOrder(order: Order | null) {
    currentOrder.value = order
  }

  /**
   * 根据状态获取订单列表
   */
  function getOrdersByStatus(status: OrderStatus): Order[] {
    return orders.value.filter(order => order.status === status)
  }

  /**
   * 获取订单状态文本
   */
  function getOrderStatusText(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      pending: '待付款',
      paid: '已付款',
      confirmed: '已确认',
      preparing: '制作中',
      ready: '待取餐',
      delivering: '配送中',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款'
    }
    return statusMap[status] || status
  }

  /**
   * 获取订单状态颜色
   */
  function getOrderStatusColor(status: OrderStatus): string {
    const colorMap: Record<OrderStatus, string> = {
      pending: '#f39c12',
      paid: '#3498db',
      confirmed: '#2ecc71',
      preparing: '#e67e22',
      ready: '#9b59b6',
      delivering: '#1abc9c',
      completed: '#27ae60',
      cancelled: '#95a5a6',
      refunded: '#e74c3c'
    }
    return colorMap[status] || '#95a5a6'
  }

  /**
   * 检查订单是否可以取消
   */
  function canCancelOrder(order: Order): boolean {
    return ['pending', 'paid', 'confirmed'].includes(order.status)
  }

  /**
   * 检查订单是否可以评价
   */
  function canReviewOrder(order: Order): boolean {
    return order.status === 'completed'
  }

  /**
   * 清空订单数据
   */
  function clearOrders() {
    orders.value = []
    currentOrder.value = null
  }

  return {
    // 状态
    currentOrder,
    orders,
    loading,
    wsConnected,
    
    // 计算属性
    pendingPaymentCount,
    activeOrderCount,
    completedOrderCount,
    
    // 方法
    createOrder,
    fetchOrders,
    fetchOrderDetail,
    cancelOrder,
    updateOrderStatus,
    handleOrderStatusUpdate,
    setCurrentOrder,
    getOrdersByStatus,
    getOrderStatusText,
    getOrderStatusColor,
    canCancelOrder,
    canReviewOrder,
    clearOrders,
  }
})
