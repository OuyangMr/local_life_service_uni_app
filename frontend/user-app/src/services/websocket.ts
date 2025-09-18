import { ref, reactive } from 'vue'
import type { ApiResponse } from '@/types/api'

// WebSocket连接状态
export enum WebSocketStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// WebSocket消息类型
export enum MessageType {
  PING = 'ping',
  PONG = 'pong',
  ORDER_STATUS_UPDATE = 'order_status_update',
  ROOM_STATUS_UPDATE = 'room_status_update',
  BOOKING_STATUS_UPDATE = 'booking_status_update',
  NOTIFICATION = 'notification',
  SYSTEM_MESSAGE = 'system_message'
}

// WebSocket消息格式
export interface WebSocketMessage {
  type: MessageType
  data: any
  timestamp: number
  id?: string
}

// 连接配置
interface ConnectionConfig {
  url: string
  heartbeatInterval: number
  reconnectInterval: number
  maxReconnectAttempts: number
  timeout: number
}

// 事件监听器类型
type EventListener = (data: any) => void

class WebSocketService {
  private socket: any = null
  private config: ConnectionConfig
  private heartbeatTimer: any = null
  private reconnectTimer: any = null
  private reconnectAttempts = 0
  private eventListeners: Map<MessageType, EventListener[]> = new Map()
  
  // 响应式状态
  public status = ref<WebSocketStatus>(WebSocketStatus.DISCONNECTED)
  public isConnected = ref(false)
  public lastConnectedTime = ref<Date | null>(null)
  public reconnectCount = ref(0)
  public messageQueue: WebSocketMessage[] = reactive([])
  
  constructor(config?: Partial<ConnectionConfig>) {
    this.config = {
      url: 'ws://localhost:3000',
      heartbeatInterval: 30000, // 30秒心跳
      reconnectInterval: 5000,  // 5秒重连间隔
      maxReconnectAttempts: 10, // 最大重连次数
      timeout: 10000,           // 10秒超时
      ...config
    }
    
    // 初始化事件监听器
    this.initEventListeners()
  }
  
