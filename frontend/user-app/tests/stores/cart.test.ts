/**
 * CartStore 单元测试
 * 测试购物车状态管理、商品添加删除、金额计算等功能
 */

import { setActivePinia, createPinia } from 'pinia'
import { useCartStore, type CartItem } from '../../src/stores/cart'
import {
  createTestProduct,
  mockUniApi,
  resetUniMocks,
  flushPromises
} from '../helpers/testUtils'

// Mock constants
jest.mock('../../src/constants', () => ({
  STORAGE_KEYS: {
    CART_ITEMS: 'cart_items',
    CURRENT_STORE: 'current_store'
  }
}))

describe('CartStore', () => {
  let cartStore: ReturnType<typeof useCartStore>

  beforeEach(() => {
    // 创建新的Pinia实例
    const pinia = createPinia()
    setActivePinia(pinia)
    
    // 创建store实例
    cartStore = useCartStore()
    
    // 重置所有mocks
    resetUniMocks()
    jest.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      expect(cartStore.items).toEqual([])
      expect(cartStore.currentStoreId).toBe('')
      expect(cartStore.currentStoreName).toBe('')
    })

    it('应该有正确的计算属性初始值', () => {
      expect(cartStore.totalQuantity).toBe(0)
      expect(cartStore.totalAmount).toBe(0)
      expect(cartStore.isEmpty).toBe(true)
    })
  })

  describe('初始化购物车', () => {
    it('应该从本地存储加载购物车数据', () => {
      const savedItems: CartItem[] = [
        {
          id: 'item_1',
          productId: 'product_1',
          name: '测试商品1',
          price: 50,
          specs: { size: '大' },
          quantity: 2,
          storeId: 'store_1',
          storeName: '测试店铺'
        }
      ]
      const savedStore = {
        storeId: 'store_1',
        storeName: '测试店铺'
      }

      const mockGetStorageSync = mockUniApi('getStorageSync')
      const cartData = {
        items: savedItems,
        storeId: 'store_1',
        storeName: '测试店铺',
        timestamp: Date.now()
      }
      mockGetStorageSync.mockImplementation((key: string) => {
        if (key === 'cart_data') return cartData
        return ''
      })

      cartStore.initCart()

      expect(cartStore.items).toEqual(savedItems)
      expect(cartStore.currentStoreId).toBe('store_1')
      expect(cartStore.currentStoreName).toBe('测试店铺')
    })

    it('应该在本地存储为空时保持初始状态', () => {
      const mockGetStorageSync = mockUniApi('getStorageSync')
      mockGetStorageSync.mockReturnValue('')

      cartStore.initCart()

      expect(cartStore.items).toEqual([])
      expect(cartStore.currentStoreId).toBe('')
      expect(cartStore.currentStoreName).toBe('')
    })

    it('应该在本地存储数据无效时保持初始状态', () => {
      const mockGetStorageSync = mockUniApi('getStorageSync')
      mockGetStorageSync.mockReturnValue('invalid json')

      cartStore.initCart()

      expect(cartStore.items).toEqual([])
      expect(cartStore.currentStoreId).toBe('')
      expect(cartStore.currentStoreName).toBe('')
    })
  })

  describe('添加商品到购物车', () => {
    it('应该成功添加新商品到空购物车', () => {
      const product = createTestProduct()
      const mockSetStorageSync = mockUniApi('setStorageSync')

      cartStore.addToCart(product, { size: '大' }, 2, 'store_1', '测试店铺')

      expect(cartStore.items).toHaveLength(1)
      expect(cartStore.items[0]).toMatchObject({
        productId: product.id,
        name: product.name,
        price: product.price,
        specs: { size: '大' },
        quantity: 2,
        storeId: 'store_1',
        storeName: '测试店铺'
      })
      expect(cartStore.currentStoreId).toBe('store_1')
      expect(cartStore.currentStoreName).toBe('测试店铺')
      expect(mockSetStorageSync).toHaveBeenCalledTimes(2) // items + store info
    })

    it('应该在添加相同商品时增加数量', () => {
      const product = createTestProduct()
      
      // 先添加一次
      cartStore.addToCart(product, { size: '大' }, 1, 'store_1', '测试店铺')
      expect(cartStore.items[0].quantity).toBe(1)

      // 再添加相同商品
      cartStore.addToCart(product, { size: '大' }, 2, 'store_1', '测试店铺')

      expect(cartStore.items).toHaveLength(1)
      expect(cartStore.items[0].quantity).toBe(3)
    })

    it('应该在添加不同规格的相同商品时创建新项目', () => {
      const product = createTestProduct()
      
      cartStore.addToCart(product, { size: '大' }, 1, 'store_1', '测试店铺')
      cartStore.addToCart(product, { size: '小' }, 2, 'store_1', '测试店铺')

      expect(cartStore.items).toHaveLength(2)
      expect(cartStore.items[0].specs).toEqual({ size: '大' })
      expect(cartStore.items[1].specs).toEqual({ size: '小' })
    })

    it('应该在切换店铺时清空购物车并添加新商品', () => {
      const product1 = createTestProduct({ id: 'product_1' })
      const product2 = createTestProduct({ id: 'product_2' })
      const mockShowModal = mockUniApi('showModal')
      
      // 先添加一个商品
      cartStore.addToCart(product1, {}, 1, 'store_1', '店铺1')
      expect(cartStore.items).toHaveLength(1)

      // 模拟用户确认切换店铺
      mockShowModal.mockImplementation((options: any) => {
        options.success({ confirm: true })
      })

      // 添加不同店铺的商品
      cartStore.addToCart(product2, {}, 1, 'store_2', '店铺2')

      expect(mockShowModal).toHaveBeenCalled()
      expect(cartStore.items).toHaveLength(1)
      expect(cartStore.items[0].productId).toBe('product_2')
      expect(cartStore.currentStoreId).toBe('store_2')
      expect(cartStore.currentStoreName).toBe('店铺2')
    })

    it('应该在用户取消切换店铺时不添加商品', () => {
      const product1 = createTestProduct({ id: 'product_1' })
      const product2 = createTestProduct({ id: 'product_2' })
      const mockShowModal = mockUniApi('showModal')
      
      // 先添加一个商品
      cartStore.addToCart(product1, {}, 1, 'store_1', '店铺1')
      expect(cartStore.items).toHaveLength(1)

      // 模拟用户取消切换店铺
      mockShowModal.mockImplementation((options: any) => {
        options.success({ confirm: false })
      })

      // 尝试添加不同店铺的商品
      cartStore.addToCart(product2, {}, 1, 'store_2', '店铺2')

      expect(cartStore.items).toHaveLength(1)
      expect(cartStore.items[0].productId).toBe('product_1')
      expect(cartStore.currentStoreId).toBe('store_1')
    })
  })

  describe('更新商品数量', () => {
    beforeEach(() => {
      const product = createTestProduct()
      cartStore.addToCart(product, { size: '大' }, 2, 'store_1', '测试店铺')
    })

    it('应该成功更新商品数量', () => {
      const itemId = cartStore.items[0].id
      const mockSetStorageSync = mockUniApi('setStorageSync')

      cartStore.updateQuantity(itemId, 5)

      expect(cartStore.items[0].quantity).toBe(5)
      expect(mockSetStorageSync).toHaveBeenCalled()
    })

    it('应该在数量为0时移除商品', () => {
      const itemId = cartStore.items[0].id

      cartStore.updateQuantity(itemId, 0)

      expect(cartStore.items).toHaveLength(0)
    })

    it('应该在商品不存在时不执行任何操作', () => {
      const initialLength = cartStore.items.length

      cartStore.updateQuantity('non_existent_id', 5)

      expect(cartStore.items).toHaveLength(initialLength)
    })

    it('应该在负数数量时将数量设为1', () => {
      const itemId = cartStore.items[0].id

      cartStore.updateQuantity(itemId, -1)

      expect(cartStore.items[0].quantity).toBe(1)
    })
  })

  describe('移除商品', () => {
    beforeEach(() => {
      const product1 = createTestProduct({ id: 'product_1' })
      const product2 = createTestProduct({ id: 'product_2' })
      cartStore.addToCart(product1, {}, 1, 'store_1', '测试店铺')
      cartStore.addToCart(product2, {}, 2, 'store_1', '测试店铺')
    })

    it('应该成功移除指定商品', () => {
      const itemId = cartStore.items[0].id
      const mockSetStorageSync = mockUniApi('setStorageSync')

      cartStore.removeFromCart(itemId)

      expect(cartStore.items).toHaveLength(1)
      expect(cartStore.items[0].productId).toBe('product_2')
      expect(mockSetStorageSync).toHaveBeenCalled()
    })

    it('应该在商品不存在时不执行任何操作', () => {
      const initialLength = cartStore.items.length

      cartStore.removeFromCart('non_existent_id')

      expect(cartStore.items).toHaveLength(initialLength)
    })
  })

  describe('清空购物车', () => {
    beforeEach(() => {
      const product = createTestProduct()
      cartStore.addToCart(product, {}, 1, 'store_1', '测试店铺')
    })

    it('应该清空所有商品和店铺信息', () => {
      const mockRemoveStorageSync = mockUniApi('removeStorageSync')

      cartStore.clearCart()

      expect(cartStore.items).toHaveLength(0)
      expect(cartStore.currentStoreId).toBe('')
      expect(cartStore.currentStoreName).toBe('')
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('cart_items')
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('current_store')
    })
  })

  describe('计算属性', () => {
    beforeEach(() => {
      const product1 = createTestProduct({ id: 'product_1', price: 50 })
      const product2 = createTestProduct({ id: 'product_2', price: 30 })
      cartStore.addToCart(product1, {}, 2, 'store_1', '测试店铺') // 2 * 50 = 100
      cartStore.addToCart(product2, {}, 3, 'store_1', '测试店铺') // 3 * 30 = 90
    })

    it('应该正确计算总数量', () => {
      expect(cartStore.totalQuantity).toBe(5) // 2 + 3
    })

    it('应该正确计算总金额', () => {
      expect(cartStore.totalAmount).toBe(190) // 100 + 90
    })

    it('应该正确判断购物车是否为空', () => {
      expect(cartStore.isEmpty).toBe(false)

      cartStore.clearCart()
      expect(cartStore.isEmpty).toBe(true)
    })
  })

  describe('商品查找', () => {
    beforeEach(() => {
      const product = createTestProduct()
      cartStore.addToCart(product, { size: '大' }, 1, 'store_1', '测试店铺')
      cartStore.addToCart(product, { size: '小' }, 2, 'store_1', '测试店铺')
    })

    it('应该能根据商品ID和规格查找商品', () => {
      const productId = cartStore.items[0].productId
      
      const foundItem = cartStore.getItemByProductAndSpecs(productId, { size: '大' })
      
      expect(foundItem).toBeTruthy()
      expect(foundItem?.specs).toEqual({ size: '大' })
      expect(foundItem?.quantity).toBe(1)
    })

    it('应该在商品不存在时返回undefined', () => {
      const foundItem = cartStore.getItemByProductAndSpecs('non_existent', {})
      
      expect(foundItem).toBeUndefined()
    })

    it('应该在规格不匹配时返回undefined', () => {
      const productId = cartStore.items[0].productId
      
      const foundItem = cartStore.getItemByProductAndSpecs(productId, { size: '中' })
      
      expect(foundItem).toBeUndefined()
    })
  })

  describe('VIP价格处理', () => {
    it('应该正确处理VIP价格', () => {
      const product = createTestProduct({
        price: 100,
        vipPrice: 80
      })

      cartStore.addToCart(product, {}, 1, 'store_1', '测试店铺', true) // 传入isVip=true

      expect(cartStore.items[0].price).toBe(80) // 使用VIP价格
      expect(cartStore.totalAmount).toBe(80)
    })

    it('应该在非VIP时使用普通价格', () => {
      const product = createTestProduct({
        price: 100,
        vipPrice: 80
      })

      cartStore.addToCart(product, {}, 1, 'store_1', '测试店铺', false) // 传入isVip=false

      expect(cartStore.items[0].price).toBe(100) // 使用普通价格
      expect(cartStore.totalAmount).toBe(100)
    })
  })

  describe('本地存储同步', () => {
    it('应该在添加商品时同步到本地存储', () => {
      const product = createTestProduct()
      const mockSetStorageSync = mockUniApi('setStorageSync')

      cartStore.addToCart(product, {}, 1, 'store_1', '测试店铺')

      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'cart_items',
        JSON.stringify(cartStore.items)
      )
      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'current_store',
        JSON.stringify({
          storeId: 'store_1',
          storeName: '测试店铺'
        })
      )
    })

    it('应该在更新数量时同步到本地存储', () => {
      const product = createTestProduct()
      cartStore.addToCart(product, {}, 1, 'store_1', '测试店铺')
      
      const mockSetStorageSync = mockUniApi('setStorageSync')
      mockSetStorageSync.mockClear() // 清除之前的调用记录

      const itemId = cartStore.items[0].id
      cartStore.updateQuantity(itemId, 5)

      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'cart_items',
        JSON.stringify(cartStore.items)
      )
    })

    it('应该在移除商品时同步到本地存储', () => {
      const product = createTestProduct()
      cartStore.addToCart(product, {}, 1, 'store_1', '测试店铺')
      
      const mockSetStorageSync = mockUniApi('setStorageSync')
      mockSetStorageSync.mockClear()

      const itemId = cartStore.items[0].id
      cartStore.removeFromCart(itemId)

      expect(mockSetStorageSync).toHaveBeenCalledWith(
        'cart_items',
        JSON.stringify(cartStore.items)
      )
    })

    it('应该在清空购物车时清除本地存储', () => {
      const product = createTestProduct()
      cartStore.addToCart(product, {}, 1, 'store_1', '测试店铺')
      
      const mockRemoveStorageSync = mockUniApi('removeStorageSync')

      cartStore.clearCart()

      expect(mockRemoveStorageSync).toHaveBeenCalledWith('cart_items')
      expect(mockRemoveStorageSync).toHaveBeenCalledWith('current_store')
    })
  })

  describe('错误处理', () => {
    it('应该在本地存储操作失败时不影响功能', () => {
      const product = createTestProduct()
      const mockSetStorageSync = mockUniApi('setStorageSync')
      mockSetStorageSync.mockImplementation(() => {
        throw new Error('Storage error')
      })

      // 应该不抛出错误
      expect(() => {
        cartStore.addToCart(product, {}, 1, 'store_1', '测试店铺')
      }).not.toThrow()

      // 状态应该正常更新
      expect(cartStore.items).toHaveLength(1)
    })
  })
})
