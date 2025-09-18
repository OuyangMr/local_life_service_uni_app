<!--
  用户中心页面
  @description 按设计稿展示用户信息、等级权益、积分余额、订单历史，实现等级进度显示和权益说明
-->
<template>
  <view class="user-profile-page">
    <!-- 顶部用户信息卡片 -->
    <view class="user-header">
      <view class="user-info">
        <image 
          :src="userStore.userInfo?.avatar || '/static/default-avatar.png'"
          class="user-avatar"
          @click="showAvatarActions"
        />
        <view class="user-details">
          <view class="user-name-section">
            <text class="user-name">{{ userStore.userInfo?.name || '未设置昵称' }}</text>
            <view v-if="userStore.isVip" class="vip-badge">
              <text class="vip-icon">👑</text>
              <text class="vip-text">{{ vipLevelText }}</text>
            </view>
          </view>
          <text class="user-phone">{{ formatPhone(userStore.userInfo?.phone) }}</text>
          <text class="user-id">ID: {{ userStore.userInfo?._id.slice(-6) }}</text>
        </view>
        <view class="user-actions">
          <view class="action-btn" @click="editProfile">
            <text class="action-icon">✏️</text>
          </view>
          <view class="action-btn" @click="showQRCode">
            <text class="action-icon">📱</text>
          </view>
        </view>
      </view>
      
      <!-- VIP等级进度 -->
      <view v-if="userStore.userInfo" class="level-progress">
        <view class="progress-header">
          <text class="current-level">{{ currentLevelText }}</text>
          <text v-if="nextLevel" class="next-level">{{ getNextLevelText() }}</text>
        </view>
        <view class="progress-bar">
          <view 
            class="progress-fill" 
            :style="{ width: progressPercentage + '%' }"
          ></view>
        </view>
        <view class="progress-info">
          <text class="progress-text">
            {{ getProgressText() }}
          </text>
          <text v-if="!isMaxLevel" class="points-needed">
            还需{{ pointsToNextLevel }}积分升级
          </text>
        </view>
      </view>
    </view>

    <!-- 积分和钱包信息 -->
    <view class="wallet-section">
      <view class="wallet-item" @click="goToPointsCenter">
        <view class="wallet-info">
          <text class="wallet-label">积分余额</text>
          <text class="wallet-value">{{ userStore.userInfo?.points || 0 }}</text>
        </view>
        <text class="wallet-arrow">></text>
      </view>
      <view class="wallet-divider"></view>
      <view class="wallet-item" @click="goToWallet">
        <view class="wallet-info">
          <text class="wallet-label">余额</text>
          <text class="wallet-value">¥{{ (userStore.userInfo?.balance || 0).toFixed(2) }}</text>
        </view>
        <text class="wallet-arrow">></text>
      </view>
      <view class="wallet-divider"></view>
      <view class="wallet-item" @click="goToCoupons">
        <view class="wallet-info">
          <text class="wallet-label">优惠券</text>
          <text class="wallet-value">{{ couponCount }}张</text>
        </view>
        <text class="wallet-arrow">></text>
      </view>
    </view>

    <!-- VIP权益说明 -->
    <view v-if="userStore.isVip" class="vip-benefits">
      <view class="section-header">
        <text class="section-title">VIP专享权益</text>
        <text class="section-action" @click="showAllBenefits">查看全部</text>
      </view>
      
      <view class="benefits-grid">
        <view 
          v-for="benefit in displayBenefits"
          :key="benefit.id"
          class="benefit-item"
        >
          <text class="benefit-icon">{{ benefit.icon }}</text>
          <text class="benefit-title">{{ benefit.title }}</text>
          <text class="benefit-desc">{{ benefit.description }}</text>
        </view>
      </view>
    </view>

    <!-- 订单历史快捷入口 -->
    <view class="order-shortcuts">
      <view class="section-header">
        <text class="section-title">我的订单</text>
        <text class="section-action" @click="goToAllOrders">查看全部</text>
      </view>
      
      <view class="shortcuts-grid">
        <view 
          v-for="shortcut in orderShortcuts"
          :key="shortcut.type"
          class="shortcut-item"
          @click="goToOrders(shortcut.type)"
        >
          <view class="shortcut-icon-wrapper">
            <text class="shortcut-icon">{{ shortcut.icon }}</text>
            <text v-if="shortcut.count > 0" class="shortcut-badge">{{ shortcut.count }}</text>
          </view>
          <text class="shortcut-title">{{ shortcut.title }}</text>
        </view>
      </view>
    </view>

    <!-- 最近订单 -->
    <view v-if="recentOrders.length > 0" class="recent-orders">
      <view class="section-header">
        <text class="section-title">最近订单</text>
      </view>
      
      <view class="orders-list">
        <view 
          v-for="order in recentOrders"
          :key="order._id"
          class="order-item"
          @click="viewOrderDetail(order)"
        >
          <view class="order-header">
            <text class="order-store">{{ order.storeName }}</text>
            <text class="order-status" :class="getOrderStatusClass(order.status)">
              {{ getOrderStatusText(order.status) }}
            </text>
          </view>
          
          <view class="order-products">
            <view 
              v-for="item in order.items.slice(0, 2)"
              :key="item._id"
              class="product-preview"
            >
              <text class="product-name">{{ item.dish.name }}</text>
              <text class="product-quantity">×{{ item.quantity }}</text>
            </view>
            <text v-if="order.items.length > 2" class="more-products">
              等{{ order.items.length }}件商品
            </text>
          </view>
          
          <view class="order-footer">
            <text class="order-date">{{ formatDate(order.createdAt) }}</text>
            <text class="order-amount">¥{{ order.totalAmount.toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-group">
        <view class="menu-item" @click="goToBookings">
          <view class="menu-left">
            <text class="menu-icon">📅</text>
            <text class="menu-title">我的预订</text>
          </view>
          <text class="menu-arrow">></text>
        </view>
        <view class="menu-item" @click="goToAddresses">
          <view class="menu-left">
            <text class="menu-icon">📍</text>
            <text class="menu-title">收货地址</text>
          </view>
          <text class="menu-arrow">></text>
        </view>
        <view class="menu-item" @click="goToReviews">
          <view class="menu-left">
            <text class="menu-icon">⭐</text>
            <text class="menu-title">我的评价</text>
          </view>
          <text class="menu-arrow">></text>
        </view>
      </view>
      
      <view class="menu-group">
        <view class="menu-item" @click="goToSettings">
          <view class="menu-left">
            <text class="menu-icon">⚙️</text>
            <text class="menu-title">设置</text>
          </view>
          <text class="menu-arrow">></text>
        </view>
        <view class="menu-item" @click="goToHelp">
          <view class="menu-left">
            <text class="menu-icon">❓</text>
            <text class="menu-title">帮助与反馈</text>
          </view>
          <text class="menu-arrow">></text>
        </view>
        <view class="menu-item" @click="goToAbout">
          <view class="menu-left">
            <text class="menu-icon">ℹ️</text>
            <text class="menu-title">关于我们</text>
          </view>
          <text class="menu-arrow">></text>
        </view>
      </view>
    </view>

    <!-- 底部间距 -->
    <view class="bottom-spacer"></view>

    <!-- 头像操作弹窗 -->
    <uni-popup 
      ref="avatarPopup" 
      type="bottom"
    >
      <view class="avatar-actions">
        <view class="action-header">
          <text class="action-title">选择头像</text>
        </view>
        <view class="action-list">
          <view class="action-option" @click="chooseAvatar">
            <text class="option-text">从相册选择</text>
          </view>
          <view class="action-option" @click="takePhoto">
            <text class="option-text">拍照</text>
          </view>
          <view class="action-option cancel" @click="closeAvatarActions">
            <text class="option-text">取消</text>
          </view>
        </view>
      </view>
    </uni-popup>

    <!-- 个人二维码弹窗 -->
    <uni-popup 
      ref="qrCodePopup" 
      type="center"
    >
      <view class="qr-code-modal">
        <view class="qr-header">
          <text class="qr-title">我的二维码</text>
          <text class="qr-close" @click="closeQRCode">✕</text>
        </view>
        <view class="qr-content">
          <view class="qr-code-container">
            <canvas 
              canvas-id="userQRCode"
              class="qr-canvas"
            />
          </view>
          <text class="qr-desc">展示二维码给朋友，快速添加好友</text>
        </view>
        <view class="qr-actions">
          <button class="qr-btn" @click="saveQRCode">保存到相册</button>
          <button class="qr-btn" @click="shareQRCode">分享二维码</button>
        </view>
      </view>
    </uni-popup>

    <!-- VIP权益详情弹窗 -->
    <uni-popup 
      ref="benefitsPopup" 
      type="bottom"
    >
      <view class="benefits-modal">
        <view class="benefits-header">
          <text class="benefits-title">VIP专享权益</text>
          <text class="benefits-close" @click="closeBenefits">✕</text>
        </view>
        <scroll-view class="benefits-content" scroll-y>
          <view 
            v-for="benefit in allBenefits"
            :key="benefit.id"
            class="benefit-detail"
          >
            <view class="benefit-main">
              <text class="benefit-icon">{{ benefit.icon }}</text>
              <view class="benefit-info">
                <text class="benefit-name">{{ benefit.title }}</text>
                <text class="benefit-description">{{ benefit.description }}</text>
              </view>
            </view>
            <text v-if="benefit.detail" class="benefit-extra">{{ benefit.detail }}</text>
          </view>
        </scroll-view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import * as UserService from '@/services/user'
import * as OrderService from '@/services/order'

// Store
const userStore = useUserStore()

// 状态管理
const couponCount = ref(0)
const recentOrders = ref<any[]>([])
const isRefreshing = ref(false)

// VIP权益数据
const allBenefits = ref([
  {
    id: 1,
    icon: '🎫',
    title: '专属优惠券',
    description: '每月专享优惠券包',
    detail: '每月1号发放，包含满减券、折扣券等多种类型'
  },
  {
    id: 2,
    icon: '💎',
    title: '会员价格',
    description: '商品享受会员专属价格',
    detail: '全场商品9.5折起，部分商品享受更大优惠'
  },
  {
    id: 3,
    icon: '🚫',
    title: '免押金预订',
    description: '预订无需支付押金',
    detail: '预订KTV、餐厅等无需提前支付押金，到店消费即可'
  },
  {
    id: 4,
    icon: '⚡',
    title: '优先服务',
    description: '享受优先处理服务',
    detail: '订单处理、客服响应、退款处理等享受优先级'
  },
  {
    id: 5,
    icon: '🎁',
    title: '生日特权',
    description: '生日月专属礼品',
    detail: '生日月享受专属折扣和神秘礼品'
  },
  {
    id: 6,
    icon: '⭐',
    title: '积分翻倍',
    description: '消费积分翻倍获得',
    detail: '每笔消费获得的积分在标准基础上翻倍'
  }
])

const orderShortcuts = ref([
  {
    type: 'pending',
    icon: '⏳',
    title: '待付款',
    count: 0
  },
  {
    type: 'processing',
    icon: '🍳',
    title: '制作中',
    count: 0
  },
  {
    type: 'delivering',
    icon: '🚚',
    title: '配送中',
    count: 0
  },
  {
    type: 'completed',
    icon: '✅',
    title: '已完成',
    count: 0
  }
])

// Refs
const avatarPopup = ref()
const qrCodePopup = ref()
const benefitsPopup = ref()

// 计算属性
const vipLevelText = computed(() => {
  const levelMap = {
    'silver': '银卡会员',
    'gold': '金卡会员',
    'platinum': '白金会员',
    'diamond': '钻石会员'
  }
  return levelMap[userStore.vipLevel as keyof typeof levelMap] || '普通用户'
})

const currentLevelText = computed(() => {
  return userStore.isVip ? vipLevelText.value : '普通用户'
})

const nextLevel = computed(() => {
  const levels = ['silver', 'gold', 'platinum', 'diamond']
  const currentIndex = levels.indexOf(userStore.vipLevel || '')
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null
})

const isMaxLevel = computed(() => {
  return userStore.vipLevel === 'diamond'
})

const pointsToNextLevel = computed(() => {
  if (isMaxLevel.value) return 0
  
  const levelRequirements = {
    'silver': 1000,
    'gold': 5000,
    'platinum': 15000,
    'diamond': 50000
  }
  
  const currentPoints = userStore.userInfo?.points || 0
  const targetLevel = nextLevel.value
  const requiredPoints = targetLevel ? levelRequirements[targetLevel as keyof typeof levelRequirements] : 0
  
  return Math.max(0, requiredPoints - currentPoints)
})

const progressPercentage = computed(() => {
  if (isMaxLevel.value) return 100
  
  const levelRequirements = {
    '': 0,
    'silver': 1000,
    'gold': 5000,
    'platinum': 15000,
    'diamond': 50000
  }
  
  const currentPoints = userStore.userInfo?.points || 0
  const currentLevel = userStore.vipLevel || ''
  const targetLevel = nextLevel.value
  
  const currentLevelPoints = levelRequirements[currentLevel as keyof typeof levelRequirements] || 0
  const targetLevelPoints = targetLevel ? levelRequirements[targetLevel as keyof typeof levelRequirements] : currentLevelPoints
  
  const progress = (currentPoints - currentLevelPoints) / (targetLevelPoints - currentLevelPoints)
  return Math.min(100, Math.max(0, progress * 100))
})

const displayBenefits = computed(() => {
  return allBenefits.value.slice(0, 4)
})

// 方法
// 初始化数据
const initData = async () => {
  await Promise.all([
    loadCouponCount(),
    loadRecentOrders(),
    loadOrderCounts()
  ])
}

// 加载优惠券数量
const loadCouponCount = async () => {
  try {
    // 模拟加载优惠券数量
    couponCount.value = 3
  } catch (error) {
    console.error('加载优惠券数量失败:', error)
  }
}

// 加载最近订单
const loadRecentOrders = async () => {
  try {
    // 模拟最近订单数据
    recentOrders.value = [
      {
        _id: 'order1',
        orderNumber: 'ORD20240915001',
        storeName: '星空KTV',
        status: 'completed',
        totalAmount: 158.5,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前
        items: [
          {
            _id: 'item1',
            dish: { name: '柠檬蜂蜜茶' },
            quantity: 2
          },
          {
            _id: 'item2',
            dish: { name: '薯条' },
            quantity: 1
          }
        ]
      },
      {
        _id: 'order2',
        orderNumber: 'ORD20240914002',
        storeName: '海底捞火锅',
        status: 'processing',
        totalAmount: 268.0,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
        items: [
          {
            _id: 'item3',
            dish: { name: '毛肚' },
            quantity: 1
          },
          {
            _id: 'item4',
            dish: { name: '肥牛' },
            quantity: 2
          },
          {
            _id: 'item5',
            dish: { name: '娃娃菜' },
            quantity: 1
          }
        ]
      }
    ]
  } catch (error) {
    console.error('加载最近订单失败:', error)
  }
}

// 加载订单数量统计
const loadOrderCounts = async () => {
  try {
    // 模拟订单数量统计
    orderShortcuts.value[0].count = 1 // 待付款
    orderShortcuts.value[1].count = 2 // 制作中
    orderShortcuts.value[2].count = 0 // 配送中
    orderShortcuts.value[3].count = 15 // 已完成
  } catch (error) {
    console.error('加载订单统计失败:', error)
  }
}

// 工具方法
const formatPhone = (phone?: string): string => {
  if (!phone) return '未绑定手机号'
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const formatDate = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  
  return new Date(date).toLocaleDateString()
}

const getNextLevelText = (): string => {
  const levelMap = {
    'silver': '银卡会员',
    'gold': '金卡会员',
    'platinum': '白金会员',
    'diamond': '钻石会员'
  }
  return nextLevel.value ? `距离${levelMap[nextLevel.value as keyof typeof levelMap]}` : ''
}

const getProgressText = (): string => {
  if (isMaxLevel.value) {
    return '您已是最高等级会员'
  }
  
  const currentPoints = userStore.userInfo?.points || 0
  return `当前积分：${currentPoints}`
}

const getOrderStatusText = (status: string): string => {
  const statusMap = {
    'pending': '待付款',
    'processing': '制作中',
    'delivering': '配送中',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const getOrderStatusClass = (status: string): string => {
  const classMap = {
    'pending': 'status-pending',
    'processing': 'status-processing',
    'delivering': 'status-delivering',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
  }
  return classMap[status as keyof typeof classMap] || ''
}

// 用户操作
const showAvatarActions = () => {
  avatarPopup.value?.open()
}

const closeAvatarActions = () => {
  avatarPopup.value?.close()
}

const chooseAvatar = async () => {
  try {
    const res = await uni.chooseImage({
      count: 1,
      sourceType: ['album'],
      sizeType: ['compressed']
    })
    
    // TODO: 上传头像到服务器
    console.log('选择头像:', res.tempFilePaths[0])
    closeAvatarActions()
  } catch (error) {
    console.error('选择头像失败:', error)
  }
}

const takePhoto = async () => {
  try {
    const res = await uni.chooseImage({
      count: 1,
      sourceType: ['camera'],
      sizeType: ['compressed']
    })
    
    // TODO: 上传头像到服务器
    console.log('拍照头像:', res.tempFilePaths[0])
    closeAvatarActions()
  } catch (error) {
    console.error('拍照失败:', error)
  }
}

const editProfile = () => {
  uni.navigateTo({
    url: '/pages/user/edit-profile'
  })
}

const showQRCode = () => {
  qrCodePopup.value?.open()
  generateQRCode()
}

const closeQRCode = () => {
  qrCodePopup.value?.close()
}

const generateQRCode = () => {
  // TODO: 生成用户二维码
  console.log('生成用户二维码')
}

const saveQRCode = () => {
  // TODO: 保存二维码到相册
  uni.showToast({
    title: '已保存到相册',
    icon: 'success'
  })
}

const shareQRCode = () => {
  // TODO: 分享二维码
  uni.showShareMenu()
}

// VIP权益
const showAllBenefits = () => {
  benefitsPopup.value?.open()
}

const closeBenefits = () => {
  benefitsPopup.value?.close()
}

// 导航方法
const goToPointsCenter = () => {
  uni.navigateTo({
    url: '/pages/points/center'
  })
}

const goToWallet = () => {
  uni.navigateTo({
    url: '/pages/user/wallet'
  })
}

const goToCoupons = () => {
  uni.navigateTo({
    url: '/pages/user/coupons'
  })
}

const goToAllOrders = () => {
  uni.navigateTo({
    url: '/pages/order/list'
  })
}

const goToOrders = (type: string) => {
  uni.navigateTo({
    url: `/pages/order/list?status=${type}`
  })
}

const viewOrderDetail = (order: any) => {
  uni.navigateTo({
    url: `/pages/order/detail?id=${order._id}`
  })
}

const goToBookings = () => {
  uni.navigateTo({
    url: '/pages/booking/list'
  })
}

const goToAddresses = () => {
  uni.navigateTo({
    url: '/pages/user/address'
  })
}

const goToReviews = () => {
  uni.navigateTo({
    url: '/pages/user/reviews'
  })
}

const goToSettings = () => {
  uni.navigateTo({
    url: '/pages/user/settings'
  })
}

const goToHelp = () => {
  uni.navigateTo({
    url: '/pages/user/help'
  })
}

const goToAbout = () => {
  uni.navigateTo({
    url: '/pages/user/about'
  })
}

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true
  try {
    await Promise.all([
      userStore.loadUserInfo(),
      loadCouponCount(),
      loadRecentOrders(),
      loadOrderCounts()
    ])
  } catch (error) {
    console.error('刷新失败:', error)
  } finally {
    isRefreshing.value = false
    uni.stopPullDownRefresh()
  }
}

// 生命周期
onMounted(() => {
  initData()
})

onShow(() => {
  // 页面显示时刷新数据
  initData()
})

onPullDownRefresh(() => {
  onRefresh()
})
</script>

<style scoped lang="scss">
.user-profile-page {
  min-height: 100vh;
  background: #fafafa;
}

.user-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 32rpx 32rpx;
  color: white;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.user-name-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: white;
}

.vip-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: rgba(255, 255, 255, 0.2);
  padding: 6rpx 12rpx;
  border-radius: 16rpx;
}

.vip-icon {
  font-size: 16rpx;
}

.vip-text {
  font-size: 20rpx;
  font-weight: 500;
}

.user-phone {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.user-id {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
}

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.action-btn {
  width: 64rpx;
  height: 64rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 28rpx;
}

.level-progress {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16rpx;
  padding: 24rpx;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.current-level {
  font-size: 26rpx;
  font-weight: 600;
}

.next-level {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

.progress-bar {
  height: 8rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.progress-fill {
  height: 100%;
  background: #ffeb3b;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

.points-needed {
  font-size: 22rpx;
  color: #ffeb3b;
  font-weight: 500;
}

.wallet-section {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 0 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.wallet-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 0;
}

.wallet-info {
  flex: 1;
}

.wallet-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
  display: block;
}

.wallet-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.wallet-arrow {
  font-size: 24rpx;
  color: #ccc;
}

.wallet-divider {
  height: 2rpx;
  background: #f0f0f0;
}

.vip-benefits {
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

.benefits-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.benefit-item {
  text-align: center;
  padding: 24rpx 16rpx;
  background: #f8f9ff;
  border-radius: 12rpx;
}

.benefit-icon {
  font-size: 40rpx;
  margin-bottom: 12rpx;
  display: block;
}

.benefit-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.benefit-desc {
  font-size: 22rpx;
  color: #666;
  line-height: 1.4;
}

.order-shortcuts {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.shortcut-icon-wrapper {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shortcut-icon {
  font-size: 32rpx;
  color: #667eea;
}

.shortcut-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 32rpx;
  height: 32rpx;
  background: #ff4444;
  color: white;
  font-size: 18rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.shortcut-title {
  font-size: 24rpx;
  color: #333;
}

.recent-orders {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.order-item {
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  padding: 24rpx;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.order-store {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.order-status {
  font-size: 24rpx;
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
  font-weight: 500;
  
  &.status-pending {
    background: rgba(255, 165, 0, 0.1);
    color: #ff9500;
  }
  
  &.status-processing {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
  }
  
  &.status-delivering {
    background: rgba(0, 170, 0, 0.1);
    color: #00aa00;
  }
  
  &.status-completed {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  
  &.status-cancelled {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.order-products {
  margin-bottom: 16rpx;
}

.product-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.product-name {
  font-size: 24rpx;
  color: #666;
}

.product-quantity {
  font-size: 24rpx;
  color: #999;
}

.more-products {
  font-size: 22rpx;
  color: #999;
  font-style: italic;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 2rpx solid #f0f0f0;
}

.order-date {
  font-size: 22rpx;
  color: #999;
}

.order-amount {
  font-size: 28rpx;
  font-weight: 600;
  color: #ff4444;
}

.menu-section {
  margin: 16rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.menu-group {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.menu-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.menu-icon {
  font-size: 32rpx;
  width: 48rpx;
  text-align: center;
}

.menu-title {
  font-size: 28rpx;
  color: #333;
}

.menu-arrow {
  font-size: 24rpx;
  color: #ccc;
}

.bottom-spacer {
  height: 120rpx;
}

// 弹窗样式
.avatar-actions {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
}

.action-header {
  padding: 32rpx;
  text-align: center;
  border-bottom: 2rpx solid #f0f0f0;
}

.action-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.action-list {
  padding: 0 32rpx 32rpx;
}

.action-option {
  padding: 24rpx 0;
  text-align: center;
  border-bottom: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
  
  &.cancel {
    margin-top: 16rpx;
    border-top: 8rpx solid #f0f0f0;
    
    .option-text {
      color: #999;
    }
  }
}

.option-text {
  font-size: 28rpx;
  color: #333;
}

.qr-code-modal {
  width: 600rpx;
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
}

.qr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.qr-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.qr-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.qr-content {
  padding: 40rpx;
  text-align: center;
}

.qr-code-container {
  margin-bottom: 24rpx;
}

.qr-canvas {
  width: 400rpx;
  height: 400rpx;
  background: #f0f0f0;
  border-radius: 12rpx;
}

.qr-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}

.qr-actions {
  display: flex;
  border-top: 2rpx solid #f0f0f0;
}

.qr-btn {
  flex: 1;
  height: 88rpx;
  background: transparent;
  border: none;
  font-size: 28rpx;
  color: #667eea;
  border-right: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-right: none;
  }
}

.benefits-modal {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.benefits-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.benefits-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.benefits-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.benefits-content {
  max-height: 60vh;
  padding: 0 32rpx 32rpx;
}

.benefit-detail {
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.benefit-main {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 12rpx;
}

.benefit-icon {
  font-size: 32rpx;
  width: 48rpx;
  text-align: center;
  flex-shrink: 0;
}

.benefit-info {
  flex: 1;
}

.benefit-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.benefit-description {
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
}

.benefit-extra {
  font-size: 22rpx;
  color: #999;
  line-height: 1.5;
  padding-left: 72rpx;
}
</style>
