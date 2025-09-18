import { Router } from 'express';
import { StoreController } from '@/controllers/StoreController';
import {
  validateStoreCreate,
  validateId,
  validatePagination,
  validateLocationSearch,
  validate
} from '@/middleware/validation';
import {
  generalRateLimit,
  strictRateLimit
} from '@/middleware/rateLimiter';
import { 
  authMiddleware, 
  requireUserType, 
  requireStoreOwnership,
  optionalAuthMiddleware 
} from '@/middleware/auth';
import Joi from 'joi';
import { CommonValidations } from '@/middleware/validation';

const router = Router();

/**
 * 创建店铺
 * POST /api/stores
 */
router.post(
  '/',
  authMiddleware,
  requireUserType(['merchant', 'admin']),
  generalRateLimit,
  validateStoreCreate,
  StoreController.createStore
);

/**
 * 获取店铺列表（公开接口）
 * GET /api/stores
 */
router.get(
  '/',
  optionalAuthMiddleware,
  generalRateLimit,
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      keyword: Joi.string().min(1).max(50).optional(),
      category: Joi.string().max(20).optional(),
      tags: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
      ).optional(),
      priceMin: Joi.number().min(0).optional(),
      priceMax: Joi.number().min(0).optional(),
      rating: Joi.number().min(1).max(5).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
      latitude: Joi.number().min(-90).max(90).optional(),
      radius: Joi.number().min(0.1).max(50).default(5).optional(),
      sortBy: Joi.string().valid('distance', 'rating', 'price', 'popularity', 'newest').default('distance'),
      sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    }),
  }),
  StoreController.getStores
);

/**
 * 获取店铺详情（公开接口）
 * GET /api/stores/:id
 */
router.get(
  '/:id',
  optionalAuthMiddleware,
  generalRateLimit,
  validateId,
  StoreController.getStoreById
);

/**
 * 更新店铺信息
 * PUT /api/stores/:id
 */
router.put(
  '/:id',
  authMiddleware,
  requireStoreOwnership,
  generalRateLimit,
  validateId,
  validate({
    body: Joi.object({
      name: Joi.string().min(2).max(50).optional(),
      description: Joi.string().max(500).optional(),
      phone: CommonValidations.phone.optional(),
      address: Joi.string().min(5).max(200).optional(),
      latitude: CommonValidations.coordinates.latitude.optional(),
      longitude: CommonValidations.coordinates.longitude.optional(),
      businessHours: Joi.object({
        open: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        close: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        isClosed: Joi.boolean().optional(),
      }).optional(),
      images: Joi.array().items(Joi.string().uri()).max(10).optional(),
      tags: Joi.array().items(Joi.string()).max(20).optional(),
      amenities: Joi.array().items(Joi.string()).optional(),
      features: Joi.array().items(Joi.string()).optional(),
      priceRange: Joi.object({
        min: Joi.number().min(0).optional(),
        max: Joi.number().min(0).optional(),
      }).optional(),
      capacity: Joi.number().integer().min(1).optional(),
    }),
  }),
  StoreController.updateStore
);

/**
 * 删除店铺
 * DELETE /api/stores/:id
 */
router.delete(
  '/:id',
  authMiddleware,
  requireStoreOwnership,
  strictRateLimit,
  validateId,
  StoreController.deleteStore
);

/**
 * 获取我的店铺
 * GET /api/stores/my/list
 */
router.get(
  '/my/list',
  authMiddleware,
  requireUserType(['merchant', 'admin']),
  generalRateLimit,
  StoreController.getMyStores
);

/**
 * 审核店铺（管理员）
 * PATCH /api/stores/:id/review
 */
router.patch(
  '/:id/review',
  authMiddleware,
  requireUserType(['admin']),
  strictRateLimit,
  validateId,
  validate({
    body: Joi.object({
      status: Joi.string().valid('active', 'suspended').required(),
      reason: Joi.string().max(200).optional(),
    }),
  }),
  StoreController.reviewStore
);

/**
 * 获取附近店铺
 * GET /api/stores/nearby/search
 */
router.get(
  '/nearby/search',
  optionalAuthMiddleware,
  generalRateLimit,
  validate({
    query: Joi.object({
      longitude: CommonValidations.coordinates.longitude,
      latitude: CommonValidations.coordinates.latitude,
      radius: Joi.number().min(0.1).max(50).default(5),
      limit: Joi.number().integer().min(1).max(50).default(20),
    }),
  }),
  StoreController.getNearbyStores
);

/**
 * 搜索店铺
 * POST /api/stores/search
 */
router.post(
  '/search',
  optionalAuthMiddleware,
  generalRateLimit,
  validate({
    body: Joi.object({
      keyword: Joi.string().min(2).max(50).required(),
      filters: Joi.object({
        category: Joi.string().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        priceMin: Joi.number().min(0).optional(),
        priceMax: Joi.number().min(0).optional(),
        rating: Joi.number().min(1).max(5).optional(),
        location: Joi.object({
          longitude: CommonValidations.coordinates.longitude,
          latitude: CommonValidations.coordinates.latitude,
          radius: Joi.number().min(0.1).max(50).default(5),
        }).optional(),
      }).optional(),
    }),
  }),
  StoreController.searchStores
);

/**
 * 获取热门店铺
 * GET /api/stores/top/rated
 */
router.get(
  '/top/rated',
  optionalAuthMiddleware,
  generalRateLimit,
  validate({
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10),
    }),
  }),
  StoreController.getTopRatedStores
);

export default router;


