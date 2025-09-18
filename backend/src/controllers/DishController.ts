import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Dish } from '@/models/Dish';
import { Store } from '@/models/Store';
import { createError } from '@/middleware/errorHandler';
import { BusinessLogger } from '@/utils/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse, PaginatedResponse } from '@/types';
import { cache } from '@/config/redis';

/**
 * 菜品管理控制器
 */
export class DishController {
  /**
   * 创建菜品
   */
  static createDish = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const dishData = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 检查商户权限
    if (req.user?.userType !== 'merchant' && req.user?.userType !== 'admin') {
      throw createError.forbidden('只有商户可以创建菜品', 'INSUFFICIENT_PERMISSIONS');
    }

    // 验证店铺存在且属于当前用户
    const store = await Store.findById(dishData.storeId);
    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    if (req.user?.userType === 'merchant' && store.ownerId.toString() !== userId) {
      throw createError.forbidden('只能管理自己的店铺', 'INSUFFICIENT_PERMISSIONS');
    }

    // 检查菜品名称是否重复
    const existingDish = await Dish.findOne({
      storeId: dishData.storeId,
      name: dishData.name,
      isActive: true
    });

    if (existingDish) {
      throw createError.conflict('菜品名称已存在', 'DISH_NAME_EXISTS');
    }

    // 创建菜品
    const dish = new Dish({
      ...dishData,
      rating: 0,
      reviewCount: 0,
      salesCount: 0
    });

    await dish.save();

    // 清除相关缓存
    await cache.del(`dishes:store:${dishData.storeId}`);
    await cache.del(`dishes:category:${dishData.category}`);

    // 记录业务日志
    BusinessLogger.info('创建菜品', {
      dishId: dish._id,
      storeId: dishData.storeId,
      merchantId: userId,
      dishName: dish.name,
      price: dish.price
    });

