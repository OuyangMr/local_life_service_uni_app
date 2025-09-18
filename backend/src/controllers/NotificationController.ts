import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '@/services/NotificationService';
import { createError } from '@/middleware/errorHandler';
import { BusinessLogger } from '@/utils/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';

/**
 * 通知控制器
 */
export class NotificationController {
  /**
   * 获取用户通知列表
   */
  static getNotifications = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { limit = 20 } = req.query;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const notifications = await NotificationService.getUserNotifications(userId, Number(limit));

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount: notifications.length
      }
    });
  });

  /**
   * 标记通知为已读
   */
  static markAsRead = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { notificationIds } = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    await NotificationService.markNotificationsAsRead(userId, notificationIds);

    res.json({
      success: true,
      message: '通知已标记为已读'
    });
  });

  /**
   * 发送系统公告（管理员）
   */
  static sendSystemAnnouncement = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { title, message, type, targetUsers } = req.body;

    if (req.user?.userType !== 'admin') {
      throw createError.forbidden('只有管理员可以发送系统公告', 'INSUFFICIENT_PERMISSIONS');
    }

    await NotificationService.broadcastSystemAnnouncement({
      title,
      message,
      type,
      targetUsers
    });

    // 记录业务日志
    BusinessLogger.info('发送系统公告', {
      adminId: req.user?.id,
      title,
      targetUserCount: targetUsers?.length || 'all'
    });

    res.json({
      success: true,
      message: '系统公告发送成功'
    });
  });

  /**
   * 获取在线统计（管理员）
   */
  static getOnlineStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
    if (req.user?.userType !== 'admin') {
      throw createError.forbidden('只有管理员可以查看在线统计', 'INSUFFICIENT_PERMISSIONS');
    }

    const stats = NotificationService.getOnlineStats();

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * 检查用户在线状态
   */
  static checkUserOnline = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { targetUserId } = req.params;

    // 检查权限（管理员或查询自己）
    if (req.user?.userType !== 'admin' && req.user?.id !== targetUserId) {
      throw createError.forbidden('无权查看该用户状态', 'INSUFFICIENT_PERMISSIONS');
    }

    const isOnline = NotificationService.isUserOnline(targetUserId);

    res.json({
      success: true,
      data: {
        userId: targetUserId,
        isOnline,
        lastChecked: new Date()
      }
    });
  });

  /**
   * 测试通知发送（开发环境）
   */
  static testNotification = catchAsync(async (req: Request, res: Response): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
      throw createError.forbidden('生产环境禁用测试功能', 'FEATURE_DISABLED');
    }

    if (req.user?.userType !== 'admin') {
      throw createError.forbidden('只有管理员可以测试通知', 'INSUFFICIENT_PERMISSIONS');
    }

    const { targetUserId, title, message, type } = req.body;

    const testNotification = {
      title: title || '测试通知',
      message: message || '这是一条测试通知消息',
      type: type || 'info',
      data: { isTest: true }
    };

    // 如果指定了用户，发送给该用户，否则发送给当前管理员
    const userId = targetUserId || req.user?.id;
    
    try {
      const wsServer = require('@/websocket/server').getWebSocketServer();
      wsServer.sendNotification(userId, testNotification);
      
      res.json({
        success: true,
        message: '测试通知发送成功',
        data: {
          targetUserId: userId,
          notification: testNotification
        }
      });
    } catch (error) {
      res.json({
        success: false,
        message: 'WebSocket服务未启动或用户不在线',
        error: error.message
      });
    }
  });
}
