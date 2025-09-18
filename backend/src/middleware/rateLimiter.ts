import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { cache } from '@/config/redis';
import { createError } from './errorHandler';
import { logger, BusinessLogger } from '@/utils/logger';
import { config } from '@/config/app';

/**
 * 限流器配置接口
 */
interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 最大请求数
  message?: string;      // 自定义错误消息
  keyGenerator?: (req: Request) => string; // 自定义key生成器
  skipSuccessfulRequests?: boolean; // 是否跳过成功请求
}

/**
 * 通用key生成器
 */
const defaultKeyGenerator = (req: Request): string => {
  const userId = req.user?.id;
  const ip = req.ip;
  
  // 已认证用户使用用户ID，未认证用户使用IP
  return userId ? `user:${userId}` : `ip:${ip}`;
};

/**
 * 基于Redis的限流器
 */
class RedisRateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * 中间件函数
   */
  middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = this.config.keyGenerator 
        ? this.config.keyGenerator(req) 
        : defaultKeyGenerator(req);
        
      const cacheKey = `rate_limit:${key}:${req.route?.path || req.path}`;
      
      // 获取当前请求次数
      const current = await cache.get(cacheKey) as number || 0;
      
      if (current >= this.config.maxRequests) {
        // 记录限流事件
        BusinessLogger.securityEvent(
          'RATE_LIMIT_EXCEEDED',
          req.ip,
          req.user?.id,
          {
            key,
            path: req.originalUrl,
            limit: this.config.maxRequests,
            current,
            windowMs: this.config.windowMs,
          }
        );
        
        // 设置响应头
        res.set({
          'X-RateLimit-Limit': this.config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + this.config.windowMs).toISOString(),
        });
        
        throw createError.tooManyRequests(
          this.config.message || '请求过于频繁，请稍后再试',
          'RATE_LIMIT_EXCEEDED'
        );
      }
      
      // 增加计数
      const newCount = await cache.incr(cacheKey);
      
      // 设置过期时间（仅第一次）
      if (newCount === 1) {
        await cache.expire(cacheKey, Math.ceil(this.config.windowMs / 1000));
      }
      
      // 设置响应头
      res.set({
        'X-RateLimit-Limit': this.config.maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, this.config.maxRequests - newCount).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + this.config.windowMs).toISOString(),
      });
      
      next();
    } catch (error) {
      if (error instanceof Error && error.message.includes('RATE_LIMIT_EXCEEDED')) {
        next(error);
      } else {
        // Redis错误时记录日志但不阻止请求
        logger.error('限流器Redis错误:', error);
        next();
      }
    }
  };
}

/**
 * 通用限流配置
 */
export const createRateLimiter = (config: RateLimitConfig) => {
  return new RedisRateLimiter(config).middleware;
};

/**
 * 预定义的限流器
 */

// 通用API限流（每分钟100次）
export const generalRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 100,
  message: '请求过于频繁，请稍后再试',
});

// 严格限流（每分钟10次）
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 10,
  message: '请求过于频繁，请稍后再试',
});

// 认证接口限流（每小时5次）
export const authRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1小时
  maxRequests: 5,
  message: '登录尝试过多，请1小时后再试',
  keyGenerator: (req: Request) => `auth:${req.ip}`,
});

// 支付接口限流（每分钟3次）
export const paymentRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 3,
  message: '支付请求过于频繁，请稍后再试',
});

// 短信发送限流（每分钟1次，每天10次）
export const smsRateLimit = {
  // 每分钟限制
  perMinute: createRateLimiter({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 1,
    message: '短信发送过于频繁，请1分钟后再试',
    keyGenerator: (req: Request) => `sms_minute:${req.body.phone || req.ip}`,
  }),
  
  // 每天限制
  perDay: createRateLimiter({
    windowMs: 24 * 60 * 60 * 1000, // 24小时
    maxRequests: 10,
    message: '今日短信发送次数已达上限',
    keyGenerator: (req: Request) => `sms_day:${req.body.phone || req.ip}`,
  }),
};

