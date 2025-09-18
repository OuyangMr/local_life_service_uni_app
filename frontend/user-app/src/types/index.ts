/**
 * 核心数据类型定义
 * @description 定义User、Store、Space、Booking、Product、Order等核心接口
 */

// ============================= 用户相关类型 =============================

/** 用户等级枚举 */
export enum UserLevel {
  NORMAL = 0,    // 普通用户
  VIP1 = 1,      // VIP1
  VIP2 = 2,      // VIP2  
  VIP3 = 3,      // VIP3
}

/** 用户类型枚举 */
export enum UserType {
  USER = 'user',       // 普通用户
  MERCHANT = 'merchant', // 商户
  ADMIN = 'admin',     // 管理员
}

/** 用户接口 */
export interface User {
  id: string
  phone: string
  nickname: string
  avatar?: string
  userType: UserType
  vipLevel: UserLevel
  balance: number
  points: number
  isVip: boolean
  status: number
  createdAt: string
  updatedAt: string
}

// ============================= 商户店铺相关类型 =============================

/** 店铺类目枚举 */
export enum StoreCategory {
  KTV = 'ktv',
  RESTAURANT = 'restaurant', 
  HOTEL = 'hotel',
  SPA = 'spa',
  GYM = 'gym',
  GAME = 'game',
  OTHER = 'other',
}

/** 店铺状态枚举 */
export enum StoreStatus {
  PENDING = 'pending',   // 待审核
  ACTIVE = 'active',     // 营业中
  INACTIVE = 'inactive', // 暂停营业
  CLOSED = 'closed',     // 已关闭
}

/** 地理坐标接口 */
export interface Coordinates {
  longitude: number
  latitude: number
}

/** 店铺接口 */
export interface Store {
  id: string
  name: string
  category: StoreCategory
  description?: string
  address: string
  coordinates: Coordinates
  phone: string
  images: string[]
  businessHours: {
    open: string
    close: string
  }
  status: StoreStatus
  rating: number
  reviewCount: number
  distance?: number
  merchantId: string
  createdAt: string
  updatedAt: string
}

// ============================= 空间相关类型 =============================

/** 空间状态枚举 */
export enum SpaceStatus {
  AVAILABLE = 'available', // 可用
  OCCUPIED = 'occupied',   // 使用中
  RESERVED = 'reserved',   // 已预订
  MAINTENANCE = 'maintenance', // 维护中
  DISABLED = 'disabled',   // 已禁用
}

/** 空间类型枚举 */
export enum SpaceType {
  SMALL = 'small',     // 小包间
  MEDIUM = 'medium',   // 中包间
  LARGE = 'large',     // 大包间
  VIP = 'vip',         // VIP包间
  LUXURY = 'luxury',   // 豪华包间
}

/** 空间接口 */
export interface Space {
  id: string
  storeId: string
  name: string
  type: SpaceType
  capacity: number
  description?: string
  images: string[]
  videoUrl?: string
  features: string[]
  pricePerHour: number
  vipPricePerHour?: number
  status: SpaceStatus
  qrCode?: string
  createdAt: string
  updatedAt: string
}

// ============================= 预订相关类型 =============================

/** 预订状态枚举 */
export enum BookingStatus {
  PENDING = 'pending',     // 待确认
  CONFIRMED = 'confirmed', // 已确认
  CHECKEDIN = 'checkedin', // 已到店
  COMPLETED = 'completed', // 已完成
  CANCELLED = 'cancelled', // 已取消
  EXPIRED = 'expired',     // 已过期
}

/** 预订接口 */
export interface Booking {
  id: string
  userId: string
  storeId: string
  spaceId: string
  bookingNumber: string
  startTime: string
  endTime: string
  duration: number
  totalAmount: number
  depositAmount: number
  discountAmount: number
  finalAmount: number
  status: BookingStatus
  verificationCode?: string
  checkinTime?: string
  checkoutTime?: string
  notes?: string
  createdAt: string
  updatedAt: string
  // 关联数据
  user?: User
  store?: Store
  space?: Space
}

// ============================= 商品相关类型 =============================

/** 商品状态枚举 */
export enum ProductStatus {
  ACTIVE = 'active',       // 在售
  INACTIVE = 'inactive',   // 下架
  SOLD_OUT = 'sold_out',   // 售罄
}

/** 商品规格接口 */
export interface ProductSpec {
  name: string
  options: string[]
}

