/**
 * 店铺相关类型定义
 */

/**
 * 营业时间
 */
export interface BusinessHours {
  open: string;  // HH:mm格式
  close: string; // HH:mm格式
  isClosed?: boolean;
}

/**
 * 店铺基本信息
 */
export interface StoreInfo {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  phone: string;
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  businessHours: BusinessHours;
  images: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  totalRevenue: number;
  monthlyRevenue: number;
  status: StoreStatus;
  isVerified: boolean;
  verifiedAt?: Date;
  licenseNumber?: string;
  licenseImages?: string[];
  amenities: string[];
  priceRange: {
    min: number;
    max: number;
  };
  capacity: number;
  roomCount: number;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 店铺状态
 */
export enum StoreStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

/**
 * 店铺创建参数
 */
export interface StoreCreateParams {
  name: string;
  description?: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  businessHours: BusinessHours;
  images?: string[];
  tags?: string[];
  amenities?: string[];
  features?: string[];
  licenseNumber?: string;
  licenseImages?: string[];
}

/**
 * 店铺更新参数
 */
export interface StoreUpdateParams {
  name?: string;
  description?: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  businessHours?: BusinessHours;
  images?: string[];
  tags?: string[];
  amenities?: string[];
  features?: string[];
  status?: StoreStatus;
}

/**
 * 店铺搜索参数
 */
export interface StoreSearchParams {
  keyword?: string;
  category?: string;
  tags?: string[];
  features?: string[];
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  status?: StoreStatus;
  isVerified?: boolean;
  location?: {
    longitude: number;
    latitude: number;
    radius: number; // 搜索半径（公里）
  };
  sortBy?: 'distance' | 'rating' | 'price' | 'popularity' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 店铺统计数据
 */
export interface StoreStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  customerCount: number;
  repeatCustomerRate: number;
  averageRating: number;
  reviewCount: number;
  popularHours: { hour: number; orderCount: number }[];
  topItems: { itemId: string; name: string; orderCount: number }[];
}

/**
 * 包间信息
 */
export interface RoomInfo {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  capacity: number;
  price: number;
  deposit?: number;
  amenities: string[];
  images: string[];
  status: RoomStatus;
  isAvailable: boolean;
  features: string[];
  equipment: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 包间状态
 */
export enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
  MAINTENANCE = 'maintenance',
  DISABLED = 'disabled',
}

/**
 * 包间创建参数
 */
export interface RoomCreateParams {
  name: string;
  description?: string;
  capacity: number;
  price: number;
  deposit?: number;
  amenities?: string[];
  images?: string[];
  features?: string[];
  equipment?: string[];
}

/**
 * 包间更新参数
 */
export interface RoomUpdateParams {
  name?: string;
  description?: string;
  capacity?: number;
  price?: number;
  deposit?: number;
  amenities?: string[];
  images?: string[];
  status?: RoomStatus;
  isAvailable?: boolean;
  features?: string[];
  equipment?: string[];
}

/**
 * 菜品信息
 */
export interface DishInfo {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  images: string[];
  tags: string[];
  isAvailable: boolean;
  ingredients: string[];
  allergens: string[];
  nutrition?: NutritionInfo;
  preparationTime?: number; // 制作时间（分钟）
  spicyLevel?: number; // 辣度等级 1-5
  isRecommended: boolean;
  salesCount: number;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 营养信息
 */
export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

/**
 * 菜品分类
 */
export interface DishCategory {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
  dishCount: number;
}

/**
 * 菜品创建参数
 */
export interface DishCreateParams {
  name: string;
  description?: string;
  price: number;
  category: string;
  images?: string[];
  tags?: string[];
  ingredients?: string[];
  allergens?: string[];
  nutrition?: NutritionInfo;
  preparationTime?: number;
  spicyLevel?: number;
  isRecommended?: boolean;
}

/**
 * 菜品更新参数
 */
export interface DishUpdateParams {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  images?: string[];
  tags?: string[];
  isAvailable?: boolean;
  ingredients?: string[];
  allergens?: string[];
  nutrition?: NutritionInfo;
  preparationTime?: number;
  spicyLevel?: number;
  isRecommended?: boolean;
}

/**
 * 店铺营业配置
 */
export interface StoreOperationConfig {
  autoAcceptOrders: boolean;
  maxAdvanceBookingDays: number;
  minBookingNotice: number; // 最少提前预订时间（小时）
  cancellationPolicy: {
    allowCancellation: boolean;
    freeTime: number; // 免费取消时间（小时）
    penalty: number; // 取消手续费比例
  };
  depositPolicy: {
    requireDeposit: boolean;
    depositRate: number; // 押金比例
    noDepositVipLevel: number; // 免押金VIP等级
  };
  deliveryConfig?: {
    enableDelivery: boolean;
    deliveryRadius: number;
    minimumOrder: number;
    deliveryFee: number;
    freeDeliveryThreshold: number;
  };
}

/**
 * 店铺统计时间段
 */
export enum StatsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

/**
 * 收入统计
 */
export interface RevenueStats {
  period: StatsPeriod;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  previousPeriod: {
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
  };
  growthRate: {
    revenue: number;
    orders: number;
    aov: number;
  };
  breakdown: {
    roomBooking: number;
    foodOrders: number;
    deposits: number;
    tips: number;
  };
}

/**
 * 店铺评价
 */
export interface StoreReview {
  id: string;
  storeId: string;
  userId: string;
  orderId: string;
  rating: number;
  content: string;
  images: string[];
  tags: string[];
  isAnonymous: boolean;
  response?: {
    content: string;
    respondedAt: Date;
    respondedBy: string;
  };
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 店铺公告
 */
export interface StoreAnnouncement {
  id: string;
  storeId: string;
  title: string;
  content: string;
  type: 'notice' | 'promotion' | 'holiday' | 'maintenance';
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  targetAudience: 'all' | 'vip' | 'new' | 'regular';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export default {
  StoreStatus,
  RoomStatus,
  StatsPeriod,
  BusinessHours,
  StoreInfo,
  StoreCreateParams,
  StoreUpdateParams,
  StoreSearchParams,
  StoreStats,
  RoomInfo,
  RoomCreateParams,
  RoomUpdateParams,
  DishInfo,
  DishCategory,
  DishCreateParams,
  DishUpdateParams,
  NutritionInfo,
  StoreOperationConfig,
  RevenueStats,
  StoreReview,
  StoreAnnouncement,
};
