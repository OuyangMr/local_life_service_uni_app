import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

/**
 * 应用配置
 */
export const config = {
  // 应用基础配置
  nodeEnv: process.env.NODE_ENV || 'development',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  // 应用信息
  appName: process.env.APP_NAME || '本地生活服务API',
  appVersion: process.env.APP_VERSION || '1.0.0',
  
  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // MongoDB 数据库配置
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://app_user:app_password_123@localhost:27017/local-life-service',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '27017', 10),
    database: process.env.DB_NAME || 'local-life-service',
    username: process.env.DB_USERNAME || 'app_user',
    password: process.env.DB_PASSWORD || 'app_password_123',
  },

  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'local-life:',
  },

  // 文件上传配置
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
    uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    staticUrl: process.env.STATIC_URL || '/uploads',
  },

  // 微信小程序配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    mchId: process.env.WECHAT_MCH_ID || '',
    apiKey: process.env.WECHAT_API_KEY || '',
  },

  // 支付宝配置
  alipay: {
    appId: process.env.ALIPAY_APP_ID || '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  },

  // 短信配置
  sms: {
    provider: process.env.SMS_PROVIDER || 'aliyun', // aliyun, tencent
    accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',
    signName: process.env.SMS_SIGN_NAME || '本地生活服务',
    templateCode: process.env.SMS_TEMPLATE_CODE || '',
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10),
  },
  
  // 日志文件配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_PATH || './logs',
  },

  // CORS 配置
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // 限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分钟
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 最大请求数
  },

  // 安全配置
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  },

  // 业务配置
  business: {
    // 积分配置
    points: {
      orderRatio: parseFloat(process.env.POINTS_ORDER_RATIO || '0.05'), // 消费返积分比例 5%
      vipMultiplier: parseFloat(process.env.POINTS_VIP_MULTIPLIER || '2'), // VIP倍数
      expireDays: parseInt(process.env.POINTS_EXPIRE_DAYS || '365', 10), // 积分过期天数
    },
    
    // VIP配置
    vip: {
      level1Threshold: parseInt(process.env.VIP_LEVEL1_THRESHOLD || '1000', 10), // VIP1门槛
      level2Threshold: parseInt(process.env.VIP_LEVEL2_THRESHOLD || '5000', 10), // VIP2门槛
      level3Threshold: parseInt(process.env.VIP_LEVEL3_THRESHOLD || '10000', 10), // VIP3门槛
    },

    // 预订配置
    booking: {
      cancelHours: parseInt(process.env.BOOKING_CANCEL_HOURS || '2', 10), // 普通用户取消时限
      vipCancelHours: parseInt(process.env.BOOKING_VIP_CANCEL_HOURS || '1', 10), // VIP用户取消时限
      defaultDurationHours: parseInt(process.env.BOOKING_DEFAULT_DURATION || '2', 10), // 默认预订时长
    }
  }
};

// 环境验证
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI'
];

if (config.nodeEnv === 'production') {
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  });
}

export default config;