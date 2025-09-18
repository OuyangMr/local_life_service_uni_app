<template>
  <view class="login-container">
    <!-- 背景装饰 -->
    <view class="bg-decoration">
      <view class="wave wave-1"></view>
      <view class="wave wave-2"></view>
      <view class="wave wave-3"></view>
    </view>
    
    <!-- 顶部Logo区域 -->
    <view class="header-section">
      <view class="logo-container">
        <view class="logo-icon">🏪</view>
        <text class="logo-title">商户管理中心</text>
        <text class="logo-subtitle">专业的本地生活服务管理平台</text>
      </view>
    </view>
    
    <!-- 登录表单 -->
    <view class="login-form-section">
      <view class="form-container">
        <view class="form-header">
          <text class="form-title">商户登录</text>
          <text class="form-subtitle">登录您的商户管理账户</text>
        </view>
        
        <view class="form-content">
          <!-- 账号输入 -->
          <view class="input-group">
            <view class="input-label">
              <text class="label-icon">👤</text>
              <text class="label-text">商户账号</text>
            </view>
            <view class="input-container" :class="{ 'error': formErrors.account, 'focus': focusedField === 'account' }">
              <input
                v-model="loginForm.account"
                class="form-input"
                type="text"
                placeholder="请输入商户账号"
                @focus="handleFocus('account')"
                @blur="handleBlur('account')"
                @input="clearError('account')"
              />
              <view class="input-icon">
                <text class="icon">📱</text>
              </view>
            </view>
            <text v-if="formErrors.account" class="error-message">{{ formErrors.account }}</text>
          </view>
          
          <!-- 密码输入 -->
          <view class="input-group">
            <view class="input-label">
              <text class="label-icon">🔒</text>
              <text class="label-text">登录密码</text>
            </view>
            <view class="input-container" :class="{ 'error': formErrors.password, 'focus': focusedField === 'password' }">
              <input
                v-model="loginForm.password"
                class="form-input"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入登录密码"
                @focus="handleFocus('password')"
                @blur="handleBlur('password')"
                @input="clearError('password')"
              />
              <view class="input-action" @click="togglePassword">
                <text class="icon">{{ showPassword ? '🙈' : '👁️' }}</text>
              </view>
            </view>
            <text v-if="formErrors.password" class="error-message">{{ formErrors.password }}</text>
          </view>
          
          <!-- 记住密码和忘记密码 -->
          <view class="form-options">
            <view class="remember-section" @click="toggleRemember">
              <view class="checkbox" :class="{ 'checked': loginForm.rememberMe }">
                <text v-if="loginForm.rememberMe" class="check-icon">✓</text>
              </view>
              <text class="remember-text">记住账号</text>
            </view>
            <text class="forgot-password" @click="handleForgotPassword">忘记密码？</text>
          </view>
          
          <!-- 登录按钮 -->
          <button
            class="login-button"
            :class="{ 'loading': isLoading, 'disabled': !canSubmit }"
            :disabled="!canSubmit || isLoading"
            @click="handleLogin"
          >
            <text v-if="isLoading" class="loading-icon">⏳</text>
            <text class="button-text">{{ isLoading ? '登录中...' : '立即登录' }}</text>
          </button>
          
          <!-- 其他登录方式 -->
          <view class="other-login">
            <view class="divider">
              <view class="line"></view>
              <text class="divider-text">其他登录方式</text>
              <view class="line"></view>
            </view>
            <view class="social-login">
              <view class="social-item" @click="handleWeChatLogin">
                <text class="social-icon">💬</text>
                <text class="social-text">微信登录</text>
              </view>
              <view class="social-item" @click="handleSmsLogin">
                <text class="social-icon">📱</text>
                <text class="social-text">短信登录</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 底部信息 -->
    <view class="footer-section">
      <text class="footer-text">© 2024 本地生活服务平台</text>
      <view class="footer-links">
        <text class="footer-link" @click="handleServiceAgreement">服务协议</text>
        <text class="footer-divider">|</text>
        <text class="footer-link" @click="handlePrivacyPolicy">隐私政策</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { LoginForm } from '@/types'

// 使用store
const authStore = useAuthStore()

// 响应式数据
const loginForm = ref<LoginForm>({
  account: '',
  password: '',
  rememberMe: false
})

