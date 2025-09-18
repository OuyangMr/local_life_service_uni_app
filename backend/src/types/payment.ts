/**
 * 支付相关类型定义
 */

/**
 * 支付状态
 */
export enum PaymentStatus {
  PENDING = 'pending',       // 待支付
  PROCESSING = 'processing', // 处理中
  SUCCESS = 'success',       // 支付成功
  FAILED = 'failed',         // 支付失败
  CANCELLED = 'cancelled',   // 支付取消
  REFUNDED = 'refunded',     // 已退款
  PARTIAL_REFUNDED = 'partial_refunded', // 部分退款
}

/**
 * 支付方式
 */
export enum PaymentMethod {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
  BALANCE = 'balance',
  BANK_CARD = 'bank_card',
  POINTS = 'points',
}

/**
 * 支付类型
 */
export enum PaymentType {
  ORDER_PAYMENT = 'order_payment',     // 订单支付
  DEPOSIT = 'deposit',                 // 押金支付
  RECHARGE = 'recharge',              // 余额充值
  WITHDRAWAL = 'withdrawal',          // 提现
  REFUND = 'refund',                  // 退款
  FEE = 'fee',                        // 手续费
}

/**
 * 支付基本信息
 */
export interface PaymentInfo {
  id: string;
  orderId?: string;
  userId: string;
  storeId?: string;
  amount: number;
  actualAmount: number;
  currency: string;
  method: PaymentMethod;
  type: PaymentType;
  status: PaymentStatus;
  
  // 第三方支付信息
  transactionId?: string;
  thirdPartyTransactionId?: string;
  prepayId?: string;
  
  // 支付配置
  description: string;
  notifyUrl?: string;
  returnUrl?: string;
  
  // 费用信息
  platformFee: number;
  channelFee: number;
  discount: number;
  
  // 时间信息
  expiresAt: Date;
  paidAt?: Date;
  confirmedAt?: Date;
  refundedAt?: Date;
  
  // 元数据
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 支付创建参数
 */
export interface PaymentCreateParams {
  orderId?: string;
  userId: string;
  storeId?: string;
  amount: number;
  method: PaymentMethod;
  type: PaymentType;
  description: string;
  notifyUrl?: string;
  returnUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * 微信支付参数
 */
export interface WechatPayParams {
  appId: string;
  mchId: string;
  nonceStr: string;
  sign: string;
  body: string;
  outTradeNo: string;
  totalFee: number;
  spbillCreateIp: string;
  notifyUrl: string;
  tradeType: 'JSAPI' | 'NATIVE' | 'APP' | 'MWEB';
  openId?: string;
}

/**
 * 支付宝支付参数
 */
export interface AlipayParams {
  appId: string;
  method: string;
  charset: string;
  signType: string;
  sign: string;
  timestamp: string;
  version: string;
  bizContent: string;
}

/**
 * 支付回调数据
 */
export interface PaymentNotification {
  paymentId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  thirdPartyTransactionId?: string;
  amount: number;
  paidAt: Date;
  rawData: Record<string, any>;
}

/**
 * 退款信息
 */
export interface RefundInfo {
  id: string;
  paymentId: string;
  orderId?: string;
  userId: string;
  amount: number;
  reason: string;
  type: 'full' | 'partial';
  status: PaymentStatus;
  refundMethod: PaymentMethod;
  transactionId?: string;
  thirdPartyRefundId?: string;
  processedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  operatorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 退款创建参数
 */
export interface RefundCreateParams {
  paymentId: string;
  amount: number;
  reason: string;
  operatorId?: string;
  notifyUser?: boolean;
}

/**
 * 钱包信息
 */
export interface WalletInfo {
  userId: string;
  balance: number;
  frozenAmount: number;
  totalRecharge: number;
  totalConsumption: number;
  totalWithdrawal: number;
  points: number;
  lastTransactionAt?: Date;
  status: 'active' | 'frozen' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 钱包交易记录
 */
export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'recharge' | 'consumption' | 'withdrawal' | 'refund' | 'reward' | 'penalty';
  amount: number;
  balance: number;
  description: string;
  orderId?: string;
  paymentId?: string;
  source: PaymentMethod;
  status: PaymentStatus;
  createdAt: Date;
}

/**
 * 支付配置
 */
export interface PaymentConfig {
  wechat: {
    enabled: boolean;
    appId: string;
    mchId: string;
    apiKey: string;
    certPath?: string;
    keyPath?: string;
    fee: number; // 手续费比例
  };
  alipay: {
    enabled: boolean;
    appId: string;
    privateKey: string;
    publicKey: string;
    fee: number;
  };
  balance: {
    enabled: boolean;
    minAmount: number;
    maxAmount: number;
  };
  points: {
    enabled: boolean;
    exchangeRate: number; // 积分兑换比例
    minPoints: number;
    maxPoints: number;
  };
}

/**
 * 支付统计数据
 */
export interface PaymentStats {
  totalAmount: number;
  totalCount: number;
  successAmount: number;
  successCount: number;
  failedAmount: number;
  failedCount: number;
  refundedAmount: number;
  refundedCount: number;
  successRate: number;
  averageAmount: number;
  
