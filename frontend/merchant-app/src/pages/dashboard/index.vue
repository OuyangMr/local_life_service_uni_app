<template>
  <view class="dashboard-container">
    <!-- 顶部头部 -->
    <view class="dashboard-header">
      <view class="header-content">
        <view class="merchant-info">
          <image
            class="merchant-avatar"
            :src="merchant?.avatar || '/static/images/default-avatar.png'"
            mode="aspectFill"
          />
          <view class="merchant-details">
            <text class="merchant-name">{{ merchant?.name || '商户名称' }}</text>
            <text class="merchant-status" :class="merchant?.status">
              {{ getStatusText(merchant?.status) }}
            </text>
          </view>
        </view>
        
        <view class="header-actions">
          <view class="notification-btn" @click="handleNotifications">
            <text class="icon">🔔</text>
            <view v-if="unreadNotifications > 0" class="badge">{{ unreadNotifications }}</view>
          </view>
          <view class="settings-btn" @click="handleSettings">
            <text class="icon">⚙️</text>
          </view>
        </view>
      </view>
      
      <!-- 快速操作按钮 -->
      <view class="quick-actions">
        <view class="action-item" @click="handleScanCode">
          <text class="action-icon">📱</text>
          <text class="action-text">扫码点餐</text>
        </view>
        <view class="action-item" @click="handleAddOrder">
          <text class="action-icon">➕</text>
          <text class="action-text">新建订单</text>
        </view>
        <view class="action-item" @click="handleRoomStatus">
          <text class="action-icon">🏠</text>
          <text class="action-text">包间状态</text>
        </view>
        <view class="action-item" @click="handleFinance">
          <text class="action-icon">💰</text>
          <text class="action-text">财务统计</text>
        </view>
      </view>
    </view>
    
    <!-- 今日数据统计 -->
    <view class="stats-section">
      <view class="section-title">
        <text class="title-text">📊 今日数据</text>
        <text class="subtitle-text">{{ currentDate }}</text>
      </view>
      
      <view class="stats-grid">
        <view class="stat-card revenue">
          <view class="stat-header">
            <text class="stat-icon">💰</text>
            <text class="stat-label">今日营收</text>
          </view>
          <text class="stat-value">¥{{ formatCurrency(dashboardStats.todayRevenue) }}</text>
          <view class="stat-trend">
            <text class="trend-icon" :class="revenueGrowth >= 0 ? 'up' : 'down'">
              {{ revenueGrowth >= 0 ? '📈' : '📉' }}
            </text>
            <text class="trend-text">
              {{ revenueGrowth >= 0 ? '+' : '' }}{{ revenueGrowth.toFixed(1) }}%
            </text>
          </view>
        </view>
        
        <view class="stat-card orders">
          <view class="stat-header">
            <text class="stat-icon">📋</text>
            <text class="stat-label">今日订单</text>
          </view>
          <text class="stat-value">{{ dashboardStats.todayOrders }}</text>
          <view class="stat-trend">
            <text class="trend-icon" :class="orderGrowth >= 0 ? 'up' : 'down'">
              {{ orderGrowth >= 0 ? '📈' : '📉' }}
            </text>
            <text class="trend-text">
              {{ orderGrowth >= 0 ? '+' : '' }}{{ orderGrowth.toFixed(1) }}%
            </text>
          </view>
        </view>
        
        <view class="stat-card rooms">
          <view class="stat-header">
            <text class="stat-icon">🏠</text>
            <text class="stat-label">使用包间</text>
          </view>
          <text class="stat-value">{{ dashboardStats.activeRooms }}/{{ dashboardStats.totalRooms }}</text>
          <view class="stat-trend">
            <text class="usage-rate">使用率{{ roomUsageRate }}%</text>
          </view>
        </view>
        
        <view class="stat-card pending">
          <view class="stat-header">
            <text class="stat-icon">⏰</text>
            <text class="stat-label">待处理</text>
          </view>
          <text class="stat-value">{{ dashboardStats.pendingOrders }}</text>
          <view class="stat-trend">
            <text class="urgency" :class="dashboardStats.pendingOrders > 5 ? 'high' : 'normal'">
              {{ dashboardStats.pendingOrders > 5 ? '需关注' : '正常' }}
            </text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 业务管理入口 -->
    <view class="business-section">
      <view class="section-title">
        <text class="title-text">🏢 业务管理</text>
        <text class="subtitle-text">一站式管理您的业务</text>
      </view>
      
      <view class="business-grid">
        <view class="business-card" @click="navigateToOrders">
          <view class="card-header">
            <text class="card-icon">📋</text>
            <text class="card-title">订单管理</text>
          </view>
          <text class="card-desc">处理订单、查看进度、管理退款</text>
          <view class="card-stats">
            <text class="stat-item">待处理 {{ dashboardStats.pendingOrders }}</text>
            <text class="stat-item">今日 {{ dashboardStats.todayOrders }}</text>
          </view>
        </view>
        
        <view class="business-card" @click="navigateToRooms">
          <view class="card-header">
            <text class="card-icon">🏠</text>
            <text class="card-title">包间管理</text>
          </view>
          <text class="card-desc">包间状态、设备管理、清洁维护</text>
          <view class="card-stats">
            <text class="stat-item">使用中 {{ dashboardStats.activeRooms }}</text>
            <text class="stat-item">总计 {{ dashboardStats.totalRooms }}</text>
          </view>
        </view>
        
        <view class="business-card" @click="navigateToProducts">
          <view class="card-header">
            <text class="card-icon">🍽️</text>
            <text class="card-title">菜单管理</text>
          </view>
          <text class="card-desc">商品价格、库存管理、分类设置</text>
          <view class="card-stats">
            <text class="stat-item">在售 {{ availableProducts }}</text>
            <text class="stat-item">缺货 {{ outOfStockProducts }}</text>
          </view>
        </view>
        
        <view class="business-card" @click="navigateToAnalytics">
          <view class="card-header">
            <text class="card-icon">📈</text>
            <text class="card-title">数据分析</text>
          </view>
          <text class="card-desc">营收趋势、客户分析、热销商品</text>
          <view class="card-stats">
            <text class="stat-item">本月营收 ¥{{ formatCurrency(monthlyRevenue) }}</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 最新订单 -->
    <view class="recent-orders-section">
      <view class="section-title">
        <text class="title-text">📝 最新订单</text>
        <text class="subtitle-text" @click="navigateToOrders">查看全部 ></text>
      </view>
      
      <view class="orders-list">
        <view
          v-for="order in recentOrders"
          :key="order.id"
          class="order-item"
          @click="handleOrderDetail(order)"
        >
          <view class="order-header">
            <text class="order-no">#{{ order.orderNo }}</text>
            <view class="order-status" :class="order.status">
              <text class="status-text">{{ getOrderStatusText(order.status) }}</text>
            </view>
          </view>
          
          <view class="order-content">
            <text class="customer-name">{{ order.customerName }}</text>
            <text class="order-time">{{ formatTime(order.createdAt) }}</text>
          </view>
          
          <view class="order-footer">
            <text class="order-amount">¥{{ order.totalAmount.toFixed(2) }}</text>
            <text class="room-info" v-if="order.roomName">{{ order.roomName }}</text>
          </view>
        </view>
        
        <view v-if="recentOrders.length === 0" class="empty-state">
          <text class="empty-icon">📝</text>
          <text class="empty-text">暂无新订单</text>
        </view>
      </view>
    </view>
    
    <!-- 底部工具栏 -->
    <view class="toolbar">
      <button class="tool-btn" @click="handleRefresh">
        <text class="btn-icon">🔄</text>
        <text class="btn-text">刷新</text>
      </button>
      <button class="tool-btn" @click="handleHelp">
        <text class="btn-icon">❓</text>
        <text class="btn-text">帮助</text>
      </button>
      <button class="tool-btn logout-btn" @click="handleLogout">
        <text class="btn-icon">🚪</text>
        <text class="btn-text">退出</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onPullDownRefresh } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { DashboardStats, Order, Merchant } from '@/types'

