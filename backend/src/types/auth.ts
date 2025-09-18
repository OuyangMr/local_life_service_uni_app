/**
 * 认证相关类型定义
 */

/**
 * 用户类型枚举
 */
export enum UserType {
  USER = 'user',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
}

/**
 * 用户认证信息
 */
export interface AuthUser {
  id: string;
  phone: string;
  userType: UserType;
  vipLevel: number;
  storeId?: string;
}

/**
 * JWT Payload
 */
export interface JwtPayload extends AuthUser {
  iat: number;
  exp: number;
  iss: string;
  sub: string;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  phone: string;
  password: string;
}

/**
 * 注册请求
 */
export interface RegisterRequest {
  phone: string;
  password: string;
  verificationCode: string;
  inviteCode?: string;
}

/**
 * 认证响应
 */
export interface AuthResponse {
  user: {
    id: string;
    phone: string;
    nickname?: string;
    avatar?: string;
    userType: UserType;
    vipLevel: number;
    balance: number;
    isVip: boolean;
    lastLoginAt?: Date;
  };
  tokens: {
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/**
 * 短信验证码类型
 */
export enum SmsCodeType {
  REGISTER = 'register',
  LOGIN = 'login',
  RESET_PASSWORD = 'reset_password',
  CHANGE_PHONE = 'change_phone',
}

/**
 * 短信发送请求
 */
export interface SmsCodeRequest {
  phone: string;
  type: SmsCodeType;
}

/**
 * 密码重置请求
 */
export interface PasswordResetRequest {
  phone: string;
  verificationCode: string;
  newPassword: string;
}

/**
 * 用户资料更新请求
 */
export interface ProfileUpdateRequest {
  nickname?: string;
  avatar?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address?: string;
  };
}

/**
 * 刷新Token请求
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * 权限检查选项
 */
export interface PermissionOptions {
  userTypes?: UserType[];
  minVipLevel?: number;
  requireStoreOwnership?: boolean;
}

/**
 * 认证错误码
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PHONE_ALREADY_EXISTS = 'PHONE_ALREADY_EXISTS',
  INVALID_VERIFICATION_CODE = 'INVALID_VERIFICATION_CODE',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_TOKEN_INVALID = 'INVALID_REFRESH_TOKEN',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}

/**
 * 认证会话信息
 */
export interface AuthSession {
  userId: string;
  phone: string;
  userType: UserType;
  vipLevel: number;
  loginAt: Date;
  lastActivity: Date;
  ip: string;
  userAgent: string;
  deviceId?: string;
}

/**
 * 设备信息
 */
export interface DeviceInfo {
  deviceId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  version: string;
  ip: string;
  location?: {
    country: string;
    region: string;
    city: string;
  };
}

/**
 * 登录历史记录
 */
export interface LoginHistory {
  id: string;
  userId: string;
  loginAt: Date;
  logoutAt?: Date;
  ip: string;
  userAgent: string;
  deviceInfo?: DeviceInfo;
  isSuccess: boolean;
  failureReason?: string;
}

/**
 * 安全事件类型
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGED = 'password_changed',
  ACCOUNT_LOCKED = 'account_locked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  TOKEN_STOLEN = 'token_stolen',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
}

/**
 * 安全事件记录
 */
export interface SecurityEvent {
  id: string;
  userId?: string;
  type: SecurityEventType;
  description: string;
  ip: string;
  userAgent: string;
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * 账户锁定信息
 */
export interface AccountLockInfo {
  userId: string;
  lockedAt: Date;
  lockDuration: number; // 锁定持续时间（秒）
  reason: string;
  attempts: number;
  unlockAt: Date;
}

/**
 * 验证码信息
 */
export interface VerificationCodeInfo {
  phone: string;
  code: string;
  type: SmsCodeType;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  used: boolean;
}

/**
 * OAuth提供商
 */
export enum OAuthProvider {
  WECHAT = 'wechat',
  QQ = 'qq',
  WEIBO = 'weibo',
  ALIPAY = 'alipay',
}

/**
 * OAuth认证信息
 */
export interface OAuthInfo {
  provider: OAuthProvider;
  providerId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  userInfo: {
    nickname: string;
    avatar: string;
    email?: string;
    gender?: string;
  };
}

/**
 * 多因素认证类型
 */
export enum MfaType {
  SMS = 'sms',
  EMAIL = 'email',
  TOTP = 'totp',
  HARDWARE_TOKEN = 'hardware_token',
}

/**
 * 多因素认证配置
 */
export interface MfaConfig {
  enabled: boolean;
  methods: MfaType[];
  backupCodes: string[];
  lastUsed?: Date;
}

export default {
  UserType,
  SmsCodeType,
  AuthErrorCode,
  SecurityEventType,
  OAuthProvider,
  MfaType,
};
