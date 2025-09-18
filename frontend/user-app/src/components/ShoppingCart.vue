<!--
  购物车组件
  @description 实现商品列表、数量调整、价格计算，支持优惠券和积分抵扣预览
-->
<template>
  <view class="shopping-cart">
    <!-- 购物车头部 -->
    <view class="cart-header">
      <view class="header-left">
        <text class="cart-title">购物车</text>
        <text v-if="totalQuantity > 0" class="item-count">({{ totalQuantity }}件)</text>
      </view>
      <view v-if="cartItems.length > 0" class="header-right">
        <text 
          class="clear-cart" 
          @click="showClearConfirm"
        >
          清空
        </text>
      </view>
    </view>

    <!-- 购物车内容 -->
    <view class="cart-content">
      <!-- 空购物车状态 -->
      <view v-if="cartItems.length === 0" class="empty-cart">
        <view class="empty-icon">🛒</view>
        <text class="empty-text">购物车是空的</text>
        <text class="empty-hint">快去选购心仪的商品吧</text>
      </view>

      <!-- 商品列表 -->
      <view v-else class="cart-items">
        <view 
          v-for="item in cartItems" 
          :key="item.dish._id"
          class="cart-item"
          :class="{ 'unavailable': !item.dish.status || item.dish.status === 'sold_out' }"
        >
          <!-- 商品信息 -->
          <view class="item-info">
            <!-- 商品图片 -->
            <image 
              :src="item.dish.images?.[0] || '/static/placeholder-dish.png'"
              class="item-image"
              mode="aspectFill"
            />
            
            <!-- 商品详情 -->
            <view class="item-details">
              <text class="item-name">{{ item.dish.name }}</text>
              <text v-if="item.dish.description" class="item-desc">{{ item.dish.description }}</text>
              
              <!-- 价格信息 -->
              <view class="price-info">
                <text class="current-price">¥{{ formatPrice(item.dish.price) }}</text>
                <text 
                  v-if="item.dish.originalPrice && item.dish.originalPrice > item.dish.price" 
                  class="original-price"
                >
                  ¥{{ formatPrice(item.dish.originalPrice) }}
                </text>
                <text v-if="showVipPrice && vipPrice(item.dish)" class="vip-badge">会员价</text>
              </view>

              <!-- 商品状态 -->
              <view v-if="!item.dish.status || item.dish.status === 'sold_out'" class="item-status">
                <text class="status-text">已售罄</text>
              </view>
            </view>
          </view>

          <!-- 数量控制 -->
          <view class="quantity-control">
            <view 
              class="quantity-btn decrease"
              :class="{ 'disabled': item.quantity <= 1 }"
              @click="decreaseQuantity(item.dish._id)"
            >
              <text class="btn-text">-</text>
            </view>
            <text class="quantity-text">{{ item.quantity }}</text>
            <view 
              class="quantity-btn increase"
              :class="{ 'disabled': !canIncrease(item) }"
              @click="increaseQuantity(item.dish._id)"
            >
              <text class="btn-text">+</text>
            </view>
          </view>

          <!-- 删除按钮 -->
          <view 
            class="remove-item"
            @click="removeItem(item.dish._id)"
          >
            <text class="remove-icon">🗑️</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠信息区域 -->
    <view v-if="cartItems.length > 0" class="discount-section">
      <!-- 优惠券选择 -->
      <view class="coupon-selector" @click="showCouponPicker">
        <view class="selector-left">
          <text class="selector-icon">🎫</text>
          <text class="selector-label">优惠券</text>
        </view>
        <view class="selector-right">
          <text v-if="selectedCoupon" class="selected-coupon">
            {{ selectedCoupon.name }} -¥{{ formatPrice(selectedCoupon.discount) }}
          </text>
          <text v-else class="placeholder">选择优惠券</text>
          <text class="arrow">></text>
        </view>
      </view>

      <!-- 积分抵扣 -->
      <view v-if="userPoints > 0" class="points-section">
        <view class="points-toggle">
          <view class="toggle-left">
            <text class="toggle-icon">💎</text>
            <text class="toggle-label">积分抵扣</text>
            <text class="points-available">(可用{{ userPoints }}积分)</text>
          </view>
          <switch 
            :checked="usePoints" 
            @change="onPointsToggle"
            color="#667eea"
          />
        </view>
        
        <!-- 积分抵扣详情 -->
        <view v-if="usePoints" class="points-detail">
          <view class="points-slider">
            <slider 
              :value="pointsToUse"
              :max="maxPointsCanUse"
              :step="10"
              @change="onPointsChange"
              activeColor="#667eea"
              backgroundColor="#f0f0f0"
            />
          </view>
          <view class="points-info">
            <text class="points-text">使用 {{ pointsToUse }} 积分</text>
            <text class="points-discount">抵扣 ¥{{ formatPrice(pointsDiscount) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 结算区域 -->
    <view v-if="cartItems.length > 0" class="checkout-section">
      <!-- 价格明细 -->
      <view class="price-breakdown">
        <view class="price-row">
          <text class="price-label">商品金额</text>
          <text class="price-value">¥{{ formatPrice(subtotal) }}</text>
        </view>
        <view v-if="couponDiscount > 0" class="price-row discount">
          <text class="price-label">优惠券优惠</text>
          <text class="price-value">-¥{{ formatPrice(couponDiscount) }}</text>
        </view>
        <view v-if="pointsDiscount > 0" class="price-row discount">
          <text class="price-label">积分抵扣</text>
          <text class="price-value">-¥{{ formatPrice(pointsDiscount) }}</text>
        </view>
        <view class="price-row total">
          <text class="price-label">实付金额</text>
          <text class="price-value total-price">¥{{ formatPrice(finalAmount) }}</text>
        </view>
      </view>

      <!-- 结算按钮 -->
      <view class="checkout-actions">
        <button 
          class="checkout-btn"
          :class="{ 'disabled': !canCheckout }"
          @click="handleCheckout"
        >
          <text class="btn-text">
            去结算 {{ totalQuantity > 0 ? `(${totalQuantity})` : '' }}
          </text>
        </button>
      </view>
    </view>

    <!-- 确认清空弹窗 -->
    <uni-popup 
      ref="clearConfirmPopup" 
      type="dialog"
    >
      <uni-popup-dialog 
        type="warn"
        title="确认清空"
        content="确定要清空购物车吗？"
        @confirm="confirmClearCart"
        @close="closeClearConfirm"
      />
    </uni-popup>

    <!-- 优惠券选择弹窗 -->
    <uni-popup 
      ref="couponPopup" 
      type="bottom"
      :mask-click="false"
    >
      <view class="coupon-picker">
        <view class="picker-header">
          <text class="picker-title">选择优惠券</text>
          <text class="picker-close" @click="closeCouponPicker">✕</text>
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
              <text class="coupon-amount">减 ¥{{ formatPrice(coupon.discount) }}</text>
            </view>
          </view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import type { CartItem } from '@/stores/cart'

// Props
interface Props {
  /** 是否显示VIP价格 */
  showVipPrice?: boolean
  /** 最大购买数量限制 */
  maxQuantity?: number
}

const props = withDefaults(defineProps<Props>(), {
  showVipPrice: true,
  maxQuantity: 99
})

// Emits
interface Emits {
  /** 结算事件 */
  (e: 'checkout', data: CheckoutData): void
  /** 购物车变化 */
  (e: 'change', items: CartItem[]): void
}

const emit = defineEmits<Emits>()

// 优惠券类型
interface Coupon {
  id: string
  name: string
  description: string
  discount: number
  minAmount: number
  maxDiscount?: number
  validUntil: string
}

// 结算数据类型
interface CheckoutData {
  items: CartItem[]
  subtotal: number
  couponDiscount: number
  pointsDiscount: number
  pointsUsed: number
  finalAmount: number
  selectedCoupon: Coupon | null
}

// Store
const cartStore = useCartStore()
const userStore = useUserStore()

// 状态管理
const usePoints = ref(false)
const pointsToUse = ref(0)
const selectedCoupon = ref<Coupon | null>(null)

// 模拟优惠券数据
const availableCoupons = ref<Coupon[]>([
  {
    id: '1',
    name: '满50减10',
    description: '订单满50元可用',
    discount: 10,
    minAmount: 50,
    validUntil: '2024-12-31'
  },
  {
    id: '2',
    name: '满100减25',
    description: '订单满100元可用',
    discount: 25,
    minAmount: 100,
    validUntil: '2024-12-31'
  }
])

// Refs
const clearConfirmPopup = ref()
const couponPopup = ref()

// 计算属性
const cartItems = computed(() => cartStore.items)
const totalQuantity = computed(() => cartStore.totalQuantity)
const userPoints = computed(() => userStore.userInfo?.points || 0)

// 商品小计
const subtotal = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    const price = props.showVipPrice ? vipPrice(item.dish) || item.dish.price : item.dish.price
    return sum + price * item.quantity
  }, 0)
})

