<!--
  预订确认页面
  @description 按设计稿实现预订信息确认、积分抵扣选择、支付流程，区分VIP用户和普通用户的不同流程
-->
<template>
  <view class="booking-confirm-page">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">确认预订</text>
      </view>
    </view>

    <!-- 主要内容区域 -->
    <scroll-view class="content" scroll-y>
      <!-- 空间信息卡片 -->
      <view class="info-card">
        <view class="space-info">
          <image 
            :src="spaceInfo.images?.[0] || '/static/placeholder-room.png'"
            class="space-image"
            mode="aspectFill"
          />
          <view class="space-details">
            <text class="space-name">{{ spaceInfo.name }}</text>
            <text class="space-type">{{ spaceInfo.type }}</text>
            <view class="space-meta">
              <text class="meta-item">容纳{{ spaceInfo.capacity }}人</text>
              <text class="meta-divider">|</text>
              <text class="meta-item">{{ spaceInfo.size || '约20㎡' }}</text>
            </view>
          </view>
          <view class="space-price">
            <text class="price-label">{{ isVip ? 'VIP价格' : '普通价格' }}</text>
            <text class="price-value">¥{{ currentPrice }}</text>
          </view>
        </view>
      </view>

      <!-- 预订时间选择 -->
      <view class="booking-time-card">
        <view class="card-header">
          <text class="card-title">预订时间</text>
          <text class="time-tip">{{ isVip ? 'VIP可提前预订' : '建议提前1小时预订' }}</text>
        </view>
        
        <view class="time-selector">
          <view class="date-selector" @click="showDatePicker">
            <text class="selector-label">日期</text>
            <text class="selector-value">{{ selectedDate || '选择日期' }}</text>
            <text class="selector-arrow">></text>
          </view>
          
          <view class="time-selector-row">
            <view class="time-input" @click="showStartTimePicker">
              <text class="input-label">开始时间</text>
              <text class="input-value">{{ selectedStartTime || '选择时间' }}</text>
            </view>
            <text class="time-divider">-</text>
            <view class="time-input" @click="showEndTimePicker">
              <text class="input-label">结束时间</text>
              <text class="input-value">{{ selectedEndTime || '选择时间' }}</text>
            </view>
          </view>
          
          <!-- 时长显示 -->
          <view v-if="bookingDuration > 0" class="duration-info">
            <text class="duration-text">预订时长：{{ bookingDuration }}小时</text>
            <text v-if="bookingDuration < minBookingHours" class="duration-warning">
              最低消费{{ minBookingHours }}小时
            </text>
          </view>
        </view>
      </view>

      <!-- 联系信息 -->
      <view class="contact-card">
        <view class="card-header">
          <text class="card-title">联系信息</text>
        </view>
        
        <view class="contact-form">
          <view class="form-item">
            <text class="form-label">联系人</text>
            <input
              v-model="contactInfo.name"
              class="form-input"
              placeholder="请输入姓名"
              maxlength="20"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">手机号</text>
            <input
              v-model="contactInfo.phone"
              class="form-input"
              placeholder="请输入手机号"
              type="number"
              maxlength="11"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">备注</text>
            <textarea
              v-model="contactInfo.remark"
              class="form-textarea"
              placeholder="特殊需求或备注信息（选填）"
              maxlength="200"
            />
          </view>
        </view>
      </view>

      <!-- 优惠信息 -->
      <view class="discount-card">
        <view class="card-header">
          <text class="card-title">优惠信息</text>
        </view>
        
        <!-- 积分抵扣 -->
        <view v-if="userPoints > 0" class="discount-section">
          <view class="discount-header">
            <view class="discount-info">
              <text class="discount-icon">💎</text>
              <view class="discount-details">
                <text class="discount-name">积分抵扣</text>
                <text class="discount-desc">可用{{ userPoints }}积分，1积分=0.01元</text>
              </view>
            </view>
            <switch 
              :checked="usePoints" 
              @change="onPointsToggle"
              color="#667eea"
            />
          </view>
          
          <!-- 积分使用滑块 -->
          <view v-if="usePoints" class="points-slider">
            <slider 
              :value="pointsToUse"
              :max="maxPointsCanUse"
              :step="10"
              @change="onPointsChange"
              activeColor="#667eea"
              backgroundColor="#f0f0f0"
            />
            <view class="points-info">
              <text class="points-text">使用 {{ pointsToUse }} 积分</text>
              <text class="points-discount">抵扣 ¥{{ (pointsToUse * 0.01).toFixed(2) }}</text>
            </view>
          </view>
        </view>

        <!-- 优惠券 -->
        <view class="discount-section" @click="showCouponPicker">
          <view class="discount-header">
            <view class="discount-info">
              <text class="discount-icon">🎫</text>
              <view class="discount-details">
                <text class="discount-name">优惠券</text>
                <text class="discount-desc">
                  {{ selectedCoupon ? `已选择：${selectedCoupon.name}` : '选择可用优惠券' }}
                </text>
              </view>
            </view>
            <text class="selector-arrow">></text>
          </view>
        </view>
      </view>

      <!-- VIP特权提示 -->
      <view v-if="isVip" class="vip-privileges">
        <view class="privilege-header">
          <text class="privilege-icon">👑</text>
          <text class="privilege-title">VIP专享特权</text>
        </view>
        <view class="privilege-list">
          <view class="privilege-item">
            <text class="privilege-text">✅ 免预订押金</text>
          </view>
          <view class="privilege-item">
            <text class="privilege-text">✅ 8折优惠价格</text>
          </view>
          <view class="privilege-item">
            <text class="privilege-text">✅ 优先预订权</text>
          </view>
          <view class="privilege-item">
            <text class="privilege-text">✅ 专属客服服务</text>
          </view>
        </view>
      </view>

      <!-- 费用明细 -->
      <view class="cost-breakdown">
        <view class="card-header">
          <text class="card-title">费用明细</text>
        </view>
        
        <view class="cost-list">
          <view class="cost-item">
            <text class="cost-label">空间费用</text>
            <text class="cost-value">¥{{ spaceBaseCost.toFixed(2) }}</text>
          </view>
          
          <view v-if="isVip" class="cost-item discount">
            <text class="cost-label">VIP折扣</text>
            <text class="cost-value">-¥{{ vipDiscount.toFixed(2) }}</text>
          </view>
          
          <view v-if="selectedCoupon" class="cost-item discount">
            <text class="cost-label">优惠券优惠</text>
            <text class="cost-value">-¥{{ couponDiscount.toFixed(2) }}</text>
          </view>
          
          <view v-if="pointsDiscount > 0" class="cost-item discount">
            <text class="cost-label">积分抵扣</text>
            <text class="cost-value">-¥{{ pointsDiscount.toFixed(2) }}</text>
          </view>
          
          <view v-if="!isVip" class="cost-item">
            <text class="cost-label">预订押金 (50%)</text>
            <text class="cost-value">¥{{ depositAmount.toFixed(2) }}</text>
          </view>
          
          <view class="cost-divider"></view>
          
          <view class="cost-item total">
            <text class="cost-label">{{ isVip ? '应付金额' : '今日支付' }}</text>
            <text class="cost-value">¥{{ finalAmount.toFixed(2) }}</text>
          </view>
          
          <view v-if="!isVip && remainingAmount > 0" class="cost-item remaining">
            <text class="cost-label">到店支付</text>
            <text class="cost-value">¥{{ remainingAmount.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 预订须知 -->
      <view class="booking-rules">
        <view class="card-header">
          <text class="card-title">预订须知</text>
        </view>
        
        <view class="rules-list">
          <view class="rule-item">
            <text class="rule-number">1.</text>
            <text class="rule-text">请提前15分钟到店，超时15分钟将自动释放空间</text>
          </view>
          <view class="rule-item">
            <text class="rule-number">2.</text>
            <text class="rule-text">{{ isVip ? 'VIP用户可免费取消' : '取消预订将扣除10%手续费' }}</text>
          </view>
          <view class="rule-item">
            <text class="rule-number">3.</text>
            <text class="rule-text">空间内禁止吸烟，禁止携带外食</text>
          </view>
          <view class="rule-item">
            <text class="rule-number">4.</text>
            <text class="rule-text">如有损坏物品，按价赔偿</text>
          </view>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部确认栏 -->
    <view class="confirm-bar">
      <view class="amount-info">
        <text class="amount-label">{{ isVip ? '应付金额' : '今日支付' }}</text>
        <text class="amount-value">¥{{ finalAmount.toFixed(2) }}</text>
      </view>
      
      <button 
        class="confirm-btn"
        :class="{ 'disabled': !canConfirm }"
        @click="handleConfirm"
      >
        确认预订
      </button>
    </view>

    <!-- 日期选择器 -->
    <uni-popup 
      ref="datePickerPopup" 
      type="bottom"
    >
      <view class="picker-modal">
        <view class="picker-header">
          <text class="picker-cancel" @click="closeDatePicker">取消</text>
          <text class="picker-title">选择日期</text>
          <text class="picker-confirm" @click="confirmDate">确定</text>
        </view>
        <picker-view 
          class="date-picker"
          :value="datePickerValue"
          @change="onDatePickerChange"
        >
          <picker-view-column>
            <view 
              v-for="(item, index) in dateOptions"
              :key="index"
              class="picker-item"
            >
              {{ item.label }}
            </view>
          </picker-view-column>
        </picker-view>
      </view>
    </uni-popup>

    <!-- 时间选择器 -->
    <uni-popup 
      ref="timePickerPopup" 
      type="bottom"
    >
      <view class="picker-modal">
        <view class="picker-header">
          <text class="picker-cancel" @click="closeTimePicker">取消</text>
          <text class="picker-title">{{ timePickerType === 'start' ? '选择开始时间' : '选择结束时间' }}</text>
          <text class="picker-confirm" @click="confirmTime">确定</text>
        </view>
        <picker-view 
          class="time-picker"
          :value="timePickerValue"
          @change="onTimePickerChange"
        >
          <picker-view-column>
            <view 
              v-for="hour in 24"
              :key="hour"
              class="picker-item"
            >
              {{ String(hour - 1).padStart(2, '0') }}
            </view>
          </picker-view-column>
          <picker-view-column>
            <view 
              v-for="minute in [0, 30]"
              :key="minute"
              class="picker-item"
            >
              {{ String(minute).padStart(2, '0') }}
            </view>
          </picker-view-column>
        </picker-view>
      </view>
    </uni-popup>

    <!-- 优惠券选择 -->
    <uni-popup 
      ref="couponPopup" 
      type="bottom"
    >
      <view class="coupon-modal">
        <view class="modal-header">
          <text class="modal-title">选择优惠券</text>
          <text class="modal-close" @click="closeCouponPicker">✕</text>
        </view>
        <view class="coupon-list">
          <view 
            class="coupon-item"
            :class="{ 'selected': !selectedCoupon }"
            @click="selectCoupon(null)"
          >
            <text class="coupon-name">不使用优惠券</text>
          </view>
          <view 
            v-for="coupon in availableCoupons"
            :key="coupon.id"
            class="coupon-item"
            :class="{ 
              'selected': selectedCoupon?.id === coupon.id,
              'disabled': !canUseCoupon(coupon)
            }"
            @click="selectCoupon(coupon)"
          >
            <view class="coupon-content">
              <text class="coupon-name">{{ coupon.name }}</text>
              <text class="coupon-desc">{{ coupon.description }}</text>
              <text class="coupon-amount">减 ¥{{ coupon.discount.toFixed(2) }}</text>
            </view>
          </view>
        </view>
      </view>
    </uni-popup>

    <!-- 支付组件 -->
    <PaymentForm
      v-if="showPayment"
      :amount="finalAmount"
      :order-id="orderId"
      @success="onPaymentSuccess"
      @failed="onPaymentFailed"
      @cancel="onPaymentCancel"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import * as BookingService from '@/services/booking'
import PaymentForm from '@/components/PaymentForm.vue'

// 页面参数类型
interface PageParams {
  roomId?: string
  storeId: string
  isVip?: string
}

// 优惠券类型
interface Coupon {
  id: string
  name: string
  description: string
  discount: number
  minAmount: number
  maxDiscount?: number
}

// Store
const userStore = useUserStore()

// 状态管理
const roomId = ref('')
const storeId = ref('')
const isVip = ref(false)
const usePoints = ref(false)
const pointsToUse = ref(0)
const selectedCoupon = ref<Coupon | null>(null)
const selectedDate = ref('')
const selectedStartTime = ref('')
const selectedEndTime = ref('')
const timePickerType = ref<'start' | 'end'>('start')
const showPayment = ref(false)
const orderId = ref('')

// 表单数据
const contactInfo = ref({
  name: '',
  phone: '',
  remark: ''
})

// 数据
const spaceInfo = ref<any>({
  name: '加载中...',
  type: '',
  capacity: 0,
  minPrice: 0,
  size: '',
  images: []
})

const availableCoupons = ref<Coupon[]>([
  {
    id: '1',
    name: '新用户专享券',
    description: '满100减20',
    discount: 20,
    minAmount: 100
  },
  {
    id: '2',
    name: 'VIP专属券',
    description: '满200减50',
    discount: 50,
    minAmount: 200
  }
])

// 日期时间选择器数据
const datePickerValue = ref([0])
const timePickerValue = ref([12, 0])
const dateOptions = ref<any[]>([])

// Refs
const datePickerPopup = ref()
const timePickerPopup = ref()
const couponPopup = ref()

// 页面加载参数处理
onLoad((options: PageParams) => {
  roomId.value = options.roomId || ''
  storeId.value = options.storeId
  isVip.value = options.isVip === 'true'
})

// 计算属性
const userPoints = computed(() => userStore.userInfo?.points || 0)

const currentPrice = computed(() => {
  if (isVip.value) {
    return Math.floor(spaceInfo.value.minPrice * 0.8) // VIP 8折
  }
  return spaceInfo.value.minPrice
})

const bookingDuration = computed(() => {
  if (!selectedStartTime.value || !selectedEndTime.value) return 0
  
  const start = new Date(`2000-01-01 ${selectedStartTime.value}`)
  const end = new Date(`2000-01-01 ${selectedEndTime.value}`)
  
  if (end <= start) return 0
  
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
})

const minBookingHours = computed(() => {
  // 根据空间最低消费计算最低时长
  return Math.ceil(currentPrice.value / (spaceInfo.value.hourlyRate || 50))
})

const spaceBaseCost = computed(() => {
  const hours = Math.max(bookingDuration.value, minBookingHours.value)
  return currentPrice.value + (hours > minBookingHours.value ? (hours - minBookingHours.value) * (spaceInfo.value.hourlyRate || 50) : 0)
})

const vipDiscount = computed(() => {
  return isVip.value ? spaceInfo.value.minPrice * 0.2 : 0
})

const couponDiscount = computed(() => {
  if (!selectedCoupon.value || spaceBaseCost.value < selectedCoupon.value.minAmount) {
    return 0
  }
  const discount = selectedCoupon.value.discount
  const maxDiscount = selectedCoupon.value.maxDiscount
  return maxDiscount ? Math.min(discount, maxDiscount) : discount
})

const maxPointsCanUse = computed(() => {
  const afterDiscount = spaceBaseCost.value - vipDiscount.value - couponDiscount.value
  // 积分最多抵扣50%
  return Math.min(userPoints.value, Math.floor(afterDiscount * 0.5 * 100))
})

const pointsDiscount = computed(() => {
  return usePoints.value ? pointsToUse.value * 0.01 : 0
})

const finalAmount = computed(() => {
  let amount = spaceBaseCost.value - vipDiscount.value - couponDiscount.value - pointsDiscount.value
  
  if (!isVip.value) {
    // 普通用户只需支付50%押金
    amount = amount * 0.5
  }
  
  return Math.max(0, amount)
})

const depositAmount = computed(() => {
  return isVip.value ? 0 : spaceBaseCost.value * 0.5
})

const remainingAmount = computed(() => {
  return isVip.value ? 0 : spaceBaseCost.value - finalAmount.value
})

const canConfirm = computed(() => {
  return selectedDate.value && 
         selectedStartTime.value && 
         selectedEndTime.value && 
         contactInfo.value.name && 
         contactInfo.value.phone &&
         bookingDuration.value > 0
})

// 方法
// 初始化数据
const initData = async () => {
  await loadSpaceInfo()
  initDateOptions()
  initUserInfo()
}

// 加载空间信息
const loadSpaceInfo = async () => {
  try {
    // 模拟API调用
    setTimeout(() => {
      spaceInfo.value = {
        _id: roomId.value,
        name: '豪华大包间',
        type: 'KTV包间',
        capacity: 15,
        minPrice: 288,
        hourlyRate: 88,
        size: '30㎡',
        images: ['/static/room1.jpg']
      }
    }, 500)
  } catch (error) {
    console.error('加载空间信息失败:', error)
  }
}

// 初始化日期选项
const initDateOptions = () => {
  const today = new Date()
  const options = []
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    options.push({
      value: date.toISOString().split('T')[0],
      label: i === 0 ? '今天' : i === 1 ? '明天' : `${date.getMonth() + 1}月${date.getDate()}日`
    })
  }
  
  dateOptions.value = options
}

