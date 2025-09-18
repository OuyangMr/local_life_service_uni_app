<!--
  首页和类目选择
  @description 根据UI设计稿实现类目展示、店铺推荐、用户快速入口，添加地理位置获取和权限处理
-->
<template>
  <view class="home-page">
    <!-- 顶部搜索栏 -->
    <view class="header">
      <view class="search-section">
        <!-- 位置信息 -->
        <view class="location-info" @click="showLocationPicker">
          <text class="location-icon">📍</text>
          <text class="location-text">{{ currentLocation }}</text>
          <text class="location-arrow">▼</text>
        </view>

        <!-- 搜索框 -->
        <view class="search-box" @click="goToSearch">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">搜索店铺、商品</text>
        </view>

        <!-- 消息按钮 -->
        <view class="message-btn" @click="goToMessages">
          <text class="message-icon">💬</text>
          <text v-if="unreadCount > 0" class="message-badge">{{
            unreadCount > 99 ? '99+' : unreadCount
          }}</text>
        </view>
      </view>
    </view>

    <!-- 滚动内容区域 -->
    <scroll-view
      class="content"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <!-- 轮播图 -->
      <view class="banner-section">
        <swiper
          class="banner-swiper"
          :indicator-dots="true"
          :autoplay="true"
          :interval="3000"
          :duration="500"
          indicator-color="rgba(255,255,255,0.5)"
          indicator-active-color="#ffffff"
        >
          <swiper-item
            v-for="(banner, index) in bannerList"
            :key="index"
            @click="onBannerClick(banner)"
          >
            <image :src="banner.image" class="banner-image" mode="aspectFill" />
            <view class="banner-overlay">
              <text class="banner-title">{{ banner.title }}</text>
              <text v-if="banner.subtitle" class="banner-subtitle">{{ banner.subtitle }}</text>
            </view>
          </swiper-item>
        </swiper>
      </view>

      <!-- 服务类目 -->
      <view class="category-section">
        <view class="section-header">
          <text class="section-title">服务类目</text>
          <view class="header-actions">
            <text class="view-all" @click="goToCategoryList">全部 ></text>
          </view>
        </view>

        <view class="category-grid">
          <view
            v-for="category in categoryList"
            :key="category.id"
            class="category-item"
            @click="selectCategory(category)"
          >
            <view class="category-icon">
              <text class="icon">{{ category.icon }}</text>
            </view>
            <text class="category-name">{{ category.name }}</text>
            <text v-if="category.subtitle" class="category-subtitle">{{ category.subtitle }}</text>
          </view>
        </view>
      </view>

      <!-- 快速入口 -->
      <view class="quick-actions">
        <view class="action-item" @click="goToScan">
          <view class="action-icon scan">
            <text class="icon">📷</text>
          </view>
          <text class="action-text">扫码点单</text>
        </view>

        <view class="action-item" @click="goToBooking">
          <view class="action-icon booking">
            <text class="icon">📅</text>
          </view>
          <text class="action-text">立即预订</text>
        </view>

        <view class="action-item" @click="goToDelivery">
          <view class="action-icon delivery">
            <text class="icon">🚚</text>
          </view>
          <text class="action-text">外卖配送</text>
        </view>

        <view class="action-item" @click="goToVip">
          <view class="action-icon vip">
            <text class="icon">👑</text>
          </view>
          <text class="action-text">会员特权</text>
        </view>
      </view>

      <!-- 推荐店铺 -->
      <view class="recommend-section">
        <view class="section-header">
          <text class="section-title">推荐店铺</text>
          <view class="header-actions">
            <text class="view-all" @click="goToStoreList">更多 ></text>
          </view>
        </view>

        <!-- 店铺列表 -->
        <view class="store-list">
          <view
            v-for="store in recommendStores"
            :key="store._id"
            class="store-card"
            @click="goToStoreDetail(store._id)"
          >
            <!-- 店铺图片 -->
            <image
              :src="store.images?.[0] || '/static/placeholder-store.png'"
              class="store-image"
              mode="aspectFill"
            />

            <!-- 店铺信息 -->
            <view class="store-info">
              <view class="store-header">
                <text class="store-name">{{ store.name }}</text>
                <view class="store-rating">
                  <text class="rating-text">{{ store.averageRating.toFixed(1) }}</text>
                  <text class="rating-star">⭐</text>
                </view>
              </view>

              <text class="store-desc">{{ store.description }}</text>

              <view class="store-meta">
                <text class="store-distance">{{ formatDistance(store.distance) }}</text>
                <text class="store-category">{{ store.category }}</text>
                <text v-if="store.avgPrice" class="store-price">人均¥{{ store.avgPrice }}</text>
              </view>

              <!-- 店铺标签 -->
              <view v-if="store.tags?.length" class="store-tags">
                <text v-for="tag in store.tags.slice(0, 3)" :key="tag" class="store-tag">
                  {{ tag }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载更多 -->
        <view v-if="hasMoreStores" class="load-more">
          <text v-if="isLoadingMore" class="loading-text">加载中...</text>
          <text v-else class="load-text" @click="loadMoreStores">点击加载更多</text>
        </view>
      </view>

      <!-- 底部间距 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 位置选择弹窗 -->
    <uni-popup ref="locationPopup" type="bottom">
      <view class="location-picker">
        <view class="picker-header">
          <text class="picker-title">选择位置</text>
          <text class="picker-close" @click="closeLocationPicker">✕</text>
        </view>

        <view class="location-options">
          <!-- 当前位置 -->
          <view class="location-option current" @click="getCurrentLocation">
            <text class="option-icon">📍</text>
            <text class="option-text">获取当前位置</text>
            <text class="option-status">{{ locationStatus }}</text>
          </view>

          <!-- 历史位置 -->
          <view
            v-for="location in recentLocations"
            :key="location.id"
            class="location-option"
            @click="selectLocation(location)"
          >
            <text class="option-icon">🏠</text>
            <text class="option-text">{{ location.name }}</text>
            <text class="option-address">{{ location.address }}</text>
          </view>
        </view>
      </view>
    </uni-popup>

    <!-- 实时状态组件 -->
    <RealtimeStatus
      v-if="enableRealtime"
      :ws-url="wsUrl"
      :show-indicator="false"
      @message="onRealtimeMessage"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { storeService } from '@/services/store';
import { compatAPI } from '@/utils/platform';
import { Navigation } from '@/utils/navigation';
import RealtimeStatus from '@/components/RealtimeStatus.vue';

// 轮播图类型
interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link?: string;
  type?: 'store' | 'category' | 'activity';
  targetId?: string;
}

