import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { 
  validateUserRegister,
  validateUserLogin,
  validateSmsCode,
  validatePasswordReset,
  validate
} from '@/middleware/validation';
import { 
  authRateLimit,
  smsRateLimit,
  strictRateLimit
} from '@/middleware/rateLimiter';
import { authMiddleware, optionalAuthMiddleware } from '@/middleware/auth';
import Joi from 'joi';
import { CommonValidations } from '@/middleware/validation';

const router = Router();

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post(
  '/register',
  authRateLimit,
  validateUserRegister,
  AuthController.register
);

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post(
  '/login',
  authRateLimit,
  validateUserLogin,
  AuthController.login
);

/**
 * 刷新Token
 * POST /api/auth/refresh
 */
router.post(
  '/refresh',
  strictRateLimit,
  validate({
    body: Joi.object({
      refreshToken: Joi.string().required().messages({
        'any.required': '刷新Token不能为空',
      }),
    }),
  }),
  AuthController.refreshToken
);

/**
 * 退出登录
 * POST /api/auth/logout
 */
router.post(
  '/logout',
  optionalAuthMiddleware,
  AuthController.logout
);

/**
 * 发送短信验证码
 * POST /api/auth/sms/send
 */
router.post(
  '/sms/send',
  smsRateLimit.perMinute,
  smsRateLimit.perDay,
  validateSmsCode,
  AuthController.sendSmsCode
);

/**
 * 验证短信验证码
 * POST /api/auth/sms/verify
 */
router.post(
  '/sms/verify',
  strictRateLimit,
  validate({
    body: Joi.object({
      phone: CommonValidations.phone,
      code: CommonValidations.verificationCode,
      type: Joi.string().valid('register', 'login', 'reset_password', 'change_phone').required(),
    }),
  }),
  AuthController.verifySmsCode
);

/**
 * 重置密码
 * POST /api/auth/reset-password
 */
router.post(
  '/reset-password',
  authRateLimit,
  validatePasswordReset,
  AuthController.resetPassword
);

/**
 * 获取当前用户信息
 * GET /api/auth/profile
 */
router.get(
  '/profile',
  authMiddleware,
  AuthController.getProfile
);

/**
 * 更新用户信息
 * PUT /api/auth/profile
 */
router.put(
  '/profile',
  authMiddleware,
  validate({
    body: Joi.object({
      nickname: Joi.string().min(1).max(20).optional(),
      avatar: Joi.string().uri().optional(),
      location: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).optional(),
        address: Joi.string().max(200).optional(),
      }).optional(),
    }),
  }),
  AuthController.updateProfile
);

export default router;