// 初始化用户信息
const initUserInfo = () => {
  if (userStore.userInfo) {
    contactInfo.value.name = userStore.userInfo.nickname || ''
    contactInfo.value.phone = userStore.userInfo.phone || ''
  }
}

// 显示日期选择器
const showDatePicker = () => {
  datePickerPopup.value?.open()
}

// 关闭日期选择器
const closeDatePicker = () => {
  datePickerPopup.value?.close()
}

// 确认日期选择
const confirmDate = () => {
  const selectedIndex = datePickerValue.value[0]
  selectedDate.value = dateOptions.value[selectedIndex].label
  closeDatePicker()
}

// 日期选择器变化
const onDatePickerChange = (e: any) => {
  datePickerValue.value = e.detail.value
}

// 显示开始时间选择器
const showStartTimePicker = () => {
  timePickerType.value = 'start'
  timePickerPopup.value?.open()
}

// 显示结束时间选择器
const showEndTimePicker = () => {
  timePickerType.value = 'end'
  timePickerPopup.value?.open()
}

// 关闭时间选择器
const closeTimePicker = () => {
  timePickerPopup.value?.close()
}

// 确认时间选择
const confirmTime = () => {
  const hour = timePickerValue.value[0]
  const minute = timePickerValue.value[1] * 30
  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  
  if (timePickerType.value === 'start') {
    selectedStartTime.value = timeString
  } else {
    selectedEndTime.value = timeString
  }
  
  closeTimePicker()
}

