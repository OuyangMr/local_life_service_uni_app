import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { PointRecord, PointType, PointSource } from '@/models/PointRecord';
import { User } from '@/models/User';
import { Order } from '@/models/Order';
import { createError } from '@/middleware/errorHandler';
import { BusinessLogger } from '@/utils/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse, PaginatedResponse } from '@/types';
import { cache } from '@/config/redis';

/**
 * 积分系统控制器
 */
export class PointController {
  /**
   * 获取用户积分余额
   */
  static getBalance = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 尝试从缓存获取
    const cacheKey = `points:balance:${userId}`;
    let cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: { balance: Number(cached) }
      });
    }

    const balance = await PointRecord.getUserBalance(userId);
    
    // 缓存余额（5分钟）
    await cache.setex(cacheKey, 300, balance.toString());

    res.json({
      success: true,
      data: { balance }
    });
  });

  /**
   * 获取积分记录
   */
  static getRecords = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { type, page = 1, limit = 20, startDate, endDate } = req.query;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 构建查询条件
    const query: any = { userId };
    
    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [records, total] = await Promise.all([
      PointRecord.find(query)
        .populate('orderId', 'orderNumber type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PointRecord.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages
        }
      }
    });
  });

  /**
   * 获取积分统计
   */
  static getStatistics = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { period = 'month' } = req.query; // month, quarter, year

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // 尝试从缓存获取
    const cacheKey = `points:stats:${userId}:${period}`;
    let cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: JSON.parse(cached)
      });
    }

    // 获取统计数据
    const [earnStats, useStats, balance, totalEarned, totalUsed] = await Promise.all([
      // 获得积分统计
      PointRecord.getEarningStats(userId, startDate, endDate),
      
      // 使用积分统计
      PointRecord.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: PointType.USE,
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$source',
            totalAmount: { $sum: { $abs: '$amount' } },
            count: { $sum: 1 }
          }
        }
      ]),

      // 当前余额
      PointRecord.getUserBalance(userId),

      // 累计获得
      PointRecord.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: PointType.EARN
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),

      // 累计使用
      PointRecord.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: PointType.USE
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $abs: '$amount' } }
          }
        }
      ])
    ]);

    const statistics = {
      balance,
      totalEarned: totalEarned[0]?.total || 0,
      totalUsed: totalUsed[0]?.total || 0,
      periodEarned: earnStats.reduce((sum, stat) => sum + stat.totalAmount, 0),
      periodUsed: useStats.reduce((sum, stat) => sum + stat.totalAmount, 0),
      earningSources: earnStats,
      usageSources: useStats,
      period
    };

    // 缓存统计数据（15分钟）
    await cache.setex(cacheKey, 900, JSON.stringify(statistics));

    res.json({
      success: true,
      data: statistics
    });
  });

  /**
   * 使用积分
   */
  static usePoints = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { amount, orderId, description } = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    if (amount <= 0) {
      throw createError.badRequest('使用积分数量必须大于0', 'INVALID_AMOUNT');
    }

    // 检查积分余额
    const balance = await PointRecord.getUserBalance(userId);
    if (balance < amount) {
      throw createError.badRequest('积分余额不足', 'INSUFFICIENT_POINTS');
    }

    // 验证订单（如果提供）
    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) {
        throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
      }

      if (order.userId.toString() !== userId) {
        throw createError.forbidden('只能在自己的订单中使用积分', 'INSUFFICIENT_PERMISSIONS');
      }
    }

    // 创建使用记录
    const record = await PointRecord.createUseRecord(
      userId,
      amount,
      orderId || '',
      description || '积分消费'
    );

    // 清除相关缓存
    await cache.del(`points:balance:${userId}`);
    await cache.del(`points:stats:${userId}:month`);

    // 记录业务日志
    BusinessLogger.info('使用积分', {
      userId,
      amount,
      orderId,
      recordId: record._id,
      newBalance: record.balance
    });

    res.json({
      success: true,
      message: '积分使用成功',
      data: {
        usedAmount: amount,
        newBalance: record.balance,
        recordId: record._id
      }
    });
  });

  /**
   * 积分兑换奖品
   */
  static exchangeReward = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { rewardId, quantity = 1 } = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 奖品列表（实际应用中应该从数据库获取）
    const rewards = {
      'coupon_10': { name: '10元优惠券', points: 100, stock: 1000 },
      'coupon_20': { name: '20元优惠券', points: 200, stock: 500 },
      'coupon_50': { name: '50元优惠券', points: 500, stock: 100 },
      'gift_card': { name: '礼品卡', points: 1000, stock: 50 },
      'premium_service': { name: '高级服务体验', points: 2000, stock: 20 }
    };

    const reward = rewards[rewardId as keyof typeof rewards];
    if (!reward) {
      throw createError.notFound('奖品不存在', 'REWARD_NOT_FOUND');
    }

    const totalPoints = reward.points * quantity;

    // 检查积分余额
    const balance = await PointRecord.getUserBalance(userId);
    if (balance < totalPoints) {
      throw createError.badRequest('积分余额不足', 'INSUFFICIENT_POINTS');
    }

    // 检查库存（实际应该使用Redis或数据库锁）
    const stockKey = `reward:stock:${rewardId}`;
    const currentStock = await cache.get(stockKey) || reward.stock;
    
    if (Number(currentStock) < quantity) {
      throw createError.badRequest('奖品库存不足', 'INSUFFICIENT_STOCK');
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 使用积分
        const record = await PointRecord.createUseRecord(
          userId,
          totalPoints,
          '',
          `兑换奖品：${reward.name} x${quantity}`
        );

        // 减少库存
        await cache.decr(stockKey);

        // 创建兑换记录（实际应用中应该有专门的兑换表）
        const exchangeRecord = {
          userId,
          rewardId,
          rewardName: reward.name,
          quantity,
          pointsUsed: totalPoints,
          status: 'pending',
          createdAt: new Date()
        };

        // 这里应该保存到兑换记录表
        BusinessLogger.info('积分兑换', {
          userId,
          rewardId,
          quantity,
          pointsUsed: totalPoints,
          newBalance: record.balance
        });

        // 清除相关缓存
        await cache.del(`points:balance:${userId}`);
        await cache.del(`points:stats:${userId}:month`);

        res.json({
          success: true,
          message: '兑换成功，奖品将在1-3个工作日内发放',
          data: {
            rewardName: reward.name,
            quantity,
            pointsUsed: totalPoints,
            newBalance: record.balance,
            exchangeId: record._id // 实际应该是专门的兑换ID
          }
        });
      });
    } finally {
      await session.endSession();
    }
  });

  /**
   * 获取积分规则说明
   */
  static getRules = catchAsync(async (req: Request, res: Response): Promise<void> => {
    // 积分规则（实际应用中应该从配置表获取）
    const rules = {
      earning: [
        {
          source: 'order',
          name: '订单消费',
          description: '每消费1元获得5积分，VIP用户翻倍',
          rate: '5积分/元',
          vipRate: '10积分/元'
        },
        {
          source: 'sign_in',
          name: '每日签到',
          description: '每日签到可获得10积分',
          rate: '10积分/次'
        },
        {
          source: 'invite',
          name: '邀请好友',
          description: '成功邀请好友注册可获得50积分',
          rate: '50积分/人'
        },
        {
          source: 'activity',
          name: '活动奖励',
          description: '参与平台活动可获得额外积分',
          rate: '根据活动而定'
        }
      ],
      usage: [
        {
          type: '抵扣消费',
          description: '100积分可抵扣1元，最多抵扣订单金额的50%',
          rate: '100积分 = 1元'
        },
        {
          type: '兑换优惠券',
          description: '可兑换各种面额的优惠券',
          examples: ['100积分 = 10元优惠券', '200积分 = 20元优惠券']
        },
        {
          type: '兑换礼品',
          description: '可兑换平台提供的各种礼品',
          examples: ['1000积分 = 礼品卡', '2000积分 = 高级服务体验']
        }
      ],
      expiry: {
        duration: '365天',
        description: '积分自获得之日起365天内有效，过期自动清零'
      },
      levelBenefits: [
        {
          level: 0,
          name: '普通用户',
          benefits: ['基础积分获取', '积分抵扣消费']
        },
        {
          level: 1,
          name: 'VIP1',
          benefits: ['积分获取翻倍', '专享优惠券', '优先客服']
        },
        {
          level: 2,
          name: 'VIP2',
          benefits: ['积分获取翻倍', '免费配送', '生日礼品']
        },
        {
          level: 3,
          name: 'VIP3',
          benefits: ['积分获取翻倍', '专属客服', '优先预订']
        }
      ]
    };

    res.json({
      success: true,
      data: rules
    });
  });

  /**
   * 获取可兑换奖品列表
   */
  static getRewards = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    // 奖品列表（实际应用中应该从数据库获取）
    const rewards = [
      {
        id: 'coupon_10',
        name: '10元优惠券',
        description: '全场通用，满50元可用',
        points: 100,
        originalPrice: 10,
        category: '优惠券',
        image: '/images/rewards/coupon_10.png',
        stock: 1000,
        validDays: 30
      },
      {
        id: 'coupon_20',
        name: '20元优惠券',
        description: '全场通用，满100元可用',
        points: 200,
        originalPrice: 20,
        category: '优惠券',
        image: '/images/rewards/coupon_20.png',
        stock: 500,
        validDays: 30
      },
      {
        id: 'coupon_50',
        name: '50元优惠券',
        description: '全场通用，满200元可用',
        points: 500,
        originalPrice: 50,
        category: '优惠券',
        image: '/images/rewards/coupon_50.png',
        stock: 100,
        validDays: 30
      },
      {
        id: 'gift_card',
        name: '100元礼品卡',
        description: '可在合作商户使用的电子礼品卡',
        points: 1000,
        originalPrice: 100,
        category: '礼品卡',
        image: '/images/rewards/gift_card.png',
        stock: 50,
        validDays: 365
      },
      {
        id: 'premium_service',
        name: '高级服务体验',
        description: '享受一次高级包间服务体验',
        points: 2000,
        originalPrice: 200,
        category: '服务',
        image: '/images/rewards/premium_service.png',
        stock: 20,
        validDays: 90
      }
    ];

    // 获取用户积分余额
    let userBalance = 0;
    if (userId) {
      userBalance = await PointRecord.getUserBalance(userId);
    }

    // 标记用户是否有足够积分兑换
    const rewardsWithStatus = rewards.map(reward => ({
      ...reward,
      canExchange: userBalance >= reward.points && reward.stock > 0,
      discount: `${Math.round((1 - reward.points / (reward.originalPrice * 100)) * 100)}%`
    }));

    res.json({
      success: true,
      data: {
        rewards: rewardsWithStatus,
        userBalance
      }
    });
  });

  /**
   * 管理员手动调整积分
   */
  static adjustPoints = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { targetUserId, amount, reason, type = 'manual' } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 检查管理员权限
    if (req.user?.userType !== 'admin') {
      throw createError.forbidden('只有管理员可以调整积分', 'INSUFFICIENT_PERMISSIONS');
    }

    // 验证目标用户
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw createError.notFound('目标用户不存在', 'USER_NOT_FOUND');
    }

    if (amount === 0) {
      throw createError.badRequest('调整数量不能为0', 'INVALID_AMOUNT');
    }

    let record;
    if (amount > 0) {
      // 增加积分
      record = await PointRecord.createEarnRecord(
        targetUserId,
        amount,
        PointSource.MANUAL,
        reason || '管理员手动调整',
        { adminId }
      );
    } else {
      // 扣除积分
      const balance = await PointRecord.getUserBalance(targetUserId);
      if (balance < Math.abs(amount)) {
        throw createError.badRequest('用户积分余额不足', 'INSUFFICIENT_POINTS');
      }

      record = await PointRecord.createUseRecord(
        targetUserId,
        Math.abs(amount),
        '',
        reason || '管理员手动调整'
      );
    }

    // 清除相关缓存
    await cache.del(`points:balance:${targetUserId}`);
    await cache.del(`points:stats:${targetUserId}:month`);

    // 记录业务日志
    BusinessLogger.info('管理员调整积分', {
      adminId,
      targetUserId,
      amount,
      reason,
      newBalance: record.balance
    });

    res.json({
      success: true,
      message: '积分调整成功',
      data: {
        targetUserId,
        adjustAmount: amount,
        newBalance: record.balance,
        reason
      }
    });
  });

  /**
   * 处理过期积分
   */
  static processExpiredPoints = catchAsync(async (req: Request, res: Response): Promise<void> => {
    // 检查管理员权限
    if (req.user?.userType !== 'admin') {
      throw createError.forbidden('只有管理员可以处理过期积分', 'INSUFFICIENT_PERMISSIONS');
    }

    const expiredCount = await PointRecord.processExpiredPoints();

    BusinessLogger.info('处理过期积分', {
      adminId: req.user?.id,
      expiredCount
    });

    res.json({
      success: true,
      message: `成功处理${expiredCount}条过期积分记录`,
      data: { expiredCount }
    });
  });
}
