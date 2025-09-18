<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <text class="search-icon">🔍</text>
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索店铺、商品"
          @input="onSearchInput"
          @confirm="onSearch"
          focus
        />
      </view>
      <text class="search-btn" @click="onSearch">搜索</text>
    </view>

    <!-- 搜索历史 -->
    <view v-if="!searchKeyword && searchHistory.length > 0" class="search-history">
      <view class="history-header">
        <text class="history-title">搜索历史</text>
        <text class="clear-btn" @click="clearHistory">清空</text>
      </view>
      <view class="history-tags">
        <text
          v-for="(item, index) in searchHistory"
          :key="index"
          class="history-tag"
          @click="selectHistory(item)"
        >
          {{ item }}
        </text>
      </view>
    </view>

    <!-- 热门搜索 -->
    <view v-if="!searchKeyword" class="hot-search">
      <view class="hot-header">
        <text class="hot-title">热门搜索</text>
      </view>
      <view class="hot-tags">
        <text
          v-for="(item, index) in hotSearches"
          :key="index"
          class="hot-tag"
          @click="selectHotSearch(item)"
        >
          {{ item }}
        </text>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="searchKeyword" class="search-results">
      <view v-if="isLoading" class="loading">
        <text>搜索中...</text>
      </view>

      <view v-else-if="searchResults.length === 0" class="no-result">
        <text class="no-result-icon">🔍</text>
        <text class="no-result-text">未找到相关结果</text>
        <text class="no-result-tip">试试其他关键词</text>
      </view>

      <view v-else class="result-list">
        <view
          v-for="item in searchResults"
          :key="item.id"
          class="result-item"
          @click="goToDetail(item)"
        >
          <image :src="item.image" class="result-image" mode="aspectFill" />
          <view class="result-info">
            <text class="result-name">{{ item.name }}</text>
            <text class="result-desc">{{ item.description }}</text>
            <view class="result-meta">
              <text class="result-rating">⭐ {{ item.rating }}</text>
              <text class="result-distance">{{ item.distance }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

// 数据
const searchKeyword = ref('');
const isLoading = ref(false);
const searchResults = ref<any[]>([]);

const searchHistory = ref(['KTV', '火锅', '美发', '健身房']);

const hotSearches = ref(['KTV包厢', '海底捞', '美甲', '瑜伽', '烧烤', '咖啡厅', '电影院', '温泉']);

// 方法
const onSearchInput = () => {
  if (!searchKeyword.value) {
    searchResults.value = [];
    return;
  }

  // 防抖搜索
  setTimeout(() => {
    performSearch();
  }, 300);
};

const onSearch = () => {
  if (!searchKeyword.value.trim()) return;

  addToHistory(searchKeyword.value);
  performSearch();
};

const performSearch = async () => {
  if (!searchKeyword.value.trim()) return;

  isLoading.value = true;

  try {
    // 模拟搜索API调用
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 模拟搜索结果
    searchResults.value = [
      {
        id: 1,
        name: `${searchKeyword.value}相关店铺1`,
        description: '这是一个很棒的店铺，提供优质服务',
        rating: 4.8,
        distance: '1.2km',
        image: 'https://via.placeholder.com/120x120',
      },
      {
        id: 2,
        name: `${searchKeyword.value}相关店铺2`,
        description: '环境优雅，服务周到',
        rating: 4.6,
        distance: '2.1km',
        image: 'https://via.placeholder.com/120x120',
      },
    ];
  } catch (error) {
    console.error('搜索失败:', error);
    uni.showToast({
      title: '搜索失败，请重试',
      icon: 'none',
    });
  } finally {
    isLoading.value = false;
  }
};

const addToHistory = (keyword: string) => {
  if (searchHistory.value.includes(keyword)) {
    return;
  }
  searchHistory.value.unshift(keyword);
  if (searchHistory.value.length > 8) {
    searchHistory.value = searchHistory.value.slice(0, 8);
  }
};

const selectHistory = (keyword: string) => {
  searchKeyword.value = keyword;
  performSearch();
};

const selectHotSearch = (keyword: string) => {
  searchKeyword.value = keyword;
  performSearch();
};

const clearHistory = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清空搜索历史吗？',
    success: (res) => {
      if (res.confirm) {
        searchHistory.value = [];
      }
    },
  });
};

const goToDetail = (item: any) => {
  // 跳转到详情页
  uni.navigateTo({
    url: `/pages/store/detail?id=${item.id}`,
  });
};
</script>

<style lang="scss" scoped>
.search-page {
  min-height: 100vh;
  background-color: #f8f9fa;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: white;
  border-bottom: 1px solid #e9ecef;
}

.search-input {
  display: flex;
  align-items: center;
  flex: 1;
  background-color: #f8f9fa;
  border-radius: 25rpx;
  padding: 20rpx 30rpx;
  margin-right: 20rpx;
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

.search-btn {
  color: #667eea;
  font-size: 32rpx;
  font-weight: 500;
}

.search-history,
.hot-search {
  margin: 30rpx 0;
  padding: 0 20rpx;
}

.history-header,
.hot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.history-title,
.hot-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.clear-btn {
  font-size: 28rpx;
  color: #6c757d;
}

.history-tags,
.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.history-tag,
.hot-tag {
  background-color: white;
  padding: 15rpx 30rpx;
  border-radius: 20rpx;
  font-size: 28rpx;
  color: #333;
  border: 1px solid #e9ecef;
}

.hot-tag {
  background-color: #f8f9fa;
  color: #667eea;
}

.search-results {
  padding: 20rpx;
}

.loading {
  text-align: center;
  padding: 100rpx;
  color: #6c757d;
}

.no-result {
  text-align: center;
  padding: 100rpx 20rpx;
}

.no-result-icon {
  font-size: 120rpx;
  display: block;
  margin-bottom: 30rpx;
}

.no-result-text {
  font-size: 36rpx;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.no-result-tip {
  font-size: 28rpx;
  color: #6c757d;
  display: block;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.result-item {
  display: flex;
  background-color: white;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.result-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 15rpx;
  margin-right: 30rpx;
}

.result-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.result-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.result-desc {
  font-size: 28rpx;
  color: #6c757d;
  margin: 15rpx 0;
  display: block;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-rating {
  font-size: 26rpx;
  color: #ff6b35;
}

.result-distance {
  font-size: 26rpx;
  color: #6c757d;
}
</style>