// 时间选择器变化
const onTimePickerChange = (e: any) => {
  timePickerValue.value = e.detail.value
}

// 积分开关切换
const onPointsToggle = (e: any) => {
  usePoints.value = e.detail.value
  if (!usePoints.value) {
    pointsToUse.value = 0
  }
}

// 积分滑块变化
const onPointsChange = (e: any) => {
  pointsToUse.value = e.detail.value
}

// 显示优惠券选择
const showCouponPicker = () => {
  couponPopup.value?.open()
}

// 关闭优惠券选择
const closeCouponPicker = () => {
  couponPopup.value?.close()
}

// 是否可以使用优惠券
const canUseCoupon = (coupon: Coupon): boolean => {
  return spaceBaseCost.value >= coupon.minAmount
}

// 选择优惠券
const selectCoupon = (coupon: Coupon | null) => {
  if (coupon && !canUseCoupon(coupon)) {
    uni.showToast({
      title: `订单需满${coupon.minAmount}元才能使用`,
      icon: 'none'
    })
    return
  }
  
  selectedCoupon.value = coupon
  closeCouponPicker()
}

// 处理确认预订
const handleConfirm = async () => {
  if (!canConfirm.value) {
    uni.showToast({
      title: '请完善预订信息',
      icon: 'none'
    })
    return
  }
  
  // 验证手机号
  if (!/^1[3-9]\d{9}$/.test(contactInfo.value.phone)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none'
    })
    return
  }
  
  try {
    uni.showLoading({ title: '创建订单中...' })
    
    // 创建预订
    const bookingData = {
      roomId: roomId.value,
      storeId: storeId.value,
      date: selectedDate.value,
      startTime: selectedStartTime.value,
      endTime: selectedEndTime.value,
      duration: bookingDuration.value,
      contactInfo: contactInfo.value,
      usePoints: usePoints.value,
      pointsUsed: pointsToUse.value,
      couponId: selectedCoupon.value?.id,
      isVip: isVip.value,
      totalAmount: spaceBaseCost.value,
      payAmount: finalAmount.value
    }
    
    const response = await BookingService.createBooking(bookingData)
    
    if (response.success && response.data) {
      orderId.value = response.data.orderId
      uni.hideLoading()
      
      if (finalAmount.value > 0) {
        // 需要支付
        showPayment.value = true
      } else {
        // 无需支付（如VIP用户且全部积分抵扣）
        onPaymentSuccess({
          orderId: orderId.value,
          transactionId: 'FREE_' + Date.now(),
          amount: 0,
          method: 'free',
          timestamp: new Date().toISOString()
        })
      }
    }
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({
      title: error.message || '预订失败',
      icon: 'none'
    })
  }
}

