<!--
  店铺详情页面
  @description 根据设计稿展示店铺信息、空间列表、状态实时同步，集成视频播放和预订入口
-->
<template>
  <view class="store-detail-page">
    <!-- 店铺头图和基础信息 -->
    <view class="store-header">
      <!-- 图片轮播 -->
      <swiper 
        class="store-images"
        :indicator-dots="true"
        :autoplay="false"
        :duration="300"
        indicator-color="rgba(255,255,255,0.5)"
        indicator-active-color="#ffffff"
      >
        <swiper-item 
          v-for="(image, index) in storeInfo.images"
          :key="index"
        >
          <image 
            :src="image"
            class="store-image"
            mode="aspectFill"
            @click="previewImage(index)"
          />
        </swiper-item>
      </swiper>
      
      <!-- 导航栏 -->
      <view class="navbar">
        <view class="nav-left">
          <view class="nav-btn" @click="goBack">
            <text class="nav-icon">←</text>
          </view>
        </view>
        <view class="nav-right">
          <view class="nav-btn" @click="shareStore">
            <text class="nav-icon">📤</text>
          </view>
          <view class="nav-btn" @click="toggleFavorite">
            <text class="nav-icon">{{ isFavorite ? '❤️' : '🤍' }}</text>
          </view>
        </view>
      </view>
      
      <!-- 店铺基础信息 -->
      <view class="store-basic-info">
        <view class="store-name-section">
          <text class="store-name">{{ storeInfo.name }}</text>
          <view class="store-rating">
            <text class="rating-text">{{ storeInfo.averageRating?.toFixed(1) || '0.0' }}</text>
            <text class="rating-star">⭐</text>
            <text class="rating-count">({{ storeInfo.reviewCount || 0 }}条评价)</text>
          </view>
        </view>
        
        <text v-if="storeInfo.description" class="store-desc">{{ storeInfo.description }}</text>
        
        <!-- 店铺标签 -->
        <view v-if="storeInfo.tags?.length" class="store-tags">
          <text 
            v-for="tag in storeInfo.tags"
            :key="tag"
            class="store-tag"
          >
            {{ tag }}
          </text>
        </view>
        
        <!-- 营业状态和时间 -->
        <view class="store-status">
          <view class="status-item">
            <text class="status-label">营业状态</text>
            <text class="status-value" :class="{ 'open': isOpen, 'closed': !isOpen }">
              {{ isOpen ? '营业中' : '已打烊' }}
            </text>
          </view>
          <view v-if="storeInfo.openingHours" class="status-item">
            <text class="status-label">营业时间</text>
            <text class="status-value">{{ storeInfo.openingHours }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 店铺信息详情 -->
    <view class="store-details">
      <!-- 联系信息 -->
      <view class="detail-section">
        <view class="section-header">
          <text class="section-title">联系信息</text>
        </view>
        <view class="contact-info">
          <view class="contact-item" @click="callStore">
            <text class="contact-icon">📞</text>
            <text class="contact-text">{{ storeInfo.phone || '暂无电话' }}</text>
            <text class="contact-action">拨打</text>
          </view>
          <view class="contact-item" @click="navigateToStore">
            <text class="contact-icon">📍</text>
            <text class="contact-text">{{ storeInfo.address || '暂无地址' }}</text>
            <text class="contact-action">导航</text>
          </view>
        </view>
      </view>

      <!-- 空间展示 -->
      <view class="detail-section">
        <view class="section-header">
          <text class="section-title">空间展示</text>
          <text class="section-subtitle">{{ roomList.length }}个空间</text>
        </view>
        
        <!-- 空间筛选 -->
        <scroll-view class="room-filters" scroll-x>
          <view class="filter-buttons">
            <view 
              class="filter-btn"
              :class="{ 'active': selectedRoomType === '' }"
              @click="selectRoomType('')"
            >
              <text class="btn-text">全部</text>
            </view>
            <view 
              v-for="type in roomTypes"
              :key="type"
              class="filter-btn"
              :class="{ 'active': selectedRoomType === type }"
              @click="selectRoomType(type)"
            >
              <text class="btn-text">{{ type }}</text>
            </view>
          </view>
        </scroll-view>
        
        <!-- 空间列表 -->
        <view class="room-list">
          <view 
            v-for="room in filteredRooms"
            :key="room._id"
            class="room-item"
            @click="previewRoom(room)"
          >
            <!-- 空间图片或视频 -->
            <view class="room-media">
              <image 
                v-if="!room.videos?.length"
                :src="room.images?.[0] || '/static/placeholder-room.png'"
                class="room-image"
                mode="aspectFill"
              />
              <VideoPlayer
                v-else
                :src="room.videos[0]"
                :poster="room.images?.[0]"
                :show-controls="false"
                class="room-video"
              />
              <view class="room-status" :class="room.status">
                <text class="status-text">{{ getRoomStatusText(room.status) }}</text>
              </view>
            </view>
            
            <!-- 空间信息 -->
            <view class="room-info">
              <view class="room-header">
                <text class="room-name">{{ room.name }}</text>
                <text class="room-type">{{ room.type }}</text>
              </view>
              
              <text v-if="room.description" class="room-desc">{{ room.description }}</text>
              
              <view class="room-features">
                <text class="feature-label">容纳：</text>
                <text class="feature-value">{{ room.capacity }}人</text>
                <text class="feature-label">最低消费：</text>
                <text class="feature-value">¥{{ room.minPrice }}</text>
              </view>
              
              <!-- 空间特色 -->
              <view v-if="room.features?.length" class="room-tags">
                <text 
                  v-for="feature in room.features.slice(0, 3)"
                  :key="feature"
                  class="room-tag"
                >
                  {{ feature }}
                </text>
              </view>
            </view>
            
            <!-- 预订按钮 -->
            <view class="room-actions">
              <button 
                class="book-btn"
                :class="{ 'disabled': room.status !== 'available' }"
                @click.stop="bookRoom(room)"
              >
                {{ room.status === 'available' ? '立即预订' : '暂不可订' }}
              </button>
            </view>
          </view>
        </view>
        
        <!-- 空状态 -->
        <view v-if="filteredRooms.length === 0" class="empty-rooms">
          <text class="empty-text">该类型暂无可用空间</text>
        </view>
      </view>

      <!-- 用户评价 -->
      <view class="detail-section">
        <view class="section-header">
          <text class="section-title">用户评价</text>
          <text class="section-action" @click="goToReviews">查看全部</text>
        </view>
        
        <!-- 评价统计 -->
        <view class="review-stats">
          <view class="rating-overview">
            <text class="rating-number">{{ storeInfo.averageRating?.toFixed(1) || '0.0' }}</text>
            <view class="rating-stars">
              <text 
                v-for="i in 5"
                :key="i"
                class="star"
                :class="{ 'filled': i <= Math.floor(storeInfo.averageRating || 0) }"
              >
                ⭐
              </text>
            </view>
            <text class="rating-desc">{{ getRatingDesc(storeInfo.averageRating || 0) }}</text>
          </view>
          
          <view class="rating-distribution">
            <view 
              v-for="(count, star) in ratingDistribution"
              :key="star"
              class="rating-bar"
            >
              <text class="star-label">{{ star }}星</text>
              <view class="bar-container">
                <view 
                  class="bar-fill"
                  :style="{ width: getPercentage(count) + '%' }"
                ></view>
              </view>
              <text class="star-count">{{ count }}</text>
            </view>
          </view>
        </view>
        
        <!-- 评价列表 -->
        <view class="review-list">
          <view 
            v-for="review in reviewList.slice(0, 3)"
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
                    class="review-star"
                    :class="{ 'filled': i <= review.rating }"
                  >
                    ⭐
                  </text>
                </view>
              </view>
              <text class="review-time">{{ formatTime(review.createdAt) }}</text>
            </view>
            
            <text class="review-content">{{ review.comment }}</text>
            
            <!-- 评价图片 -->
            <view v-if="review.images?.length" class="review-images">
              <image 
                v-for="(image, index) in review.images.slice(0, 3)"
                :key="index"
                :src="image"
                class="review-image"
                mode="aspectFill"
                @click="previewReviewImage(review.images, index)"
              />
            </view>
            
            <!-- 商家回复 -->
            <view v-if="review.replies?.length" class="review-reply">
              <view class="reply-header">
                <text class="reply-label">商家回复</text>
              </view>
              <text class="reply-content">{{ review.replies[0].comment }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-spacer"></view>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-actions">
      <view class="action-buttons">
        <view class="action-btn secondary" @click="callStore">
          <text class="btn-icon">📞</text>
          <text class="btn-text">电话</text>
        </view>
        <view class="action-btn secondary" @click="openChat">
          <text class="btn-icon">💬</text>
          <text class="btn-text">咨询</text>
        </view>
      </view>
      <button class="primary-btn" @click="quickBook">
        立即预订
      </button>
    </view>

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
import * as StoreService from '@/services/store'
import VideoPlayer from '@/components/VideoPlayer.vue'
import RealtimeStatus from '@/components/RealtimeStatus.vue'

// 页面参数类型
interface PageParams {
  id: string
}

// 状态管理
const storeId = ref('')
const isFavorite = ref(false)
const selectedRoomType = ref('')
const isOpen = ref(true)

// 数据
const storeInfo = ref<any>({
  name: '加载中...',
  images: ['/static/placeholder-store.png'],
  averageRating: 0,
  reviewCount: 0,
  tags: [],
  openingHours: '',
  phone: '',
  address: ''
})

const roomList = ref<any[]>([])
const reviewList = ref<any[]>([])

// 模拟评分分布数据
const ratingDistribution = ref({
  5: 45,
  4: 23,
  3: 12,
  2: 5,
  1: 2
})

// 计算属性
const roomTypes = computed(() => {
  const types = new Set(roomList.value.map(room => room.type))
  return Array.from(types)
})

const filteredRooms = computed(() => {
  if (!selectedRoomType.value) {
    return roomList.value
  }
  return roomList.value.filter(room => room.type === selectedRoomType.value)
})

const wsUrl = computed(() => {
  return process.env.NODE_ENV === 'development' 
    ? 'ws://localhost:3000' 
    : 'wss://api.example.com'
})

// 页面加载参数处理
onLoad((options: PageParams) => {
  storeId.value = options.id
})

// 方法
// 初始化数据
const initData = async () => {
  await Promise.all([
    loadStoreInfo(),
    loadStoreRooms(),
    loadStoreReviews()
  ])
}

// 加载店铺信息
const loadStoreInfo = async () => {
  try {
    const response = await StoreService.getStoreDetails(storeId.value)
    if (response.success && response.data) {
      storeInfo.value = response.data.store
      // 设置页面标题
      uni.setNavigationBarTitle({
        title: storeInfo.value.name
      })
    }
  } catch (error) {
    console.error('加载店铺信息失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  }
}

// 加载店铺空间
const loadStoreRooms = async () => {
  try {
    const response = await StoreService.getStoreRooms(storeId.value)
    if (response.success && response.data) {
      roomList.value = response.data.rooms.map(room => ({
        ...room,
        status: Math.random() > 0.3 ? 'available' : 'occupied' // 模拟状态
      }))
    }
  } catch (error) {
    console.error('加载空间信息失败:', error)
  }
}

// 加载店铺评价
const loadStoreReviews = async () => {
  try {
    // 模拟评价数据
    reviewList.value = [
      {
        _id: '1',
        user: {
          nickname: '小李',
          avatar: '/static/avatar1.jpg'
        },
        rating: 5,
        comment: '环境很好，服务态度也不错，音响效果特别棒！',
        images: ['/static/review1.jpg', '/static/review2.jpg'],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        replies: [{
          comment: '感谢您的好评，期待您下次光临！'
        }]
      },
      {
        _id: '2',
        user: {
          nickname: '张三',
          avatar: '/static/avatar2.jpg'
        },
        rating: 4,
        comment: '整体不错，包间比较干净，就是价格稍微贵了点',
        images: [],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        replies: []
      }
    ]
  } catch (error) {
    console.error('加载评价失败:', error)
  }
}

// 选择空间类型
const selectRoomType = (type: string) => {
  selectedRoomType.value = type
}

// 获取空间状态文本
const getRoomStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    available: '可预订',
    booked: '已预订',
    occupied: '使用中',
    cleaning: '清洁中',
    maintenance: '维护中'
  }
  return statusMap[status] || '未知'
}

// 获取评分描述
const getRatingDesc = (rating: number): string => {
  if (rating >= 4.5) return '非常满意'
  if (rating >= 4.0) return '满意'
  if (rating >= 3.5) return '一般'
  if (rating >= 3.0) return '较差'
  return '很差'
}

// 获取评分百分比
const getPercentage = (count: number): number => {
  const total = Object.values(ratingDistribution.value).reduce((sum, num) => sum + num, 0)
  return total > 0 ? (count / total) * 100 : 0
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

// 分享店铺
const shareStore = () => {
  uni.share({
    provider: 'weixin',
    scene: 'WXSceneSession',
    type: 0,
    href: '',
    title: storeInfo.value.name,
    summary: storeInfo.value.description,
    imageUrl: storeInfo.value.images?.[0]
  })
}

// 切换收藏状态
const toggleFavorite = () => {
  isFavorite.value = !isFavorite.value
  uni.showToast({
    title: isFavorite.value ? '已收藏' : '已取消收藏',
    icon: 'none'
  })
}

// 预览图片
const previewImage = (index: number) => {
  uni.previewImage({
    current: index,
    urls: storeInfo.value.images
  })
}

// 拨打电话
const callStore = () => {
  if (storeInfo.value.phone) {
    uni.makePhoneCall({
      phoneNumber: storeInfo.value.phone
    })
  } else {
    uni.showToast({
      title: '暂无联系电话',
      icon: 'none'
    })
  }
}

// 导航到店铺
const navigateToStore = () => {
  if (storeInfo.value.location?.coordinates) {
    const [lng, lat] = storeInfo.value.location.coordinates
    uni.openLocation({
      latitude: lat,
      longitude: lng,
      name: storeInfo.value.name,
      address: storeInfo.value.address
    })
  } else {
    uni.showToast({
      title: '暂无位置信息',
      icon: 'none'
    })
  }
}

// 预览空间
const previewRoom = (room: any) => {
  uni.navigateTo({
    url: `/pages/space/preview?id=${room._id}&storeId=${storeId.value}`
  })
}

// 预订空间
const bookRoom = (room: any) => {
  if (room.status !== 'available') {
    uni.showToast({
      title: '该空间暂不可预订',
      icon: 'none'
    })
    return
  }
  
  uni.navigateTo({
    url: `/pages/booking/confirm?roomId=${room._id}&storeId=${storeId.value}`
  })
}

// 快速预订
const quickBook = () => {
  const availableRooms = roomList.value.filter(room => room.status === 'available')
  if (availableRooms.length === 0) {
    uni.showToast({
      title: '暂无可预订空间',
      icon: 'none'
    })
    return
  }
  
  uni.navigateTo({
    url: `/pages/booking/confirm?storeId=${storeId.value}`
  })
}

// 打开聊天
const openChat = () => {
  uni.navigateTo({
    url: `/pages/chat/index?storeId=${storeId.value}`
  })
}

// 查看全部评价
const goToReviews = () => {
  uni.navigateTo({
    url: `/pages/review/list?storeId=${storeId.value}`
  })
}

// 预览评价图片
const previewReviewImage = (images: string[], index: number) => {
  uni.previewImage({
    current: index,
    urls: images
  })
}

// 实时消息处理
const onRealtimeMessage = (data: any) => {
  if (data.type === 'room_status_update' && data.storeId === storeId.value) {
    // 更新空间状态
    const room = roomList.value.find(r => r._id === data.roomId)
    if (room) {
      room.status = data.status
    }
  }
}

// 生命周期
onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss">
.store-detail-page {
  min-height: 100vh;
  background: #fafafa;
  padding-bottom: 120rpx;
}

.store-header {
  position: relative;
  background: white;
}

.store-images {
  height: 500rpx;
}

.store-image {
  width: 100%;
  height: 100%;
}

.navbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
  z-index: 10;
}

.nav-left,
.nav-right {
  display: flex;
  gap: 16rpx;
}

.nav-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10rpx);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  font-size: 32rpx;
  color: white;
}

