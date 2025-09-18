<!--
  扫码点单页面
  @description 按设计稿实现二维码扫描、空间定位、商品目录展示，添加智能推荐和用户等级价格显示
-->
<template>
  <view class="scan-order-page">
    <!-- 顶部导航栏 -->
    <view class="navbar">
      <view class="nav-left">
        <view class="nav-btn" @click="goBack">
          <text class="nav-icon">←</text>
        </view>
        <text class="nav-title">扫码点单</text>
      </view>
      <view class="nav-right">
        <view class="nav-btn" @click="showHelp">
          <text class="nav-icon">❓</text>
        </view>
      </view>
    </view>

    <!-- 扫码状态和结果 -->
    <view v-if="!isScanned" class="scan-section">
      <!-- 扫码指引 -->
      <view class="scan-guide">
        <view class="guide-icon">📷</view>
        <text class="guide-title">扫描桌面二维码开始点单</text>
        <text class="guide-desc">将手机对准桌面二维码，自动识别空间信息</text>
      </view>
      
      <!-- 扫码按钮 -->
      <view class="scan-actions">
        <button class="scan-btn" @click="startScan">
          <text class="btn-text">开始扫码</text>
        </button>
        <button class="manual-btn" @click="showManualInput">
          手动输入空间编号
        </button>
      </view>
    </view>

    <!-- 扫码成功后的内容 -->
    <view v-else class="order-content">
      <!-- 空间信息卡片 -->
      <view class="space-card">
        <view class="space-header">
          <image 
            :src="spaceInfo.images?.[0] || '/static/placeholder-room.png'"
            class="space-image"
            mode="aspectFill"
          />
          <view class="space-details">
            <text class="space-name">{{ spaceInfo.name }}</text>
            <text class="space-type">{{ spaceInfo.type }}</text>
            <view class="space-meta">
              <text class="meta-item">{{ storeInfo.name }}</text>
              <text class="meta-divider">|</text>
              <text class="meta-item">桌号：{{ tableNumber }}</text>
            </view>
          </view>
          <view class="space-status">
            <text class="status-text">使用中</text>
          </view>
        </view>
        
        <!-- 用户等级提示 -->
        <view v-if="userStore.isVip" class="vip-notice">
          <text class="vip-icon">👑</text>
          <text class="vip-text">VIP会员享受专属价格</text>
        </view>
      </view>

      <!-- 商品分类导航 -->
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
              <text v-if="getCategoryCount(category.id) > 0" class="category-count">
                {{ getCategoryCount(category.id) }}
              </text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 商品列表 -->
      <scroll-view 
        class="product-list"
        scroll-y
        refresher-enabled
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
      >
        <!-- 推荐商品 -->
        <view v-if="recommendProducts.length > 0 && selectedCategory === ''" class="recommend-section">
          <view class="section-header">
            <text class="section-title">为您推荐</text>
            <text class="section-subtitle">基于您的喜好</text>
          </view>
          
          <view class="recommend-grid">
            <view 
              v-for="product in recommendProducts"
              :key="product._id"
              class="recommend-item"
              @click="viewProduct(product)"
            >
              <image 
                :src="product.images?.[0] || '/static/placeholder-dish.png'"
                class="recommend-image"
                mode="aspectFill"
              />
              <view class="recommend-info">
                <text class="recommend-name">{{ product.name }}</text>
                <text class="recommend-price">¥{{ getDisplayPrice(product) }}</text>
              </view>
              <view class="recommend-action" @click.stop="quickAdd(product)">
                <text class="action-icon">+</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 商品分类列表 -->
        <view class="products-section">
          <view 
            v-for="product in filteredProducts"
            :key="product._id"
            class="product-item"
            @click="viewProduct(product)"
          >
            <!-- 商品图片 -->
            <image 
              :src="product.images?.[0] || '/static/placeholder-dish.png'"
              class="product-image"
              mode="aspectFill"
            />
            
            <!-- 商品信息 -->
            <view class="product-info">
              <view class="product-header">
                <text class="product-name">{{ product.name }}</text>
                <view v-if="userStore.isVip && product.vipPrice" class="vip-badge">
                  <text class="badge-text">VIP</text>
                </view>
              </view>
              
              <text v-if="product.description" class="product-desc">{{ product.description }}</text>
              
              <!-- 商品标签 -->
              <view v-if="product.tags?.length" class="product-tags">
                <text 
                  v-for="tag in product.tags.slice(0, 3)"
                  :key="tag"
                  class="product-tag"
                >
                  {{ tag }}
                </text>
              </view>
              
              <!-- 价格和评分 -->
              <view class="product-meta">
                <view class="price-info">
                  <text class="current-price">¥{{ getDisplayPrice(product) }}</text>
                  <text 
                    v-if="product.originalPrice && product.originalPrice > getDisplayPrice(product)"
                    class="original-price"
                  >
                    ¥{{ product.originalPrice.toFixed(2) }}
                  </text>
                </view>
                <view v-if="product.rating" class="rating-info">
                  <text class="rating-star">⭐</text>
                  <text class="rating-text">{{ product.rating.toFixed(1) }}</text>
                  <text class="rating-count">({{ product.reviewCount || 0 }})</text>
                </view>
              </view>
              
              <!-- 库存状态 -->
              <view v-if="product.stock <= 10 && product.stock > 0" class="stock-warning">
                <text class="stock-text">仅剩{{ product.stock }}份</text>
              </view>
              <view v-else-if="product.stock === 0" class="stock-empty">
                <text class="stock-text">暂时售罄</text>
              </view>
            </view>
            
            <!-- 添加到购物车按钮 -->
            <view class="product-actions">
              <view v-if="getCartQuantity(product._id) === 0" class="add-btn" @click.stop="quickAdd(product)">
                <text class="add-icon">+</text>
              </view>
              <view v-else class="quantity-control">
                <view class="quantity-btn" @click.stop="decreaseQuantity(product._id)">
                  <text class="btn-text">-</text>
                </view>
                <text class="quantity-text">{{ getCartQuantity(product._id) }}</text>
                <view class="quantity-btn" @click.stop="increaseQuantity(product._id)">
                  <text class="btn-text">+</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 空状态 -->
        <view v-if="filteredProducts.length === 0" class="empty-products">
          <text class="empty-icon">🍽️</text>
          <text class="empty-text">该分类暂无商品</text>
          <text class="empty-hint">试试其他分类吧</text>
        </view>
        
        <!-- 底部间距 -->
        <view class="bottom-spacer"></view>
      </scroll-view>
    </view>

    <!-- 购物车浮动按钮 -->
    <view v-if="isScanned && cartStore.totalQuantity > 0" class="cart-float">
      <view class="cart-content" @click="showCart">
        <view class="cart-info">
          <text class="cart-count">{{ cartStore.totalQuantity }}</text>
          <text class="cart-amount">¥{{ cartStore.totalAmount.toFixed(2) }}</text>
        </view>
        <text class="cart-text">查看购物车</text>
      </view>
    </view>

    <!-- 手动输入弹窗 -->
    <uni-popup 
      ref="manualInputPopup" 
      type="center"
    >
      <view class="manual-input-modal">
        <view class="modal-header">
          <text class="modal-title">手动输入空间编号</text>
        </view>
        <view class="modal-content">
          <input
            v-model="manualSpaceCode"
            class="space-input"
            placeholder="请输入空间编号"
            type="text"
            maxlength="20"
          />
          <text class="input-hint">空间编号通常贴在桌面或墙上</text>
        </view>
        <view class="modal-actions">
          <button class="modal-btn cancel" @click="closeManualInput">取消</button>
          <button class="modal-btn confirm" @click="confirmManualInput">确认</button>
        </view>
      </view>
    </uni-popup>

    <!-- 帮助说明弹窗 -->
    <uni-popup 
      ref="helpPopup" 
      type="bottom"
    >
      <view class="help-modal">
        <view class="help-header">
          <text class="help-title">扫码点单使用说明</text>
          <text class="help-close" @click="closeHelp">✕</text>
        </view>
        <view class="help-content">
          <view class="help-step">
            <text class="step-number">1</text>
            <text class="step-text">找到桌面或墙上的二维码</text>
          </view>
          <view class="help-step">
            <text class="step-number">2</text>
            <text class="step-text">点击"开始扫码"按钮扫描二维码</text>
          </view>
          <view class="help-step">
            <text class="step-number">3</text>
            <text class="step-text">选择心仪的商品加入购物车</text>
          </view>
          <view class="help-step">
            <text class="step-number">4</text>
            <text class="step-text">确认订单信息并完成支付</text>
          </view>
          <view class="help-note">
            <text class="note-text">💡 VIP会员享受专属价格优惠</text>
          </view>
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

    <!-- QR扫描组件 -->
    <QRScanner
      v-if="showScanner"
      @success="onScanSuccess"
      @error="onScanError"
      @cancel="onScanCancel"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import * as StoreService from '@/services/store'
