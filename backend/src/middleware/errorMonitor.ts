import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface ErrorDetails {
  errorId: string;
  message: string;
  stack?: string;
  statusCode: number;
  method: string;
  url: string;
  userId?: string;
  userAgent?: string;
  ip: string;
  timestamp: Date;
  requestId?: string;
  additionalData?: any;
}

interface ErrorStats {
  type: string;
  count: number;
  lastOccurrence: Date;
  frequency: number; // 每小时发生次数
  severity: 'low' | 'medium' | 'high';
}

interface SystemError {
  type: 'unhandled_rejection' | 'uncaught_exception' | 'warning';
  message: string;
  stack?: string;
  timestamp: Date;
}

class ErrorMonitor {
  private errors: ErrorDetails[] = [];
  private systemErrors: SystemError[] = [];
  private errorStats: Map<string, ErrorStats> = new Map();
  private readonly MAX_ERRORS_CACHE = 5000;
  private readonly ERROR_THRESHOLD = {
    low: 5,    // 每小时5次
    medium: 20, // 每小时20次
    high: 50   // 每小时50次
  };

  constructor() {
    this.setupGlobalErrorHandlers();
    
    // 定期清理和分析错误
    setInterval(() => {
      this.cleanOldErrors();
      this.updateErrorStats();
      this.checkErrorPatterns();
    }, 60000); // 每分钟
  }

  /**
   * Express错误处理中间件
   */
  errorHandler() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      const errorDetails: ErrorDetails = {
        errorId: this.generateErrorId(),
        message: error.message,
        stack: error.stack,
        statusCode: (error as any).statusCode || 500,
        method: req.method,
        url: req.originalUrl || req.url,
        userId: (req as any).user?.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        timestamp: new Date(),
        requestId: res.getHeader('X-Request-ID') as string,
        additionalData: {
          body: req.body,
          params: req.params,
          query: req.query
        }
      };

      this.recordError(errorDetails);

      // 根据错误严重程度决定日志级别
      if (errorDetails.statusCode >= 500) {
        console.error(`🔥 服务器错误 [${errorDetails.errorId}]:`, {
          message: error.message,
          url: req.originalUrl,
          method: req.method,
          userId: errorDetails.userId,
          stack: error.stack
        });
      } else if (errorDetails.statusCode >= 400) {
        console.warn(`⚠️ 客户端错误 [${errorDetails.errorId}]:`, {
          message: error.message,
          url: req.originalUrl,
          method: req.method,
          userId: errorDetails.userId
        });
      }