// 类目类型
interface Category {
  id: string;
  name: string;
  icon: string;
  subtitle?: string;
  color?: string;
}

// 位置类型
interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// Store
const userStore = useUserStore();

// 状态管理
const isRefreshing = ref(false);
const isLoadingMore = ref(false);
const hasMoreStores = ref(true);
const currentLocation = ref('获取位置中...');
const locationStatus = ref('获取中...');
const unreadCount = ref(3);
const enableRealtime = ref(true);

// 数据
const bannerList = ref<Banner[]>([
  {
    id: '1',
    title: '新用户专享',
    subtitle: '立减30元',
    image: '/static/banner1.jpg',
    type: 'activity',
  },
  {
    id: '2',
    title: 'KTV包间特价',
    subtitle: '5折优惠',
    image: '/static/banner2.jpg',
    type: 'category',
    targetId: 'ktv',
  },
]);

const categoryList = ref<Category[]>([
  { id: 'ktv', name: 'KTV', icon: '🎤', subtitle: '唱歌娱乐' },
  { id: 'restaurant', name: '餐厅', icon: '🍽️', subtitle: '美食享受' },
  { id: 'cinema', name: '影院', icon: '🎬', subtitle: '观影体验' },
  { id: 'spa', name: '足浴SPA', icon: '🛁', subtitle: '休闲放松' },
  { id: 'game', name: '游戏厅', icon: '🎮', subtitle: '电竞娱乐' },
  { id: 'mahjong', name: '麻将', icon: '🀄', subtitle: '棋牌竞技' },
  { id: 'fitness', name: '健身', icon: '💪', subtitle: '运动健康' },
  { id: 'beauty', name: '美容', icon: '💄', subtitle: '美容护理' },
]);

const recommendStores = ref<any[]>([]);
const recentLocations = ref<Location[]>([
  {
    id: '1',
    name: '家',
    address: '北京市朝阳区xxx小区',
    latitude: 39.916527,
    longitude: 116.397128,
  },
  {
    id: '2',
    name: '公司',
    address: '北京市朝阳区xxx大厦',
    latitude: 39.926527,
    longitude: 116.407128,
  },
]);

// Refs
const locationPopup = ref();

// 计算属性
const wsUrl = computed(() => {
  return process.env.NODE_ENV === 'development' ? 'ws://localhost:3000' : 'wss://api.example.com';
});

