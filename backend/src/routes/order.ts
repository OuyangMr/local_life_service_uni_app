import { Router } from 'express';
import { OrderController } from '@/controllers/OrderController';
import {
  validateOrderCreate,
  validateId,
  validatePagination,
  validate
} from '@/middleware/validation';
import {
  generalRateLimit,
  strictRateLimit,
  paymentRateLimit
} from '@/middleware/rateLimiter';
import { 
  authMiddleware, 
  requireUserType
} from '@/middleware/auth';
import Joi from 'joi';
import { CommonValidations } from '@/middleware/validation';

const router = Router();

/**
 * 创建订单
 * POST /api/orders
 */
router.post(
  '/',
  authMiddleware,
  generalRateLimit,
  validateOrderCreate,
  OrderController.createOrder
);

/**
 * 获取订单列表
 * GET /api/orders
 */
router.get(
  '/',
  authMiddleware,
  generalRateLimit,
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      status: Joi.string().valid('pending', 'paid', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded').optional(),
      type: Joi.string().valid('room_booking', 'food_order', 'combo').optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      storeId: CommonValidations.id.optional(),
      sortBy: Joi.string().valid('createdAt', 'totalAmount', 'status').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    }),
  }),
  OrderController.getOrders
);

/**
 * 获取订单详情
 * GET /api/orders/:id
 */
router.get(
  '/:id',
  authMiddleware,
  generalRateLimit,
  validateId,
  OrderController.getOrderById
);

/**
 * 更新订单状态
 * PATCH /api/orders/:id/status
 */
router.patch(
  '/:id/status',
  authMiddleware,
  strictRateLimit,
  validateId,
  validate({
    body: Joi.object({
      status: Joi.string().valid('paid', 'confirmed', 'in_progress', 'completed', 'cancelled').required(),
      reason: Joi.string().max(200).optional(),
    }),
  }),
  OrderController.updateOrderStatus
);

/**
 * 取消订单
 * POST /api/orders/:id/cancel
 */
router.post(
  '/:id/cancel',
  authMiddleware,
  strictRateLimit,
  validateId,
  validate({
    body: Joi.object({
      reason: Joi.string().min(2).max(200).required().messages({
        'string.min': '取消原因至少2个字符',
        'string.max': '取消原因不能超过200个字符',
        'any.required': '请填写取消原因',
      }),
    }),
  }),
  OrderController.cancelOrder
);

/**
 * 获取订单统计（商户和管理员）
 * GET /api/orders/stats/summary
 */
router.get(
  '/stats/summary',
  authMiddleware,
  requireUserType(['merchant', 'admin']),
  generalRateLimit,
  validate({
    query: Joi.object({
      storeId: CommonValidations.id.optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
    }),
  }),
  OrderController.getOrderStats
);

export default router;


