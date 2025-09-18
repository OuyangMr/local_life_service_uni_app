<template>
  <view class="webview-page">
    <web-view v-if="url" :src="url" @message="onMessage"></web-view>
    <view v-else class="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const url = ref('')

const onMessage = (event: any) => {
  console.log('WebView message:', event)
}

onMounted(() => {
  // 从页面参数获取URL
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  url.value = (currentPage as any).options.url || ''
})
</script>

<style lang="scss" scoped>
.webview-page {
  height: 100vh;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  color: #999;
}
</style>
