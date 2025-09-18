import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './errorHandler';
import { logger } from '@/utils/logger';

/**
 * 验证配置接口
 */
interface ValidationConfig {
  body?: Joi.Schema;
  params?: Joi.Schema;
  query?: Joi.Schema;
  headers?: Joi.Schema;
}

/**
 * 常用的验证规则
 */
export const CommonValidations = {
  // 手机号验证
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': '请输入有效的手机号码',
      'any.required': '手机号码不能为空',
    }),

  // 密码验证
  password: Joi.string()
    .min(6)
    .max(20)
    .pattern(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': '密码长度至少6位',
      'string.max': '密码长度不能超过20位',
      'string.pattern.base': '密码必须包含字母和数字',
      'any.required': '密码不能为空',
    }),

  // 验证码验证
  verificationCode: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': '验证码必须是6位数字',
      'string.pattern.base': '验证码必须是6位数字',
      'any.required': '验证码不能为空',
    }),

  // ID验证
  id: Joi.string()
    .pattern(/^[a-fA-F0-9]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'ID格式无效',
      'any.required': 'ID不能为空',
    }),

  // 分页参数验证
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  },

  // 时间验证
  datetime: Joi.date().iso().required().messages({
    'date.format': '时间格式必须是ISO 8601格式',
    'any.required': '时间不能为空',
  }),

  // 坐标验证
  coordinates: {
    latitude: Joi.number().min(-90).max(90).required().messages({
      'number.min': '纬度必须在-90到90之间',
      'number.max': '纬度必须在-90到90之间',
      'any.required': '纬度不能为空',
    }),
    longitude: Joi.number().min(-180).max(180).required().messages({
      'number.min': '经度必须在-180到180之间',
      'number.max': '经度必须在-180到180之间',
      'any.required': '经度不能为空',
    }),
  },

  // 用户类型验证
  userType: Joi.string().valid('user', 'merchant', 'admin').required(),

  // VIP等级验证
  vipLevel: Joi.number().integer().min(0).max(5).default(0),

  // 金额验证（分为单位）
  amount: Joi.number().integer().min(0).required().messages({
    'number.min': '金额不能为负数',
    'any.required': '金额不能为空',
  }),

  // 状态验证
  status: Joi.string().valid('active', 'inactive', 'pending', 'cancelled').required(),
};

/**
 * 验证中间件工厂函数
 */