// Store
const authStore = useAuthStore()

// 响应式数据
const dashboardStats = ref<DashboardStats>({
  totalOrders: 0,
  todayOrders: 0,
  totalRevenue: 0,
  todayRevenue: 0,
  activeRooms: 0,
  totalRooms: 0,
  pendingOrders: 0,
  completedOrders: 0
})

const recentOrders = ref<Order[]>([])
const unreadNotifications = ref(3)
const availableProducts = ref(156)
const outOfStockProducts = ref(8)
const monthlyRevenue = ref(125680)
const yesterdayRevenue = ref(2150)
const yesterdayOrders = ref(18)

// 计算属性
const merchant = computed(() => authStore.merchant)

const currentDate = computed(() => {
  const today = new Date()
  return `${today.getMonth() + 1}月${today.getDate()}日`
})

const revenueGrowth = computed(() => {
  if (yesterdayRevenue.value === 0) return 0
  return ((dashboardStats.value.todayRevenue - yesterdayRevenue.value) / yesterdayRevenue.value) * 100
})

const orderGrowth = computed(() => {
  if (yesterdayOrders.value === 0) return 0
  return ((dashboardStats.value.todayOrders - yesterdayOrders.value) / yesterdayOrders.value) * 100
})

const roomUsageRate = computed(() => {
  if (dashboardStats.value.totalRooms === 0) return 0
  return Math.round((dashboardStats.value.activeRooms / dashboardStats.value.totalRooms) * 100)
})