import QRScanner from '@/components/QRScanner.vue'
import ShoppingCart from '@/components/ShoppingCart.vue'

// Store
const userStore = useUserStore()
const cartStore = useCartStore()

// 状态管理
const isScanned = ref(false)
const showScanner = ref(false)
const showShoppingCart = ref(false)
const isRefreshing = ref(false)
const selectedCategory = ref('')
const manualSpaceCode = ref('')
const tableNumber = ref('')

// 数据
const spaceInfo = ref<any>({
  name: '',
  type: '',
  images: []
})

const storeInfo = ref<any>({
  name: ''
})

const categoryList = ref<any[]>([
  { id: '', name: '全部' },
  { id: 'drinks', name: '饮品' },
  { id: 'snacks', name: '小食' },
  { id: 'fruits', name: '果盘' },
  { id: 'alcohol', name: '酒类' },
  { id: 'dessert', name: '甜品' },
  { id: 'main', name: '主食' }
])

const productList = ref<any[]>([])
const recommendProducts = ref<any[]>([])

// Refs
const manualInputPopup = ref()
const helpPopup = ref()

// 计算属性
const filteredProducts = computed(() => {
  if (!selectedCategory.value) {
    return productList.value
  }
  return productList.value.filter(product => product.category === selectedCategory.value)
})