export const validate = (config: ValidationConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    try {
      // 验证请求体
      if (config.body) {
        const { error, value } = config.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        } else {
          req.body = value;
        }
      }

      // 验证路径参数
      if (config.params) {
        const { error, value } = config.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        } else {
          req.params = value;
        }
      }

      // 验证查询参数
      if (config.query) {
        const { error, value } = config.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        } else {
          req.query = value;
        }
      }

      // 验证请求头
      if (config.headers) {
        const { error, value } = config.headers.validate(req.headers, {
          abortEarly: false,
          allowUnknown: true,
          convert: true,
        });
        
        if (error) {
          errors.push(...error.details.map(detail => detail.message));
        } else {
          req.headers = { ...req.headers, ...value };
        }
      }

      if (errors.length > 0) {
        logger.warn('请求验证失败', {
          path: req.originalUrl,
          method: req.method,
          errors,
          body: req.body,
          params: req.params,
          query: req.query,
        });

        throw createError.badRequest(`参数验证失败: ${errors.join(', ')}`, 'VALIDATION_ERROR');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 预定义的验证模式
 */

// 用户注册验证
export const validateUserRegister = validate({
  body: Joi.object({
    phone: CommonValidations.phone,
    password: CommonValidations.password,
    verificationCode: CommonValidations.verificationCode,
    inviteCode: Joi.string().optional(),
  }),
});

// 用户登录验证
export const validateUserLogin = validate({
  body: Joi.object({
    phone: CommonValidations.phone,
    password: CommonValidations.password,
  }),
});

// 短信验证码验证
export const validateSmsCode = validate({
  body: Joi.object({
    phone: CommonValidations.phone,
    type: Joi.string().valid('register', 'login', 'reset_password', 'change_phone').required(),
  }),
});

// 密码重置验证
export const validatePasswordReset = validate({
  body: Joi.object({
    phone: CommonValidations.phone,
    verificationCode: CommonValidations.verificationCode,
    newPassword: CommonValidations.password,
  }),
});

// 分页查询验证
export const validatePagination = validate({
  query: Joi.object(CommonValidations.pagination),
});

// ID参数验证
export const validateId = validate({
  params: Joi.object({
    id: CommonValidations.id,
  }),
});

// 店铺创建验证
export const validateStoreCreate = validate({
  body: Joi.object({
    name: Joi.string().min(2).max(50).required().messages({
      'string.min': '店铺名称至少2个字符',
      'string.max': '店铺名称不能超过50个字符',
      'any.required': '店铺名称不能为空',
    }),
    description: Joi.string().max(500).optional(),
    phone: CommonValidations.phone,
    address: Joi.string().min(5).max(200).required().messages({
      'string.min': '详细地址至少5个字符',
      'string.max': '详细地址不能超过200个字符',
      'any.required': '详细地址不能为空',
    }),
    latitude: CommonValidations.coordinates.latitude,
    longitude: CommonValidations.coordinates.longitude,
    businessHours: Joi.object({
      open: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      close: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    }).required(),
    images: Joi.array().items(Joi.string().uri()).max(10).optional(),
    tags: Joi.array().items(Joi.string()).max(20).optional(),
  }),
});

// 包间创建验证
export const validateRoomCreate = validate({
  body: Joi.object({
    name: Joi.string().min(1).max(30).required(),
    capacity: Joi.number().integer().min(1).max(50).required(),
    price: CommonValidations.amount,
    deposit: CommonValidations.amount.optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    images: Joi.array().items(Joi.string().uri()).max(10).optional(),
    description: Joi.string().max(200).optional(),
  }),
});

// 订单创建验证
export const validateOrderCreate = validate({
  body: Joi.object({
    storeId: CommonValidations.id,
    roomId: CommonValidations.id,
    startTime: CommonValidations.datetime,
    endTime: CommonValidations.datetime,
    guestCount: Joi.number().integer().min(1).max(50).required(),
    specialRequests: Joi.string().max(200).optional(),
    contactPhone: CommonValidations.phone.optional(),
  }),
});

// 菜品创建验证
export const validateDishCreate = validate({
  body: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    description: Joi.string().max(200).optional(),
    price: CommonValidations.amount,
    category: Joi.string().required(),
    images: Joi.array().items(Joi.string().uri()).max(5).optional(),
    tags: Joi.array().items(Joi.string()).max(10).optional(),
    isAvailable: Joi.boolean().default(true),
    ingredients: Joi.array().items(Joi.string()).optional(),
    allergens: Joi.array().items(Joi.string()).optional(),
  }),
});

// 支付验证
export const validatePayment = validate({
  body: Joi.object({
    orderId: CommonValidations.id,
    paymentMethod: Joi.string().valid('wechat', 'alipay', 'balance').required(),
    amount: CommonValidations.amount,
  }),
});

// 坐标搜索验证
export const validateLocationSearch = validate({
  query: Joi.object({
    latitude: CommonValidations.coordinates.latitude,
    longitude: CommonValidations.coordinates.longitude,
    radius: Joi.number().min(0.1).max(50).default(5).messages({
      'number.min': '搜索半径至少0.1公里',
      'number.max': '搜索半径不能超过50公里',
    }),
    ...CommonValidations.pagination,
  }),
});

// 评价创建验证
export const validateReviewCreate = validate({
  body: Joi.object({
    orderId: CommonValidations.id,
    rating: Joi.number().integer().min(1).max(5).required(),
    content: Joi.string().min(5).max(500).required(),
    images: Joi.array().items(Joi.string().uri()).max(9).optional(),
    tags: Joi.array().items(Joi.string()).max(5).optional(),
  }),
});

/**
 * 文件上传验证
 */
export const validateFileUpload = validate({
  body: Joi.object({
    type: Joi.string().valid('avatar', 'store', 'room', 'dish', 'review').required(),
    filename: Joi.string().required(),
  }),
});

/**
 * 自定义验证函数
 */

