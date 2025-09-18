import { Request, Response, NextFunction } from 'express';
import { logger, BusinessLogger } from '@/utils/logger';
import { config } from '@/config/app';

/**
 * 自定义错误类
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    stack?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 常用错误创建函数
 */
export const createError = {
  badRequest: (message: string = '请求参数错误', code?: string) => 
    new ApiError(message, 400, true, code),
    
  unauthorized: (message: string = '未授权访问', code?: string) => 
    new ApiError(message, 401, true, code),
    
  forbidden: (message: string = '禁止访问', code?: string) => 
    new ApiError(message, 403, true, code),
    
  notFound: (message: string = '资源不存在', code?: string) => 
    new ApiError(message, 404, true, code),
    
  conflict: (message: string = '资源冲突', code?: string) => 
    new ApiError(message, 409, true, code),
    
  tooManyRequests: (message: string = '请求过于频繁', code?: string) => 
    new ApiError(message, 429, true, code),
    
  internal: (message: string = '服务器内部错误', code?: string) => 
    new ApiError(message, 500, true, code),
    
  badGateway: (message: string = '网关错误', code?: string) => 
    new ApiError(message, 502, true, code),
    
  serviceUnavailable: (message: string = '服务不可用', code?: string) => 
    new ApiError(message, 503, true, code),
};

/**
 * 业务错误码定义
 */
export const ErrorCodes = {
  // 用户相关 1000-1099
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_DISABLED: 'USER_DISABLED',
  
  // 商户相关 1100-1199
  STORE_NOT_FOUND: 'STORE_NOT_FOUND',
  STORE_CLOSED: 'STORE_CLOSED',
  ROOM_NOT_AVAILABLE: 'ROOM_NOT_AVAILABLE',
  
  // 订单相关 1200-1299
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_EXPIRED: 'ORDER_EXPIRED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  
  // 支付相关 1300-1399
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',
  REFUND_FAILED: 'REFUND_FAILED',
  
  // 系统相关 9000-9099
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

/**
 * 错误响应格式化
 */
const formatErrorResponse = (error: ApiError, req: Request) => {
  const response: any = {
    success: false,
    message: error.message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  // 添加错误码
  if (error.code) {
    response.code = error.code;
  }

  // 开发环境下返回详细错误信息
  if (config.env === 'development') {
    response.stack = error.stack;
    response.statusCode = error.statusCode;
  }

  return response;
};

/**
 * 判断是否为可信任的错误
 */
const isTrustedError = (error: Error): boolean => {
  if (error instanceof ApiError) {
    return error.isOperational;
  }
  return false;
};

/**
 * 错误处理中间件
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let apiError: ApiError;

  // 如果不是ApiError，转换为ApiError
  if (!(error instanceof ApiError)) {
    // 处理特定类型的错误
    if (error.name === 'ValidationError') {
      apiError = createError.badRequest('数据验证失败', 'VALIDATION_ERROR');
    } else if (error.name === 'JsonWebTokenError') {
      apiError = createError.unauthorized('Token无效', 'INVALID_TOKEN');
    } else if (error.name === 'TokenExpiredError') {
      apiError = createError.unauthorized('Token已过期', 'TOKEN_EXPIRED');
    } else if (error.name === 'MongoError' || error.name === 'QueryFailedError') {
      apiError = createError.internal('数据库操作失败', ErrorCodes.DATABASE_ERROR);
    } else {
      // 未知错误
      apiError = createError.internal(
        config.env === 'production' ? '服务器内部错误' : error.message,
        'UNKNOWN_ERROR'
      );
    }
  } else {
    apiError = error;
  }

  // 记录错误日志
  if (apiError.statusCode >= 500) {
    BusinessLogger.systemError(apiError, `${req.method} ${req.originalUrl}`, {
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body,
      params: req.params,
      query: req.query,
    });
  } else if (apiError.statusCode >= 400) {
    logger.warn('客户端错误', {
      error: apiError.message,
      statusCode: apiError.statusCode,
      code: apiError.code,
      path: req.originalUrl,
      method: req.method,
      userId: (req as any).user?.id,
      ip: req.ip,
    });
  }

  // 发送错误响应
  res.status(apiError.statusCode).json(formatErrorResponse(apiError, req));
};

/**
 * 404处理中间件
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = createError.notFound(`接口 ${req.originalUrl} 不存在`);
  next(error);
};

/**
 * 异步错误捕获装饰器
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 全局异常处理
 */
export const setupGlobalErrorHandlers = (): void => {
  // 处理未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    logger.error('未捕获的异常:', error);
    
    if (!isTrustedError(error)) {
      process.exit(1);
    }
  });

  // 处理未处理的Promise拒绝
  process.on('unhandledRejection', (reason: any) => {
    logger.error('未处理的Promise拒绝:', reason);
    
    if (!isTrustedError(reason)) {
      process.exit(1);
    }
  });

  // 处理SIGTERM信号
  process.on('SIGTERM', () => {
    logger.info('收到SIGTERM信号，准备关闭服务器...');
    process.exit(0);
  });

  // 处理SIGINT信号（Ctrl+C）
  process.on('SIGINT', () => {
    logger.info('收到SIGINT信号，准备关闭服务器...');
    process.exit(0);
  });
};
