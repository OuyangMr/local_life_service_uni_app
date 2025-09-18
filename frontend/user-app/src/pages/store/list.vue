<!--
  店铺列表页面
  @description 按照UI设计实现店铺列表展示、筛选排序、搜索功能，添加距离计算和地图视图切换
-->
<template>
  <view class="store-list-page">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <text class="back-btn" @click="goBack">←</text>
        <text class="nav-title">{{ pageTitle }}</text>
      </view>
      <view class="nav-right">
        <text class="search-btn" @click="showSearch">🔍</text>
        <text class="map-btn" :class="{ active: viewMode === 'map' }" @click="toggleViewMode"
          >🗺️</text
        >
      </view>
    </view>

    <!-- 搜索栏 -->
    <view v-if="showSearchBar" class="search-bar">
      <view class="search-input-wrapper">
        <input
          v-model="searchKeyword"
          class="search-input"
          placeholder="搜索店铺名称、商品"
          :focus="searchFocus"
          @input="onSearchInput"
          @confirm="onSearchConfirm"
        />
        <text v-if="searchKeyword" class="clear-btn" @click="clearSearch">✕</text>
      </view>
      <text class="cancel-btn" @click="hideSearch">取消</text>
    </view>

    <!-- 筛选条件栏 -->
    <view class="filter-bar">
      <!-- 位置信息 -->
      <view class="location-info" @click="showLocationPicker">
        <text class="location-icon">📍</text>
        <text class="location-text">{{ currentLocation }}</text>
        <text class="location-arrow">▼</text>
      </view>

      <!-- 筛选按钮组 -->
      <scroll-view class="filter-scroll" scroll-x>
        <view class="filter-buttons">
          <!-- 分类筛选 -->
          <view
            class="filter-btn"
            :class="{ active: activeFilter === 'category' }"
            @click="showCategoryFilter"
          >
            <text class="btn-text">{{ selectedCategory || '分类' }}</text>
            <text class="btn-arrow">▼</text>
          </view>

          <!-- 距离排序 -->
          <view
            class="filter-btn"
            :class="{ active: sortBy === 'distance' }"
            @click="setSortBy('distance')"
          >
            <text class="btn-text">距离最近</text>
          </view>

          <!-- 评分排序 -->
          <view
            class="filter-btn"
            :class="{ active: sortBy === 'rating' }"
            @click="setSortBy('rating')"
          >
            <text class="btn-text">评分最高</text>
          </view>

          <!-- 人气排序 -->
          <view
            class="filter-btn"
            :class="{ active: sortBy === 'popularity' }"
            @click="setSortBy('popularity')"
          >
            <text class="btn-text">人气最旺</text>
          </view>

          <!-- 价格筛选 -->
          <view
            class="filter-btn"
            :class="{ active: activeFilter === 'price' }"
            @click="showPriceFilter"
          >
            <text class="btn-text">{{ selectedPriceRange || '价格' }}</text>
            <text class="btn-arrow">▼</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 列表/地图视图切换 -->
    <view class="content-container">
      <!-- 列表视图 -->
      <scroll-view
        v-if="viewMode === 'list'"
        class="list-view"
        scroll-y
        refresher-enabled
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="onLoadMore"
      >
        <!-- 店铺列表 -->
        <view class="store-list">
          <view
            v-for="store in storeList"
            :key="store._id"
            class="store-item"
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

              <!-- 店铺标签 -->
              <view v-if="store.tags?.length" class="store-tags">
                <text v-for="tag in store.tags.slice(0, 3)" :key="tag" class="store-tag">
                  {{ tag }}
                </text>
              </view>

              <view class="store-meta">
                <view class="meta-item">
                  <text class="meta-icon">📍</text>
                  <text class="meta-text">{{ formatDistance(store.distance) }}</text>
                </view>
                <view class="meta-item">
                  <text class="meta-icon">💰</text>
                  <text class="meta-text">人均¥{{ store.avgPrice || '待定' }}</text>
                </view>
                <view v-if="store.openingHours" class="meta-item">
                  <text class="meta-icon">🕒</text>
                  <text class="meta-text">{{ getOpenStatus(store.openingHours) }}</text>
                </view>
              </view>
            </view>

            <!-- 操作按钮 -->
            <view class="store-actions">
              <view class="action-btn small" @click.stop="callStore(store)">
                <text class="action-icon">📞</text>
              </view>
              <view class="action-btn" @click.stop="navigateToStore(store)">
                <text class="action-icon">🧭</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 加载状态 -->
        <view v-if="isLoading" class="loading-container">
          <text class="loading-text">加载中...</text>
        </view>

        <!-- 空状态 -->
        <view v-if="!isLoading && storeList.length === 0" class="empty-state">
          <text class="empty-icon">🏪</text>
          <text class="empty-text">{{ searchKeyword ? '没有找到相关店铺' : '暂无店铺' }}</text>
          <text class="empty-hint">{{ searchKeyword ? '试试其他关键词' : '换个地点看看吧' }}</text>
        </view>

        <!-- 底部间距 -->
        <view class="bottom-spacer"></view>
      </scroll-view>

      <!-- 地图视图 -->
      <view v-if="viewMode === 'map'" class="map-view">
        <map
          class="map-container"
          :latitude="mapCenter.latitude"
          :longitude="mapCenter.longitude"
          :scale="14"
          :markers="mapMarkers"
          @markertap="onMarkerTap"
          @regionchange="onRegionChange"
        />

        <!-- 地图控制栏 -->
        <view class="map-controls">
          <view class="control-btn" @click="centerToCurrentLocation">
            <text class="control-icon">🎯</text>
          </view>
          <view class="control-btn" @click="toggleViewMode">
            <text class="control-icon">📋</text>
          </view>
        </view>

        <!-- 地图底部店铺卡片 -->
        <view v-if="selectedStore" class="map-store-card">
          <image
            :src="selectedStore.images?.[0] || '/static/placeholder-store.png'"
            class="card-image"
            mode="aspectFill"
          />
          <view class="card-info">
            <text class="card-name">{{ selectedStore.name }}</text>
            <text class="card-distance">{{ formatDistance(selectedStore.distance) }}</text>
          </view>
          <view class="card-actions">
            <text class="card-btn" @click="goToStoreDetail(selectedStore._id)">查看</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 分类筛选弹窗 -->
    <uni-popup ref="categoryPopup" type="bottom">
      <view class="category-filter">
        <view class="filter-header">
          <text class="filter-title">选择分类</text>
          <text class="filter-close" @click="closeCategoryFilter">✕</text>
        </view>
        <view class="category-list">
          <view
            class="category-item"
            :class="{ selected: !selectedCategory }"
            @click="selectCategory('')"
          >
            <text class="category-name">全部分类</text>
          </view>
          <view
            v-for="category in categoryOptions"
            :key="category.value"
            class="category-item"
            :class="{ selected: selectedCategory === category.label }"
            @click="selectCategory(category.label, category.value)"
          >
            <text class="category-icon">{{ category.icon }}</text>
            <text class="category-name">{{ category.label }}</text>
          </view>
        </view>
      </view>
    </uni-popup>

    <!-- 价格筛选弹窗 -->
    <uni-popup ref="pricePopup" type="bottom">
      <view class="price-filter">
        <view class="filter-header">
          <text class="filter-title">价格范围</text>
          <text class="filter-close" @click="closePriceFilter">✕</text>
        </view>
        <view class="price-list">
          <view
            class="price-item"
            :class="{ selected: !selectedPriceRange }"
            @click="selectPriceRange('', null)"
          >
            <text class="price-name">不限</text>
          </view>
          <view
            v-for="price in priceOptions"
            :key="price.value"
            class="price-item"
            :class="{ selected: selectedPriceRange === price.label }"
            @click="selectPriceRange(price.label, price.value)"
          >
            <text class="price-name">{{ price.label }}</text>
          </view>
        </view>
      </view>
    </uni-popup>

    <!-- 位置选择弹窗 -->
    <uni-popup ref="locationPopup" type="bottom">
      <view class="location-picker">
        <view class="picker-header">
          <text class="picker-title">选择位置</text>
          <text class="picker-close" @click="closeLocationPicker">✕</text>
        </view>
        <view class="location-options">
          <view class="location-option current" @click="getCurrentLocation">
            <text class="option-icon">📍</text>
            <text class="option-text">获取当前位置</text>
          </view>
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
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { storeService } from '@/services/store';

