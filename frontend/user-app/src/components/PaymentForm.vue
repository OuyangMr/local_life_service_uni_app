<!--
  支付组件
  @description 集成多种支付方式选择和处理，实现支付状态跟踪和错误处理
-->
<template>
  <view class="payment-form">
    <!-- 支付金额显示 -->
    <view class="amount-section">
      <view class="amount-container">
        <text class="amount-label">支付金额</text>
        <text class="amount-value">¥{{ formatPrice(paymentAmount) }}</text>
      </view>
      <view v-if="originalAmount > paymentAmount" class="discount-info">
        <text class="original-amount">原价 ¥{{ formatPrice(originalAmount) }}</text>
        <text class="saved-amount">已省 ¥{{ formatPrice(originalAmount - paymentAmount) }}</text>
      </view>
    </view>

    <!-- 支付方式选择 -->
    <view class="payment-methods">
      <text class="section-title">选择支付方式</text>
      
      <view class="methods-list">
        <!-- 微信支付 -->
        <view 
          class="payment-method"
          :class="{ 'selected': selectedMethod === 'wechatpay' }"
          @click="selectMethod('wechatpay')"
        >
          <view class="method-info">
            <view class="method-icon wechat">
              <text class="icon">💚</text>
            </view>
            <view class="method-details">
              <text class="method-name">微信支付</text>
              <text class="method-desc">推荐，安全快捷</text>
            </view>
          </view>
          <view class="method-selector">
            <view class="radio-btn" :class="{ 'checked': selectedMethod === 'wechatpay' }">
              <text v-if="selectedMethod === 'wechatpay'" class="check-icon">✓</text>
            </view>
          </view>
        </view>

        <!-- 支付宝 -->
        <view 
          class="payment-method"
          :class="{ 'selected': selectedMethod === 'alipay' }"
          @click="selectMethod('alipay')"
        >
          <view class="method-info">
            <view class="method-icon alipay">
              <text class="icon">💙</text>
            </view>
            <view class="method-details">
              <text class="method-name">支付宝</text>
              <text class="method-desc">花呗分期可用</text>
            </view>
          </view>
          <view class="method-selector">
            <view class="radio-btn" :class="{ 'checked': selectedMethod === 'alipay' }">
              <text v-if="selectedMethod === 'alipay'" class="check-icon">✓</text>
            </view>
          </view>
        </view>

        <!-- 余额支付 -->
        <view 
          v-if="userBalance >= paymentAmount"
          class="payment-method"
          :class="{ 'selected': selectedMethod === 'balance' }"
          @click="selectMethod('balance')"
        >
          <view class="method-info">
            <view class="method-icon balance">
              <text class="icon">💰</text>
            </view>
            <view class="method-details">
              <text class="method-name">余额支付</text>
              <text class="method-desc">余额：¥{{ formatPrice(userBalance) }}</text>
            </view>
          </view>
          <view class="method-selector">
            <view class="radio-btn" :class="{ 'checked': selectedMethod === 'balance' }">
              <text v-if="selectedMethod === 'balance'" class="check-icon">✓</text>
            </view>
          </view>
        </view>

        <!-- 积分支付（如果全部可用积分抵扣） -->
        <view 
          v-if="canPayWithPoints"
          class="payment-method"
          :class="{ 'selected': selectedMethod === 'points' }"
          @click="selectMethod('points')"
        >
          <view class="method-info">
            <view class="method-icon points">
              <text class="icon">💎</text>
            </view>
            <view class="method-details">
              <text class="method-name">积分支付</text>
              <text class="method-desc">需要 {{ Math.ceil(paymentAmount * 100) }} 积分</text>
            </view>
          </view>
          <view class="method-selector">
            <view class="radio-btn" :class="{ 'checked': selectedMethod === 'points' }">
              <text v-if="selectedMethod === 'points'" class="check-icon">✓</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠信息 -->
    <view v-if="promotions.length > 0" class="promotions-section">
      <text class="section-title">优惠信息</text>
      <view class="promotions-list">
        <view 
          v-for="promotion in promotions"
          :key="promotion.id"
          class="promotion-item"
        >
          <text class="promotion-icon">🎁</text>
          <text class="promotion-text">{{ promotion.description }}</text>
        </view>
      </view>
    </view>

    <!-- 支付协议 -->
    <view class="agreement-section">
      <view class="agreement-check" @click="toggleAgreement">
        <view class="checkbox" :class="{ 'checked': agreedToTerms }">
          <text v-if="agreedToTerms" class="check-icon">✓</text>
        </view>
        <text class="agreement-text">
          我已阅读并同意
          <text class="link" @click.stop="showTerms">《支付服务协议》</text>
          和
          <text class="link" @click.stop="showPrivacy">《隐私政策》</text>
        </text>
      </view>
    </view>

    <!-- 支付按钮 -->
    <view class="payment-actions">
      <button 
        class="pay-btn"
        :class="{ 
          'disabled': !canPay,
          'loading': isProcessing 
        }"
        @click="handlePay"
      >
        <view v-if="isProcessing" class="loading-spinner">
          <view class="spinner"></view>
        </view>
        <text class="btn-text">
          {{ isProcessing ? '支付中...' : `立即支付 ¥${formatPrice(paymentAmount)}` }}
        </text>
      </button>
    </view>

    <!-- 支付状态弹窗 -->
    <uni-popup 
      ref="statusPopup" 
      type="center"
      :mask-click="false"
    >
      <view class="status-modal">
        <view class="status-content">
          <!-- 支付成功 -->
          <view v-if="paymentStatus === 'success'" class="status-success">
            <view class="status-icon success">✅</view>
            <text class="status-title">支付成功</text>
            <text class="status-message">感谢您的购买</text>
            <text class="order-info">订单号：{{ orderNumber }}</text>
          </view>

          <!-- 支付失败 -->
          <view v-else-if="paymentStatus === 'failed'" class="status-failed">
            <view class="status-icon failed">❌</view>
            <text class="status-title">支付失败</text>
            <text class="status-message">{{ errorMessage }}</text>
          </view>

          <!-- 支付处理中 -->
          <view v-else-if="paymentStatus === 'processing'" class="status-processing">
            <view class="status-icon processing">
              <view class="processing-spinner"></view>
            </view>
            <text class="status-title">支付处理中</text>
            <text class="status-message">请稍候，正在确认支付结果</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="status-actions">
          <button 
            v-if="paymentStatus === 'success'"
            class="btn-primary"
            @click="handleSuccess"
          >
            确定
          </button>
          
          <template v-else-if="paymentStatus === 'failed'">
            <button class="btn-secondary" @click="closeStatus">取消</button>
            <button class="btn-primary" @click="retryPayment">重试</button>
          </template>
          
          <button 
            v-else-if="paymentStatus === 'processing'"
            class="btn-secondary"
            @click="checkPaymentStatus"
          >
            查询状态
          </button>
        </view>
      </view>
    </uni-popup>

    <!-- 协议内容弹窗 -->
    <uni-popup 
      ref="termsPopup" 
      type="bottom"
    >
      <view class="terms-modal">
        <view class="terms-header">
          <text class="terms-title">{{ termsTitle }}</text>
          <text class="terms-close" @click="closeTerms">✕</text>
        </view>
        <view class="terms-content">
          <text class="terms-text">{{ termsContent }}</text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import * as PaymentService from '@/services/payment'

