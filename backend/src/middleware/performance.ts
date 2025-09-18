import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
  userAgent?: string;
  userId?: string;
  ip: string;
}

interface ApiPerformanceStats {
  endpoint: string;
  averageResponseTime: number;
  totalRequests: number;
  errorRate: number;
  slowRequests: number;
  lastUpdated: Date;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  activeConnections: number;
  timestamp: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private statsCache: Map<string, ApiPerformanceStats> = new Map();
  private readonly SLOW_REQUEST_THRESHOLD = 2000; // 2秒
  private readonly MAX_METRICS_CACHE = 10000;
  private readonly STATS_UPDATE_INTERVAL = 60000; // 1分钟

  constructor() {
    // 定期清理旧指标和更新统计
    setInterval(() => {
      this.cleanOldMetrics();
      this.updateStats();
    }, this.STATS_UPDATE_INTERVAL);

    // 定期输出系统指标
    setInterval(() => {
      this.logSystemMetrics();
    }, 30000); // 30秒
  }

  /**
   * Express中间件：记录请求性能
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      const requestId = this.generateRequestId();
      
      // 添加请求ID到响应头
      res.setHeader('X-Request-ID', requestId);
      
      // 监听响应完成
      res.on('finish', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        const metric: PerformanceMetrics = {
          requestId,
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode,
          duration,
          memoryUsage: process.memoryUsage(),
          timestamp: new Date(),
          userAgent: req.get('User-Agent'),
          userId: (req as any).user?.id,
          ip: req.ip || req.connection.remoteAddress || 'unknown'
        };

        this.recordMetric(metric);
        
        // 记录慢请求
        if (duration > this.SLOW_REQUEST_THRESHOLD) {
          console.warn(`🐌 慢请求检测:`, {
            requestId,
            method: req.method,
            url: req.originalUrl,
            duration: `${duration.toFixed(2)}ms`,
            userId: metric.userId
          });
        }
      });

      next();
    };
  }

  /**
   * 记录性能指标
   */
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // 保持缓存大小
    if (this.metrics.length > this.MAX_METRICS_CACHE) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_CACHE);
    }
  }

  /**
   * 更新API统计信息
   */
  private updateStats(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // 获取最近一小时的指标
    const recentMetrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);
    
    // 按端点分组
    const endpointGroups = new Map<string, PerformanceMetrics[]>();
    
    recentMetrics.forEach(metric => {
      const endpoint = this.normalizeEndpoint(metric.url);
      if (!endpointGroups.has(endpoint)) {
        endpointGroups.set(endpoint, []);
      }
      endpointGroups.get(endpoint)!.push(metric);
    });

    // 计算每个端点的统计信息
    endpointGroups.forEach((metrics, endpoint) => {
      const totalRequests = metrics.length;
      const errorCount = metrics.filter(m => m.statusCode >= 400).length;
      const slowCount = metrics.filter(m => m.duration > this.SLOW_REQUEST_THRESHOLD).length;
      const averageResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
      
      const stats: ApiPerformanceStats = {
        endpoint,
        averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
        totalRequests,
        errorRate: parseFloat((errorCount / totalRequests * 100).toFixed(2)),
        slowRequests: slowCount,
        lastUpdated: now
      };

      this.statsCache.set(endpoint, stats);
    });
  }

  /**
   * 获取API性能统计
   */
  getApiStats(): ApiPerformanceStats[] {
    return Array.from(this.statsCache.values())
      .sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * 获取系统指标
   */
  getSystemMetrics(): SystemMetrics {
    return {
      cpuUsage: process.cpuUsage().user / 1000000, // 转换为秒
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      activeConnections: (process as any)._getActiveRequests?.().length || 0,
      timestamp: new Date()
    };
  }

  /**
   * 获取最近的性能指标
   */
  getRecentMetrics(limit: number = 100): PerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * 获取特定端点的指标
   */
  getEndpointMetrics(endpoint: string, limit: number = 50): PerformanceMetrics[] {
    const normalizedEndpoint = this.normalizeEndpoint(endpoint);
    return this.metrics
      .filter(m => this.normalizeEndpoint(m.url) === normalizedEndpoint)
      .slice(-limit);
  }

  /**
   * 生成告警
   */
  checkAlerts(): Array<{type: string; message: string; severity: 'low' | 'medium' | 'high'}> {
    const alerts: Array<{type: string; message: string; severity: 'low' | 'medium' | 'high'}> = [];
    
    // 检查内存使用
    const memUsage = process.memoryUsage();
    const memUsageMB = memUsage.heapUsed / 1024 / 1024;
    
    if (memUsageMB > 1000) {
      alerts.push({
        type: 'MEMORY_HIGH',
        message: `内存使用过高: ${memUsageMB.toFixed(2)}MB`,
        severity: 'high'
      });
    } else if (memUsageMB > 500) {
      alerts.push({
        type: 'MEMORY_MEDIUM',
        message: `内存使用较高: ${memUsageMB.toFixed(2)}MB`,
        severity: 'medium'
      });
    }

    // 检查慢请求比例
    const recentMetrics = this.getRecentMetrics(1000);
    if (recentMetrics.length > 50) {
      const slowRequestRatio = recentMetrics.filter(m => m.duration > this.SLOW_REQUEST_THRESHOLD).length / recentMetrics.length;
      
      if (slowRequestRatio > 0.1) {
        alerts.push({
          type: 'SLOW_REQUESTS_HIGH',
          message: `慢请求比例过高: ${(slowRequestRatio * 100).toFixed(2)}%`,
          severity: 'high'
        });
      } else if (slowRequestRatio > 0.05) {
        alerts.push({
          type: 'SLOW_REQUESTS_MEDIUM',
          message: `慢请求比例较高: ${(slowRequestRatio * 100).toFixed(2)}%`,
          severity: 'medium'
        });
      }
    }

    // 检查错误率
    if (recentMetrics.length > 50) {
      const errorRate = recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length;
      
      if (errorRate > 0.05) {
        alerts.push({
          type: 'ERROR_RATE_HIGH',
          message: `错误率过高: ${(errorRate * 100).toFixed(2)}%`,
          severity: 'high'
        });
      } else if (errorRate > 0.02) {
        alerts.push({
          type: 'ERROR_RATE_MEDIUM',
          message: `错误率较高: ${(errorRate * 100).toFixed(2)}%`,
          severity: 'medium'
        });
      }
    }

    return alerts;
  }

  /**
   * 清理旧指标
   */
  private cleanOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 保留2小时
    this.metrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);
  }

  /**
   * 记录系统指标
   */
  private logSystemMetrics(): void {
    const metrics = this.getSystemMetrics();
    const memUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    
    console.log(`📊 系统指标:`, {
      uptime: `${(metrics.uptime / 60).toFixed(2)}分钟`,
      memory: `${memUsageMB.toFixed(2)}MB`,
      activeConnections: metrics.activeConnections
    });
  }

  /**
   * 标准化端点路径
   */
  private normalizeEndpoint(url: string): string {
    // 移除查询参数
    const pathOnly = url.split('?')[0];
    
    // 将动态参数替换为占位符
    return pathOnly
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9]{24}/g, '/:objectId');
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor();

export { PerformanceMonitor, performanceMonitor };
export type { PerformanceMetrics, ApiPerformanceStats, SystemMetrics };