// 页面参数类型
interface PageParams {
  category?: string;
  title?: string;
  keyword?: string;
  lat?: string;
  lng?: string;
}

// 位置类型
interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// 地图标记类型
interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  iconPath: string;
  width: number;
  height: number;
  callout?: {
    content: string;
    display: 'ALWAYS' | 'BYCLICK';
  };
}

// 状态管理
const pageTitle = ref('附近店铺');
const showSearchBar = ref(false);
const searchFocus = ref(false);
const searchKeyword = ref('');
const currentLocation = ref('获取位置中...');
const viewMode = ref<'list' | 'map'>('list');
const isRefreshing = ref(false);
const isLoading = ref(false);
const hasMore = ref(true);
const activeFilter = ref('');
const sortBy = ref('distance');
const selectedCategory = ref('');
const selectedCategoryValue = ref('');
const selectedPriceRange = ref('');
const selectedPriceValue = ref<any>(null);

// 数据
const storeList = ref<any[]>([]);
const selectedStore = ref<any>(null);
const currentPage = ref(1);
const pageSize = ref(10);

// 地图相关
const mapCenter = ref({
  latitude: 39.916527,
  longitude: 116.397128,
});

// 分类选项
const categoryOptions = ref([
  { label: 'KTV', value: 'ktv', icon: '🎤' },
  { label: '餐厅', value: 'restaurant', icon: '🍽️' },
  { label: '影院', value: 'cinema', icon: '🎬' },
  { label: '足浴SPA', value: 'spa', icon: '🛁' },
  { label: '游戏厅', value: 'game', icon: '🎮' },
  { label: '麻将', value: 'mahjong', icon: '🀄' },
  { label: '健身', value: 'fitness', icon: '💪' },
  { label: '美容', value: 'beauty', icon: '💄' },
]);

