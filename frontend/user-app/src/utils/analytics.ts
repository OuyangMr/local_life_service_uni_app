interface UserEvent {
  eventType: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
  pageUrl: string;
  userAgent: string;
}

interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: Date;
  lastActivity: Date;
  pageViews: number;
  events: number;
  referrer?: string;
  device: {
    platform: string;
    brand?: string;
    model?: string;
    screenWidth: number;
    screenHeight: number;
  };
}

interface PageView {
  url: string;
  title: string;
  referrer?: string;
  timestamp: Date;
  duration?: number;
  userId?: string;
  sessionId: string;
}

interface ConversionEvent {
  eventName: string;
  value?: number;
  currency?: string;
  properties?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

class Analytics {
  private events: UserEvent[] = [];
  private pageViews: PageView[] = [];
  private conversions: ConversionEvent[] = [];
  private currentSession: UserSession;
  private currentPageStartTime: Date;
  private isEnabled: boolean = true;
  private flushInterval: number = 30000; // 30秒
  private maxEventsBatch: number = 50;

  constructor() {
    this.currentSession = this.initSession();
    this.currentPageStartTime = new Date();
    this.init();
  }

  /**
   * 初始化分析系统
   */
  private init(): void {
    if (typeof window === 'undefined') return;

    // 开始定期上传数据
    this.startPeriodicFlush();

    // 页面卸载时上传剩余数据
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.updateCurrentPageDuration();
      } else {
        this.currentPageStartTime = new Date();
      }
    });

    // 自动跟踪页面浏览
    this.trackPageView();
  }

  /**
   * 跟踪用户事件
   */
  track(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    const event: UserEvent = {
      eventType: 'track',
      eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        page_title: document.title
      },
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      sessionId: this.currentSession.sessionId,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent
    };

    this.events.push(event);
    this.currentSession.events++;
    this.currentSession.lastActivity = new Date();

    console.log('📊 用户事件:', eventName, properties);

    // 检查是否需要立即上传
    if (this.events.length >= this.maxEventsBatch) {
      this.flush();
    }
  }

  /**
   * 跟踪页面浏览
   */
  trackPageView(url?: string, title?: string): void {
    if (!this.isEnabled) return;

    // 更新上一个页面的停留时间
    this.updateCurrentPageDuration();

    const pageView: PageView = {
      url: url || window.location.href,
      title: title || document.title,
      referrer: document.referrer,
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      sessionId: this.currentSession.sessionId
    };

    this.pageViews.push(pageView);
    this.currentSession.pageViews++;
    this.currentSession.lastActivity = new Date();
    this.currentPageStartTime = new Date();

    console.log('📊 页面浏览:', pageView.url);

    // 自动跟踪页面浏览事件
    this.track('page_view', {
      page_url: pageView.url,
      page_title: pageView.title,
      referrer: pageView.referrer
    });
  }

  /**
   * 跟踪转化事件
   */
  trackConversion(
    eventName: string, 
    value?: number, 
    currency: string = 'CNY',
    properties: Record<string, any> = {}
  ): void {
    if (!this.isEnabled) return;

    const conversion: ConversionEvent = {
      eventName,
      value,
      currency,
      properties,
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      sessionId: this.currentSession.sessionId
    };

    this.conversions.push(conversion);

    console.log('📊 转化事件:', eventName, { value, currency, properties });

    // 同时作为普通事件跟踪
    this.track(`conversion_${eventName}`, {
      value,
      currency,
      ...properties
    });
  }

  /**
   * 识别用户
   */
  identify(userId: string, traits: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    this.currentSession.userId = userId;

    this.track('identify', {
      user_id: userId,
      ...traits
    });

    console.log('📊 用户识别:', userId, traits);
  }

  /**
   * 跟踪用户交互
   */
  trackInteraction(
    element: string,
    action: string,
    properties: Record<string, any> = {}
  ): void {
    this.track('interaction', {
      element,
      action,
      ...properties
    });
  }

  /**
   * 跟踪业务事件
   */
  trackBusiness(action: string, properties: Record<string, any> = {}): void {
    this.track(`business_${action}`, properties);
  }

  /**
   * 跟踪错误
   */
  trackError(
    error: Error | string,
    context: Record<string, any> = {}
  ): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'object' ? error.stack : undefined;

    this.track('error', {
      error_message: errorMessage,
      error_stack: errorStack,
      ...context
    });
  }

  /**
   * 设置用户属性
   */
  setUserProperties(properties: Record<string, any>): void {
    this.track('user_properties', properties);
  }

  /**
   * 业务专用跟踪方法
   */
  
  // 店铺相关
  trackStoreView(storeId: string, storeName: string): void {
    this.trackBusiness('store_view', {
      store_id: storeId,
      store_name: storeName
    });
  }

  trackStoreSearch(keyword: string, results: number): void {
    this.trackBusiness('store_search', {
      keyword,
      results_count: results
    });
  }

  // 预订相关
  trackBookingStart(storeId: string, spaceId: string): void {
    this.trackBusiness('booking_start', {
      store_id: storeId,
      space_id: spaceId
    });
  }

  trackBookingComplete(bookingId: string, amount: number): void {
    this.trackConversion('booking_complete', amount, 'CNY', {
      booking_id: bookingId
    });
  }

  trackBookingCancel(bookingId: string, reason?: string): void {
    this.trackBusiness('booking_cancel', {
      booking_id: bookingId,
      reason
    });
  }

  // 订单相关
  trackAddToCart(productId: string, quantity: number, price: number): void {
    this.trackBusiness('add_to_cart', {
      product_id: productId,
      quantity,
      price
    });
  }

  trackOrderStart(storeId: string, totalAmount: number): void {
    this.trackBusiness('order_start', {
      store_id: storeId,
      total_amount: totalAmount
    });
  }

  trackOrderComplete(orderId: string, amount: number, itemCount: number): void {
    this.trackConversion('order_complete', amount, 'CNY', {
      order_id: orderId,
      item_count: itemCount
    });
  }

  // 支付相关
  trackPaymentStart(amount: number, method: string): void {
    this.trackBusiness('payment_start', {
      amount,
      payment_method: method
    });
  }

  trackPaymentComplete(amount: number, method: string, orderId: string): void {
    this.trackConversion('payment_complete', amount, 'CNY', {
      payment_method: method,
      order_id: orderId
    });
  }

  trackPaymentFailed(amount: number, method: string, errorMessage: string): void {
    this.trackBusiness('payment_failed', {
      amount,
      payment_method: method,
      error_message: errorMessage
    });
  }

  // 用户行为
  trackLogin(method: string, userId: string): void {
    this.identify(userId);
    this.trackBusiness('login', {
      login_method: method
    });
  }

  trackLogout(): void {
    this.trackBusiness('logout', {});
  }

  trackRegister(method: string, userId: string): void {
    this.identify(userId);
    this.trackConversion('register', undefined, 'CNY', {
      register_method: method
    });
  }

  // 扫码相关
  trackQRScan(type: string, result: string): void {
    this.trackBusiness('qr_scan', {
      scan_type: type,
      scan_result: result
    });
  }

  /**
   * 获取分析数据
   */
  getAnalyticsData(): {
    session: UserSession;
    events: UserEvent[];
    pageViews: PageView[];
    conversions: ConversionEvent[];
  } {
    return {
      session: this.currentSession,
      events: this.events.slice(),
      pageViews: this.pageViews.slice(),
      conversions: this.conversions.slice()
    };
  }

  /**
   * 上传数据到服务器
   */
  async flush(): Promise<void> {
    if (!this.isEnabled || typeof uni === 'undefined') return;
    if (this.events.length === 0 && this.pageViews.length === 0 && this.conversions.length === 0) return;

    try {
      const payload = {
        session: this.currentSession,
        events: this.events,
        pageViews: this.pageViews,
        conversions: this.conversions,
        timestamp: new Date()
      };

      const response = await uni.request({
        url: `${process.env.VUE_APP_API_BASE_URL}/api/monitor/analytics`,
        method: 'POST',
        data: payload,
        header: {
          'Content-Type': 'application/json'
        }
      });

      if (response.statusCode === 200) {
        // 清理已上传的数据
        this.events = [];
        this.pageViews = [];
        this.conversions = [];
        
        console.log('📊 分析数据已上传');
      }
    } catch (error) {
      console.error('上传分析数据失败:', error);
    }
  }

  /**
   * 启用/禁用分析
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled) {
      this.flush(); // 禁用前上传剩余数据
    }
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.events = [];
    this.pageViews = [];
    this.conversions = [];
  }

  /**
   * 初始化会话
   */
  private initSession(): UserSession {
    const sessionId = this.generateSessionId();
    
    return {
      sessionId,
      userId: this.getCurrentUserId(),
      startTime: new Date(),
      lastActivity: new Date(),
      pageViews: 0,
      events: 0,
      referrer: document.referrer,
      device: this.getDeviceInfo()
    };
  }

  /**
   * 开始定期上传
   */
  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * 更新当前页面停留时间
   */
  private updateCurrentPageDuration(): void {
    if (this.pageViews.length > 0) {
      const lastPageView = this.pageViews[this.pageViews.length - 1];
      if (!lastPageView.duration) {
        lastPageView.duration = Date.now() - this.currentPageStartTime.getTime();
      }
    }
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
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取设备信息
   */
  private getDeviceInfo(): UserSession['device'] {
    const device: UserSession['device'] = {
      platform: 'unknown',
      screenWidth: 0,
      screenHeight: 0
    };

    if (typeof uni !== 'undefined') {
      try {
        const systemInfo = uni.getSystemInfoSync();
        device.platform = systemInfo.platform;
        device.brand = systemInfo.brand;
        device.model = systemInfo.model;
        device.screenWidth = systemInfo.screenWidth;
        device.screenHeight = systemInfo.screenHeight;
      } catch {
        // 使用默认值
      }
    } else if (typeof window !== 'undefined') {
      device.platform = navigator.platform;
      device.screenWidth = window.screen.width;
      device.screenHeight = window.screen.height;
    }

    return device;
  }
}

// 创建全局实例
const analytics = new Analytics();

// Vue插件安装
export function install(app: any): void {
  app.config.globalProperties.$analytics = analytics;
  app.provide('analytics', analytics);
}

// 导出装饰器
export function trackEvent(eventName: string, getProperties?: (args: any[]) => Record<string, any>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const properties = getProperties ? getProperties(args) : {};
      analytics.track(eventName, properties);
      
      return method.apply(this, args);
    };
    
    return descriptor;
  };
}

export { analytics };
export type {
  UserEvent,
  UserSession,
  PageView,
  ConversionEvent
};