// 支付方式类型
type PaymentMethod = 'wechatpay' | 'alipay' | 'balance' | 'points'

// 支付状态类型
type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed'

// Props
interface Props {
  /** 支付金额 */
  amount: number
  /** 原始金额（用于显示优惠） */
  originalAmount?: number
  /** 订单ID */
  orderId?: string
  /** 默认支付方式 */
  defaultMethod?: PaymentMethod
  /** 是否自动弹起支付 */
  autoTrigger?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  originalAmount: 0,
  defaultMethod: 'wechatpay',
  autoTrigger: false
})

// Emits
interface Emits {
  /** 支付成功 */
  (e: 'success', result: PaymentResult): void
  /** 支付失败 */
  (e: 'failed', error: string): void
  /** 支付取消 */
  (e: 'cancel'): void
  /** 支付方式变化 */
  (e: 'method-change', method: PaymentMethod): void
}

const emit = defineEmits<Emits>()

// 支付结果类型
interface PaymentResult {
  orderId: string
  transactionId: string
  amount: number
  method: PaymentMethod
  timestamp: string
}

// 优惠信息类型
interface Promotion {
  id: string
  description: string
  discount: number
}

// Store
const userStore = useUserStore()

// 状态管理
const selectedMethod = ref<PaymentMethod>(props.defaultMethod)
const agreedToTerms = ref(false)
const isProcessing = ref(false)
const paymentStatus = ref<PaymentStatus>('idle')
const errorMessage = ref('')
const orderNumber = ref('')
const termsTitle = ref('')
const termsContent = ref('')