/**
 * Express Rate Limit配置（备用方案）
 */
export const expressRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.user?.id || req.ip;
  },
  handler: (req: Request, res: Response) => {
    BusinessLogger.securityEvent(
      'EXPRESS_RATE_LIMIT_EXCEEDED',
      req.ip,
      req.user?.id,
      {
        path: req.originalUrl,
        userAgent: req.get('User-Agent'),
      }
    );
    
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * 请求减速配置
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15分钟
  delayAfter: 50, // 50次请求后开始延迟
  delayMs: 500, // 每次延迟500ms
  maxDelayMs: 5000, // 最大延迟5秒
  keyGenerator: (req: Request) => {
    return req.user?.id || req.ip;
  },
});

/**
 * 支付限流器（更严格）
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次支付请求
  message: {
    error: 'Too many payment requests, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // 使用用户ID作为限流键
    return req.user?.id || req.ip;
  }
});

/**
 * 文件上传限流器
 */
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10分钟
  max: 20, // 最多20次上传请求
  message: {
    error: 'Too many upload requests, please try again later',
    retryAfter: '10 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

/**
 * 分布式限流器（用于多实例部署）
 */
export class DistributedRateLimiter {
  private prefix: string;
  private windowMs: number;
  private maxRequests: number;

  constructor(prefix: string, windowMs: number, maxRequests: number) {
    this.prefix = prefix;
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * 检查是否超过限制
   */
  async isAllowed(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const cacheKey = `${this.prefix}:${key}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // 使用Redis的滑动窗口限流算法
      const multi = cache.multi();
      
      // 删除过期的记录
      multi.zremrangebyscore(cacheKey, 0, windowStart);
      
      // 添加当前请求
      multi.zadd(cacheKey, now, `${now}-${Math.random()}`);
      
      // 获取当前窗口内的请求数
      multi.zcard(cacheKey);
      
      // 设置过期时间
      multi.expire(cacheKey, Math.ceil(this.windowMs / 1000));
      
      const results = await multi.exec();
      const count = results?.[2]?.[1] as number || 0;
      
      const remaining = Math.max(0, this.maxRequests - count);
      const resetTime = now + this.windowMs;
      
      return {
        allowed: count <= this.maxRequests,
        remaining,
        resetTime,
      };
    } catch (error) {
      logger.error('分布式限流器错误:', error);
      // 出错时允许请求通过
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs,
      };
    }
  }

  /**
   * 创建中间件
   */
  middleware = () => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const key = req.user?.id || req.ip;
      const result = await this.isAllowed(key);
      
      // 设置响应头
      res.set({
        'X-RateLimit-Limit': this.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });
      
      if (!result.allowed) {
        BusinessLogger.securityEvent(
          'DISTRIBUTED_RATE_LIMIT_EXCEEDED',
          req.ip,
          req.user?.id,
          {
            key,
            path: req.originalUrl,
            limit: this.maxRequests,
            windowMs: this.windowMs,
          }
        );
        
        throw createError.tooManyRequests('请求过于频繁，请稍后再试', 'RATE_LIMIT_EXCEEDED');
      }
      
      next();
    };
  };
}

/**
 * 特定场景的限流器实例
 */

// API调用限流器
export const apiRateLimiter = new DistributedRateLimiter('api', 60 * 1000, 60);
export const apiLimiter = apiRateLimiter.middleware();

// 支付限流器
export const paymentLimiter = new DistributedRateLimiter('payment', 60 * 1000, 5).middleware();

// 上传限流器  
export const uploadLimiter = new DistributedRateLimiter('upload', 60 * 1000, 10).middleware();

// 用户操作限流器
export const userActionLimiter = new DistributedRateLimiter('user_action', 60 * 1000, 30);

// 商户操作限流器
export const merchantActionLimiter = new DistributedRateLimiter('merchant_action', 60 * 1000, 100);
