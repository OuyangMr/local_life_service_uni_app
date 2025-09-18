import { ref, reactive } from 'vue'
import { websocketService, MessageType } from './websocket'
import type { Order, Booking, Room } from '@/types'
import type { OrderStatus, BookingStatus, RoomStatus } from '@/types'

// 实时更新事件类型
export enum RealtimeEventType {
  ORDER_CREATED = 'order_created',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  ORDER_PROGRESS_UPDATE = 'order_progress_update',
  BOOKING_STATUS_CHANGED = 'booking_status_changed',
  ROOM_STATUS_CHANGED = 'room_status_changed',
  DELIVERY_LOCATION_UPDATE = 'delivery_location_update',
  PAYMENT_STATUS_UPDATE = 'payment_status_update',
  NOTIFICATION_RECEIVED = 'notification_received'
}

// 实时更新数据格式
export interface RealtimeUpdate {
  eventType: RealtimeEventType
  entityId: string
  entityType: 'order' | 'booking' | 'room' | 'notification'
  data: any
  timestamp: number
  userId?: string
  storeId?: string
}

// 通知消息格式
export interface NotificationMessage {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  content: string
  actions?: NotificationAction[]
  persistent?: boolean
  timestamp: number
}

export interface NotificationAction {
  label: string
  action: string
  params?: any
}

// 离线消息缓存
interface OfflineMessage {
  id: string
  update: RealtimeUpdate
  receivedAt: number
  processed: boolean
}

class RealtimeService {
  // 响应式状态
  public isEnabled = ref(true)
  public lastUpdateTime = ref<Date | null>(null)
  public connectionQuality = ref<'excellent' | 'good' | 'poor' | 'offline'>('offline')
  
  // 离线消息缓存
  private offlineMessages: OfflineMessage[] = reactive([])
  private maxOfflineMessages = 100
  
  // 事件监听器
  private eventListeners: Map<RealtimeEventType, Function[]> = new Map()
  
  // 通知队列
  public notifications: NotificationMessage[] = reactive([])
  private maxNotifications = 10
  
  constructor() {
    this.initWebSocketListeners()
    this.loadOfflineMessages()
  }
  
  /**
   * 启用实时同步
   */
  enable(): void {
    this.isEnabled.value = true
    console.log('实时同步已启用')
  }
  
  /**
   * 禁用实时同步
   */
  disable(): void {
    this.isEnabled.value = false
    console.log('实时同步已禁用')
  }
  
