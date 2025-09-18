<template>
  <view class="products-container">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="header-title">
        <text class="title-text">🍽️ 菜单管理</text>
        <text class="subtitle-text">{{ totalProducts }} 个商品 | {{ availableCount }} 在售</text>
      </view>
      <view class="header-actions">
        <button class="action-btn" @click="handleAddProduct">
          <text class="btn-icon">➕</text>
          <text class="btn-text">新增商品</text>
        </button>
      </view>
    </view>
    
    <!-- 搜索和筛选 -->
    <view class="search-section">
      <view class="search-bar">
        <input
          v-model="searchKeyword"
          class="search-input"
          type="text"
          placeholder="搜索商品名称、分类..."
          @input="handleSearch"
        />
        <button class="search-btn" @click="handleSearch">
          <text class="search-icon">🔍</text>
        </button>
      </view>
      
      <view class="filter-actions">
        <button class="filter-btn" @click="showCategoryFilter = true">
          <text class="filter-icon">🏷️</text>
          <text class="filter-text">{{ selectedCategory || '全部分类' }}</text>
        </button>
        <button class="filter-btn" @click="showStatusFilter = true">
          <text class="filter-icon">📊</text>
          <text class="filter-text">{{ selectedStatus || '全部状态' }}</text>
        </button>
        <button class="filter-btn" @click="showSortFilter = true">
          <text class="filter-icon">⬆️⬇️</text>
          <text class="filter-text">排序</text>
        </button>
      </view>
    </view>
    
    <!-- 分类导航 -->
    <scroll-view class="category-nav" scroll-x>
      <view
        v-for="category in categories"
        :key="category.id"
        class="category-item"
        :class="{ 'active': activeCategory === category.id }"
        @click="handleCategoryFilter(category.id)"
      >
        <text class="category-icon">{{ category.icon }}</text>
        <text class="category-name">{{ category.name }}</text>
        <text class="category-count">{{ category.products.length }}</text>
      </view>
    </scroll-view>
    
    <!-- 商品列表 -->
    <scroll-view class="products-list" scroll-y refresher-enabled @refresherrefresh="handleRefresh">
      <view
        v-for="product in filteredProducts"
        :key="product.id"
        class="product-card"
        @click="handleProductDetail(product)"
      >
        <!-- 商品图片 -->
        <view class="product-image-section">
          <image
            class="product-image"
            :src="product.images[0] || '/static/images/default-product.png'"
            mode="aspectFill"
          />
          <view class="product-status" :class="product.status">
            <text class="status-text">{{ getProductStatusText(product.status) }}</text>
          </view>
          <view v-if="product.originalPrice && product.originalPrice > product.price" class="discount-badge">
            <text class="discount-text">{{ Math.round((1 - product.price / product.originalPrice) * 100) }}% OFF</text>
          </view>
        </view>
        
        <!-- 商品信息 -->
        <view class="product-info">
          <view class="product-header">
            <text class="product-name">{{ product.name }}</text>
            <view class="product-rating">
              <text class="rating-icon">⭐</text>
              <text class="rating-value">{{ product.rating.toFixed(1) }}</text>
            </view>
          </view>
          
          <text class="product-desc">{{ product.description || '暂无描述' }}</text>
          
          <view class="product-tags" v-if="product.tags.length > 0">
            <text
              v-for="tag in product.tags.slice(0, 3)"
              :key="tag"
              class="product-tag"
            >
              {{ tag }}
            </text>
          </view>
          
          <view class="product-meta">
            <view class="price-section">
              <text class="current-price">¥{{ product.price.toFixed(2) }}</text>
              <text v-if="product.originalPrice && product.originalPrice > product.price" class="original-price">
                ¥{{ product.originalPrice.toFixed(2) }}
              </text>
            </view>
            <view class="sales-info">
              <text class="sales-count">已售 {{ product.salesCount }}</text>
              <text class="stock-count" :class="{ 'low-stock': product.stock < 10 }">
                库存 {{ product.stock }}
              </text>
            </view>
          </view>
        </view>
        
        <!-- 快速操作 -->
        <view class="product-actions">
          <button
            class="action-btn quick-edit"
            @click.stop="handleQuickEdit(product)"
          >
            <text class="btn-icon">✏️</text>
          </button>
          <button
            class="action-btn toggle-status"
            :class="product.status"
            @click.stop="handleToggleStatus(product)"
          >
            <text class="btn-icon">{{ product.status === 'available' ? '⏸️' : '▶️' }}</text>
          </button>
          <button
            class="action-btn stock-manage"
            @click.stop="handleStockManage(product)"
          >
            <text class="btn-icon">📦</text>
          </button>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view v-if="filteredProducts.length === 0" class="empty-state">
        <text class="empty-icon">🍽️</text>
        <text class="empty-title">暂无商品</text>
        <text class="empty-desc">{{ searchKeyword ? '没有找到相关商品' : '还没有添加任何商品' }}</text>
        <button class="empty-action" @click="handleAddProduct">
          <text class="btn-text">{{ searchKeyword ? '清空搜索' : '添加第一个商品' }}</text>
        </button>
      </view>
      
      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="loadMoreProducts">
        <text class="load-text">{{ isLoading ? '加载中...' : '加载更多' }}</text>
      </view>
    </scroll-view>
    
    <!-- 分类筛选弹窗 -->
    <uni-popup ref="categoryPopup" v-model:show="showCategoryFilter" type="bottom">
      <view class="filter-container">
        <view class="filter-header">
          <text class="filter-title">选择分类</text>
          <button class="filter-close" @click="showCategoryFilter = false">✕</button>
        </view>
        <view class="filter-list">
          <view
            v-for="category in categories"
            :key="category.id"
            class="filter-item"
            :class="{ 'active': selectedCategory === category.name }"
            @click="selectCategory(category.name)"
          >
            <text class="filter-icon">{{ category.icon }}</text>
            <text class="filter-name">{{ category.name }}</text>
            <text class="filter-count">{{ category.products.length }}</text>
          </view>
        </view>
      </view>
    </uni-popup>
    
    <!-- 状态筛选弹窗 -->
    <uni-popup ref="statusPopup" v-model:show="showStatusFilter" type="bottom">
      <view class="filter-container">
        <view class="filter-header">
          <text class="filter-title">选择状态</text>
          <button class="filter-close" @click="showStatusFilter = false">✕</button>
        </view>
        <view class="filter-list">
          <view
            v-for="status in productStatuses"
            :key="status.value"
            class="filter-item"
            :class="{ 'active': selectedStatus === status.label }"
            @click="selectStatus(status.label)"
          >
            <text class="filter-icon">{{ status.icon }}</text>
            <text class="filter-name">{{ status.label }}</text>
            <text class="filter-count">{{ status.count }}</text>
          </view>
        </view>
      </view>
    </uni-popup>
    
    <!-- 排序筛选弹窗 -->
    <uni-popup ref="sortPopup" v-model:show="showSortFilter" type="bottom">
      <view class="filter-container">
        <view class="filter-header">
          <text class="filter-title">排序方式</text>
          <button class="filter-close" @click="showSortFilter = false">✕</button>
        </view>
        <view class="filter-list">
          <view
            v-for="sort in sortOptions"
            :key="sort.value"
            class="filter-item"
            :class="{ 'active': selectedSort === sort.value }"
            @click="selectSort(sort.value)"
          >
            <text class="filter-icon">{{ sort.icon }}</text>
            <text class="filter-name">{{ sort.label }}</text>
          </view>
        </view>
      </view>
    </uni-popup>
    
    <!-- 快速编辑弹窗 -->
    <uni-popup ref="quickEditPopup" v-model:show="showQuickEdit" type="center">
      <view class="quick-edit-modal">
        <view class="edit-header">
          <text class="edit-title">快速编辑 - {{ editingProduct?.name }}</text>
          <button class="edit-close" @click="showQuickEdit = false">✕</button>
        </view>
        <view class="edit-content">
          <view class="edit-item">
            <text class="edit-label">价格</text>
            <input
              v-model="editForm.price"
              class="edit-input"
              type="number"
              placeholder="商品价格"
            />
          </view>
          <view class="edit-item">
            <text class="edit-label">库存</text>
            <input
              v-model="editForm.stock"
              class="edit-input"
              type="number"
              placeholder="库存数量"
            />
          </view>
          <view class="edit-item">
            <text class="edit-label">状态</text>
            <picker @change="handleStatusChange" :value="editStatusIndex" :range="statusOptions">
              <view class="picker-view">
                {{ statusOptions[editStatusIndex] }}
              </view>
            </picker>
          </view>
        </view>
        <view class="edit-actions">
          <button class="edit-btn cancel" @click="showQuickEdit = false">取消</button>
          <button class="edit-btn confirm" @click="handleSaveEdit">保存</button>
        </view>
      </view>
    </uni-popup>
    
    <!-- 底部工具栏 -->
    <view class="toolbar">
      <button class="tool-btn" @click="handleBatchManage">
        <text class="btn-icon">📝</text>
        <text class="btn-text">批量管理</text>
      </button>
      <button class="tool-btn" @click="handleCategoryManage">
        <text class="btn-icon">🏷️</text>
        <text class="btn-text">分类管理</text>
      </button>
      <button class="tool-btn" @click="handleExport">
        <text class="btn-icon">📊</text>
        <text class="btn-text">导出数据</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onPullDownRefresh } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Product, ProductCategory, ProductFilter } from '@/types'