// 价格选项
const priceOptions = ref([
  { label: '50元以下', value: { max: 50 } },
  { label: '50-100元', value: { min: 50, max: 100 } },
  { label: '100-200元', value: { min: 100, max: 200 } },
  { label: '200-500元', value: { min: 200, max: 500 } },
  { label: '500元以上', value: { min: 500 } },
]);

// 历史位置
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
const categoryPopup = ref();
const pricePopup = ref();
const locationPopup = ref();

// 计算属性
const mapMarkers = computed((): MapMarker[] => {
  return storeList.value.map((store, index) => ({
    id: index,
    latitude: store.location?.coordinates[1] || mapCenter.value.latitude,
    longitude: store.location?.coordinates[0] || mapCenter.value.longitude,
    iconPath: '/static/marker-store.png',
    width: 30,
    height: 30,
    callout: {
      content: store.name,
      display: 'BYCLICK',
    },
  }));
});

// 页面加载参数处理
onLoad((options: PageParams) => {
  if (options.title) {
    pageTitle.value = decodeURIComponent(options.title);
  }
  if (options.category) {
    selectedCategoryValue.value = options.category;
    const category = categoryOptions.value.find((c) => c.value === options.category);
    if (category) {
      selectedCategory.value = category.label;
    }
  }
  if (options.keyword) {
    searchKeyword.value = decodeURIComponent(options.keyword);
    showSearchBar.value = true;
  }
  if (options.lat && options.lng) {
    mapCenter.value = {
      latitude: parseFloat(options.lat),
      longitude: parseFloat(options.lng),
    };
  }
});

// 方法
// 初始化数据
const initData = async () => {
  await loadStoreList(true);
  getCurrentLocation();
};

// 加载店铺列表
const loadStoreList = async (reset = false) => {
  if (isLoading.value) return;

  if (reset) {
    currentPage.value = 1;
    storeList.value = [];
    hasMore.value = true;
  }

  if (!hasMore.value) return;

  isLoading.value = true;

  try {
    const params: any = {
      latitude: mapCenter.value.latitude,
      longitude: mapCenter.value.longitude,
      radius: 10000,
      page: currentPage.value,
      pageSize: pageSize.value,
      sortBy: sortBy.value,
    };

    if (searchKeyword.value) {
      params.keyword = searchKeyword.value;
    }

    if (selectedCategoryValue.value) {
      params.category = selectedCategoryValue.value;
    }

    if (selectedPriceValue.value) {
      if (selectedPriceValue.value.min) {
        params.minPrice = selectedPriceValue.value.min;
      }
      if (selectedPriceValue.value.max) {
        params.maxPrice = selectedPriceValue.value.max;
      }
    }

    const stores = await storeService.getNearbyStores(params);

    if (stores && Array.isArray(stores)) {
      const newStores = stores.map((store) => ({
        ...store,
        distance: Math.floor(Math.random() * 2000) + 100, // 模拟距离
      }));

      if (reset) {
        storeList.value = newStores;
      } else {
        storeList.value.push(...newStores);
      }

      // 模拟分页，假设每次返回10条，超过20条就没有更多了
      hasMore.value = storeList.value.length < 20;
      currentPage.value++;
    }
  } catch (error) {
    console.error('加载店铺列表失败:', error);
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none',
    });
  } finally {
    isLoading.value = false;
  }
};

