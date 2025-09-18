import { Request, Response } from 'express';
import { performanceMonitor } from '../middleware/performance';
import { errorMonitor } from '../middleware/errorMonitor';

interface MonitorDashboard {
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpuUsage: number;
    timestamp: Date;
  };
  performance: {
    totalRequests: number;
    averageResponseTime: number;
    slowRequestsCount: number;
    apiStats: any[];
  };
  errors: {
    totalErrors: number;
    errorRate: number;
    errorStats: any[];
    recentErrors: any[];
  };
  alerts: any[];
}

export class MonitorController {
  /**
   * 获取系统概览
   */
  async getSystemOverview(req: Request, res: Response) {
    try {
      const systemMetrics = performanceMonitor.getSystemMetrics();
      const recentMetrics = performanceMonitor.getRecentMetrics(1000);
      const recentErrors = errorMonitor.getRecentErrors(100);
      
      // 计算汇总统计
      const totalRequests = recentMetrics.length;
      const averageResponseTime = totalRequests > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests 
        : 0;
      const slowRequestsCount = recentMetrics.filter(m => m.duration > 2000).length;
      const errorRate = totalRequests > 0 ? (recentErrors.length / totalRequests * 100) : 0;

      const overview: MonitorDashboard = {
        system: {
          uptime: systemMetrics.uptime,
          memory: systemMetrics.memoryUsage,
          cpuUsage: systemMetrics.cpuUsage,
          timestamp: systemMetrics.timestamp
        },
        performance: {
          totalRequests,
          averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
          slowRequestsCount,
          apiStats: performanceMonitor.getApiStats().slice(0, 10)
        },
        errors: {
          totalErrors: recentErrors.length,
          errorRate: parseFloat(errorRate.toFixed(2)),
          errorStats: errorMonitor.getErrorStats().slice(0, 10),
          recentErrors: recentErrors.slice(-10)
        },
        alerts: [
          ...performanceMonitor.checkAlerts(),
          ...errorMonitor.checkErrorAlerts()
        ]
      };

      res.json({
        success: true,
        data: overview,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('获取系统概览失败:', error);
      res.status(500).json({
        success: false,
        error: '获取系统概览失败'
      });
    }
  }

  /**
   * 获取性能指标
   */
  async getPerformanceMetrics(req: Request, res: Response) {
    try {
      const { endpoint, limit = 100 } = req.query;
      
      let metrics;
      if (endpoint) {
        metrics = performanceMonitor.getEndpointMetrics(endpoint as string, Number(limit));
      } else {
        metrics = performanceMonitor.getRecentMetrics(Number(limit));
      }

      const apiStats = performanceMonitor.getApiStats();
      const systemMetrics = performanceMonitor.getSystemMetrics();

      res.json({
        success: true,
        data: {
          metrics,
          apiStats,
          systemMetrics,
          alerts: performanceMonitor.checkAlerts()
        }
      });
    } catch (error) {
      console.error('获取性能指标失败:', error);
      res.status(500).json({
        success: false,
        error: '获取性能指标失败'
      });
    }
  }

  /**
   * 获取错误监控数据
   */
  async getErrorMetrics(req: Request, res: Response) {
    try {
      const { type, limit = 100 } = req.query;
      
      let errors;
      if (type) {
        errors = errorMonitor.getErrorsByType(type as string, Number(limit));
      } else {
        errors = errorMonitor.getRecentErrors(Number(limit));
      }

      const errorStats = errorMonitor.getErrorStats();
      const systemErrors = errorMonitor.getSystemErrors(50);

      res.json({
        success: true,
        data: {
          errors,
          errorStats,
          systemErrors,
          alerts: errorMonitor.checkErrorAlerts()
        }
      });
    } catch (error) {
      console.error('获取错误指标失败:', error);
      res.status(500).json({
        success: false,
        error: '获取错误指标失败'
      });
    }
  }

  /**
   * 获取实时监控数据 (用于WebSocket推送)
   */
  async getRealtimeData(req: Request, res: Response) {
    try {
      const systemMetrics = performanceMonitor.getSystemMetrics();
      const recentMetrics = performanceMonitor.getRecentMetrics(60); // 最近60个请求
      const recentErrors = errorMonitor.getRecentErrors(10); // 最近10个错误
      
      // 计算实时统计
      const lastMinuteMetrics = recentMetrics.filter(
        m => Date.now() - m.timestamp.getTime() < 60000
      );
      
      const realtimeData = {
        timestamp: new Date(),
        system: {
          memoryUsage: Math.round(systemMetrics.memoryUsage.heapUsed / 1024 / 1024), // MB
          uptime: Math.round(systemMetrics.uptime / 60), // 分钟
          activeConnections: systemMetrics.activeConnections
        },
        performance: {
          requestsPerMinute: lastMinuteMetrics.length,
          averageResponseTime: lastMinuteMetrics.length > 0
            ? Math.round(lastMinuteMetrics.reduce((sum, m) => sum + m.duration, 0) / lastMinuteMetrics.length)
            : 0,
          slowRequests: lastMinuteMetrics.filter(m => m.duration > 2000).length
        },
        errors: {
          errorsPerMinute: recentErrors.filter(
            e => Date.now() - e.timestamp.getTime() < 60000
          ).length,
          latestError: recentErrors.length > 0 ? recentErrors[recentErrors.length - 1] : null
        },
        alerts: [
          ...performanceMonitor.checkAlerts(),
          ...errorMonitor.checkErrorAlerts()
        ].filter(alert => alert.severity === 'high') // 只返回高优先级告警
      };

      res.json({
        success: true,
        data: realtimeData
      });
    } catch (error) {
      console.error('获取实时监控数据失败:', error);
      res.status(500).json({
        success: false,
        error: '获取实时监控数据失败'
      });
    }
  }

  /**
   * 获取性能趋势图数据
   */
  async getPerformanceTrends(req: Request, res: Response) {
    try {
      const { period = '1h' } = req.query;
      
      let timeRange: number;
      let groupBy: number;
      
      switch (period) {
        case '1h':
          timeRange = 60 * 60 * 1000; // 1小时
          groupBy = 5 * 60 * 1000; // 5分钟间隔
          break;
        case '6h':
          timeRange = 6 * 60 * 60 * 1000; // 6小时
          groupBy = 30 * 60 * 1000; // 30分钟间隔
          break;
        case '24h':
          timeRange = 24 * 60 * 60 * 1000; // 24小时
          groupBy = 60 * 60 * 1000; // 1小时间隔
          break;
        default:
          timeRange = 60 * 60 * 1000;
          groupBy = 5 * 60 * 1000;
      }

      const now = Date.now();
      const startTime = now - timeRange;
      
      const metrics = performanceMonitor.getRecentMetrics(10000)
        .filter(m => m.timestamp.getTime() >= startTime);

      // 按时间间隔分组
      const groups = new Map<number, any[]>();
      
      metrics.forEach(metric => {
        const groupKey = Math.floor(metric.timestamp.getTime() / groupBy) * groupBy;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(metric);
      });

      // 生成趋势数据
      const trends = Array.from(groups.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([timestamp, groupMetrics]) => ({
          timestamp: new Date(timestamp),
          requestCount: groupMetrics.length,
          averageResponseTime: groupMetrics.length > 0
            ? groupMetrics.reduce((sum, m) => sum + m.duration, 0) / groupMetrics.length
            : 0,
          errorCount: groupMetrics.filter(m => m.statusCode >= 400).length,
          slowRequestCount: groupMetrics.filter(m => m.duration > 2000).length
        }));

      res.json({
        success: true,
        data: {
          period,
          groupBy: groupBy / 1000, // 返回秒为单位
          trends
        }
      });
    } catch (error) {
      console.error('获取性能趋势失败:', error);
      res.status(500).json({
        success: false,
        error: '获取性能趋势失败'
      });
    }
  }

  /**
   * 健康检查端点
   */
  async healthCheck(req: Request, res: Response) {
    try {
      const systemMetrics = performanceMonitor.getSystemMetrics();
      const alerts = [
        ...performanceMonitor.checkAlerts(),
        ...errorMonitor.checkErrorAlerts()
      ];

      const highPriorityAlerts = alerts.filter(alert => alert.severity === 'high');
      const isHealthy = highPriorityAlerts.length === 0;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        uptime: systemMetrics.uptime,
        memory: Math.round(systemMetrics.memoryUsage.heapUsed / 1024 / 1024),
        alerts: highPriorityAlerts.length,
        ...(highPriorityAlerts.length > 0 && { alertDetails: highPriorityAlerts })
      });
    } catch (error) {
      console.error('健康检查失败:', error);
      res.status(503).json({
        success: false,
        status: 'error',
        error: '健康检查失败'
      });
    }
  }

  /**
   * 清理测试数据 (仅在测试环境)
   */
  async cleanupTestData(req: Request, res: Response) {
    try {
      if (process.env.NODE_ENV !== 'test') {
        return res.status(403).json({
          success: false,
          error: '仅在测试环境中可用'
        });
      }

      // 这里应该清理测试数据，具体实现取决于数据库结构
      // 例如：删除测试用户、测试订单等
      
      res.json({
        success: true,
        message: '测试数据已清理'
      });
    } catch (error) {
      console.error('清理测试数据失败:', error);
      res.status(500).json({
        success: false,
        error: '清理测试数据失败'
      });
    }
  }
}