  /**
   * 添加事件监听器
   */
  addEventListener(eventType: RealtimeEventType, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, [])
    }
    this.eventListeners.get(eventType)!.push(listener)
  }
  
  /**
   * 移除事件监听器
   */
  removeEventListener(eventType: RealtimeEventType, listener: Function): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
  
  /**
   * 手动同步离线消息
   */
  async syncOfflineMessages(): Promise<void> {
    if (this.offlineMessages.length === 0) {
      return
    }
    
    console.log(`开始同步${this.offlineMessages.length}条离线消息`)
    
    // 按时间排序处理
    const sortedMessages = [...this.offlineMessages].sort((a, b) => a.receivedAt - b.receivedAt)
    
    for (const message of sortedMessages) {
      if (!message.processed) {
        try {
          await this.processRealtimeUpdate(message.update)
          message.processed = true
        } catch (error) {
          console.error('处理离线消息失败:', error, message)
        }
      }
    }
    
    // 清理已处理的消息
    this.cleanupOfflineMessages()
    this.saveOfflineMessages()
  }
  
  /**
   * 添加通知
   */
  addNotification(notification: Omit<NotificationMessage, 'id' | 'timestamp'>): void {
    const newNotification: NotificationMessage = {
      id: this.generateNotificationId(),
      timestamp: Date.now(),
      ...notification
    }
    
    this.notifications.unshift(newNotification)
    
    // 限制通知数量
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.splice(this.maxNotifications)
    }
    
    // 显示系统通知
    this.showSystemNotification(newNotification)
  }
  
  /**
   * 移除通知
   */
  removeNotification(notificationId: string): void {
    const index = this.notifications.findIndex(n => n.id === notificationId)
    if (index > -1) {
      this.notifications.splice(index, 1)
    }
  }
  
  /**
   * 清空所有通知
   */
  clearAllNotifications(): void {
    this.notifications.splice(0)
  }
  
  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled.value,
      connectionQuality: this.connectionQuality.value,
      lastUpdateTime: this.lastUpdateTime.value,
      offlineMessagesCount: this.offlineMessages.filter(m => !m.processed).length,
      notificationsCount: this.notifications.length,
      websocketStatus: websocketService.status.value
    }
  }
  
  /**
   * 初始化WebSocket监听器
   */
  private initWebSocketListeners(): void {
    // 监听订单状态更新
    websocketService.addEventListener(MessageType.ORDER_STATUS_UPDATE, (data) => {
      this.handleOrderStatusUpdate(data)
    })
    
    // 监听房间状态更新
    websocketService.addEventListener(MessageType.ROOM_STATUS_UPDATE, (data) => {
      this.handleRoomStatusUpdate(data)
    })
    
    // 监听预订状态更新
    websocketService.addEventListener(MessageType.BOOKING_STATUS_UPDATE, (data) => {
      this.handleBookingStatusUpdate(data)
    })
    
    // 监听通知消息
    websocketService.addEventListener(MessageType.NOTIFICATION, (data) => {
      this.handleNotificationMessage(data)
    })
    
    // 监听连接状态变化
    this.watchConnectionStatus()
  }
  
  /**
   * 处理订单状态更新
   */
  private handleOrderStatusUpdate(data: any): void {
    if (!this.isEnabled.value) return
    
    const update: RealtimeUpdate = {
      eventType: data.eventType || RealtimeEventType.ORDER_STATUS_CHANGED,
      entityId: data.orderId,
      entityType: 'order',
      data: data,
      timestamp: Date.now(),
      userId: data.userId,
      storeId: data.storeId
    }
    
    this.processRealtimeUpdate(update)
  }
  
  /**
   * 处理房间状态更新
   */
  private handleRoomStatusUpdate(data: any): void {
    if (!this.isEnabled.value) return
    
    const update: RealtimeUpdate = {
      eventType: RealtimeEventType.ROOM_STATUS_CHANGED,
      entityId: data.roomId,
      entityType: 'room',
      data: data,
      timestamp: Date.now(),
      storeId: data.storeId
    }
    
    this.processRealtimeUpdate(update)
  }
  
  /**
   * 处理预订状态更新
   */
  private handleBookingStatusUpdate(data: any): void {
    if (!this.isEnabled.value) return
    
    const update: RealtimeUpdate = {
      eventType: RealtimeEventType.BOOKING_STATUS_CHANGED,
      entityId: data.bookingId,
      entityType: 'booking',
      data: data,
      timestamp: Date.now(),
      userId: data.userId,
      storeId: data.storeId
    }
    
    this.processRealtimeUpdate(update)
  }
  
  /**
   * 处理通知消息
   */
  private handleNotificationMessage(data: any): void {
    this.addNotification({
      type: data.type || 'info',
      title: data.title || '新消息',
      content: data.content || '',
      actions: data.actions,
      persistent: data.persistent
    })
  }
  
  /**
   * 处理实时更新
   */
  private async processRealtimeUpdate(update: RealtimeUpdate): Promise<void> {
    try {
      this.lastUpdateTime.value = new Date()
      
      // 如果离线，将消息加入缓存
      if (!websocketService.isConnected.value) {
        this.addToOfflineCache(update)
        return
      }
      
      // 分发事件给监听器
      this.dispatchEvent(update)
      
      // 处理特定类型的更新
      switch (update.eventType) {
        case RealtimeEventType.ORDER_STATUS_CHANGED:
          await this.handleOrderStatusChange(update)
          break
          
        case RealtimeEventType.ORDER_PROGRESS_UPDATE:
          await this.handleOrderProgressUpdate(update)
          break
          
        case RealtimeEventType.DELIVERY_LOCATION_UPDATE:
          await this.handleDeliveryLocationUpdate(update)
          break
          
        case RealtimeEventType.PAYMENT_STATUS_UPDATE:
          await this.handlePaymentStatusUpdate(update)
          break
          
        default:
          console.log('处理实时更新:', update)
          break
      }
      
    } catch (error) {
      console.error('处理实时更新失败:', error, update)
    }
  }
  
  /**
   * 处理订单状态变化
   */
  private async handleOrderStatusChange(update: RealtimeUpdate): Promise<void> {
    const { orderId, newStatus, oldStatus } = update.data
    
    // 显示状态变化通知
    const statusMessages = {
      'confirmed': '订单已确认',
      'preparing': '商家正在制作您的订单',
      'ready': '您的订单已制作完成，请及时取餐',
      'delivering': '配送员已取餐，正在为您配送',
      'completed': '订单已完成，感谢您的使用',
      'cancelled': '订单已取消'
    }
    
    const message = statusMessages[newStatus as keyof typeof statusMessages]
    if (message) {
      this.addNotification({
        type: newStatus === 'cancelled' ? 'warning' : 'success',
        title: '订单状态更新',
        content: message,
        actions: [
          {
            label: '查看详情',
            action: 'navigate',
            params: { url: `/pages/order/track?id=${orderId}` }
          }
        ]
      })
    }
  }
  
  /**
   * 处理订单进度更新
   */
  private async handleOrderProgressUpdate(update: RealtimeUpdate): Promise<void> {
    const { orderId, progress, estimatedTime } = update.data
    
    if (progress && progress.milestone) {
      this.addNotification({
        type: 'info',
        title: '订单进度更新',
        content: `${progress.milestone}${estimatedTime ? `，预计${estimatedTime}` : ''}`,
        actions: [
          {
            label: '查看详情',
            action: 'navigate',
            params: { url: `/pages/order/track?id=${orderId}` }
          }
        ]
      })
    }
  }
  
  /**
   * 处理配送位置更新
   */
  private async handleDeliveryLocationUpdate(update: RealtimeUpdate): Promise<void> {
    console.log('配送位置更新:', update.data)
    // 这里可以更新地图组件或订单跟踪页面的配送员位置
  }
  
  /**
   * 处理支付状态更新
   */
  private async handlePaymentStatusUpdate(update: RealtimeUpdate): Promise<void> {
    const { orderId, paymentStatus } = update.data
    
    if (paymentStatus === 'paid') {
      this.addNotification({
        type: 'success',
        title: '支付成功',
        content: '您的订单支付已成功，商家将尽快为您处理',
        actions: [
          {
            label: '查看订单',
            action: 'navigate',
            params: { url: `/pages/order/track?id=${orderId}` }
          }
        ]
      })
    }
  }
  
  /**
   * 分发事件给监听器
   */
  private dispatchEvent(update: RealtimeUpdate): void {
    const listeners = this.eventListeners.get(update.eventType)
    if (listeners && listeners.length > 0) {
      listeners.forEach(listener => {
        try {
          listener(update)
        } catch (error) {
          console.error('事件监听器执行错误:', error)
        }
      })
    }
  }
  
  /**
   * 添加到离线缓存
   */
  private addToOfflineCache(update: RealtimeUpdate): void {
    const offlineMessage: OfflineMessage = {
      id: this.generateMessageId(),
      update,
      receivedAt: Date.now(),
      processed: false
    }
    
    this.offlineMessages.unshift(offlineMessage)
    
    // 限制缓存大小
    if (this.offlineMessages.length > this.maxOfflineMessages) {
      this.offlineMessages.splice(this.maxOfflineMessages)
    }
    
    this.saveOfflineMessages()
  }
  
  /**
   * 监听连接状态变化
   */
  private watchConnectionStatus(): void {
    // 监听WebSocket连接状态
    const updateConnectionQuality = () => {
      if (websocketService.isConnected.value) {
        this.connectionQuality.value = 'excellent'
        // 连接恢复时同步离线消息
        this.syncOfflineMessages()
      } else {
        this.connectionQuality.value = 'offline'
      }
    }
    
    // 初始状态
    updateConnectionQuality()
    
    // 监听状态变化（这里可以根据实际情况使用watch或其他方式）
    setInterval(updateConnectionQuality, 5000)
  }
  
  /**
   * 显示系统通知
   */
  private showSystemNotification(notification: NotificationMessage): void {
    if (notification.persistent) {
      return // 持久通知不显示toast
    }
    
    const icon = {
      'success': 'success',
      'error': 'error',
      'warning': 'none',
      'info': 'none'
    }[notification.type] as any
    
    uni.showToast({
      title: notification.title,
      icon: icon,
      duration: 3000
    })
  }
  
  /**
   * 清理离线消息
   */
  private cleanupOfflineMessages(): void {
    // 移除已处理的消息
    const processedCount = this.offlineMessages.filter(m => m.processed).length
    if (processedCount > 0) {
      this.offlineMessages.splice(
        this.offlineMessages.length - processedCount,
        processedCount
      )
    }
    
    // 移除过期消息（超过24小时）
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    const validMessages = this.offlineMessages.filter(m => m.receivedAt > oneDayAgo)
    
    if (validMessages.length !== this.offlineMessages.length) {
      this.offlineMessages.splice(0, this.offlineMessages.length, ...validMessages)
    }
  }
  
  /**
   * 保存离线消息到本地存储
   */
  private saveOfflineMessages(): void {
    try {
      uni.setStorageSync('realtime_offline_messages', JSON.stringify(this.offlineMessages))
    } catch (error) {
      console.error('保存离线消息失败:', error)
    }
  }
  
  /**
   * 从本地存储加载离线消息
   */
  private loadOfflineMessages(): void {
    try {
      const stored = uni.getStorageSync('realtime_offline_messages')
      if (stored) {
        const messages = JSON.parse(stored)
        this.offlineMessages.splice(0, 0, ...messages)
        this.cleanupOfflineMessages()
      }
    } catch (error) {
      console.error('加载离线消息失败:', error)
    }
  }
  
  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * 生成通知ID
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// 创建实时服务实例
export const realtimeService = new RealtimeService()

// 便捷方法
export const useRealtime = () => {
  return {
    realtimeService,
    enable: realtimeService.enable.bind(realtimeService),
    disable: realtimeService.disable.bind(realtimeService),
    addEventListener: realtimeService.addEventListener.bind(realtimeService),
    removeEventListener: realtimeService.removeEventListener.bind(realtimeService),
    addNotification: realtimeService.addNotification.bind(realtimeService),
    removeNotification: realtimeService.removeNotification.bind(realtimeService),
    syncOfflineMessages: realtimeService.syncOfflineMessages.bind(realtimeService),
    status: realtimeService.getStatus.bind(realtimeService),
    notifications: realtimeService.notifications
  }
}