// 方法
// 初始化数据
const initData = async () => {
  await loadRecommendProducts()
}

// 加载推荐商品
const loadRecommendProducts = async () => {
  try {
    // 模拟推荐商品数据
    recommendProducts.value = [
      {
        _id: 'rec1',
        name: '柠檬蜂蜜茶',
        price: 18,
        vipPrice: 15,
        images: ['/static/drink1.jpg'],
        category: 'drinks',
        stock: 20
      },
      {
        _id: 'rec2',
        name: '薯条',
        price: 12,
        vipPrice: 10,
        images: ['/static/snack1.jpg'],
        category: 'snacks',
        stock: 15
      },
      {
        _id: 'rec3',
        name: '水果拼盘',
        price: 38,
        vipPrice: 32,
        images: ['/static/fruit1.jpg'],
        category: 'fruits',
        stock: 8
      },
      {
        _id: 'rec4',
        name: '青岛啤酒',
        price: 8,
        vipPrice: 6,
        images: ['/static/beer1.jpg'],
        category: 'alcohol',
        stock: 50
      }
    ]
  } catch (error) {
    console.error('加载推荐商品失败:', error)
  }
}

// 加载商品列表
const loadProducts = async () => {
  try {
    // 模拟商品数据
    productList.value = [
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
        tags: ['热门', '清爽'],
        rating: 4.8,
        reviewCount: 156,
        stock: 20
      },
      {
        _id: 'p2',
        name: '芒果气泡水',
        description: '新鲜芒果果肉配气泡水，口感丰富',
        price: 22,
        vipPrice: 18,
        images: ['/static/drink2.jpg'],
        category: 'drinks',
        tags: ['新品', '果味'],
        rating: 4.6,
        reviewCount: 89,
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
        stock: 25
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
        stock: 8
      },
      // 酒类
      {
        _id: 'p6',
        name: '青岛啤酒',
        description: '经典青岛啤酒，口感清爽',
        price: 8,
        vipPrice: 6,
        images: ['/static/beer1.jpg'],
        category: 'alcohol',
        tags: ['经典'],
        rating: 4.3,
        reviewCount: 445,
        stock: 50
      }
    ]
  } catch (error) {
    console.error('加载商品列表失败:', error)
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
  return cartStore.items.filter(item => item.dish.category === categoryId).reduce((sum, item) => sum + item.quantity, 0)
}

// 获取购物车中商品数量
const getCartQuantity = (productId: string): number => {
  const item = cartStore.items.find(item => item.dish._id === productId)
  return item ? item.quantity : 0
}

// 开始扫码
const startScan = () => {
  showScanner.value = true
}

