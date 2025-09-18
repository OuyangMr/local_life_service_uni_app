<template>
  <view class="orders-container">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-title">
        <text class="title-text">📋 订单管理</text>
        <text class="subtitle-text">共 {{ totalOrders }} 个订单</text>
      </view>
      <view class="header-actions">
        <button class="action-btn" @click="handleCreateOrder">
          <text class="btn-icon">➕</text>
          <text class="btn-text">新建订单</text>
        </button>
      </view>
    </view>
    
    <!-- 筛选条件 -->
    <view class="filter-section">
      <scroll-view class="filter-tabs" scroll-x>
        <view
          v-for="status in orderStatuses"
          :key="status.value"
          class="filter-tab"
          :class="{ 'active': activeStatus === status.value }"
          @click="handleStatusFilter(status.value)"
        >
          <text class="tab-text">{{ status.label }}</text>
          <view v-if="status.count > 0" class="tab-badge">{{ status.count }}</view>
        </view>
      </scroll-view>
      
      <view class="filter-actions">
        <button class="filter-btn" @click="showDatePicker = true">
          <text class="filter-icon">📅</text>
          <text class="filter-text">{{ selectedDate || '选择日期' }}</text>
        </button>
        <button class="filter-btn" @click="showSearchModal = true">
          <text class="filter-icon">🔍</text>
        </button>
      </view>
    </view>
    
    <!-- 订单列表 -->
    <scroll-view class="orders-list" scroll-y refresher-enabled @refresherrefresh="handleRefresh">
      <view
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        @click="handleOrderDetail(order)"
      >
        <view class="order-header">
          <view class="order-info">
            <text class="order-no">#{{ order.orderNo }}</text>
            <view class="order-type" :class="order.type">
              <text class="type-text">{{ getOrderTypeText(order.type) }}</text>
            </view>
          </view>
          <view class="order-status" :class="order.status">
            <text class="status-text">{{ getOrderStatusText(order.status) }}</text>
          </view>
        </view>
        
        <view class="order-content">
          <view class="customer-info">
            <text class="customer-name">👤 {{ order.customerName }}</text>
            <text class="customer-phone">📱 {{ order.customerPhone }}</text>
          </view>
          
          <view v-if="order.roomName" class="room-info">
            <text class="room-text">🏠 {{ order.roomName }}</text>
          </view>
          
          <view class="order-items">
            <text v-if="order.items.length > 0" class="items-summary">
              {{ getOrderItemsSummary(order.items) }}
            </text>
          </view>
        </view>
        
        <view class="order-footer">
          <view class="order-meta">
            <text class="order-time">🕒 {{ formatOrderTime(order.createdAt) }}</text>
            <text v-if="order.serviceTime" class="service-time">
              📍 服务时间：{{ formatServiceTime(order.serviceTime) }}
            </text>
          </view>
          
          <view class="order-amount-section">
            <text class="order-amount">¥{{ order.totalAmount.toFixed(2) }}</text>
            <view class="payment-status" :class="order.paymentStatus">
              <text class="payment-text">{{ getPaymentStatusText(order.paymentStatus) }}</text>
            </view>
          </view>
        </view>
        
        <!-- 订单操作按钮 -->
        <view class="order-actions">
          <button
            v-if="order.status === 'pending'"
            class="action-btn confirm"
            @click.stop="handleConfirmOrder(order)"
          >
            确认订单
          </button>
          <button
            v-if="order.status === 'confirmed'"
            class="action-btn preparing"
            @click.stop="handleStartPreparing(order)"
          >
            开始制作
          </button>
          <button
            v-if="order.status === 'preparing'"
            class="action-btn ready"
            @click.stop="handleMarkReady(order)"
          >
            制作完成
          </button>
          <button
            v-if="order.status === 'ready'"
            class="action-btn complete"
            @click.stop="handleCompleteOrder(order)"
          >
            完成订单
          </button>
          <button
            v-if="['pending', 'confirmed'].includes(order.status)"
            class="action-btn cancel"
            @click.stop="handleCancelOrder(order)"
          >
            取消订单
          </button>
          <button
            class="action-btn detail"
            @click.stop="handleOrderDetail(order)"
          >
            查看详情
          </button>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view v-if="filteredOrders.length === 0" class="empty-state">
        <text class="empty-icon">📝</text>
        <text class="empty-title">暂无订单</text>
        <text class="empty-desc">当前筛选条件下没有找到订单</text>
        <button class="empty-action" @click="handleCreateOrder">
          <text class="btn-text">创建新订单</text>
        </button>
      </view>
      
      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="loadMoreOrders">
        <text class="load-text">{{ isLoading ? '加载中...' : '加载更多' }}</text>
      </view>
    </scroll-view>
    
    <!-- 日期选择器 -->
    <uni-popup ref="datePopup" v-model:show="showDatePicker" type="bottom">
      <view class="date-picker-container">
        <view class="picker-header">
          <button class="picker-cancel" @click="showDatePicker = false">取消</button>
          <text class="picker-title">选择日期</text>
          <button class="picker-confirm" @click="confirmDateSelect">确定</button>
        </view>
        <picker-view class="date-picker" @change="handleDateChange">
          <picker-view-column>
            <view v-for="year in years" :key="year" class="picker-item">{{ year }}年</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="month in months" :key="month" class="picker-item">{{ month }}月</view>
          </picker-view-column>
          <picker-view-column>
            <view v-for="day in days" :key="day" class="picker-item">{{ day }}日</view>
          </picker-view-column>
        </picker-view>
      </view>
    </uni-popup>
    
    <!-- 搜索弹窗 -->
    <uni-popup ref="searchPopup" v-model:show="showSearchModal" type="center">
      <view class="search-modal">
        <view class="search-header">
          <text class="search-title">搜索订单</text>
          <button class="search-close" @click="showSearchModal = false">✕</button>
        </view>
        <view class="search-content">
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="输入订单号、客户姓名或手机号"
            @confirm="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            <text class="search-btn-text">搜索</text>
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onPullDownRefresh } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Order, OrderFilter } from '@/types'

