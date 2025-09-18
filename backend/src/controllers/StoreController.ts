import { Request, Response, NextFunction } from 'express';
import { Store } from '@/models/Store';
import { createError } from '@/middleware/errorHandler';
import { BusinessLogger } from '@/utils/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse, PaginatedResponse } from '@/types';
import { StoreCreateParams, StoreUpdateParams, StoreSearchParams } from '@/types/store';

/**
 * 店铺管理控制器
 */
export class StoreController {
  /**
   * 创建店铺
   */
  static createStore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const storeData: StoreCreateParams = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    // 检查用户权限（只有商户或管理员可以创建店铺）
    if (req.user?.userType !== 'merchant' && req.user?.userType !== 'admin') {
      throw createError.forbidden('只有商户可以创建店铺', 'INSUFFICIENT_PERMISSIONS');
    }

    // 检查用户是否已经有店铺（普通商户只能有一个店铺）
    if (req.user?.userType === 'merchant') {
      const existingStore = await Store.findByOwner(userId);
      if (existingStore.length > 0) {
        throw createError.conflict('您已经拥有一个店铺', 'STORE_ALREADY_EXISTS');
      }
    }

    // 创建店铺
    const store = new Store({
      ...storeData,
      ownerId: userId,
      location: {
        type: 'Point',
        coordinates: [storeData.longitude, storeData.latitude]
      },
      status: 'pending', // 新创建的店铺需要审核
    });

    await store.save();

    // 记录业务日志
    BusinessLogger.userAction(userId, 'STORE_CREATE', {
      storeId: store._id,
      storeName: store.name,
      address: store.address,
    });

    const response: ApiResponse = {
      success: true,
      message: '店铺创建成功，等待审核',
      data: {
        id: store._id,
        name: store.name,
        status: store.status,
        createdAt: store.createdAt,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  });

  /**
   * 获取店铺列表
   */
  static getStores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const {
      page = 1,
      limit = 20,
      keyword,
      category,
      tags,
      priceMin,
      priceMax,
      rating,
      longitude,
      latitude,
      radius = 5,
      sortBy = 'distance',
      sortOrder = 'asc'
    } = req.query as any;

    let query: any = { status: 'active', isVerified: true };
    let sort: any = {};

    // 关键词搜索
    if (keyword) {
      query.$text = { $search: keyword };
    }

    // 分类筛选
    if (category) {
      query.tags = { $in: [category] };
    }

    // 标签筛选
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // 价格范围筛选
    if (priceMin || priceMax) {
      query['priceRange.min'] = {};
      if (priceMin) query['priceRange.min'].$gte = parseFloat(priceMin);
      if (priceMax) query['priceRange.max'] = { $lte: parseFloat(priceMax) };
    }

