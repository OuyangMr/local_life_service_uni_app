<!--
  空间预览页面
  @description 按设计稿实现空间视频播放、详细信息展示、预订按钮，根据用户等级显示不同的预订流程
-->
<template>
  <view class="space-preview-page">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">空间预览</text>
      </view>
      <view class="nav-right">
        <view class="nav-btn" @click="shareSpace">
          <text class="nav-icon">📤</text>
        </view>
      </view>
    </view>

    <!-- 空间媒体展示 -->
    <view class="space-media-section">
      <!-- 视频播放器 -->
      <view v-if="spaceInfo.videos?.length" class="video-container">
        <VideoPlayer
          :src="spaceInfo.videos"
          :poster="spaceInfo.images?.[0]"
          :show-controls="true"
          :show-fullscreen-btn="true"
          :autoplay="false"
          class="space-video"
          @fullscreenchange="onFullscreenChange"
        />
        
        <!-- 视频控制浮层 -->
        <view v-if="!isFullscreen" class="video-overlay">
          <view class="overlay-content">
            <text class="space-name">{{ spaceInfo.name }}</text>
            <text class="space-type">{{ spaceInfo.type }}</text>
          </view>
        </view>
      </view>
      
      <!-- 图片轮播（无视频时） -->
      <view v-else class="image-container">
        <swiper 
          class="space-images"
          :indicator-dots="true"
          :autoplay="false"
          :duration="300"
          indicator-color="rgba(255,255,255,0.5)"
          indicator-active-color="#ffffff"
        >
          <swiper-item 
            v-for="(image, index) in spaceInfo.images"
            :key="index"
          >
            <image 
              :src="image"
              class="space-image"
              mode="aspectFill"
              @click="previewImage(index)"
            />
          </swiper-item>
        </swiper>
        
        <!-- 图片信息浮层 -->
        <view class="image-overlay">
          <text class="space-name">{{ spaceInfo.name }}</text>
          <text class="space-type">{{ spaceInfo.type }}</text>
        </view>
      </view>
    </view>

    <!-- 空间详细信息 -->
    <scroll-view class="space-details" scroll-y>
      <!-- 基础信息卡片 -->
      <view class="detail-card">
        <view class="card-header">
          <text class="card-title">基础信息</text>
          <view class="space-status" :class="spaceInfo.status">
            <text class="status-text">{{ getStatusText(spaceInfo.status) }}</text>
          </view>
        </view>
        
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">容纳人数</text>
            <text class="info-value">{{ spaceInfo.capacity }}人</text>
          </view>
          <view class="info-item">
            <text class="info-label">空间大小</text>
            <text class="info-value">{{ spaceInfo.size || '约20㎡' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">最低消费</text>
            <text class="info-value">¥{{ spaceInfo.minPrice }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">小时费用</text>
            <text class="info-value">¥{{ spaceInfo.hourlyRate || spaceInfo.minPrice }}/小时</text>
          </view>
        </view>
      </view>

      <!-- 设施特色卡片 -->
      <view v-if="spaceInfo.features?.length" class="detail-card">
        <view class="card-header">
          <text class="card-title">设施特色</text>
        </view>
        
        <view class="features-grid">
          <view 
            v-for="feature in spaceInfo.features"
            :key="feature"
            class="feature-item"
          >
            <text class="feature-icon">{{ getFeatureIcon(feature) }}</text>
            <text class="feature-text">{{ feature }}</text>
          </view>
        </view>
      </view>

      <!-- 价格说明卡片 -->
      <view class="detail-card">
        <view class="card-header">
          <text class="card-title">价格说明</text>
        </view>
        
        <view class="pricing-info">
          <view class="pricing-item">
            <view class="pricing-header">
              <text class="pricing-label">普通用户</text>
              <text class="pricing-price">¥{{ spaceInfo.minPrice }}</text>
            </view>
            <text class="pricing-desc">最低消费，时长不限</text>
          </view>
          
          <view v-if="userStore.isVip" class="pricing-item vip">
            <view class="pricing-header">
              <text class="pricing-label">VIP会员</text>
              <text class="pricing-price">¥{{ getVipPrice() }}</text>
              <text class="pricing-badge">专享</text>
            </view>
            <text class="pricing-desc">VIP专享价格，免预订押金</text>
          </view>
          
          <view class="pricing-item">
            <view class="pricing-header">
              <text class="pricing-label">超时费用</text>
              <text class="pricing-price">¥{{ spaceInfo.overtimeRate || 50 }}/小时</text>
            </view>
            <text class="pricing-desc">超出最低消费时长后按小时计费</text>
          </view>
        </view>
      </view>

      <!-- 预订须知卡片 -->
      <view class="detail-card">
        <view class="card-header">
          <text class="card-title">预订须知</text>
        </view>
        
        <view class="booking-rules">
          <view class="rule-item">
            <text class="rule-icon">📋</text>
            <text class="rule-text">建议提前{{ getAdvanceBookingTime() }}预订，确保有空间</text>
          </view>
          <view class="rule-item">
            <text class="rule-icon">💳</text>
            <text class="rule-text">{{ userStore.isVip ? 'VIP用户免押金' : '需支付50%押金' }}</text>
          </view>
          <view class="rule-item">
            <text class="rule-icon">⏰</text>
            <text class="rule-text">请准时到达，超时15分钟将自动释放空间</text>
          </view>
          <view class="rule-item">
            <text class="rule-icon">🚫</text>
            <text class="rule-text">禁止吸烟，禁止携带外食</text>
          </view>
        </view>
      </view>

      <!-- 用户评价预览 -->
      <view v-if="reviewList.length > 0" class="detail-card">
        <view class="card-header">
          <text class="card-title">用户评价</text>
          <text class="header-action" @click="goToReviews">查看更多</text>
        </view>
        
        <view class="reviews-preview">
          <view 
            v-for="review in reviewList.slice(0, 2)"
            :key="review._id"
            class="review-item"
          >
            <view class="review-header">
              <image 
                :src="review.user?.avatar || '/static/default-avatar.png'"
                class="user-avatar"
                mode="aspectFill"
              />
              <view class="user-info">
                <text class="user-name">{{ review.user?.nickname || '匿名用户' }}</text>
                <view class="review-rating">
                  <text 
                    v-for="i in 5"
                    :key="i"
                    class="star"
                    :class="{ 'filled': i <= review.rating }"
                  >
                    ⭐
                  </text>
                </view>
              </view>
              <text class="review-time">{{ formatTime(review.createdAt) }}</text>
            </view>
            <text class="review-content">{{ review.comment }}</text>
          </view>
        </view>
      </view>

      <!-- 相关推荐 -->
      <view v-if="recommendSpaces.length > 0" class="detail-card">
        <view class="card-header">
          <text class="card-title">相关推荐</text>
        </view>
        
        <scroll-view class="recommend-scroll" scroll-x>
          <view class="recommend-list">
            <view 
              v-for="space in recommendSpaces"
              :key="space._id"
              class="recommend-item"
              @click="viewSpace(space._id)"
            >
              <image 
                :src="space.images?.[0] || '/static/placeholder-room.png'"
                class="recommend-image"
                mode="aspectFill"
              />
              <view class="recommend-info">
                <text class="recommend-name">{{ space.name }}</text>
                <text class="recommend-price">¥{{ space.minPrice }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部预订栏 -->
    <view class="booking-bar">
      <view class="price-info">
        <text class="price-label">{{ userStore.isVip ? 'VIP价格' : '普通价格' }}</text>
        <text class="price-value">¥{{ userStore.isVip ? getVipPrice() : spaceInfo.minPrice }}</text>
        <text class="price-unit">/最低消费</text>
      </view>
      
      <view class="booking-actions">
        <button 
          class="consult-btn"
          @click="openConsult"
        >
          咨询
        </button>
        <button 
          class="book-btn"
          :class="{ 'disabled': !canBook }"
          @click="handleBooking"
        >
          {{ getBookingButtonText() }}
        </button>
      </view>
    </view>

    <!-- 咨询弹窗 -->
    <uni-popup 
      ref="consultPopup" 
      type="bottom"
    >
      <view class="consult-modal">
        <view class="modal-header">
          <text class="modal-title">咨询客服</text>
          <text class="modal-close" @click="closeConsult">✕</text>
        </view>
        <view class="consult-options">
          <view class="consult-option" @click="callStore">
            <text class="option-icon">📞</text>
            <text class="option-text">电话咨询</text>
            <text class="option-desc">直接拨打店铺电话</text>
          </view>
          <view class="consult-option" @click="openChat">
            <text class="option-icon">💬</text>
            <text class="option-text">在线客服</text>
            <text class="option-desc">实时聊天咨询</text>
          </view>
        </view>
      </view>
    </uni-popup>

    <!-- 实时状态组件 -->
    <RealtimeStatus 
      :ws-url="wsUrl"
      :show-indicator="false"
      @message="onRealtimeMessage"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import * as StoreService from '@/services/store'
import VideoPlayer from '@/components/VideoPlayer.vue'
import RealtimeStatus from '@/components/RealtimeStatus.vue'

// 页面参数类型
interface PageParams {
  id: string
  storeId: string
}

// Store
const userStore = useUserStore()

// 状态管理
const spaceId = ref('')
const storeId = ref('')
const isFullscreen = ref(false)

// 数据
const spaceInfo = ref<any>({
  name: '加载中...',
  type: '',
  capacity: 0,
  minPrice: 0,
  status: 'available',
  images: [],
  videos: [],
  features: []
})

const reviewList = ref<any[]>([])
const recommendSpaces = ref<any[]>([])

// Refs
const consultPopup = ref()

// 计算属性
const canBook = computed(() => {
  return spaceInfo.value.status === 'available'
})

const wsUrl = computed(() => {
  return process.env.NODE_ENV === 'development' 
    ? 'ws://localhost:3000' 
    : 'wss://api.example.com'
})

// 页面加载参数处理
onLoad((options: PageParams) => {
  spaceId.value = options.id
  storeId.value = options.storeId
})

// 方法
// 初始化数据
const initData = async () => {
  await Promise.all([
    loadSpaceInfo(),
    loadSpaceReviews(),
    loadRecommendSpaces()
  ])
}

// 加载空间信息
const loadSpaceInfo = async () => {
  try {
    // 模拟API调用
    setTimeout(() => {
      spaceInfo.value = {
        _id: spaceId.value,
        name: '豪华大包间',
        type: 'KTV包间',
        capacity: 15,
        minPrice: 288,
        hourlyRate: 88,
        overtimeRate: 50,
        size: '30㎡',
        status: 'available',
        description: '配备专业音响设备和豪华装修',
        images: [
          '/static/room1.jpg',
          '/static/room2.jpg',
          '/static/room3.jpg'
        ],
        videos: [
          '/static/room-video.mp4'
        ],
        features: [
          '独立卫生间',
          '专业音响',
          '55寸大屏',
          '豪华沙发',
          '空调恒温',
          '免费WiFi',
          '点歌系统',
          '调音台'
        ]
      }
      
      // 设置页面标题
      uni.setNavigationBarTitle({
        title: spaceInfo.value.name
      })
    }, 500)
  } catch (error) {
    console.error('加载空间信息失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  }
}

// 加载空间评价
const loadSpaceReviews = async () => {
  try {
    // 模拟评价数据
    reviewList.value = [
      {
        _id: '1',
        user: {
          nickname: '音乐爱好者',
          avatar: '/static/avatar1.jpg'
        },
        rating: 5,
        comment: '包间很大，音响效果棒，还有专业的调音台，唱歌体验很好！',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: '2',
        user: {
          nickname: '聚会达人',
          avatar: '/static/avatar2.jpg'
        },
        rating: 4,
        comment: '装修豪华，设备齐全，就是价格稍微贵了点，但物有所值',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  } catch (error) {
    console.error('加载评价失败:', error)
  }
}

// 加载推荐空间
const loadRecommendSpaces = async () => {
  try {
    // 模拟推荐数据
    recommendSpaces.value = [
      {
        _id: '2',
        name: '温馨中包间',
        minPrice: 188,
        images: ['/static/room4.jpg']
      },
      {
        _id: '3',
        name: '豪华小包间',
        minPrice: 128,
        images: ['/static/room5.jpg']
      },
      {
        _id: '4',
        name: 'VIP总统包',
        minPrice: 588,
        images: ['/static/room6.jpg']
      }
    ]
  } catch (error) {
    console.error('加载推荐失败:', error)
  }
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    available: '可预订',
    booked: '已预订',
    occupied: '使用中',
    cleaning: '清洁中',
    maintenance: '维护中'
  }
  return statusMap[status] || '未知'
}

// 获取设施图标
const getFeatureIcon = (feature: string): string => {
  const iconMap: Record<string, string> = {
    '独立卫生间': '🚿',
    '专业音响': '🎵',
    '55寸大屏': '📺',
    '豪华沙发': '🛋️',
    '空调恒温': '❄️',
    '免费WiFi': '📶',
    '点歌系统': '🎤',
    '调音台': '🎛️',
    '投影仪': '📽️',
    '游戏设备': '🎮',
    '麻将桌': '🀄',
    '茶具': '🍵'
  }
  return iconMap[feature] || '✅'
}

// 获取VIP价格
const getVipPrice = (): number => {
  return Math.floor(spaceInfo.value.minPrice * 0.8) // VIP享受8折
}

// 获取建议预订时间
const getAdvanceBookingTime = (): string => {
  if (userStore.isVip) {
    return '30分钟'
  }
  return '1小时'
}

// 获取预订按钮文本
const getBookingButtonText = (): string => {
  if (!canBook.value) {
    return '暂不可订'
  }
  
  if (userStore.isVip) {
    return 'VIP立即预订'
  }
  
  return '立即预订'
}

// 格式化时间
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  
  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 事件处理
// 返回上级页面
const goBack = () => {
  uni.navigateBack()
}

// 分享空间
const shareSpace = () => {
  uni.share({
    provider: 'weixin',
    scene: 'WXSceneSession',
    type: 0,
    href: '',
    title: spaceInfo.value.name,
    summary: spaceInfo.value.description,
    imageUrl: spaceInfo.value.images?.[0]
  })
}

// 全屏状态变化
const onFullscreenChange = (fullscreen: boolean) => {
  isFullscreen.value = fullscreen
}

// 预览图片
const previewImage = (index: number) => {
  uni.previewImage({
    current: index,
    urls: spaceInfo.value.images
  })
}

// 处理预订
const handleBooking = () => {
  if (!canBook.value) {
    uni.showToast({
      title: '该空间暂不可预订',
      icon: 'none'
    })
    return
  }
  
  // 根据用户等级显示不同流程
  if (userStore.isVip) {
    // VIP用户直接进入预订确认页面
    uni.navigateTo({
      url: `/pages/booking/confirm?roomId=${spaceId.value}&storeId=${storeId.value}&isVip=true`
    })
  } else {
    // 普通用户显示预订说明
    uni.showModal({
      title: '预订须知',
      content: '普通用户需支付50%押金，建议升级VIP享受免押金特权',
      confirmText: '继续预订',
      cancelText: '升级VIP',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({
            url: `/pages/booking/confirm?roomId=${spaceId.value}&storeId=${storeId.value}`
          })
        } else {
          uni.navigateTo({
            url: '/pages/vip/upgrade'
          })
        }
      }
    })
  }
}

// 打开咨询
const openConsult = () => {
  consultPopup.value?.open()
}

// 关闭咨询
const closeConsult = () => {
  consultPopup.value?.close()
}

// 拨打电话
const callStore = () => {
  closeConsult()
  // 这里应该从店铺信息中获取电话
  uni.makePhoneCall({
    phoneNumber: '400-123-4567'
  })
}

// 打开聊天
const openChat = () => {
  closeConsult()
  uni.navigateTo({
    url: `/pages/chat/index?storeId=${storeId.value}&spaceId=${spaceId.value}`
  })
}

// 查看评价
const goToReviews = () => {
  uni.navigateTo({
    url: `/pages/review/list?spaceId=${spaceId.value}`
  })
}

// 查看其他空间
const viewSpace = (id: string) => {
  uni.redirectTo({
    url: `/pages/space/preview?id=${id}&storeId=${storeId.value}`
  })
}

// 实时消息处理
const onRealtimeMessage = (data: any) => {
  if (data.type === 'room_status_update' && data.roomId === spaceId.value) {
    spaceInfo.value.status = data.status
  }
}

// 生命周期
onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss">
.space-preview-page {
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
  position: sticky;
  top: 0;
  z-index: 100;
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

.nav-right {
  display: flex;
  gap: 16rpx;
}

.space-media-section {
  position: relative;
  height: 500rpx;
  background: #000;
}

.video-container,
.image-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.space-video {
  width: 100%;
  height: 100%;
}

.space-images {
  height: 100%;
}

.space-image {
  width: 100%;
  height: 100%;
}

.video-overlay,
.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  padding: 48rpx 32rpx 32rpx;
  z-index: 10;
}

.overlay-content {
  color: white;
}

.space-name {
  font-size: 36rpx;
  font-weight: 600;
  color: white;
  margin-bottom: 8rpx;
  display: block;
}

.space-type {
  font-size: 28rpx;
  color: rgba(255,255,255,0.8);
}

.space-details {
  flex: 1;
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.detail-card {
  background: white;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.header-action {
  font-size: 26rpx;
  color: #667eea;
}

.space-status {
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  
  &.available {
    background: rgba(0, 170, 0, 0.1);
    
    .status-text {
      color: #00aa00;
    }
  }
  
  &.occupied {
    background: rgba(255, 68, 68, 0.1);
    
    .status-text {
      color: #ff4444;
    }
  }
  
  &.booked {
    background: rgba(255, 165, 0, 0.1);
    
    .status-text {
      color: #ffa500;
    }
  }
}

.status-text {
  font-size: 24rpx;
  font-weight: 500;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-label {
  font-size: 24rpx;
  color: #999;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.feature-icon {
  font-size: 28rpx;
}

.feature-text {
  font-size: 26rpx;
  color: #333;
}

.pricing-info {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.pricing-item {
  padding: 20rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  
  &.vip {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
  }
}

.pricing-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.pricing-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.pricing-price {
  font-size: 30rpx;
  color: #ff4444;
  font-weight: 600;
}

.pricing-badge {
  font-size: 20rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.2);
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.pricing-desc {
  font-size: 24rpx;
  color: #999;
  line-height: 1.4;
}

.booking-rules {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.rule-icon {
  font-size: 24rpx;
  margin-top: 4rpx;
  flex-shrink: 0;
}

.rule-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.reviews-preview {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.review-item {
  padding-bottom: 24rpx;
  border-bottom: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.review-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.user-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f0f0f0;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 24rpx;
  color: #333;
  margin-bottom: 4rpx;
  display: block;
}

.review-rating {
  display: flex;
  gap: 2rpx;
}

.star {
  font-size: 18rpx;
  opacity: 0.3;
  
  &.filled {
    opacity: 1;
  }
}

.review-time {
  font-size: 22rpx;
  color: #999;
}

.review-content {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
}

.recommend-scroll {
  white-space: nowrap;
}

.recommend-list {
  display: flex;
  gap: 16rpx;
  padding: 0 4rpx;
}

.recommend-item {
  width: 200rpx;
  flex-shrink: 0;
}

.recommend-image {
  width: 100%;
  height: 150rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  margin-bottom: 12rpx;
}

.recommend-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.recommend-name {
  font-size: 24rpx;
  color: #333;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.recommend-price {
  font-size: 22rpx;
  color: #ff4444;
  font-weight: 500;
}

.bottom-spacer {
  height: 120rpx;
}

.booking-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 2rpx solid #f0f0f0;
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  z-index: 100;
}

.price-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.price-label {
  font-size: 22rpx;
  color: #999;
}

.price-value {
  font-size: 36rpx;
  color: #ff4444;
  font-weight: 600;
}

.price-unit {
  font-size: 22rpx;
  color: #999;
}

.booking-actions {
  flex: 1;
  display: flex;
  gap: 16rpx;
}

.consult-btn {
  width: 120rpx;
  height: 72rpx;
  background: #f5f5f5;
  color: #667eea;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
}

.book-btn {
  flex: 1;
  height: 72rpx;
  background: #667eea;
  color: white;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  
  &.disabled {
    background: #ccc;
    color: #999;
  }
}

.consult-modal {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.modal-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.consult-options {
  padding: 32rpx;
}

.consult-option {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  background: #f5f5f5;
}

.option-icon {
  font-size: 32rpx;
  color: #667eea;
}

.option-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 4rpx;
}

.option-desc {
  font-size: 24rpx;
  color: #999;
}
</style>
