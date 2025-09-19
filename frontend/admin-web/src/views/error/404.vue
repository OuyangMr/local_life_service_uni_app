<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-icon">404</div>
      <h2 class="error-title">页面不存在</h2>
      <p class="error-desc">抱歉，您访问的页面不存在或已被删除</p>
      <el-button type="primary" @click="router.push('/')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
}

.error-content {
  text-align: center;
  padding: 40px;

  .error-icon {
    font-size: 120px;
    font-weight: bold;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 24px;
  }

  .error-title {
    font-size: 24px;
    color: var(--el-text-color-primary);
    margin-bottom: 16px;
  }

  .error-desc {
    font-size: 16px;
    color: var(--el-text-color-regular);
    margin-bottom: 32px;
  }
}
</style>