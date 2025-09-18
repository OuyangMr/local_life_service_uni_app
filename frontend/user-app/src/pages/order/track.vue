<!--
  订单跟踪页面
  @description 按设计稿实现订单状态实时跟踪、配送进度显示，添加订单操作（确认收货、评价等）
-->
<template>
  <view class="order-track-page">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">订单跟踪</text>
      </view>
      <view class="nav-right">
        <view class="nav-btn" @click="callCustomerService">
          <text class="nav-icon">📞</text>
        </view>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y refresher-enabled :refresher-triggered="isRefreshing" @refresherrefresh="onRefresh">
      <!-- 订单状态进度条 -->
      <view class="progress-section">
        <view class="progress-header">
          <text class="order-number">订单号：{{ orderInfo.orderNumber }}</text>
          <text class="order-status" :class="getStatusClass(orderInfo.status)">
            {{ getStatusText(orderInfo.status) }}
          </text>
        </view>
        
        <view class="progress-timeline">
          <view 
            v-for="(step, index) in progressSteps"
            :key="step.key"
            class="progress-step"
            :class="{ 
              'active': step.active, 
              'completed': step.completed,
              'current': step.current
            }"
          >
            <view class="step-icon-wrapper">
              <view class="step-icon">
                <text v-if="step.completed" class="icon-check">✓</text>
                <text v-else-if="step.current" class="icon-current">⏳</text>
                <text v-else class="icon-pending">{{ step.icon }}</text>
              </view>
            </view>
            
            <view class="step-content">
              <text class="step-title">{{ step.title }}</text>
              <text v-if="step.time" class="step-time">{{ formatTime(step.time) }}</text>
              <text v-if="step.description" class="step-description">{{ step.description }}</text>
            </view>
            
            <view v-if="index < progressSteps.length - 1" class="step-line" :class="{ 'completed': step.completed }"></view>
          </view>
        </view>
      </view>

      <!-- 实时位置信息（仅配送订单） -->
      <view v-if="orderInfo.type === 'delivery' && orderInfo.status === 'delivering'" class="location-section">
        <view class="section-header">
          <text class="section-title">实时位置</text>
          <text v-if="deliveryInfo.estimatedTime" class="estimated-time">
            预计{{ deliveryInfo.estimatedTime }}分钟送达
          </text>
        </view>
        
        <!-- 地图 -->
        <view class="map-container">
          <map
            id="deliveryMap"
            class="delivery-map"
            :longitude="mapCenter.longitude"
            :latitude="mapCenter.latitude"
            :scale="16"
            :markers="mapMarkers"
            :polyline="routePolyline"
            @regionchange="onMapRegionChange"
          />
          
          <!-- 地图控制按钮 -->
          <view class="map-controls">
            <view class="map-btn" @click="centerToDelivery">
              <text class="btn-icon">📍</text>
            </view>
            <view class="map-btn" @click="refreshLocation">
              <text class="btn-icon">🔄</text>
            </view>
          </view>
        </view>
        
        <!-- 配送员信息 -->
        <view v-if="deliveryInfo.courier" class="courier-info">
          <image 
            :src="deliveryInfo.courier.avatar || '/static/default-courier.png'"
            class="courier-avatar"
          />
          <view class="courier-details">
            <text class="courier-name">{{ deliveryInfo.courier.name }}</text>
            <view class="courier-rating">
              <text class="rating-stars">⭐</text>
              <text class="rating-text">{{ deliveryInfo.courier.rating?.toFixed(1) || '5.0' }}</text>
              <text class="delivery-count">已送{{ deliveryInfo.courier.deliveryCount || 0 }}单</text>
            </view>
          </view>
          <view class="courier-actions">
            <view class="action-btn" @click="callCourier">
              <text class="btn-icon">📞</text>
            </view>
            <view class="action-btn" @click="chatWithCourier">
              <text class="btn-icon">💬</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 订单详细信息 -->
      <view class="order-details">
        <view class="section-header">
          <text class="section-title">订单详情</text>
        </view>
        
        <!-- 店铺信息 -->
        <view class="store-info">
          <image 
            :src="orderInfo.store?.logo || '/static/placeholder-store.png'"
            class="store-logo"
          />
          <view class="store-details">
            <text class="store-name">{{ orderInfo.store?.name }}</text>
            <text class="store-address">{{ orderInfo.store?.address }}</text>
          </view>
          <view class="store-actions">
            <view class="action-btn" @click="callStore">
              <text class="btn-icon">📞</text>
            </view>
          </view>
        </view>
        
        <!-- 商品列表 -->
        <view class="products-list">
          <view 
            v-for="item in orderInfo.items"
            :key="item._id"
            class="product-item"
          >
            <image 
              :src="item.dish.images?.[0] || '/static/placeholder-dish.png'"
              class="product-image"
            />
            <view class="product-info">
              <text class="product-name">{{ item.dish.name }}</text>
              <view v-if="item.selectedSpecs?.length" class="product-specs">
                <text 
                  v-for="spec in item.selectedSpecs"
                  :key="spec.name"
                  class="spec-text"
                >
                  {{ spec.name }}:{{ spec.value }}
                </text>
              </view>
              <text v-if="item.specialRequests" class="special-requests">
                备注：{{ item.specialRequests }}
              </text>
            </view>
            <view class="product-quantity">
              <text class="quantity-text">×{{ item.quantity }}</text>
              <text class="price-text">¥{{ (item.dish.price * item.quantity).toFixed(2) }}</text>
            </view>
          </view>
        </view>
        
        <!-- 配送信息 -->
        <view v-if="orderInfo.deliveryAddress" class="delivery-info">
          <view class="info-header">
            <text class="info-icon">📍</text>
            <text class="info-title">配送地址</text>
          </view>
          <view class="address-details">
            <view class="contact-info">
              <text class="contact-name">{{ orderInfo.deliveryAddress.contactName }}</text>
              <text class="contact-phone">{{ orderInfo.deliveryAddress.contactPhone }}</text>
            </view>
            <text class="address-text">{{ orderInfo.deliveryAddress.detail }}</text>
          </view>
        </view>
        
        <!-- 费用明细 -->
        <view class="cost-breakdown">
          <view class="cost-item">
            <text class="cost-label">商品金额</text>
            <text class="cost-value">¥{{ orderInfo.subtotal?.toFixed(2) || '0.00' }}</text>
          </view>
          <view v-if="orderInfo.deliveryFee > 0" class="cost-item">
            <text class="cost-label">配送费</text>
            <text class="cost-value">¥{{ orderInfo.deliveryFee.toFixed(2) }}</text>
          </view>
          <view v-if="orderInfo.serviceFee > 0" class="cost-item">
            <text class="cost-label">服务费</text>
            <text class="cost-value">¥{{ orderInfo.serviceFee.toFixed(2) }}</text>
          </view>
          <view v-if="orderInfo.packagingFee > 0" class="cost-item">
            <text class="cost-label">包装费</text>
            <text class="cost-value">¥{{ orderInfo.packagingFee.toFixed(2) }}</text>
          </view>
          <view v-if="orderInfo.discount > 0" class="cost-item discount">
            <text class="cost-label">优惠金额</text>
            <text class="cost-value">-¥{{ orderInfo.discount.toFixed(2) }}</text>
          </view>
          <view class="cost-total">
            <text class="total-label">实付金额</text>
            <text class="total-value">¥{{ orderInfo.totalAmount.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 订单时间轴 -->
      <view class="timeline-section">
        <view class="section-header">
          <text class="section-title">订单动态</text>
        </view>
        
        <view class="timeline-list">
          <view 
            v-for="event in orderTimeline"
            :key="event.id"
            class="timeline-item"
          >
            <view class="timeline-dot" :class="event.type"></view>
            <view class="timeline-content">
              <text class="timeline-title">{{ event.title }}</text>
              <text v-if="event.description" class="timeline-description">{{ event.description }}</text>
              <text class="timeline-time">{{ formatTime(event.time) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="showActions" class="action-bar">
      <button 
        v-if="canConfirmReceive"
        class="action-btn primary"
        @click="confirmReceive"
      >
        确认收货
      </button>
      
      <button 
        v-if="canReview"
        class="action-btn secondary"
        @click="goToReview"
      >
        评价订单
      </button>
      
      <button 
        v-if="canCancel"
        class="action-btn danger"
        @click="cancelOrder"
      >
        取消订单
      </button>
      
      <button 
        v-if="canReorder"
        class="action-btn primary"
        @click="reorder"
      >
        再来一单
      </button>
    </view>

    <!-- 实时状态组件 -->
    <RealtimeStatus
      v-if="needRealtime"
      :order-id="orderId"
      @status-update="onStatusUpdate"
      @location-update="onLocationUpdate"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import * as OrderService from '@/services/order'
import RealtimeStatus from '@/components/RealtimeStatus.vue'

// 路由参数
const orderId = ref('')

// 状态管理
const isRefreshing = ref(false)
const orderInfo = ref<any>({
  orderNumber: '',
  status: 'pending',
  type: 'delivery',
  items: [],
  store: {},
  deliveryAddress: null,
  subtotal: 0,
  deliveryFee: 0,
  serviceFee: 0,
  packagingFee: 0,
  discount: 0,
  totalAmount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
})

const deliveryInfo = ref<any>({
  courier: null,
  currentLocation: null,
  estimatedTime: null
})

const orderTimeline = ref<any[]>([])

// 地图相关
const mapCenter = ref({
  longitude: 116.397428,
  latitude: 39.90923
})

const mapMarkers = ref<any[]>([])
const routePolyline = ref<any[]>([])

// 计算属性
const progressSteps = computed(() => {
  const allSteps = [
    {
      key: 'placed',
      title: '订单已下单',
      icon: '📝',
      active: true,
      completed: true,
      current: false,
      time: orderInfo.value.createdAt
    },
    {
      key: 'confirmed',
      title: '商户已接单',
      icon: '✅',
      active: ['confirmed', 'preparing', 'prepared', 'delivering', 'delivered', 'completed'].includes(orderInfo.value.status),
      completed: ['preparing', 'prepared', 'delivering', 'delivered', 'completed'].includes(orderInfo.value.status),
      current: orderInfo.value.status === 'confirmed',
      time: orderInfo.value.confirmedAt
    },
    {
      key: 'preparing',
      title: '制作中',
      icon: '👨‍🍳',
      active: ['preparing', 'prepared', 'delivering', 'delivered', 'completed'].includes(orderInfo.value.status),
      completed: ['prepared', 'delivering', 'delivered', 'completed'].includes(orderInfo.value.status),
      current: orderInfo.value.status === 'preparing',
      time: orderInfo.value.preparingAt
    }
  ]

  if (orderInfo.value.type === 'delivery') {
    allSteps.push(
      {
        key: 'delivering',
        title: '配送中',
        icon: '🚚',
        active: ['delivering', 'delivered', 'completed'].includes(orderInfo.value.status),
        completed: ['delivered', 'completed'].includes(orderInfo.value.status),
        current: orderInfo.value.status === 'delivering',
        time: orderInfo.value.deliveringAt
      },
      {
        key: 'delivered',
        title: '已送达',
        icon: '🎉',
        active: ['delivered', 'completed'].includes(orderInfo.value.status),
        completed: orderInfo.value.status === 'completed',
        current: orderInfo.value.status === 'delivered',
        time: orderInfo.value.deliveredAt
      }
    )
  } else {
    allSteps.push({
      key: 'ready',
      title: '可取餐',
      icon: '🍽️',
      active: ['ready', 'completed'].includes(orderInfo.value.status),
      completed: orderInfo.value.status === 'completed',
      current: orderInfo.value.status === 'ready',
      time: orderInfo.value.readyAt
    })
  }

  return allSteps
})

const needRealtime = computed(() => {
  return ['confirmed', 'preparing', 'delivering'].includes(orderInfo.value.status)
})

const showActions = computed(() => {
  return canConfirmReceive.value || canReview.value || canCancel.value || canReorder.value
})

const canConfirmReceive = computed(() => {
  return orderInfo.value.status === 'delivered'
})

const canReview = computed(() => {
  return orderInfo.value.status === 'completed' && !orderInfo.value.reviewed
})

const canCancel = computed(() => {
  return ['pending', 'confirmed'].includes(orderInfo.value.status)
})

const canReorder = computed(() => {
  return ['completed', 'cancelled'].includes(orderInfo.value.status)
})

// 方法
// 初始化数据
const initData = async () => {
  await loadOrderInfo()
  await loadOrderTimeline()
  if (orderInfo.value.type === 'delivery' && orderInfo.value.status === 'delivering') {
    await loadDeliveryInfo()
    initMap()
  }
}

// 加载订单信息
const loadOrderInfo = async () => {
  try {
    // 模拟订单数据
    orderInfo.value = {
      _id: orderId.value,
      orderNumber: 'ORD20240915001',
      status: 'delivering',
      type: 'delivery',
      store: {
        _id: 'store1',
        name: '星空KTV',
        logo: '/static/store1.jpg',
        address: '北京市朝阳区建国路88号',
        phone: '400-1234-5678'
      },
      items: [
        {
          _id: 'item1',
          dish: {
            _id: 'dish1',
            name: '柠檬蜂蜜茶',
            price: 15,
            images: ['/static/drink1.jpg']
          },
          quantity: 2,
          selectedSpecs: [
            { name: '温度', value: '冰' },
            { name: '甜度', value: '七分糖' }
          ],
          specialRequests: '少冰'
        },
        {
          _id: 'item2',
          dish: {
            _id: 'dish2',
            name: '薯条',
            price: 10,
            images: ['/static/snack1.jpg']
          },
          quantity: 1,
          selectedSpecs: [],
          specialRequests: ''
        }
      ],
      deliveryAddress: {
        contactName: '张三',
        contactPhone: '138****5678',
        detail: '北京市朝阳区朝阳路123号A座1001室'
      },
      subtotal: 40,
      deliveryFee: 3,
      serviceFee: 2,
      packagingFee: 1,
      discount: 5,
      totalAmount: 41,
      createdAt: new Date(Date.now() - 45 * 60 * 1000),
      confirmedAt: new Date(Date.now() - 40 * 60 * 1000),
      preparingAt: new Date(Date.now() - 35 * 60 * 1000),
      deliveringAt: new Date(Date.now() - 10 * 60 * 1000)
    }
  } catch (error) {
    console.error('加载订单信息失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  }
}

// 加载订单时间轴
const loadOrderTimeline = async () => {
  try {
    orderTimeline.value = [
      {
        id: 1,
        type: 'info',
        title: '配送员正在配送中',
        description: '您的订单正在配送途中，请保持手机畅通',
        time: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        id: 2,
        type: 'success',
        title: '商家开始制作',
        description: '您的订单已被商家接单，正在制作中',
        time: new Date(Date.now() - 35 * 60 * 1000)
      },
      {
        id: 3,
        type: 'success',
        title: '商家已接单',
        description: '商家已确认您的订单，预计制作时间30分钟',
        time: new Date(Date.now() - 40 * 60 * 1000)
      },
      {
        id: 4,
        type: 'primary',
        title: '订单提交成功',
        description: '您的订单已提交，等待商家确认',
        time: new Date(Date.now() - 45 * 60 * 1000)
      }
    ]
  } catch (error) {
    console.error('加载订单时间轴失败:', error)
  }
}

// 加载配送信息
const loadDeliveryInfo = async () => {
  try {
    deliveryInfo.value = {
      courier: {
        _id: 'courier1',
        name: '李师傅',
        phone: '138****1234',
        avatar: '/static/courier1.jpg',
        rating: 4.8,
        deliveryCount: 1256
      },
      currentLocation: {
        longitude: 116.405285,
        latitude: 39.904989
      },
      estimatedTime: 15
    }
  } catch (error) {
    console.error('加载配送信息失败:', error)
  }
}

// 初始化地图
const initMap = () => {
  // 设置地图中心为配送员位置
  if (deliveryInfo.value.currentLocation) {
    mapCenter.value = deliveryInfo.value.currentLocation
  }
  
  // 设置地图标记
  mapMarkers.value = [
    {
      id: 1,
      longitude: deliveryInfo.value.currentLocation?.longitude || 116.405285,
      latitude: deliveryInfo.value.currentLocation?.latitude || 39.904989,
      iconPath: '/static/courier-marker.png',
      width: 40,
      height: 40,
      title: '配送员位置'
    },
    {
      id: 2,
      longitude: 116.397428,
      latitude: 39.90923,
      iconPath: '/static/destination-marker.png',
      width: 40,
      height: 40,
      title: '配送地址'
    }
  ]
  
  // 设置配送路线
  routePolyline.value = [
    {
      points: [
        {
          longitude: deliveryInfo.value.currentLocation?.longitude || 116.405285,
          latitude: deliveryInfo.value.currentLocation?.latitude || 39.904989
        },
        {
          longitude: 116.397428,
          latitude: 39.90923
        }
      ],
      color: '#667eea',
      width: 4
    }
  ]
}

// 工具方法
const formatTime = (time: Date): string => {
  if (!time) return ''
  
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (60 * 1000))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

const getStatusText = (status: string): string => {
  const statusMap = {
    'pending': '待支付',
    'confirmed': '已接单',
    'preparing': '制作中',
    'prepared': '制作完成',
    'delivering': '配送中',
    'delivered': '已送达',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const getStatusClass = (status: string): string => {
  const classMap = {
    'pending': 'status-pending',
    'confirmed': 'status-confirmed',
    'preparing': 'status-preparing',
    'prepared': 'status-prepared',
    'delivering': 'status-delivering',
    'delivered': 'status-delivered',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
  }
  return classMap[status as keyof typeof classMap] || ''
}

// 事件处理
const onRefresh = async () => {
  isRefreshing.value = true
  await initData()
  isRefreshing.value = false
}

const onStatusUpdate = (data: any) => {
  orderInfo.value.status = data.status
  orderTimeline.value.unshift({
    id: Date.now(),
    type: 'info',
    title: data.title,
    description: data.description,
    time: new Date()
  })
}

const onLocationUpdate = (location: any) => {
  deliveryInfo.value.currentLocation = location
  mapMarkers.value[0].longitude = location.longitude
  mapMarkers.value[0].latitude = location.latitude
  mapCenter.value = location
}

const onMapRegionChange = (e: any) => {
  // 地图区域变化时的处理
}

// 地图操作
const centerToDelivery = () => {
  if (deliveryInfo.value.currentLocation) {
    mapCenter.value = deliveryInfo.value.currentLocation
  }
}

const refreshLocation = async () => {
  try {
    // 刷新配送员位置
    await loadDeliveryInfo()
    initMap()
    
    uni.showToast({
      title: '位置已更新',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '更新失败',
      icon: 'none'
    })
  }
}

// 联系相关
const callCustomerService = () => {
  uni.makePhoneCall({
    phoneNumber: '400-1234-5678'
  })
}

const callStore = () => {
  if (orderInfo.value.store?.phone) {
    uni.makePhoneCall({
      phoneNumber: orderInfo.value.store.phone
    })
  }
}

const callCourier = () => {
  if (deliveryInfo.value.courier?.phone) {
    uni.makePhoneCall({
      phoneNumber: deliveryInfo.value.courier.phone
    })
  }
}

const chatWithCourier = () => {
  // TODO: 打开与配送员的聊天窗口
  uni.showToast({
    title: '聊天功能开发中',
    icon: 'none'
  })
}

// 订单操作
const confirmReceive = async () => {
  try {
    uni.showModal({
      title: '确认收货',
      content: '确认已收到商品？',
      success: async (res) => {
        if (res.confirm) {
          // TODO: 调用确认收货API
          orderInfo.value.status = 'completed'
          
          uni.showToast({
            title: '确认收货成功',
            icon: 'success'
          })
        }
      }
    })
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

const goToReview = () => {
  uni.navigateTo({
    url: `/pages/order/review?orderId=${orderId.value}`
  })
}

const cancelOrder = async () => {
  try {
    uni.showModal({
      title: '取消订单',
      content: '确定要取消这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          // TODO: 调用取消订单API
          orderInfo.value.status = 'cancelled'
          
          uni.showToast({
            title: '订单已取消',
            icon: 'success'
          })
        }
      }
    })
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

const reorder = () => {
  // TODO: 实现再来一单功能
  uni.showToast({
    title: '功能开发中',
    icon: 'none'
  })
}

const goBack = () => {
  uni.navigateBack()
}

// 生命周期
onMounted(() => {
  initData()
})

onLoad((options) => {
  if (options.id) {
    orderId.value = options.id
  }
})

onPullDownRefresh(() => {
  onRefresh()
})
</script>

<style scoped lang="scss">
.order-track-page {
  min-height: 100vh;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
  background: white;
  border-bottom: 2rpx solid #f0f0f0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  font-size: 28rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.content-scroll {
  flex: 1;
  padding-bottom: 150rpx;
}

.progress-section {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.order-number {
  font-size: 26rpx;
  color: #666;
}

.order-status {
  font-size: 26rpx;
  font-weight: 600;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  
  &.status-pending {
    background: rgba(255, 165, 0, 0.1);
    color: #ff9500;
  }
  
  &.status-confirmed,
  &.status-preparing {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
  }
  
  &.status-delivering {
    background: rgba(0, 170, 0, 0.1);
    color: #00aa00;
  }
  
  &.status-delivered,
  &.status-completed {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  
  &.status-cancelled {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.progress-timeline {
  position: relative;
}

.progress-step {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  position: relative;
  padding-bottom: 40rpx;
  
  &:last-child {
    padding-bottom: 0;
    
    .step-line {
      display: none;
    }
  }
}

.step-icon-wrapper {
  position: relative;
  z-index: 2;
}

.step-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  color: #999;
  font-size: 24rpx;
  border: 4rpx solid #f0f0f0;
  
  .progress-step.completed & {
    background: #22c55e;
    color: white;
    border-color: #22c55e;
  }
  
  .progress-step.current & {
    background: #667eea;
    color: white;
    border-color: #667eea;
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
  }
  70% {
    box-shadow: 0 0 0 20rpx rgba(102, 126, 234, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(102, 126, 234, 0);
  }
}

.icon-check,
.icon-current,
.icon-pending {
  font-size: 28rpx;
  font-weight: 600;
}

.step-content {
  flex: 1;
  padding-top: 8rpx;
}

.step-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.step-time {
  font-size: 24rpx;
  color: #667eea;
  margin-bottom: 8rpx;
  display: block;
}

.step-description {
  font-size: 22rpx;
  color: #999;
  line-height: 1.4;
}

.step-line {
  position: absolute;
  left: 30rpx;
  top: 64rpx;
  bottom: 0;
  width: 4rpx;
  background: #f0f0f0;
  z-index: 1;
  
  &.completed {
    background: #22c55e;
  }
}

.location-section {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.estimated-time {
  font-size: 24rpx;
  color: #00aa00;
  font-weight: 500;
}

.map-container {
  position: relative;
  margin-bottom: 24rpx;
}

.delivery-map {
  width: 100%;
  height: 400rpx;
  border-radius: 12rpx;
}

.map-controls {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.map-btn {
  width: 64rpx;
  height: 64rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.btn-icon {
  font-size: 24rpx;
}

.courier-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #f8f9ff;
  border-radius: 12rpx;
}

.courier-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f0f0f0;
}

.courier-details {
  flex: 1;
}

.courier-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.courier-rating {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.rating-stars {
  font-size: 20rpx;
}

.rating-text {
  font-size: 22rpx;
  color: #ff9500;
  font-weight: 500;
}

.delivery-count {
  font-size: 20rpx;
  color: #999;
}

.courier-actions {
  display: flex;
  gap: 12rpx;
}

.action-btn {
  width: 64rpx;
  height: 64rpx;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.order-details {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.store-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding-bottom: 24rpx;
  margin-bottom: 24rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.store-logo {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}

.store-details {
  flex: 1;
}

.store-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.store-address {
  font-size: 24rpx;
  color: #666;
}

.store-actions {
  display: flex;
}

.products-list {
  margin-bottom: 24rpx;
}

.product-item {
  display: flex;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.product-specs {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.spec-text {
  font-size: 22rpx;
  color: #999;
  background: #f5f5f5;
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
}

.special-requests {
  font-size: 22rpx;
  color: #999;
  font-style: italic;
}

.product-quantity {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 8rpx;
}

.quantity-text {
  font-size: 24rpx;
  color: #666;
}

.price-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.delivery-info {
  margin-bottom: 24rpx;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.info-icon {
  font-size: 24rpx;
  color: #667eea;
}

.info-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.address-details {
  padding-left: 36rpx;
}

.contact-info {
  display: flex;
  gap: 24rpx;
  margin-bottom: 8rpx;
}

.contact-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.contact-phone {
  font-size: 24rpx;
  color: #666;
}

.address-text {
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
}

.cost-breakdown {
  padding-top: 24rpx;
  border-top: 2rpx solid #f0f0f0;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  
  &.discount {
    .cost-value {
      color: #ff4444;
    }
  }
}

.cost-label {
  font-size: 26rpx;
  color: #666;
}

.cost-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.cost-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 2rpx solid #f0f0f0;
}

.total-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.total-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #ff4444;
}

.timeline-section {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.timeline-list {
  position: relative;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  position: relative;
  padding-bottom: 32rpx;
  
  &:last-child {
    padding-bottom: 0;
    
    &::after {
      display: none;
    }
  }
  
  &::after {
    content: '';
    position: absolute;
    left: 16rpx;
    top: 40rpx;
    bottom: 0;
    width: 2rpx;
    background: #f0f0f0;
  }
}

.timeline-dot {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #f0f0f0;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  
  &.primary {
    background: #667eea;
  }
  
  &.success {
    background: #22c55e;
  }
  
  &.info {
    background: #06b6d4;
  }
  
  &.warning {
    background: #f59e0b;
  }
  
  &.danger {
    background: #ef4444;
  }
}

.timeline-content {
  flex: 1;
  padding-top: 4rpx;
}

.timeline-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.timeline-description {
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8rpx;
  display: block;
}

.timeline-time {
  font-size: 22rpx;
  color: #999;
}

.bottom-spacer {
  height: 150rpx;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  background: white;
  border-top: 2rpx solid #f0f0f0;
  box-shadow: 0 -2rpx 8rpx rgba(0,0,0,0.1);
}

.action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  
  &.primary {
    background: #667eea;
    color: white;
  }
  
  &.secondary {
    background: #f5f5f5;
    color: #333;
  }
  
  &.danger {
    background: #ff4444;
    color: white;
  }
}
</style>
