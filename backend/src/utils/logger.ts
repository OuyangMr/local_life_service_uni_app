import winston from 'winston';
import path from 'path';
import { config } from '@/config/app';

// 创建logs目录
const logDir = config.logging.filePath;

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// 创建logger实例
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: config.appName,
    version: config.appVersion,
    environment: config.env
  },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  
  // 处理未捕获的异常
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  
  // 处理未处理的Promise拒绝
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// 在非生产环境下同时输出到控制台
if (config.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 在生产环境下也输出错误到控制台
if (config.env === 'production') {
  logger.add(new winston.transports.Console({
    level: 'error',
    format: consoleFormat
  }));
}

/**
 * 创建请求日志记录器
 */
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP请求异常', logData);
    } else {
      logger.info('HTTP请求', logData);
    }
  });
  
  next();
};

/**
 * 业务日志记录器
 */
export class BusinessLogger {
  /**
   * 用户行为日志
   */
  static userAction(userId: string, action: string, details?: any) {
    logger.info('用户行为', {
      type: 'USER_ACTION',
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 订单相关日志
   */
  static orderEvent(orderId: string, event: string, details?: any) {
    logger.info('订单事件', {
      type: 'ORDER_EVENT',
      orderId,
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 支付相关日志
   */
  static paymentEvent(paymentId: string, event: string, amount?: number, details?: any) {
    logger.info('支付事件', {
      type: 'PAYMENT_EVENT',
      paymentId,
      event,
      amount,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 系统异常日志
   */
  static systemError(error: Error, context?: string, details?: any) {
    logger.error('系统异常', {
      type: 'SYSTEM_ERROR',
      context,
      message: error.message,
      stack: error.stack,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 安全相关日志
   */
  static securityEvent(event: string, ip?: string, userId?: string, details?: any) {
    logger.warn('安全事件', {
      type: 'SECURITY_EVENT',
      event,
      ip,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 错误日志
   */
  static error(message: string, details?: any) {
    logger.error(message, {
      type: 'BUSINESS_ERROR',
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 信息日志
   */
  static info(message: string, details?: any) {
    logger.info(message, {
      type: 'BUSINESS_INFO',
      details,
      timestamp: new Date().toISOString()
    });
  }
}

export default logger;
