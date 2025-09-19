<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">内容管理</h1>
    </div>
    <div class="placeholder-content">
      <el-empty description="内容管理功能开发中..." />
    </div>
  </div>
</template>

<script setup lang="ts">
// 内容管理页面
</script>

<style lang="scss" scoped>
.page-container {
  .page-header {
    margin-bottom: $spacing-lg;
    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }
  .placeholder-content {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 400px;
    background: var(--el-bg-color);
    border-radius: $radius-lg;
  }
}
</style>