<template>
  <view class="order-detail-page">
    <view class="loading" v-if="loading">
      <text>加载中...</text>
    </view>
    <view v-else class="order-content">
      <text class="page-title">订单详情</text>
      <!-- TODO: 添加订单详情内容 -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 1000)
})
</script>

<style lang="scss" scoped>
.order-detail-page {
  padding: 20rpx;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.loading {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}

.page-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
</style>