      // 发送错误响应
      if (!res.headersSent) {
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        res.status(errorDetails.statusCode).json({
          success: false,
          error: {
            message: isDevelopment ? error.message : this.sanitizeErrorMessage(error.message),
            errorId: errorDetails.errorId,
            ...(isDevelopment && { stack: error.stack })
          }
        });
      }
    };
  }

  /**
   * 记录自定义错误
   */
  recordCustomError(
    message: string, 
    context: Partial<ErrorDetails> = {}
  ): string {
    const errorDetails: ErrorDetails = {
      errorId: this.generateErrorId(),
      message,
      statusCode: 500,
      method: 'UNKNOWN',
      url: 'UNKNOWN',
      ip: 'internal',
      timestamp: new Date(),
      ...context
    };

    this.recordError(errorDetails);
    return errorDetails.errorId;
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): ErrorStats[] {
    return Array.from(this.errorStats.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(limit: number = 100): ErrorDetails[] {
    return this.errors.slice(-limit);
  }

  /**
   * 获取特定类型的错误
   */
  getErrorsByType(type: string, limit: number = 50): ErrorDetails[] {
    return this.errors
      .filter(error => this.categorizeError(error.message) === type)
      .slice(-limit);
  }

  /**
   * 获取系统错误
   */
  getSystemErrors(limit: number = 50): SystemError[] {
    return this.systemErrors.slice(-limit);
  }

  /**
   * 检查错误模式和告警
   */
  checkErrorAlerts(): Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    count: number;
  }> {
    const alerts: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
      count: number;
    }> = [];

    this.errorStats.forEach((stats, type) => {
      if (stats.frequency >= this.ERROR_THRESHOLD.high) {
        alerts.push({
          type: 'HIGH_ERROR_FREQUENCY',
          message: `${type} 错误频率过高: ${stats.frequency}/小时`,
          severity: 'high',
          count: stats.count
        });
      } else if (stats.frequency >= this.ERROR_THRESHOLD.medium) {
        alerts.push({
          type: 'MEDIUM_ERROR_FREQUENCY',
          message: `${type} 错误频率较高: ${stats.frequency}/小时`,
          severity: 'medium',
          count: stats.count
        });
      }
    });

    // 检查最近的系统错误
    const recentSystemErrors = this.systemErrors.filter(
      error => Date.now() - error.timestamp.getTime() < 10 * 60 * 1000 // 10分钟内
    );

    if (recentSystemErrors.length > 0) {
      alerts.push({
        type: 'SYSTEM_ERROR',
        message: `检测到 ${recentSystemErrors.length} 个系统错误`,
        severity: 'high',
        count: recentSystemErrors.length
      });
    }

    return alerts;
  }

  /**
   * 记录错误
   */
  private recordError(errorDetails: ErrorDetails): void {
    this.errors.push(errorDetails);
    
    // 保持缓存大小
    if (this.errors.length > this.MAX_ERRORS_CACHE) {
      this.errors = this.errors.slice(-this.MAX_ERRORS_CACHE);
    }
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    // 未捕获的异常
    process.on('uncaughtException', (error: Error) => {
      console.error('🚨 未捕获的异常:', error);
      
      this.systemErrors.push({
        type: 'uncaught_exception',
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      });

      // 记录到错误监控
      this.recordCustomError(`未捕获的异常: ${error.message}`, {
        statusCode: 500,
        additionalData: { stack: error.stack }
      });

      // 在生产环境中，考虑优雅关闭应用
      if (process.env.NODE_ENV === 'production') {
        console.error('应用即将退出...');
        process.exit(1);
      }
    });

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('🚨 未处理的Promise拒绝:', reason);
      
      this.systemErrors.push({
        type: 'unhandled_rejection',
        message: reason?.message || String(reason),
        stack: reason?.stack,
        timestamp: new Date()
      });

      // 记录到错误监控
      this.recordCustomError(`未处理的Promise拒绝: ${reason?.message || String(reason)}`, {
        statusCode: 500,
        additionalData: { reason, stack: reason?.stack }
      });
    });

    // 进程警告
    process.on('warning', (warning: Error) => {
      console.warn('⚠️ 进程警告:', warning);
      
      this.systemErrors.push({
        type: 'warning',
        message: warning.message,
        stack: warning.stack,
        timestamp: new Date()
      });
    });
  }

  /**
   * 更新错误统计
   */
  private updateErrorStats(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // 获取最近一小时的错误
    const recentErrors = this.errors.filter(error => error.timestamp >= oneHourAgo);
    
    // 按错误类型分组
    const errorGroups = new Map<string, ErrorDetails[]>();
    
    recentErrors.forEach(error => {
      const type = this.categorizeError(error.message);
      if (!errorGroups.has(type)) {
        errorGroups.set(type, []);
      }
      errorGroups.get(type)!.push(error);
    });

    // 更新统计信息
    this.errorStats.clear();
    errorGroups.forEach((errors, type) => {
      const count = errors.length;
      const lastOccurrence = new Date(Math.max(...errors.map(e => e.timestamp.getTime())));
      const frequency = count; // 每小时频率
      
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (frequency >= this.ERROR_THRESHOLD.high) {
        severity = 'high';
      } else if (frequency >= this.ERROR_THRESHOLD.medium) {
        severity = 'medium';
      }

      this.errorStats.set(type, {
        type,
        count,
        lastOccurrence,
        frequency,
        severity
      });
    });
  }

  /**
   * 错误分类
   */
  private categorizeError(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('database') || lowerMessage.includes('connection')) {
      return 'DATABASE_ERROR';
    } else if (lowerMessage.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    } else if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return 'VALIDATION_ERROR';
    } else if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized')) {
      return 'AUTH_ERROR';
    } else if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      return 'NOT_FOUND_ERROR';
    } else if (lowerMessage.includes('rate limit')) {
      return 'RATE_LIMIT_ERROR';
    } else if (lowerMessage.includes('payment')) {
      return 'PAYMENT_ERROR';
    } else {
      return 'GENERAL_ERROR';
    }
  }

  /**
   * 检查错误模式
   */
  private checkErrorPatterns(): void {
    const alerts = this.checkErrorAlerts();
    
    if (alerts.length > 0) {
      console.warn('🔔 错误告警:', alerts);
      
      // 这里可以集成外部告警系统，如发送邮件、Slack通知等
      // await this.sendAlerts(alerts);
    }
  }

  /**
   * 清理旧错误
   */
  private cleanOldErrors(): void {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.errors = this.errors.filter(error => error.timestamp >= twentyFourHoursAgo);
    this.systemErrors = this.systemErrors.filter(error => error.timestamp >= twentyFourHoursAgo);
  }

  /**
   * 清理错误消息
   */
  private sanitizeErrorMessage(message: string): string {
    // 在生产环境中隐藏敏感信息
    const sanitized = message
      .replace(/password\s*[:=]\s*[^\s]+/gi, 'password: [HIDDEN]')
      .replace(/token\s*[:=]\s*[^\s]+/gi, 'token: [HIDDEN]')
      .replace(/key\s*[:=]\s*[^\s]+/gi, 'key: [HIDDEN]');
    
    return sanitized;
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建全局实例
const errorMonitor = new ErrorMonitor();

export { ErrorMonitor, errorMonitor };
export type { ErrorDetails, ErrorStats, SystemError };