// 模拟优惠信息
const promotions = ref<Promotion[]>([
  { id: '1', description: '首次使用立减5元', discount: 5 }
])

// Refs
const statusPopup = ref()
const termsPopup = ref()

// 计算属性
const paymentAmount = computed(() => props.originalAmount || props.amount)
const originalAmount = computed(() => props.originalAmount || props.amount)
const userBalance = computed(() => userStore.userInfo?.balance || 0)
const userPoints = computed(() => userStore.userInfo?.points || 0)

// 是否可以积分全额支付
const canPayWithPoints = computed(() => {
  const requiredPoints = Math.ceil(paymentAmount.value * 100)
  return userPoints.value >= requiredPoints
})

// 是否可以支付
const canPay = computed(() => {
  return agreedToTerms.value && 
         !isProcessing.value && 
         paymentAmount.value > 0 &&
         selectedMethod.value
})

// 方法
// 格式化价格
const formatPrice = (price: number): string => {
  return price.toFixed(2)
}

// 选择支付方式
const selectMethod = (method: PaymentMethod) => {
  if (isProcessing.value) return
  
  // 检查支付方式可用性
  if (method === 'balance' && userBalance.value < paymentAmount.value) {
    uni.showToast({
      title: '余额不足',
      icon: 'none'
    })
    return
  }
  
  if (method === 'points' && !canPayWithPoints.value) {
    uni.showToast({
      title: '积分不足',
      icon: 'none'
    })
    return
  }
  
  selectedMethod.value = method
  emit('method-change', method)
}

// 切换协议同意状态
const toggleAgreement = () => {
  agreedToTerms.value = !agreedToTerms.value
}

// 显示服务协议
const showTerms = () => {
  termsTitle.value = '支付服务协议'
  termsContent.value = '这是支付服务协议的内容...'
  termsPopup.value?.open()
}

// 显示隐私政策
const showPrivacy = () => {
  termsTitle.value = '隐私政策'
  termsContent.value = '这是隐私政策的内容...'
  termsPopup.value?.open()
}

// 关闭协议弹窗
const closeTerms = () => {
  termsPopup.value?.close()
}

// 处理支付
const handlePay = async () => {
  if (!canPay.value) {
    if (!agreedToTerms.value) {
      uni.showToast({
        title: '请先同意支付协议',
        icon: 'none'
      })
    }
    return
  }

  try {
    isProcessing.value = true
    paymentStatus.value = 'processing'
    showStatus()

    // 根据支付方式调用不同的支付接口
    let paymentResult: PaymentResult

    switch (selectedMethod.value) {
      case 'wechatpay':
        paymentResult = await processWechatPay()
        break
      case 'alipay':
        paymentResult = await processAliPay()
        break
      case 'balance':
        paymentResult = await processBalancePay()
        break
      case 'points':
        paymentResult = await processPointsPay()
        break
      default:
        throw new Error('不支持的支付方式')
    }

    // 支付成功
    paymentStatus.value = 'success'
    orderNumber.value = paymentResult.orderId
    emit('success', paymentResult)

  } catch (error: any) {
    // 支付失败
    paymentStatus.value = 'failed'
    errorMessage.value = error.message || '支付失败，请重试'
    emit('failed', errorMessage.value)
  } finally {
    isProcessing.value = false
  }
}