// 方法
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const formatTime = (timeStr: string) => {
  const time = new Date(timeStr)
  return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
}

const getStatusText = (status?: string) => {
  const statusMap = {
    'active': '营业中',
    'inactive': '已停业',
    'pending': '审核中'
  }
  return statusMap[status as keyof typeof statusMap] || '未知状态'
}

const getOrderStatusText = (status: string) => {
  const statusMap = {
    'pending': '待确认',
    'confirmed': '已确认',
    'preparing': '制作中',
    'ready': '待取餐',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

// 事件处理
const handleNotifications = () => {
  uni.navigateTo({
    url: '/pages/notifications/index'
  })
}

const handleSettings = () => {
  uni.navigateTo({
    url: '/pages/settings/index'
  })
}

const handleScanCode = () => {
  uni.scanCode({
    success: (res) => {
      console.log('扫码结果:', res)
      // 处理扫码结果
    },
    fail: (err) => {
      console.error('扫码失败:', err)
    }
  })
}

const handleAddOrder = () => {
  uni.navigateTo({
    url: '/pages/orders/create'
  })
}

const handleRoomStatus = () => {
  navigateToRooms()
}

const handleFinance = () => {
  navigateToAnalytics()
}

const navigateToOrders = () => {
  uni.navigateTo({
    url: '/pages/orders/index'
  })
}

const navigateToRooms = () => {
  uni.navigateTo({
    url: '/pages/rooms/index'
  })
}

const navigateToProducts = () => {
  uni.navigateTo({
    url: '/pages/products/index'
  })
}

const navigateToAnalytics = () => {
  uni.navigateTo({
    url: '/pages/analytics/index'
  })
}

const handleOrderDetail = (order: Order) => {
  uni.navigateTo({
    url: `/pages/orders/detail?id=${order.id}`
  })
}

const handleRefresh = async () => {
  await loadDashboardData()
  uni.showToast({
    title: '刷新成功',
    icon: 'success'
  })
}

const handleHelp = () => {
  uni.navigateTo({
    url: '/pages/help/index'
  })
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        authStore.logout()
      }
    }
  })
}