.store-basic-info {
  padding: 32rpx;
}

.store-name-section {
  margin-bottom: 16rpx;
}

.store-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.3;
  margin-bottom: 12rpx;
  display: block;
}

.store-rating {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.rating-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #ff9500;
}

.rating-star {
  font-size: 24rpx;
}

.rating-count {
  font-size: 24rpx;
  color: #999;
}

.store-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.5;
  margin-bottom: 24rpx;
  display: block;
}

.store-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-bottom: 24rpx;
}

.store-tag {
  font-size: 22rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
}

.store-status {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-size: 28rpx;
  color: #666;
}

.status-value {
  font-size: 28rpx;
  color: #333;
  
  &.open {
    color: #00aa00;
  }
  
  &.closed {
    color: #ff4444;
  }
}

.store-details {
  margin-top: 16rpx;
}

.detail-section {
  background: white;
  margin-bottom: 16rpx;
  padding: 32rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.section-subtitle {
  font-size: 24rpx;
  color: #999;
}

.section-action {
  font-size: 26rpx;
  color: #667eea;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
}

.contact-icon {
  font-size: 32rpx;
  color: #667eea;
}

.contact-text {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.contact-action {
  font-size: 26rpx;
  color: #667eea;
}

.room-filters {
  margin-bottom: 24rpx;
}

.filter-buttons {
  display: flex;
  gap: 16rpx;
  padding: 0 4rpx;
}

.filter-btn {
  padding: 16rpx 32rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  border: 2rpx solid transparent;
  flex-shrink: 0;
  
  &.active {
    background: rgba(102, 126, 234, 0.1);
    border-color: #667eea;
    
    .btn-text {
      color: #667eea;
    }
  }
}

.btn-text {
  font-size: 26rpx;
  color: #333;
  white-space: nowrap;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.room-item {
  border: 2rpx solid #f0f0f0;
  border-radius: 16rpx;
  overflow: hidden;
  background: white;
}

.room-media {
  position: relative;
  height: 320rpx;
}

.room-image,
.room-video {
  width: 100%;
  height: 100%;
}

.room-status {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  backdrop-filter: blur(10rpx);
  
  &.available {
    background: rgba(0, 170, 0, 0.8);
  }
  
  &.occupied {
    background: rgba(255, 68, 68, 0.8);
  }
  
  &.booked {
    background: rgba(255, 165, 0, 0.8);
  }
  
  &.cleaning,
  &.maintenance {
    background: rgba(153, 153, 153, 0.8);
  }
}

.status-text {
  font-size: 22rpx;
  color: white;
}

.room-info {
  padding: 24rpx;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12rpx;
}

.room-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
  margin-right: 16rpx;
}

.room-type {
  font-size: 24rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
}

.room-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
  margin-bottom: 16rpx;
  display: block;
}

.room-features {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}

.feature-label {
  font-size: 24rpx;
  color: #999;
}

.feature-value {
  font-size: 24rpx;
  color: #333;
  margin-right: 16rpx;
}

.room-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.room-tag {
  font-size: 20rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
}

.room-actions {
  padding: 0 24rpx 24rpx;
}

.book-btn {
  width: 100%;
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

.empty-rooms {
  padding: 80rpx;
  text-align: center;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.review-stats {
  margin-bottom: 32rpx;
}

.rating-overview {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.rating-number {
  font-size: 64rpx;
  font-weight: 600;
  color: #ff9500;
}

.rating-stars {
  display: flex;
  gap: 4rpx;
}

.star {
  font-size: 24rpx;
  opacity: 0.3;
  
  &.filled {
    opacity: 1;
  }
}

.rating-desc {
  font-size: 28rpx;
  color: #666;
}

.rating-distribution {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.rating-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.star-label {
  font-size: 24rpx;
  color: #666;
  width: 60rpx;
}

.bar-container {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #ff9500;
  transition: width 0.3s ease;
}

.star-count {
  font-size: 24rpx;
  color: #999;
  width: 40rpx;
  text-align: right;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.review-item {
  padding-bottom: 32rpx;
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
  margin-bottom: 16rpx;
}

.user-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f0f0f0;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 4rpx;
  display: block;
}

.review-rating {
  display: flex;
  gap: 2rpx;
}

.review-star {
  font-size: 20rpx;
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
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  margin-bottom: 16rpx;
  display: block;
}

.review-images {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.review-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
}

.review-reply {
  background: #f5f5f5;
  padding: 16rpx;
  border-radius: 12rpx;
}

.reply-header {
  margin-bottom: 8rpx;
}

.reply-label {
  font-size: 24rpx;
  color: #667eea;
  font-weight: 500;
}

.reply-content {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
}

.bottom-spacer {
  height: 120rpx;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 2rpx solid #f0f0f0;
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  z-index: 100;
}

.action-buttons {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 20rpx;
  
  &.secondary {
    color: #667eea;
  }
}

.btn-icon {
  font-size: 28rpx;
}

.btn-text {
  font-size: 22rpx;
}

.primary-btn {
  flex: 1;
  height: 80rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  font-size: 32rpx;
  border: none;
}
</style>