/** 商品接口 */
export interface Product {
  id: string
  storeId: string
  name: string
  description?: string
  images: string[]
  category: string
  tags: string[]
  price: number
  vipPrice?: number
  originalPrice?: number
  specs: ProductSpec[]
  stock: number
  sales: number
  status: ProductStatus
  isFeatured: boolean
  sort: number
  createdAt: string
  updatedAt: string
}

// ============================= 订单相关类型 =============================

/** 订单状态枚举 */
export enum OrderStatus {
  PENDING = 'pending',         // 待付款
  PAID = 'paid',               // 已付款
  CONFIRMED = 'confirmed',     // 已确认
  PREPARING = 'preparing',     // 制作中
  READY = 'ready',             // 待取餐
  DELIVERING = 'delivering',   // 配送中
  COMPLETED = 'completed',     // 已完成
  CANCELLED = 'cancelled',     // 已取消
  REFUNDED = 'refunded',       // 已退款
}

/** 订单类型枚举 */
export enum OrderType {
  DINE_IN = 'dine_in',         // 堂食
  TAKEAWAY = 'takeaway',       // 外卖
  DELIVERY = 'delivery',       // 配送
}

/** 订单项接口 */
export interface OrderItem {
  id: string
  productId: string
  name: string
  image?: string
  specs: Record<string, string>
  price: number
  quantity: number
  subtotal: number
  // 关联数据
  product?: Product
}

/** 订单接口 */
export interface Order {
  id: string
  orderNumber: string
  userId: string
  storeId: string
  spaceId?: string
  bookingId?: string
  type: OrderType
  items: OrderItem[]
  totalAmount: number
  discountAmount: number
  pointsUsed: number
  pointsDiscount: number
  finalAmount: number
  status: OrderStatus
  paymentStatus: string
  paymentMethod?: string
  estimatedTime?: number
  actualTime?: number
  notes?: string
  deliveryAddress?: string
  deliveryPhone?: string
  createdAt: string
  updatedAt: string
  // 关联数据
  user?: User
  store?: Store
  space?: Space
  booking?: Booking
}

// ============================= 支付相关类型 =============================

/** 支付方式枚举 */
export enum PaymentMethod {
  WECHAT = 'wechat',           // 微信支付
  ALIPAY = 'alipay',           // 支付宝
  BALANCE = 'balance',         // 余额支付
  POINTS = 'points',           // 积分支付
  MIXED = 'mixed',             // 混合支付
}

/** 支付状态枚举 */
export enum PaymentStatus {
  PENDING = 'pending',         // 待支付
  PAID = 'paid',               // 已支付
  FAILED = 'failed',           // 支付失败
  CANCELLED = 'cancelled',     // 已取消
  REFUNDED = 'refunded',       // 已退款
}

/** 支付记录接口 */
export interface Payment {
  id: string
  orderId?: string
  bookingId?: string
  userId: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  transactionId?: string
  platformTransactionId?: string
  refundAmount?: number
  refundReason?: string
  createdAt: string
  updatedAt: string
}

// ============================= 积分相关类型 =============================

/** 积分记录类型枚举 */
export enum PointRecordType {
  EARN = 'earn',               // 获得积分
  REDEEM = 'redeem',           // 使用积分
  EXPIRE = 'expire',           // 积分过期
  ADJUST = 'adjust',           // 人工调整
}

/** 积分记录接口 */
export interface PointRecord {
  id: string
  userId: string
  type: PointRecordType
  points: number
  balance: number
  source: string
  description: string
  orderId?: string
  expiredAt?: string
  createdAt: string
}

// ============================= 评价相关类型 =============================

/** 评价接口 */
export interface Review {
  id: string
  userId: string
  storeId: string
  orderId?: string
  rating: number
  comment: string
  images: string[]
  isAnonymous: boolean
  likes: number
  replies: ReviewReply[]
  createdAt: string
  updatedAt: string
  // 关联数据
  user?: User
  store?: Store
}

/** 评价回复接口 */
export interface ReviewReply {
  id: string
  reviewId: string
  merchantId: string
  comment: string
  createdAt: string
  // 关联数据
  merchant?: User
}

// ============================= 通用类型 =============================

/** 分页参数接口 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** 分页信息接口 */
export interface PaginationInfo {
  current: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

/** 地理位置查询参数 */
export interface LocationParams {
  longitude: number
  latitude: number
  radius?: number
}

/** 筛选排序参数 */
export interface FilterParams {
  category?: StoreCategory | string
  priceRange?: [number, number]
  rating?: number
  distance?: number
  sortBy?: 'distance' | 'rating' | 'price' | 'sales'
  sortOrder?: 'asc' | 'desc'
}
