interface LazyLoadOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  loading?: 'lazy' | 'eager';
  placeholder?: string;
}

interface CacheOptions {
  maxAge?: number; // 毫秒
  maxSize?: number; // 条目数
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
}

interface PreloadOptions {
  priority?: 'high' | 'normal' | 'low';
  as?: 'script' | 'style' | 'image' | 'font';
  crossorigin?: 'anonymous' | 'use-credentials';
}

/**
 * 图片懒加载管理器
 */
class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private images: Map<Element, string> = new Map();
  private options: LazyLoadOptions;

  constructor(options: LazyLoadOptions = {}) {
    this.options = {
      rootMargin: '50px',
      threshold: 0.1,
      loading: 'lazy',
      placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNGNUY1RjUiLz48L3N2Zz4=',
      ...options
    };

    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
        }
      });
    }, this.options);
  }

  /**
   * 添加图片到懒加载队列
   */
  observe(img: Element, src: string): void {
    if (!this.observer) return;

    this.images.set(img, src);
    
    // 设置占位符
    if (img instanceof HTMLImageElement) {
      img.src = this.options.placeholder!;
      img.loading = this.options.loading!;
    }

    this.observer.observe(img);
  }

  /**
   * 停止观察图片
   */
  unobserve(img: Element): void {
    if (!this.observer) return;

    this.observer.unobserve(img);
    this.images.delete(img);
  }

  /**
   * 加载图片
   */
  private loadImage(img: Element): void {
    const src = this.images.get(img);
    if (!src || !(img instanceof HTMLImageElement)) return;

    // 预加载图片
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      img.classList.add('loaded');
      this.unobserve(img);
    };
    tempImg.onerror = () => {
      img.classList.add('error');
      this.unobserve(img);
    };
    tempImg.src = src;
  }

  /**
   * 销毁懒加载器
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.images.clear();
  }
}

/**
 * 智能缓存管理器
 */