// 支付成功
const onPaymentSuccess = (result: any) => {
  showPayment.value = false
  
  uni.showToast({
    title: '预订成功',
    icon: 'success'
  })
  
  setTimeout(() => {
    uni.redirectTo({
      url: `/pages/booking/success?orderId=${orderId.value}`
    })
  }, 1500)
}

// 支付失败
const onPaymentFailed = (error: string) => {
  showPayment.value = false
  
  uni.showToast({
    title: error || '支付失败',
    icon: 'none'
  })
}

// 支付取消
const onPaymentCancel = () => {
  showPayment.value = false
}

// 返回上级页面
const goBack = () => {
  uni.navigateBack()
}

// 生命周期
onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss">
.booking-confirm-page {
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

.content {
  flex: 1;
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.info-card,
.booking-time-card,
.contact-card,
.discount-card,
.cost-breakdown,
.booking-rules {
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

.time-tip {
  font-size: 24rpx;
  color: #667eea;
}

.space-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.space-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}

.space-details {
  flex: 1;
}

.space-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.space-type {
  font-size: 26rpx;
  color: #667eea;
  margin-bottom: 8rpx;
  display: block;
}

.space-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
}

.meta-divider {
  font-size: 24rpx;
  color: #ccc;
}

.space-price {
  text-align: right;
}

.price-label {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 4rpx;
  display: block;
}

.price-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #ff4444;
}

