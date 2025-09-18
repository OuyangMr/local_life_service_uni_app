<!--
  商品目录页面
  @description 按设计稿实现商品分类浏览、搜索、加购功能，支持规格选择和会员价格显示
-->
<template>
  <view class="product-catalog-page">
    <!-- 顶部搜索栏 -->
    <view class="search-header">
      <view class="search-bar">
        <view class="search-input-wrapper">
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索商品名称或关键词"
            confirm-type="search"
            @confirm="performSearch"
            @input="onSearchInput"
          />
          <view class="search-icon" @click="performSearch">🔍</view>
        </view>
        
        <!-- 筛选按钮 -->
        <view class="filter-btn" @click="showFilterModal">
          <text class="filter-icon">🎛️</text>
          <text v-if="hasActiveFilters" class="filter-dot"></text>
        </view>
      </view>
      
      <!-- 搜索建议 -->
      <view v-if="searchSuggestions.length > 0" class="search-suggestions">
        <view 
          v-for="suggestion in searchSuggestions"
          :key="suggestion"
          class="suggestion-item"
          @click="applySuggestion(suggestion)"
        >
          <text class="suggestion-text">{{ suggestion }}</text>
        </view>
      </view>
    </view>

    <!-- 分类导航 -->
    <view class="category-nav">
      <scroll-view class="category-scroll" scroll-x>
        <view class="category-list">
          <view 
            v-for="category in categoryList"
            :key="category.id"
            class="category-item"
            :class="{ 'active': selectedCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            <text class="category-name">{{ category.name }}</text>
            <text v-if="getCategoryCount(category.id) > 0" class="category-badge">
              {{ getCategoryCount(category.id) }}
            </text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 排序选项 -->
    <view class="sort-options">
      <view class="sort-list">
        <view 
          v-for="sort in sortOptions"
          :key="sort.key"
          class="sort-item"
          :class="{ 'active': currentSort === sort.key }"
          @click="changeSortOrder(sort.key)"
        >
          <text class="sort-text">{{ sort.label }}</text>
          <text v-if="currentSort === sort.key" class="sort-arrow">
            {{ sortDirection === 'asc' ? '↑' : '↓' }}
          </text>
        </view>
      </view>
    </view>

    <!-- 商品列表 -->
    <scroll-view 
      class="product-list"
      scroll-y
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
    >
      <!-- VIP专享提示 -->
      <view v-if="userStore.isVip" class="vip-banner">
        <view class="vip-content">
          <text class="vip-icon">👑</text>
          <text class="vip-text">VIP会员享受专属价格优惠</text>
        </view>
      </view>

      <!-- 商品网格/列表 -->
      <view class="product-grid" :class="{ 'list-view': viewMode === 'list' }">
        <view 
          v-for="product in filteredProducts"
          :key="product._id"
          class="product-card"
          @click="viewProductDetail(product)"
        >
          <!-- 商品图片 -->
          <view class="product-image-wrapper">
            <image 
              :src="product.images?.[0] || '/static/placeholder-dish.png'"
              class="product-image"
              mode="aspectFill"
            />
            
            <!-- 商品标签 -->
            <view v-if="product.tags?.length" class="product-labels">
              <text 
                v-for="tag in product.tags.slice(0, 2)"
                :key="tag"
                class="product-label"
                :class="getTagClass(tag)"
              >
                {{ tag }}
              </text>
            </view>
            
            <!-- VIP标识 -->
            <view v-if="product.vipPrice && userStore.isVip" class="vip-mark">
              <text class="vip-mark-text">VIP</text>
            </view>
            
            <!-- 库存状态 -->
            <view v-if="product.stock === 0" class="stock-overlay">
              <text class="stock-text">售罄</text>
            </view>
          </view>
          
          <!-- 商品信息 -->
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            
            <text v-if="product.description" class="product-desc">
              {{ product.description }}
            </text>
            
            <!-- 评分和销量 -->
            <view class="product-stats">
              <view v-if="product.rating" class="rating-info">
                <text class="rating-stars">⭐</text>
                <text class="rating-text">{{ product.rating.toFixed(1) }}</text>
                <text class="rating-count">({{ product.reviewCount || 0 }})</text>
              </view>
              <text v-if="product.monthSales" class="sales-text">
                月售{{ product.monthSales }}
              </text>
            </view>
            
            <!-- 价格信息 -->
            <view class="price-section">
              <view class="price-info">
                <text class="current-price">¥{{ getDisplayPrice(product) }}</text>
                <text 
                  v-if="product.originalPrice && product.originalPrice > getDisplayPrice(product)"
                  class="original-price"
                >
                  ¥{{ product.originalPrice.toFixed(2) }}
                </text>
              </view>
              
              <!-- 规格选择提示 -->
              <text v-if="product.specs?.length" class="specs-hint">
                {{ product.specs.length }}种规格
              </text>
            </view>
            
            <!-- 库存提示 -->
            <view v-if="product.stock <= 10 && product.stock > 0" class="stock-warning">
              <text class="stock-text">仅剩{{ product.stock }}份</text>
            </view>
          </view>
          
          <!-- 添加到购物车 -->
          <view class="product-actions">
            <view v-if="product.stock === 0" class="sold-out-btn">
              <text class="btn-text">售罄</text>
            </view>
            <view v-else-if="!product.specs?.length && getCartQuantity(product._id) === 0" 
                  class="add-btn" 
                  @click.stop="quickAddProduct(product)">
              <text class="add-icon">+</text>
            </view>
            <view v-else-if="!product.specs?.length" class="quantity-control">
              <view class="quantity-btn" @click.stop="decreaseQuantity(product._id)">
                <text class="btn-text">-</text>
              </view>
              <text class="quantity-text">{{ getCartQuantity(product._id) }}</text>
              <view class="quantity-btn" @click.stop="increaseQuantity(product._id)">
                <text class="btn-text">+</text>
              </view>
            </view>
            <view v-else class="specs-btn" @click.stop="showSpecsModal(product)">
              <text class="specs-text">选规格</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more">
        <text class="load-text">加载更多...</text>
      </view>
      
      <!-- 无数据提示 -->
      <view v-if="filteredProducts.length === 0 && !isLoading" class="empty-state">
        <text class="empty-icon">🍽️</text>
        <text class="empty-title">没有找到相关商品</text>
        <text class="empty-desc">试试调整搜索条件或查看其他分类</text>
        <button class="empty-btn" @click="clearFilters">清除筛选条件</button>
      </view>
      
      <!-- 底部间距 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 购物车浮动按钮 -->
    <view v-if="cartStore.totalQuantity > 0" class="cart-float">
      <view class="cart-content" @click="showCart">
        <view class="cart-info">
          <text class="cart-count">{{ cartStore.totalQuantity }}</text>
          <text class="cart-amount">¥{{ cartStore.totalAmount.toFixed(2) }}</text>
        </view>
        <text class="cart-text">查看购物车</text>
      </view>
    </view>

    <!-- 筛选弹窗 -->
    <uni-popup 
      ref="filterPopup" 
      type="bottom"
    >
      <view class="filter-modal">
        <view class="filter-header">
          <text class="filter-title">筛选条件</text>
          <text class="filter-reset" @click="resetFilters">重置</text>
        </view>
        
        <view class="filter-content">
          <!-- 价格区间 -->
          <view class="filter-section">
            <text class="section-title">价格区间</text>
            <view class="price-range">
              <view 
                v-for="range in priceRanges"
                :key="range.key"
                class="price-item"
                :class="{ 'active': selectedPriceRange === range.key }"
                @click="selectPriceRange(range.key)"
              >
                <text class="price-text">{{ range.label }}</text>
              </view>
            </view>
          </view>
          
          <!-- 商品特色 -->
          <view class="filter-section">
            <text class="section-title">商品特色</text>
            <view class="feature-tags">
              <view 
                v-for="feature in featureFilters"
                :key="feature"
                class="feature-item"
                :class="{ 'active': selectedFeatures.includes(feature) }"
                @click="toggleFeature(feature)"
              >
                <text class="feature-text">{{ feature }}</text>
              </view>
            </view>
          </view>
        </view>
        
        <view class="filter-actions">
          <button class="filter-btn cancel" @click="hideFilterModal">取消</button>
          <button class="filter-btn confirm" @click="applyFilters">确定</button>
        </view>
      </view>
    </uni-popup>

    <!-- 规格选择弹窗 -->
    <uni-popup 
      ref="specsPopup" 
      type="bottom"
    >
      <view v-if="selectedProduct" class="specs-modal">
        <view class="specs-header">
          <view class="product-summary">
            <image 
              :src="selectedProduct.images?.[0] || '/static/placeholder-dish.png'"
              class="summary-image"
              mode="aspectFill"
            />
            <view class="summary-info">
              <text class="summary-name">{{ selectedProduct.name }}</text>
              <text class="summary-price">¥{{ getDisplayPrice(selectedProduct) }}</text>
            </view>
          </view>
          <text class="specs-close" @click="hideSpecsModal">✕</text>
        </view>
        
        <view class="specs-content">
          <!-- 规格选择 -->
          <view v-for="spec in selectedProduct.specs" :key="spec.name" class="spec-group">
            <text class="spec-title">{{ spec.name }}</text>
            <view class="spec-options">
              <view 
                v-for="option in spec.options"
                :key="option.value"
                class="spec-option"
                :class="{ 
                  'active': isSpecSelected(spec.name, option.value),
                  'disabled': option.stock === 0
                }"
                @click="selectSpec(spec.name, option.value)"
              >
                <text class="option-text">{{ option.value }}</text>
                <text v-if="option.extraPrice > 0" class="option-price">
                  +¥{{ option.extraPrice }}
                </text>
                <text v-if="option.stock === 0" class="option-stock">缺货</text>
              </view>
            </view>
          </view>
          
          <!-- 数量选择 -->
          <view class="quantity-section">
            <text class="quantity-title">数量</text>
            <view class="quantity-selector">
              <view class="quantity-btn" @click="decreaseSpecQuantity">
                <text class="btn-text">-</text>
              </view>
              <text class="quantity-text">{{ specQuantity }}</text>
              <view class="quantity-btn" @click="increaseSpecQuantity">
                <text class="btn-text">+</text>
              </view>
            </view>
          </view>
        </view>
        
        <view class="specs-actions">
          <view class="specs-summary">
            <text class="total-price">小计：¥{{ getSpecsTotalPrice() }}</text>
          </view>
          <button 
            class="add-cart-btn"
            :disabled="!canAddToCart"
            @click="addSpecsToCart"
          >
            加入购物车
          </button>
        </view>
      </view>
    </uni-popup>

    <!-- 购物车组件 -->
    <ShoppingCart
      v-if="showShoppingCart"
      :show-vip-price="userStore.isVip"
      @checkout="handleCheckout"
      @change="onCartChange"
      @close="hideCart"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import ShoppingCart from '@/components/ShoppingCart.vue'