// 方法
// 初始化数据
const initData = async () => {
  await Promise.all([loadRecommendStores(), getCurrentLocation()]);
};

// 获取推荐店铺
const loadRecommendStores = async () => {
  try {
    const stores = await storeService.getNearbyStores({
      latitude: 39.916527,
      longitude: 116.397128,
      radius: 5,
      limit: 10,
    });

    if (stores && Array.isArray(stores)) {
      recommendStores.value = stores.map((store) => ({
        ...store,
        distance: Math.floor(Math.random() * 2000) + 100, // 模拟距离
      }));
    }
  } catch (error) {
    console.error('加载推荐店铺失败:', error);
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none',
    });
  }
};

// 加载更多店铺
const loadMoreStores = async () => {
  if (isLoadingMore.value) return;

  isLoadingMore.value = true;
  // 模拟加载更多数据
  setTimeout(() => {
    isLoadingMore.value = false;
    hasMoreStores.value = false;
  }, 1000);
};

// 获取当前位置
const getCurrentLocation = () => {
  locationStatus.value = '获取中...';

  // H5环境下使用浏览器的Geolocation API
  // #ifdef H5
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('获取位置成功:', { latitude, longitude });
        // 这里应该调用逆地理编码API获取地址，简化处理
        currentLocation.value = '北京市朝阳区';
        locationStatus.value = '已获取';
      },
      (error) => {
        console.error('H5地理位置获取失败:', error);
        handleLocationError();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  } else {
    console.error('浏览器不支持地理位置');
    handleLocationError();
  }
  // #endif

  // 小程序环境下使用uni.getLocation
  // #ifndef H5
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      console.log('获取位置成功:', res);
      currentLocation.value = '北京市朝阳区';
      locationStatus.value = '已获取';
    },
    fail: (error) => {
      console.error('获取位置失败:', error);
      handleLocationError();
    },
  });
  // #endif
};

// 处理位置获取失败
const handleLocationError = () => {
  currentLocation.value = '位置获取失败';
  locationStatus.value = '获取失败';

  // 使用默认位置
  uni.showToast({
    title: '将使用默认位置',
    icon: 'none',
  });

  setTimeout(() => {
    currentLocation.value = '北京市朝阳区';
    locationStatus.value = '默认位置';
  }, 2000);
};

// 显示位置选择器
const showLocationPicker = () => {
  locationPopup.value?.open();
};

// 关闭位置选择器
const closeLocationPicker = () => {
  locationPopup.value?.close();
};

// 选择位置
const selectLocation = (location: Location) => {
  currentLocation.value = location.name;
  closeLocationPicker();
  // 重新加载附近店铺
  loadRecommendStores();
};

// 格式化距离
const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${distance}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
};

// 事件处理
// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true;
  await initData();
  isRefreshing.value = false;
};

// 加载更多
const onLoadMore = () => {
  if (hasMoreStores.value && !isLoadingMore.value) {
    loadMoreStores();
  }
};

// 轮播图点击
const onBannerClick = (banner: Banner) => {
  if (banner.type === 'category' && banner.targetId) {
    const category = categoryList.value.find((c) => c.id === banner.targetId);
    if (category) {
      selectCategory(category);
    }
  } else if (banner.type === 'store' && banner.targetId) {
    goToStoreDetail(banner.targetId);
  }
};

// 选择类目
const selectCategory = (category: Category) => {
  Navigation.navigateTo({
    url: `/pages/store/list?category=${category.id}&title=${encodeURIComponent(category.name)}`,
  });
};

// 实时消息处理
const onRealtimeMessage = (data: any) => {
  if (data.type === 'new_message') {
    unreadCount.value++;
  }
};

// 页面跳转
const goToSearch = () => {
  Navigation.navigateTo({
    url: '/pages/search/index',
  });
};

const goToMessages = () => {
  Navigation.navigateTo({
    url: '/pages/message/list',
  });
};

const goToCategoryList = () => {
  Navigation.navigateTo({
    url: '/pages/category/list',
  });
};

const goToStoreList = () => {
  Navigation.navigateTo({
    url: '/pages/store/list',
  });
};

const goToStoreDetail = (storeId: string) => {
  Navigation.navigateTo({
    url: `/pages/store/detail?id=${storeId}`,
  });
};

const goToScan = () => {
  Navigation.navigateTo({
    url: '/pages/order/scan',
  });
};