// Store
const authStore = useAuthStore()

// 响应式数据
const orders = ref<Order[]>([])
const totalOrders = ref(0)
const activeStatus = ref('all')
const selectedDate = ref('')
const searchKeyword = ref('')
const showDatePicker = ref(false)
const showSearchModal = ref(false)
const isLoading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const pageSize = 20

// 订单状态配置
const orderStatuses = ref([
  { value: 'all', label: '全部', count: 0 },
  { value: 'pending', label: '待确认', count: 0 },
  { value: 'confirmed', label: '已确认', count: 0 },
  { value: 'preparing', label: '制作中', count: 0 },
  { value: 'ready', label: '待取餐', count: 0 },
  { value: 'completed', label: '已完成', count: 0 },
  { value: 'cancelled', label: '已取消', count: 0 }
])

// 日期选择器数据
const currentDate = new Date()
const years = ref(Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i))
const months = ref(Array.from({ length: 12 }, (_, i) => i + 1))
const days = ref(Array.from({ length: 31 }, (_, i) => i + 1))
const selectedDateValue = ref([2, 11, 15]) // 默认今天

// 计算属性
const filteredOrders = computed(() => {
  let filtered = orders.value

  // 按状态筛选
  if (activeStatus.value !== 'all') {
    filtered = filtered.filter(order => order.status === activeStatus.value)
  }

  // 按日期筛选
  if (selectedDate.value) {
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.createdAt).toDateString()
      const filterDate = new Date(selectedDate.value).toDateString()
      return orderDate === filterDate
    })
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(order =>
      order.orderNo.toLowerCase().includes(keyword) ||
      order.customerName.toLowerCase().includes(keyword) ||
      order.customerPhone.includes(keyword)
    )
  }

  return filtered
})

