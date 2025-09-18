<!--
  预订核销页面
  @description 按设计稿生成和展示预订码、支持商户扫码核销，显示预订状态和到店指引
-->
<template>
  <view class="booking-verify-page">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">预订核销</text>
      </view>
      <view class="nav-right">
        <view class="nav-btn" @click="shareBooking">
          <text class="nav-icon">🔗</text>
        </view>
      </view>
    </view>

    <scroll-view 
      class="content-scroll" 
      scroll-y 
      refresher-enabled 
      :refresher-triggered="isRefreshing" 
      @refresherrefresh="onRefresh"
    >
      <!-- 预订状态卡片 -->
      <view class="status-card">
        <view class="status-header">
          <view class="status-info">
            <text class="booking-number">预订号：{{ bookingInfo.bookingNumber }}</text>
            <view class="status-badge" :class="getStatusClass(bookingInfo.status)">
              <text class="status-text">{{ getStatusText(bookingInfo.status) }}</text>
            </view>
          </view>
          <view v-if="bookingInfo.status === 'confirmed'" class="status-countdown">
            <text class="countdown-label">距离到店</text>
            <text class="countdown-time">{{ getCountdownText() }}</text>
          </view>
        </view>
        
        <!-- 到店指引 -->
        <view v-if="bookingInfo.status === 'confirmed'" class="arrival-guide">
          <view class="guide-header">
            <text class="guide-icon">📍</text>
            <text class="guide-title">到店指引</text>
          </view>
          <view class="guide-steps">
            <view class="guide-step">
              <text class="step-number">1</text>
              <text class="step-text">到达店铺后，向前台出示此页面</text>
            </view>
            <view class="guide-step">
              <text class="step-number">2</text>
              <text class="step-text">商户扫描下方二维码进行核销</text>
            </view>
            <view class="guide-step">
              <text class="step-number">3</text>
              <text class="step-text">核销成功后即可开始使用</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 核销二维码 -->
      <view v-if="bookingInfo.status === 'confirmed'" class="qr-code-section">
        <view class="qr-header">
          <text class="qr-title">核销码</text>
          <text class="qr-subtitle">请向商户出示此二维码</text>
        </view>
        
        <view class="qr-code-container">
          <canvas 
            canvas-id="bookingQRCode"
            class="qr-canvas"
            @tap="showQRCodeModal"
          />
          <view class="qr-code-overlay" @click="showQRCodeModal">
            <text class="overlay-text">点击放大</text>
          </view>
        </view>
        
        <view class="qr-code-info">
          <text class="verification-code">核销码：{{ bookingInfo.verificationCode }}</text>
          <text class="qr-validity">二维码30分钟内有效</text>
        </view>
        
        <!-- 快捷操作 -->
        <view class="qr-actions">
          <view class="action-btn" @click="refreshQRCode">
            <text class="btn-icon">🔄</text>
            <text class="btn-text">刷新</text>
          </view>
          <view class="action-btn" @click="saveQRCode">
            <text class="btn-icon">💾</text>
            <text class="btn-text">保存</text>
          </view>
          <view class="action-btn" @click="showQRCodeModal">
            <text class="btn-icon">🔍</text>
            <text class="btn-text">放大</text>
          </view>
        </view>
      </view>

      <!-- 预订详情 -->
      <view class="booking-details">
        <view class="section-header">
          <text class="section-title">预订详情</text>
          <text v-if="canModifyBooking" class="section-action" @click="modifyBooking">
            修改
          </text>
        </view>
        
        <!-- 商户信息 -->
        <view class="merchant-info">
          <image 
            :src="bookingInfo.store?.logo || '/static/placeholder-store.png'"
            class="merchant-logo"
          />
          <view class="merchant-details">
            <text class="merchant-name">{{ bookingInfo.store?.name }}</text>
            <text class="merchant-address">{{ bookingInfo.store?.address }}</text>
            <view class="merchant-contact">
              <text class="contact-phone">{{ bookingInfo.store?.phone }}</text>
              <view class="contact-actions">
                <view class="contact-btn" @click="callMerchant">
                  <text class="btn-icon">📞</text>
                </view>
                <view class="contact-btn" @click="navigateToStore">
                  <text class="btn-icon">🧭</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 预订信息 -->
        <view class="booking-info">
          <view class="info-item">
            <text class="info-label">预订空间</text>
            <text class="info-value">{{ bookingInfo.space?.name }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">预订时间</text>
            <text class="info-value">{{ formatBookingTime() }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">使用时长</text>
            <text class="info-value">{{ bookingInfo.duration }}小时</text>
          </view>
          <view class="info-item">
            <text class="info-label">预订人数</text>
            <text class="info-value">{{ bookingInfo.guestCount }}人</text>
          </view>
          <view v-if="bookingInfo.specialRequests" class="info-item">
            <text class="info-label">特殊要求</text>
            <text class="info-value">{{ bookingInfo.specialRequests }}</text>
          </view>
        </view>
        
        <!-- 联系信息 -->
        <view class="contact-info">
          <view class="info-item">
            <text class="info-label">联系人</text>
            <text class="info-value">{{ bookingInfo.contactName }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">联系电话</text>
            <text class="info-value">{{ bookingInfo.contactPhone }}</text>
          </view>
        </view>
        
        <!-- 费用信息 -->
        <view class="cost-info">
          <view class="cost-item">
            <text class="cost-label">空间费用</text>
            <text class="cost-value">¥{{ bookingInfo.spacePrice?.toFixed(2) || '0.00' }}</text>
          </view>
          <view v-if="bookingInfo.serviceFee > 0" class="cost-item">
            <text class="cost-label">服务费</text>
            <text class="cost-value">¥{{ bookingInfo.serviceFee.toFixed(2) }}</text>
          </view>
          <view v-if="bookingInfo.deposit > 0" class="cost-item">
            <text class="cost-label">押金</text>
            <text class="cost-value">¥{{ bookingInfo.deposit.toFixed(2) }}</text>
          </view>
          <view v-if="bookingInfo.discount > 0" class="cost-item discount">
            <text class="cost-label">优惠金额</text>
            <text class="cost-value">-¥{{ bookingInfo.discount.toFixed(2) }}</text>
          </view>
          <view class="cost-total">
            <text class="total-label">总计</text>
            <text class="total-value">¥{{ bookingInfo.totalAmount.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- VIP特权提示 -->
      <view v-if="userStore.isVip && bookingInfo.vipBenefits?.length" class="vip-benefits">
        <view class="section-header">
          <text class="section-title">VIP专享特权</text>
        </view>
        
        <view class="benefits-list">
          <view 
            v-for="benefit in bookingInfo.vipBenefits"
            :key="benefit.id"
            class="benefit-item"
          >
            <text class="benefit-icon">{{ benefit.icon }}</text>
            <text class="benefit-text">{{ benefit.description }}</text>
          </view>
        </view>
      </view>

      <!-- 核销记录 -->
      <view v-if="verificationHistory.length > 0" class="verification-history">
        <view class="section-header">
          <text class="section-title">核销记录</text>
        </view>
        
        <view class="history-list">
          <view 
            v-for="record in verificationHistory"
            :key="record.id"
            class="history-item"
          >
            <view class="history-icon" :class="record.type">
              <text class="icon-text">{{ getHistoryIcon(record.type) }}</text>
            </view>
            <view class="history-info">
              <text class="history-title">{{ record.title }}</text>
              <text class="history-desc">{{ record.description }}</text>
              <text class="history-time">{{ formatTime(record.time) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 预订须知 -->
      <view class="booking-notice">
        <view class="section-header">
          <text class="section-title">预订须知</text>
        </view>
        
        <view class="notice-content">
          <view class="notice-item">
            <text class="notice-text">• 请在预订时间前30分钟到达</text>
          </view>
          <view class="notice-item">
            <text class="notice-text">• 超时未到自动取消，押金不退</text>
          </view>
          <view class="notice-item">
            <text class="notice-text">• 如需取消请提前2小时联系商户</text>
          </view>
          <view class="notice-item">
            <text class="notice-text">• VIP会员享受免押金特权</text>
          </view>
          <view class="notice-item">
            <text class="notice-text">• 核销码仅限本次预订使用</text>
          </view>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="showActions" class="action-bar">
      <button 
        v-if="canCancelBooking"
        class="action-btn cancel"
        @click="cancelBooking"
      >
        取消预订
      </button>
      
      <button 
        v-if="canModifyBooking"
        class="action-btn modify"
        @click="modifyBooking"
      >
        修改预订
      </button>
      
      <button 
        v-if="canRebook"
        class="action-btn primary"
        @click="rebookSame"
      >
        再次预订
      </button>
      
      <button 
        v-if="canReview"
        class="action-btn review"
        @click="reviewBooking"
      >
        评价服务
      </button>
    </view>

    <!-- 二维码放大弹窗 -->
    <uni-popup 
      ref="qrPopup" 
      type="center"
    >
      <view class="qr-modal">
        <view class="qr-modal-header">
          <text class="modal-title">核销二维码</text>
          <text class="modal-close" @click="closeQRModal">✕</text>
        </view>
        <view class="qr-modal-content">
          <canvas 
            canvas-id="bookingQRCodeLarge"
            class="qr-canvas-large"
          />
          <view class="qr-modal-info">
            <text class="verification-code-large">{{ bookingInfo.verificationCode }}</text>
            <text class="qr-note">请向商户出示此二维码</text>
          </view>
        </view>
      </view>
    </uni-popup>

    <!-- 实时状态组件 -->
    <RealtimeStatus
      v-if="needRealtime"
      :booking-id="bookingId"
      @status-update="onStatusUpdate"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import * as BookingService from '@/services/booking'
import RealtimeStatus from '@/components/RealtimeStatus.vue'

// Store
const userStore = useUserStore()

// 路由参数
const bookingId = ref('')

// 状态管理
const isRefreshing = ref(false)
const qrCodeGenerated = ref(false)
let countdownTimer: any = null

// 预订信息
const bookingInfo = ref<any>({
  bookingNumber: '',
  status: 'confirmed',
  verificationCode: '',
  store: {},
  space: {},
  bookingTime: new Date(),
  duration: 2,
  guestCount: 4,
  contactName: '',
  contactPhone: '',
  specialRequests: '',
  spacePrice: 0,
  serviceFee: 0,
  deposit: 0,
  discount: 0,
  totalAmount: 0,
  vipBenefits: [],
  createdAt: new Date(),
  updatedAt: new Date()
})

// 核销记录
const verificationHistory = ref<any[]>([])

// Refs
const qrPopup = ref()

// 计算属性
const needRealtime = computed(() => {
  return ['confirmed', 'arrived'].includes(bookingInfo.value.status)
})

const showActions = computed(() => {
  return canCancelBooking.value || canModifyBooking.value || canRebook.value || canReview.value
})

const canCancelBooking = computed(() => {
  const now = new Date()
  const bookingTime = new Date(bookingInfo.value.bookingTime)
  const timeDiff = bookingTime.getTime() - now.getTime()
  const hoursDiff = timeDiff / (1000 * 60 * 60)
  
  return ['confirmed'].includes(bookingInfo.value.status) && hoursDiff > 2
})

const canModifyBooking = computed(() => {
  const now = new Date()
  const bookingTime = new Date(bookingInfo.value.bookingTime)
  const timeDiff = bookingTime.getTime() - now.getTime()
  const hoursDiff = timeDiff / (1000 * 60 * 60)
  
  return ['confirmed'].includes(bookingInfo.value.status) && hoursDiff > 4
})

const canRebook = computed(() => {
  return ['completed', 'cancelled'].includes(bookingInfo.value.status)
})

const canReview = computed(() => {
  return bookingInfo.value.status === 'completed' && !bookingInfo.value.reviewed
})

// 方法
// 初始化数据
const initData = async () => {
  await loadBookingInfo()
  await loadVerificationHistory()
  if (bookingInfo.value.status === 'confirmed') {
    generateQRCode()
    startCountdown()
  }
}

// 加载预订信息
const loadBookingInfo = async () => {
  try {
    // 模拟预订数据
    bookingInfo.value = {
      _id: bookingId.value,
      bookingNumber: 'BK20240915001',
      status: 'confirmed',
      verificationCode: 'VF' + Date.now().toString().slice(-6),
      store: {
        _id: 'store1',
        name: '星空KTV',
        logo: '/static/store1.jpg',
        address: '北京市朝阳区建国路88号',
        phone: '400-1234-5678'
      },
      space: {
        _id: 'space1',
        name: '豪华大包间',
        type: 'KTV包间'
      },
      bookingTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时后
      duration: 3,
      guestCount: 6,
      contactName: '张三',
      contactPhone: '138****5678',
      specialRequests: '需要生日布置',
      spacePrice: 288,
      serviceFee: 20,
      deposit: userStore.isVip ? 0 : 100,
      discount: userStore.isVip ? 28.8 : 0,
      totalAmount: userStore.isVip ? 279.2 : 408,
      vipBenefits: userStore.isVip ? [
        {
          id: 1,
          icon: '🚫',
          description: '免押金预订特权'
        },
        {
          id: 2,
          icon: '💎',
          description: '享受9.5折优惠'
        },
        {
          id: 3,
          icon: '⚡',
          description: '优先安排房间'
        }
      ] : [],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }
  } catch (error) {
    console.error('加载预订信息失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  }
}

// 加载核销记录
const loadVerificationHistory = async () => {
  try {
    if (bookingInfo.value.status === 'completed') {
      verificationHistory.value = [
        {
          id: 1,
          type: 'success',
          title: '核销成功',
          description: '已到店并完成核销',
          time: new Date(Date.now() - 60 * 60 * 1000)
        },
        {
          id: 2,
          type: 'info',
          title: '预订确认',
          description: '预订已确认，等待到店',
          time: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      ]
    }
  } catch (error) {
    console.error('加载核销记录失败:', error)
  }
}

// 生成二维码
const generateQRCode = () => {
  try {
    const qrData = {
      type: 'booking_verification',
      bookingId: bookingInfo.value._id,
      verificationCode: bookingInfo.value.verificationCode,
      storeId: bookingInfo.value.store._id,
      timestamp: Date.now()
    }
    
    // TODO: 使用实际的二维码生成库
    const ctx = uni.createCanvasContext('bookingQRCode')
    const ctxLarge = uni.createCanvasContext('bookingQRCodeLarge')
    
    // 模拟二维码绘制
    ctx.setFillStyle('#333333')
    ctx.fillRect(0, 0, 200, 200)
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(10, 10, 20, 20)
    ctx.fillRect(40, 10, 20, 20)
    ctx.fillRect(70, 10, 20, 20)
    ctx.draw()
    
    ctxLarge.setFillStyle('#333333')
    ctxLarge.fillRect(0, 0, 300, 300)
    ctxLarge.setFillStyle('#ffffff')
    ctxLarge.fillRect(15, 15, 30, 30)
    ctxLarge.fillRect(60, 15, 30, 30)
    ctxLarge.fillRect(105, 15, 30, 30)
    ctxLarge.draw()
    
    qrCodeGenerated.value = true
    
    console.log('二维码生成成功:', JSON.stringify(qrData))
  } catch (error) {
    console.error('生成二维码失败:', error)
  }
}

// 开始倒计时
const startCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  
  countdownTimer = setInterval(() => {
    // 更新倒计时显示
  }, 60000) // 每分钟更新一次
}

// 工具方法
const getStatusText = (status: string): string => {
  const statusMap = {
    'pending': '待确认',
    'confirmed': '已确认',
    'arrived': '已到店',
    'completed': '已完成',
    'cancelled': '已取消',
    'expired': '已过期'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const getStatusClass = (status: string): string => {
  const classMap = {
    'pending': 'status-pending',
    'confirmed': 'status-confirmed',
    'arrived': 'status-arrived',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled',
    'expired': 'status-expired'
  }
  return classMap[status as keyof typeof classMap] || ''
}

const getCountdownText = (): string => {
  const now = new Date()
  const bookingTime = new Date(bookingInfo.value.bookingTime)
  const diff = bookingTime.getTime() - now.getTime()
  
  if (diff <= 0) return '已到预订时间'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else {
    return `${minutes}分钟`
  }
}

const formatBookingTime = (): string => {
  const date = new Date(bookingInfo.value.bookingTime)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  
  let dateStr = ''
  if (date.toDateString() === today.toDateString()) {
    dateStr = '今天'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    dateStr = '明天'
  } else {
    dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
  }
  
  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  
  return `${dateStr} ${timeStr}`
}

const getHistoryIcon = (type: string): string => {
  const iconMap = {
    'success': '✅',
    'info': 'ℹ️',
    'warning': '⚠️',
    'error': '❌'
  }
  return iconMap[type as keyof typeof iconMap] || 'ℹ️'
}

const formatTime = (time: Date): string => {
  const date = new Date(time)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 二维码操作
const refreshQRCode = () => {
  // 重新生成核销码
  bookingInfo.value.verificationCode = 'VF' + Date.now().toString().slice(-6)
  generateQRCode()
  
  uni.showToast({
    title: '二维码已刷新',
    icon: 'success'
  })
}

const saveQRCode = async () => {
  try {
    // TODO: 保存二维码到相册
    uni.showToast({
      title: '已保存到相册',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    })
  }
}

const showQRCodeModal = () => {
  qrPopup.value?.open()
}

const closeQRModal = () => {
  qrPopup.value?.close()
}

// 联系相关
const callMerchant = () => {
  if (bookingInfo.value.store?.phone) {
    uni.makePhoneCall({
      phoneNumber: bookingInfo.value.store.phone
    })
  }
}

const navigateToStore = () => {
  // TODO: 打开地图导航到商户
  uni.showToast({
    title: '导航功能开发中',
    icon: 'none'
  })
}

const shareBooking = () => {
  uni.showShareMenu({
    title: `我在${bookingInfo.value.store?.name}的预订`,
    content: `预订时间：${formatBookingTime()}`
  })
}

// 预订操作
const cancelBooking = async () => {
  try {
    uni.showModal({
      title: '取消预订',
      content: '确定要取消这个预订吗？押金将按规则退还。',
      success: async (res) => {
        if (res.confirm) {
          // TODO: 调用取消预订API
          bookingInfo.value.status = 'cancelled'
          
          uni.showToast({
            title: '预订已取消',
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

const modifyBooking = () => {
  uni.navigateTo({
    url: `/pages/booking/modify?id=${bookingId.value}`
  })
}

const rebookSame = () => {
  // 使用相同信息重新预订
  const bookingData = {
    storeId: bookingInfo.value.store._id,
    spaceId: bookingInfo.value.space._id,
    duration: bookingInfo.value.duration,
    guestCount: bookingInfo.value.guestCount,
    specialRequests: bookingInfo.value.specialRequests
  }
  
  uni.navigateTo({
    url: `/pages/booking/confirm?rebookData=${encodeURIComponent(JSON.stringify(bookingData))}`
  })
}

const reviewBooking = () => {
  uni.navigateTo({
    url: `/pages/booking/review?id=${bookingId.value}`
  })
}

// 事件处理
const onRefresh = async () => {
  isRefreshing.value = true
  await initData()
  isRefreshing.value = false
}

const onStatusUpdate = (data: any) => {
  bookingInfo.value.status = data.status
  
  if (data.status === 'arrived') {
    uni.showToast({
      title: '已确认到店',
      icon: 'success'
    })
  }
  
  // 更新核销记录
  verificationHistory.value.unshift({
    id: Date.now(),
    type: 'info',
    title: data.title,
    description: data.description,
    time: new Date()
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
    bookingId.value = options.id
  }
})

onShow(() => {
  // 页面显示时刷新状态
  if (bookingId.value) {
    loadBookingInfo()
  }
})

onPullDownRefresh(() => {
  onRefresh()
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style scoped lang="scss">
.booking-verify-page {
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

.status-card {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24rpx;
}

.status-info {
  flex: 1;
}

.booking-number {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}

.status-badge {
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  display: inline-block;
  
  &.status-pending {
    background: rgba(255, 165, 0, 0.1);
    color: #ff9500;
  }
  
  &.status-confirmed {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
  }
  
  &.status-arrived {
    background: rgba(0, 170, 0, 0.1);
    color: #00aa00;
  }
  
  &.status-completed {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  
  &.status-cancelled,
  &.status-expired {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.status-text {
  font-size: 24rpx;
  font-weight: 600;
}

.status-countdown {
  text-align: right;
}

.countdown-label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 8rpx;
  display: block;
}

.countdown-time {
  font-size: 28rpx;
  font-weight: 600;
  color: #667eea;
}

.arrival-guide {
  background: #f8f9ff;
  border-radius: 12rpx;
  padding: 24rpx;
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.guide-icon {
  font-size: 24rpx;
  color: #667eea;
}

.guide-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.step-number {
  width: 32rpx;
  height: 32rpx;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.step-text {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
  padding-top: 6rpx;
}

.qr-code-section {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: center;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.qr-header {
  margin-bottom: 32rpx;
}

.qr-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.qr-subtitle {
  font-size: 24rpx;
  color: #666;
}

.qr-code-container {
  position: relative;
  display: inline-block;
  margin-bottom: 24rpx;
}

.qr-canvas {
  width: 400rpx;
  height: 400rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
}

.qr-code-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay-text {
  font-size: 24rpx;
  color: transparent;
}

.qr-code-info {
  margin-bottom: 32rpx;
}

.verification-code {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.qr-validity {
  font-size: 22rpx;
  color: #ff9500;
}

.qr-actions {
  display: flex;
  justify-content: center;
  gap: 40rpx;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx;
}

.btn-icon {
  font-size: 32rpx;
  color: #667eea;
}

.btn-text {
  font-size: 24rpx;
  color: #333;
}

.booking-details,
.vip-benefits,
.verification-history,
.booking-notice {
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

.section-action {
  font-size: 26rpx;
  color: #667eea;
}

.merchant-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding-bottom: 24rpx;
  margin-bottom: 24rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.merchant-logo {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}

.merchant-details {
  flex: 1;
}

.merchant-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.merchant-address {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 12rpx;
  display: block;
}

.merchant-contact {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contact-phone {
  font-size: 24rpx;
  color: #667eea;
}

.contact-actions {
  display: flex;
  gap: 12rpx;
}

.contact-btn {
  width: 48rpx;
  height: 48rpx;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.booking-info,
.contact-info,
.cost-info {
  margin-bottom: 24rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.info-item,
.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.info-label,
.cost-label {
  font-size: 26rpx;
  color: #666;
}

.info-value,
.cost-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  text-align: right;
  
  .cost-item.discount & {
    color: #ff4444;
  }
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

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
  background: #f8f9ff;
  border-radius: 12rpx;
}

.benefit-icon {
  font-size: 24rpx;
}

.benefit-text {
  font-size: 26rpx;
  color: #333;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}

.history-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.success {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  
  &.info {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
  }
  
  &.warning {
    background: rgba(255, 165, 0, 0.1);
    color: #ff9500;
  }
  
  &.error {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.icon-text {
  font-size: 24rpx;
}

.history-info {
  flex: 1;
  padding-top: 8rpx;
}

.history-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.history-desc {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
  display: block;
}

.history-time {
  font-size: 22rpx;
  color: #999;
}

.notice-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.notice-item {
  padding-left: 16rpx;
}

.notice-text {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
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
  
  &.cancel {
    background: #ff4444;
    color: white;
  }
  
  &.modify {
    background: #f5f5f5;
    color: #333;
  }
  
  &.primary {
    background: #667eea;
    color: white;
  }
  
  &.review {
    background: #00aa00;
    color: white;
  }
}

// 弹窗样式
.qr-modal {
  width: 700rpx;
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
}

.qr-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.modal-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.modal-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.qr-modal-content {
  padding: 40rpx;
  text-align: center;
}

.qr-canvas-large {
  width: 500rpx;
  height: 500rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  margin-bottom: 32rpx;
}

.qr-modal-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.verification-code-large {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.qr-note {
  font-size: 24rpx;
  color: #666;
}
</style>
