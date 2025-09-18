/**
 * API响应类型定义
 * @description 定义统一的API响应格式、分页响应和各业务模块的请求响应类型
 */

import type {
  User, Store, Space, Booking, Product, Order, Payment, PointRecord, Review,
  PaginationInfo, LocationParams, FilterParams, UserLevel, UserType,
  StoreCategory, SpaceType, BookingStatus, OrderStatus, PaymentMethod
} from './index'

// ============================= 统一响应格式 =============================

/** 基础API响应接口 */
export interface BaseResponse {
  success: boolean
  message: string
  timestamp: string
  code?: string
}

/** 成功响应接口 */
export interface ApiResponse<T = any> extends BaseResponse {
  success: true
  data: T
}

/** 错误响应接口 */
export interface ErrorResponse extends BaseResponse {
  success: false
  error?: {
    code: string
    details?: any
    stack?: string
  }
}

/** 分页响应接口 */
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: PaginationInfo
}

// ============================= 认证相关API类型 =============================

/** 登录请求参数 */
export interface LoginRequest {
  phone: string
  password?: string
  code?: string  // 微信小程序授权码或短信验证码
  type: 'password' | 'sms' | 'wechat'
}

/** 注册请求参数 */
export interface RegisterRequest {
  phone: string
  password: string
  nickname: string
  verificationCode: string
  inviteCode?: string
  userType?: UserType
}

/** 发送短信验证码请求 */
export interface SendSmsRequest {
  phone: string
  type: 'register' | 'login' | 'reset_password'
}

/** 重置密码请求 */
export interface ResetPasswordRequest {
  phone: string
  newPassword: string
  verificationCode: string
}

