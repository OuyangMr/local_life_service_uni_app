interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  type: 'navigation' | 'api' | 'custom' | 'page' | 'component';
  metadata?: any;
}

interface PagePerformance {
  url: string;
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  timestamp: Date;
  userAgent: string;
  userId?: string;
}

interface ApiPerformance {
  url: string;
  method: string;
  duration: number;
  statusCode: number;
  responseSize?: number;
  timestamp: Date;
  userId?: string;
}

interface UserInteraction {
  type: 'click' | 'scroll' | 'input' | 'navigation';
  target: string;
  timestamp: Date;
  duration?: number;
  metadata?: any;
}

interface ErrorEvent {
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: Date;
  url: string;
  userId?: string;
  userAgent: string;
}

class PerformanceMonitor {
  private entries: PerformanceEntry[] = [];
  private pageMetrics: PagePerformance[] = [];
  private apiMetrics: ApiPerformance[] = [];
  private interactions: UserInteraction[] = [];
  private errors: ErrorEvent[] = [];
  private isEnabled: boolean = true;
  private maxEntries: number = 1000;
  
  // 性能阈值配置
  private readonly thresholds = {
    pageLoad: 3000,      // 3秒
    apiRequest: 2000,    // 2秒
    interaction: 100,    // 100毫秒
    fps: 55              // 55 FPS
  };

  constructor() {
    this.init();
  }

  /**
   * 初始化性能监控
   */
  private init(): void {
    if (typeof window === 'undefined') return;

    // 监听页面性能
    this.setupPagePerformanceTracking();
    
    // 监听错误
    this.setupErrorTracking();
    
    // 监听用户交互
    this.setupInteractionTracking();
    
    // 定期发送数据
    this.startPeriodicReporting();
  }

  /**
   * 开始性能测量
   */
  mark(name: string, type: PerformanceEntry['type'] = 'custom', metadata?: any): void {
    if (!this.isEnabled) return;

    const startTime = performance.now();
    const entry: PerformanceEntry = {
      name,
      startTime,
      duration: 0,
      type,
      metadata
    };

    this.entries.push(entry);
    
    // 保持数组大小
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  /**
   * 结束性能测量
   */
  measure(name: string, endMetadata?: any): number | null {
    if (!this.isEnabled) return null;

    const endTime = performance.now();
    const entryIndex = this.entries.findIndex(e => e.name === name && e.duration === 0);
    
    if (entryIndex === -1) {
      console.warn(`Performance: 找不到标记 "${name}"`);
      return null;
    }

    const entry = this.entries[entryIndex];
    entry.duration = endTime - entry.startTime;
    
    if (endMetadata) {
      entry.metadata = { ...entry.metadata, ...endMetadata };
    }

    // 检查是否超过阈值
    this.checkThreshold(entry);

    return entry.duration;
  }

  /**
   * 记录API性能
   */
  recordApiCall(
    url: string,
    method: string,
    startTime: number,
    endTime: number,
    statusCode: number,
    responseSize?: number
  ): void {
    if (!this.isEnabled) return;

    const apiMetric: ApiPerformance = {
      url: this.sanitizeUrl(url),
      method,
      duration: endTime - startTime,
      statusCode,
      responseSize,
      timestamp: new Date(),
      userId: this.getCurrentUserId()
    };

    this.apiMetrics.push(apiMetric);
    
    // 保持数组大小
    if (this.apiMetrics.length > this.maxEntries) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxEntries);
    }