    // 评分筛选
    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }

    // 地理位置查询
    if (longitude && latitude) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseFloat(radius) * 1000 // 转换为米
        }
      };
    }

    // 排序
    switch (sortBy) {
      case 'rating':
        sort = { rating: sortOrder === 'desc' ? -1 : 1, reviewCount: -1 };
        break;
      case 'price':
        sort = { 'priceRange.min': sortOrder === 'desc' ? -1 : 1 };
        break;
      case 'popularity':
        sort = { reviewCount: -1, rating: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      default:
        if (longitude && latitude) {
          // 按距离排序（已通过$near实现）
          sort = { rating: -1 };
        } else {
          sort = { rating: -1, reviewCount: -1 };
        }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [stores, total] = await Promise.all([
      Store.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('ownerId', 'nickname phone')
        .lean(),
      Store.countDocuments(query)
    ]);

    // 如果有地理位置，计算距离
    if (longitude && latitude) {
      stores.forEach((store: any) => {
        if (store.location?.coordinates) {
          const [storeLng, storeLat] = store.location.coordinates;
          store.distance = calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            storeLat,
            storeLng
          );
        }
      });
    }

    const response: PaginatedResponse = {
      success: true,
      message: '获取店铺列表成功',
      data: stores,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 获取店铺详情
   */
  static getStoreById = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const store = await Store.findById(id)
      .populate('ownerId', 'nickname phone')
      .lean();

    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    // 如果店铺未激活且当前用户不是店主或管理员，则不允许查看
    if (store.status !== 'active' && 
        req.user?.id !== store.ownerId.toString() && 
        req.user?.userType !== 'admin') {
      throw createError.forbidden('店铺暂不可用', 'STORE_UNAVAILABLE');
    }

    const response: ApiResponse = {
      success: true,
      message: '获取店铺详情成功',
      data: store,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 更新店铺信息
   */
  static updateStore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;
    const updateData: StoreUpdateParams = req.body;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const store = await Store.findById(id);
    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    // 检查权限：只有店主或管理员可以更新
    if (store.ownerId.toString() !== userId && req.user?.userType !== 'admin') {
      throw createError.forbidden('无权修改此店铺', 'INSUFFICIENT_PERMISSIONS');
    }

    // 更新地理位置
    if (updateData.latitude && updateData.longitude) {
      updateData.location = {
        type: 'Point',
        coordinates: [updateData.longitude, updateData.latitude]
      };
      delete updateData.latitude;
      delete updateData.longitude;
    }

    // 如果是非管理员用户修改重要信息，需要重新审核
    const sensitiveFields = ['name', 'address', 'phone', 'licenseNumber'];
    const hasSensitiveChanges = sensitiveFields.some(field => updateData[field] !== undefined);
    
    if (hasSensitiveChanges && req.user?.userType !== 'admin') {
      updateData.status = 'pending';
      updateData.isVerified = false;
    }

    Object.assign(store, updateData);
    await store.save();

    // 记录业务日志
    BusinessLogger.userAction(userId, 'STORE_UPDATE', {
      storeId: store._id,
      changes: Object.keys(updateData),
      requiresReview: hasSensitiveChanges && req.user?.userType !== 'admin',
    });

    const response: ApiResponse = {
      success: true,
      message: hasSensitiveChanges && req.user?.userType !== 'admin' 
        ? '店铺信息已更新，等待重新审核' 
        : '店铺信息更新成功',
      data: {
        id: store._id,
        name: store.name,
        status: store.status,
        isVerified: store.isVerified,
        updatedAt: store.updatedAt,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 删除店铺
   */
  static deleteStore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const store = await Store.findById(id);
    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    // 检查权限：只有店主或管理员可以删除
    if (store.ownerId.toString() !== userId && req.user?.userType !== 'admin') {
      throw createError.forbidden('无权删除此店铺', 'INSUFFICIENT_PERMISSIONS');
    }

    // 软删除：将状态设为inactive
    store.status = 'inactive';
    await store.save();

    // 记录业务日志
    BusinessLogger.userAction(userId, 'STORE_DELETE', {
      storeId: store._id,
      storeName: store.name,
    });

    const response: ApiResponse = {
      success: true,
      message: '店铺已删除',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 获取我的店铺
   */
  static getMyStores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw createError.unauthorized('需要登录', 'NOT_AUTHENTICATED');
    }

    const stores = await Store.findByOwner(userId);

    const response: ApiResponse = {
      success: true,
      message: '获取我的店铺成功',
      data: stores,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 审核店铺
   */
  static reviewStore = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, reason } = req.body;
    const userId = req.user?.id;

    if (!userId || req.user?.userType !== 'admin') {
      throw createError.forbidden('只有管理员可以审核店铺', 'INSUFFICIENT_PERMISSIONS');
    }

    const store = await Store.findById(id);
    if (!store) {
      throw createError.notFound('店铺不存在', 'STORE_NOT_FOUND');
    }

    if (!['active', 'suspended'].includes(status)) {
      throw createError.badRequest('无效的审核状态', 'INVALID_STATUS');
    }

    store.status = status;
    if (status === 'active') {
      store.isVerified = true;
      store.verifiedAt = new Date();
    }

    await store.save();

    // 记录业务日志
    BusinessLogger.userAction(userId, 'STORE_REVIEW', {
      storeId: store._id,
      newStatus: status,
      reason,
    });

    const response: ApiResponse = {
      success: true,
      message: `店铺审核${status === 'active' ? '通过' : '未通过'}`,
      data: {
        id: store._id,
        status: store.status,
        isVerified: store.isVerified,
        verifiedAt: store.verifiedAt,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 获取附近店铺
   */
  static getNearbyStores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { longitude, latitude, radius = 5, limit = 20 } = req.query as any;

    if (!longitude || !latitude) {
      throw createError.badRequest('缺少地理位置信息', 'MISSING_LOCATION');
    }

    const stores = await Store.findNearby(
      parseFloat(longitude),
      parseFloat(latitude),
      parseFloat(radius) * 1000
    ).limit(parseInt(limit));

    // 计算距离
    stores.forEach((store: any) => {
      if (store.location?.coordinates) {
        const [storeLng, storeLat] = store.location.coordinates;
        store.distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          storeLat,
          storeLng
        );
      }
    });

    const response: ApiResponse = {
      success: true,
      message: '获取附近店铺成功',
      data: stores,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 搜索店铺
   */
  static searchStores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { keyword, filters = {} } = req.body;

    if (!keyword || keyword.trim().length < 2) {
      throw createError.badRequest('搜索关键词至少2个字符', 'INVALID_KEYWORD');
    }

    const stores = await Store.search(keyword.trim(), filters);

    const response: ApiResponse = {
      success: true,
      message: '搜索店铺成功',
      data: stores,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });

  /**
   * 获取热门店铺
   */
  static getTopRatedStores = catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { limit = 10 } = req.query;

    const stores = await Store.getTopRated(parseInt(limit as string));

    const response: ApiResponse = {
      success: true,
      message: '获取热门店铺成功',
      data: stores,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  });
}

/**
 * 计算两点间距离（公里）
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c * 100) / 100; // 保留两位小数
}


