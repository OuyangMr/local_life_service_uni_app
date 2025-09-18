/**
 * 购物车状态管理
 * @description 管理购物车商品、数量、规格选择、优惠券应用
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product } from '@/types'
import { STORAGE_KEYS } from '@/constants'

/** 购物车商品项接口 */
export interface CartItem {
  id: string
  productId: string
  name: string
  image?: string
  price: number
  vipPrice?: number
  specs: Record<string, string>
  quantity: number
  storeId: string
  storeName: string
}

export const useCartStore = defineStore('cart', () => {
  // ============================= 状态 =============================
  
  /** 购物车商品列表 */
  const items = ref<CartItem[]>([])
  
  /** 当前店铺ID */
  const currentStoreId = ref<string>('')
  
  /** 当前店铺名称 */
  const currentStoreName = ref<string>('')

  // ============================= 计算属性 =============================
  
  /** 购物车总数量 */
  const totalQuantity = computed(() => 
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )
  
  /** 购物车总金额 */
  const totalAmount = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )
  
  /** 是否为空购物车 */
  const isEmpty = computed(() => items.value.length === 0)
  
  /** 购物车商品数量（按商品种类） */
  const itemCount = computed(() => items.value.length)

  // ============================= 方法 =============================
  
  /**
   * 初始化购物车
   */
  function initCart() {
    const cachedCart = uni.getStorageSync(STORAGE_KEYS.CART_DATA)
    if (cachedCart) {
      items.value = cachedCart.items || []
      currentStoreId.value = cachedCart.storeId || ''
      currentStoreName.value = cachedCart.storeName || ''
    }
  }

  /**
   * 添加商品到购物车
   */
  function addItem(product: Product, specs: Record<string, string> = {}, quantity: number = 1) {
    // 检查是否为同一店铺
    if (currentStoreId.value && currentStoreId.value !== product.storeId) {
      return uni.showModal({
        title: '提示',
        content: `购物车中已有${currentStoreName.value}的商品，是否清空购物车并添加新商品？`,
        success: (res) => {
          if (res.confirm) {
            clearCart()
            addItemToCart(product, specs, quantity)
          }
        }
      })
    }
    
    addItemToCart(product, specs, quantity)
  }

  /**
   * 实际添加商品到购物车
   */
  function addItemToCart(product: Product, specs: Record<string, string> = {}, quantity: number = 1, storeName?: string) {
    const specKey = JSON.stringify(specs)
    const existingItemIndex = items.value.findIndex(
      item => item.productId === product.id && JSON.stringify(item.specs) === specKey
    )

    if (existingItemIndex > -1) {
      // 商品已存在，增加数量
      items.value[existingItemIndex].quantity += quantity
    } else {
      // 添加新商品
      const cartItem: CartItem = {
        id: `${product.id}_${Date.now()}`,
        productId: product.id,
        name: product.name,
        image: product.images[0],
        price: product.price,
        vipPrice: product.vipPrice,
        specs,
        quantity,
        storeId: product.storeId,
        storeName: storeName || currentStoreName.value || '',
      }
      items.value.push(cartItem)
    }

    // 设置当前店铺
    if (!currentStoreId.value) {
      currentStoreId.value = product.storeId
      // currentStoreName.value = product.storeName // 需要传入或查询
    }

    persistCart()
    
    uni.showToast({
      title: '已添加到购物车',
      icon: 'success',
      duration: 1500
    })
  }

  /**
   * 更新商品数量
   */
  function updateQuantity(itemId: string, quantity: number) {
    const itemIndex = items.value.findIndex(item => item.id === itemId)
    if (itemIndex > -1) {
      if (quantity <= 0) {
        if (quantity < 0) {
          // 负数时设为1
          items.value[itemIndex].quantity = 1
          persistCart()
        } else {
          // 0时移除商品
          removeItem(itemId)
        }
      } else {
        items.value[itemIndex].quantity = quantity
        persistCart()
      }
    }
  }

  /**
   * 移除商品
   */
  function removeItem(itemId: string) {
    const itemIndex = items.value.findIndex(item => item.id === itemId)
    if (itemIndex > -1) {
      items.value.splice(itemIndex, 1)
      
      // 如果购物车为空，清除店铺信息
      if (items.value.length === 0) {
        currentStoreId.value = ''
        currentStoreName.value = ''
      }
      
      persistCart()
    }
  }

  /**
   * 清空购物车
   */
  function clearCart() {
    items.value = []
    currentStoreId.value = ''
    currentStoreName.value = ''
    // 清除本地存储
    uni.removeStorageSync('cart_items')
    uni.removeStorageSync('current_store')
    clearPersistedCart()
  }

  /**
   * 获取商品在购物车中的数量
   */
  function getItemQuantity(productId: string, specs: Record<string, string> = {}): number {
    const specKey = JSON.stringify(specs)
    const item = items.value.find(
      item => item.productId === productId && JSON.stringify(item.specs) === specKey
    )
    return item?.quantity || 0
  }

  /**
   * 检查商品是否在购物车中
   */
  function hasItem(productId: string, specs: Record<string, string> = {}): boolean {
    return getItemQuantity(productId, specs) > 0
  }

  /**
   * 计算VIP价格总额
   */
  function getVipTotalAmount(): number {
    return items.value.reduce((sum, item) => {
      const price = item.vipPrice || item.price
      return sum + price * item.quantity
    }, 0)
  }

  /**
   * 获取商品规格显示文本
   */
  function getSpecsText(specs: Record<string, string>): string {
    return Object.entries(specs)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
  }

  /**
   * 验证购物车
   */
  function validateCart(): { valid: boolean; message?: string } {
    if (isEmpty.value) {
      return { valid: false, message: '购物车为空' }
    }

    // 检查商品库存等
    for (const item of items.value) {
      if (item.quantity <= 0) {
        return { valid: false, message: `${item.name} 数量不能为0` }
      }
      }

  // 自动初始化
  initCart()

  return { valid: true }
  }

  // ============================= 持久化 =============================
  
  /**
   * 持久化购物车数据
   */
  function persistCart() {
    try {
      const cartData = {
        items: items.value,
        storeId: currentStoreId.value,
        storeName: currentStoreName.value,
        timestamp: Date.now()
      }
      uni.setStorageSync(STORAGE_KEYS.CART_DATA, cartData)
    } catch (error) {
      console.warn('Failed to persist cart data:', error)
    }
  }

  /**
   * 清除持久化数据
   */
  function clearPersistedCart() {
    uni.removeStorageSync(STORAGE_KEYS.CART_DATA)
  }

  /**
   * 添加商品到购物车（测试兼容方法）
   */
  function addToCart(
    product: Product, 
    specs: Record<string, string> = {}, 
    quantity: number = 1, 
    storeId?: string, 
    storeName?: string,
    isVip?: boolean
  ) {
    // 设置店铺信息
    if (storeId && storeName) {
      // 检查是否为同一店铺
      if (currentStoreId.value && currentStoreId.value !== storeId) {
        // 显示确认弹窗
        uni.showModal({
          title: '切换店铺',
          content: '切换店铺将清空购物车，是否继续？',
          showCancel: true,
          success: (res) => {
            if (res.confirm) {
              // 清空购物车并添加新商品
              clearCart()
              currentStoreId.value = storeId
              currentStoreName.value = storeName
              const productWithStore = {
                ...product,
                storeId: storeId,
              }
              if (isVip && product.vipPrice) {
                productWithStore.price = product.vipPrice
              }
              addItemToCart(productWithStore, specs, quantity, storeName)
            }
          }
        })
        return // 等待用户确认
      }
      currentStoreId.value = storeId
      currentStoreName.value = storeName
    }

    // 创建带有店铺信息的product对象
    const productWithStore = {
      ...product,
      storeId: storeId || product.storeId,
    }

    // 使用VIP价格（如果提供）
    if (isVip && product.vipPrice) {
      productWithStore.price = product.vipPrice
    }

    addItemToCart(productWithStore, specs, quantity, storeName)
  }

  /**
   * 移除商品（测试兼容方法）
   */
  function removeFromCart(itemId: string) {
    removeItem(itemId)
  }

  /**
   * 根据商品ID和规格查找商品
   */
  function getItemByProductAndSpecs(productId: string, specs: Record<string, string> = {}): CartItem | undefined {
    const specKey = JSON.stringify(specs)
    return items.value.find(
      item => item.productId === productId && JSON.stringify(item.specs) === specKey
    )
  }

  // 自动初始化购物车
  initCart()

  return {
    // 状态
    items,
    currentStoreId,
    currentStoreName,
    
    // 计算属性
    totalQuantity,
    totalAmount,
    isEmpty,
    itemCount,
    
    // 方法
    initCart,
    addItem,
    addToCart,
    updateQuantity,
    removeItem,
    removeFromCart,
    clearCart,
    getItemQuantity,
    hasItem,
    getVipTotalAmount,
    getSpecsText,
    validateCart,
    persistCart,
    clearPersistedCart,
    getItemByProductAndSpecs,
  }
})