// Store
const authStore = useAuthStore()

// 响应式数据
const products = ref<Product[]>([])
const categories = ref<ProductCategory[]>([])
const totalProducts = ref(0)
const activeCategory = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const selectedSort = ref('created_desc')
const searchKeyword = ref('')
const isLoading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const pageSize = 20

// 弹窗控制
const showCategoryFilter = ref(false)
const showStatusFilter = ref(false)
const showSortFilter = ref(false)
const showQuickEdit = ref(false)

// 编辑表单
const editingProduct = ref<Product | null>(null)
const editForm = ref({
  price: '',
  stock: '',
  status: ''
})
const editStatusIndex = ref(0)

// 配置数据
const productStatuses = ref([
  { value: '', label: '全部状态', icon: '📦', count: 0 },
  { value: 'available', label: '在售', icon: '✅', count: 0 },
  { value: 'unavailable', label: '下架', icon: '❌', count: 0 },
  { value: 'out_of_stock', label: '缺货', icon: '📋', count: 0 }
])

const sortOptions = ref([
  { value: 'created_desc', label: '最新添加', icon: '🆕' },
  { value: 'created_asc', label: '最早添加', icon: '⏰' },
  { value: 'price_desc', label: '价格由高到低', icon: '💰' },
  { value: 'price_asc', label: '价格由低到高', icon: '💲' },
  { value: 'sales_desc', label: '销量由高到低', icon: '🔥' },
  { value: 'rating_desc', label: '评分由高到低', icon: '⭐' }
])