    // 检查慢API
    if (apiMetric.duration > this.thresholds.apiRequest) {
      console.warn(`🐌 慢API请求:`, {
        url: apiMetric.url,
        method: apiMetric.method,
        duration: `${apiMetric.duration.toFixed(2)}ms`
      });
    }
  }

  /**
   * 记录页面性能
   */
  recordPagePerformance(url: string): void {
    if (!this.isEnabled || typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    if (!navigation) return;

    const pageMetric: PagePerformance = {
      url: this.sanitizeUrl(url),
      loadTime: navigation.loadEventEnd - navigation.navigationStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId()
    };

    this.pageMetrics.push(pageMetric);

    // 检查页面加载性能
    if (pageMetric.loadTime > this.thresholds.pageLoad) {
      console.warn(`🐌 页面加载缓慢:`, {
        url: pageMetric.url,
        loadTime: `${pageMetric.loadTime.toFixed(2)}ms`
      });
    }
  }

  /**
   * 记录用户交互
   */
  recordInteraction(
    type: UserInteraction['type'],
    target: string,
    duration?: number,
    metadata?: any
  ): void {
    if (!this.isEnabled) return;

    const interaction: UserInteraction = {
      type,
      target,
      timestamp: new Date(),
      duration,
      metadata
    };

    this.interactions.push(interaction);
    
    // 保持数组大小
    if (this.interactions.length > this.maxEntries) {
      this.interactions = this.interactions.slice(-this.maxEntries);
    }

    // 检查交互响应时间
    if (duration && duration > this.thresholds.interaction) {
      console.warn(`🐌 交互响应缓慢:`, {
        type,
        target,
        duration: `${duration.toFixed(2)}ms`
      });
    }
  }

  /**
   * 记录错误
   */
  recordError(
    message: string,
    filename?: string,
    lineno?: number,
    colno?: number,
    error?: Error
  ): void {
    if (!this.isEnabled) return;

    const errorEvent: ErrorEvent = {
      message,
      filename,
      lineno,
      colno,
      stack: error?.stack,
      timestamp: new Date(),
      url: window.location.href,
      userId: this.getCurrentUserId(),
      userAgent: navigator.userAgent
    };

    this.errors.push(errorEvent);
    
    // 保持数组大小
    if (this.errors.length > this.maxEntries) {
      this.errors = this.errors.slice(-this.maxEntries);
    }

    console.error('📊 前端错误记录:', errorEvent);
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): {
    pages: PagePerformance[];
    apis: ApiPerformance[];
    interactions: UserInteraction[];
    errors: ErrorEvent[];
    summary: {
      avgPageLoad: number;
      avgApiResponse: number;
      errorRate: number;
      interactionCount: number;
    };
  } {
    const summary = {
      avgPageLoad: this.pageMetrics.length > 0
        ? this.pageMetrics.reduce((sum, p) => sum + p.loadTime, 0) / this.pageMetrics.length
        : 0,
      avgApiResponse: this.apiMetrics.length > 0
        ? this.apiMetrics.reduce((sum, a) => sum + a.duration, 0) / this.apiMetrics.length
        : 0,
      errorRate: this.apiMetrics.length > 0
        ? this.apiMetrics.filter(a => a.statusCode >= 400).length / this.apiMetrics.length * 100
        : 0,
      interactionCount: this.interactions.length
    };

    return {
      pages: this.pageMetrics.slice(-50),
      apis: this.apiMetrics.slice(-100),
      interactions: this.interactions.slice(-100),
      errors: this.errors.slice(-50),
      summary
    };
  }

  /**
   * 发送性能数据到服务器
   */
  async reportToServer(): Promise<void> {
    if (!this.isEnabled || typeof uni === 'undefined') return;

    try {
      const stats = this.getPerformanceStats();
      
      const response = await uni.request({
        url: `${process.env.VUE_APP_API_BASE_URL}/api/monitor/frontend-performance`,
        method: 'POST',
        data: {
          timestamp: new Date(),
          ...stats
        },
        header: {
          'Content-Type': 'application/json'
        }
      });

      if (response.statusCode === 200) {
        // 清理已发送的数据
        this.clearOldData();
      }
    } catch (error) {
      console.error('发送性能数据失败:', error);
    }
  }

  /**
   * 启用/禁用性能监控
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.entries = [];
    this.pageMetrics = [];
    this.apiMetrics = [];
    this.interactions = [];
    this.errors = [];
  }

  /**
   * 设置页面性能跟踪
   */
  private setupPagePerformanceTracking(): void {
    if (typeof window === 'undefined') return;

    // 页面加载完成后记录性能
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.recordPagePerformance(window.location.href);
      }, 100);
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.mark('page-visible', 'page');
      } else {
        this.measure('page-visible');
      }
    });
  }

  /**
   * 设置错误跟踪
   */
  private setupErrorTracking(): void {
    if (typeof window === 'undefined') return;

    // 监听JavaScript错误
    window.addEventListener('error', (event) => {
      this.recordError(
        event.message,
        event.filename,
        event.lineno,
        event.colno,
        event.error
      );
    });

    // 监听未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(
        `未处理的Promise拒绝: ${event.reason}`,
        undefined,
        undefined,
        undefined,
        event.reason instanceof Error ? event.reason : undefined
      );
    });
  }

  /**
   * 设置交互跟踪
   */
  private setupInteractionTracking(): void {
    if (typeof window === 'undefined') return;

    // 监听点击事件
    document.addEventListener('click', (event) => {
      const target = this.getElementSelector(event.target as Element);
      this.recordInteraction('click', target);
    });

    // 监听滚动事件（节流）
    let scrollTimeout: number;
    document.addEventListener('scroll', () => {
      if (scrollTimeout) return;
      
      scrollTimeout = window.setTimeout(() => {
        this.recordInteraction('scroll', 'page', undefined, {
          scrollY: window.scrollY,
          scrollX: window.scrollX
        });
        scrollTimeout = 0;
      }, 100);
    });
  }

  /**
   * 定期上报数据
   */
  private startPeriodicReporting(): void {
    // 每5分钟上报一次
    setInterval(() => {
      this.reportToServer();
    }, 5 * 60 * 1000);

    // 页面卸载时上报
    window.addEventListener('beforeunload', () => {
      this.reportToServer();
    });
  }

  /**
   * 检查性能阈值
   */
  private checkThreshold(entry: PerformanceEntry): void {
    let threshold: number;
    
    switch (entry.type) {
      case 'api':
        threshold = this.thresholds.apiRequest;
        break;
      case 'page':
        threshold = this.thresholds.pageLoad;
        break;
      case 'component':
        threshold = this.thresholds.interaction;
        break;
      default:
        return;
    }

    if (entry.duration > threshold) {
      console.warn(`🐌 性能预警:`, {
        name: entry.name,
        type: entry.type,
        duration: `${entry.duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`
      });
    }
  }

  /**
   * 清理旧数据
   */
  private clearOldData(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    this.pageMetrics = this.pageMetrics.filter(p => p.timestamp.getTime() > oneHourAgo);
    this.apiMetrics = this.apiMetrics.filter(a => a.timestamp.getTime() > oneHourAgo);
    this.interactions = this.interactions.filter(i => i.timestamp.getTime() > oneHourAgo);
    this.errors = this.errors.filter(e => e.timestamp.getTime() > oneHourAgo);
  }

  /**
   * 获取当前用户ID
   */
  private getCurrentUserId(): string | undefined {
    try {
      const userStore = uni.getStorageSync('user');
      return userStore?.id;
    } catch {
      return undefined;
    }
  }

  /**
   * 清理URL中的敏感信息
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.search = ''; // 移除查询参数
      return urlObj.pathname;
    } catch {
      return url.split('?')[0];
    }
  }

  /**
   * 获取元素选择器
   */
  private getElementSelector(element: Element): string {
    if (!element) return 'unknown';
    
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor();

// 导出API装饰器
export function trackApi() {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      const apiName = `${target.constructor.name}.${propertyName}`;
      
      try {
        const result = await method.apply(this, args);
        const endTime = performance.now();
        
        performanceMonitor.recordApiCall(
          apiName,
          'METHOD',
          startTime,
          endTime,
          200
        );
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        
        performanceMonitor.recordApiCall(
          apiName,
          'METHOD',
          startTime,
          endTime,
          500
        );
        
        throw error;
      }
    };
    
    return descriptor;
  };
}

export { performanceMonitor };
export type { 
  PerformanceEntry, 
  PagePerformance, 
  ApiPerformance, 
  UserInteraction, 
  ErrorEvent 
};
