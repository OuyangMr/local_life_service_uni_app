/**
 * 应用常量定义
 * @description 定义API端点、错误代码、默认配置等常量
 */

// ============================= API配置常量 =============================

/** API基础配置 */
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://api.locallife.example.com' 
    : 'http://localhost:3000',
  TIMEOUT: 10000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
} as const

/** API端点常量 */
export const API_ENDPOINTS = {
  // 认证相关
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    PROFILE: '/api/auth/profile',
    SMS_SEND: '/api/auth/sms/send',
    SMS_VERIFY: '/api/auth/sms/verify',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  
  // 用户相关
  USER: {
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/profile',
    STATS: '/api/users/stats',
    POINTS: '/api/users/points',
    FAVORITES: '/api/users/favorites',
  },

  // 积分相关
  POINTS: {
    RECORDS: '/api/points/records',
    STATS: '/api/points/stats',
    EXCHANGE: '/api/points/exchange',
    REDEEM: '/api/points/redeem',
  },
  
  // 店铺相关
  STORES: {
    LIST: '/api/stores',
    DETAIL: (id: string) => `/api/stores/${id}`,
    CREATE: '/api/stores',
    UPDATE: (id: string) => `/api/stores/${id}`,
    DELETE: (id: string) => `/api/stores/${id}`,
    NEARBY: '/api/stores/nearby/search',
    SEARCH: '/api/stores/search',
    TOP_RATED: '/api/stores/top/rated',
    MY_STORES: '/api/stores/my/list',
  },
  
  // 空间相关
  SPACES: {
    LIST: (storeId: string) => `/api/stores/${storeId}/spaces`,
    DETAIL: (id: string) => `/api/spaces/${id}`,
    CREATE: '/api/spaces',
    UPDATE: (id: string) => `/api/spaces/${id}`,
    DELETE: (id: string) => `/api/spaces/${id}`,
    AVAILABILITY: '/api/spaces/availability',
    STATUS: (id: string) => `/api/spaces/${id}/status`,
  },
  
  // 预订相关
  BOOKINGS: {
    LIST: '/api/bookings',
    DETAIL: (id: string) => `/api/bookings/${id}`,
    CREATE: '/api/bookings',
    UPDATE: (id: string) => `/api/bookings/${id}`,
    CANCEL: (id: string) => `/api/bookings/${id}/cancel`,
    CHECKIN: (id: string) => `/api/bookings/${id}/checkin`,
    CHECKOUT: (id: string) => `/api/bookings/${id}/checkout`,
    VERIFY: '/api/bookings/verify',
  },
  
  // 商品相关
  PRODUCTS: {
    LIST: (storeId: string) => `/api/stores/${storeId}/products`,
    DETAIL: (id: string) => `/api/products/${id}`,
    CREATE: '/api/products',
    UPDATE: (id: string) => `/api/products/${id}`,
    DELETE: (id: string) => `/api/products/${id}`,
    CATEGORIES: (storeId: string) => `/api/stores/${storeId}/products/categories`,
  },
  
  // 订单相关
  ORDERS: {
    LIST: '/api/orders',
    DETAIL: (id: string) => `/api/orders/${id}`,
    CREATE: '/api/orders',
    UPDATE: (id: string) => `/api/orders/${id}`,
    CANCEL: (id: string) => `/api/orders/${id}/cancel`,
    CONFIRM: (id: string) => `/api/orders/${id}/confirm`,
    STATS: '/api/orders/stats/summary',
  },
  
  // 支付相关
  PAYMENTS: {
    CREATE: '/api/payments',
    STATUS: (id: string) => `/api/payments/${id}/status`,
    CALLBACK: '/api/payments/callback',
    REFUND: (id: string) => `/api/payments/${id}/refund`,
  },

  
  // 评价相关
  REVIEWS: {
    LIST: '/api/reviews',
    CREATE: '/api/reviews',
    UPDATE: (id: string) => `/api/reviews/${id}`,
    DELETE: (id: string) => `/api/reviews/${id}`,
    REPLY: (id: string) => `/api/reviews/${id}/reply`,
  },
  
  // 文件上传
  UPLOAD: {
    SINGLE: '/api/upload/single',
    MULTIPLE: '/api/upload/multiple',
    DELETE: '/api/upload/delete',
  },
  
  // 系统相关
  SYSTEM: {
    HEALTH: '/health',
    CONFIG: '/api/system/config',
    ANNOUNCEMENTS: '/api/system/announcements',
  },
} as const

// ============================= 错误代码常量 =============================