  byMethod: {
    method: PaymentMethod;
    amount: number;
    count: number;
    successRate: number;
  }[];
  
  byType: {
    type: PaymentType;
    amount: number;
    count: number;
  }[];
  
  trends: {
    date: Date;
    amount: number;
    count: number;
  }[];
}

/**
 * 支付风控规则
 */
export interface PaymentRiskRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
    value: any;
  }[];
  action: 'block' | 'review' | 'limit' | 'notify';
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 支付风险评估结果
 */
export interface PaymentRiskAssessment {
  paymentId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  triggeredRules: string[];
  action: 'approve' | 'reject' | 'review' | 'limit';
  reasons: string[];
  reviewRequired: boolean;
  assessedAt: Date;
}

/**
 * 支付限额配置
 */
export interface PaymentLimitConfig {
  userId?: string;
  userType?: string;
  vipLevel?: number;
  method: PaymentMethod;
  dailyLimit: number;
  monthlyLimit: number;
  singleLimit: number;
  enabled: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

/**
 * 支付渠道配置
 */
export interface PaymentChannelConfig {
  method: PaymentMethod;
  enabled: boolean;
  displayName: string;
  description: string;
  icon: string;
  order: number;
  minAmount: number;
  maxAmount: number;
  fee: number;
  feeType: 'percentage' | 'fixed';
  supportedCurrencies: string[];
  processingTime: string;
  availability: {
    startTime: string;
    endTime: string;
    weekdays: number[];
  };
}

/**
 * 支付接口响应
 */
export interface PaymentResponse {
  paymentId: string;
  status: PaymentStatus;
  paymentUrl?: string;
  qrCode?: string;
  deepLink?: string;
  parameters?: Record<string, any>;
  expiresAt: Date;
  message?: string;
}

/**
 * 银行卡信息
 */
export interface BankCardInfo {
  id: string;
  userId: string;
  bankName: string;
  cardNumber: string; // 脱敏后的卡号
  cardType: 'debit' | 'credit';
  holderName: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isActive: boolean;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default {
  PaymentStatus,
  PaymentMethod,
  PaymentType,
  PaymentInfo,
  PaymentCreateParams,
  WechatPayParams,
  AlipayParams,
  PaymentNotification,
  RefundInfo,
  RefundCreateParams,
  WalletInfo,
  WalletTransaction,
  PaymentConfig,
  PaymentStats,
  PaymentRiskRule,
  PaymentRiskAssessment,
  PaymentLimitConfig,
  PaymentChannelConfig,
  PaymentResponse,
  BankCardInfo,
};