    res.status(201).json({
      success: true,
      message: '菜品创建成功',
      data: { dish }
    });
  });

  /**
   * 获取店铺菜品列表
   */
  static getStoreDishes = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { storeId } = req.params;
    const { category, page = 1, limit = 20, keyword, sortBy = 'salesCount' } = req.query;

    // 验证店铺存在
    const store = await Store.findById(storeId);
    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    // 构建查询条件
    const query: any = { 
      storeId,
      isActive: true
    };

    if (category) {
      query.category = category;
    }

    if (keyword) {
      query.$text = { $search: keyword as string };
    }

    // 排序条件
    const sortOptions: any = {};
    switch (sortBy) {
      case 'price':
        sortOptions.price = 1;
        break;
      case 'rating':
        sortOptions.rating = -1;
        sortOptions.reviewCount = -1;
        break;
      case 'salesCount':
      default:
        sortOptions.salesCount = -1;
        sortOptions.createdAt = -1;
        break;
    }

    const skip = (Number(page) - 1) * Number(limit);

    // 尝试从缓存获取
    const cacheKey = `dishes:store:${storeId}:${category || 'all'}:${page}:${limit}:${sortBy}`;
    let cached = await cache.get(cacheKey);
    
    if (cached && !keyword) {
      return res.json({
        success: true,
        data: JSON.parse(cached)
      });
    }

    const [dishes, total] = await Promise.all([
      Dish.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Dish.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    const result = {
      dishes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages
      }
    };

    // 缓存结果（5分钟）
    if (!keyword) {
      await cache.setex(cacheKey, 300, JSON.stringify(result));
    }

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * 获取菜品详情
   */
  static getDishDetail = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { dishId } = req.params;

    const dish = await Dish.findById(dishId).populate('storeId', 'name');
    if (!dish) {
      throw createError.notFound('菜品不存在', 'DISH_NOT_FOUND');
    }

    if (!dish.isActive) {
      throw createError.notFound('菜品已下架', 'DISH_UNAVAILABLE');
    }

    res.json({
      success: true,
      data: { dish }
    });
  });

  /**
   * 更新菜品
   */
  static updateDish = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { dishId } = req.params;
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const dish = await Dish.findById(dishId).populate('storeId');
    if (!dish) {
      throw createError.notFound('菜品不存在', 'DISH_NOT_FOUND');
    }

    // 检查权限
    if (req.user?.userType === 'merchant' && dish.storeId.ownerId.toString() !== userId) {
      throw createError.forbidden('只能管理自己店铺的菜品', 'INSUFFICIENT_PERMISSIONS');
    }

    // 如果更新名称，检查是否重复
    if (updateData.name && updateData.name !== dish.name) {
      const existingDish = await Dish.findOne({
        storeId: dish.storeId,
        name: updateData.name,
        isActive: true,
        _id: { $ne: dishId }
      });

      if (existingDish) {
        throw createError.conflict('菜品名称已存在', 'DISH_NAME_EXISTS');
      }
    }

    // 更新菜品
    Object.assign(dish, updateData);
    await dish.save();

    // 清除相关缓存
    await cache.del(`dishes:store:${dish.storeId}`);
    await cache.del(`dishes:category:${dish.category}`);

    // 记录业务日志
    BusinessLogger.info('更新菜品', {
      dishId,
      merchantId: userId,
      updateData: Object.keys(updateData)
    });

    res.json({
      success: true,
      message: '菜品更新成功',
      data: { dish }
    });
  });

  /**
   * 删除菜品（软删除）
   */
  static deleteDish = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { dishId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const dish = await Dish.findById(dishId).populate('storeId');
    if (!dish) {
      throw createError.notFound('菜品不存在', 'DISH_NOT_FOUND');
    }

    // 检查权限
    if (req.user?.userType === 'merchant' && dish.storeId.ownerId.toString() !== userId) {
      throw createError.forbidden('只能管理自己店铺的菜品', 'INSUFFICIENT_PERMISSIONS');
    }

    // 软删除
    dish.isActive = false;
    await dish.save();

    // 清除相关缓存
    await cache.del(`dishes:store:${dish.storeId}`);
    await cache.del(`dishes:category:${dish.category}`);

    // 记录业务日志
    BusinessLogger.info('删除菜品', {
      dishId,
      merchantId: userId,
      dishName: dish.name
    });

    res.json({
      success: true,
      message: '菜品删除成功'
    });
  });

  /**
   * 批量更新菜品状态
   */
  static batchUpdateStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { dishIds, isActive } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    if (!Array.isArray(dishIds) || dishIds.length === 0) {
      throw createError.badRequest('菜品ID列表不能为空', 'INVALID_DISH_IDS');
    }

    // 检查所有菜品是否属于用户的店铺
    const dishes = await Dish.find({ 
      _id: { $in: dishIds } 
    }).populate('storeId');

    if (dishes.length !== dishIds.length) {
      throw createError.notFound('部分菜品不存在', 'DISHES_NOT_FOUND');
    }

    if (req.user?.userType === 'merchant') {
      const unauthorizedDish = dishes.find(dish => 
        dish.storeId.ownerId.toString() !== userId
      );
      
      if (unauthorizedDish) {
        throw createError.forbidden('只能管理自己店铺的菜品', 'INSUFFICIENT_PERMISSIONS');
      }
    }

    // 批量更新
    await Dish.updateMany(
      { _id: { $in: dishIds } },
      { isActive }
    );

    // 清除相关缓存
    const storeIds = [...new Set(dishes.map(dish => dish.storeId._id.toString()))];
    for (const storeId of storeIds) {
      await cache.del(`dishes:store:${storeId}`);
    }

    // 记录业务日志
    BusinessLogger.info('批量更新菜品状态', {
      dishIds,
      isActive,
      merchantId: userId,
      affectedCount: dishes.length
    });

    res.json({
      success: true,
      message: `成功更新${dishes.length}个菜品状态`,
      data: { 
        updatedCount: dishes.length,
        status: isActive ? '上架' : '下架'
      }
    });
  });

  /**
   * 更新菜品库存
   */
  static updateStock = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { dishId } = req.params;
    const { stock } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const dish = await Dish.findById(dishId).populate('storeId');
    if (!dish) {
      throw createError.notFound('菜品不存在', 'DISH_NOT_FOUND');
    }

    // 检查权限
    if (req.user?.userType === 'merchant' && dish.storeId.ownerId.toString() !== userId) {
      throw createError.forbidden('只能管理自己店铺的菜品', 'INSUFFICIENT_PERMISSIONS');
    }

    const oldStock = dish.stock;
    await dish.updateStock(stock - oldStock);

    // 记录业务日志
    BusinessLogger.info('更新菜品库存', {
      dishId,
      merchantId: userId,
      oldStock,
      newStock: dish.stock,
      change: stock - oldStock
    });

    res.json({
      success: true,
      message: '库存更新成功',
      data: { 
        dishId,
        oldStock,
        newStock: dish.stock
      }
    });
  });

  /**
   * 获取菜品分类列表
   */
  static getCategories = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { storeId } = req.params;

    // 验证店铺存在
    const store = await Store.findById(storeId);
    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    // 尝试从缓存获取
    const cacheKey = `categories:store:${storeId}`;
    let cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: { categories: JSON.parse(cached) }
      });
    }

    // 获取该店铺的所有分类
    const categories = await Dish.aggregate([
      { 
        $match: { 
          storeId: new mongoose.Types.ObjectId(storeId),
          isActive: true 
        } 
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          count: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          priceRange: {
            min: '$minPrice',
            max: '$maxPrice'
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 缓存结果（10分钟）
    await cache.setex(cacheKey, 600, JSON.stringify(categories));

    res.json({
      success: true,
      data: { categories }
    });
  });

  /**
   * 获取热销菜品
   */
  static getPopularDishes = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { storeId } = req.params;
    const { limit = 10 } = req.query;

    // 验证店铺存在
    const store = await Store.findById(storeId);
    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    // 尝试从缓存获取
    const cacheKey = `popular:store:${storeId}:${limit}`;
    let cached = await cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        data: { dishes: JSON.parse(cached) }
      });
    }

    const dishes = await Dish.getTopSelling(storeId, Number(limit));

    // 缓存结果（15分钟）
    await cache.setex(cacheKey, 900, JSON.stringify(dishes));

    res.json({
      success: true,
      data: { dishes }
    });
  });

  /**
   * 搜索菜品
   */
  static searchDishes = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { keyword, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

    if (!keyword) {
      throw createError.badRequest('搜索关键词不能为空', 'KEYWORD_REQUIRED');
    }

    // 构建查询条件
    const query: any = {
      isActive: true,
      $text: { $search: keyword as string }
    };

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [dishes, total] = await Promise.all([
      Dish.find(query, { score: { $meta: 'textScore' } })
        .populate('storeId', 'name address')
        .sort({ score: { $meta: 'textScore' }, salesCount: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Dish.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    res.json({
      success: true,
      data: {
        dishes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages
        }
      }
    });
  });
}