// 微信支付处理
const processWechatPay = async (): Promise<PaymentResult> => {
  // 调用微信支付API
  const response = await PaymentService.createPayment(props.orderId || '', {
    orderId: props.orderId || '',
    paymentMethod: 'wechatpay',
    amount: paymentAmount.value
  })

  // 调起微信支付
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      timeStamp: response.data.timeStamp,
      nonceStr: response.data.nonceStr,
      package: response.data.package,
      signType: response.data.signType,
      paySign: response.data.paySign,
      success: () => {
        resolve({
          orderId: props.orderId || '',
          transactionId: response.data.transactionId,
          amount: paymentAmount.value,
          method: 'wechatpay',
          timestamp: new Date().toISOString()
        })
      },
      fail: (error) => {
        if (error.errMsg.includes('cancel')) {
          emit('cancel')
          reject(new Error('用户取消支付'))
        } else {
          reject(new Error('微信支付失败'))
        }
      }
    })
  })
}

// 支付宝支付处理
const processAliPay = async (): Promise<PaymentResult> => {
  const response = await PaymentService.createPayment(props.orderId || '', {
    orderId: props.orderId || '',
    paymentMethod: 'alipay',
    amount: paymentAmount.value
  })

  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'alipay',
      orderInfo: response.data.orderInfo,
      success: () => {
        resolve({
          orderId: props.orderId || '',
          transactionId: response.data.transactionId,
          amount: paymentAmount.value,
          method: 'alipay',
          timestamp: new Date().toISOString()
        })
      },
      fail: (error) => {
        if (error.errMsg.includes('cancel')) {
          emit('cancel')
          reject(new Error('用户取消支付'))
        } else {
          reject(new Error('支付宝支付失败'))
        }
      }
    })
  })
}

// 余额支付处理
const processBalancePay = async (): Promise<PaymentResult> => {
  const response = await PaymentService.createPayment(props.orderId || '', {
    orderId: props.orderId || '',
    paymentMethod: 'balance',
    amount: paymentAmount.value
  })

  // 模拟支付处理延迟
  await new Promise(resolve => setTimeout(resolve, 1000))

  return {
    orderId: props.orderId || '',
    transactionId: response.data.transactionId,
    amount: paymentAmount.value,
    method: 'balance',
    timestamp: new Date().toISOString()
  }
}