// 优惠券折扣
const couponDiscount = computed(() => {
  if (!selectedCoupon.value || subtotal.value < selectedCoupon.value.minAmount) {
    return 0
  }
  const discount = selectedCoupon.value.discount
  const maxDiscount = selectedCoupon.value.maxDiscount
  return maxDiscount ? Math.min(discount, maxDiscount) : discount
})

// 可使用的最大积分
const maxPointsCanUse = computed(() => {
  const afterCoupon = subtotal.value - couponDiscount.value
  // 积分最多抵扣订单金额的50%，1积分=0.01元
  return Math.min(userPoints.value, Math.floor(afterCoupon * 0.5 * 100))
})

// 积分抵扣金额
const pointsDiscount = computed(() => {
  return usePoints.value ? pointsToUse.value * 0.01 : 0
})

// 最终金额
const finalAmount = computed(() => {
  return Math.max(0, subtotal.value - couponDiscount.value - pointsDiscount.value)
})

// 是否可以结算
const canCheckout = computed(() => {
  return cartItems.value.length > 0 && 
         cartItems.value.every(item => item.dish.status === 'active') &&
         finalAmount.value > 0
})

// 方法
// 格式化价格
const formatPrice = (price: number): string => {
  return price.toFixed(2)
}

// 获取VIP价格
const vipPrice = (dish: any): number | null => {
  if (userStore.isVip && dish.vipPrice) {
    return dish.vipPrice
  }
  return null
}