const goToBooking = () => {
  Navigation.navigateTo({
    url: '/pages/booking/index',
  });
};

const goToDelivery = () => {
  Navigation.navigateTo({
    url: '/pages/delivery/index',
  });
};

const goToVip = () => {
  Navigation.navigateTo({
    url: '/pages/vip/index',
  });
};

// 生命周期
onMounted(() => {
  initData();
});

onUnmounted(() => {
  // 清理资源
});
</script>

<style scoped lang="scss">
.home-page {
  min-height: 100vh;
  background: #fafafa;
}

.header {
  background: white;
  padding: 20rpx 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.search-section {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.location-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 20rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
  flex-shrink: 0;
}

.location-icon {
  font-size: 24rpx;
  color: #667eea;
}

.location-text {
  font-size: 26rpx;
  color: #333;
  max-width: 150rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.location-arrow {
  font-size: 20rpx;
  color: #999;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
}

.search-icon {
  font-size: 28rpx;
  color: #999;
}

.search-placeholder {
  font-size: 28rpx;
  color: #999;
}

.message-btn {
  position: relative;
  padding: 16rpx;
}

.message-icon {
  font-size: 32rpx;
  color: #667eea;
}

.message-badge {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  background: #ff4444;
  color: white;
  font-size: 20rpx;
  padding: 4rpx 8rpx;
  border-radius: 12rpx;
  min-width: 24rpx;
  text-align: center;
}

.content {
  height: calc(100vh - 120rpx);
}

.banner-section {
  margin: 32rpx;
}

.banner-swiper {
  height: 320rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
}

.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  padding: 32rpx;
  color: white;
}

.banner-title {
  font-size: 36rpx;
  font-weight: 600;
  margin-bottom: 8rpx;
  display: block;
}

.banner-subtitle {
  font-size: 28rpx;
  opacity: 0.9;
}

.category-section {
  background: white;
  margin: 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.view-all {
  font-size: 26rpx;
  color: #667eea;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 16rpx;
  border-radius: 16rpx;
  transition: all 0.3s ease;

  &:active {
    background: #f5f5f5;
    transform: scale(0.95);
  }
}

.category-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  .icon {
    font-size: 36rpx;
  }
}

.category-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
}

.category-subtitle {
  font-size: 20rpx;
  color: #999;
}

.quick-actions {
  display: flex;
  gap: 24rpx;
  padding: 0 32rpx;
  margin-bottom: 32rpx;
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 32rpx 16rpx;
  background: white;
  border-radius: 16rpx;

  &:active {
    transform: scale(0.95);
  }
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;

  &.scan {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  }

  &.booking {
    background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
  }

  &.delivery {
    background: linear-gradient(135deg, #45b7d1 0%, #096dd9 100%);
  }

  &.vip {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  .icon {
    font-size: 32rpx;
    color: white;
  }
}

.action-text {
  font-size: 24rpx;
  color: #333;
}

.recommend-section {
  background: white;
  margin: 0 32rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
}

.store-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.store-card {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  border: 2rpx solid #f0f0f0;
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  }
}

.store-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}

.store-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.store-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.store-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
  margin-right: 16rpx;
}

.store-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: #fff3cd;
  padding: 8rpx 12rpx;
  border-radius: 16rpx;
}

.rating-text {
  font-size: 24rpx;
  color: #856404;
  font-weight: 500;
}

.rating-star {
  font-size: 20rpx;
}

.store-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.store-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  font-size: 24rpx;
  color: #999;
}

.store-distance {
  color: #667eea;
}

.store-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.store-tag {
  font-size: 20rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 8rpx 12rpx;
  border-radius: 12rpx;
}

.load-more {
  padding: 32rpx;
  text-align: center;
}

.loading-text,
.load-text {
  font-size: 28rpx;
  color: #999;
}

.load-text {
  color: #667eea;
}

.bottom-spacer {
  height: 120rpx;
}

.location-picker {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.picker-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.location-options {
  padding: 32rpx;
  max-height: 600rpx;
  overflow-y: auto;
}

.location-option {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;

  &.current {
    background: rgba(102, 126, 234, 0.1);
    border: 2rpx solid rgba(102, 126, 234, 0.2);
  }

  &:not(.current) {
    background: #f5f5f5;
  }
}

.option-icon {
  font-size: 32rpx;
  color: #667eea;
}

.option-text {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.option-address {
  font-size: 24rpx;
  color: #999;
}

.option-status {
  font-size: 24rpx;
  color: #667eea;
}
</style>
