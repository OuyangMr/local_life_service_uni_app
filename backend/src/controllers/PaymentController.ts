import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Order, OrderStatus, PaymentMethod } from '@/models/Order';
import { User } from '@/models/User';
import { PointRecord, PointType, PointSource } from '@/models/PointRecord';
import { createError } from '@/middleware/errorHandler';
import { BusinessLogger } from '@/utils/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse } from '@/types';
import { cache } from '@/config/redis';

/**
 * 支付控制器
 */
export class PaymentController {
  /**
   * 创建支付订单
   */
  static createPayment = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { orderId, paymentMethod, pointsToUse = 0 } = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 获取订单信息
    const order = await Order.findById(orderId);
    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    if (order.userId.toString() !== userId) {
      throw createError.forbidden('只能支付自己的订单', 'INSUFFICIENT_PERMISSIONS');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw createError.badRequest('订单状态不正确', 'INVALID_ORDER_STATUS');
    }

    if (order.isExpired()) {
      throw createError.badRequest('订单已过期', 'ORDER_EXPIRED');
    }

    // 获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      throw createError.notFound('用户不存在', 'USER_NOT_FOUND');
    }

    // 计算实际支付金额
    let actualAmount = order.actualAmount;
    let usedPoints = 0;

    // 处理积分抵扣
    if (pointsToUse > 0) {
      const userPoints = await PointRecord.getUserBalance(userId);
      if (pointsToUse > userPoints) {
        throw createError.badRequest('积分余额不足', 'INSUFFICIENT_POINTS');
      }

      // 积分抵扣比例：100积分=1元，最多抵扣订单金额的50%
      const maxPointsDiscount = Math.floor(actualAmount * 0.5 * 100);
      const pointsDiscount = Math.min(pointsToUse, maxPointsDiscount);
      const discountAmount = pointsDiscount / 100;

      actualAmount = Math.max(0.01, actualAmount - discountAmount); // 最低支付0.01元
      usedPoints = pointsDiscount;
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 扣除积分
        if (usedPoints > 0) {
          await PointRecord.createUseRecord(
            userId,
            usedPoints,
            orderId,
            `订单支付积分抵扣 - ${order.orderNumber}`
          );
        }

        let paymentResult;

        // 根据支付方式处理
        switch (paymentMethod) {
          case PaymentMethod.WECHAT:
            paymentResult = await this.createWechatPayment(order, actualAmount);
            break;
          case PaymentMethod.ALIPAY:
            paymentResult = await this.createAlipayPayment(order, actualAmount);
            break;
          case PaymentMethod.BALANCE:
            paymentResult = await this.processBalancePayment(user, order, actualAmount);
            break;
          default:
            throw createError.badRequest('不支持的支付方式', 'UNSUPPORTED_PAYMENT_METHOD');
        }

        // 更新订单支付信息
        order.paymentInfo = {
          method: paymentMethod,
          amount: actualAmount,
          ...(paymentResult.transactionId && { transactionId: paymentResult.transactionId })
        };

        // 如果是余额支付，直接标记为已支付
        if (paymentMethod === PaymentMethod.BALANCE) {
          order.status = OrderStatus.PAID;
          order.paymentInfo.paidAt = new Date();
        }

        order.discount = (order.discount || 0) + (order.actualAmount - actualAmount);
        order.actualAmount = actualAmount;
        
        await order.save({ session });

        // 记录业务日志
        BusinessLogger.info('创建支付', {
          userId,
          orderId,
          paymentMethod,
          originalAmount: order.totalAmount,
          actualAmount,
          usedPoints,
          transactionId: paymentResult.transactionId
        });

        res.status(201).json({
          success: true,
          message: paymentMethod === PaymentMethod.BALANCE ? '支付成功' : '支付订单创建成功',
          data: {
            orderId,
            paymentMethod,
            actualAmount,
            usedPoints: usedPoints > 0 ? usedPoints : undefined,
            ...paymentResult
          }
        });
      });
    } finally {
      await session.endSession();
    }
  });

  /**
   * 微信支付
   */
  private static async createWechatPayment(order: any, amount: number): Promise<any> {
    // 这里应该调用微信支付API
    // 为了演示，返回模拟数据
    const transactionId = `wx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 模拟微信支付参数
    const paymentParams = {
      appId: process.env.WECHAT_APP_ID,
      timeStamp: Math.floor(Date.now() / 1000).toString(),
      nonceStr: Math.random().toString(36).substr(2, 15),
      packageValue: `prepay_id=${transactionId}`,
      signType: 'RSA',
    };

    // 生成签名（这里是模拟）
    const signStr = `${paymentParams.appId}\n${paymentParams.timeStamp}\n${paymentParams.nonceStr}\n${paymentParams.packageValue}\n`;
    paymentParams.paySign = crypto.createHash('sha256').update(signStr).digest('hex');

    // 缓存支付信息，用于回调验证
    await cache.setex(
      `payment:${transactionId}`,
      1800, // 30分钟
      JSON.stringify({
        orderId: order._id,
        amount,
        method: 'wechat'
      })
    );

    return {
      transactionId,
      paymentParams,
      qrCode: `weixin://wxpay/bizpayurl?pr=${transactionId}` // 二维码支付链接
    };
  }

  /**
   * 支付宝支付
   */
  private static async createAlipayPayment(order: any, amount: number): Promise<any> {
    // 这里应该调用支付宝API
    // 为了演示，返回模拟数据
    const transactionId = `ali_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 缓存支付信息
    await cache.setex(
      `payment:${transactionId}`,
      1800,
      JSON.stringify({
        orderId: order._id,
        amount,
        method: 'alipay'
      })
    );

    return {
      transactionId,
      paymentUrl: `https://qr.alipay.com/${transactionId}` // 支付链接
    };
  }

  /**
   * 余额支付
   */
  private static async processBalancePayment(user: any, order: any, amount: number): Promise<any> {
    if (user.balance < amount) {
      throw createError.badRequest('余额不足', 'INSUFFICIENT_BALANCE');
    }

    // 扣除用户余额
    const success = await user.deductBalance(amount);
    if (!success) {
      throw createError.badRequest('扣款失败', 'DEDUCTION_FAILED');
    }

    const transactionId = `bal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      transactionId,
      message: '余额支付成功'
    };
  }

  /**
   * 支付回调处理
   */
  static handlePaymentCallback = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { transactionId, status, amount } = req.body;

    // 从缓存获取支付信息
    const paymentInfo = await cache.get(`payment:${transactionId}`);
    if (!paymentInfo) {
      throw createError.notFound('支付信息不存在', 'PAYMENT_NOT_FOUND');
    }

    const payment = JSON.parse(paymentInfo);
    
    // 验证金额
    if (Number(amount) !== payment.amount) {
      throw createError.badRequest('支付金额不匹配', 'AMOUNT_MISMATCH');
    }

    const order = await Order.findById(payment.orderId);
    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    if (order.status !== OrderStatus.PENDING) {
      // 重复回调，返回成功
      return res.json({ success: true, message: '订单已处理' });
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        if (status === 'success') {
          // 支付成功
          order.status = OrderStatus.PAID;
          order.paymentInfo.paidAt = new Date();
          order.paymentInfo.transactionId = transactionId;
          
          await order.save({ session });

          // 发放消费积分
          const user = await User.findById(order.userId);
          if (user) {
            const pointsRate = user.vipLevel > 0 ? 0.1 : 0.05; // VIP用户翻倍
            const earnedPoints = Math.floor(order.actualAmount * pointsRate);
            
            if (earnedPoints > 0) {
              await PointRecord.createEarnRecord(
                order.userId.toString(),
                earnedPoints,
                PointSource.ORDER,
                `订单支付返积分 - ${order.orderNumber}`,
                { orderId: order._id }
              );
            }
          }

          // 清除缓存
          await cache.del(`payment:${transactionId}`);

          // 记录业务日志
          BusinessLogger.info('支付成功', {
            orderId: order._id,
            transactionId,
            amount: order.actualAmount,
            paymentMethod: payment.method
          });
        } else {
          // 支付失败
          order.status = OrderStatus.CANCELLED;
          await order.save({ session });

          // 退回积分（如果有使用）
          const pointRecords = await PointRecord.find({
            orderId: order._id,
            type: PointType.USE
          });

          for (const record of pointRecords) {
            await PointRecord.createEarnRecord(
              record.userId.toString(),
              Math.abs(record.amount),
              PointSource.REFUND,
              `支付失败积分退回 - ${order.orderNumber}`,
              { originalRecordId: record._id }
            );
          }

          BusinessLogger.info('支付失败', {
            orderId: order._id,
            transactionId,
            reason: 'Payment failed'
          });
        }
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: status === 'success' ? '支付成功' : '支付失败'
    });
  });

  /**
   * 查询支付状态
   */
  static getPaymentStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { orderId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    if (order.userId.toString() !== userId) {
      throw createError.forbidden('只能查询自己的订单', 'INSUFFICIENT_PERMISSIONS');
    }

    const paymentStatus = {
      orderId,
      orderStatus: order.status,
      paymentMethod: order.paymentInfo?.method,
      amount: order.actualAmount,
      paidAt: order.paymentInfo?.paidAt,
      transactionId: order.paymentInfo?.transactionId
    };

    res.json({
      success: true,
      data: paymentStatus
    });
  });

  /**
   * 申请退款
   */
  static requestRefund = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { orderId } = req.params;
    const { reason, amount } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw createError.notFound('订单不存在', 'ORDER_NOT_FOUND');
    }

    if (order.userId.toString() !== userId) {
      throw createError.forbidden('只能申请自己订单的退款', 'INSUFFICIENT_PERMISSIONS');
    }

    if (!order.paymentInfo?.paidAt) {
      throw createError.badRequest('订单未支付，无法退款', 'ORDER_NOT_PAID');
    }

    if (order.status === OrderStatus.REFUNDED) {
      throw createError.badRequest('订单已退款', 'ALREADY_REFUNDED');
    }

    const refundAmount = amount || order.actualAmount;
    if (refundAmount > order.actualAmount) {
      throw createError.badRequest('退款金额不能超过实付金额', 'INVALID_REFUND_AMOUNT');
    }

    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 处理退款
        if (order.paymentInfo?.method === PaymentMethod.BALANCE) {
          // 余额支付直接退回余额
          const user = await User.findById(userId);
          if (user) {
            await user.addBalance(refundAmount);
          }
        } else {
          // 第三方支付需要调用退款API（这里是模拟）
          const refundId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // 实际应用中应该调用微信/支付宝退款API
          BusinessLogger.info('发起退款', {
            orderId,
            refundId,
            amount: refundAmount,
            originalTransactionId: order.paymentInfo?.transactionId
          });
        }

        // 更新订单状态
        order.status = OrderStatus.REFUNDED;
        order.specialRequests = (order.specialRequests || '') + `\n退款原因: ${reason}`;
        
        await order.save({ session });

        // 记录业务日志
        BusinessLogger.info('申请退款', {
          orderId,
          userId,
          refundAmount,
          reason
        });
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: '退款申请已提交，预计1-3个工作日到账',
      data: {
        orderId,
        refundAmount,
        estimatedTime: '1-3个工作日'
      }
    });
  });

  /**
   * 获取支付方式列表
   */
  static getPaymentMethods = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw createError.notFound('用户不存在', 'USER_NOT_FOUND');
    }

    const userPoints = await PointRecord.getUserBalance(userId);

    const paymentMethods = [
      {
        type: 'wechat',
        name: '微信支付',
        icon: 'wechat-pay',
        available: true,
        description: '使用微信支付，快捷安全'
      },
      {
        type: 'alipay',
        name: '支付宝',
        icon: 'alipay',
        available: true,
        description: '支付宝支付，便民服务'
      },
      {
        type: 'balance',
        name: '余额支付',
        icon: 'wallet',
        available: user.balance > 0,
        balance: user.balance,
        description: `当前余额：¥${user.balance.toFixed(2)}`
      }
    ];

    res.json({
      success: true,
      data: {
        paymentMethods,
        userInfo: {
          balance: user.balance,
          points: userPoints,
          vipLevel: user.vipLevel
        }
      }
    });
  });

  /**
   * 充值余额
   */
  static rechargeBalance = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { amount, paymentMethod } = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    if (amount < 1 || amount > 10000) {
      throw createError.badRequest('充值金额必须在1-10000元之间', 'INVALID_RECHARGE_AMOUNT');
    }

    // 创建充值订单
    const rechargeOrder = {
      userId,
      type: 'recharge',
      amount,
      orderNumber: `R${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      createdAt: new Date()
    };

    let paymentResult;

    // 根据支付方式创建支付
    switch (paymentMethod) {
      case PaymentMethod.WECHAT:
        paymentResult = await this.createWechatRecharge(rechargeOrder);
        break;
      case PaymentMethod.ALIPAY:
        paymentResult = await this.createAlipayRecharge(rechargeOrder);
        break;
      default:
        throw createError.badRequest('不支持的支付方式', 'UNSUPPORTED_PAYMENT_METHOD');
    }

    // 记录业务日志
    BusinessLogger.info('发起充值', {
      userId,
      amount,
      paymentMethod,
      orderNumber: rechargeOrder.orderNumber
    });

    res.status(201).json({
      success: true,
      message: '充值订单创建成功',
      data: {
        orderNumber: rechargeOrder.orderNumber,
        amount,
        ...paymentResult
      }
    });
  });

  /**
   * 微信充值
   */
  private static async createWechatRecharge(rechargeOrder: any): Promise<any> {
    const transactionId = `wxr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 缓存充值信息
    await cache.setex(
      `recharge:${transactionId}`,
      1800,
      JSON.stringify(rechargeOrder)
    );

    return {
      transactionId,
      qrCode: `weixin://wxpay/bizpayurl?pr=${transactionId}`
    };
  }

  /**
   * 支付宝充值
   */
  private static async createAlipayRecharge(rechargeOrder: any): Promise<any> {
    const transactionId = `alir_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 缓存充值信息
    await cache.setex(
      `recharge:${transactionId}`,
      1800,
      JSON.stringify(rechargeOrder)
    );

    return {
      transactionId,
      paymentUrl: `https://qr.alipay.com/${transactionId}`
    };
  }

  /**
   * 充值回调处理
   */
  static handleRechargeCallback = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { transactionId, status, amount } = req.body;

    const rechargeInfo = await cache.get(`recharge:${transactionId}`);
    if (!rechargeInfo) {
      throw createError.notFound('充值信息不存在', 'RECHARGE_NOT_FOUND');
    }

    const recharge = JSON.parse(rechargeInfo);
    
    if (Number(amount) !== recharge.amount) {
      throw createError.badRequest('充值金额不匹配', 'AMOUNT_MISMATCH');
    }

    if (status === 'success') {
      const user = await User.findById(recharge.userId);
      if (user) {
        await user.addBalance(recharge.amount);
        
        // 清除缓存
        await cache.del(`recharge:${transactionId}`);

        BusinessLogger.info('充值成功', {
          userId: recharge.userId,
          amount: recharge.amount,
          transactionId,
          orderNumber: recharge.orderNumber
        });
      }
    }

    res.json({
      success: true,
      message: status === 'success' ? '充值成功' : '充值失败'
    });
  });
}