// Store
const userStore = useUserStore()
const cartStore = useCartStore()

// 状态管理
const isLoading = ref(false)
const isRefreshing = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const viewMode = ref('grid') // grid | list

// 搜索相关
const searchKeyword = ref('')
const searchSuggestions = ref<string[]>([])
const recentSearches = ref<string[]>([])

// 分类相关
const selectedCategory = ref('')
const categoryList = ref([
  { id: '', name: '全部' },
  { id: 'drinks', name: '饮品' },
  { id: 'snacks', name: '小食' },
  { id: 'fruits', name: '果盘' },
  { id: 'alcohol', name: '酒类' },
  { id: 'dessert', name: '甜品' },
  { id: 'main', name: '主食' },
  { id: 'hotpot', name: '火锅' },
  { id: 'bbq', name: '烧烤' }
])

// 排序相关
const currentSort = ref('default')
const sortDirection = ref<'asc' | 'desc'>('desc')
const sortOptions = ref([
  { key: 'default', label: '默认排序' },
  { key: 'price', label: '价格' },
  { key: 'sales', label: '销量' },
  { key: 'rating', label: '评分' }
])

// 筛选相关
const selectedPriceRange = ref('')
const selectedFeatures = ref<string[]>([])
const priceRanges = ref([
  { key: '', label: '不限' },
  { key: '0-20', label: '20元以下' },
  { key: '20-50', label: '20-50元' },
  { key: '50-100', label: '50-100元' },
  { key: '100+', label: '100元以上' }
])
const featureFilters = ref(['热门', '新品', '特价', '健康', '素食', '辣味', '冰品'])