// 数据加载
const loadDashboardData = async () => {
  try {
    // 模拟API调用
    const response = await uni.request({
      url: '/api/merchant/dashboard',
      method: 'GET',
      header: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    
    if (response.data.code === 200) {
      dashboardStats.value = response.data.data.stats
      recentOrders.value = response.data.data.recentOrders
    }
  } catch (error) {
    console.error('加载仪表板数据失败:', error)
    // 使用模拟数据
    dashboardStats.value = {
      totalOrders: 1256,
      todayOrders: 23,
      totalRevenue: 125680.50,
      todayRevenue: 2680.50,
      activeRooms: 8,
      totalRooms: 12,
      pendingOrders: 5,
      completedOrders: 18
    }
    
    recentOrders.value = [
      {
        id: '1',
        orderNo: 'KTV20241201001',
        type: 'room',
        customerId: 'c1',
        customerName: '张先生',
        customerPhone: '138****1234',
        roomId: 'r1',
        roomName: '豪华包间A',
        items: [],
        totalAmount: 298.00,
        status: 'pending',
        paymentStatus: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }
}

// 生命周期
onMounted(() => {
  loadDashboardData()
})

onPullDownRefresh(() => {
  loadDashboardData().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<style lang="scss" scoped>
.dashboard-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 120rpx;
}

.dashboard-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx 30rpx;
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40rpx;
    
    .merchant-info {
      display: flex;
      align-items: center;
      
      .merchant-avatar {
        width: 80rpx;
        height: 80rpx;
        border-radius: 50%;
        margin-right: 20rpx;
        border: 3rpx solid rgba(255, 255, 255, 0.3);
      }
      
      .merchant-details {
        .merchant-name {
          display: block;
          font-size: 32rpx;
          font-weight: bold;
          color: white;
          margin-bottom: 8rpx;
        }
        
        .merchant-status {
          font-size: 24rpx;
          padding: 6rpx 12rpx;
          border-radius: 12rpx;
          
          &.active {
            background: rgba(76, 175, 80, 0.2);
            color: #4caf50;
          }
          
          &.inactive {
            background: rgba(244, 67, 54, 0.2);
            color: #f44336;
          }
          
          &.pending {
            background: rgba(255, 193, 7, 0.2);
            color: #ffc107;
          }
        }
      }
    }
    
    .header-actions {
      display: flex;
      gap: 20rpx;
      
      .notification-btn,
      .settings-btn {
        position: relative;
        width: 60rpx;
        height: 60rpx;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .icon {
          font-size: 24rpx;
        }
        
        .badge {
          position: absolute;
          top: -5rpx;
          right: -5rpx;
          min-width: 30rpx;
          height: 30rpx;
          background: #ff4757;
          color: white;
          font-size: 20rpx;
          border-radius: 15rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 8rpx;
        }
        
        &:active {
          opacity: 0.7;
        }
      }
    }
  }
  
  .quick-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20rpx;
    
    .action-item {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 16rpx;
      padding: 24rpx;
      text-align: center;
      backdrop-filter: blur(10rpx);
      
      .action-icon {
        display: block;
        font-size: 36rpx;
        margin-bottom: 12rpx;
      }
      
      .action-text {
        font-size: 24rpx;
        color: white;
      }
      
      &:active {
        opacity: 0.8;
        transform: scale(0.95);
      }
    }
  }
}

.stats-section,
.business-section,
.recent-orders-section {
  margin: 30rpx 30rpx 40rpx;
  
  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .title-text {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .subtitle-text {
      font-size: 26rpx;
      color: #666;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  
  .stat-card {
    background: white;
    border-radius: 16rpx;
    padding: 30rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
    
    .stat-header {
      display: flex;
      align-items: center;
      margin-bottom: 20rpx;
      
      .stat-icon {
        font-size: 32rpx;
        margin-right: 12rpx;
      }
      
      .stat-label {
        font-size: 26rpx;
        color: #666;
      }
    }
    
    .stat-value {
      display: block;
      font-size: 40rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 16rpx;
    }
    
    .stat-trend {
      display: flex;
      align-items: center;
      
      .trend-icon {
        font-size: 20rpx;
        margin-right: 8rpx;
        
        &.up {
          color: #52c41a;
        }
        
        &.down {
          color: #ff4d4f;
        }
      }
      
      .trend-text {
        font-size: 22rpx;
        color: #666;
      }
      
      .usage-rate {
        font-size: 22rpx;
        color: #1890ff;
      }
      
      .urgency {
        font-size: 22rpx;
        
        &.high {
          color: #ff4d4f;
        }
        
        &.normal {
          color: #52c41a;
        }
      }
    }
  }
}

.business-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  
  .business-card {
    background: white;
    border-radius: 16rpx;
    padding: 30rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
    
    .card-header {
      display: flex;
      align-items: center;
      margin-bottom: 16rpx;
      
      .card-icon {
        font-size: 32rpx;
        margin-right: 12rpx;
      }
      
      .card-title {
        font-size: 28rpx;
        font-weight: bold;
        color: #333;
      }
    }
    
    .card-desc {
      font-size: 24rpx;
      color: #666;
      line-height: 1.4;
      margin-bottom: 20rpx;
    }
    
    .card-stats {
      display: flex;
      gap: 16rpx;
      
      .stat-item {
        font-size: 22rpx;
        color: #1890ff;
        background: #f0f8ff;
        padding: 6rpx 12rpx;
        border-radius: 8rpx;
      }
    }
    
    &:active {
      opacity: 0.8;
      transform: scale(0.98);
    }
  }
}

.orders-list {
  .order-item {
    background: white;
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
    
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;
      
      .order-no {
        font-size: 26rpx;
        font-weight: bold;
        color: #333;
      }
      
      .order-status {
        padding: 6rpx 12rpx;
        border-radius: 8rpx;
        font-size: 22rpx;
        
        &.pending {
          background: #fff7e6;
          color: #fa8c16;
        }
        
        &.confirmed {
          background: #f6ffed;
          color: #52c41a;
        }
        
        &.preparing {
          background: #e6f7ff;
          color: #1890ff;
        }
        
        &.completed {
          background: #f0f0f0;
          color: #666;
        }
      }
    }
    
    .order-content {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16rpx;
      
      .customer-name {
        font-size: 28rpx;
        color: #333;
      }
      
      .order-time {
        font-size: 24rpx;
        color: #999;
      }
    }
    
    .order-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .order-amount {
        font-size: 32rpx;
        font-weight: bold;
        color: #f5222d;
      }
      
      .room-info {
        font-size: 24rpx;
        color: #666;
        background: #f5f5f5;
        padding: 6rpx 12rpx;
        border-radius: 8rpx;
      }
    }
    
    &:active {
      opacity: 0.8;
    }
  }
  
  .empty-state {
    text-align: center;
    padding: 60rpx;
    
    .empty-icon {
      display: block;
      font-size: 80rpx;
      margin-bottom: 20rpx;
      opacity: 0.3;
    }
    
    .empty-text {
      font-size: 28rpx;
      color: #999;
    }
  }
}

.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 20rpx 30rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.1);
  
  .tool-btn {
    flex: 1;
    background: #f8f9fa;
    border: none;
    border-radius: 12rpx;
    padding: 20rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .btn-icon {
      font-size: 32rpx;
      margin-bottom: 8rpx;
    }
    
    .btn-text {
      font-size: 24rpx;
      color: #666;
    }
    
    &.logout-btn {
      background: #fff1f0;
      
      .btn-text {
        color: #f5222d;
      }
    }
    
    &:active {
      opacity: 0.7;
      transform: scale(0.95);
    }
  }
}
</style>