// 验证时间范围
export const validateTimeRange = (req: Request, res: Response, next: NextFunction): void => {
  const { startTime, endTime } = req.body;
  
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    
    if (start >= end) {
      throw createError.badRequest('开始时间必须早于结束时间', 'INVALID_TIME_RANGE');
    }
    
    if (start < now) {
      throw createError.badRequest('开始时间不能早于当前时间', 'INVALID_START_TIME');
    }
    
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      throw createError.badRequest('预订时长不能超过24小时', 'INVALID_DURATION');
    }
  }
  
  next();
};

// 验证业务时间
export const validateBusinessHours = (req: Request, res: Response, next: NextFunction): void => {
  const { open, close } = req.body.businessHours || {};
  
  if (open && close) {
    const [openHour, openMinute] = open.split(':').map(Number);
    const [closeHour, closeMinute] = close.split(':').map(Number);
    
    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;
    
    if (openTime >= closeTime) {
      throw createError.badRequest('营业开始时间必须早于结束时间', 'INVALID_BUSINESS_HOURS');
    }
  }
  
  next();
};

/**
 * 预订相关验证
 */
export const bookingValidation = {
  // 创建预订验证
  createBooking: {
    body: Joi.object({
      storeId: CommonValidations.id,
      roomId: CommonValidations.id,
      startTime: CommonValidations.datetime,
      endTime: CommonValidations.datetime,
      guestCount: Joi.number().integer().min(1).max(50).required().messages({
        'number.min': '客人数量至少为1',
        'number.max': '客人数量不能超过50',
        'any.required': '客人数量不能为空',
      }),
      specialRequests: Joi.string().max(500).optional().messages({
        'string.max': '特殊要求不能超过500个字符',
      }),
    }),
  },

  // 取消预订验证
  cancelBooking: {
    params: Joi.object({
      orderId: CommonValidations.id,
    }),
    body: Joi.object({
      reason: Joi.string().max(200).optional().messages({
        'string.max': '取消原因不能超过200个字符',
      }),
    }),
  },

  // 核销预订验证
  verifyBooking: {
    body: Joi.object({
      orderId: CommonValidations.id,
      verificationCode: Joi.string().length(6).pattern(/^[a-zA-Z0-9]{6}$/).required().messages({
        'string.length': '核销码必须是6位字符',
        'string.pattern.base': '核销码格式错误',
        'any.required': '核销码不能为空',
      }),
    }),
  },

  // 查询预订列表验证
  getBookings: {
    query: Joi.object({
      status: Joi.string().valid('pending', 'paid', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded').optional(),
      date: Joi.date().iso().optional(),
      ...CommonValidations.pagination,
    }),
  },
};

/**
 * 菜品相关验证
 */
export const dishValidation = {
  // 创建菜品验证
  createDish: {
    body: Joi.object({
      storeId: CommonValidations.id,
      name: Joi.string().min(1).max(50).required().messages({
        'string.min': '菜品名称至少1个字符',
        'string.max': '菜品名称不能超过50个字符',
        'any.required': '菜品名称不能为空',
      }),
      description: Joi.string().max(300).optional().messages({
        'string.max': '描述不能超过300个字符',
      }),
      price: CommonValidations.amount,
      vipPrice: Joi.number().min(0).optional().messages({
        'number.min': 'VIP价格不能为负数',
      }),
      category: Joi.string().min(1).max(30).required().messages({
        'string.min': '分类至少1个字符',
        'string.max': '分类不能超过30个字符',
        'any.required': '分类不能为空',
      }),
      tags: Joi.array().items(Joi.string().max(20)).max(10).optional(),
      images: Joi.array().items(Joi.string().uri()).max(5).optional(),
      stock: Joi.number().integer().min(0).default(999).messages({
        'number.min': '库存不能为负数',
      }),
      spicyLevel: Joi.number().integer().min(0).max(5).default(0).messages({
        'number.min': '辣度等级最低为0',
        'number.max': '辣度等级最高为5',
      }),
      preparationTime: Joi.number().integer().min(0).max(180).default(15).messages({
        'number.min': '制作时间不能为负数',
        'number.max': '制作时间不能超过3小时',
      }),
      allergens: Joi.array().items(
        Joi.string().valid('麸质', '花生', '坚果', '牛奶', '鸡蛋', '鱼类', '贝类', '大豆')
      ).optional(),
      nutrition: Joi.object({
        calories: Joi.number().min(0).optional(),
        protein: Joi.number().min(0).optional(),
        fat: Joi.number().min(0).optional(),
        carbs: Joi.number().min(0).optional(),
      }).optional(),
    }),
  },

  // 更新菜品验证
  updateDish: {
    params: Joi.object({
      dishId: CommonValidations.id,
    }),
    body: Joi.object({
      name: Joi.string().min(1).max(50).optional(),
      description: Joi.string().max(300).optional(),
      price: Joi.number().min(0).optional(),
      vipPrice: Joi.number().min(0).optional(),
      category: Joi.string().min(1).max(30).optional(),
      tags: Joi.array().items(Joi.string().max(20)).max(10).optional(),
      images: Joi.array().items(Joi.string().uri()).max(5).optional(),
      isActive: Joi.boolean().optional(),
      stock: Joi.number().integer().min(0).optional(),
      spicyLevel: Joi.number().integer().min(0).max(5).optional(),
      preparationTime: Joi.number().integer().min(0).max(180).optional(),
      allergens: Joi.array().items(
        Joi.string().valid('麸质', '花生', '坚果', '牛奶', '鸡蛋', '鱼类', '贝类', '大豆')
      ).optional(),
      nutrition: Joi.object({
        calories: Joi.number().min(0).optional(),
        protein: Joi.number().min(0).optional(),
        fat: Joi.number().min(0).optional(),
        carbs: Joi.number().min(0).optional(),
      }).optional(),
    }),
  },

  // 批量更新状态验证
  batchUpdateStatus: {
    body: Joi.object({
      dishIds: Joi.array().items(CommonValidations.id).min(1).max(50).required().messages({
        'array.min': '至少选择一个菜品',
        'array.max': '最多同时更新50个菜品',
        'any.required': '菜品ID列表不能为空',
      }),
      isActive: Joi.boolean().required().messages({
        'any.required': '状态不能为空',
      }),
    }),
  },

  // 更新库存验证
  updateStock: {
    params: Joi.object({
      dishId: CommonValidations.id,
    }),
    body: Joi.object({
      stock: Joi.number().integer().min(0).required().messages({
        'number.min': '库存不能为负数',
        'any.required': '库存数量不能为空',
      }),
    }),
  },

  // 菜品查询验证
  getDishes: {
    query: Joi.object({
      category: Joi.string().optional(),
      keyword: Joi.string().max(50).optional(),
      sortBy: Joi.string().valid('price', 'rating', 'salesCount', 'createdAt').default('salesCount'),
      minPrice: Joi.number().min(0).optional(),
      maxPrice: Joi.number().min(0).optional(),
      ...CommonValidations.pagination,
    }),
  },
};

/**
 * 支付相关验证
 */
export const paymentValidation = {
  // 创建支付验证
  createPayment: {
    body: Joi.object({
      orderId: CommonValidations.id,
      paymentMethod: Joi.string().valid('wechat', 'alipay', 'balance').required().messages({
        'any.required': '支付方式不能为空',
        'any.only': '支付方式必须是wechat、alipay或balance',
      }),
      pointsToUse: Joi.number().integer().min(0).default(0).messages({
        'number.min': '使用积分不能为负数',
      }),
    }),
  },

  // 支付回调验证
  paymentCallback: {
    body: Joi.object({
      transactionId: Joi.string().required().messages({
        'any.required': '交易ID不能为空',
      }),
      status: Joi.string().valid('success', 'failed').required().messages({
        'any.required': '支付状态不能为空',
        'any.only': '支付状态必须是success或failed',
      }),
      amount: Joi.number().min(0.01).required().messages({
        'number.min': '支付金额至少0.01元',
        'any.required': '支付金额不能为空',
      }),
      signature: Joi.string().optional(), // 支付平台签名
    }),
  },

  // 退款申请验证
  requestRefund: {
    params: Joi.object({
      orderId: CommonValidations.id,
    }),
    body: Joi.object({
      reason: Joi.string().min(5).max(200).required().messages({
        'string.min': '退款原因至少5个字符',
        'string.max': '退款原因不能超过200个字符',
        'any.required': '退款原因不能为空',
      }),
      amount: Joi.number().min(0.01).optional().messages({
        'number.min': '退款金额至少0.01元',
      }),
    }),
  },

  // 余额充值验证
  rechargeBalance: {
    body: Joi.object({
      amount: Joi.number().min(1).max(10000).required().messages({
        'number.min': '充值金额至少1元',
        'number.max': '充值金额不能超过10000元',
        'any.required': '充值金额不能为空',
      }),
      paymentMethod: Joi.string().valid('wechat', 'alipay').required().messages({
        'any.required': '支付方式不能为空',
        'any.only': '支付方式必须是wechat或alipay',
      }),
    }),
  },

  // 充值回调验证
  rechargeCallback: {
    body: Joi.object({
      transactionId: Joi.string().required().messages({
        'any.required': '交易ID不能为空',
      }),
      status: Joi.string().valid('success', 'failed').required().messages({
        'any.required': '支付状态不能为空',
        'any.only': '支付状态必须是success或failed',
      }),
      amount: Joi.number().min(1).required().messages({
        'number.min': '充值金额至少1元',
        'any.required': '充值金额不能为空',
      }),
      signature: Joi.string().optional(),
    }),
  },
};

/**
 * 积分相关验证
 */
export const pointValidation = {
  // 获取积分记录验证
  getRecords: {
    query: Joi.object({
      type: Joi.string().valid('earn', 'use', 'expire', 'refund').optional(),
      startDate: Joi.date().iso().optional(),
      endDate: Joi.date().iso().optional(),
      ...CommonValidations.pagination,
    }),
  },

  // 使用积分验证
  usePoints: {
    body: Joi.object({
      amount: Joi.number().integer().min(1).required().messages({
        'number.min': '使用积分数量至少为1',
        'any.required': '使用积分数量不能为空',
      }),
      orderId: CommonValidations.id.optional(),
      description: Joi.string().max(200).optional().messages({
        'string.max': '描述不能超过200个字符',
      }),
    }),
  },

  // 兑换奖品验证
  exchangeReward: {
    body: Joi.object({
      rewardId: Joi.string().required().messages({
        'any.required': '奖品ID不能为空',
      }),
      quantity: Joi.number().integer().min(1).max(10).default(1).messages({
        'number.min': '兑换数量至少为1',
        'number.max': '单次最多兑换10个',
      }),
    }),
  },

  // 管理员调整积分验证
  adjustPoints: {
    body: Joi.object({
      targetUserId: CommonValidations.id,
      amount: Joi.number().integer().required().messages({
        'any.required': '调整数量不能为空',
      }),
      reason: Joi.string().min(5).max(200).required().messages({
        'string.min': '调整原因至少5个字符',
        'string.max': '调整原因不能超过200个字符',
        'any.required': '调整原因不能为空',
      }),
      type: Joi.string().valid('manual', 'compensation', 'activity').default('manual'),
    }),
  },
};

/**
 * 通知相关验证
 */
export const notificationValidation = {
  // 标记已读验证
  markAsRead: {
    body: Joi.object({
      notificationIds: Joi.array().items(Joi.string()).optional().messages({
        'array.base': '通知ID列表必须是数组',
      }),
    }),
  },

  // 系统公告验证
  systemAnnouncement: {
    body: Joi.object({
      title: Joi.string().min(1).max(100).required().messages({
        'string.min': '标题至少1个字符',
        'string.max': '标题不能超过100个字符',
        'any.required': '标题不能为空',
      }),
      message: Joi.string().min(1).max(500).required().messages({
        'string.min': '消息内容至少1个字符',
        'string.max': '消息内容不能超过500个字符',
        'any.required': '消息内容不能为空',
      }),
      type: Joi.string().valid('info', 'warning', 'important').default('info'),
      targetUsers: Joi.array().items(CommonValidations.id).optional().messages({
        'array.base': '目标用户列表必须是数组',
      }),
    }),
  },

  // 测试通知验证
  testNotification: {
    body: Joi.object({
      targetUserId: CommonValidations.id.optional(),
      title: Joi.string().max(100).optional(),
      message: Joi.string().max(500).optional(),
      type: Joi.string().valid('info', 'success', 'warning', 'error').default('info'),
    }),
  },
};