// 方法
const getOrderTypeText = (type: string) => {
  const typeMap = {
    'room': '包间',
    'food': '餐饮',
    'service': '服务'
  }
  return typeMap[type as keyof typeof typeMap] || type
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

const getPaymentStatusText = (status: string) => {
  const statusMap = {
    'unpaid': '未支付',
    'paid': '已支付',
    'refunded': '已退款'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const getOrderItemsSummary = (items: any[]) => {
  if (items.length === 0) return '无商品'
  if (items.length === 1) return items[0].productName
  return `${items[0].productName} 等${items.length}项商品`
}

const formatOrderTime = (timeStr: string) => {
  const time = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - time.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(minutes / 60)

  if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else {
    return time.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

const formatServiceTime = (timeStr: string) => {
  const time = new Date(timeStr)
  return time.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 事件处理
const handleStatusFilter = (status: string) => {
  activeStatus.value = status
  currentPage.value = 1
  loadOrders()
}

const handleCreateOrder = () => {
  uni.navigateTo({
    url: '/pages/orders/create'
  })
}

const handleOrderDetail = (order: Order) => {
  uni.navigateTo({
    url: `/pages/orders/detail?id=${order.id}`
  })
}

const handleConfirmOrder = async (order: Order) => {
  try {
    await updateOrderStatus(order.id, 'confirmed')
    uni.showToast({
      title: '订单已确认',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

const handleStartPreparing = async (order: Order) => {
  try {
    await updateOrderStatus(order.id, 'preparing')
    uni.showToast({
      title: '开始制作',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

const handleMarkReady = async (order: Order) => {
  try {
    await updateOrderStatus(order.id, 'ready')
    uni.showToast({
      title: '制作完成',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

const handleCompleteOrder = async (order: Order) => {
  try {
    await updateOrderStatus(order.id, 'completed')
    uni.showToast({
      title: '订单完成',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

const handleCancelOrder = (order: Order) => {
  uni.showModal({
    title: '确认取消',
    content: '确定要取消这个订单吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await updateOrderStatus(order.id, 'cancelled')
          uni.showToast({
            title: '订单已取消',
            icon: 'success'
          })
        } catch (error) {
          uni.showToast({
            title: '操作失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

const handleRefresh = async () => {
  currentPage.value = 1
  await loadOrders()
  uni.stopPullDownRefresh()
}

const handleDateChange = (e: any) => {
  selectedDateValue.value = e.detail.value
}

const confirmDateSelect = () => {
  const [yearIndex, monthIndex, dayIndex] = selectedDateValue.value
  const year = years.value[yearIndex]
  const month = months.value[monthIndex]
  const day = days.value[dayIndex]
  
  selectedDate.value = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  showDatePicker.value = false
  loadOrders()
}

const handleSearch = () => {
  showSearchModal.value = false
  currentPage.value = 1
  loadOrders()
}

const loadMoreOrders = () => {
  if (!isLoading.value && hasMore.value) {
    currentPage.value++
    loadOrders(false)
  }
}

// API方法
const loadOrders = async (reset = true) => {
  if (isLoading.value) return
  
  isLoading.value = true
  
  try {
    const filter: OrderFilter = {
      page: currentPage.value,
      pageSize: pageSize
    }
    
    if (activeStatus.value !== 'all') {
      filter.status = [activeStatus.value]
    }
    
    if (selectedDate.value) {
      filter.dateRange = [selectedDate.value, selectedDate.value]
    }
    
    if (searchKeyword.value) {
      filter.searchKeyword = searchKeyword.value
    }
    
    const response = await uni.request({
      url: '/api/merchant/orders',
      method: 'GET',
      data: filter,
      header: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    
    if (response.data.code === 200) {
      const { items, total, totalPages } = response.data.data
      
      if (reset) {
        orders.value = items
      } else {
        orders.value.push(...items)
      }
      
      totalOrders.value = total
      hasMore.value = currentPage.value < totalPages
      
      // 更新状态统计
      updateStatusCounts()
    }
  } catch (error) {
    console.error('加载订单失败:', error)
    // 使用模拟数据
    if (reset) {
      orders.value = getMockOrders()
      totalOrders.value = orders.value.length
    }
  } finally {
    isLoading.value = false
  }
}

const updateOrderStatus = async (orderId: string, status: string) => {
  const response = await uni.request({
    url: `/api/merchant/orders/${orderId}/status`,
    method: 'PUT',
    data: { status },
    header: {
      'Authorization': `Bearer ${authStore.token}`
    }
  })
  
  if (response.data.code === 200) {
    // 更新本地订单状态
    const orderIndex = orders.value.findIndex(order => order.id === orderId)
    if (orderIndex !== -1) {
      orders.value[orderIndex].status = status as any
      updateStatusCounts()
    }
  } else {
    throw new Error(response.data.message)
  }
}

const updateStatusCounts = () => {
  orderStatuses.value.forEach(statusItem => {
    if (statusItem.value === 'all') {
      statusItem.count = orders.value.length
    } else {
      statusItem.count = orders.value.filter(order => order.status === statusItem.value).length
    }
  })
}

const getMockOrders = (): Order[] => {
  return [
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
      updatedAt: new Date().toISOString(),
      serviceTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      orderNo: 'KTV20241201002',
      type: 'food',
      customerId: 'c2',
      customerName: '李女士',
      customerPhone: '139****5678',
      items: [
        {
          id: 'i1',
          productId: 'p1',
          productName: '果盘套餐',
          quantity: 2,
          unitPrice: 68.00,
          totalPrice: 136.00
        }
      ],
      totalAmount: 136.00,
      status: 'confirmed',
      paymentStatus: 'paid',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

// 生命周期
onMounted(() => {
  loadOrders()
})

onPullDownRefresh(() => {
  handleRefresh()
})
</script>

<style lang="scss" scoped>
.orders-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  background: white;
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #eee;
  
  .header-title {
    .title-text {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
      display: block;
      margin-bottom: 8rpx;
    }
    
    .subtitle-text {
      font-size: 24rpx;
      color: #666;
    }
  }
  
  .header-actions {
    .action-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12rpx;
      padding: 16rpx 24rpx;
      display: flex;
      align-items: center;
      
      .btn-icon {
        font-size: 24rpx;
        margin-right: 8rpx;
      }
      
      .btn-text {
        font-size: 26rpx;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}

.filter-section {
  background: white;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #eee;
  
  .filter-tabs {
    display: flex;
    margin-bottom: 20rpx;
    
    .filter-tab {
      position: relative;
      padding: 16rpx 24rpx;
      margin-right: 20rpx;
      background: #f5f5f5;
      border-radius: 20rpx;
      display: flex;
      align-items: center;
      
      .tab-text {
        font-size: 26rpx;
        color: #666;
      }
      
      .tab-badge {
        margin-left: 8rpx;
        background: #ff4757;
        color: white;
        font-size: 20rpx;
        padding: 4rpx 8rpx;
        border-radius: 10rpx;
        min-width: 32rpx;
        text-align: center;
      }
      
      &.active {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        
        .tab-text {
          color: white;
        }
        
        .tab-badge {
          background: rgba(255, 255, 255, 0.3);
        }
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
  
  .filter-actions {
    display: flex;
    gap: 20rpx;
    
    .filter-btn {
      padding: 16rpx 20rpx;
      background: #f8f9fa;
      border: 1rpx solid #e9ecef;
      border-radius: 8rpx;
      display: flex;
      align-items: center;
      
      .filter-icon {
        font-size: 24rpx;
        margin-right: 8rpx;
      }
      
      .filter-text {
        font-size: 24rpx;
        color: #666;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}

.orders-list {
  flex: 1;
  padding: 20rpx 30rpx;
  
  .order-card {
    background: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
    
    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20rpx;
      
      .order-info {
        display: flex;
        align-items: center;
        gap: 16rpx;
        
        .order-no {
          font-size: 28rpx;
          font-weight: bold;
          color: #333;
        }
        
        .order-type {
          padding: 6rpx 12rpx;
          border-radius: 8rpx;
          font-size: 22rpx;
          
          &.room {
            background: #e6f7ff;
            color: #1890ff;
          }
          
          &.food {
            background: #f6ffed;
            color: #52c41a;
          }
          
          &.service {
            background: #fff7e6;
            color: #fa8c16;
          }
        }
      }
      
      .order-status {
        padding: 8rpx 16rpx;
        border-radius: 12rpx;
        font-size: 24rpx;
        
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
        
        &.ready {
          background: #f0f8ff;
          color: #722ed1;
        }
        
        &.completed {
          background: #f0f0f0;
          color: #666;
        }
        
        &.cancelled {
          background: #fff1f0;
          color: #f5222d;
        }
      }
    }
    
    .order-content {
      margin-bottom: 20rpx;
      
      .customer-info {
        display: flex;
        gap: 20rpx;
        margin-bottom: 12rpx;
        
        .customer-name,
        .customer-phone {
          font-size: 26rpx;
          color: #666;
        }
      }
      
      .room-info {
        margin-bottom: 12rpx;
        
        .room-text {
          font-size: 26rpx;
          color: #1890ff;
          background: #f0f8ff;
          padding: 6rpx 12rpx;
          border-radius: 8rpx;
        }
      }
      
      .order-items {
        .items-summary {
          font-size: 26rpx;
          color: #333;
        }
      }
    }
    
    .order-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 20rpx;
      
      .order-meta {
        .order-time,
        .service-time {
          display: block;
          font-size: 24rpx;
          color: #999;
          margin-bottom: 6rpx;
        }
      }
      
      .order-amount-section {
        text-align: right;
        
        .order-amount {
          display: block;
          font-size: 32rpx;
          font-weight: bold;
          color: #f5222d;
          margin-bottom: 8rpx;
        }
        
        .payment-status {
          padding: 4rpx 8rpx;
          border-radius: 6rpx;
          font-size: 20rpx;
          
          &.paid {
            background: #f6ffed;
            color: #52c41a;
          }
          
          &.unpaid {
            background: #fff7e6;
            color: #fa8c16;
          }
          
          &.refunded {
            background: #f0f0f0;
            color: #666;
          }
        }
      }
    }
    
    .order-actions {
      display: flex;
      gap: 12rpx;
      flex-wrap: wrap;
      
      .action-btn {
        padding: 12rpx 20rpx;
        border-radius: 8rpx;
        font-size: 24rpx;
        border: none;
        
        &.confirm {
          background: #52c41a;
          color: white;
        }
        
        &.preparing {
          background: #1890ff;
          color: white;
        }
        
        &.ready {
          background: #722ed1;
          color: white;
        }
        
        &.complete {
          background: #13c2c2;
          color: white;
        }
        
        &.cancel {
          background: #f5222d;
          color: white;
        }
        
        &.detail {
          background: #f8f9fa;
          color: #666;
          border: 1rpx solid #e9ecef;
        }
        
        &:active {
          opacity: 0.8;
        }
      }
    }
    
    &:active {
      opacity: 0.9;
    }
  }
  
  .empty-state {
    text-align: center;
    padding: 120rpx 60rpx;
    
    .empty-icon {
      display: block;
      font-size: 120rpx;
      margin-bottom: 30rpx;
      opacity: 0.3;
    }
    
    .empty-title {
      display: block;
      font-size: 32rpx;
      color: #333;
      margin-bottom: 16rpx;
    }
    
    .empty-desc {
      display: block;
      font-size: 26rpx;
      color: #666;
      margin-bottom: 40rpx;
    }
    
    .empty-action {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12rpx;
      padding: 20rpx 40rpx;
      
      .btn-text {
        font-size: 28rpx;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
  
  .load-more {
    text-align: center;
    padding: 40rpx;
    
    .load-text {
      font-size: 26rpx;
      color: #666;
    }
    
    &:active {
      opacity: 0.7;
    }
  }
}

// 弹窗样式
.date-picker-container {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  
  .picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #eee;
    
    .picker-cancel,
    .picker-confirm {
      font-size: 28rpx;
      background: none;
      border: none;
      
      &.picker-cancel {
        color: #666;
      }
      
      &.picker-confirm {
        color: #1890ff;
      }
    }
    
    .picker-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
  }
  
  .date-picker {
    height: 400rpx;
    
    .picker-item {
      height: 80rpx;
      line-height: 80rpx;
      text-align: center;
      font-size: 28rpx;
    }
  }
}

.search-modal {
  background: white;
  border-radius: 16rpx;
  padding: 40rpx;
  width: 600rpx;
  
  .search-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .search-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .search-close {
      background: none;
      border: none;
      font-size: 32rpx;
      color: #666;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
  
  .search-content {
    .search-input {
      width: 100%;
      padding: 20rpx;
      border: 1rpx solid #e9ecef;
      border-radius: 8rpx;
      font-size: 28rpx;
      margin-bottom: 20rpx;
      
      &::placeholder {
        color: #aaa;
      }
    }
    
    .search-btn {
      width: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8rpx;
      padding: 20rpx;
      
      .search-btn-text {
        font-size: 28rpx;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}
</style>
