import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { Store } from '@/models/Store';
import { BusinessLogger } from '@/utils/logger';
import { cache } from '@/config/redis';

/**
 * WebSocket连接管理器
 */
class ConnectionManager {
  private userConnections = new Map<string, Set<string>>(); // userId -> socketIds
  private merchantConnections = new Map<string, Set<string>>(); // storeId -> socketIds
  private socketUsers = new Map<string, { userId: string; userType: string; storeId?: string }>(); // socketId -> user info

  /**
   * 添加用户连接
   */
  addUserConnection(userId: string, socketId: string, userType: string, storeId?: string): void {
    // 用户连接
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(socketId);

    // 商户连接
    if (userType === 'merchant' && storeId) {
      if (!this.merchantConnections.has(storeId)) {
        this.merchantConnections.set(storeId, new Set());
      }
      this.merchantConnections.get(storeId)!.add(socketId);
    }

    // Socket映射
    this.socketUsers.set(socketId, { userId, userType, storeId });

    BusinessLogger.info('WebSocket连接建立', {
      userId,
      socketId,
      userType,
      storeId
    });
  }

  /**
   * 移除连接
   */
  removeConnection(socketId: string): void {
    const userInfo = this.socketUsers.get(socketId);
    if (!userInfo) return;

    const { userId, userType, storeId } = userInfo;

    // 移除用户连接
    const userSockets = this.userConnections.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // 移除商户连接
    if (userType === 'merchant' && storeId) {
      const merchantSockets = this.merchantConnections.get(storeId);
      if (merchantSockets) {
        merchantSockets.delete(socketId);
        if (merchantSockets.size === 0) {
          this.merchantConnections.delete(storeId);
        }
      }
    }

    // 移除Socket映射
    this.socketUsers.delete(socketId);

    BusinessLogger.info('WebSocket连接断开', {
      userId,
      socketId,
      userType,
      storeId
    });
  }

  /**
   * 获取用户的所有连接
   */
  getUserConnections(userId: string): string[] {
    return Array.from(this.userConnections.get(userId) || []);
  }

  /**
   * 获取商户的所有连接
   */
  getMerchantConnections(storeId: string): string[] {
    return Array.from(this.merchantConnections.get(storeId) || []);
  }

  /**
   * 获取Socket的用户信息
   */
  getSocketUser(socketId: string) {
    return this.socketUsers.get(socketId);
  }

  /**
   * 获取连接统计
   */
  getStats() {
    return {
      totalUsers: this.userConnections.size,
      totalMerchants: this.merchantConnections.size,
      totalSockets: this.socketUsers.size
    };
  }
}

/**
 * 消息类型定义
 */
export enum MessageType {
  // 订单相关
  ORDER_STATUS_UPDATE = 'order_status_update',
  ORDER_PAYMENT_SUCCESS = 'order_payment_success',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_CANCELLED = 'order_cancelled',
  
  // 包间相关
  ROOM_STATUS_UPDATE = 'room_status_update',
  ROOM_OCCUPIED = 'room_occupied',
  ROOM_AVAILABLE = 'room_available',
  
  // 通知相关
  NOTIFICATION = 'notification',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  
  // 实时数据
  REAL_TIME_DATA = 'real_time_data',
  
  // 连接状态
  CONNECTION_STATUS = 'connection_status',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline'
}

/**
 * WebSocket服务器
 */
export class WebSocketServer {
  private io: SocketIOServer;
  private connectionManager: ConnectionManager;

  constructor(httpServer: HTTPServer) {
    this.connectionManager = new ConnectionManager();
    
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    // 认证中间件
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          throw new Error('认证token缺失');
        }