const statusOptions = ['在售', '下架', '缺货']

// 计算属性
const filteredProducts = computed(() => {
  let filtered = products.value

  // 按分类筛选
  if (activeCategory.value && activeCategory.value !== 'all') {
    const category = categories.value.find(cat => cat.id === activeCategory.value)
    if (category) {
      filtered = category.products
    }
  }

  // 按状态筛选
  if (selectedStatus.value && selectedStatus.value !== '全部状态') {
    const statusValue = productStatuses.value.find(s => s.label === selectedStatus.value)?.value
    if (statusValue) {
      filtered = filtered.filter(product => product.status === statusValue)
    }
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(product =>
      product.name.toLowerCase().includes(keyword) ||
      product.description?.toLowerCase().includes(keyword) ||
      product.tags.some(tag => tag.toLowerCase().includes(keyword))
    )
  }

  // 排序
  filtered = sortProducts(filtered, selectedSort.value)

  return filtered
})

const availableCount = computed(() => {
  return products.value.filter(product => product.status === 'available').length
})

// 方法
const getProductStatusText = (status: string) => {
  const statusMap = {
    'available': '在售',
    'unavailable': '下架',
    'out_of_stock': '缺货'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const sortProducts = (products: Product[], sortValue: string) => {
  const sorted = [...products]
  
  switch (sortValue) {
    case 'created_desc':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case 'created_asc':
      return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price)
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price)
    case 'sales_desc':
      return sorted.sort((a, b) => b.salesCount - a.salesCount)
    case 'rating_desc':
      return sorted.sort((a, b) => b.rating - a.rating)
    default:
      return sorted
  }
}