// 是否可以增加数量
const canIncrease = (item: CartItem): boolean => {
  if (!item.dish.status || item.dish.status === 'sold_out') {
    return false
  }
  if (item.quantity >= props.maxQuantity) {
    return false
  }
  if (item.dish.stock && item.quantity >= item.dish.stock) {
    return false
  }
  return true
}

// 增加数量
const increaseQuantity = (dishId: string) => {
  const item = cartItems.value.find(item => item.dish._id === dishId)
  if (item && canIncrease(item)) {
    cartStore.updateItemQuantity(dishId, item.quantity + 1)
    emit('change', cartItems.value)
  }
}

// 减少数量
const decreaseQuantity = (dishId: string) => {
  const item = cartItems.value.find(item => item.dish._id === dishId)
  if (item) {
    if (item.quantity > 1) {
      cartStore.updateItemQuantity(dishId, item.quantity - 1)
    } else {
      cartStore.removeItem(dishId)
    }
    emit('change', cartItems.value)
  }
}

// 移除商品
const removeItem = (dishId: string) => {
  cartStore.removeItem(dishId)
  emit('change', cartItems.value)
}

// 显示清空确认
const showClearConfirm = () => {
  clearConfirmPopup.value?.open()
}

// 关闭清空确认
const closeClearConfirm = () => {
  clearConfirmPopup.value?.close()
}