  /**
   * 建立WebSocket连接
   */
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected.value) {
        resolve()
        return
      }
      
      this.status.value = WebSocketStatus.CONNECTING
      
      try {
        // 构建连接URL
        let url = this.config.url
        if (token) {
          url += `?token=${encodeURIComponent(token)}`
        }
        
        // 创建WebSocket连接
        this.socket = uni.connectSocket({
          url,
          complete: () => {}
        })
        
        // 连接成功
        this.socket.onOpen(() => {
          console.log('WebSocket连接成功')
          this.status.value = WebSocketStatus.CONNECTED
          this.isConnected.value = true
          this.lastConnectedTime.value = new Date()
          this.reconnectAttempts = 0
          this.reconnectCount.value = 0
          
          // 开始心跳检测
          this.startHeartbeat()
          
          // 发送排队的消息
          this.sendQueuedMessages()
          
          resolve()
        })
        
        // 连接失败
        this.socket.onError((error: any) => {
          console.error('WebSocket连接错误:', error)
          this.status.value = WebSocketStatus.ERROR
          this.isConnected.value = false
          
          // 自动重连
          this.handleReconnect()
          
          reject(error)
        })
        
        // 连接关闭
        this.socket.onClose((close: any) => {
          console.log('WebSocket连接关闭:', close)
          this.status.value = WebSocketStatus.DISCONNECTED
          this.isConnected.value = false
          
          // 停止心跳
          this.stopHeartbeat()
          
          // 自动重连
          this.handleReconnect()
        })
        
        // 接收消息
        this.socket.onMessage((message: any) => {
          this.handleMessage(message.data)
        })
        
      } catch (error) {
        console.error('创建WebSocket连接失败:', error)
        this.status.value = WebSocketStatus.ERROR
        reject(error)
      }
    })
  }
  
  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    
    this.stopHeartbeat()
    this.stopReconnect()
    
    this.status.value = WebSocketStatus.DISCONNECTED
    this.isConnected.value = false
  }
  
  /**
   * 发送消息
   */
  sendMessage(type: MessageType, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now(),
        id: this.generateMessageId()
      }
      
      if (!this.isConnected.value) {
        // 连接断开时，将消息加入队列
        this.messageQueue.push(message)
        reject(new Error('WebSocket未连接，消息已加入队列'))
        return
      }
      
      try {
        this.socket.send({
          data: JSON.stringify(message),
          success: () => {
            console.log('消息发送成功:', message)
            resolve()
          },
          fail: (error: any) => {
            console.error('消息发送失败:', error)
            // 发送失败时也加入队列，等待重连后发送
            this.messageQueue.push(message)
            reject(error)
          }
        })
      } catch (error) {
        console.error('发送消息异常:', error)
        this.messageQueue.push(message)
        reject(error)
      }
    })
  }
  
  /**
   * 添加事件监听器
   */
  addEventListener(type: MessageType, listener: EventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, [])
    }
    this.eventListeners.get(type)!.push(listener)
  }
  
  /**
   * 移除事件监听器
   */
  removeEventListener(type: MessageType, listener: EventListener): void {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
  
  /**
   * 移除所有事件监听器
   */
  removeAllEventListeners(type?: MessageType): void {
    if (type) {
      this.eventListeners.delete(type)
    } else {
      this.eventListeners.clear()
    }
  }
  
  /**
   * 获取连接状态信息
   */
  getConnectionInfo() {
    return {
      status: this.status.value,
      isConnected: this.isConnected.value,
      lastConnectedTime: this.lastConnectedTime.value,
      reconnectCount: this.reconnectCount.value,
      queuedMessages: this.messageQueue.length,
      config: this.config
    }
  }
  
  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      console.log('收到WebSocket消息:', message)
      
      // 处理特殊消息类型
      switch (message.type) {
        case MessageType.PING:
          // 响应ping消息
          this.sendMessage(MessageType.PONG, { timestamp: Date.now() })
          break
          
        case MessageType.PONG:
          // 心跳响应，重置心跳计时器
          console.log('收到心跳响应')
          break
          
        default:
          // 分发消息给监听器
          this.dispatchMessage(message)
          break
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error, data)
    }
  }
  
  /**
   * 分发消息给监听器
   */
  private dispatchMessage(message: WebSocketMessage): void {
    const listeners = this.eventListeners.get(message.type)
    if (listeners && listeners.length > 0) {
      listeners.forEach(listener => {
        try {
          listener(message.data)
        } catch (error) {
          console.error('消息监听器执行错误:', error)
        }
      })
    }
  }
  
  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected.value) {
        this.sendMessage(MessageType.PING, { timestamp: Date.now() })
          .catch(error => {
            console.error('心跳发送失败:', error)
          })
      }
    }, this.config.heartbeatInterval)
  }
  
  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
  
  /**
   * 处理重连
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连')
      return
    }
    
    this.status.value = WebSocketStatus.RECONNECTING
    this.reconnectAttempts++
    this.reconnectCount.value = this.reconnectAttempts
    
    console.log(`准备重连WebSocket... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
        .catch(error => {
          console.error('重连失败:', error)
        })
    }, this.config.reconnectInterval)
  }
  
  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
    this.reconnectCount.value = 0
  }
  
  /**
   * 发送队列中的消息
   */
  private sendQueuedMessages(): void {
    if (this.messageQueue.length === 0) {
      return
    }
    
    console.log(`发送队列中的${this.messageQueue.length}条消息`)
    
    const messages = [...this.messageQueue]
    this.messageQueue.splice(0)
    
    messages.forEach(message => {
      this.sendMessage(message.type, message.data)
        .catch(error => {
          console.error('队列消息发送失败:', error)
        })
    })
  }
  
  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * 初始化事件监听器
   */
  private initEventListeners(): void {
    // 可以在这里添加一些默认的事件监听器
    this.addEventListener(MessageType.SYSTEM_MESSAGE, (data) => {
      console.log('系统消息:', data)
      // 可以在这里显示系统通知
      uni.showToast({
        title: data.message || '系统消息',
        icon: 'none'
      })
    })
  }
}

// 创建WebSocket服务实例
export const websocketService = new WebSocketService()

// 便捷方法
export const useWebSocket = () => {
  return {
    websocketService,
    connect: websocketService.connect.bind(websocketService),
    disconnect: websocketService.disconnect.bind(websocketService),
    sendMessage: websocketService.sendMessage.bind(websocketService),
    addEventListener: websocketService.addEventListener.bind(websocketService),
    removeEventListener: websocketService.removeEventListener.bind(websocketService),
    status: websocketService.status,
    isConnected: websocketService.isConnected,
    connectionInfo: websocketService.getConnectionInfo.bind(websocketService)
  }
}