// 积分支付处理
const processPointsPay = async (): Promise<PaymentResult> => {
  const response = await PaymentService.createPayment(props.orderId || '', {
    orderId: props.orderId || '',
    paymentMethod: 'points',
    amount: paymentAmount.value
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  return {
    orderId: props.orderId || '',
    transactionId: response.data.transactionId,
    amount: paymentAmount.value,
    method: 'points',
    timestamp: new Date().toISOString()
  }
}

// 显示支付状态弹窗
const showStatus = () => {
  statusPopup.value?.open()
}

// 关闭状态弹窗
const closeStatus = () => {
  statusPopup.value?.close()
  paymentStatus.value = 'idle'
}

// 处理支付成功
const handleSuccess = () => {
  closeStatus()
}

// 重试支付
const retryPayment = () => {
  closeStatus()
  setTimeout(() => {
    handlePay()
  }, 300)
}

// 查询支付状态
const checkPaymentStatus = async () => {
  try {
    const response = await PaymentService.queryPaymentStatus(props.orderId || '')
    
    if (response.data.status === 'paid') {
      paymentStatus.value = 'success'
      orderNumber.value = response.data.orderId
      emit('success', {
        orderId: response.data.orderId,
        transactionId: response.data.transactionId,
        amount: paymentAmount.value,
        method: selectedMethod.value,
        timestamp: new Date().toISOString()
      })
    } else if (response.data.status === 'failed') {
      paymentStatus.value = 'failed'
      errorMessage.value = '支付失败'
      emit('failed', errorMessage.value)
    }
  } catch (error) {
    console.error('查询支付状态失败:', error)
  }
}

// 监听自动触发
watch(() => props.autoTrigger, (newValue) => {
  if (newValue && canPay.value) {
    handlePay()
  }
})

// 暴露方法
defineExpose({
  pay: handlePay,
  retry: retryPayment,
  cancel: () => {
    closeStatus()
    emit('cancel')
  }
})
</script>

<style scoped lang="scss">
.payment-form {
  background: #fafafa;
  min-height: 100vh;
}

.amount-section {
  background: white;
  padding: 48rpx 32rpx;
  margin-bottom: 16rpx;
  text-align: center;
}

.amount-container {
  margin-bottom: 16rpx;
}

.amount-label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.amount-value {
  font-size: 56rpx;
  font-weight: 600;
  color: #ff4444;
}

.discount-info {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  align-items: center;
}

.original-amount {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
}

.saved-amount {
  font-size: 24rpx;
  color: #00aa00;
}

.payment-methods {
  background: white;
  padding: 32rpx;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
  display: block;
}

.methods-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.payment-method {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 16rpx;
  transition: all 0.3s ease;
  
  &.selected {
    border-color: #667eea;
    background: rgba(102, 126, 234, 0.05);
  }
}

.method-info {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.method-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.wechat {
    background: #07c160;
  }
  
  &.alipay {
    background: #1677ff;
  }
  
  &.balance {
    background: #fa8c16;
  }
  
  &.points {
    background: #722ed1;
  }
  
  .icon {
    font-size: 32rpx;
    color: white;
  }
}

.method-details {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.method-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.method-desc {
  font-size: 24rpx;
  color: #999;
}

.method-selector {
  padding: 8rpx;
}

.radio-btn {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &.checked {
    border-color: #667eea;
    background: #667eea;
  }
}

.check-icon {
  font-size: 24rpx;
  color: white;
}

.promotions-section {
  background: white;
  padding: 32rpx;
  margin-bottom: 16rpx;
}

.promotions-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.promotion-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 12rpx;
}

.promotion-icon {
  font-size: 24rpx;
}

.promotion-text {
  font-size: 26rpx;
  color: #667eea;
}

.agreement-section {
  background: white;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

.agreement-check {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid #ccc;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4rpx;
  flex-shrink: 0;
  
  &.checked {
    border-color: #667eea;
    background: #667eea;
  }
  
  .check-icon {
    font-size: 20rpx;
    color: white;
  }
}

.agreement-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
}

.link {
  color: #667eea;
  text-decoration: underline;
}

.payment-actions {
  padding: 32rpx;
}

.pay-btn {
  width: 100%;
  height: 88rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  font-size: 32rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  
  &.disabled {
    opacity: 0.5;
  }
  
  &.loading {
    background: #999;
  }
}

.loading-spinner {
  width: 32rpx;
  height: 32rpx;
}

.spinner {
  width: 100%;
  height: 100%;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top: 4rpx solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-modal {
  width: 600rpx;
  background: white;
  border-radius: 24rpx;
  overflow: hidden;
}

.status-content {
  padding: 48rpx 32rpx;
  text-align: center;
}

.status-success,
.status-failed,
.status-processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.status-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
  
  &.success {
    background: rgba(0, 170, 0, 0.1);
  }
  
  &.failed {
    background: rgba(255, 68, 68, 0.1);
  }
  
  &.processing {
    background: rgba(102, 126, 234, 0.1);
  }
}

.processing-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid rgba(102, 126, 234, 0.3);
  border-top: 6rpx solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.status-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.status-message {
  font-size: 28rpx;
  color: #666;
}

.order-info {
  font-size: 24rpx;
  color: #999;
}

.status-actions {
  display: flex;
  gap: 16rpx;
  padding: 32rpx;
  border-top: 2rpx solid #f0f0f0;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  height: 72rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.terms-modal {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.terms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.terms-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.terms-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.terms-content {
  padding: 32rpx;
  max-height: 600rpx;
  overflow-y: auto;
}

.terms-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}
</style>