/** 登录响应数据 */
export interface LoginResponse {
  user: User
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

/** Token刷新响应 */
export interface RefreshTokenResponse {
  accessToken: string
  expiresIn: number
}

// ============================= 用户相关API类型 =============================

/** 更新用户信息请求 */
export interface UpdateUserRequest {
  nickname?: string
  avatar?: string
}

/** 用户统计信息响应 */
export interface UserStatsResponse {
  totalOrders: number
  totalBookings: number
  totalPoints: number
  totalSpent: number
  vipLevel: UserLevel
  vipProgress: {
    current: number
    required: number
    percentage: number
  }
}

// ============================= 商户店铺相关API类型 =============================

/** 创建店铺请求 */
export interface CreateStoreRequest {
  name: string
  category: StoreCategory
  description?: string
  address: string
  coordinates: {
    longitude: number
    latitude: number
  }
  phone: string
  businessHours: {
    open: string
    close: string
  }
}

/** 更新店铺请求 */
export interface UpdateStoreRequest extends Partial<CreateStoreRequest> {
  images?: string[]
}

/** 店铺列表查询参数 */
export interface StoreListRequest extends LocationParams, FilterParams {
  keyword?: string
  page?: number
  pageSize?: number
}

/** 附近店铺查询参数 */
export interface NearbyStoresRequest extends LocationParams {
  category?: StoreCategory
  radius?: number
  limit?: number
}

/** 店铺详情响应 */
export interface StoreDetailResponse extends Store {
  spaces: Space[]
  isFavorite: boolean
  canBook: boolean
  estimatedWaitTime?: number
}

// ============================= 空间相关API类型 =============================

/** 创建空间请求 */
export interface CreateSpaceRequest {
  storeId: string
  name: string
  type: SpaceType
  capacity: number
  description?: string
  features: string[]
  pricePerHour: number
  vipPricePerHour?: number
}

/** 更新空间请求 */
export interface UpdateSpaceRequest extends Partial<CreateSpaceRequest> {
  images?: string[]
  videoUrl?: string
}

/** 空间可用性查询 */
export interface SpaceAvailabilityRequest {
  storeId: string
  startTime: string
  endTime: string
  capacity?: number
}

/** 空间可用性响应 */
export interface SpaceAvailabilityResponse {
  spaceId: string
  available: boolean
  nextAvailableTime?: string
}

// ============================= 预订相关API类型 =============================

/** 创建预订请求 */
export interface CreateBookingRequest {
  storeId: string
  spaceId: string
  startTime: string
  endTime: string
  notes?: string
  usePoints?: number
}

/** 预订确认请求 */
export interface ConfirmBookingRequest {
  bookingId: string
  paymentMethod: PaymentMethod
  usePoints?: number
  couponId?: string
}

/** 预订列表查询参数 */
export interface BookingListRequest {
  status?: BookingStatus[]
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/** 预订详情响应 */
export interface BookingDetailResponse extends Booking {
  canCancel: boolean
  canModify: boolean
  canCheckin: boolean
  qrCode?: string
  estimatedAmount: number
}

// ============================= 商品相关API类型 =============================

/** 创建商品请求 */
export interface CreateProductRequest {
  storeId: string
  name: string
  description?: string
  category: string
  price: number
  vipPrice?: number
  specs: Array<{
    name: string
    options: string[]
  }>
  stock: number
}

/** 更新商品请求 */
export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  images?: string[]
  tags?: string[]
  isFeatured?: boolean
}

/** 商品列表查询参数 */
export interface ProductListRequest {
  storeId: string
  category?: string
  keyword?: string
  isFeatured?: boolean
  page?: number
  pageSize?: number
}

/** 商品详情响应 */
export interface ProductDetailResponse extends Product {
  reviews: Review[]
  averageRating: number
  isFavorite: boolean
  currentPrice: number  // 根据用户等级计算的实际价格
}

// ============================= 订单相关API类型 =============================

/** 创建订单请求 */
export interface CreateOrderRequest {
  storeId: string
  spaceId?: string
  bookingId?: string
  items: Array<{
    productId: string
    quantity: number
    specs: Record<string, string>
  }>
  notes?: string
  deliveryAddress?: string
  deliveryPhone?: string
}

/** 订单确认请求 */
export interface ConfirmOrderRequest {
  orderId: string
  paymentMethod: PaymentMethod
  usePoints?: number
  couponId?: string
}

/** 订单列表查询参数 */
export interface OrderListRequest {
  status?: OrderStatus[]
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/** 订单详情响应 */
export interface OrderDetailResponse extends Order {
  canCancel: boolean
  canPay: boolean
  canConfirm: boolean
  canReview: boolean
  timeline: Array<{
    status: OrderStatus
    timestamp: string
    description: string
  }>
}

/** 订单统计响应 */
export interface OrderStatsResponse {
  pendingCount: number
  preparingCount: number
  completedCount: number
  totalAmount: number
}

// ============================= 支付相关API类型 =============================

/** 创建支付请求 */
export interface CreatePaymentRequest {
  orderId?: string
  bookingId?: string
  amount: number
  method: PaymentMethod
  usePoints?: number
  returnUrl?: string
}

/** 支付响应 */
export interface PaymentResponse {
  paymentId: string
  transactionId?: string
  paymentData?: any  // 微信/支付宝支付参数
  qrCode?: string    // 扫码支付二维码
  status: string
}

/** 支付状态查询响应 */
export interface PaymentStatusResponse {
  paymentId: string
  status: string
  paidAt?: string
  failReason?: string
}

// ============================= 积分相关API类型 =============================

/** 积分记录查询参数 */
export interface PointRecordListRequest {
  type?: string[]
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

/** 积分统计响应 */
export interface PointStatsResponse {
  totalPoints: number
  usedPoints: number
  availablePoints: number
  expiredPoints: number
  pendingExpiredPoints: number
  recentRecords: PointRecord[]
}

// ============================= 评价相关API类型 =============================

/** 创建评价请求 */
export interface CreateReviewRequest {
  storeId: string
  orderId?: string
  rating: number
  comment: string
  images?: string[]
  isAnonymous?: boolean
}

/** 评价列表查询参数 */
export interface ReviewListRequest {
  storeId?: string
  userId?: string
  rating?: number
  page?: number
  pageSize?: number
}

// ============================= 文件上传相关API类型 =============================

/** 文件上传响应 */
export interface UploadResponse {
  url: string
  filename: string
  size: number
  mimeType: string
}

/** 批量上传响应 */
export interface BatchUploadResponse {
  files: UploadResponse[]
  failedFiles: Array<{
    filename: string
    error: string
  }>
}

// ============================= WebSocket消息类型 =============================

/** WebSocket消息基础接口 */
export interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

/** 订单状态更新消息 */
export interface OrderStatusMessage extends WebSocketMessage {
  type: 'order_status_update'
  data: {
    orderId: string
    status: OrderStatus
    estimatedTime?: number
    message?: string
  }
}

/** 空间状态更新消息 */
export interface SpaceStatusMessage extends WebSocketMessage {
  type: 'space_status_update'
  data: {
    spaceId: string
    status: string
    nextAvailableTime?: string
  }
}

/** 系统通知消息 */
export interface NotificationMessage extends WebSocketMessage {
  type: 'notification'
  data: {
    title: string
    content: string
    category: string
    actionUrl?: string
  }
}

// ============================= 类型联合和工具类型 =============================

/** 所有API响应类型联合 */
export type AnyApiResponse = 
  | ApiResponse
  | PaginatedResponse
  | ErrorResponse

/** 所有WebSocket消息类型联合 */
export type AnyWebSocketMessage = 
  | OrderStatusMessage
  | SpaceStatusMessage
  | NotificationMessage

/** 提取响应数据类型的工具类型 */
export type ResponseData<T> = T extends ApiResponse<infer U> ? U : never

/** 提取分页响应数据类型的工具类型 */
export type PaginatedData<T> = T extends PaginatedResponse<infer U> ? U : never
