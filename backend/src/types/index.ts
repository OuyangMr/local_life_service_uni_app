/**
 * 通用响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  timestamp: string;
  path?: string;
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * 分页查询参数
 */
export interface PaginationQuery {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 地理位置信息
 */
export interface LocationInfo {
  latitude: number;
  longitude: number;
  address?: string;
  distance?: number;
}

/**
 * 文件上传信息
 */
export interface FileUploadInfo {
  originalName: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  url: string;
}

/**
 * 用户登录信息
 */
export interface LoginCredentials {
  phone: string;
  password: string;
}

/**
 * 用户注册信息
 */
export interface RegisterInfo {
  phone: string;
  password: string;
  verificationCode: string;
  inviteCode?: string;
}

/**
 * Token信息
 */
export interface TokenInfo {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 短信验证码类型
 */
export type SmsCodeType = 'register' | 'login' | 'reset_password' | 'change_phone';

/**
 * 短信发送请求
 */
export interface SmsRequest {
  phone: string;
  type: SmsCodeType;
}

/**
 * 搜索筛选条件
 */
export interface SearchFilters {
  keyword?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  tags?: string[];
  features?: string[];
  location?: LocationInfo;
  radius?: number;
}

/**
 * 订单筛选条件
 */
export interface OrderFilters {
  status?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  storeId?: string;
  userId?: string;
}

/**
 * 营业时间
 */
export interface BusinessHours {
  open: string;
  close: string;
  isClosed?: boolean;
}

/**
 * 菜品信息
 */
export interface DishInfo {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  images?: string[];
  tags?: string[];
  isAvailable: boolean;
  ingredients?: string[];
  allergens?: string[];
}

/**
 * 订单项信息
 */
export interface OrderItemInfo {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  specialRequests?: string;
}

/**
 * 预订请求
 */
export interface BookingRequest {
  storeId: string;
  roomId?: string;
  startTime: Date;
  endTime: Date;
  guestCount: number;
  contactPhone: string;
  specialRequests?: string;
  items?: OrderItemInfo[];
}

/**
 * 支付请求
 */
export interface PaymentRequest {
  orderId: string;
  paymentMethod: 'wechat' | 'alipay' | 'balance';
  amount: number;
}

/**
 * 评价信息
 */
export interface ReviewInfo {
  orderId: string;
  rating: number;
  content: string;
  images?: string[];
  tags?: string[];
}

/**
 * 统计数据
 */
export interface StatsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * WebSocket消息类型
 */
export enum WsMessageType {
  ORDER_UPDATE = 'order_update',
  ROOM_STATUS = 'room_status',
  NOTIFICATION = 'notification',
  SYSTEM_MESSAGE = 'system_message',
}

/**
 * WebSocket消息格式
 */
export interface WsMessage {
  type: WsMessageType;
  data: any;
  timestamp: number;
  userId?: string;
  storeId?: string;
}

/**
 * 系统配置
 */
export interface SystemConfig {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  icp?: string;
  features: {
    registration: boolean;
    payment: boolean;
    review: boolean;
    notification: boolean;
  };
  payment: {
    wechat: {
      enabled: boolean;
      appId?: string;
      mchId?: string;
    };
    alipay: {
      enabled: boolean;
      appId?: string;
    };
  };
  sms: {
    provider: string;
    templates: {
      [key in SmsCodeType]: string;
    };
  };
  upload: {
    maxSize: number;
    allowedTypes: string[];
    destination: string;
  };
}

/**
 * 错误详情
 */
export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
  value?: any;
}

/**
 * 验证错误
 */
export interface ValidationError {
  message: string;
  details: ErrorDetail[];
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  ttl: number;
  key: string;
  tags?: string[];
}

/**
 * 日志级别
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * 日志条目
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  data?: any;
}

/**
 * 业务日志类型
 */
export enum BusinessLogType {
  USER_REGISTER = 'user_register',
  USER_LOGIN = 'user_login',
  ORDER_CREATE = 'order_create',
  ORDER_PAY = 'order_pay',
  ORDER_CANCEL = 'order_cancel',
  STORE_CREATE = 'store_create',
  REVIEW_CREATE = 'review_create',
  SECURITY_EVENT = 'security_event',
  SYSTEM_ERROR = 'system_error',
}

/**
 * 通知类型
 */
export enum NotificationType {
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_SUCCESS = 'payment_success',
  REVIEW_REPLIED = 'review_replied',
  PROMOTION = 'promotion',
  SYSTEM = 'system',
}

/**
 * 通知信息
 */
export interface NotificationInfo {
  type: NotificationType;
  title: string;
  content: string;
  userId: string;
  data?: any;
  isRead?: boolean;
  expiresAt?: Date;
}

/**
 * 房间状态
 */
export enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  DISABLED = 'disabled',
}

/**
 * VIP权益
 */
export interface VipBenefit {
  level: number;
  name: string;
  description: string;
  discountRate: number;
  freeDelivery: boolean;
  priorityBooking: boolean;
  noDeposit: boolean;
  exclusiveService: boolean;
}

/**
 * 数据库连接状态
 */
export enum DatabaseStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: Date;
  uptime: number;
  database: DatabaseStatus;
  redis: boolean;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
}

/**
 * API密钥信息
 */
export interface ApiKeyInfo {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdBy: string;
}

/**
 * 导出所有类型和接口
 */
export * from './auth';
export * from './user';
export * from './store';
export * from './order';
export * from './payment';
