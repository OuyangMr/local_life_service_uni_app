<!--
  订单确认页面
  @description 按设计稿实现订单确认、优惠券选择、积分抵扣、支付，显示配送信息和预估时间
-->
<template>
  <view class="order-confirm-page">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">确认订单</text>
      </view>
      <view class="nav-right">
        <text class="order-type-text">{{ orderTypeText }}</text>
      </view>
    </view>

    <scroll-view class="content-scroll" scroll-y>
      <!-- 配送信息 -->
      <view v-if="orderType === 'delivery'" class="delivery-section">
        <view class="section-header">
          <text class="section-title">配送信息</text>
          <text class="section-action" @click="selectDeliveryAddress">
            {{ deliveryAddress ? '更换地址' : '选择地址' }}
          </text>
        </view>
        
        <view v-if="deliveryAddress" class="delivery-card">
          <view class="address-info">
            <view class="address-header">
              <text class="contact-name">{{ deliveryAddress.contactName }}</text>
              <text class="contact-phone">{{ deliveryAddress.contactPhone }}</text>
            </view>
            <text class="address-detail">{{ deliveryAddress.detail }}</text>
          </view>
          <view class="delivery-time">
            <text class="time-label">预计送达：</text>
            <text class="time-text">{{ estimatedDeliveryTime }}</text>
          </view>
        </view>
        
        <view v-else class="no-address">
          <text class="no-address-text">请选择配送地址</text>
          <button class="select-address-btn" @click="selectDeliveryAddress">
            选择地址
          </button>
        </view>
      </view>

      <!-- 门店信息 -->
      <view v-else class="store-section">
        <view class="section-header">
          <text class="section-title">门店信息</text>
        </view>
        
        <view class="store-card">
          <view class="store-info">
            <text class="store-name">{{ storeInfo.name }}</text>
            <text class="store-address">{{ storeInfo.address }}</text>
          </view>
          <view v-if="spaceInfo" class="space-info">
            <text class="space-label">空间：</text>
            <text class="space-text">{{ spaceInfo.name }} - {{ tableNumber }}桌</text>
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="products-section">
        <view class="section-header">
          <text class="section-title">商品清单</text>
          <text class="section-action" @click="editCart">编辑</text>
        </view>
        
        <view class="products-list">
          <view 
            v-for="item in cartStore.items"
            :key="`${item.dish._id}_${getItemKey(item)}`"
            class="product-item"
          >
            <image 
              :src="item.dish.images?.[0] || '/static/placeholder-dish.png'"
              class="product-image"
              mode="aspectFill"
            />
            
            <view class="product-info">
              <text class="product-name">{{ item.dish.name }}</text>
              
              <!-- 规格信息 -->
              <view v-if="item.selectedSpecs?.length" class="product-specs">
                <text 
                  v-for="spec in item.selectedSpecs"
                  :key="spec.name"
                  class="spec-text"
                >
                  {{ spec.name }}:{{ spec.value }}
                </text>
              </view>
              
              <!-- 特殊要求 -->
              <text v-if="item.specialRequests" class="special-requests">
                备注：{{ item.specialRequests }}
              </text>
              
              <view class="product-price">
                <text class="unit-price">¥{{ item.dish.price.toFixed(2) }}</text>
                <text class="quantity">× {{ item.quantity }}</text>
              </view>
            </view>
            
            <view class="item-total">
              <text class="total-price">¥{{ (item.dish.price * item.quantity).toFixed(2) }}</text>
            </view>
          </view>
        </view>
        
        <!-- 商品统计 -->
        <view class="products-summary">
          <text class="summary-text">共{{ cartStore.totalQuantity }}件商品</text>
          <text class="summary-amount">小计：¥{{ cartStore.totalAmount.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 优惠信息 -->
      <view class="promotion-section">
        <!-- 优惠券 -->
        <view class="promotion-item" @click="selectCoupon">
          <view class="promotion-left">
            <text class="promotion-icon">🎫</text>
            <text class="promotion-title">优惠券</text>
          </view>
          <view class="promotion-right">
            <text v-if="selectedCoupon" class="promotion-value">
              -¥{{ selectedCoupon.discount.toFixed(2) }}
            </text>
            <text v-else class="promotion-placeholder">选择优惠券</text>
            <text class="promotion-arrow">></text>
          </view>
        </view>
        
        <!-- 积分抵扣 -->
        <view v-if="userStore.userInfo?.points > 0" class="promotion-item" @click="togglePointsUsage">
          <view class="promotion-left">
            <text class="promotion-icon">⭐</text>
            <text class="promotion-title">积分抵扣</text>
            <text class="promotion-desc">可用{{ userStore.userInfo.points }}积分</text>
          </view>
          <view class="promotion-right">
            <text v-if="usePoints" class="promotion-value">
              -¥{{ pointsDiscount.toFixed(2) }}
            </text>
            <switch 
              :checked="usePoints"
              @change="onPointsToggle"
              class="points-switch"
            />
          </view>
        </view>
        
        <!-- VIP折扣 -->
        <view v-if="userStore.isVip && vipDiscount > 0" class="promotion-item">
          <view class="promotion-left">
            <text class="promotion-icon">👑</text>
            <text class="promotion-title">VIP会员折扣</text>
          </view>
          <view class="promotion-right">
            <text class="promotion-value">-¥{{ vipDiscount.toFixed(2) }}</text>
            <text class="vip-badge">自动享受</text>
          </view>
        </view>
      </view>

      <!-- 支付方式 */
      <view class="payment-section">
        <view class="section-header">
          <text class="section-title">支付方式</text>
        </view>
        
        <view class="payment-methods">
          <view 
            v-for="method in paymentMethods"
            :key="method.key"
            class="payment-method"
            :class="{ 'active': selectedPaymentMethod === method.key }"
            @click="selectPaymentMethod(method.key)"
          >
            <view class="method-left">
              <text class="method-icon">{{ method.icon }}</text>
              <text class="method-name">{{ method.name }}</text>
            </view>
            <view class="method-right">
              <text v-if="method.bonus" class="method-bonus">{{ method.bonus }}</text>
              <view class="method-radio">
                <text v-if="selectedPaymentMethod === method.key" class="radio-checked">●</text>
                <text v-else class="radio-unchecked">○</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 订单备注 -->
      <view class="notes-section">
        <view class="section-header">
          <text class="section-title">订单备注</text>
        </view>
        
        <textarea
          v-model="orderNotes"
          class="notes-input"
          placeholder="选填，请输入您的要求（如口味偏好、送餐时间等）"
          maxlength="200"
        />
        <text class="notes-count">{{ orderNotes.length }}/200</text>
      </view>

      <!-- 费用明细 -->
      <view class="cost-breakdown">
        <view class="breakdown-header">
          <text class="breakdown-title">费用明细</text>
        </view>
        
        <view class="breakdown-list">
          <view class="cost-item">
            <text class="cost-label">商品金额</text>
            <text class="cost-value">¥{{ cartStore.totalAmount.toFixed(2) }}</text>
          </view>
          
          <view v-if="deliveryFee > 0" class="cost-item">
            <text class="cost-label">配送费</text>
            <text class="cost-value">¥{{ deliveryFee.toFixed(2) }}</text>
          </view>
          
          <view v-if="serviceFee > 0" class="cost-item">
            <text class="cost-label">服务费</text>
            <text class="cost-value">¥{{ serviceFee.toFixed(2) }}</text>
          </view>
          
          <view v-if="packagingFee > 0" class="cost-item">
            <text class="cost-label">包装费</text>
            <text class="cost-value">¥{{ packagingFee.toFixed(2) }}</text>
          </view>
          
          <view v-if="selectedCoupon" class="cost-item discount">
            <text class="cost-label">优惠券</text>
            <text class="cost-value">-¥{{ selectedCoupon.discount.toFixed(2) }}</text>
          </view>
          
          <view v-if="usePoints && pointsDiscount > 0" class="cost-item discount">
            <text class="cost-label">积分抵扣</text>
            <text class="cost-value">-¥{{ pointsDiscount.toFixed(2) }}</text>
          </view>
          
          <view v-if="vipDiscount > 0" class="cost-item discount">
            <text class="cost-label">VIP折扣</text>
            <text class="cost-value">-¥{{ vipDiscount.toFixed(2) }}</text>
          </view>
        </view>
        
        <view class="total-amount">
          <text class="total-label">实付金额</text>
          <text class="total-value">¥{{ finalAmount.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部提交栏 -->
    <view class="submit-bar">
      <view class="amount-info">
        <text class="amount-label">实付</text>
        <text class="amount-value">¥{{ finalAmount.toFixed(2) }}</text>
      </view>
      
      <button 
        class="submit-btn"
        :disabled="!canSubmit"
        @click="submitOrder"
      >
        {{ submitButtonText }}
      </button>
    </view>

    <!-- 优惠券选择弹窗 -->
    <uni-popup 
      ref="couponPopup" 
      type="bottom"
    >
      <view class="coupon-modal">
        <view class="coupon-header">
          <text class="coupon-title">选择优惠券</text>
          <text class="coupon-close" @click="closeCouponModal">✕</text>
        </view>
        
        <scroll-view class="coupon-list" scroll-y>
          <view 
            v-for="coupon in availableCoupons"
            :key="coupon.id"
            class="coupon-item"
            :class="{ 
              'active': selectedCoupon?.id === coupon.id,
              'disabled': !isCouponUsable(coupon)
            }"
            @click="chooseCoupon(coupon)"
          >
            <view class="coupon-content">
              <view class="coupon-left">
                <text class="coupon-discount">¥{{ coupon.discount }}</text>
                <text class="coupon-condition">{{ coupon.condition }}</text>
              </view>
              <view class="coupon-right">
                <text class="coupon-name">{{ coupon.name }}</text>
                <text class="coupon-expiry">{{ coupon.expiryText }}</text>
              </view>
            </view>
            <view v-if="selectedCoupon?.id === coupon.id" class="coupon-selected">✓</view>
          </view>
          
          <view class="no-coupon-item" @click="chooseCoupon(null)">
            <text class="no-coupon-text">不使用优惠券</text>
            <view v-if="!selectedCoupon" class="coupon-selected">✓</view>
          </view>
        </scroll-view>
      </view>
    </uni-popup>

    <!-- 支付表单组件 -->
    <PaymentForm
      v-if="showPaymentForm"
      :order-info="paymentOrderInfo"
      :payment-method="selectedPaymentMethod"
      :amount="finalAmount"
      @success="onPaymentSuccess"
      @failure="onPaymentFailure"
      @cancel="onPaymentCancel"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import * as OrderService from '@/services/order'
import * as PaymentService from '@/services/payment'
import PaymentForm from '@/components/PaymentForm.vue'

// Store
const userStore = useUserStore()
const cartStore = useCartStore()

// 路由参数
const orderType = ref<'scan' | 'delivery' | 'booking'>('scan')
const spaceId = ref('')
const tableNumber = ref('')

// 配送信息
const deliveryAddress = ref<any>(null)
const estimatedDeliveryTime = ref('')

// 门店信息
const storeInfo = ref({
  name: '星空KTV',
  address: '北京市朝阳区建国路88号'
})

const spaceInfo = ref({
  name: '豪华大包间'
})

// 优惠信息
const selectedCoupon = ref<any>(null)
const usePoints = ref(false)
const availableCoupons = ref<any[]>([])

// 支付方式
const selectedPaymentMethod = ref('wechat')
const paymentMethods = ref([
  {
    key: 'wechat',
    name: '微信支付',
    icon: '💚',
    bonus: null
  },
  {
    key: 'alipay',
    name: '支付宝',
    icon: '🔵',
    bonus: null
  },
  {
    key: 'unionpay',
    name: '云闪付',
    icon: '🔴',
    bonus: '立减2元'
  }
])

// 订单信息
const orderNotes = ref('')
const showPaymentForm = ref(false)
const paymentOrderInfo = ref<any>(null)

// Refs
const couponPopup = ref()

// 计算属性
const orderTypeText = computed(() => {
  const typeMap = {
    scan: '扫码点单',
    delivery: '外卖配送',
    booking: '预订点单'
  }
  return typeMap[orderType.value] || '订单确认'
})

const deliveryFee = computed(() => {
  if (orderType.value === 'delivery') {
    return cartStore.totalAmount >= 30 ? 0 : 3
  }
  return 0
})

const serviceFee = computed(() => {
  if (orderType.value === 'scan') {
    return cartStore.totalAmount * 0.05 // 5% 服务费
  }
  return 0
})

const packagingFee = computed(() => {
  if (orderType.value === 'delivery') {
    return cartStore.items.length * 0.5 // 每件商品0.5元包装费
  }
  return 0
})

const pointsDiscount = computed(() => {
  if (!usePoints.value || !userStore.userInfo?.points) return 0
  
  const maxUsePoints = Math.min(
    userStore.userInfo.points,
    Math.floor(cartStore.totalAmount) // 最多抵扣商品金额
  )
  
  return maxUsePoints * 0.01 // 100积分 = 1元
})

const vipDiscount = computed(() => {
  if (!userStore.isVip) return 0
  
  // VIP会员享受5%折扣
  return cartStore.totalAmount * 0.05
})

const finalAmount = computed(() => {
  let amount = cartStore.totalAmount + deliveryFee.value + serviceFee.value + packagingFee.value
  
  // 扣除优惠
  if (selectedCoupon.value) {
    amount -= selectedCoupon.value.discount
  }
  
  if (usePoints.value) {
    amount -= pointsDiscount.value
  }
  
  if (userStore.isVip) {
    amount -= vipDiscount.value
  }
  
  return Math.max(0.01, amount) // 最少支付0.01元
})

const canSubmit = computed(() => {
  if (cartStore.items.length === 0) return false
  
  if (orderType.value === 'delivery' && !deliveryAddress.value) return false
  
  return true
})

const submitButtonText = computed(() => {
  if (!canSubmit.value) return '请完善订单信息'
  
  return `立即支付 ¥${finalAmount.value.toFixed(2)}`
})

// 方法
// 初始化数据
const initData = async () => {
  await loadAvailableCoupons()
  calculateEstimatedTime()
}

// 加载可用优惠券
const loadAvailableCoupons = async () => {
  try {
    // 模拟优惠券数据
    availableCoupons.value = [
      {
        id: '1',
        name: '新用户优惠券',
        discount: 5,
        condition: '满20元可用',
        minAmount: 20,
        expiryText: '2024年12月31日到期'
      },
      {
        id: '2',
        name: '满减优惠券',
        discount: 10,
        condition: '满50元可用',
        minAmount: 50,
        expiryText: '2024年12月31日到期'
      },
      {
        id: '3',
        name: 'VIP专享券',
        discount: 15,
        condition: '满100元可用',
        minAmount: 100,
        expiryText: '2024年12月31日到期',
        vipOnly: true
      }
    ]
  } catch (error) {
    console.error('加载优惠券失败:', error)
  }
}

// 计算预估时间
const calculateEstimatedTime = () => {
  if (orderType.value === 'delivery') {
    const now = new Date()
    const estimated = new Date(now.getTime() + 45 * 60 * 1000) // 45分钟后
    estimatedDeliveryTime.value = `${estimated.getHours().toString().padStart(2, '0')}:${estimated.getMinutes().toString().padStart(2, '0')}`
  }
}

// 获取商品唯一标识
const getItemKey = (item: any): string => {
  const specs = item.selectedSpecs?.map((s: any) => `${s.name}:${s.value}`).join(',') || ''
  return `${specs}_${item.specialRequests || ''}`
}

// 地址选择
const selectDeliveryAddress = () => {
  // 跳转到地址选择页面
  uni.navigateTo({
    url: '/pages/user/address?action=select'
  })
}

// 编辑购物车
const editCart = () => {
  uni.navigateBack()
}

// 优惠券相关方法
const selectCoupon = () => {
  couponPopup.value?.open()
}

const closeCouponModal = () => {
  couponPopup.value?.close()
}

const isCouponUsable = (coupon: any): boolean => {
  if (coupon.vipOnly && !userStore.isVip) return false
  if (cartStore.totalAmount < coupon.minAmount) return false
  return true
}

const chooseCoupon = (coupon: any) => {
  if (coupon && !isCouponUsable(coupon)) {
    uni.showToast({
      title: '优惠券不满足使用条件',
      icon: 'none'
    })
    return
  }
  
  selectedCoupon.value = coupon
  closeCouponModal()
}

// 积分相关方法
const togglePointsUsage = () => {
  usePoints.value = !usePoints.value
}

const onPointsToggle = (e: any) => {
  usePoints.value = e.detail.value
}

// 支付方式选择
const selectPaymentMethod = (method: string) => {
  selectedPaymentMethod.value = method
}

// 提交订单
const submitOrder = async () => {
  if (!canSubmit.value) return
  
  try {
    uni.showLoading({
      title: '正在创建订单...'
    })
    
    // 构建订单数据
    const orderData = {
      type: orderType.value,
      storeId: storeInfo.value.id || 'default_store',
      spaceId: spaceId.value,
      tableNumber: tableNumber.value,
      items: cartStore.items,
      deliveryAddress: deliveryAddress.value,
      couponId: selectedCoupon.value?.id,
      usePoints: usePoints.value,
      pointsAmount: usePoints.value ? pointsDiscount.value : 0,
      notes: orderNotes.value,
      paymentMethod: selectedPaymentMethod.value,
      amounts: {
        subtotal: cartStore.totalAmount,
        deliveryFee: deliveryFee.value,
        serviceFee: serviceFee.value,
        packagingFee: packagingFee.value,
        discount: (selectedCoupon.value?.discount || 0) + pointsDiscount.value + vipDiscount.value,
        total: finalAmount.value
      }
    }
    
    // 创建订单
    const orderResult = await OrderService.createOrder(orderData)
    
    uni.hideLoading()
    
    if (orderResult.success) {
      // 设置支付信息
      paymentOrderInfo.value = orderResult.data
      
      // 显示支付表单
      showPaymentForm.value = true
    } else {
      uni.showToast({
        title: orderResult.message || '创建订单失败',
        icon: 'none'
      })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('提交订单失败:', error)
    uni.showToast({
      title: '网络错误，请重试',
      icon: 'none'
    })
  }
}

// 支付回调
const onPaymentSuccess = (paymentResult: any) => {
  showPaymentForm.value = false
  
  // 清空购物车
  cartStore.clearCart()
  
  // 跳转到支付成功页面
  uni.redirectTo({
    url: `/pages/order/success?orderId=${paymentOrderInfo.value.orderId}&amount=${finalAmount.value}`
  })
}

const onPaymentFailure = (error: any) => {
  showPaymentForm.value = false
  
  uni.showModal({
    title: '支付失败',
    content: error.message || '支付过程中出现问题，请重试',
    showCancel: true,
    cancelText: '取消',
    confirmText: '重试',
    success: (res) => {
      if (res.confirm) {
        submitOrder()
      }
    }
  })
}

const onPaymentCancel = () => {
  showPaymentForm.value = false
}

// 返回上级页面
const goBack = () => {
  uni.navigateBack()
}

// 生命周期
onMounted(() => {
  initData()
})

onLoad((options) => {
  if (options.type) {
    orderType.value = options.type as any
  }
  if (options.spaceId) {
    spaceId.value = options.spaceId
  }
  if (options.tableNumber) {
    tableNumber.value = options.tableNumber
  }
})
</script>

<style scoped lang="scss">
.order-confirm-page {
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

.nav-right {
  padding: 8rpx 16rpx;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 16rpx;
}

.order-type-text {
  font-size: 24rpx;
  color: #667eea;
}

.content-scroll {
  flex: 1;
  padding-bottom: 150rpx;
}

// 通用区块样式
.delivery-section,
.store-section,
.products-section,
.promotion-section,
.payment-section,
.notes-section,
.cost-breakdown {
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

// 配送信息样式
.delivery-card {
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  padding: 24rpx;
}

.address-info {
  margin-bottom: 16rpx;
}

.address-header {
  display: flex;
  gap: 24rpx;
  margin-bottom: 12rpx;
}

.contact-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.contact-phone {
  font-size: 26rpx;
  color: #666;
}

.address-detail {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.delivery-time {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #f0f0f0;
}

.time-label {
  font-size: 24rpx;
  color: #999;
}

.time-text {
  font-size: 26rpx;
  color: #667eea;
  font-weight: 500;
}

.no-address {
  text-align: center;
  padding: 40rpx 0;
}

.no-address-text {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 24rpx;
  display: block;
}

.select-address-btn {
  padding: 16rpx 32rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  font-size: 26rpx;
  border: none;
}

// 门店信息样式
.store-card {
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  padding: 24rpx;
}

.store-info {
  margin-bottom: 16rpx;
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

.space-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding-top: 16rpx;
  border-top: 2rpx solid #f0f0f0;
}

.space-label {
  font-size: 24rpx;
  color: #999;
}

.space-text {
  font-size: 26rpx;
  color: #667eea;
  font-weight: 500;
}

// 商品列表样式
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
  gap: 12rpx;
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

.product-price {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.unit-price {
  font-size: 26rpx;
  color: #ff4444;
  font-weight: 500;
}

.quantity {
  font-size: 24rpx;
  color: #999;
}

.item-total {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  justify-content: center;
}

.total-price {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.products-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 24rpx;
  border-top: 2rpx solid #f0f0f0;
}

.summary-text {
  font-size: 26rpx;
  color: #666;
}

.summary-amount {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

// 优惠信息样式
.promotion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.promotion-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.promotion-icon {
  font-size: 32rpx;
}

.promotion-title {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.promotion-desc {
  font-size: 22rpx;
  color: #999;
  margin-left: 8rpx;
}

.promotion-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.promotion-value {
  font-size: 26rpx;
  color: #ff4444;
  font-weight: 500;
}

.promotion-placeholder {
  font-size: 26rpx;
  color: #999;
}

.promotion-arrow {
  font-size: 24rpx;
  color: #ccc;
}

.points-switch {
  transform: scale(0.8);
}

.vip-badge {
  font-size: 20rpx;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
}

// 支付方式样式
.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.payment-method {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  
  &.active {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
  }
}

.method-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.method-icon {
  font-size: 32rpx;
}

.method-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.method-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.method-bonus {
  font-size: 22rpx;
  color: #ff4444;
  background: rgba(255, 68, 68, 0.1);
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
}

.method-radio {
  width: 32rpx;
  height: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-checked {
  font-size: 24rpx;
  color: #667eea;
}

.radio-unchecked {
  font-size: 24rpx;
  color: #ccc;
}

// 订单备注样式
.notes-input {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
  border: none;
  margin-bottom: 8rpx;
}

.notes-count {
  font-size: 22rpx;
  color: #999;
  text-align: right;
}

// 费用明细样式
.breakdown-header {
  margin-bottom: 24rpx;
}

.breakdown-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.breakdown-list {
  margin-bottom: 24rpx;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  
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

.total-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-top: 2rpx solid #f0f0f0;
}

.total-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.total-value {
  font-size: 36rpx;
  font-weight: 600;
  color: #ff4444;
}

.bottom-spacer {
  height: 150rpx;
}

// 底部提交栏
.submit-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background: white;
  border-top: 2rpx solid #f0f0f0;
  box-shadow: 0 -2rpx 8rpx rgba(0,0,0,0.1);
}

.amount-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.amount-label {
  font-size: 26rpx;
  color: #333;
}

.amount-value {
  font-size: 36rpx;
  font-weight: 600;
  color: #ff4444;
}

.submit-btn {
  padding: 20rpx 40rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  
  &:disabled {
    background: #ccc;
    color: #999;
  }
}

// 优惠券弹窗样式
.coupon-modal {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.coupon-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.coupon-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.coupon-list {
  max-height: 60vh;
  padding: 0 32rpx 32rpx;
}

.coupon-item {
  position: relative;
  padding: 24rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  
  &.active {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
  }
  
  &.disabled {
    opacity: 0.5;
    background: #f5f5f5;
  }
}

.coupon-content {
  display: flex;
  gap: 24rpx;
}

.coupon-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.coupon-discount {
  font-size: 36rpx;
  font-weight: 600;
  color: #ff4444;
}

.coupon-condition {
  font-size: 20rpx;
  color: #999;
}

.coupon-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.coupon-name {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.coupon-expiry {
  font-size: 22rpx;
  color: #999;
}

.coupon-selected {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 32rpx;
  height: 32rpx;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
}

.no-coupon-item {
  position: relative;
  padding: 24rpx;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  text-align: center;
}

.no-coupon-text {
  font-size: 26rpx;
  color: #666;
}
</style>
