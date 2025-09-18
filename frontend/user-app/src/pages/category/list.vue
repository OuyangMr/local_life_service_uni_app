<template>
  <view class="category-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <text class="search-icon">🔍</text>
        <input v-model="searchKeyword" type="text" placeholder="搜索分类" @input="onSearchInput" />
      </view>
    </view>

    <!-- 分类列表 -->
    <scroll-view class="category-list" scroll-y>
      <view
        v-for="category in filteredCategories"
        :key="category.id"
        class="category-item"
        @click="selectCategory(category)"
      >
        <view class="category-icon">{{ category.icon }}</view>
        <view class="category-info">
          <text class="category-name">{{ category.name }}</text>
          <text class="category-desc">{{ category.description }}</text>
        </view>
        <view class="category-count">{{ category.storeCount }}家</view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 数据
const searchKeyword = ref('');

const categories = ref([
  { id: 1, name: 'KTV', icon: '🎤', description: '唱歌娱乐', storeCount: 25 },
  { id: 2, name: '餐饮', icon: '🍽️', description: '美食餐厅', storeCount: 128 },
  { id: 3, name: '美容美发', icon: '💇', description: '造型护理', storeCount: 45 },
  { id: 4, name: '健身', icon: '🏋️', description: '运动健身', storeCount: 32 },
  { id: 5, name: '休闲娱乐', icon: '🎮', description: '娱乐休闲', storeCount: 18 },
  { id: 6, name: '教育培训', icon: '📚', description: '学习教育', storeCount: 67 },
]);

// 计算属性
const filteredCategories = computed(() => {
  if (!searchKeyword.value) {
    return categories.value;
  }
  return categories.value.filter(
    (category) =>
      category.name.includes(searchKeyword.value) ||
      category.description.includes(searchKeyword.value)
  );
});

// 方法
const onSearchInput = () => {
  // 搜索输入处理
};

const selectCategory = (category: any) => {
  // 跳转到店铺列表页，带上分类参数
  uni.navigateTo({
    url: `/pages/store/list?categoryId=${category.id}&categoryName=${category.name}`,
  });
};
</script>

<style lang="scss" scoped>
.category-page {
  height: 100vh;
  background-color: #f8f9fa;
}

.search-bar {
  padding: 20rpx;
  background-color: white;
  border-bottom: 1px solid #e9ecef;
}

.search-input {
  display: flex;
  align-items: center;
  background-color: #f8f9fa;
  border-radius: 25rpx;
  padding: 20rpx 30rpx;
}

.search-icon {
  margin-right: 20rpx;
  font-size: 32rpx;
  color: #6c757d;
}

input {
  flex: 1;
  font-size: 32rpx;
  color: #333;
}

.category-list {
  height: calc(100vh - 120rpx);
  padding: 20rpx;
}

.category-item {
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.category-icon {
  font-size: 60rpx;
  margin-right: 30rpx;
}

.category-info {
  flex: 1;
}

.category-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.category-desc {
  font-size: 28rpx;
  color: #6c757d;
  margin-top: 10rpx;
  display: block;
}

.category-count {
  font-size: 28rpx;
  color: #667eea;
  font-weight: 500;
}
</style>