        // 验证JWT
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET!) as any;
        
        // 获取用户信息
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
          throw new Error('用户不存在或已禁用');
        }

        // 获取商户店铺信息
        let storeId;
        if (user.userType === 'merchant') {
          const stores = await Store.findByOwner(user._id);
          storeId = stores[0]?._id?.toString();
        }

        // 保存用户信息到socket
        socket.data.user = {
          userId: user._id.toString(),
          userType: user.userType,
          storeId,
          vipLevel: user.vipLevel
        };

        next();
      } catch (error) {
        BusinessLogger.warn('WebSocket认证失败', {
          socketId: socket.id,
          error: error.message
        });
        next(new Error('认证失败'));
      }
    });

    // 连接限制中间件
    this.io.use(async (socket, next) => {
      const userId = socket.data.user?.userId;
      if (!userId) {
        return next(new Error('用户信息缺失'));
      }

      // 限制同一用户的连接数
      const userConnections = this.connectionManager.getUserConnections(userId);
      if (userConnections.length >= 5) {
        BusinessLogger.warn('用户连接数超限', {
          userId,
          connectionCount: userConnections.length
        });
        return next(new Error('连接数超限，请关闭其他连接'));
      }

      next();
    });
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * 处理连接
   */
  private handleConnection(socket: Socket): void {
    const { userId, userType, storeId } = socket.data.user;

    // 添加连接管理
    this.connectionManager.addUserConnection(userId, socket.id, userType, storeId);

    // 发送连接成功消息
    socket.emit(MessageType.CONNECTION_STATUS, {
      status: 'connected',
      message: '连接成功',
      timestamp: new Date()
    });

    // 加入相应的房间
    socket.join(`user:${userId}`);
    if (userType === 'merchant' && storeId) {
      socket.join(`merchant:${storeId}`);
    }

    // 处理消息事件
    this.setupSocketEvents(socket);

    // 连接断开处理
    socket.on('disconnect', (reason) => {
      this.connectionManager.removeConnection(socket.id);
      
      BusinessLogger.info('WebSocket连接断开', {
        userId,
        socketId: socket.id,
        reason
      });
    });

    // 错误处理
    socket.on('error', (error) => {
      BusinessLogger.error('WebSocket错误', {
        userId,
        socketId: socket.id,
        error: error.message
      });
    });
  }

  /**
   * 设置Socket事件
   */
  private setupSocketEvents(socket: Socket): void {
    const { userId, userType } = socket.data.user;

    // 心跳检测
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });

    // 订阅实时数据
    socket.on('subscribe', (data) => {
      const { topics } = data;
      if (Array.isArray(topics)) {
        topics.forEach(topic => {
          socket.join(topic);
        });
        socket.emit('subscribed', { topics });
      }
    });

    // 取消订阅
    socket.on('unsubscribe', (data) => {
      const { topics } = data;
      if (Array.isArray(topics)) {
        topics.forEach(topic => {
          socket.leave(topic);
        });
        socket.emit('unsubscribed', { topics });
      }
    });

    // 商户特定事件
    if (userType === 'merchant') {
      this.setupMerchantEvents(socket);
    }

    // 管理员特定事件
    if (userType === 'admin') {
      this.setupAdminEvents(socket);
    }
  }

  /**
   * 设置商户事件
   */
  private setupMerchantEvents(socket: Socket): void {
    const { storeId } = socket.data.user;

    // 更新包间状态
    socket.on('update_room_status', async (data) => {
      const { roomId, status } = data;
      
      try {
        // 这里应该更新数据库中的包间状态
        // 然后向相关用户推送更新
        
        this.broadcastToStore(storeId, MessageType.ROOM_STATUS_UPDATE, {
          roomId,
          status,
          timestamp: new Date()
        });
        
        socket.emit('room_status_updated', { roomId, status });
      } catch (error) {
        socket.emit('error', { message: '更新包间状态失败' });
      }
    });

    // 处理订单
    socket.on('handle_order', async (data) => {
      const { orderId, action } = data; // action: confirm, reject, complete
      
      try {
        // 这里应该更新订单状态
        // 然后向用户推送更新
        
        this.notifyUser(data.userId, MessageType.ORDER_STATUS_UPDATE, {
          orderId,
          action,
          timestamp: new Date()
        });
        
        socket.emit('order_handled', { orderId, action });
      } catch (error) {
        socket.emit('error', { message: '处理订单失败' });
      }
    });
  }

  /**
   * 设置管理员事件
   */
  private setupAdminEvents(socket: Socket): void {
    // 系统公告
    socket.on('system_announcement', (data) => {
      const { message, targetType, targetIds } = data;
      
      if (targetType === 'all') {
        this.broadcastToAll(MessageType.SYSTEM_ANNOUNCEMENT, {
          message,
          timestamp: new Date()
        });
      } else if (targetType === 'users' && Array.isArray(targetIds)) {
        targetIds.forEach(userId => {
          this.notifyUser(userId, MessageType.SYSTEM_ANNOUNCEMENT, {
            message,
            timestamp: new Date()
          });
        });
      }
    });

    // 获取连接统计
    socket.on('get_connection_stats', () => {
      const stats = this.connectionManager.getStats();
      socket.emit('connection_stats', stats);
    });
  }

  /**
   * 向特定用户发送消息
   */
  public notifyUser(userId: string, type: MessageType, data: any): void {
    this.io.to(`user:${userId}`).emit(type, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * 向店铺的所有连接发送消息
   */
  public broadcastToStore(storeId: string, type: MessageType, data: any): void {
    this.io.to(`merchant:${storeId}`).emit(type, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * 向所有连接发送消息
   */
  public broadcastToAll(type: MessageType, data: any): void {
    this.io.emit(type, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * 向特定房间发送消息
   */
  public broadcastToRoom(room: string, type: MessageType, data: any): void {
    this.io.to(room).emit(type, {
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * 订单状态更新通知
   */
  public notifyOrderStatusUpdate(orderId: string, userId: string, storeId: string, newStatus: string, orderData: any): void {
    // 通知用户
    this.notifyUser(userId, MessageType.ORDER_STATUS_UPDATE, {
      orderId,
      status: newStatus,
      orderData
    });

    // 通知商户
    this.broadcastToStore(storeId, MessageType.ORDER_STATUS_UPDATE, {
      orderId,
      status: newStatus,
      orderData
    });
  }

  /**
   * 包间状态更新通知
   */
  public notifyRoomStatusUpdate(roomId: string, storeId: string, newStatus: string, roomData: any): void {
    // 通知商户
    this.broadcastToStore(storeId, MessageType.ROOM_STATUS_UPDATE, {
      roomId,
      status: newStatus,
      roomData
    });

    // 向订阅了该包间的用户发送通知
    this.broadcastToRoom(`room:${roomId}`, MessageType.ROOM_STATUS_UPDATE, {
      roomId,
      status: newStatus,
      roomData
    });
  }

  /**
   * 支付成功通知
   */
  public notifyPaymentSuccess(orderId: string, userId: string, storeId: string, paymentData: any): void {
    // 通知用户
    this.notifyUser(userId, MessageType.ORDER_PAYMENT_SUCCESS, {
      orderId,
      paymentData
    });

    // 通知商户
    this.broadcastToStore(storeId, MessageType.ORDER_PAYMENT_SUCCESS, {
      orderId,
      paymentData
    });
  }

  /**
   * 发送通知消息
   */
  public sendNotification(userId: string, notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    data?: any;
  }): void {
    this.notifyUser(userId, MessageType.NOTIFICATION, notification);
  }

  /**
   * 获取在线用户数
   */
  public getOnlineUserCount(): number {
    return this.connectionManager.getStats().totalUsers;
  }

  /**
   * 获取在线商户数
   */
  public getOnlineMerchantCount(): number {
    return this.connectionManager.getStats().totalMerchants;
  }

  /**
   * 检查用户是否在线
   */
  public isUserOnline(userId: string): boolean {
    return this.connectionManager.getUserConnections(userId).length > 0;
  }

  /**
   * 获取WebSocket实例
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

/**
 * WebSocket服务实例
 */
let webSocketServer: WebSocketServer;

export const initWebSocketServer = (httpServer: HTTPServer): WebSocketServer => {
  webSocketServer = new WebSocketServer(httpServer);
  return webSocketServer;
};

export const getWebSocketServer = (): WebSocketServer => {
  if (!webSocketServer) {
    throw new Error('WebSocket服务器未初始化');
  }
  return webSocketServer;
};
