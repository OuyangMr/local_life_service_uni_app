<template>
  <view class="search-page">
    <view class="search-header">
      <view class="search-bar">
        <input 
          v-model="searchKeyword"
          placeholder="搜索商户、商品"
          class="search-input"
          @input="onSearchInput"
          @confirm="onSearchConfirm"
        />
        <button class="search-btn" @tap="onSearchConfirm">搜索</button>
      </view>
    </view>
    
    <view class="search-content">
      <view v-if="!searchResults.length && !loading" class="search-empty">
        <text class="empty-text">输入关键词开始搜索</text>
      </view>
      
      <view v-else-if="loading" class="search-loading">
        <text>搜索中...</text>
      </view>
      
      <view v-else class="search-results">
        <view 
          v-for="item in searchResults" 
          :key="item.id"
          class="result-item"
          @tap="onResultTap(item)"
        >
          <image :src="item.image" class="result-image" />
          <view class="result-info">
            <text class="result-title">{{ item.title }}</text>
            <text class="result-desc">{{ item.description }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const searchKeyword = ref('')
const searchResults = ref<any[]>([])
const loading = ref(false)

const onSearchInput = () => {
  // TODO: 实现搜索建议
}

const onSearchConfirm = async () => {
  if (!searchKeyword.value.trim()) return
  
  loading.value = true
  try {
    // TODO: 实现搜索功能
    await new Promise(resolve => setTimeout(resolve, 1000))
    searchResults.value = []
  } catch (error) {
    console.error('搜索失败:', error)
  } finally {
    loading.value = false
  }
}

const onResultTap = (item: any) => {
  uni.navigateTo({
    url: `/pages/store/detail?id=${item.id}`
  })
}
</script>

<style lang="scss" scoped>
.search-page {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.search-header {
  padding: 20rpx;
  background: white;
  
  .search-bar {
    display: flex;
    align-items: center;
    gap: 20rpx;
    
    .search-input {
      flex: 1;
      padding: 20rpx;
      border: 1rpx solid #e0e0e0;
      border-radius: 8rpx;
      font-size: 28rpx;
    }
    
    .search-btn {
      padding: 20rpx 30rpx;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8rpx;
      font-size: 28rpx;
    }
  }
}

.search-content {
  padding: 20rpx;
  
  .search-empty, .search-loading {
    text-align: center;
    padding: 100rpx 0;
    color: #999;
  }
  
  .search-results {
    .result-item {
      display: flex;
      padding: 20rpx;
      margin-bottom: 20rpx;
      background: white;
      border-radius: 16rpx;
      
      .result-image {
        width: 120rpx;
        height: 120rpx;
        border-radius: 8rpx;
        margin-right: 20rpx;
      }
      
      .result-info {
        flex: 1;
        
        .result-title {
          display: block;
          font-size: 30rpx;
          font-weight: bold;
          color: #333;
          margin-bottom: 10rpx;
        }
        
        .result-desc {
          font-size: 26rpx;
          color: #666;
        }
      }
    }
  }
}
</style>
