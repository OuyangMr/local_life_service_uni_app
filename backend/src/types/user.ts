/**
 * 用户相关类型定义
 */

import { UserType } from './auth';

/**
 * 用户基本信息
 */
export interface UserInfo {
  id: string;
  phone: string;
  nickname?: string;
  avatar?: string;
  userType: UserType;
  vipLevel: number;
  vipExpireAt?: Date;
  balance: number;
  totalSpent: number;
  preferredStores: string[];
  location?: LocationInfo;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 地理位置信息
 */
export interface LocationInfo {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
}

/**
 * VIP等级配置
 */
export interface VipLevelConfig {
  level: number;
  name: string;
  description: string;
  benefits: VipBenefit[];
  requirements: {
    minSpent?: number;
    minOrders?: number;
  };
  discountRate: number;
  color: string;
  icon: string;
}

/**
 * VIP权益
 */
export interface VipBenefit {
  id: string;
  name: string;
  description: string;
  type: 'discount' | 'free_service' | 'priority' | 'exclusive';
  value?: number;
  isActive: boolean;
}

/**
 * 用户统计数据
 */
export interface UserStats {
  totalOrders: number;
  completedOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  favoriteStores: string[];
  mostOrderedItems: string[];
  loginDays: number;
  reviewCount: number;
  averageRating: number;
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  notifications: {
    orderUpdates: boolean;
    promotions: boolean;
    newStores: boolean;
    reviews: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy: {
    showLocation: boolean;
    showSpentAmount: boolean;
    allowDataUsage: boolean;
  };
  display: {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    currency: string;
    dateFormat: string;
  };
}

/**
 * 用户认证状态
 */
export interface UserAuthStatus {
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  mfaEnabled: boolean;
  hasPassword: boolean;
  oauthProviders: string[];
  lastPasswordChange: Date;
  securityLevel: 'low' | 'medium' | 'high';
}

/**
 * 用户钱包信息
 */
export interface UserWallet {
  balance: number;
  frozenAmount: number;
  totalRecharge: number;
  totalWithdraw: number;
  rechargeCount: number;
  withdrawCount: number;
  lastRechargeAt?: Date;
  lastWithdrawAt?: Date;
}

/**
 * 余额变动记录
 */
export interface BalanceTransaction {
  id: string;
  userId: string;
  type: 'recharge' | 'deduct' | 'refund' | 'reward' | 'penalty';
  amount: number;
  beforeBalance: number;
  afterBalance: number;
  description: string;
  orderId?: string;
  paymentMethod?: string;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * 用户邀请信息
 */
export interface UserInvitation {
  inviteCode: string;
  invitedBy?: string;
  inviteCount: number;
  inviteReward: number;
  invitedUsers: string[];
  totalReward: number;
  isValid: boolean;
  expiresAt?: Date;
}

/**
 * 用户标签
 */
export interface UserTag {
  id: string;
  name: string;
  description: string;
  color: string;
  type: 'system' | 'manual' | 'auto';
  conditions?: TagCondition[];
  userCount: number;
  isActive: boolean;
}

/**
 * 标签条件
 */
export interface TagCondition {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

/**
 * 用户行为记录
 */
export interface UserBehavior {
  id: string;
  userId: string;
  action: string;
  target: string;
  targetId?: string;
  metadata?: Record<string, any>;
  ip: string;
  userAgent: string;
  location?: LocationInfo;
  timestamp: Date;
}

/**
 * 用户反馈
 */
export interface UserFeedback {
  id: string;
  userId: string;
  type: 'bug' | 'suggestion' | 'complaint' | 'praise' | 'other';
  title: string;
  content: string;
  attachments: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'resolved' | 'closed';
  response?: string;
  responseAt?: Date;
  respondedBy?: string;
  createdAt: Date;
}

/**
 * 用户等级升级记录
 */
export interface VipUpgradeRecord {
  id: string;
  userId: string;
  fromLevel: number;
  toLevel: number;
  reason: string;
  duration?: number; // 升级持续时间（天）
  cost?: number;
  paymentMethod?: string;
  transactionId?: string;
  upgradeAt: Date;
  expiresAt?: Date;
}

/**
 * 用户搜索参数
 */
export interface UserSearchParams {
  keyword?: string;
  userType?: UserType;
  vipLevel?: number;
  isActive?: boolean;
  isVerified?: boolean;
  registeredAfter?: Date;
  registeredBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  minSpent?: number;
  maxSpent?: number;
  tags?: string[];
  location?: {
    longitude: number;
    latitude: number;
    radius: number;
  };
  sortBy?: 'createdAt' | 'lastLoginAt' | 'totalSpent' | 'vipLevel';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 用户创建参数
 */
export interface UserCreateParams {
  phone: string;
  password: string;
  nickname?: string;
  avatar?: string;
  userType?: UserType;
  vipLevel?: number;
  location?: LocationInfo;
  inviteCode?: string;
}

/**
 * 用户更新参数
 */
export interface UserUpdateParams {
  nickname?: string;
  avatar?: string;
  location?: LocationInfo;
  preferences?: Partial<UserPreferences>;
  isActive?: boolean;
}

/**
 * 批量用户操作参数
 */
export interface BatchUserOperation {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'upgrade_vip' | 'add_balance' | 'add_tags' | 'remove_tags';
  params?: Record<string, any>;
}

export default {
  UserInfo,
  LocationInfo,
  VipLevelConfig,
  VipBenefit,
  UserStats,
  UserPreferences,
  UserAuthStatus,
  UserWallet,
  BalanceTransaction,
  UserInvitation,
  UserTag,
  TagCondition,
  UserBehavior,
  UserFeedback,
  VipUpgradeRecord,
  UserSearchParams,
  UserCreateParams,
  UserUpdateParams,
  BatchUserOperation,
};