// 事件处理
const handleSearch = () => {
  // 搜索逻辑已在computed中处理
}

const handleCategoryFilter = (categoryId: string) => {
  activeCategory.value = categoryId
}

const selectCategory = (categoryName: string) => {
  selectedCategory.value = categoryName
  showCategoryFilter.value = false
}

const selectStatus = (statusLabel: string) => {
  selectedStatus.value = statusLabel
  showStatusFilter.value = false
}

const selectSort = (sortValue: string) => {
  selectedSort.value = sortValue
  showSortFilter.value = false
}

const handleAddProduct = () => {
  if (searchKeyword.value) {
    searchKeyword.value = ''
    return
  }
  uni.navigateTo({
    url: '/pages/products/create'
  })
}

const handleProductDetail = (product: Product) => {
  uni.navigateTo({
    url: `/pages/products/detail?id=${product.id}`
  })
}

const handleQuickEdit = (product: Product) => {
  editingProduct.value = product
  editForm.value = {
    price: product.price.toString(),
    stock: product.stock.toString(),
    status: getProductStatusText(product.status)
  }
  editStatusIndex.value = statusOptions.indexOf(getProductStatusText(product.status))
  showQuickEdit.value = true
}

const handleStatusChange = (e: any) => {
  editStatusIndex.value = e.detail.value
  editForm.value.status = statusOptions[e.detail.value]
}

const handleSaveEdit = async () => {
  if (!editingProduct.value) return
  
  try {
    const updateData = {
      price: parseFloat(editForm.value.price),
      stock: parseInt(editForm.value.stock),
      status: getStatusValueFromText(editForm.value.status)
    }
    
    await updateProduct(editingProduct.value.id, updateData)
    
    // 更新本地数据
    const productIndex = products.value.findIndex(p => p.id === editingProduct.value!.id)
    if (productIndex !== -1) {
      products.value[productIndex] = {
        ...products.value[productIndex],
        ...updateData
      }
    }
    
    showQuickEdit.value = false
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '保存失败',
      icon: 'none'
    })
  }
}

const getStatusValueFromText = (statusText: string) => {
  const statusMap: Record<string, string> = {
    '在售': 'available',
    '下架': 'unavailable',
    '缺货': 'out_of_stock'
  }
  return statusMap[statusText] || 'available'
}

const handleToggleStatus = async (product: Product) => {
  const newStatus = product.status === 'available' ? 'unavailable' : 'available'
  
  try {
    await updateProduct(product.id, { status: newStatus })
    
    // 更新本地状态
    const productIndex = products.value.findIndex(p => p.id === product.id)
    if (productIndex !== -1) {
      products.value[productIndex].status = newStatus as any
    }
    
    uni.showToast({
      title: newStatus === 'available' ? '已上架' : '已下架',
      icon: 'success'
    })
  } catch (error) {
    uni.showToast({
      title: '操作失败',
      icon: 'none'
    })
  }
}

