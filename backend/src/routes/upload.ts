import express from 'express';
import path from 'path';
import { UploadController } from '@/controllers/UploadController';
import { authenticate, requireUserType } from '@/middleware/auth';
import { apiLimiter, uploadLimiter } from '@/middleware/rateLimiter';

const router = express.Router();

/**
 * 用户文件上传路由
 */

// 上传头像 - 需要登录
router.post(
  '/avatar',
  uploadLimiter,
  authenticate,
  UploadController.uploadAvatar
);

// 上传评价图片 - 需要登录
router.post(
  '/review-images',
  uploadLimiter,
  authenticate,
  UploadController.uploadReviewImage
);

/**
 * 商户文件上传路由
 */

// 上传店铺图片 - 需要商户权限
router.post(
  '/store-images',
  uploadLimiter,
  authenticate,
  requireUserType(['merchant', 'admin']),
  UploadController.uploadStoreImage
);

// 上传菜品图片 - 需要商户权限
router.post(
  '/dish-images',
  uploadLimiter,
  authenticate,
  requireUserType(['merchant', 'admin']),
  UploadController.uploadDishImage
);

/**
 * 文件管理路由
 */

// 获取文件信息 - 公开访问
router.get(
  '/info/:filename',
  apiLimiter,
  UploadController.getFileInfo
);

// 删除文件 - 需要登录
router.delete(
  '/:filename',
  apiLimiter,
  authenticate,
  UploadController.deleteFile
);

// 获取上传配置 - 需要登录
router.get(
  '/config',
  apiLimiter,
  authenticate,
  UploadController.getUploadConfig
);

/**
 * 管理员路由
 */

// 清理过期文件 - 需要管理员权限
router.post(
  '/cleanup',
  apiLimiter,
  authenticate,
  requireUserType(['admin']),
  UploadController.cleanupExpiredFiles
);

/**
 * 静态文件服务
 */

// 提供上传文件的静态访问
router.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

export default router;
