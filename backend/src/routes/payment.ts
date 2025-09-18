import express from 'express';
import { PaymentController } from '@/controllers/PaymentController';
import { authenticate } from '@/middleware/auth';
import { apiLimiter, paymentLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validation';
import { paymentValidation } from '@/middleware/validation';

const router = express.Router();

/**
 * 支付相关路由
 */

// 创建支付订单 - 需要登录，有支付限流
router.post(
  '/create',
  paymentLimiter,
  authenticate,
  validate(paymentValidation.createPayment),
  PaymentController.createPayment
);

// 支付回调 - 无需认证（第三方回调）
router.post(
  '/callback',
  validate(paymentValidation.paymentCallback),
  PaymentController.handlePaymentCallback
);

// 查询支付状态 - 需要登录
router.get(
  '/status/:orderId',
  apiLimiter,
  authenticate,
  PaymentController.getPaymentStatus
);

// 申请退款 - 需要登录，有支付限流
router.post(
  '/refund/:orderId',
  paymentLimiter,
  authenticate,
  validate(paymentValidation.requestRefund),
  PaymentController.requestRefund
);

// 获取支付方式列表 - 需要登录
router.get(
  '/methods',
  apiLimiter,
  authenticate,
  PaymentController.getPaymentMethods
);

/**
 * 余额充值相关路由
 */

// 充值余额 - 需要登录，有支付限流
router.post(
  '/recharge',
  paymentLimiter,
  authenticate,
  validate(paymentValidation.rechargeBalance),
  PaymentController.rechargeBalance
);

// 充值回调 - 无需认证
router.post(
  '/recharge/callback',
  validate(paymentValidation.rechargeCallback),
  PaymentController.handleRechargeCallback
);

export default router;
