// 商户端性能监控
// 复用用户端的性能监控逻辑，并添加商户端特有的监控指标

export * from '../../../user-app/src/utils/performance';
export * from '../../../user-app/src/utils/analytics';
export * from '../../../user-app/src/utils/optimization';

import { performanceMonitor as basePerformanceMonitor } from '../../../user-app/src/utils/performance';
import { analytics as baseAnalytics } from '../../../user-app/src/utils/analytics';

/**
 * 商户端性能监控扩展
 */
class MerchantPerformanceMonitor {
  private performanceMonitor = basePerformanceMonitor;
  private analytics = baseAnalytics;

  /**
   * 跟踪商户端特有的业务性能
   */
  
  // 仪表板性能
  trackDashboardLoad(dataLoadTime: number, chartRenderTime: number): void {
    this.performanceMonitor.mark('dashboard_load', 'page', {
      data_load_time: dataLoadTime,
      chart_render_time: chartRenderTime
    });
  }

  // 订单管理性能
  trackOrderListLoad(orderCount: number, loadTime: number): void {
    this.performanceMonitor.mark('order_list_load', 'api', {
      order_count: orderCount,
      load_time: loadTime
    });
  }

  trackOrderUpdate(orderId: string, updateTime: number): void {
    this.performanceMonitor.mark('order_update', 'api', {
      order_id: orderId,
      update_time: updateTime
    });
  }

  // 商品管理性能
  trackProductListLoad(productCount: number, loadTime: number): void {
    this.performanceMonitor.mark('product_list_load', 'api', {
      product_count: productCount,
      load_time: loadTime
    });
  }

  trackProductImageUpload(imageSize: number, uploadTime: number): void {
    this.performanceMonitor.mark('product_image_upload', 'api', {
      image_size: imageSize,
      upload_time: uploadTime
    });
  }

  // 空间管理性能
  trackSpaceListLoad(spaceCount: number, loadTime: number): void {
    this.performanceMonitor.mark('space_list_load', 'api', {
      space_count: spaceCount,
      load_time: loadTime
    });
  }

  trackSpaceStatusUpdate(spaceId: string, updateTime: number): void {
    this.performanceMonitor.mark('space_status_update', 'api', {
      space_id: spaceId,
      update_time: updateTime
    });
  }

  // 实时数据性能
  trackRealtimeDataSync(syncTime: number, dataSize: number): void {
    this.performanceMonitor.mark('realtime_data_sync', 'custom', {
      sync_time: syncTime,
      data_size: dataSize
    });
  }

  // 报表性能
  trackReportGeneration(reportType: string, generationTime: number, dataPoints: number): void {
    this.performanceMonitor.mark('report_generation', 'custom', {
      report_type: reportType,
      generation_time: generationTime,
      data_points: dataPoints
    });
  }

  // 批量操作性能
  trackBatchOperation(operation: string, itemCount: number, processingTime: number): void {
    this.performanceMonitor.mark('batch_operation', 'custom', {
      operation,
      item_count: itemCount,
      processing_time: processingTime
    });
  }
}

/**
 * 商户端用户行为分析扩展
 */
class MerchantAnalytics {
  private analytics = baseAnalytics;

  /**
   * 商户端专用事件跟踪
   */

  // 商户操作
  trackMerchantLogin(merchantId: string, storeId: string): void {
    this.analytics.identify(merchantId, {
      role: 'merchant',
      store_id: storeId
    });
    this.analytics.track('merchant_login', {
      merchant_id: merchantId,
      store_id: storeId
    });
  }

  trackStoreManagement(action: string, resourceType: string, resourceId: string): void {
    this.analytics.track('store_management', {
      action,
      resource_type: resourceType,
      resource_id: resourceId
    });
  }

  // 订单处理
  trackOrderProcessing(action: string, orderId: string, processingTime: number): void {
    this.analytics.track('order_processing', {
      action,
      order_id: orderId,
      processing_time: processingTime
    });
  }

  trackBatchOrderProcessing(action: string, orderCount: number, totalTime: number): void {
    this.analytics.track('batch_order_processing', {
      action,
      order_count: orderCount,
      total_time: totalTime,
      average_time: totalTime / orderCount
    });
  }

  // 商品管理
  trackProductManagement(action: string, productId: string, category?: string): void {
    this.analytics.track('product_management', {
      action,
      product_id: productId,
      category
    });
  }

  trackInventoryUpdate(productId: string, oldStock: number, newStock: number): void {
    this.analytics.track('inventory_update', {
      product_id: productId,
      old_stock: oldStock,
      new_stock: newStock,
      stock_change: newStock - oldStock
    });
  }

  // 空间管理
  trackSpaceManagement(action: string, spaceId: string, spaceType?: string): void {
    this.analytics.track('space_management', {
      action,
      space_id: spaceId,
      space_type: spaceType
    });
  }

  trackSpaceUtilization(spaceId: string, utilizationRate: number, period: string): void {
    this.analytics.track('space_utilization', {
      space_id: spaceId,
      utilization_rate: utilizationRate,
      period
    });
  }

  // 营业数据
  trackRevenueReport(period: string, revenue: number, orderCount: number): void {
    this.analytics.track('revenue_report_view', {
      period,
      revenue,
      order_count: orderCount,
      average_order_value: revenue / orderCount
    });
  }

  trackDashboardInteraction(widget: string, action: string): void {
    this.analytics.track('dashboard_interaction', {
      widget,
      action
    });
  }

  // 客户服务
  trackCustomerService(action: string, customerId: string, issue?: string): void {
    this.analytics.track('customer_service', {
      action,
      customer_id: customerId,
      issue
    });
  }

  // 营销活动
  trackPromotionManagement(action: string, promotionId: string, promotionType: string): void {
    this.analytics.track('promotion_management', {
      action,
      promotion_id: promotionId,
      promotion_type: promotionType
    });
  }

  // 数据导出
  trackDataExport(dataType: string, format: string, recordCount: number): void {
    this.analytics.track('data_export', {
      data_type: dataType,
      format,
      record_count: recordCount
    });
  }

  // 系统设置
  trackSystemSettings(action: string, setting: string, value?: any): void {
    this.analytics.track('system_settings', {
      action,
      setting,
      value
    });
  }
}

// 创建商户端专用实例
export const merchantPerformanceMonitor = new MerchantPerformanceMonitor();
export const merchantAnalytics = new MerchantAnalytics();

// 重新导出基础功能
export const performanceMonitor = basePerformanceMonitor;
export const analytics = baseAnalytics;