// 扫码成功
const onScanSuccess = async (code: string) => {
  showScanner.value = false
  
  try {
    // 解析扫码结果
    const scanData = parseScanCode(code)
    if (scanData) {
      await loadSpaceInfo(scanData.spaceId, scanData.tableNumber)
      isScanned.value = true
      await loadProducts()
    } else {
      uni.showToast({
        title: '无效的二维码',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('处理扫码结果失败:', error)
    uni.showToast({
      title: '扫码失败，请重试',
      icon: 'none'
    })
  }
}

// 扫码错误
const onScanError = (error: string) => {
  showScanner.value = false
  uni.showToast({
    title: error,
    icon: 'none'
  })
}

// 扫码取消
const onScanCancel = () => {
  showScanner.value = false
}

// 解析扫码结果
const parseScanCode = (code: string): any => {
  try {
    // 尝试解析JSON格式的二维码
    const data = JSON.parse(code)
    if (data.spaceId && data.tableNumber) {
      return data
    }
  } catch (e) {
    // 如果不是JSON，尝试解析其他格式
    if (code.includes('space=') && code.includes('table=')) {
      const spaceMatch = code.match(/space=([^&]+)/)
      const tableMatch = code.match(/table=([^&]+)/)
      
      if (spaceMatch && tableMatch) {
        return {
          spaceId: spaceMatch[1],
          tableNumber: tableMatch[1]
        }
      }
    }
  }
  
  return null
}

// 加载空间信息
const loadSpaceInfo = async (spaceId: string, table: string) => {
  try {
    tableNumber.value = table
    
    // 模拟加载空间和店铺信息
    spaceInfo.value = {
      _id: spaceId,
      name: '豪华大包间',
      type: 'KTV包间',
      images: ['/static/room1.jpg']
    }
    
    storeInfo.value = {
      name: '星空KTV'
    }
  } catch (error) {
    console.error('加载空间信息失败:', error)
  }
}

// 显示手动输入
const showManualInput = () => {
  manualInputPopup.value?.open()
}

// 关闭手动输入
const closeManualInput = () => {
  manualInputPopup.value?.close()
  manualSpaceCode.value = ''
}

// 确认手动输入
const confirmManualInput = async () => {
  if (!manualSpaceCode.value.trim()) {
    uni.showToast({
      title: '请输入空间编号',
      icon: 'none'
    })
    return
  }
  
  try {
    // 模拟根据编号查找空间
    const spaceId = 'manual_' + manualSpaceCode.value
    await loadSpaceInfo(spaceId, manualSpaceCode.value)
    isScanned.value = true
    await loadProducts()
    closeManualInput()
  } catch (error) {
    uni.showToast({
      title: '找不到该空间',
      icon: 'none'
    })
  }
}

// 显示帮助
const showHelp = () => {
  helpPopup.value?.open()
}

// 关闭帮助
const closeHelp = () => {
  helpPopup.value?.close()
}

// 选择分类
const selectCategory = (categoryId: string) => {
  selectedCategory.value = categoryId
}

// 查看商品详情
const viewProduct = (product: any) => {
  // TODO: 导航到商品详情页
  console.log('查看商品:', product.name)
}

// 快速添加商品
const quickAdd = (product: any) => {
  if (product.stock <= 0) {
    uni.showToast({
      title: '该商品已售罄',
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

// 增加数量
const increaseQuantity = (productId: string) => {
  const product = productList.value.find(p => p._id === productId) || 
                  recommendProducts.value.find(p => p._id === productId)
  
  if (product && product.stock <= getCartQuantity(productId)) {
    uni.showToast({
      title: '库存不足',
      icon: 'none'
    })
    return
  }
  
  cartStore.updateItemQuantity(productId, getCartQuantity(productId) + 1)
}

// 减少数量
const decreaseQuantity = (productId: string) => {
  const currentQuantity = getCartQuantity(productId)
  if (currentQuantity > 1) {
    cartStore.updateItemQuantity(productId, currentQuantity - 1)
  } else {
    cartStore.removeItem(productId)
  }
}

// 显示购物车
const showCart = () => {
  showShoppingCart.value = true
}

// 隐藏购物车
const hideCart = () => {
  showShoppingCart.value = false
}

// 处理结算
const handleCheckout = (checkoutData: any) => {
  hideCart()
  
  // 导航到订单确认页面
  uni.navigateTo({
    url: `/pages/order/confirm?spaceId=${spaceInfo.value._id}&tableNumber=${tableNumber.value}&type=scan`
  })
}

// 购物车变化
const onCartChange = (items: any[]) => {
  // 处理购物车变化
}

// 下拉刷新
const onRefresh = async () => {
  isRefreshing.value = true
  await loadProducts()
  isRefreshing.value = false
}

// 返回上级页面
const goBack = () => {
  if (isScanned.value) {
    // 确认是否要离开点单页面
    uni.showModal({
      title: '确认离开',
      content: '离开页面将清空购物车，确定要离开吗？',
      success: (res) => {
        if (res.confirm) {
          cartStore.clearCart()
          uni.navigateBack()
        }
      }
    })
  } else {
    uni.navigateBack()
  }
}

// 生命周期
onMounted(() => {
  initData()
})
</script>

<style scoped lang="scss">
.scan-order-page {
  min-height: 100vh;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 32rpx;
  background: white;
  border-bottom: 2rpx solid #f0f0f0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  font-size: 28rpx;
  color: #333;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.nav-right {
  display: flex;
  gap: 16rpx;
}

.scan-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 80rpx 32rpx;
}

.scan-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 80rpx;
}

.guide-icon {
  font-size: 120rpx;
  opacity: 0.6;
}

.guide-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.guide-desc {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  line-height: 1.5;
}

.scan-actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  width: 100%;
  max-width: 500rpx;
}

.scan-btn {
  height: 88rpx;
  background: #667eea;
  color: white;
  border-radius: 24rpx;
  font-size: 32rpx;
  border: none;
}

.manual-btn {
  height: 72rpx;
  background: transparent;
  color: #667eea;
  border: 2rpx solid #667eea;
  border-radius: 24rpx;
  font-size: 28rpx;
}

.order-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.space-card {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.space-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.space-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}

.space-details {
  flex: 1;
}

.space-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
  display: block;
}

.space-type {
  font-size: 24rpx;
  color: #667eea;
  margin-bottom: 8rpx;
  display: block;
}

.space-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.meta-item {
  font-size: 22rpx;
  color: #999;
}

.meta-divider {
  font-size: 22rpx;
  color: #ccc;
}

.space-status {
  padding: 8rpx 16rpx;
  background: rgba(0, 170, 0, 0.1);
  border-radius: 16rpx;
}

.status-text {
  font-size: 22rpx;
  color: #00aa00;
  font-weight: 500;
}

.vip-notice {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  margin-top: 16rpx;
}

.vip-icon {
  font-size: 20rpx;
  color: #ffeb3b;
}

.vip-text {
  font-size: 24rpx;
  color: white;
  font-weight: 500;
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

.category-count {
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

.product-list {
  flex: 1;
  padding-bottom: 150rpx;
}

.recommend-section {
  background: white;
  margin: 16rpx 32rpx;
  border-radius: 16rpx;
  padding: 32rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.section-subtitle {
  font-size: 24rpx;
  color: #999;
}

.recommend-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.recommend-item {
  position: relative;
  border: 2rpx solid #f0f0f0;
  border-radius: 12rpx;
  overflow: hidden;
}

.recommend-image {
  width: 100%;
  height: 200rpx;
  background: #f0f0f0;
}

.recommend-info {
  padding: 16rpx;
}

.recommend-name {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 8rpx;
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.recommend-price {
  font-size: 28rpx;
  color: #ff4444;
  font-weight: 600;
}

.recommend-action {
  position: absolute;
  bottom: 16rpx;
  right: 16rpx;
  width: 48rpx;
  height: 48rpx;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 24rpx;
  font-weight: 600;
}

.products-section {
  padding: 0 32rpx;
}

.product-item {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  background: white;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f0f0f0;
  flex-shrink: 0;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.product-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.vip-badge {
  padding: 4rpx 12rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
}

.badge-text {
  font-size: 18rpx;
  color: white;
  font-weight: 600;
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

.product-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.product-tag {
  font-size: 20rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
}

.product-meta {
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

.rating-info {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.rating-star {
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

.stock-warning {
  padding: 8rpx 12rpx;
  background: rgba(255, 165, 0, 0.1);
  border-radius: 8rpx;
  align-self: flex-start;
}

.stock-empty {
  padding: 8rpx 12rpx;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 8rpx;
  align-self: flex-start;
}

.stock-text {
  font-size: 20rpx;
  color: #ffa500;
  
  .stock-empty & {
    color: #ff4444;
  }
}

.product-actions {
  display: flex;
  align-items: flex-end;
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

.empty-products {
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

// 弹窗样式
.manual-input-modal {
  width: 600rpx;
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-header {
  padding: 32rpx;
  text-align: center;
  border-bottom: 2rpx solid #f0f0f0;
}

.modal-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.modal-content {
  padding: 32rpx;
}

.space-input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  margin-bottom: 16rpx;
}

.input-hint {
  font-size: 24rpx;
  color: #999;
  line-height: 1.4;
}

.modal-actions {
  display: flex;
  border-top: 2rpx solid #f0f0f0;
}

.modal-btn {
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

.help-modal {
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  max-height: 80vh;
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 2rpx solid #f0f0f0;
}

.help-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}

.help-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.help-content {
  padding: 32rpx;
}

.help-step {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.step-number {
  width: 48rpx;
  height: 48rpx;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.step-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
  padding-top: 12rpx;
}

.help-note {
  padding: 24rpx;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 12rpx;
  margin-top: 24rpx;
}

.note-text {
  font-size: 26rpx;
  color: #667eea;
  line-height: 1.5;
}
</style>
