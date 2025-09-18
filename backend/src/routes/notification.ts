import express from 'express';
import { NotificationController } from '@/controllers/NotificationController';
import { authenticate, requireUserType } from '@/middleware/auth';
import { apiLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validation';
import { notificationValidation } from '@/middleware/validation';

const router = express.Router();

/**
 * 用户通知相关路由
 */

// 获取通知列表 - 需要登录
router.get(
  '/',
  apiLimiter,
  authenticate,
  NotificationController.getNotifications
);

// 标记通知为已读 - 需要登录
router.post(
  '/mark-read',
  apiLimiter,
  authenticate,
  validate(notificationValidation.markAsRead),
  NotificationController.markAsRead
);

// 检查用户在线状态 - 需要登录
router.get(
  '/online/:targetUserId',
  apiLimiter,
  authenticate,
  NotificationController.checkUserOnline
);

/**
 * 管理员通知相关路由
 */

// 发送系统公告 - 需要管理员权限
router.post(
  '/system-announcement',
  apiLimiter,
  authenticate,
  requireUserType(['admin']),
  validate(notificationValidation.systemAnnouncement),
  NotificationController.sendSystemAnnouncement
);

// 获取在线统计 - 需要管理员权限
router.get(
  '/stats/online',
  apiLimiter,
  authenticate,
  requireUserType(['admin']),
  NotificationController.getOnlineStats
);

// 测试通知发送 - 开发环境，需要管理员权限
router.post(
  '/test',
  apiLimiter,
  authenticate,
  requireUserType(['admin']),
  validate(notificationValidation.testNotification),
  NotificationController.testNotification
);

export default router;
