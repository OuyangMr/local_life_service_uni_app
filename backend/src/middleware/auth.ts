import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/app';
import { createError } from './errorHandler';
import { cache } from '@/config/redis';
import { logger, BusinessLogger } from '@/utils/logger';

/**
 * 扩展Request接口，添加用户信息
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone: string;
        userType: 'user' | 'merchant' | 'admin';
        vipLevel: number;
        storeId?: string;
      };
    }
  }
}

/**
 * JWT Token解码接口
 */
interface JwtPayload {
  id: string;
  phone: string;
  userType: 'user' | 'merchant' | 'admin';
  vipLevel: number;
  storeId?: string;
  iat: number;
  exp: number;
}

/**
 * 生成JWT Token
 */
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.appName,
    subject: payload.id.toString(), // 确保subject是字符串
  });
};

/**
 * 生成刷新Token
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: config.appName,
      subject: userId.toString(), // 确保subject是字符串
    }
  );
};

/**
 * 验证JWT Token
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw createError.unauthorized('Token已过期', 'TOKEN_EXPIRED');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw createError.unauthorized('Token无效', 'INVALID_TOKEN');
    } else {
      throw createError.unauthorized('Token验证失败', 'TOKEN_VERIFICATION_FAILED');
    }
  }
};

/**
 * 验证刷新Token
 */
export const verifyRefreshToken = (token: string): { userId: string; type: string } => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as { userId: string; type: string };
  } catch (error) {
    throw createError.unauthorized('刷新Token无效', 'INVALID_REFRESH_TOKEN');
  }
};

/**
 * 从请求头中提取Token
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  // 也可以从cookie中获取
  const tokenFromCookie = req.cookies?.token;
  if (tokenFromCookie) {
    return tokenFromCookie;
  }
  
  return null;
};

/**
 * 检查Token是否在黑名单中
 */
const isTokenBlacklisted = async (tokenId: string): Promise<boolean> => {
  try {
    return await cache.exists(`blacklist:${tokenId}`);
  } catch (error) {
    logger.error('检查Token黑名单失败:', error);
    return false;
  }
};

/**
 * 将Token加入黑名单
 */
export const blacklistToken = async (tokenId: string, expiresIn: number): Promise<void> => {
  try {
    await cache.set(`blacklist:${tokenId}`, true, expiresIn);
  } catch (error) {
    logger.error('添加Token到黑名单失败:', error);
  }
};

/**
 * 认证中间件
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw createError.unauthorized('缺少认证Token', 'MISSING_TOKEN');
    }

    // 验证Token
    const decoded = verifyToken(token);
    
    // 检查Token是否在黑名单中
    const isBlacklisted = await isTokenBlacklisted(decoded.id);
    if (isBlacklisted) {
      throw createError.unauthorized('Token已失效', 'TOKEN_BLACKLISTED');
    }

    // 将用户信息添加到request对象
    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      userType: decoded.userType,
      vipLevel: decoded.vipLevel,
      storeId: decoded.storeId,
    };

    // 记录用户访问日志
    BusinessLogger.userAction(decoded.id, 'API_ACCESS', {
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * 可选认证中间件（不强制要求认证）
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = verifyToken(token);
      
      // 检查Token是否在黑名单中
      const isBlacklisted = await isTokenBlacklisted(decoded.id);
      if (!isBlacklisted) {
        req.user = {
          id: decoded.id,
          phone: decoded.phone,
          userType: decoded.userType,
          vipLevel: decoded.vipLevel,
          storeId: decoded.storeId,
        };
      }
    }

    next();
  } catch (error) {
    // 可选认证失败时不抛出错误，只是不设置用户信息
    next();
  }
};

/**
 * 用户类型权限检查中间件
 */
export const requireUserType = (allowedTypes: Array<'user' | 'merchant' | 'admin'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw createError.unauthorized('需要用户认证', 'AUTHENTICATION_REQUIRED');
    }

    if (!allowedTypes.includes(req.user.userType)) {
      BusinessLogger.securityEvent(
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        req.ip,
        req.user.id,
        {
          requiredTypes: allowedTypes,
          userType: req.user.userType,
          path: req.originalUrl,
        }
      );
      
      throw createError.forbidden('用户类型权限不足', 'INSUFFICIENT_USER_TYPE');
    }

    next();
  };
};

/**
 * VIP等级权限检查中间件
 */
export const requireVipLevel = (minLevel: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw createError.unauthorized('需要用户认证', 'AUTHENTICATION_REQUIRED');
    }

    if (req.user.vipLevel < minLevel) {
      BusinessLogger.securityEvent(
        'INSUFFICIENT_VIP_LEVEL',
        req.ip,
        req.user.id,
        {
          requiredLevel: minLevel,
          userLevel: req.user.vipLevel,
          path: req.originalUrl,
        }
      );
      
      throw createError.forbidden('VIP等级不足', 'INSUFFICIENT_VIP_LEVEL');
    }

    next();
  };
};

/**
 * 商户权限检查中间件（只能访问自己的店铺数据）
 */
export const requireStoreOwnership = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw createError.unauthorized('需要用户认证', 'AUTHENTICATION_REQUIRED');
  }

  if (req.user.userType !== 'merchant' && req.user.userType !== 'admin') {
    throw createError.forbidden('需要商户权限', 'MERCHANT_PERMISSION_REQUIRED');
  }

  // 管理员可以访问所有店铺
  if (req.user.userType === 'admin') {
    return next();
  }

  // 商户只能访问自己的店铺
  const storeId = req.params.storeId || req.body.storeId;
  if (storeId && req.user.storeId !== storeId) {
    BusinessLogger.securityEvent(
      'UNAUTHORIZED_STORE_ACCESS',
      req.ip,
      req.user.id,
      {
        requestedStoreId: storeId,
        userStoreId: req.user.storeId,
        path: req.originalUrl,
      }
    );
    
    throw createError.forbidden('无权访问该店铺', 'STORE_ACCESS_DENIED');
  }

  next();
};

// 确保正确导出authMiddleware
export { authenticate as authMiddleware };