const handleStockManage = (product: Product) => {
  uni.showModal({
    title: '库存管理',
    content: `当前库存：${product.stock}`,
    editable: true,
    placeholderText: '输入新库存数量',
    success: async (res) => {
      if (res.confirm && res.content) {
        const newStock = parseInt(res.content)
        if (!isNaN(newStock) && newStock >= 0) {
          try {
            await updateProduct(product.id, { stock: newStock })
            
            // 更新本地库存
            const productIndex = products.value.findIndex(p => p.id === product.id)
            if (productIndex !== -1) {
              products.value[productIndex].stock = newStock
            }
            
            uni.showToast({
              title: '库存更新成功',
              icon: 'success'
            })
          } catch (error) {
            uni.showToast({
              title: '更新失败',
              icon: 'none'
            })
          }
        } else {
          uni.showToast({
            title: '请输入有效的库存数量',
            icon: 'none'
          })
        }
      }
    }
  })
}

const handleRefresh = async () => {
  currentPage.value = 1
  await loadProducts()
  uni.stopPullDownRefresh()
}

const loadMoreProducts = () => {
  if (!isLoading.value && hasMore.value) {
    currentPage.value++
    loadProducts(false)
  }
}

const handleBatchManage = () => {
  uni.showActionSheet({
    itemList: ['批量上架', '批量下架', '批量调价', '批量删除'],
    success: (res) => {
      console.log('选择了：', res.tapIndex)
      // 实现批量操作逻辑
    }
  })
}

const handleCategoryManage = () => {
  uni.navigateTo({
    url: '/pages/products/categories'
  })
}

const handleExport = () => {
  uni.showToast({
    title: '导出功能开发中',
    icon: 'none'
  })
}