/** 通用错误代码 */
export const ERROR_CODES = {
  // 通用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // 认证错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  INVALID_VERIFICATION_CODE: 'INVALID_VERIFICATION_CODE',
  
  // 业务错误
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  STORE_NOT_FOUND: 'STORE_NOT_FOUND',
  SPACE_NOT_AVAILABLE: 'SPACE_NOT_AVAILABLE',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  
  // 支付错误
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_CANCELLED: 'PAYMENT_CANCELLED',
  REFUND_FAILED: 'REFUND_FAILED',
  
  // 限流错误
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const

/** 错误消息映射 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.UNKNOWN_ERROR]: '未知错误，请稍后重试',
  [ERROR_CODES.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [ERROR_CODES.TIMEOUT_ERROR]: '请求超时，请稍后重试',
  [ERROR_CODES.UNAUTHORIZED]: '请先登录',
  [ERROR_CODES.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ERROR_CODES.TOKEN_INVALID]: '登录状态异常，请重新登录',
  [ERROR_CODES.PERMISSION_DENIED]: '权限不足',
  [ERROR_CODES.VALIDATION_ERROR]: '输入信息有误',
  [ERROR_CODES.INVALID_PHONE]: '手机号格式错误',
  [ERROR_CODES.INVALID_PASSWORD]: '密码格式错误',
  [ERROR_CODES.INVALID_VERIFICATION_CODE]: '验证码错误',
  [ERROR_CODES.USER_NOT_FOUND]: '用户不存在',
  [ERROR_CODES.USER_ALREADY_EXISTS]: '用户已存在',
  [ERROR_CODES.STORE_NOT_FOUND]: '店铺不存在',
  [ERROR_CODES.SPACE_NOT_AVAILABLE]: '空间不可用',
  [ERROR_CODES.BOOKING_CONFLICT]: '预订时间冲突',
  [ERROR_CODES.ORDER_NOT_FOUND]: '订单不存在',
  [ERROR_CODES.INSUFFICIENT_BALANCE]: '余额不足',
  [ERROR_CODES.INSUFFICIENT_POINTS]: '积分不足',
  [ERROR_CODES.PAYMENT_FAILED]: '支付失败',
  [ERROR_CODES.PAYMENT_CANCELLED]: '支付已取消',
  [ERROR_CODES.REFUND_FAILED]: '退款失败',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: '操作过于频繁，请稍后重试',
} as const

// ============================= 业务规则常量 =============================

/** VIP权益配置 */
export const VIP_BENEFITS = {
  [0]: { // 普通用户
    name: '普通用户',
    discountRate: 0,
    pointsMultiplier: 1,
    freeDelivery: false,
    prioritySupport: false,
    noDepositBooking: false,
  },
  [1]: { // VIP1
    name: 'VIP1会员',
    discountRate: 0.05, // 5%折扣
    pointsMultiplier: 1.5, // 1.5倍积分
    freeDelivery: true,
    prioritySupport: false,
    noDepositBooking: true,
  },
  [2]: { // VIP2
    name: 'VIP2会员',
    discountRate: 0.1, // 10%折扣
    pointsMultiplier: 2, // 2倍积分
    freeDelivery: true,
    prioritySupport: true,
    noDepositBooking: true,
  },
  [3]: { // VIP3
    name: 'VIP3会员',
    discountRate: 0.15, // 15%折扣
    pointsMultiplier: 3, // 3倍积分
    freeDelivery: true,
    prioritySupport: true,
    noDepositBooking: true,
  },
} as const

/** VIP等级升级门槛 */
export const VIP_UPGRADE_THRESHOLDS = {
  VIP1: 1000,   // 消费1000元升级VIP1
  VIP2: 5000,   // 消费5000元升级VIP2
  VIP3: 10000,  // 消费10000元升级VIP3
} as const

/** 积分规则配置 */
export const POINTS_RULES = {
  EARN_RATE: 0.05,           // 消费返积分比例（5%）
  REDEEM_RATE: 0.01,         // 积分抵扣比例（100积分=1元）
  MIN_REDEEM_POINTS: 100,    // 最少使用积分数
  MAX_REDEEM_RATE: 0.5,      // 最大抵扣比例（50%）
  EXPIRE_DAYS: 365,          // 积分过期天数
  SIGN_IN_POINTS: 10,        // 签到积分
  REVIEW_POINTS: 50,         // 评价积分
  INVITE_POINTS: 100,        // 邀请好友积分
} as const

/** 预订规则配置 */
export const BOOKING_RULES = {
  MIN_DURATION: 1,           // 最短预订时长（小时）
  MAX_DURATION: 12,          // 最长预订时长（小时）
  ADVANCE_DAYS: 7,           // 最多提前预订天数
  DEPOSIT_RATE: 0.2,         // 订金比例（20%）
  CANCEL_HOURS: 2,           // 取消预订提前时间（小时）
  CHECKIN_BUFFER: 30,        // 到店缓冲时间（分钟）
  OVERTIME_RATE: 1.5,        // 超时费率
} as const

/** 订单规则配置 */
export const ORDER_RULES = {
  MIN_DELIVERY_AMOUNT: 20,   // 起送金额
  DELIVERY_FEE: 5,           // 配送费
  FREE_DELIVERY_AMOUNT: 50,  // 免配送费金额
  PREPARATION_TIME: 30,      // 默认制作时间（分钟）
  CANCEL_MINUTES: 5,         // 取消订单时限（分钟）
  AUTO_CONFIRM_HOURS: 24,    // 自动确认收货时间（小时）
} as const

// ============================= 默认配置常量 =============================

/** 分页默认配置 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

/** 地理位置默认配置 */
export const LOCATION_DEFAULTS = {
  RADIUS: 5000,              // 默认搜索半径（米）
  MAX_RADIUS: 50000,         // 最大搜索半径（米）
  DEFAULT_CITY: '北京市',    // 默认城市
  DEFAULT_COORDINATES: {     // 默认坐标（天安门）
    longitude: 116.397128,
    latitude: 39.916527,
  },
} as const

/** 上传文件配置 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,  // 最大文件大小（5MB）
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  ALLOWED_VIDEO_TYPES: ['mp4', 'mov', 'avi'],
  MAX_IMAGE_COUNT: 9,        // 最大图片数量
  MAX_VIDEO_COUNT: 1,        // 最大视频数量
} as const

/** 缓存配置 */
export const CACHE_CONFIG = {
  USER_PROFILE: 'user_profile',
  STORE_LIST: 'store_list',
  PRODUCT_LIST: 'product_list',
  ORDER_LIST: 'order_list',
  EXPIRY: {
    SHORT: 5 * 60 * 1000,     // 5分钟
    MEDIUM: 30 * 60 * 1000,   // 30分钟
    LONG: 24 * 60 * 60 * 1000, // 24小时
  },
} as const

// ============================= 存储键名常量 =============================

/** 本地存储键名 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  CART_DATA: 'cart_data',
  RECENT_SEARCHES: 'recent_searches',
  LOCATION_PERMISSION: 'location_permission',
  THEME_MODE: 'theme_mode',
  LANGUAGE: 'language',
} as const

// ============================= 微信小程序配置 =============================

/** 微信小程序配置 */
export const WECHAT_CONFIG = {
  APP_ID: process.env.WECHAT_APP_ID || '',
  SCOPE: {
    USER_INFO: 'scope.userInfo',
    USER_LOCATION: 'scope.userLocation',
    ADDRESS: 'scope.address',
    INVOICE_TITLE: 'scope.invoiceTitle',
    CAMERA: 'scope.camera',
  },
} as const

// ============================= 工具函数类型保护 =============================

/** 检查是否为有效的API端点 */
export function isValidApiEndpoint(endpoint: string): boolean {
  return Object.values(API_ENDPOINTS)
    .flatMap(group => Object.values(group))
    .some(ep => typeof ep === 'string' ? ep === endpoint : false)
}

/** 检查是否为有效的错误代码 */
export function isValidErrorCode(code: string): code is keyof typeof ERROR_CODES {
  return code in ERROR_CODES
}

/** 获取错误消息 */
export function getErrorMessage(code: string): string {
  return isValidErrorCode(code) 
    ? ERROR_MESSAGES[code] 
    : ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
}

/** 获取VIP权益 */
export function getVipBenefits(level: number) {
  return VIP_BENEFITS[level as keyof typeof VIP_BENEFITS] || VIP_BENEFITS[0]
}

/** 计算VIP折扣价格 */
export function calculateVipPrice(originalPrice: number, vipLevel: number): number {
  const benefits = getVipBenefits(vipLevel)
  return originalPrice * (1 - benefits.discountRate)
}

/** 计算积分 */
export function calculatePoints(amount: number, vipLevel: number): number {
  const benefits = getVipBenefits(vipLevel)
  return Math.floor(amount * POINTS_RULES.EARN_RATE * benefits.pointsMultiplier)
}
