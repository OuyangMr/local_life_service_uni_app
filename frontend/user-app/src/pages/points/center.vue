<!--
  积分中心页面
  @description 按设计稿展示积分余额、获取记录、使用记录，实现积分规则说明和兑换功能
-->
<template>
  <view class="points-center-page">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">积分中心</text>
      </view>
      <view class="nav-right">
        <view class="nav-btn" @click="showRules">
          <text class="nav-icon">❓</text>
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
      <!-- 积分余额卡片 -->
      <view class="balance-card">
        <view class="balance-header">
          <text class="balance-title">我的积分</text>
          <view class="vip-level" v-if="userStore.isVip">
            <text class="vip-icon">👑</text>
            <text class="vip-text">{{ vipLevelText }}</text>
          </view>
        </view>
        
        <view class="balance-amount">
          <text class="amount-number">{{ userStore.userInfo?.points || 0 }}</text>
          <text class="amount-unit">积分</text>
        </view>
        
        <view class="balance-info">
          <text class="info-text">1积分 = ¥0.01</text>
          <text class="expire-info">
            {{ getExpireText() }}
          </text>
        </view>
        
        <!-- 快速操作 -->
        <view class="quick-actions">
          <view class="action-item" @click="showExchangeModal">
            <text class="action-icon">🎁</text>
            <text class="action-text">兑换</text>
          </view>
          <view class="action-item" @click="showEarnMethods">
            <text class="action-icon">⚡</text>
            <text class="action-text">赚积分</text>
          </view>
          <view class="action-item" @click="goToHistory">
            <text class="action-icon">📊</text>
            <text class="action-text">明细</text>
          </view>
        </view>
      </view>

      <!-- 等级进度 -->
      <view v-if="userStore.userInfo" class="level-section">
        <view class="section-header">
          <text class="section-title">会员等级</text>
          <text class="section-action" @click="showLevelDetails">查看特权</text>
        </view>
        
        <view class="level-card">
          <view class="level-current">
            <text class="level-name">{{ currentLevelText }}</text>
            <text v-if="!isMaxLevel" class="level-progress-text">
              再获得{{ pointsToNextLevel }}积分升级
            </text>
            <text v-else class="level-max-text">已达最高等级</text>
          </view>
          
          <view v-if="!isMaxLevel" class="level-progress">
            <view class="progress-bar">
              <view 
                class="progress-fill" 
                :style="{ width: progressPercentage + '%' }"
              ></view>
            </view>
            <view class="progress-info">
              <text class="current-points">{{ userStore.userInfo.points }}</text>
              <text class="target-points">{{ nextLevelPoints }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 兑换商城 -->
      <view class="exchange-section">
        <view class="section-header">
          <text class="section-title">积分兑换</text>
          <text class="section-action" @click="goToExchangeMall">更多</text>
        </view>
        
        <scroll-view class="exchange-scroll" scroll-x>
          <view class="exchange-list">
            <view 
              v-for="item in exchangeItems"
              :key="item.id"
              class="exchange-item"
              @click="exchangeItem(item)"
            >
              <image 
                :src="item.image || '/static/placeholder-gift.png'"
                class="item-image"
                mode="aspectFill"
              />
              <view class="item-info">
                <text class="item-name">{{ item.name }}</text>
                <view class="item-cost">
                  <text class="cost-points">{{ item.points }}</text>
                  <text class="cost-unit">积分</text>
                </view>
              </view>
              <view v-if="item.stock <= 0" class="item-sold-out">
                <text class="sold-out-text">已兑完</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 任务赚积分 -->
      <view class="tasks-section">
        <view class="section-header">
          <text class="section-title">任务赚积分</text>
        </view>
        
        <view class="tasks-list">
          <view 
            v-for="task in pointsTasks"
            :key="task.id"
            class="task-item"
            :class="{ 'completed': task.completed, 'claimed': task.claimed }"
            @click="handleTask(task)"
          >
            <view class="task-icon">
              <text class="icon-text">{{ task.icon }}</text>
            </view>
            <view class="task-info">
              <text class="task-title">{{ task.title }}</text>
              <text class="task-desc">{{ task.description }}</text>
            </view>
            <view class="task-reward">
              <text class="reward-text">+{{ task.points }}积分</text>
            </view>
            <view class="task-status">
              <text v-if="!task.completed" class="status-text">去完成</text>
              <text v-else-if="!task.claimed" class="status-text claim">领取</text>
              <text v-else class="status-text claimed">已领取</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 积分记录 -->
      <view class="records-section">
        <view class="section-header">
          <text class="section-title">最近记录</text>
          <text class="section-action" @click="goToAllRecords">查看全部</text>
        </view>
        
        <view class="records-list">
          <view 
            v-for="record in recentRecords"
            :key="record.id"
            class="record-item"
          >
            <view class="record-icon" :class="record.type">
              <text class="icon-text">{{ getRecordIcon(record.type) }}</text>
            </view>
            <view class="record-info">
              <text class="record-title">{{ record.title }}</text>
              <text class="record-desc">{{ record.description }}</text>
            </view>
            <view class="record-amount">
              <text class="amount-text" :class="record.type">
                {{ record.type === 'earn' ? '+' : '-' }}{{ record.points }}
              </text>
              <text class="record-time">{{ formatRecordTime(record.time) }}</text>
            </view>
          </view>
          
          <!-- 空状态 -->
          <view v-if="recentRecords.length === 0" class="empty-records">
            <text class="empty-icon">📝</text>
            <text class="empty-text">暂无积分记录</text>
          </view>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 积分规则弹窗 -->
    <uni-popup 
      ref="rulesPopup" 
      type="bottom"
    >
      <view class="rules-modal">
        <view class="rules-header">
          <text class="rules-title">积分规则说明</text>
          <text class="rules-close" @click="closeRules">✕</text>
        </view>
        
        <scroll-view class="rules-content" scroll-y>
          <view class="rules-section">
            <text class="rules-subtitle">积分获取</text>
            <view class="rule-item">
              <text class="rule-text">• 完成订单：每消费1元获得1积分</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• VIP会员：积分获得翻倍</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• 每日签到：获得5-10积分</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• 邀请好友：获得50积分</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• 完善资料：获得20积分</text>
            </view>
          </view>
          
          <view class="rules-section">
            <text class="rules-subtitle">积分使用</text>
            <view class="rule-item">
              <text class="rule-text">• 100积分 = 1元，可抵扣订单金额</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• 兑换优惠券、礼品等</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• 单笔订单最多使用50%积分抵扣</text>
            </view>
          </view>
          
          <view class="rules-section">
            <text class="rules-subtitle">等级升级</text>
            <view class="rule-item">
              <text class="rule-text">• 普通用户 → 银卡会员：1000积分</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• 银卡会员 → 金卡会员：5000积分</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• 金卡会员 → 白金会员：15000积分</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• 白金会员 → 钻石会员：50000积分</text>
            </view>
          </view>
          
          <view class="rules-section">
            <text class="rules-subtitle">积分有效期</text>
            <view class="rule-item">
              <text class="rule-text">• 积分永久有效，不会过期</text>
            </view>
            <view class="rule-item">
              <text class="rule-text">• 账户注销时，积分自动清零</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </uni-popup>

    <!-- 兑换弹窗 -->
    <uni-popup 
      ref="exchangePopup" 
      type="center"
    >
      <view class="exchange-modal">
        <view class="exchange-header">
          <text class="exchange-title">兑换确认</text>
          <text class="exchange-close" @click="closeExchange">✕</text>
        </view>
        
        <view v-if="selectedExchangeItem" class="exchange-content">
          <image 
            :src="selectedExchangeItem.image || '/static/placeholder-gift.png'"
            class="exchange-image"
            mode="aspectFill"
          />
          <text class="exchange-name">{{ selectedExchangeItem.name }}</text>
          <text class="exchange-cost">需要{{ selectedExchangeItem.points }}积分</text>
          <text class="exchange-balance">当前积分：{{ userStore.userInfo?.points || 0 }}</text>
        </view>
        
        <view class="exchange-actions">
          <button class="exchange-btn cancel" @click="closeExchange">取消</button>
          <button 
            class="exchange-btn confirm" 
            :disabled="!canExchange"
            @click="confirmExchange"
          >
            确认兑换
          </button>
        </view>
      </view>
    </uni-popup>

    <!-- 赚积分方法弹窗 -->
    <uni-popup 
      ref="earnPopup" 
      type="bottom"
    >
      <view class="earn-modal">
        <view class="earn-header">
          <text class="earn-title">赚积分攻略</text>
          <text class="earn-close" @click="closeEarn">✕</text>
        </view>
        
        <view class="earn-content">
          <view 
            v-for="method in earnMethods"
            :key="method.id"
            class="earn-method"
            @click="handleEarnMethod(method)"
          >
            <view class="method-icon">
              <text class="icon-text">{{ method.icon }}</text>
            </view>
            <view class="method-info">
              <text class="method-title">{{ method.title }}</text>
              <text class="method-desc">{{ method.description }}</text>
            </view>
            <view class="method-reward">
              <text class="reward-text">+{{ method.points }}积分</text>
            </view>
          </view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import * as UserService from '@/services/user'

// Store
const userStore = useUserStore()

// 状态管理
const isRefreshing = ref(false)
const selectedExchangeItem = ref<any>(null)

// 兑换商品数据
const exchangeItems = ref([
  {
    id: 1,
    name: '5元优惠券',
    points: 500,
    image: '/static/coupon1.jpg',
    stock: 100
  },
  {
    id: 2,
    name: '10元优惠券',
    points: 1000,
    image: '/static/coupon2.jpg',
    stock: 50
  },
  {
    id: 3,
    name: '会员专享礼包',
    points: 2000,
    image: '/static/gift1.jpg',
    stock: 20
  },
  {
    id: 4,
    name: '精美手机壳',
    points: 3000,
    image: '/static/gift2.jpg',
    stock: 0
  }
])

// 任务数据
const pointsTasks = ref([
  {
    id: 1,
    icon: '📝',
    title: '完善个人资料',
    description: '补全头像、昵称等信息',
    points: 20,
    completed: false,
    claimed: false,
    action: 'profile'
  },
  {
    id: 2,
    icon: '📅',
    title: '每日签到',
    description: '连续签到获得更多积分',
    points: 10,
    completed: true,
    claimed: false,
    action: 'checkin'
  },
  {
    id: 3,
    icon: '🤝',
    title: '邀请好友',
    description: '邀请好友注册使用',
    points: 50,
    completed: false,
    claimed: false,
    action: 'invite'
  },
  {
    id: 4,
    icon: '⭐',
    title: '评价订单',
    description: '对已完成订单进行评价',
    points: 5,
    completed: true,
    claimed: true,
    action: 'review'
  }
])

// 积分记录数据
const recentRecords = ref([
  {
    id: 1,
    type: 'earn',
    title: '订单消费',
    description: '订单ORD20240915001',
    points: 41,
    time: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: 2,
    type: 'use',
    title: '积分抵扣',
    description: '订单ORD20240914002',
    points: 50,
    time: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: 3,
    type: 'earn',
    title: '每日签到',
    description: '签到奖励',
    points: 10,
    time: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: 4,
    type: 'earn',
    title: '邀请好友',
    description: '好友注册奖励',
    points: 50,
    time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  }
])

// 赚积分方法
const earnMethods = ref([
  {
    id: 1,
    icon: '🛒',
    title: '完成订单',
    description: '每消费1元获得1积分',
    points: '1',
    action: 'order'
  },
  {
    id: 2,
    icon: '📅',
    title: '每日签到',
    description: '连续签到奖励更多',
    points: '5-10',
    action: 'checkin'
  },
  {
    id: 3,
    icon: '🤝',
    title: '邀请好友',
    description: '邀请好友注册',
    points: '50',
    action: 'invite'
  },
  {
    id: 4,
    icon: '⭐',
    title: '评价商户',
    description: '对订单进行评价',
    points: '5',
    action: 'review'
  },
  {
    id: 5,
    icon: '📝',
    title: '完善资料',
    description: '完善个人信息',
    points: '20',
    action: 'profile'
  }
])

// Refs
const rulesPopup = ref()
const exchangePopup = ref()
const earnPopup = ref()

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

const isMaxLevel = computed(() => {
  return userStore.vipLevel === 'diamond'
})

const pointsToNextLevel = computed(() => {
  if (isMaxLevel.value) return 0
  
  const levelRequirements = {
    '': 1000,
    'silver': 5000,
    'gold': 15000,
    'platinum': 50000
  }
  
  const currentPoints = userStore.userInfo?.points || 0
  const currentLevel = userStore.vipLevel || ''
  const requiredPoints = levelRequirements[currentLevel as keyof typeof levelRequirements] || 1000
  
  return Math.max(0, requiredPoints - currentPoints)
})

const nextLevelPoints = computed(() => {
  const levelRequirements = {
    '': 1000,
    'silver': 5000,
    'gold': 15000,
    'platinum': 50000
  }
  
  const currentLevel = userStore.vipLevel || ''
  return levelRequirements[currentLevel as keyof typeof levelRequirements] || 1000
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
  const targetLevel = getNextLevel()
  
  const currentLevelPoints = levelRequirements[currentLevel as keyof typeof levelRequirements] || 0
  const targetLevelPoints = levelRequirements[targetLevel as keyof typeof levelRequirements] || 1000
  
  const progress = (currentPoints - currentLevelPoints) / (targetLevelPoints - currentLevelPoints)
  return Math.min(100, Math.max(0, progress * 100))
})

const canExchange = computed(() => {
  if (!selectedExchangeItem.value) return false
  const userPoints = userStore.userInfo?.points || 0
  return userPoints >= selectedExchangeItem.value.points && selectedExchangeItem.value.stock > 0
})

// 方法
// 初始化数据
const initData = async () => {
  await loadPointsData()
}

// 加载积分相关数据
const loadPointsData = async () => {
  try {
    // 加载用户积分信息
    await userStore.loadUserInfo()
    
    // 加载任务状态
    await loadTasksStatus()
    
    // 加载积分记录
    await loadPointsRecords()
  } catch (error) {
    console.error('加载积分数据失败:', error)
  }
}

// 加载任务状态
const loadTasksStatus = async () => {
  try {
    // TODO: 从API加载任务状态
    // 这里使用模拟数据
  } catch (error) {
    console.error('加载任务状态失败:', error)
  }
}

// 加载积分记录
const loadPointsRecords = async () => {
  try {
    // TODO: 从API加载积分记录
    // 这里使用模拟数据
  } catch (error) {
    console.error('加载积分记录失败:', error)
  }
}

// 工具方法
const getExpireText = (): string => {
  // 假设积分永久有效
  return '积分永久有效'
}

const getNextLevel = (): string => {
  const levels = ['', 'silver', 'gold', 'platinum', 'diamond']
  const currentIndex = levels.indexOf(userStore.vipLevel || '')
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : 'diamond'
}

const getRecordIcon = (type: string): string => {
  return type === 'earn' ? '⬆️' : '⬇️'
}

const formatRecordTime = (time: Date): string => {
  const now = new Date()
  const diff = now.getTime() - new Date(time).getTime()
  const minutes = Math.floor(diff / (60 * 1000))
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}天前`
  
  return new Date(time).toLocaleDateString()
}

// 弹窗操作
const showRules = () => {
  rulesPopup.value?.open()
}

const closeRules = () => {
  rulesPopup.value?.close()
}

const showExchangeModal = () => {
  // 显示兑换商城
  goToExchangeMall()
}

const showEarnMethods = () => {
  earnPopup.value?.open()
}

const closeEarn = () => {
  earnPopup.value?.close()
}

// 兑换相关
const exchangeItem = (item: any) => {
  if (item.stock <= 0) {
    uni.showToast({
      title: '商品已兑完',
      icon: 'none'
    })
    return
  }
  
  selectedExchangeItem.value = item
  exchangePopup.value?.open()
}

const closeExchange = () => {
  exchangePopup.value?.close()
  selectedExchangeItem.value = null
}

const confirmExchange = async () => {
  if (!canExchange.value) return
  
  try {
    // TODO: 调用兑换API
    
    uni.showToast({
      title: '兑换成功',
      icon: 'success'
    })
    
    // 更新用户积分
    if (userStore.userInfo) {
      userStore.userInfo.points -= selectedExchangeItem.value.points
    }
    
    // 更新商品库存
    selectedExchangeItem.value.stock--
    
    closeExchange()
  } catch (error) {
    uni.showToast({
      title: '兑换失败',
      icon: 'none'
    })
  }
}

// 任务处理
const handleTask = async (task: any) => {
  if (task.claimed) return
  
  if (!task.completed) {
    // 跳转到相应页面完成任务
    switch (task.action) {
      case 'profile':
        uni.navigateTo({
          url: '/pages/user/edit-profile'
        })
        break
      case 'checkin':
        await performCheckin()
        break
      case 'invite':
        uni.navigateTo({
          url: '/pages/user/invite'
        })
        break
      case 'review':
        uni.navigateTo({
          url: '/pages/order/list?needReview=true'
        })
        break
    }
  } else if (task.completed && !task.claimed) {
    // 领取奖励
    await claimTaskReward(task)
  }
}

const performCheckin = async () => {
  try {
    // TODO: 调用签到API
    
    uni.showToast({
      title: '签到成功',
      icon: 'success'
    })
    
    // 更新任务状态
    const checkinTask = pointsTasks.value.find(t => t.action === 'checkin')
    if (checkinTask) {
      checkinTask.completed = true
    }
    
    // 更新用户积分
    if (userStore.userInfo) {
      userStore.userInfo.points += 10
    }
  } catch (error) {
    uni.showToast({
      title: '签到失败',
      icon: 'none'
    })
  }
}

const claimTaskReward = async (task: any) => {
  try {
    // TODO: 调用领取奖励API
    
    uni.showToast({
      title: `获得${task.points}积分`,
      icon: 'success'
    })
    
    // 更新任务状态
    task.claimed = true
    
    // 更新用户积分
    if (userStore.userInfo) {
      userStore.userInfo.points += task.points
    }
  } catch (error) {
    uni.showToast({
      title: '领取失败',
      icon: 'none'
    })
  }
}

// 赚积分方法处理
const handleEarnMethod = (method: any) => {
  closeEarn()
  
  switch (method.action) {
    case 'order':
      uni.switchTab({
        url: '/pages/index/index'
      })
      break
    case 'checkin':
      performCheckin()
      break
    case 'invite':
      uni.navigateTo({
        url: '/pages/user/invite'
      })
      break
    case 'review':
      uni.navigateTo({
        url: '/pages/order/list?needReview=true'
      })
      break
    case 'profile':
      uni.navigateTo({
        url: '/pages/user/edit-profile'
      })
      break
  }
}

// 导航方法
const goToHistory = () => {
  uni.navigateTo({
    url: '/pages/points/history'
  })
}

const goToExchangeMall = () => {
  uni.navigateTo({
    url: '/pages/points/exchange'
  })
}

const goToAllRecords = () => {
  uni.navigateTo({
    url: '/pages/points/records'
  })
}

const showLevelDetails = () => {
  uni.navigateTo({
    url: '/pages/user/level-details'
  })
}

const goBack = () => {
  uni.navigateBack()
}

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true
  await initData()
  isRefreshing.value = false
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
.points-center-page {
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
}

.balance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  color: white;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.3);
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.balance-title {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}

.vip-level {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: rgba(255, 255, 255, 0.2);
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
}

.vip-icon {
  font-size: 16rpx;
}

.vip-text {
  font-size: 22rpx;
  font-weight: 500;
}

.balance-amount {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.amount-number {
  font-size: 64rpx;
  font-weight: 600;
  line-height: 1;
}

.amount-unit {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.balance-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.info-text,
.expire-info {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

.quick-actions {
  display: flex;
  justify-content: space-around;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.action-icon {
  font-size: 32rpx;
}

.action-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}

.level-section,
.exchange-section,
.tasks-section,
.records-section {
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

.level-card {
  background: #f8f9ff;
  border-radius: 12rpx;
  padding: 24rpx;
}

.level-current {
  margin-bottom: 16rpx;
}

.level-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.level-progress-text {
  font-size: 24rpx;
  color: #667eea;
}

.level-max-text {
  font-size: 24rpx;
  color: #22c55e;
}

.level-progress {
  margin-top: 16rpx;
}

.progress-bar {
  height: 8rpx;
  background: #e5e7eb;
  border-radius: 4rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.progress-fill {
  height: 100%;
  background: #667eea;
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-points,
.target-points {
  font-size: 22rpx;
  color: #666;
}

.exchange-scroll {
  white-space: nowrap;
}

.exchange-list {
  display: flex;
  gap: 16rpx;
  padding-bottom: 8rpx;
}

.exchange-item {
  position: relative;
  width: 200rpx;
  background: #f8f9ff;
  border-radius: 12rpx;
  padding: 16rpx;
  flex-shrink: 0;
}

.item-image {
  width: 100%;
  height: 120rpx;
  border-radius: 8rpx;
  background: #f0f0f0;
  margin-bottom: 12rpx;
}

.item-info {
  text-align: center;
}

.item-name {
  font-size: 24rpx;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.item-cost {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4rpx;
}

.cost-points {
  font-size: 26rpx;
  font-weight: 600;
  color: #667eea;
}

.cost-unit {
  font-size: 20rpx;
  color: #667eea;
}

.item-sold-out {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sold-out-text {
  font-size: 24rpx;
  color: white;
  font-weight: 600;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #f8f9ff;
  border-radius: 12rpx;
  
  &.completed:not(.claimed) {
    background: rgba(34, 197, 94, 0.1);
  }
  
  &.claimed {
    opacity: 0.6;
  }
}

.task-icon {
  width: 80rpx;
  height: 80rpx;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-text {
  font-size: 32rpx;
}

.task-info {
  flex: 1;
}

.task-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.task-desc {
  font-size: 24rpx;
  color: #666;
}

.task-reward {
  margin-right: 16rpx;
}

.reward-text {
  font-size: 24rpx;
  color: #667eea;
  font-weight: 500;
}

.task-status {
  width: 120rpx;
  text-align: center;
}

.status-text {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 16rpx;
  
  &:not(.claim):not(.claimed) {
    background: #667eea;
    color: white;
  }
  
  &.claim {
    background: #22c55e;
    color: white;
  }
  
  &.claimed {
    background: #f0f0f0;
    color: #999;
  }
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.record-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &.earn {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
  }
  
  &.use {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
}

.record-info {
  flex: 1;
}

.record-title {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.record-desc {
  font-size: 24rpx;
  color: #666;
}

.record-amount {
  text-align: right;
}

.amount-text {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
  display: block;
  
  &.earn {
    color: #22c55e;
  }
  
  &.use {
    color: #ef4444;
  }
}

.record-time {
  font-size: 22rpx;
  color: #999;
}

.empty-records {
  text-align: center;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  opacity: 0.3;
  margin-bottom: 16rpx;
  display: block;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}

.bottom-spacer {
  height: 120rpx;
}

// 弹窗样式
.rules-modal {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.rules-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.rules-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.rules-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.rules-content {
  max-height: 60vh;
  padding: 32rpx;
}

.rules-section {
  margin-bottom: 32rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.rules-subtitle {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.rule-item {
  margin-bottom: 12rpx;
}

.rule-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.exchange-modal {
  width: 600rpx;
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
}

.exchange-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.exchange-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.exchange-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.exchange-content {
  padding: 40rpx;
  text-align: center;
}

.exchange-image {
  width: 200rpx;
  height: 150rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  margin-bottom: 24rpx;
}

.exchange-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.exchange-cost {
  font-size: 26rpx;
  color: #667eea;
  margin-bottom: 8rpx;
  display: block;
}

.exchange-balance {
  font-size: 24rpx;
  color: #666;
}

.exchange-actions {
  display: flex;
  border-top: 2rpx solid #f0f0f0;
}

.exchange-btn {
  flex: 1;
  height: 88rpx;
  border: none;
  font-size: 28rpx;
  
  &.cancel {
    background: #f5f5f5;
    color: #666;
  }
  
  &.confirm {
    background: #667eea;
    color: white;
    
    &:disabled {
      background: #ccc;
      color: #999;
    }
  }
}

.earn-modal {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.earn-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.earn-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.earn-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.earn-content {
  padding: 32rpx;
  max-height: 60vh;
  overflow-y: auto;
}

.earn-method {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  background: #f8f9ff;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.method-icon {
  width: 80rpx;
  height: 80rpx;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.method-info {
  flex: 1;
}

.method-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.method-desc {
  font-size: 24rpx;
  color: #666;
}

.method-reward {
  text-align: right;
}

.reward-text {
  font-size: 24rpx;
  color: #667eea;
  font-weight: 500;
}
</style>