// API方法
const loadProducts = async (reset = true) => {
  if (isLoading.value) return
  
  isLoading.value = true
  
  try {
    const filter: ProductFilter = {
      page: currentPage.value,
      pageSize: pageSize,
      sortBy: selectedSort.value.split('_')[0] as any,
      sortOrder: selectedSort.value.split('_')[1] as any
    }
    
    if (selectedCategory.value && selectedCategory.value !== '全部分类') {
      filter.category = selectedCategory.value
    }
    
    if (selectedStatus.value && selectedStatus.value !== '全部状态') {
      const statusValue = productStatuses.value.find(s => s.label === selectedStatus.value)?.value
      if (statusValue) {
        filter.status = [statusValue]
      }
    }
    
    if (searchKeyword.value) {
      filter.searchKeyword = searchKeyword.value
    }
    
    const response = await uni.request({
      url: '/api/merchant/products',
      method: 'GET',
      data: filter,
      header: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    
    if (response.data.code === 200) {
      const { items, total, totalPages } = response.data.data
      
      if (reset) {
        products.value = items
      } else {
        products.value.push(...items)
      }
      
      totalProducts.value = total
      hasMore.value = currentPage.value < totalPages
      
      updateStatusCounts()
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    // 使用模拟数据
    if (reset) {
      products.value = getMockProducts()
      categories.value = getMockCategories()
      totalProducts.value = products.value.length
      updateStatusCounts()
    }
  } finally {
    isLoading.value = false
  }
}

const updateProduct = async (productId: string, updateData: any) => {
  const response = await uni.request({
    url: `/api/merchant/products/${productId}`,
    method: 'PUT',
    data: updateData,
    header: {
      'Authorization': `Bearer ${authStore.token}`
    }
  })
  
  if (response.data.code !== 200) {
    throw new Error(response.data.message)
  }
  
  return response.data.data
}

const updateStatusCounts = () => {
  productStatuses.value.forEach(statusItem => {
    if (statusItem.value === '') {
      statusItem.count = products.value.length
    } else {
      statusItem.count = products.value.filter(product => product.status === statusItem.value).length
    }
  })
}

const getMockProducts = (): Product[] => {
  return [
    {
      id: '1',
      name: '精美果盘',
      category: '水果小食',
      price: 68.00,
      originalPrice: 88.00,
      description: '新鲜时令水果精心搭配',
      images: ['/static/images/fruit-plate.jpg'],
      status: 'available',
      stock: 50,
      specifications: [],
      tags: ['新鲜', '健康', '精美'],
      salesCount: 128,
      rating: 4.8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      name: '招牌炒饭',
      category: '主食',
      price: 32.00,
      description: '经典招牌炒饭，香气扑鼻',
      images: ['/static/images/fried-rice.jpg'],
      status: 'available',
      stock: 20,
      specifications: [],
      tags: ['招牌', '经典', '香炒'],
      salesCount: 256,
      rating: 4.6,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      name: '特色饮品套装',
      category: '饮品',
      price: 45.00,
      description: '多种特色饮品组合',
      images: ['/static/images/drinks-set.jpg'],
      status: 'out_of_stock',
      stock: 0,
      specifications: [],
      tags: ['特色', '组合', '畅饮'],
      salesCount: 89,
      rating: 4.5,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
}

const getMockCategories = (): ProductCategory[] => {
  return [
    {
      id: 'all',
      name: '全部',
      icon: '🍽️',
      sort: 0,
      products: products.value
    },
    {
      id: 'fruit',
      name: '水果小食',
      icon: '🍓',
      sort: 1,
      products: products.value.filter(p => p.category === '水果小食')
    },
    {
      id: 'main',
      name: '主食',
      icon: '🍚',
      sort: 2,
      products: products.value.filter(p => p.category === '主食')
    },
    {
      id: 'drink',
      name: '饮品',
      icon: '🥤',
      sort: 3,
      products: products.value.filter(p => p.category === '饮品')
    }
  ]
}

// 生命周期
onMounted(() => {
  loadProducts()
})

onPullDownRefresh(() => {
  handleRefresh()
})
</script>

<style lang="scss" scoped>
.products-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 120rpx;
}

.page-header {
  background: white;
  padding: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1rpx solid #eee;
  
  .header-title {
    .title-text {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
      display: block;
      margin-bottom: 8rpx;
    }
    
    .subtitle-text {
      font-size: 24rpx;
      color: #666;
    }
  }
  
  .header-actions {
    .action-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12rpx;
      padding: 16rpx 24rpx;
      display: flex;
      align-items: center;
      
      .btn-icon {
        font-size: 24rpx;
        margin-right: 8rpx;
      }
      
      .btn-text {
        font-size: 26rpx;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}

.search-section {
  background: white;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #eee;
  
  .search-bar {
    display: flex;
    margin-bottom: 20rpx;
    
    .search-input {
      flex: 1;
      padding: 16rpx 20rpx;
      background: #f8f9fa;
      border: 1rpx solid #e9ecef;
      border-radius: 8rpx;
      font-size: 28rpx;
      margin-right: 16rpx;
      
      &::placeholder {
        color: #aaa;
      }
    }
    
    .search-btn {
      width: 80rpx;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 8rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .search-icon {
        font-size: 28rpx;
        color: white;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
  
  .filter-actions {
    display: flex;
    gap: 16rpx;
    
    .filter-btn {
      padding: 12rpx 16rpx;
      background: #f8f9fa;
      border: 1rpx solid #e9ecef;
      border-radius: 8rpx;
      display: flex;
      align-items: center;
      
      .filter-icon {
        font-size: 22rpx;
        margin-right: 8rpx;
      }
      
      .filter-text {
        font-size: 24rpx;
        color: #666;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}

.category-nav {
  background: white;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #eee;
  
  .category-item {
    display: inline-block;
    padding: 16rpx 20rpx;
    margin-right: 16rpx;
    background: #f5f5f5;
    border-radius: 20rpx;
    text-align: center;
    min-width: 120rpx;
    
    .category-icon {
      display: block;
      font-size: 32rpx;
      margin-bottom: 8rpx;
    }
    
    .category-name {
      display: block;
      font-size: 24rpx;
      color: #666;
      margin-bottom: 4rpx;
    }
    
    .category-count {
      font-size: 20rpx;
      color: #999;
    }
    
    &.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      
      .category-name,
      .category-count {
        color: white;
      }
    }
    
    &:active {
      opacity: 0.8;
    }
  }
}

.products-list {
  flex: 1;
  padding: 20rpx 30rpx;
  
  .product-card {
    background: white;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
    position: relative;
    
    .product-image-section {
      position: relative;
      height: 200rpx;
      
      .product-image {
        width: 100%;
        height: 100%;
      }
      
      .product-status {
        position: absolute;
        top: 16rpx;
        left: 16rpx;
        padding: 6rpx 12rpx;
        border-radius: 8rpx;
        font-size: 22rpx;
        
        &.available {
          background: rgba(82, 196, 26, 0.9);
          color: white;
        }
        
        &.unavailable {
          background: rgba(245, 34, 45, 0.9);
          color: white;
        }
        
        &.out_of_stock {
          background: rgba(250, 140, 22, 0.9);
          color: white;
        }
      }
      
      .discount-badge {
        position: absolute;
        top: 16rpx;
        right: 16rpx;
        background: #ff4757;
        color: white;
        padding: 6rpx 12rpx;
        border-radius: 8rpx;
        font-size: 20rpx;
      }
    }
    
    .product-info {
      padding: 20rpx;
      
      .product-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12rpx;
        
        .product-name {
          font-size: 28rpx;
          font-weight: bold;
          color: #333;
          flex: 1;
        }
        
        .product-rating {
          display: flex;
          align-items: center;
          
          .rating-icon {
            font-size: 22rpx;
            margin-right: 6rpx;
          }
          
          .rating-value {
            font-size: 24rpx;
            color: #fa8c16;
            font-weight: bold;
          }
        }
      }
      
      .product-desc {
        font-size: 24rpx;
        color: #666;
        line-height: 1.4;
        margin-bottom: 16rpx;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
      }
      
      .product-tags {
        margin-bottom: 16rpx;
        
        .product-tag {
          display: inline-block;
          padding: 4rpx 8rpx;
          background: #f0f8ff;
          color: #1890ff;
          font-size: 20rpx;
          border-radius: 6rpx;
          margin-right: 8rpx;
        }
      }
      
      .product-meta {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        
        .price-section {
          .current-price {
            font-size: 32rpx;
            font-weight: bold;
            color: #f5222d;
            margin-right: 12rpx;
          }
          
          .original-price {
            font-size: 24rpx;
            color: #999;
            text-decoration: line-through;
          }
        }
        
        .sales-info {
          text-align: right;
          
          .sales-count,
          .stock-count {
            display: block;
            font-size: 22rpx;
            color: #666;
            margin-bottom: 4rpx;
          }
          
          .stock-count.low-stock {
            color: #f5222d;
          }
        }
      }
    }
    
    .product-actions {
      position: absolute;
      top: 20rpx;
      right: 20rpx;
      display: flex;
      flex-direction: column;
      gap: 8rpx;
      
      .action-btn {
        width: 56rpx;
        height: 56rpx;
        border-radius: 50%;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
        
        .btn-icon {
          font-size: 24rpx;
        }
        
        &.quick-edit {
          background: #1890ff;
          color: white;
        }
        
        &.toggle-status {
          &.available {
            background: #fa8c16;
            color: white;
          }
          
          &.unavailable {
            background: #52c41a;
            color: white;
          }
          
          &.out_of_stock {
            background: #52c41a;
            color: white;
          }
        }
        
        &.stock-manage {
          background: #722ed1;
          color: white;
        }
        
        &:active {
          opacity: 0.8;
          transform: scale(0.95);
        }
      }
    }
    
    &:active {
      opacity: 0.9;
    }
  }
  
  .empty-state {
    text-align: center;
    padding: 120rpx 60rpx;
    
    .empty-icon {
      display: block;
      font-size: 120rpx;
      margin-bottom: 30rpx;
      opacity: 0.3;
    }
    
    .empty-title {
      display: block;
      font-size: 32rpx;
      color: #333;
      margin-bottom: 16rpx;
    }
    
    .empty-desc {
      display: block;
      font-size: 26rpx;
      color: #666;
      margin-bottom: 40rpx;
    }
    
    .empty-action {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12rpx;
      padding: 20rpx 40rpx;
      
      .btn-text {
        font-size: 28rpx;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
  
  .load-more {
    text-align: center;
    padding: 40rpx;
    
    .load-text {
      font-size: 26rpx;
      color: #666;
    }
    
    &:active {
      opacity: 0.7;
    }
  }
}

.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 20rpx 30rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.1);
  
  .tool-btn {
    flex: 1;
    background: #f8f9fa;
    border: none;
    border-radius: 12rpx;
    padding: 20rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .btn-icon {
      font-size: 32rpx;
      margin-bottom: 8rpx;
    }
    
    .btn-text {
      font-size: 24rpx;
      color: #666;
    }
    
    &:active {
      opacity: 0.7;
      transform: scale(0.95);
    }
  }
}

// 弹窗样式
.filter-container {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  
  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #eee;
    
    .filter-title {
      font-size: 32rpx;
      font-weight: bold;
      color: #333;
    }
    
    .filter-close {
      background: none;
      border: none;
      font-size: 32rpx;
      color: #666;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
  
  .filter-list {
    padding: 20rpx 30rpx;
    max-height: 600rpx;
    overflow-y: auto;
    
    .filter-item {
      display: flex;
      align-items: center;
      padding: 24rpx 0;
      border-bottom: 1rpx solid #f0f0f0;
      
      .filter-icon {
        font-size: 32rpx;
        margin-right: 20rpx;
      }
      
      .filter-name {
        flex: 1;
        font-size: 28rpx;
        color: #333;
      }
      
      .filter-count {
        font-size: 24rpx;
        color: #999;
      }
      
      &.active {
        background: #f0f8ff;
        
        .filter-name {
          color: #1890ff;
          font-weight: bold;
        }
      }
      
      &:active {
        opacity: 0.7;
      }
      
      &:last-child {
        border-bottom: none;
      }
    }
  }
}

.quick-edit-modal {
  background: white;
  border-radius: 16rpx;
  padding: 40rpx;
  width: 600rpx;
  
  .edit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .edit-title {
      font-size: 28rpx;
      font-weight: bold;
      color: #333;
    }
    
    .edit-close {
      background: none;
      border: none;
      font-size: 32rpx;
      color: #666;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
  
  .edit-content {
    .edit-item {
      margin-bottom: 30rpx;
      
      .edit-label {
        display: block;
        font-size: 26rpx;
        color: #333;
        margin-bottom: 16rpx;
      }
      
      .edit-input {
        width: 100%;
        padding: 20rpx;
        border: 1rpx solid #e9ecef;
        border-radius: 8rpx;
        font-size: 28rpx;
        
        &::placeholder {
          color: #aaa;
        }
      }
      
      .picker-view {
        padding: 20rpx;
        border: 1rpx solid #e9ecef;
        border-radius: 8rpx;
        font-size: 28rpx;
        color: #333;
        background: #f8f9fa;
      }
    }
  }
  
  .edit-actions {
    display: flex;
    gap: 20rpx;
    
    .edit-btn {
      flex: 1;
      padding: 20rpx;
      border-radius: 8rpx;
      font-size: 28rpx;
      border: none;
      
      &.cancel {
        background: #f8f9fa;
        color: #666;
        border: 1rpx solid #e9ecef;
      }
      
      &.confirm {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      &:active {
        opacity: 0.8;
      }
    }
  }
}
</style>