const formErrors = ref<Record<string, string>>({})
const focusedField = ref<string>('')
const showPassword = ref(false)
const isLoading = ref(false)

// 计算属性
const canSubmit = computed(() => {
  return loginForm.value.account.length > 0 && 
         loginForm.value.password.length > 0 &&
         Object.keys(formErrors.value).length === 0
})

// 方法
const handleFocus = (field: string) => {
  focusedField.value = field
}

const handleBlur = (field: string) => {
  focusedField.value = ''
  validateField(field)
}

const clearError = (field: string) => {
  if (formErrors.value[field]) {
    delete formErrors.value[field]
  }
}

const validateField = (field: string) => {
  const value = loginForm.value[field as keyof LoginForm]
  
  switch (field) {
    case 'account':
      if (!value) {
        formErrors.value.account = '请输入商户账号'
      } else if (typeof value === 'string' && value.length < 3) {
        formErrors.value.account = '账号长度不能少于3位'
      } else {
        delete formErrors.value.account
      }
      break
      
    case 'password':
      if (!value) {
        formErrors.value.password = '请输入登录密码'
      } else if (typeof value === 'string' && value.length < 6) {
        formErrors.value.password = '密码长度不能少于6位'
      } else {
        delete formErrors.value.password
      }
      break
  }
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const toggleRemember = () => {
  loginForm.value.rememberMe = !loginForm.value.rememberMe
}

const handleLogin = async () => {
  // 验证所有字段
  validateField('account')
  validateField('password')
  
  if (Object.keys(formErrors.value).length > 0) {
    uni.showToast({
      title: '请检查输入信息',
      icon: 'none'
    })
    return
  }
  
  isLoading.value = true
  
  try {
    const result = await authStore.login(loginForm.value)
    
    if (result.success) {
      uni.showToast({
        title: '登录成功',
        icon: 'success'
      })
      
      // 跳转到管理中心
      setTimeout(() => {
        uni.reLaunch({
          url: '/pages/dashboard/index'
        })
      }, 1000)
    } else {
      uni.showToast({
        title: result.message || '登录失败',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('登录错误:', error)
    uni.showToast({
      title: '登录失败，请稍后重试',
      icon: 'none'
    })
  } finally {
    isLoading.value = false
  }
}

const handleForgotPassword = () => {
  uni.showModal({
    title: '忘记密码',
    content: '请联系平台客服：400-123-4567',
    showCancel: false,
    confirmText: '知道了'
  })
}

const handleWeChatLogin = () => {
  uni.showToast({
    title: '微信登录功能开发中',
    icon: 'none'
  })
}

const handleSmsLogin = () => {
  uni.showToast({
    title: '短信登录功能开发中',
    icon: 'none'
  })
}

const handleServiceAgreement = () => {
  uni.showModal({
    title: '服务协议',
    content: '服务协议内容...',
    showCancel: false
  })
}

const handlePrivacyPolicy = () => {
  uni.showModal({
    title: '隐私政策',
    content: '隐私政策内容...',
    showCancel: false
  })
}

// 生命周期
onMounted(() => {
  // 获取记住的账号
  const rememberedAccount = authStore.getRememberedAccount()
  if (rememberedAccount) {
    loginForm.value.account = rememberedAccount
    loginForm.value.rememberMe = true
  }
})
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  
  .wave {
    position: absolute;
    width: 200%;
    height: 200rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    
    &.wave-1 {
      top: -100rpx;
      left: -50%;
      animation: wave 8s infinite linear;
    }
    
    &.wave-2 {
      top: 200rpx;
      right: -50%;
      animation: wave 12s infinite linear reverse;
    }
    
    &.wave-3 {
      bottom: -100rpx;
      left: -30%;
      animation: wave 10s infinite linear;
    }
  }
}

@keyframes wave {
  0% { transform: translateX(-50%) rotate(0deg); }
  100% { transform: translateX(-50%) rotate(360deg); }
}

.header-section {
  padding: 120rpx 40rpx 80rpx;
  text-align: center;
  
  .logo-container {
    .logo-icon {
      font-size: 120rpx;
      margin-bottom: 20rpx;
      display: block;
    }
    
    .logo-title {
      display: block;
      font-size: 48rpx;
      font-weight: bold;
      color: white;
      margin-bottom: 16rpx;
    }
    
    .logo-subtitle {
      display: block;
      font-size: 28rpx;
      color: rgba(255, 255, 255, 0.8);
    }
  }
}

.login-form-section {
  flex: 1;
  padding: 0 40rpx;
  
  .form-container {
    background: white;
    border-radius: 32rpx;
    padding: 60rpx 40rpx;
    box-shadow: 0 20rpx 40rpx rgba(0, 0, 0, 0.1);
  }
  
  .form-header {
    text-align: center;
    margin-bottom: 60rpx;
    
    .form-title {
      display: block;
      font-size: 40rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 16rpx;
    }
    
    .form-subtitle {
      display: block;
      font-size: 28rpx;
      color: #666;
    }
  }
}

.input-group {
  margin-bottom: 40rpx;
  
  .input-label {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    
    .label-icon {
      font-size: 32rpx;
      margin-right: 16rpx;
    }
    
    .label-text {
      font-size: 28rpx;
      color: #333;
      font-weight: 500;
    }
  }
  
  .input-container {
    position: relative;
    background: #f8f9fa;
    border: 2rpx solid #e9ecef;
    border-radius: 16rpx;
    transition: all 0.3s ease;
    
    &.focus {
      border-color: #667eea;
      background: #fff;
      box-shadow: 0 0 0 6rpx rgba(102, 126, 234, 0.1);
    }
    
    &.error {
      border-color: #f56c6c;
      background: #fff5f5;
    }
  }
  
  .form-input {
    width: 100%;
    padding: 24rpx 80rpx 24rpx 24rpx;
    font-size: 32rpx;
    color: #333;
    background: transparent;
    border: none;
    outline: none;
    
    &::placeholder {
      color: #aaa;
    }
  }
  
  .input-icon,
  .input-action {
    position: absolute;
    right: 24rpx;
    top: 50%;
    transform: translateY(-50%);
    font-size: 32rpx;
    color: #999;
  }
  
  .input-action {
    cursor: pointer;
    
    &:active {
      opacity: 0.7;
    }
  }
  
  .error-message {
    display: block;
    margin-top: 12rpx;
    font-size: 24rpx;
    color: #f56c6c;
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 50rpx;
  
  .remember-section {
    display: flex;
    align-items: center;
    cursor: pointer;
    
    .checkbox {
      width: 32rpx;
      height: 32rpx;
      border: 2rpx solid #ddd;
      border-radius: 6rpx;
      margin-right: 16rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      
      &.checked {
        background: #667eea;
        border-color: #667eea;
        
        .check-icon {
          color: white;
          font-size: 20rpx;
          font-weight: bold;
        }
      }
    }
    
    .remember-text {
      font-size: 28rpx;
      color: #666;
    }
  }
  
  .forgot-password {
    font-size: 28rpx;
    color: #667eea;
    cursor: pointer;
    
    &:active {
      opacity: 0.7;
    }
  }
}

.login-button {
  width: 100%;
  padding: 28rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 16rpx;
  color: white;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 40rpx;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active:not(.disabled) {
    transform: translateY(2rpx);
    box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.3);
  }
  
  &.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .loading-icon {
    margin-right: 16rpx;
    animation: spin 1s infinite linear;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.other-login {
  .divider {
    display: flex;
    align-items: center;
    margin: 40rpx 0;
    
    .line {
      flex: 1;
      height: 2rpx;
      background: #eee;
    }
    
    .divider-text {
      margin: 0 30rpx;
      font-size: 24rpx;
      color: #999;
    }
  }
  
  .social-login {
    display: flex;
    justify-content: space-around;
    
    .social-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20rpx;
      cursor: pointer;
      
      .social-icon {
        font-size: 48rpx;
        margin-bottom: 12rpx;
      }
      
      .social-text {
        font-size: 24rpx;
        color: #666;
      }
      
      &:active {
        opacity: 0.7;
      }
    }
  }
}

.footer-section {
  padding: 40rpx;
  text-align: center;
  
  .footer-text {
    display: block;
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 20rpx;
  }
  
  .footer-links {
    display: flex;
    justify-content: center;
    align-items: center;
    
    .footer-link {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      
      &:active {
        opacity: 0.7;
      }
    }
    
    .footer-divider {
      margin: 0 20rpx;
      color: rgba(255, 255, 255, 0.4);
    }
  }
}
</style>
