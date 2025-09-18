import express from 'express';
import { BookingController } from '@/controllers/BookingController';
import { authenticate, requireUserType } from '@/middleware/auth';
import { apiLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validation';
import { bookingValidation } from '@/middleware/validation';

const router = express.Router();

/**
 * 用户预订相关路由
 */

// 创建预订 - 需要登录
router.post(
  '/create',
  apiLimiter,
  authenticate,
  validate(bookingValidation.createBooking),
  BookingController.createBooking
);

// 取消预订 - 需要登录
router.post(
  '/:orderId/cancel',
  apiLimiter,
  authenticate,
  validate(bookingValidation.cancelBooking),
  BookingController.cancelBooking
);

// 获取用户预订列表 - 需要登录
router.get(
  '/my-bookings',
  apiLimiter,
  authenticate,
  BookingController.getUserBookings
);

// 获取预订详情 - 需要登录
router.get(
  '/:orderId',
  apiLimiter,
  authenticate,
  BookingController.getBookingDetail
);

/**
 * 商户预订管理相关路由
 */

// 核销预订 - 需要商户权限
router.post(
  '/verify',
  apiLimiter,
  authenticate,
  requireUserType(['merchant', 'admin']),
  validate(bookingValidation.verifyBooking),
  BookingController.verifyBooking
);

// 获取商户预订列表 - 需要商户权限
router.get(
  '/merchant/bookings',
  apiLimiter,
  authenticate,
  requireUserType(['merchant', 'admin']),
  BookingController.getMerchantBookings
);

export default router;