// 确认清空购物车
const confirmClearCart = () => {
  cartStore.clearCart()
  selectedCoupon.value = null
  usePoints.value = false
  pointsToUse.value = 0
  closeClearConfirm()
  emit('change', cartItems.value)
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
  return subtotal.value >= coupon.minAmount
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

// 处理结算
const handleCheckout = () => {
  if (!canCheckout.value) {
    return
  }

  const checkoutData: CheckoutData = {
    items: cartItems.value,
    subtotal: subtotal.value,
    couponDiscount: couponDiscount.value,
    pointsDiscount: pointsDiscount.value,
    pointsUsed: pointsToUse.value,
    finalAmount: finalAmount.value,
    selectedCoupon: selectedCoupon.value
  }

  emit('checkout', checkoutData)
}

// 监听购物车变化
watch(cartItems, (newItems) => {
  // 如果购物车为空，重置优惠信息
  if (newItems.length === 0) {
    selectedCoupon.value = null
    usePoints.value = false
    pointsToUse.value = 0
  }
}, { deep: true })

// 监听积分使用变化
watch([usePoints, maxPointsCanUse], ([newUsePoints, newMaxPoints]) => {
  if (newUsePoints && pointsToUse.value > newMaxPoints) {
    pointsToUse.value = newMaxPoints
  }
})

// 暴露方法
defineExpose({
  clearCart: confirmClearCart,
  addCoupon: (coupon: Coupon) => {
    availableCoupons.value.push(coupon)
  }
})
</script>

<style scoped lang="scss">
.shopping-cart {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafafa;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  background: white;
  border-bottom: 2rpx solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.cart-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.item-count {
  font-size: 28rpx;
  color: #667eea;
}

.clear-cart {
  font-size: 28rpx;
  color: #999;
  padding: 12rpx;
}

.cart-content {
  flex: 1;
  overflow: hidden;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 600rpx;
  gap: 24rpx;
}

.empty-icon {
  font-size: 120rpx;
  opacity: 0.3;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
}

.empty-hint {
  font-size: 28rpx;
  color: #999;
}

.cart-items {
  padding: 0 32rpx;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
  background: white;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  
  &.unavailable {
    opacity: 0.6;
    background: #f5f5f5;
  }
}

.item-info {
  display: flex;
  gap: 24rpx;
  flex: 1;
}

.item-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.item-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
}

.item-desc {
  font-size: 24rpx;
  color: #999;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.current-price {
  font-size: 32rpx;
  font-weight: 600;
  color: #ff4444;
}

.original-price {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
}

.vip-badge {
  font-size: 20rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
}

.item-status {
  margin-top: 8rpx;
}

.status-text {
  font-size: 24rpx;
  color: #ff4444;
}

.quantity-control {
  display: flex;
  align-items: center;
  border: 2rpx solid #e0e0e0;
  border-radius: 24rpx;
  overflow: hidden;
}

.quantity-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  
  &.disabled {
    opacity: 0.3;
  }
  
  &.decrease {
    border-right: 2rpx solid #e0e0e0;
  }
  
  &.increase {
    border-left: 2rpx solid #e0e0e0;
  }
}

.btn-text {
  font-size: 32rpx;
  color: #333;
}

.quantity-text {
  min-width: 60rpx;
  text-align: center;
  font-size: 28rpx;
  color: #333;
  background: white;
}

.remove-item {
  padding: 12rpx;
}

.remove-icon {
  font-size: 32rpx;
  opacity: 0.6;
}

.discount-section {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.coupon-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.selector-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.selector-icon {
  font-size: 32rpx;
}

.selector-label {
  font-size: 30rpx;
  color: #333;
}

.selector-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.selected-coupon {
  font-size: 28rpx;
  color: #667eea;
}

.placeholder {
  font-size: 28rpx;
  color: #999;
}

.arrow {
  font-size: 24rpx;
  color: #ccc;
}

.points-section {
  padding: 32rpx;
}

.points-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.toggle-icon {
  font-size: 32rpx;
}

.toggle-label {
  font-size: 30rpx;
  color: #333;
}

.points-available {
  font-size: 24rpx;
  color: #999;
}

.points-detail {
  margin-top: 32rpx;
}

.points-slider {
  margin-bottom: 16rpx;
}

.points-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.points-text {
  font-size: 26rpx;
  color: #666;
}

.points-discount {
  font-size: 26rpx;
  color: #667eea;
}

.checkout-section {
  background: white;
  border-top: 2rpx solid #f0f0f0;
}

.price-breakdown {
  padding: 32rpx;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  
  &.discount {
    .price-value {
      color: #ff4444;
    }
  }
  
  &.total {
    padding-top: 16rpx;
    border-top: 2rpx solid #f0f0f0;
    margin-bottom: 0;
    
    .price-label {
      font-weight: 600;
      font-size: 32rpx;
    }
  }
}

.price-label {
  font-size: 28rpx;
  color: #666;
}

.price-value {
  font-size: 28rpx;
  color: #333;
}

.total-price {
  font-size: 36rpx;
  font-weight: 600;
  color: #ff4444;
}

.checkout-actions {
  padding: 32rpx;
  border-top: 2rpx solid #f0f0f0;
}

.checkout-btn {
  width: 100%;
  height: 88rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  font-size: 32rpx;
  border: none;
  
  &.disabled {
    opacity: 0.5;
  }
}

.coupon-picker {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.picker-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.coupon-list {
  max-height: 600rpx;
  overflow-y: auto;
}

.coupon-item {
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
  
  &.selected {
    background: rgba(102, 126, 234, 0.1);
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
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.coupon-desc {
  font-size: 24rpx;
  color: #999;
}

.coupon-amount {
  font-size: 28rpx;
  color: #667eea;
  font-weight: 600;
}
</style>