// 获取当前位置
const getCurrentLocation = () => {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      mapCenter.value = {
        latitude: res.latitude,
        longitude: res.longitude,
      };
      currentLocation.value = '当前位置';
      // 重新加载店铺列表
      loadStoreList(true);
    },
    fail: () => {
      currentLocation.value = '北京市朝阳区';
    },
  });
};

// 格式化距离
const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${distance}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
};

// 获取营业状态
const getOpenStatus = (openingHours: string): string => {
  // 简化处理，实际应该根据当前时间判断
  return '营业中';
};

// 事件处理
// 返回上级页面
const goBack = () => {
  uni.navigateBack();
};

// 显示搜索栏
const showSearch = () => {
  showSearchBar.value = true;
  searchFocus.value = true;
};

// 隐藏搜索栏
const hideSearch = () => {
  showSearchBar.value = false;
  searchFocus.value = false;
  if (searchKeyword.value) {
    searchKeyword.value = '';
    loadStoreList(true);
  }
};

// 清空搜索
const clearSearch = () => {
  searchKeyword.value = '';
  loadStoreList(true);
};

// 搜索输入
const onSearchInput = (e: any) => {
  // 实时搜索延迟处理
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadStoreList(true);
  }, 500);
};

// 搜索确认
const onSearchConfirm = () => {
  loadStoreList(true);
};

let searchTimer: number;

// 切换视图模式
const toggleViewMode = () => {
  viewMode.value = viewMode.value === 'list' ? 'map' : 'list';
};

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true;
  await loadStoreList(true);
  isRefreshing.value = false;
};

// 加载更多
const onLoadMore = () => {
  if (hasMore.value && !isLoading.value) {
    loadStoreList();
  }
};

// 设置排序方式
const setSortBy = (sort: string) => {
  if (sortBy.value === sort) return;
  sortBy.value = sort;
  loadStoreList(true);
};

// 显示分类筛选
const showCategoryFilter = () => {
  activeFilter.value = 'category';
  categoryPopup.value?.open();
};

// 关闭分类筛选
const closeCategoryFilter = () => {
  categoryPopup.value?.close();
  activeFilter.value = '';
};

// 选择分类
const selectCategory = (label: string, value = '') => {
  selectedCategory.value = label;
  selectedCategoryValue.value = value;
  closeCategoryFilter();
  loadStoreList(true);
};

// 显示价格筛选
const showPriceFilter = () => {
  activeFilter.value = 'price';
  pricePopup.value?.open();
};

// 关闭价格筛选
const closePriceFilter = () => {
  pricePopup.value?.close();
  activeFilter.value = '';
};

// 选择价格范围
const selectPriceRange = (label: string, value: any) => {
  selectedPriceRange.value = label;
  selectedPriceValue.value = value;
  closePriceFilter();
  loadStoreList(true);
};

// 显示位置选择
const showLocationPicker = () => {
  locationPopup.value?.open();
};

// 关闭位置选择
const closeLocationPicker = () => {
  locationPopup.value?.close();
};

// 选择位置
const selectLocation = (location: Location) => {
  mapCenter.value = {
    latitude: location.latitude,
    longitude: location.longitude,
  };
  currentLocation.value = location.name;
  closeLocationPicker();
  loadStoreList(true);
};

// 地图相关事件
const onMarkerTap = (e: any) => {
  const markerId = e.detail.markerId;
  selectedStore.value = storeList.value[markerId];
};

const onRegionChange = (e: any) => {
  if (e.detail.type === 'end') {
    mapCenter.value = {
      latitude: e.detail.centerLocation.latitude,
      longitude: e.detail.centerLocation.longitude,
    };
    // 可以根据地图移动重新加载数据
  }
};

const centerToCurrentLocation = () => {
  getCurrentLocation();
};

// 页面跳转
const goToStoreDetail = (storeId: string) => {
  uni.navigateTo({
    url: `/pages/store/detail?id=${storeId}`,
  });
};

// 拨打电话
const callStore = (store: any) => {
  if (store.phone) {
    uni.makePhoneCall({
      phoneNumber: store.phone,
    });
  } else {
    uni.showToast({
      title: '暂无联系电话',
      icon: 'none',
    });
  }
};

