import { getWebSocketServer, MessageType } from '@/websocket/server';
import { BusinessLogger } from '@/utils/logger';
import { cache } from '@/config/redis';

/**
 * 通知服务
 */
export class NotificationService {
  /**
   * 发送订单状态更新通知
   */
  static async notifyOrderStatusUpdate(orderId: string, userId: string, storeId: string, newStatus: string, orderData: any): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      wsServer.notifyOrderStatusUpdate(orderId, userId, storeId, newStatus, orderData);

      // 缓存通知，用于离线用户
      await this.cacheNotification(userId, {
        type: 'order_status',
        title: '订单状态更新',
        message: `您的订单${orderData.orderNumber}状态已更新为${this.getOrderStatusText(newStatus)}`,
        data: { orderId, status: newStatus },
        timestamp: new Date()
      });

      BusinessLogger.info('发送订单状态更新通知', {
        orderId,
        userId,
        storeId,
        newStatus
      });
    } catch (error) {
      BusinessLogger.error('发送订单状态更新通知失败', {
        orderId,
        userId,
        error: error.message
      });
    }
  }

  /**
   * 发送支付成功通知
   */
  static async notifyPaymentSuccess(orderId: string, userId: string, storeId: string, paymentData: any): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      wsServer.notifyPaymentSuccess(orderId, userId, storeId, paymentData);

      // 缓存通知
      await this.cacheNotification(userId, {
        type: 'payment_success',
        title: '支付成功',
        message: `订单${paymentData.orderNumber}支付成功，金额¥${paymentData.amount}`,
        data: { orderId, amount: paymentData.amount },
        timestamp: new Date()
      });

      BusinessLogger.info('发送支付成功通知', {
        orderId,
        userId,
        amount: paymentData.amount
      });
    } catch (error) {
      BusinessLogger.error('发送支付成功通知失败', {
        orderId,
        userId,
        error: error.message
      });
    }
  }

  /**
   * 发送包间状态更新通知
   */
  static async notifyRoomStatusUpdate(roomId: string, storeId: string, newStatus: string, roomData: any): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      wsServer.notifyRoomStatusUpdate(roomId, storeId, newStatus, roomData);

      BusinessLogger.info('发送包间状态更新通知', {
        roomId,
        storeId,
        newStatus
      });
    } catch (error) {
      BusinessLogger.error('发送包间状态更新通知失败', {
        roomId,
        storeId,
        error: error.message
      });
    }
  }

  /**
   * 发送订单创建通知
   */
  static async notifyOrderCreated(orderId: string, userId: string, storeId: string, orderData: any): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      
      // 向用户发送通知
      await this.cacheNotification(userId, {
        type: 'order_created',
        title: '订单已创建',
        message: `您的订单${orderData.orderNumber}已成功创建`,
        data: { orderId, orderData },
        timestamp: new Date()
      });

      // 向商户发送通知
      await this.cacheNotification(storeId, {
        type: 'new_order',
        title: '新订单',
        message: `收到新订单${orderData.orderNumber}`,
        data: { orderId, orderData },
        timestamp: new Date()
      });

      wsServer.notifyOrderCreated(orderId, userId, storeId, orderData);

      BusinessLogger.info('发送订单创建通知', {
        orderId,
        userId,
        storeId
      });
    } catch (error) {
      BusinessLogger.error('发送订单创建通知失败', {
        orderId,
        userId,
        storeId,
        error: error.message
      });
    }
  }

  /**
   * 发送预订提醒通知
   */
  static async notifyBookingReminder(userId: string, bookingData: any): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      
      const notification = {
        title: '预订提醒',
        message: `您在${bookingData.storeName}的预订将在30分钟后开始，请及时到店`,
        type: 'info' as const,
        data: {
          orderId: bookingData.orderId,
          storeName: bookingData.storeName,
          startTime: bookingData.startTime
        }
      };

      wsServer.sendNotification(userId, notification);

      // 缓存通知
      await this.cacheNotification(userId, {
        type: 'booking_reminder',
        ...notification,
        timestamp: new Date()
      });

      BusinessLogger.info('发送预订提醒通知', {
        userId,
        orderId: bookingData.orderId,
        startTime: bookingData.startTime
      });
    } catch (error) {
      BusinessLogger.error('发送预订提醒通知失败', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * 发送VIP升级通知
   */
  static async notifyVipUpgrade(userId: string, newVipLevel: number): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      
      const notification = {
        title: 'VIP等级提升',
        message: `恭喜您！您的VIP等级已提升至VIP${newVipLevel}，享受更多专属权益`,
        type: 'success' as const,
        data: { newVipLevel }
      };

      wsServer.sendNotification(userId, notification);

      // 缓存通知
      await this.cacheNotification(userId, {
        type: 'vip_upgrade',
        ...notification,
        timestamp: new Date()
      });

      BusinessLogger.info('发送VIP升级通知', {
        userId,
        newVipLevel
      });
    } catch (error) {
      BusinessLogger.error('发送VIP升级通知失败', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * 发送积分变动通知
   */
  static async notifyPointsChange(userId: string, pointsChange: number, reason: string, newBalance: number): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      
      const isIncrease = pointsChange > 0;
      const notification = {
        title: isIncrease ? '积分到账' : '积分使用',
        message: `${reason}，${isIncrease ? '获得' : '使用'}${Math.abs(pointsChange)}积分，当前余额${newBalance}积分`,
        type: 'info' as const,
        data: { pointsChange, newBalance, reason }
      };

      wsServer.sendNotification(userId, notification);

      // 缓存通知
      await this.cacheNotification(userId, {
        type: 'points_change',
        ...notification,
        timestamp: new Date()
      });

      BusinessLogger.info('发送积分变动通知', {
        userId,
        pointsChange,
        newBalance,
        reason
      });
    } catch (error) {
      BusinessLogger.error('发送积分变动通知失败', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * 发送系统公告
   */
  static async broadcastSystemAnnouncement(announcement: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'important';
    targetUsers?: string[];
  }): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      
      if (announcement.targetUsers && announcement.targetUsers.length > 0) {
        // 发送给指定用户
        for (const userId of announcement.targetUsers) {
          wsServer.sendNotification(userId, {
            title: announcement.title,
            message: announcement.message,
            type: announcement.type || 'info',
            data: { isSystemAnnouncement: true }
          });

          // 缓存通知
          await this.cacheNotification(userId, {
            type: 'system_announcement',
            title: announcement.title,
            message: announcement.message,
            data: { isSystemAnnouncement: true },
            timestamp: new Date()
          });
        }
      } else {
        // 广播给所有用户
        wsServer.broadcastToAll(MessageType.SYSTEM_ANNOUNCEMENT, {
          title: announcement.title,
          message: announcement.message,
          type: announcement.type || 'info'
        });
      }

      BusinessLogger.info('发送系统公告', {
        title: announcement.title,
        targetUserCount: announcement.targetUsers?.length || 'all'
      });
    } catch (error) {
      BusinessLogger.error('发送系统公告失败', {
        error: error.message
      });
    }
  }

  /**
   * 获取用户未读通知
   */
  static async getUserNotifications(userId: string, page: number = 1, limit: number = 20): Promise<{
    notifications: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const cacheKey = `notifications:${userId}`;
      const total = await cache.llen(cacheKey);
      const start = (page - 1) * limit;
      const end = page * limit - 1;
      
      const notifications = await cache.lrange(cacheKey, start, end);
      const parsedNotifications = notifications.map(notification => JSON.parse(notification));
      
      return {
        notifications: parsedNotifications,
        total,
        hasMore: total > page * limit
      };
    } catch (error) {
      BusinessLogger.error('获取用户通知失败', {
        userId,
        error: error.message
      });
      return {
        notifications: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * 标记通知为已读
   */
  static async markNotificationsAsRead(userId: string, notificationIds?: string[]): Promise<void> {
    try {
      const cacheKey = `notifications:${userId}`;
      
      if (notificationIds && notificationIds.length > 0) {
        // 标记指定通知为已读（实际实现中可能需要更复杂的逻辑）
        // 这里简化处理，删除指定的通知
        const notifications = await cache.lrange(cacheKey, 0, -1);
        const updatedNotifications = notifications
          .map(n => JSON.parse(n))
          .filter(n => !notificationIds.includes(n.id))
          .map(n => JSON.stringify(n));
        
        await cache.del(cacheKey);
        if (updatedNotifications.length > 0) {
          await cache.lpush(cacheKey, ...updatedNotifications);
        }
      } else {
        // 标记所有通知为已读
        await cache.del(cacheKey);
      }

      BusinessLogger.info('标记通知为已读', {
        userId,
        notificationIds: notificationIds?.length || 'all'
      });
    } catch (error) {
      BusinessLogger.error('标记通知为已读失败', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * 标记单个通知为已读
   */
  static async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      await cache.set(`notification_read:${userId}:${notificationId}`, '1', 86400); // 24小时过期
      
      BusinessLogger.info('标记单个通知为已读', {
        userId,
        notificationId
      });
    } catch (error) {
      BusinessLogger.error('标记单个通知为已读失败', {
        userId,
        notificationId,
        error: error.message
      });
    }
  }

  /**
   * 清除用户的所有通知
   */
  static async clearUserNotifications(userId: string): Promise<void> {
    try {
      const cacheKey = `notifications:${userId}`;
      await cache.del(cacheKey);
      
      BusinessLogger.info('清除用户通知', {
        userId
      });
    } catch (error) {
      BusinessLogger.error('清除用户通知失败', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * 发送自定义通知
   */
  static async sendCustomNotification(userId: string, title: string, message: string, data?: any): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      
      const notification = {
        type: 'custom',
        title,
        message,
        data,
        timestamp: new Date()
      };

      wsServer.sendToUser(userId, 'notification', notification);
      await this.cacheNotification(userId, notification);

      BusinessLogger.info('发送自定义通知', {
        userId,
        title
      });
    } catch (error) {
      BusinessLogger.error('发送自定义通知失败', {
        userId,
        title,
        error: error.message
      });
    }
  }

  /**
   * 广播通知给所有用户
   */
  static async broadcastNotification(title: string, message: string, data?: any): Promise<void> {
    try {
      const wsServer = getWebSocketServer();
      
      const notification = {
        type: 'broadcast',
        title,
        message,
        data,
        timestamp: new Date()
      };

      wsServer.broadcast('notification', notification);

      BusinessLogger.info('广播通知', {
        title
      });
    } catch (error) {
      BusinessLogger.error('广播通知失败', {
        title,
        error: error.message
      });
    }
  }

  /**
   * 缓存通知（用于离线用户）
   */
  static async cacheNotification(userId: string, notification: any): Promise<void> {
    try {
      const cacheKey = `notifications:${userId}`;
      const notificationWithId = {
        ...notification,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      // 添加到列表头部
      await cache.lpush(cacheKey, JSON.stringify(notificationWithId));
      
      // 保持最多100条通知
      await cache.ltrim(cacheKey, 0, 99);
      
      // 设置过期时间（30天）
      await cache.expire(cacheKey, 30 * 24 * 60 * 60);
    } catch (error) {
      BusinessLogger.error('缓存通知失败', {
        userId,
        error: error.message
      });
    }
  }

  /**
   * 获取订单状态文本
   */
  static getOrderStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': '等待确认',
      'paid': '已支付',
      'confirmed': '已确认',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消',
      'refunded': '已退款'
    };
    
    return statusMap[status] || '未知状态';
  }

  /**
   * 检查用户是否在线
   */
  static isUserOnline(userId: string): boolean {
    try {
      const wsServer = getWebSocketServer();
      return wsServer.isUserOnline(userId);
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取在线统计
   */
  static getOnlineStats(): { users: number; merchants: number } {
    try {
      const wsServer = getWebSocketServer();
      return {
        users: wsServer.getOnlineUserCount(),
        merchants: wsServer.getOnlineMerchantCount()
      };
    } catch (error) {
      return { users: 0, merchants: 0 };
    }
  }
}
