import express from 'express';
import { PointController } from '@/controllers/PointController';
import { authenticate, requireUserType } from '@/middleware/auth';
import { apiLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validation';
import { pointValidation } from '@/middleware/validation';

const router = express.Router();

/**
 * 用户积分相关路由
 */

// 获取积分余额 - 需要登录
router.get(
  '/balance',
  apiLimiter,
  authenticate,
  PointController.getBalance
);

// 获取积分记录 - 需要登录
router.get(
  '/records',
  apiLimiter,
  authenticate,
  validate(pointValidation.getRecords),
  PointController.getRecords
);

// 获取积分统计 - 需要登录
router.get(
  '/statistics',
  apiLimiter,
  authenticate,
  PointController.getStatistics
);

// 使用积分 - 需要登录
router.post(
  '/use',
  apiLimiter,
  authenticate,
  validate(pointValidation.usePoints),
  PointController.usePoints
);

// 兑换奖品 - 需要登录
router.post(
  '/exchange',
  apiLimiter,
  authenticate,
  validate(pointValidation.exchangeReward),
  PointController.exchangeReward
);

/**
 * 公开路由
 */

// 获取积分规则说明 - 无需登录
router.get(
  '/rules',
  apiLimiter,
  PointController.getRules
);

// 获取可兑换奖品列表 - 无需登录（但登录后会显示用户余额）
router.get(
  '/rewards',
  apiLimiter,
  (req, res, next) => {
    // 可选认证，如果有token则验证，没有则跳过
    const token = req.headers.authorization;
    if (token) {
      return authenticate(req, res, next);
    }
    next();
  },
  PointController.getRewards
);

/**
 * 管理员路由
 */

// 手动调整积分 - 需要管理员权限
router.post(
  '/adjust',
  apiLimiter,
  authenticate,
  requireUserType(['admin']),
  validate(pointValidation.adjustPoints),
  PointController.adjustPoints
);

// 处理过期积分 - 需要管理员权限
router.post(
  '/process-expired',
  apiLimiter,
  authenticate,
  requireUserType(['admin']),
  PointController.processExpiredPoints
);

export default router;
