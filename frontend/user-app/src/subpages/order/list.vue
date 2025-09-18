<template>
  <view class="order-list-page">
    <view class="order-tabs">
      <view 
        v-for="tab in tabs" 
        :key="tab.key"
        class="tab-item"
        :class="{ active: currentTab === tab.key }"
        @tap="onTabChange(tab.key)"
      >
        <text>{{ tab.label }}</text>
      </view>
    </view>
    
    <scroll-view 
      class="order-content"
      scroll-y
      @scrolltolower="loadMore"
      refresher-enabled
      @refresherrefresh="onRefresh"
      :refresher-triggered="refreshing"
    >
      <view v-if="orders.length === 0 && !loading" class="empty-state">
        <text class="empty-text">暂无订单</text>
      </view>
      
      <view v-else class="order-list">
        <view 
          v-for="order in orders" 
          :key="order.id"
          class="order-item"
          @tap="goToOrderDetail(order.id)"
        >
          <view class="order-header">
            <text class="order-number">订单号: {{ order.orderNumber }}</text>
            <text class="order-status" :class="order.status">{{ getStatusText(order.status) }}</text>
          </view>
          
          <view class="order-products">
            <view 
              v-for="product in order.products" 
              :key="product.id"
              class="product-item"
            >
              <image :src="product.image" class="product-image" />
              <view class="product-info">
                <text class="product-name">{{ product.name }}</text>
                <text class="product-price">¥{{ product.price }}</text>
              </view>
              <text class="product-quantity">x{{ product.quantity }}</text>
            </view>
          </view>
          
          <view class="order-footer">
            <text class="order-total">总计: ¥{{ order.totalAmount }}</text>
            <view class="order-actions">
              <button 
                v-if="order.status === 'pending'"
                class="btn-cancel"
                @tap.stop="cancelOrder(order.id)"
              >
                取消订单
              </button>
              <button 
                v-if="order.status === 'paid'"
                class="btn-confirm"
                @tap.stop="confirmOrder(order.id)"
              >
                确认收货
              </button>
            </view>
          </view>
        </view>
      </view>
      
      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待付款' },
  { key: 'paid', label: '已付款' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' }
]

const currentTab = ref('all')
const orders = ref<any[]>([])
const loading = ref(false)
const refreshing = ref(false)

const loadOrders = async (refresh = false) => {
  if (refresh) {
    refreshing.value = true
  } else {
    loading.value = true
  }
  
  try {
    // TODO: 实现订单加载
    await new Promise(resolve => setTimeout(resolve, 1000))
    orders.value = []
  } catch (error) {
    console.error('加载订单失败:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onTabChange = (tab: string) => {
  currentTab.value = tab
  loadOrders()
}

const onRefresh = () => {
  loadOrders(true)
}

const loadMore = () => {
  // TODO: 实现加载更多
}

const goToOrderDetail = (orderId: string) => {
  uni.navigateTo({
    url: `/subpages/order/detail?id=${orderId}`
  })
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待付款',
    paid: '已付款',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || '未知'
}

const cancelOrder = async (orderId: string) => {
  // TODO: 实现取消订单
}

const confirmOrder = async (orderId: string) => {
  // TODO: 实现确认收货
}

onMounted(() => {
  loadOrders()
})
</script>

<style lang="scss" scoped>
.order-list-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f7fa;
}

.order-tabs {
  display: flex;
  background: white;
  border-bottom: 1rpx solid #e0e0e0;
  
  .tab-item {
    flex: 1;
    padding: 30rpx 0;
    text-align: center;
    font-size: 28rpx;
    color: #666;
    
    &.active {
      color: #667eea;
      border-bottom: 4rpx solid #667eea;
    }
  }
}

.order-content {
  flex: 1;
  padding: 20rpx;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  
  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
}

.order-list {
  .order-item {
    background: white;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    overflow: hidden;
    
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx;
      border-bottom: 1rpx solid #f0f0f0;
      
      .order-number {
        font-size: 26rpx;
        color: #666;
      }
      
      .order-status {
        font-size: 26rpx;
        
        &.pending { color: #ff9800; }
        &.paid { color: #2196f3; }
        &.completed { color: #4caf50; }
        &.cancelled { color: #f44336; }
      }
    }
    
    .order-products {
      .product-item {
        display: flex;
        align-items: center;
        padding: 20rpx;
        border-bottom: 1rpx solid #f8f8f8;
        
        &:last-child {
          border-bottom: none;
        }
        
        .product-image {
          width: 80rpx;
          height: 80rpx;
          border-radius: 8rpx;
          margin-right: 20rpx;
        }
        
        .product-info {
          flex: 1;
          
          .product-name {
            display: block;
            font-size: 28rpx;
            color: #333;
            margin-bottom: 8rpx;
          }
          
          .product-price {
            font-size: 26rpx;
            color: #ff6b6b;
          }
        }
        
        .product-quantity {
          font-size: 26rpx;
          color: #666;
        }
      }
    }
    
    .order-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx;
      background: #fafafa;
      
      .order-total {
        font-size: 30rpx;
        font-weight: bold;
        color: #333;
      }
      
      .order-actions {
        display: flex;
        gap: 20rpx;
        
        .btn-cancel, .btn-confirm {
          padding: 12rpx 24rpx;
          border: none;
          border-radius: 6rpx;
          font-size: 24rpx;
        }
        
        .btn-cancel {
          background: #f5f5f5;
          color: #666;
        }
        
        .btn-confirm {
          background: #667eea;
          color: white;
        }
      }
    }
  }
}

.loading {
  text-align: center;
  padding: 30rpx 0;
  color: #999;
}
</style>