class SmartCache<T = any> {
  private cache: Map<string, { data: T; timestamp: number; accessCount: number }> = new Map();
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxAge: 5 * 60 * 1000, // 5分钟
      maxSize: 100,
      storage: 'memory',
      ...options
    };

    // 定期清理过期数据
    setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 设置缓存
   */
  set(key: string, data: T): void {
    // 如果缓存已满，删除最少使用的项
    if (this.cache.size >= this.options.maxSize) {
      this.evictLeastUsed();
    }

    const item = {
      data,
      timestamp: Date.now(),
      accessCount: 0
    };

    this.cache.set(key, item);

    // 同步到指定存储
    if (this.options.storage !== 'memory') {
      this.syncToStorage(key, item);
    }
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      // 尝试从存储中恢复
      const restored = this.restoreFromStorage(key);
      if (restored) {
        this.cache.set(key, restored);
        return restored.data;
      }
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > this.options.maxAge) {
      this.delete(key);
      return null;
    }

    // 更新访问计数
    item.accessCount++;
    return item.data;
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (this.options.storage !== 'memory') {
      this.removeFromStorage(key);
    }
    
    return deleted;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    
    if (this.options.storage !== 'memory') {
      this.clearStorage();
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const timestamps = Array.from(this.cache.values()).map(item => item.timestamp);
    
    return {
      size: this.cache.size,
      hitRate: this.calculateHitRate(),
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  /**
   * 清理过期数据
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > this.options.maxAge) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * 淘汰最少使用的缓存项
   */
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastAccessCount = Infinity;

    this.cache.forEach((item, key) => {
      if (item.accessCount < leastAccessCount) {
        leastAccessCount = item.accessCount;
        leastUsedKey = key;
      }
    });

    if (leastUsedKey) {
      this.delete(leastUsedKey);
    }
  }

  /**
   * 计算缓存命中率
   */
  private calculateHitRate(): number {
    if (this.cache.size === 0) return 0;
    
    const totalAccess = Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.accessCount, 0);
    
    return totalAccess / this.cache.size;
  }

  /**
   * 同步到存储
   */
  private syncToStorage(key: string, item: any): void {
    try {
      const storage = this.options.storage === 'localStorage' ? localStorage : sessionStorage;
      storage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('缓存同步到存储失败:', error);
    }
  }

  /**
   * 从存储恢复
   */
  private restoreFromStorage(key: string): any | null {
    try {
      const storage = this.options.storage === 'localStorage' ? localStorage : sessionStorage;
      const stored = storage.getItem(`cache_${key}`);
      
      if (stored) {
        const item = JSON.parse(stored);
        
        // 检查是否过期
        if (Date.now() - item.timestamp <= this.options.maxAge) {
          return item;
        } else {
          storage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('从存储恢复缓存失败:', error);
    }
    
    return null;
  }

  /**
   * 从存储中删除
   */
  private removeFromStorage(key: string): void {
    try {
      const storage = this.options.storage === 'localStorage' ? localStorage : sessionStorage;
      storage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('从存储删除缓存失败:', error);
    }
  }

  /**
   * 清空存储
   */
  private clearStorage(): void {
    try {
      const storage = this.options.storage === 'localStorage' ? localStorage : sessionStorage;
      const keys = Object.keys(storage).filter(key => key.startsWith('cache_'));
      keys.forEach(key => storage.removeItem(key));
    } catch (error) {
      console.warn('清空存储缓存失败:', error);
    }
  }
}

/**
 * 资源预加载管理器
 */
class ResourcePreloader {
  private preloadedUrls: Set<string> = new Set();

  /**
   * 预加载资源
   */
  preload(url: string, options: PreloadOptions = {}): Promise<void> {
    if (this.preloadedUrls.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      if (options.as) {
        link.as = options.as;
      }
      
      if (options.crossorigin) {
        link.crossOrigin = options.crossorigin;
      }

      link.onload = () => {
        this.preloadedUrls.add(url);
        resolve();
      };
      
      link.onerror = () => {
        reject(new Error(`预加载失败: ${url}`));
      };

      document.head.appendChild(link);
    });
  }

  /**
   * 预加载图片
   */
  preloadImage(url: string): Promise<void> {
    if (this.preloadedUrls.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.preloadedUrls.add(url);
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error(`图片预加载失败: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * 批量预加载图片
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.preloadImage(url));
    await Promise.allSettled(promises);
  }

  /**
   * 预加载字体
   */
  preloadFont(url: string): Promise<void> {
    return this.preload(url, { as: 'font', crossorigin: 'anonymous' });
  }

  /**
   * 检查资源是否已预加载
   */
  isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url);
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = undefined;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 动态导入组件（代码分割）
 */
export function loadComponent(loader: () => Promise<any>): Promise<any> {
  return loader().catch(error => {
    console.error('组件加载失败:', error);
    // 返回错误组件或重试
    return import('@/components/ErrorComponent.vue');
  });
}

/**
 * 图片压缩
 */
export function compressImage(
  file: File,
  quality: number = 0.8,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 计算新尺寸
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制并压缩
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('图片压缩失败'));
        }
      }, 'image/jpeg', quality);
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 网络状态监控
 */
export class NetworkMonitor {
  private callbacks: ((online: boolean) => void)[] = [];
  
  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.notifyCallbacks(true));
      window.addEventListener('offline', () => this.notifyCallbacks(false));
    }
  }

  /**
   * 检查网络状态
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * 添加状态变化监听器
   */
  addListener(callback: (online: boolean) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除状态变化监听器
   */
  removeListener(callback: (online: boolean) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  private notifyCallbacks(online: boolean): void {
    this.callbacks.forEach(callback => callback(online));
  }
}

// 创建全局实例
export const lazyImageLoader = new LazyImageLoader();
export const smartCache = new SmartCache();
export const resourcePreloader = new ResourcePreloader();
export const networkMonitor = new NetworkMonitor();

// 导出类型
export type {
  LazyLoadOptions,
  CacheOptions,
  PreloadOptions
};
