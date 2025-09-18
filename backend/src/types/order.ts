/**
 * 订单相关类型定义
 */

/**
 * 订单状态
 */
export enum OrderStatus {
  PENDING = 'pending',           // 待支付
  PAID = 'paid',                // 已支付
  CONFIRMED = 'confirmed',       // 已确认
  IN_PROGRESS = 'in_progress',   // 进行中
  COMPLETED = 'completed',       // 已完成
  CANCELLED = 'cancelled',       // 已取消
  REFUNDED = 'refunded',         // 已退款
}

/**
 * 订单类型
 */
export enum OrderType {
  ROOM_BOOKING = 'room_booking', // 包间预订
  FOOD_ORDER = 'food_order',     // 点餐订单
  COMBO = 'combo',               // 套餐订单
}

/**
 * 支付方式
 */
export enum PaymentMethod {
  WECHAT = 'wechat',   // 微信支付
  ALIPAY = 'alipay',   // 支付宝
  BALANCE = 'balance', // 余额支付
}

/**
 * 订单项信息
 */
export interface OrderItem {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  specialRequests?: string;
  attributes?: {
    size?: string;
    spicyLevel?: number;
    temperature?: string;
    extras?: string[];
  };
}

/**
 * 支付信息
 */
export interface PaymentInfo {
  method: PaymentMethod;
  transactionId?: string;
  paidAt?: Date;
  amount: number;
  platformFee?: number;
  discount?: number;
  refundAmount?: number;
  refundReason?: string;
  refundAt?: Date;
}

/**
 * 订单基本信息
 */
export interface OrderInfo {
  id: string;
  orderNumber: string;
  userId: string;
  storeId: string;
  roomId?: string;
  type: OrderType;
  
  // 预订信息
  startTime?: Date;
  endTime?: Date;
  guestCount?: number;
  
  // 订单项
  items: OrderItem[];
  
  // 价格信息
  subtotal: number;
  deposit: number;
  discount: number;
  totalAmount: number;
  actualAmount: number;
  
  // 支付信息
  paymentInfo?: PaymentInfo;
  
  // 状态信息
  status: OrderStatus;
  
  // 联系信息
  contactPhone: string;
  specialRequests?: string;
  
  // 评价信息
  isReviewed: boolean;
  reviewId?: string;
  
  // 时间戳
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  expiredAt: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 订单创建参数
 */
export interface OrderCreateParams {
  storeId: string;
  roomId?: string;
  type: OrderType;
  startTime?: Date;
  endTime?: Date;
  guestCount?: number;
  items: Omit<OrderItem, 'subtotal'>[];
  contactPhone: string;
  specialRequests?: string;
  useBalance?: boolean;
  usePoints?: number;
}

/**
 * 订单更新参数
 */
export interface OrderUpdateParams {
  status?: OrderStatus;
  startTime?: Date;
  endTime?: Date;
  guestCount?: number;
  items?: OrderItem[];
  contactPhone?: string;
  specialRequests?: string;
}

/**
 * 订单搜索参数
 */
export interface OrderSearchParams {
  userId?: string;
  storeId?: string;
  status?: OrderStatus;
  type?: OrderType;
  startDate?: Date;
  endDate?: Date;
  keyword?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'createdAt' | 'totalAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 订单统计数据
 */
export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  completionRate: number;
  cancellationRate: number;
  popularItems: {
    dishId: string;
    name: string;
    orderCount: number;
    revenue: number;
  }[];
  hourlyDistribution: {
    hour: number;
    orderCount: number;
    revenue: number;
  }[];
}

/**
 * 订单流程状态
 */
export interface OrderFlowStatus {
  currentStatus: OrderStatus;
  nextPossibleStatuses: OrderStatus[];
  canCancel: boolean;
  canRefund: boolean;
  canModify: boolean;
  estimatedCompletionTime?: Date;
  progressPercentage: number;
}

/**
 * 订单通知配置
 */
export interface OrderNotificationConfig {
  smsEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  notifyOnStatusChange: boolean;
  notifyOnPayment: boolean;
  notifyOnCompletion: boolean;
  notifyBeforeExpiration: boolean;
}

/**
 * 订单优惠信息
 */
export interface OrderDiscount {
  type: 'percentage' | 'fixed' | 'points' | 'coupon';
  value: number;
  reason: string;
  couponId?: string;
  pointsUsed?: number;
  maxDiscount?: number;
  appliedAmount: number;
}

/**
 * 订单配送信息
 */
export interface DeliveryInfo {
  method: 'pickup' | 'delivery' | 'dine_in';
  address?: string;
  latitude?: number;
  longitude?: number;
  estimatedTime?: Date;
  deliveryFee?: number;
  deliveryInstructions?: string;
  deliveryPersonId?: string;
  deliveryStatus?: 'pending' | 'assigned' | 'picked_up' | 'delivered';
}

/**
 * 订单评价信息
 */
export interface OrderReview {
  orderId: string;
  userId: string;
  storeId: string;
  rating: number;
  content: string;
  images?: string[];
  tags?: string[];
  itemRatings?: {
    dishId: string;
    rating: number;
    comment?: string;
  }[];
  serviceRating?: number;
  environmentRating?: number;
  valueRating?: number;
  isAnonymous: boolean;
  response?: {
    content: string;
    respondedAt: Date;
    respondedBy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 订单发票信息
 */
export interface InvoiceInfo {
  type: 'personal' | 'company';
  title: string;
  taxNumber?: string;
  email: string;
  amount: number;
  status: 'pending' | 'issued' | 'sent' | 'failed';
  invoiceNumber?: string;
  issuedAt?: Date;
  pdfUrl?: string;
}

/**
 * 订单退款信息
 */
export interface RefundInfo {
  orderId: string;
  amount: number;
  reason: string;
  type: 'full' | 'partial';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  refundMethod: PaymentMethod;
  processedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  operatorId?: string;
}

/**
 * 订单时间配置
 */
export interface OrderTimeConfig {
  paymentTimeout: number;      // 支付超时时间（分钟）
  confirmationTimeout: number; // 确认超时时间（分钟）
  preparationTime: number;     // 准备时间（分钟）
  serviceTime: number;         // 服务时间（分钟）
  cancellationDeadline: number; // 取消截止时间（小时）
}

/**
 * 订单批量操作参数
 */
export interface BatchOrderOperation {
  orderIds: string[];
  operation: 'confirm' | 'cancel' | 'complete' | 'refund';
  reason?: string;
  notifyUsers?: boolean;
}

/**
 * 订单报表数据
 */
export interface OrderReportData {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    completionRate: number;
  };
  trends: {
    daily: { date: Date; orders: number; revenue: number }[];
    hourly: { hour: number; orders: number; revenue: number }[];
    weekly: { week: number; orders: number; revenue: number }[];
  };
  topStores: {
    storeId: string;
    storeName: string;
    orders: number;
    revenue: number;
  }[];
  topItems: {
    dishId: string;
    dishName: string;
    orders: number;
    revenue: number;
  }[];
}

export default {
  OrderStatus,
  OrderType,
  PaymentMethod,
  OrderItem,
  PaymentInfo,
  OrderInfo,
  OrderCreateParams,
  OrderUpdateParams,
  OrderSearchParams,
  OrderStats,
  OrderFlowStatus,
  OrderNotificationConfig,
  OrderDiscount,
  DeliveryInfo,
  OrderReview,
  InvoiceInfo,
  RefundInfo,
  OrderTimeConfig,
  BatchOrderOperation,
  OrderReportData,
};