// 商品相关
const productList = ref<any[]>([])
const selectedProduct = ref<any>(null)
const selectedSpecs = ref<Record<string, string>>({})
const specQuantity = ref(1)

// 弹窗控制
const showShoppingCart = ref(false)

// Refs
const filterPopup = ref()
const specsPopup = ref()

// 计算属性
const filteredProducts = computed(() => {
  let products = [...productList.value]
  
  // 分类筛选
  if (selectedCategory.value) {
    products = products.filter(p => p.category === selectedCategory.value)
  }
  
  // 搜索筛选
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    products = products.filter(p => 
      p.name.toLowerCase().includes(keyword) ||
      p.description?.toLowerCase().includes(keyword) ||
      p.tags?.some((tag: string) => tag.toLowerCase().includes(keyword))
    )
  }
  
  // 价格筛选
  if (selectedPriceRange.value) {
    const [min, max] = selectedPriceRange.value.split('-').map(Number)
    products = products.filter(p => {
      const price = getDisplayPrice(p)
      if (selectedPriceRange.value === '100+') {
        return price >= 100
      }
      return price >= min && price <= max
    })
  }
  
  // 特色筛选
  if (selectedFeatures.value.length > 0) {
    products = products.filter(p => 
      selectedFeatures.value.some(feature => p.tags?.includes(feature))
    )
  }
  
  // 排序
  if (currentSort.value !== 'default') {
    products.sort((a, b) => {
      let aValue, bValue
      
      switch (currentSort.value) {
        case 'price':
          aValue = getDisplayPrice(a)
          bValue = getDisplayPrice(b)
          break
        case 'sales':
          aValue = a.monthSales || 0
          bValue = b.monthSales || 0
          break
        case 'rating':
          aValue = a.rating || 0
          bValue = b.rating || 0
          break
        default:
          return 0
      }
      
      return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
    })
  }
  
  return products
})

