<template>
  <view class="category-page">
    <view class="category-header">
      <text class="category-title">分类浏览</text>
    </view>
    
    <view class="category-content">
      <view class="category-list">
        <view 
          v-for="category in categories" 
          :key="category.id"
          class="category-item"
          @tap="onCategoryTap(category)"
        >
          <image :src="category.icon" class="category-icon" />
          <text class="category-name">{{ category.name }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Category } from '@/types'

const categories = ref<Category[]>([])

const loadCategories = async () => {
  try {
    // TODO: 实现分类数据加载
    categories.value = [
      { id: '1', name: '餐饮', icon: '/static/category_food.png' },
      { id: '2', name: '娱乐', icon: '/static/category_entertainment.png' },
      { id: '3', name: '生活服务', icon: '/static/category_service.png' },
    ]
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

const onCategoryTap = (category: Category) => {
  uni.navigateTo({
    url: `/pages/store/list?categoryId=${category.id}`
  })
}

onMounted(() => {
  loadCategories()
})
</script>

<style lang="scss" scoped>
.category-page {
  padding: 20rpx;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.category-header {
  margin-bottom: 30rpx;
  
  .category-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }
}

.category-content {
  .category-list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20rpx;
  }
  
  .category-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 30rpx 20rpx;
    background: white;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
    
    .category-icon {
      width: 60rpx;
      height: 60rpx;
      margin-bottom: 16rpx;
    }
    
    .category-name {
      font-size: 26rpx;
      color: #333;
      text-align: center;
    }
  }
}
</style>
