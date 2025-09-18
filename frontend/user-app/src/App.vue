<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

onLaunch(() => {
  console.log('App Launch')
  // 应用启动时加载用户信息
  userStore.loadUserFromStorage()
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
@import 'uni.scss';

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// 全局样式
page {
  background-color: #f5f5f5;
  height: 100%;
}

.container {
  padding: 20rpx;
  min-height: 100vh;
}

// 通用按钮样式
.btn {
  padding: 24rpx 40rpx;
  border-radius: 12rpx;
  font-size: 32rpx;
  text-align: center;
  transition: all 0.3s ease;
  
  &.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    
    &:active {
      transform: scale(0.98);
    }
  }
  
  &.btn-secondary {
    background: #f8f9fa;
    color: #6c757d;
    border: 2rpx solid #dee2e6;
    
    &:active {
      background: #e9ecef;
    }
  }
}

// 卡片样式
.card {
  background: white;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 20rpx;
}

// 输入框样式
.input {
  padding: 24rpx 30rpx;
  border: 2rpx solid #e9ecef;
  border-radius: 12rpx;
  font-size: 32rpx;
  background: white;
  
  &:focus {
    border-color: #667eea;
    outline: none;
  }
}

// 加载动画
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200rpx;
  
  &::after {
    content: '';
    width: 40rpx;
    height: 40rpx;
    border: 4rpx solid #f3f3f3;
    border-top: 4rpx solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

