import express from 'express';
import { DishController } from '@/controllers/DishController';
import { authenticate, requireUserType } from '@/middleware/auth';
import { apiLimiter } from '@/middleware/rateLimiter';
import { validate } from '@/middleware/validation';
import { dishValidation } from '@/middleware/validation';

const router = express.Router();

/**
 * 公开路由 - 用户查看菜品
 */

// 获取店铺菜品列表
router.get(
  '/store/:storeId',
  apiLimiter,
  DishController.getStoreDishes
);

// 获取菜品详情
router.get(
  '/:dishId',
  apiLimiter,
  DishController.getDishDetail
);

// 获取店铺分类列表
router.get(
  '/store/:storeId/categories',
  apiLimiter,
  DishController.getCategories
);

// 获取热销菜品
router.get(
  '/store/:storeId/popular',
  apiLimiter,
  DishController.getPopularDishes
);

// 搜索菜品
router.get(
  '/search',
  apiLimiter,
  DishController.searchDishes
);

/**
 * 商户管理路由 - 需要商户权限
 */

// 创建菜品
router.post(
  '/',
  apiLimiter,
  authenticate,
  requireUserType(['merchant', 'admin']),
  validate(dishValidation.createDish),
  DishController.createDish
);

// 更新菜品
router.put(
  '/:dishId',
  apiLimiter,
  authenticate,
  requireUserType(['merchant', 'admin']),
  validate(dishValidation.updateDish),
  DishController.updateDish
);

// 删除菜品
router.delete(
  '/:dishId',
  apiLimiter,
  authenticate,
  requireUserType(['merchant', 'admin']),
  DishController.deleteDish
);

// 批量更新菜品状态
router.patch(
  '/batch/status',
  apiLimiter,
  authenticate,
  requireUserType(['merchant', 'admin']),
  validate(dishValidation.batchUpdateStatus),
  DishController.batchUpdateStatus
);

// 更新菜品库存
router.patch(
  '/:dishId/stock',
  apiLimiter,
  authenticate,
  requireUserType(['merchant', 'admin']),
  validate(dishValidation.updateStock),
  DishController.updateStock
);

export default router;