.time-selector {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.date-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.selector-label {
  font-size: 28rpx;
  color: #333;
}

.selector-value {
  font-size: 28rpx;
  color: #667eea;
}

.selector-arrow {
  font-size: 24rpx;
  color: #999;
}

.time-selector-row {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.time-input {
  flex: 1;
  padding: 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.input-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
  display: block;
}

.input-value {
  font-size: 28rpx;
  color: #333;
}

.time-divider {
  font-size: 28rpx;
  color: #999;
}

.duration-info {
  padding: 16rpx 24rpx;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duration-text {
  font-size: 26rpx;
  color: #667eea;
}

.duration-warning {
  font-size: 24rpx;
  color: #ff4444;
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.form-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.form-input {
  height: 80rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
}

.form-textarea {
  min-height: 120rpx;
  padding: 20rpx 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  resize: none;
}

.discount-section {
  margin-bottom: 24rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.discount-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.discount-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.discount-icon {
  font-size: 32rpx;
}

.discount-details {
  flex: 1;
}

.discount-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 4rpx;
  display: block;
}

.discount-desc {
  font-size: 24rpx;
  color: #999;
}

.points-slider {
  padding: 0 24rpx;
}

.points-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
}

.points-text {
  font-size: 26rpx;
  color: #666;
}

.points-discount {
  font-size: 26rpx;
  color: #667eea;
}

.vip-privileges {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  color: white;
}

.privilege-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.privilege-icon {
  font-size: 32rpx;
}

.privilege-title {
  font-size: 32rpx;
  font-weight: 600;
}

.privilege-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.privilege-item {
  display: flex;
  align-items: center;
}

.privilege-text {
  font-size: 26rpx;
  line-height: 1.4;
}

.cost-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &.discount {
    .cost-value {
      color: #00aa00;
    }
  }
  
  &.total {
    padding-top: 16rpx;
    border-top: 2rpx solid #f0f0f0;
    
    .cost-label {
      font-weight: 600;
      font-size: 30rpx;
    }
    
    .cost-value {
      font-weight: 600;
      font-size: 36rpx;
      color: #ff4444;
    }
  }
  
  &.remaining {
    .cost-value {
      color: #ffa500;
    }
  }
}

.cost-label {
  font-size: 28rpx;
  color: #666;
}

.cost-value {
  font-size: 28rpx;
  color: #333;
}

.cost-divider {
  height: 2rpx;
  background: #f0f0f0;
  margin: 8rpx 0;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}

.rule-number {
  font-size: 26rpx;
  color: #667eea;
  font-weight: 500;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.rule-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.bottom-spacer {
  height: 120rpx;
}

.confirm-bar {
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

.amount-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.amount-label {
  font-size: 24rpx;
  color: #999;
}

.amount-value {
  font-size: 36rpx;
  color: #ff4444;
  font-weight: 600;
}

.confirm-btn {
  flex: 1;
  height: 80rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  font-size: 32rpx;
  border: none;
  
  &.disabled {
    background: #ccc;
    color: #999;
  }
}

// 选择器样式
.picker-modal {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  height: 60vh;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.picker-cancel,
.picker-confirm {
  font-size: 28rpx;
  color: #667eea;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.date-picker,
.time-picker {
  height: calc(100% - 120rpx);
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
  font-size: 30rpx;
  color: #333;
}

// 优惠券选择样式
.coupon-modal {
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

.coupon-list {
  max-height: 600rpx;
  overflow-y: auto;
  padding: 32rpx;
}

.coupon-item {
  padding: 24rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  
  &.selected {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
  }
  
  &.disabled {
    opacity: 0.5;
  }
}

.coupon-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.coupon-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.coupon-desc {
  font-size: 24rpx;
  color: #999;
}

.coupon-amount {
  font-size: 26rpx;
  color: #667eea;
  font-weight: 600;
}
</style>