const hasActiveFilters = computed(() => {
  return selectedPriceRange.value || selectedFeatures.value.length > 0
})

const canAddToCart = computed(() => {
  if (!selectedProduct.value) return false
  
  // 检查必选规格是否都已选择
  if (selectedProduct.value.specs?.length > 0) {
    return selectedProduct.value.specs.every((spec: any) => 
      selectedSpecs.value[spec.name]
    )
  }
  
  return true
})

// 方法
// 初始化数据
const initData = async () => {
  await loadProducts()
  loadRecentSearches()
}

// 加载商品数据
const loadProducts = async (loadMore = false) => {
  if (isLoading.value) return
  
  isLoading.value = true
  
  try {
    // 模拟API调用
    const mockProducts = [
      // 饮品类
      {
        _id: 'p1',
        name: '柠檬蜂蜜茶',
        description: '新鲜柠檬配天然蜂蜜，清香怡人',
        price: 18,
        vipPrice: 15,
        originalPrice: 20,
        images: ['/static/drink1.jpg'],
        category: 'drinks',
        tags: ['热门', '清爽', '健康'],
        rating: 4.8,
        reviewCount: 156,
        monthSales: 892,
        stock: 20,
        specs: [
          {
            name: '温度',
            options: [
              { value: '冰', extraPrice: 0, stock: 20 },
              { value: '常温', extraPrice: 0, stock: 15 },
              { value: '热', extraPrice: 0, stock: 10 }
            ]
          },
          {
            name: '甜度',
            options: [
              { value: '无糖', extraPrice: 0, stock: 20 },
              { value: '三分糖', extraPrice: 0, stock: 20 },
              { value: '七分糖', extraPrice: 0, stock: 20 },
              { value: '全糖', extraPrice: 0, stock: 20 }
            ]
          }
        ]
      },
      {
        _id: 'p2',
        name: '芒果气泡水',
        description: '新鲜芒果果肉配气泡水，口感丰富',
        price: 22,
        vipPrice: 18,
        images: ['/static/drink2.jpg'],
        category: 'drinks',
        tags: ['新品', '果味', '冰品'],
        rating: 4.6,
        reviewCount: 89,
        monthSales: 567,
        stock: 15
      },
      // 小食类
      {
        _id: 'p3',
        name: '薯条',
        description: '金黄酥脆的法式薯条，配番茄酱',
        price: 12,
        vipPrice: 10,
        images: ['/static/snack1.jpg'],
        category: 'snacks',
        tags: ['经典'],
        rating: 4.5,
        reviewCount: 234,
        monthSales: 1234,
        stock: 30
      },
      {
        _id: 'p4',
        name: '鸡米花',
        description: '香嫩多汁的鸡米花，外酥内嫩',
        price: 16,
        vipPrice: 14,
        images: ['/static/snack2.jpg'],
        category: 'snacks',
        tags: ['热门'],
        rating: 4.7,
        reviewCount: 178,
        monthSales: 998,
        stock: 25,
        specs: [
          {
            name: '辣度',
            options: [
              { value: '不辣', extraPrice: 0, stock: 25 },
              { value: '微辣', extraPrice: 0, stock: 20 },
              { value: '中辣', extraPrice: 0, stock: 15 },
              { value: '重辣', extraPrice: 2, stock: 10 }
            ]
          }
        ]
      },
      // 果盘类
      {
        _id: 'p5',
        name: '水果拼盘',
        description: '时令新鲜水果精心搭配',
        price: 38,
        vipPrice: 32,
        images: ['/static/fruit1.jpg'],
        category: 'fruits',
        tags: ['健康', '新鲜'],
        rating: 4.9,
        reviewCount: 67,
        monthSales: 234,
        stock: 8
      },
      {
        _id: 'p6',
        name: '进口车厘子',
        description: '智利进口车厘子，香甜多汁',
        price: 88,
        vipPrice: 78,
        images: ['/static/fruit2.jpg'],
        category: 'fruits',
        tags: ['特价', '进口'],
        rating: 4.7,
        reviewCount: 89,
        monthSales: 123,
        stock: 5
      },
      // 酒类
      {
        _id: 'p7',
        name: '青岛啤酒',
        description: '经典青岛啤酒，口感清爽',
        price: 8,
        vipPrice: 6,
        images: ['/static/beer1.jpg'],
        category: 'alcohol',
        tags: ['经典'],
        rating: 4.3,
        reviewCount: 445,
        monthSales: 2345,
        stock: 50
      }
    ]
    
    if (loadMore) {
      productList.value.push(...mockProducts)
    } else {
      productList.value = mockProducts
    }
    
    hasMore.value = currentPage.value < 3 // 模拟3页数据
  } catch (error) {
    console.error('加载商品失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

// 获取显示价格
const getDisplayPrice = (product: any): number => {
  if (userStore.isVip && product.vipPrice) {
    return product.vipPrice
  }
  return product.price
}

// 获取分类商品数量
const getCategoryCount = (categoryId: string): number => {
  if (!categoryId) return 0
  return cartStore.items
    .filter(item => item.dish.category === categoryId)
    .reduce((sum, item) => sum + item.quantity, 0)
}

// 获取购物车中商品数量
const getCartQuantity = (productId: string): number => {
  const item = cartStore.items.find(item => item.dish._id === productId)
  return item ? item.quantity : 0
}

// 获取标签样式类
const getTagClass = (tag: string): string => {
  const tagClasses: Record<string, string> = {
    '热门': 'hot',
    '新品': 'new',
    '特价': 'sale',
    '健康': 'healthy',
    '素食': 'vegetarian',
    '辣味': 'spicy',
    '冰品': 'cold'
  }
  return tagClasses[tag] || 'default'
}

// 搜索相关方法
const onSearchInput = () => {
  if (searchKeyword.value.trim()) {
    // 模拟搜索建议
    searchSuggestions.value = [
      '柠檬茶',
      '蜂蜜茶',
      '气泡水',
      '薯条',
      '水果拼盘'
    ].filter(item => 
      item.includes(searchKeyword.value) && item !== searchKeyword.value
    ).slice(0, 5)
  } else {
    searchSuggestions.value = []
  }
}

const performSearch = () => {
  if (searchKeyword.value.trim()) {
    addToRecentSearches(searchKeyword.value.trim())
    searchSuggestions.value = []
  }
}

const applySuggestion = (suggestion: string) => {
  searchKeyword.value = suggestion
  searchSuggestions.value = []
  performSearch()
}

const addToRecentSearches = (keyword: string) => {
  const recent = [...recentSearches.value]
  const index = recent.indexOf(keyword)
  if (index > -1) {
    recent.splice(index, 1)
  }
  recent.unshift(keyword)
  recentSearches.value = recent.slice(0, 10)
  
  // 保存到本地存储
  uni.setStorageSync('recent_searches', recentSearches.value)
}

const loadRecentSearches = () => {
  try {
    const recent = uni.getStorageSync('recent_searches')
    if (recent) {
      recentSearches.value = recent
    }
  } catch (error) {
    console.error('加载搜索历史失败:', error)
  }
}

// 分类选择
const selectCategory = (categoryId: string) => {
  selectedCategory.value = categoryId
  currentPage.value = 1
  searchSuggestions.value = []
}

// 排序
const changeSortOrder = (sortKey: string) => {
  if (currentSort.value === sortKey) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    currentSort.value = sortKey
    sortDirection.value = 'desc'
  }
}

// 筛选相关方法
const showFilterModal = () => {
  filterPopup.value?.open()
}

const hideFilterModal = () => {
  filterPopup.value?.close()
}

const selectPriceRange = (range: string) => {
  selectedPriceRange.value = selectedPriceRange.value === range ? '' : range
}

const toggleFeature = (feature: string) => {
  const index = selectedFeatures.value.indexOf(feature)
  if (index > -1) {
    selectedFeatures.value.splice(index, 1)
  } else {
    selectedFeatures.value.push(feature)
  }
}

const resetFilters = () => {
  selectedPriceRange.value = ''
  selectedFeatures.value = []
}

const applyFilters = () => {
  hideFilterModal()
  currentPage.value = 1
}

const clearFilters = () => {
  searchKeyword.value = ''
  selectedCategory.value = ''
  resetFilters()
  currentSort.value = 'default'
}

// 商品操作
const viewProductDetail = (product: any) => {
  // 如果有规格，显示规格选择弹窗
  if (product.specs?.length > 0) {
    showSpecsModal(product)
  } else {
    // 否则跳转到商品详情页
    uni.navigateTo({
      url: `/pages/product/detail?id=${product._id}`
    })
  }
}

const quickAddProduct = (product: any) => {
  if (product.stock <= 0) {
    uni.showToast({
      title: '商品已售罄',
      icon: 'none'
    })
    return
  }
  
  cartStore.addItem({
    dish: {
      ...product,
      _id: product._id,
      name: product.name,
      price: getDisplayPrice(product),
      images: product.images,
      category: product.category,
      stock: product.stock
    },
    quantity: 1,
    selectedSpecs: [],
    specialRequests: ''
  })
  
  uni.showToast({
    title: '已添加到购物车',
    icon: 'success'
  })
}

const increaseQuantity = (productId: string) => {
  const product = productList.value.find(p => p._id === productId)
  if (product && product.stock <= getCartQuantity(productId)) {
    uni.showToast({
      title: '库存不足',
      icon: 'none'
    })
    return
  }
  
  cartStore.updateItemQuantity(productId, getCartQuantity(productId) + 1)
}

const decreaseQuantity = (productId: string) => {
  const currentQuantity = getCartQuantity(productId)
  if (currentQuantity > 1) {
    cartStore.updateItemQuantity(productId, currentQuantity - 1)
  } else {
    cartStore.removeItem(productId)
  }
}

// 规格选择相关方法
const showSpecsModal = (product: any) => {
  selectedProduct.value = product
  selectedSpecs.value = {}
  specQuantity.value = 1
  specsPopup.value?.open()
}

const hideSpecsModal = () => {
  specsPopup.value?.close()
  selectedProduct.value = null
  selectedSpecs.value = {}
  specQuantity.value = 1
}

const isSpecSelected = (specName: string, optionValue: string): boolean => {
  return selectedSpecs.value[specName] === optionValue
}

const selectSpec = (specName: string, optionValue: string) => {
  selectedSpecs.value[specName] = optionValue
}

const increaseSpecQuantity = () => {
  if (selectedProduct.value && specQuantity.value < selectedProduct.value.stock) {
    specQuantity.value++
  }
}

const decreaseSpecQuantity = () => {
  if (specQuantity.value > 1) {
    specQuantity.value--
  }
}

const getSpecsTotalPrice = (): string => {
  if (!selectedProduct.value) return '0.00'
  
  let totalPrice = getDisplayPrice(selectedProduct.value)
  
  // 计算规格附加费用
  if (selectedProduct.value.specs) {
    selectedProduct.value.specs.forEach((spec: any) => {
      const selectedOption = selectedSpecs.value[spec.name]
      if (selectedOption) {
        const option = spec.options.find((opt: any) => opt.value === selectedOption)
        if (option && option.extraPrice) {
          totalPrice += option.extraPrice
        }
      }
    })
  }
  
  return (totalPrice * specQuantity.value).toFixed(2)
}

const addSpecsToCart = () => {
  if (!selectedProduct.value || !canAddToCart.value) return
  
  const specsArray = Object.entries(selectedSpecs.value).map(([name, value]) => ({
    name,
    value,
    extraPrice: selectedProduct.value.specs
      .find((spec: any) => spec.name === name)?.options
      .find((opt: any) => opt.value === value)?.extraPrice || 0
  }))
  
  cartStore.addItem({
    dish: {
      ...selectedProduct.value,
      _id: selectedProduct.value._id,
      name: selectedProduct.value.name,
      price: parseFloat(getSpecsTotalPrice()) / specQuantity.value,
      images: selectedProduct.value.images,
      category: selectedProduct.value.category,
      stock: selectedProduct.value.stock
    },
    quantity: specQuantity.value,
    selectedSpecs: specsArray,
    specialRequests: ''
  })
  
  uni.showToast({
    title: '已添加到购物车',
    icon: 'success'
  })
  
  hideSpecsModal()
}

// 购物车相关方法
const showCart = () => {
  showShoppingCart.value = true
}

const hideCart = () => {
  showShoppingCart.value = false
}

const handleCheckout = (checkoutData: any) => {
  hideCart()
  uni.navigateTo({
    url: '/pages/order/confirm?type=scan'
  })
}

const onCartChange = (items: any[]) => {
  // 处理购物车变化
}

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true
  currentPage.value = 1
  await loadProducts()
}

// 加载更多
const loadMore = async () => {
  if (hasMore.value && !isLoading.value) {
    currentPage.value++
    await loadProducts(true)
  }
}

// 生命周期
onMounted(() => {
  initData()
})

onLoad((options) => {
  if (options.category) {
    selectedCategory.value = options.category
  }
  if (options.keyword) {
    searchKeyword.value = options.keyword
  }
})
</script>

<style scoped lang="scss">
.product-catalog-page {
  min-height: 100vh;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.search-header {
  background: white;
  padding: 20rpx 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
  position: relative;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 24rpx;
  overflow: hidden;
}

.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background: transparent;
  border: none;
}

.search-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #999;
}