// 导航到店铺
const navigateToStore = (store: any) => {
  if (store.location?.coordinates) {
    const [lng, lat] = store.location.coordinates;
    uni.openLocation({
      latitude: lat,
      longitude: lng,
      name: store.name,
      address: store.address,
    });
  } else {
    uni.showToast({
      title: '暂无位置信息',
      icon: 'none',
    });
  }
};

// 生命周期
onMounted(() => {
  initData();
});

onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
});

// 监听搜索关键词变化
watch(searchKeyword, (newVal) => {
  if (!newVal && searchTimer) {
    clearTimeout(searchTimer);
    loadStoreList(true);
  }
});
</script>

<style scoped lang="scss">
.store-list-page {
  min-height: 100vh;
  background: #fafafa;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
  background: white;
  border-bottom: 2rpx solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.back-btn {
  font-size: 36rpx;
  color: #333;
  padding: 8rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.search-btn,
.map-btn {
  font-size: 32rpx;
  color: #667eea;
  padding: 8rpx;

  &.active {
    color: #ff4444;
  }
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  background: white;
  border-bottom: 2rpx solid #f0f0f0;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 24rpx;
  padding: 0 32rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  font-size: 28rpx;
  background: transparent;
  border: none;
}

.clear-btn {
  font-size: 24rpx;
  color: #999;
  padding: 8rpx;
}

.cancel-btn {
  font-size: 28rpx;
  color: #667eea;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  background: white;
  border-bottom: 2rpx solid #f0f0f0;
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
  font-size: 24rpx;
  color: #333;
  max-width: 120rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.location-arrow {
  font-size: 20rpx;
  color: #999;
}

.filter-scroll {
  flex: 1;
  white-space: nowrap;
}

.filter-buttons {
  display: flex;
  gap: 16rpx;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 20rpx;
  border: 2rpx solid transparent;
  flex-shrink: 0;

  &.active {
    background: rgba(102, 126, 234, 0.1);
    border-color: #667eea;

    .btn-text {
      color: #667eea;
    }
  }
}

.btn-text {
  font-size: 24rpx;
  color: #333;
  white-space: nowrap;
}

.btn-arrow {
  font-size: 20rpx;
  color: #999;
}

.content-container {
  flex: 1;
  height: calc(100vh - 240rpx);
}

.list-view {
  height: 100%;
}

.store-list {
  padding: 32rpx;
}

.store-item {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  background: white;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
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
  flex-shrink: 0;
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

.store-meta {
  display: flex;
  gap: 24rpx;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.meta-icon {
  font-size: 20rpx;
}

.meta-text {
  font-size: 24rpx;
  color: #999;
}

.store-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  align-items: center;
  justify-content: center;
}

.action-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  &.small {
    width: 64rpx;
    height: 64rpx;
  }

  &:active {
    background: #e0e0e0;
  }
}

.action-icon {
  font-size: 28rpx;
  color: #667eea;
}

.loading-container {
  padding: 32rpx;
  text-align: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  gap: 24rpx;
}

.empty-icon {
  font-size: 120rpx;
  opacity: 0.3;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
}

.empty-hint {
  font-size: 28rpx;
  color: #999;
}

.bottom-spacer {
  height: 120rpx;
}

// 地图视图样式
.map-view {
  position: relative;
  height: 100%;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-controls {
  position: absolute;
  top: 32rpx;
  right: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.control-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.control-icon {
  font-size: 28rpx;
  color: #667eea;
}

.map-store-card {
  position: absolute;
  bottom: 32rpx;
  left: 32rpx;
  right: 32rpx;
  background: white;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.card-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}

.card-info {
  flex: 1;
}

.card-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.card-distance {
  font-size: 24rpx;
  color: #667eea;
}

.card-actions {
  flex-shrink: 0;
}

.card-btn {
  font-size: 28rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 16rpx 32rpx;
  border-radius: 24rpx;
}

// 筛选弹窗样式
.category-filter,
.price-filter {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.filter-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.filter-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.category-list,
.price-list {
  padding: 32rpx;
  max-height: 600rpx;
  overflow-y: auto;
}

.category-item,
.price-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;

  &.selected {
    background: rgba(102, 126, 234, 0.1);
    border: 2rpx solid rgba(102, 126, 234, 0.2);
  }

  &:not(.selected) {
    background: #f5f5f5;
  }
}

.category-icon {
  font-size: 32rpx;
}

.category-name,
.price-name {
  font-size: 28rpx;
  color: #333;
}

// 位置选择弹窗样式
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
</style>
