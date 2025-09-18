<template>
  <view id="app">
    <router-view />
  </view>
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('商户端应用启动')
})

onShow(() => {
  console.log('商户端应用显示')
})

onHide(() => {
  console.log('商户端应用隐藏')
})
</script>

<style lang="scss">
/*每个页面公共css */
@import '@/styles/common.scss';
</style>