.filter-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
  position: relative;
}

.filter-icon {
  font-size: 28rpx;
  color: #666;
}

.filter-dot {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 16rpx;
  height: 16rpx;
  background: #ff4444;
  border-radius: 50%;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 32rpx;
  right: 32rpx;
  background: white;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.1);
  z-index: 100;
  max-height: 400rpx;
  overflow-y: auto;
}

.suggestion-item {
  padding: 24rpx 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
}

.suggestion-text {
  font-size: 28rpx;
  color: #333;
}

.category-nav {
  background: white;
  padding: 24rpx 0;
  border-bottom: 2rpx solid #f0f0f0;
}

.category-scroll {
  white-space: nowrap;
}

.category-list {
  display: flex;
  gap: 16rpx;
  padding: 0 32rpx;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  border: 2rpx solid transparent;
  flex-shrink: 0;
  position: relative;
  
  &.active {
    background: rgba(102, 126, 234, 0.1);
    border-color: #667eea;
    
    .category-name {
      color: #667eea;
    }
  }
}

.category-name {
  font-size: 26rpx;
  color: #333;
  white-space: nowrap;
}

.category-badge {
  min-width: 32rpx;
  height: 32rpx;
  background: #ff4444;
  color: white;
  font-size: 18rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.sort-options {
  background: white;
  padding: 16rpx 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.sort-list {
  display: flex;
  gap: 32rpx;
}

.sort-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 0;
  cursor: pointer;
  
  &.active {
    .sort-text {
      color: #667eea;
      font-weight: 600;
    }
  }
}

.sort-text {
  font-size: 26rpx;
  color: #333;
}

.sort-arrow {
  font-size: 20rpx;
  color: #667eea;
}

.product-list {
  flex: 1;
  padding-bottom: 150rpx;
}

.vip-banner {
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.vip-content {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 32rpx;
}

.vip-icon {
  font-size: 24rpx;
  color: #ffeb3b;
}

.vip-text {
  font-size: 26rpx;
  color: white;
  font-weight: 500;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 16rpx 32rpx;
  
  &.list-view {
    grid-template-columns: 1fr;
  }
}

.product-card {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  
  .list-view & {
    flex-direction: row;
    
    .product-image-wrapper {
      width: 200rpx;
      height: 200rpx;
      flex-shrink: 0;
    }
    
    .product-info {
      flex: 1;
      padding: 24rpx;
    }
    
    .product-actions {
      align-self: flex-end;
      margin: 24rpx;
    }
  }
}

.product-image-wrapper {
  position: relative;
  width: 100%;
  height: 280rpx;
  background: #f0f0f0;
}

.product-image {
  width: 100%;
  height: 100%;
}

.product-labels {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.product-label {
  font-size: 18rpx;
  color: white;
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  font-weight: 500;
  
  &.hot {
    background: #ff4444;
  }
  
  &.new {
    background: #00aa00;
  }
  
  &.sale {
    background: #ff9500;
  }
  
  &.healthy {
    background: #4caf50;
  }
  
  &.default {
    background: #999;
  }
}

.vip-mark {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8rpx;
  padding: 4rpx 8rpx;
}

.vip-mark-text {
  font-size: 18rpx;
  color: white;
  font-weight: 600;
}

.stock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stock-text {
  font-size: 32rpx;
  color: white;
  font-weight: 600;
}

.product-info {
  padding: 24rpx;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rating-info {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.rating-stars {
  font-size: 20rpx;
}

.rating-text {
  font-size: 22rpx;
  color: #ff9500;
  font-weight: 500;
}

.rating-count {
  font-size: 20rpx;
  color: #999;
}

.sales-text {
  font-size: 20rpx;
  color: #999;
}

.price-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.current-price {
  font-size: 32rpx;
  font-weight: 600;
  color: #ff4444;
}

.original-price {
  font-size: 24rpx;
  color: #999;
  text-decoration: line-through;
}

.specs-hint {
  font-size: 20rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
}

.stock-warning {
  padding: 8rpx 12rpx;
  background: rgba(255, 165, 0, 0.1);
  border-radius: 8rpx;
  align-self: flex-start;
}

.stock-text {
  font-size: 20rpx;
  color: #ffa500;
}

.product-actions {
  padding: 0 24rpx 24rpx;
  display: flex;
  justify-content: flex-end;
}

.sold-out-btn {
  padding: 12rpx 24rpx;
  background: #ccc;
  color: white;
  border-radius: 24rpx;
}

.add-btn {
  width: 60rpx;
  height: 60rpx;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-icon {
  font-size: 28rpx;
  font-weight: 600;
}

.quantity-control {
  display: flex;
  align-items: center;
  border: 2rpx solid #e0e0e0;
  border-radius: 24rpx;
  overflow: hidden;
}

.quantity-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.btn-text {
  font-size: 24rpx;
  color: #333;
}

.quantity-text {
  min-width: 48rpx;
  text-align: center;
  font-size: 24rpx;
  color: #333;
  background: white;
  padding: 0 8rpx;
}

.specs-btn {
  padding: 12rpx 24rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
}

.specs-text {
  font-size: 24rpx;
  color: white;
}

.load-more {
  text-align: center;
  padding: 32rpx;
}

.load-text {
  font-size: 26rpx;
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

.empty-title {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
}

.empty-desc {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.5;
}

.empty-btn {
  padding: 16rpx 32rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  font-size: 26rpx;
  border: none;
}

.bottom-spacer {
  height: 150rpx;
}

.cart-float {
  position: fixed;
  bottom: 32rpx;
  left: 32rpx;
  right: 32rpx;
  z-index: 100;
}

.cart-content {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  background: #667eea;
  border-radius: 24rpx;
  color: white;
}

.cart-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.cart-count {
  min-width: 40rpx;
  height: 40rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
}

.cart-amount {
  font-size: 28rpx;
  font-weight: 600;
}

.cart-text {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
}

// 筛选弹窗样式
.filter-modal {
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

.filter-reset {
  font-size: 26rpx;
  color: #667eea;
}

.filter-content {
  padding: 32rpx;
  max-height: 60vh;
  overflow-y: auto;
}

.filter-section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
  display: block;
}

.price-range,
.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.price-item,
.feature-item {
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  border: 2rpx solid transparent;
  
  &.active {
    background: rgba(102, 126, 234, 0.1);
    border-color: #667eea;
    
    .price-text,
    .feature-text {
      color: #667eea;
    }
  }
}

.price-text,
.feature-text {
  font-size: 26rpx;
  color: #333;
}

.filter-actions {
  display: flex;
  border-top: 2rpx solid #f0f0f0;
}

.filter-btn {
  flex: 1;
  height: 88rpx;
  border: none;
  font-size: 28rpx;
  
  &.cancel {
    background: #f5f5f5;
    color: #666;
  }
  
  &.confirm {
    background: #667eea;
    color: white;
  }
}

// 规格选择弹窗样式
.specs-modal {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.specs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.product-summary {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.summary-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
}

.summary-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.summary-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.summary-price {
  font-size: 32rpx;
  font-weight: 600;
  color: #ff4444;
}

.specs-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.specs-content {
  padding: 32rpx;
  max-height: 50vh;
  overflow-y: auto;
}

.spec-group {
  margin-bottom: 32rpx;
}

.spec-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.spec-option {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: #f5f5f5;
  border-radius: 24rpx;
  border: 2rpx solid transparent;
  position: relative;
  
  &.active {
    background: rgba(102, 126, 234, 0.1);
    border-color: #667eea;
    
    .option-text {
      color: #667eea;
    }
  }
  
  &.disabled {
    background: #f0f0f0;
    color: #ccc;
  }
}

.option-text {
  font-size: 26rpx;
  color: #333;
}

.option-price {
  font-size: 22rpx;
  color: #ff4444;
}

.option-stock {
  font-size: 20rpx;
  color: #999;
}

.quantity-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 32rpx;
}

.quantity-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.quantity-selector {
  display: flex;
  align-items: center;
  border: 2rpx solid #e0e0e0;
  border-radius: 24rpx;
  overflow: hidden;
}

.specs-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-top: 2rpx solid #f0f0f0;
}

.specs-summary {
  flex: 1;
}

.total-price {
  font-size: 28rpx;
  font-weight: 600;
  color: #ff4444;
}

.add-cart-btn {
  padding: 16rpx 32rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  font-size: 28rpx;
  border: none;
  
  &:disabled {
    background: #ccc;
  }
}
</style>
