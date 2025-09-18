import { Page } from 'puppeteer';
import E2ETestUtils from '../setup';

describe('用户端店铺浏览和订单流程 E2E 测试', () => {
  let page: Page;
  
  beforeAll(async () => {
    page = global.page;
  });
  
  beforeEach(async () => {
    // 确保用户已登录
    await E2ETestUtils.login(page);
    
    // 导航到首页
    await page.goto('http://localhost:8080/#/pages/index');
    await page.waitForSelector('.home-container', { timeout: 10000 });
  });
  
  describe('店铺浏览功能', () => {
    test('应该能够浏览附近店铺列表', async () => {
      // 等待店铺列表加载
      await page.waitForSelector('.store-list', { timeout: 10000 });
      
      // 验证店铺卡片存在
      const storeCards = await page.$$('.store-card');
      expect(storeCards.length).toBeGreaterThan(0);
      
      // 验证店铺信息显示完整
      const firstStore = storeCards[0];
      const storeName = await firstStore.$eval('.store-name', el => el.textContent);
      const storeDistance = await firstStore.$eval('.store-distance', el => el.textContent);
      const storeRating = await firstStore.$eval('.store-rating', el => el.textContent);
      
      expect(storeName).toBeTruthy();
      expect(storeDistance).toContain('km');
      expect(storeRating).toBeTruthy();
    });
    
    test('应该能够搜索店铺', async () => {
      // 点击搜索框
      await E2ETestUtils.waitForElementAndClick(page, '.search-bar');
      await page.waitForSelector('.search-input');
      
      // 输入搜索关键词
      await E2ETestUtils.waitForElementAndType(page, '.search-input', '咖啡');
      await page.keyboard.press('Enter');
      
      // 等待搜索结果
      await page.waitForSelector('.search-results', { timeout: 10000 });
      
      // 验证搜索结果
      const searchResults = await page.$$('.store-card');
      expect(searchResults.length).toBeGreaterThan(0);
      
      // 验证搜索结果相关性
      const firstResult = searchResults[0];
      const storeName = await firstResult.$eval('.store-name', el => el.textContent);
      expect(storeName?.toLowerCase()).toContain('咖啡');
    });
    
    test('应该能够按分类筛选店铺', async () => {
      // 点击分类筛选
      await E2ETestUtils.waitForElementAndClick(page, '.category-filter');
      await page.waitForSelector('.category-list');
      
      // 选择餐饮分类
      await E2ETestUtils.waitForElementAndClick(page, '.category-item[data-category="餐饮"]');
      
      // 等待筛选结果
      await page.waitForSelector('.filtered-stores', { timeout: 10000 });
      
      // 验证筛选结果
      const filteredStores = await page.$$('.store-card');
      expect(filteredStores.length).toBeGreaterThan(0);
      
      // 验证店铺分类正确
      for (const store of filteredStores.slice(0, 3)) { // 检查前3个
        const category = await store.$eval('.store-category', el => el.textContent);
        expect(category).toContain('餐饮');
      }
    });
    
    test('应该能够查看店铺详情', async () => {
      // 等待店铺列表加载
      await page.waitForSelector('.store-list');
      
      // 点击第一个店铺
      await E2ETestUtils.waitForElementAndClick(page, '.store-card:first-child');
      
      // 等待跳转到店铺详情页
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.store-detail', { timeout: 10000 });
      
      // 验证店铺详情信息
      const storeInfo = await page.$('.store-info');
      expect(storeInfo).toBeTruthy();
      
      const storeName = await page.$eval('.store-name', el => el.textContent);
      const storeAddress = await page.$eval('.store-address', el => el.textContent);
      const storePhone = await page.$eval('.store-phone', el => el.textContent);
      
      expect(storeName).toBeTruthy();
      expect(storeAddress).toBeTruthy();
      expect(storePhone).toBeTruthy();
      
      // 验证商品列表存在
      await page.waitForSelector('.product-list');
      const products = await page.$$('.product-item');
      expect(products.length).toBeGreaterThan(0);
    });
  });
  
  describe('购物车功能', () => {
    test('应该能够添加商品到购物车', async () => {
      // 进入店铺详情页
      await page.goto('http://localhost:8080/#/pages/store/detail?id=1');
      await page.waitForSelector('.store-detail', { timeout: 10000 });
      
      // 添加第一个商品
      await E2ETestUtils.waitForElementAndClick(page, '.product-item:first-child .add-btn');
      
      // 验证购物车数量更新
      await page.waitForSelector('.cart-badge');
      const cartCount = await page.$eval('.cart-badge', el => el.textContent);
      expect(parseInt(cartCount!)).toBeGreaterThan(0);
      
      // 验证购物车按钮可见
      const cartBtn = await page.$('.cart-btn');
      expect(cartBtn).toBeTruthy();
    });
    
    test('应该能够调整购物车商品数量', async () => {
      // 进入店铺详情页并添加商品
      await page.goto('http://localhost:8080/#/pages/store/detail?id=1');
      await page.waitForSelector('.store-detail');
      await E2ETestUtils.waitForElementAndClick(page, '.product-item:first-child .add-btn');
      
      // 再次点击增加按钮
      await E2ETestUtils.waitForElementAndClick(page, '.product-item:first-child .add-btn');
      
      // 验证数量增加
      const quantity = await page.$eval('.product-item:first-child .quantity', el => el.textContent);
      expect(parseInt(quantity!)).toBe(2);
      
      // 点击减少按钮
      await E2ETestUtils.waitForElementAndClick(page, '.product-item:first-child .minus-btn');
      
      // 验证数量减少
      const newQuantity = await page.$eval('.product-item:first-child .quantity', el => el.textContent);
      expect(parseInt(newQuantity!)).toBe(1);
    });
    
    test('应该能够查看购物车详情', async () => {
      // 进入店铺详情页并添加商品
      await page.goto('http://localhost:8080/#/pages/store/detail?id=1');
      await page.waitForSelector('.store-detail');
      await E2ETestUtils.waitForElementAndClick(page, '.product-item:first-child .add-btn');
      
      // 点击购物车按钮
      await E2ETestUtils.waitForElementAndClick(page, '.cart-btn');
      
      // 验证购物车弹窗
      await page.waitForSelector('.cart-modal');
      
      // 验证购物车商品信息
      const cartItems = await page.$$('.cart-item');
      expect(cartItems.length).toBeGreaterThan(0);
      
      // 验证总价计算
      const totalPrice = await page.$eval('.total-price', el => el.textContent);
      expect(totalPrice).toContain('¥');
    });
    
    test('应该能够清空购物车', async () => {
      // 进入店铺详情页并添加商品
      await page.goto('http://localhost:8080/#/pages/store/detail?id=1');
      await page.waitForSelector('.store-detail');
      await E2ETestUtils.waitForElementAndClick(page, '.product-item:first-child .add-btn');
      
      // 打开购物车
      await E2ETestUtils.waitForElementAndClick(page, '.cart-btn');
      await page.waitForSelector('.cart-modal');
      
      // 点击清空购物车
      await E2ETestUtils.waitForElementAndClick(page, '.clear-cart-btn');
      
      // 确认清空
      await page.waitForSelector('.confirm-modal');
      await E2ETestUtils.waitForElementAndClick(page, '.confirm-btn');
      
      // 验证购物车已清空
      await page.waitForSelector('.empty-cart');
      const emptyText = await page.$eval('.empty-cart', el => el.textContent);
      expect(emptyText).toContain('购物车为空');
    });
  });
  
  describe('订单创建流程', () => {
    test('应该能够创建商品订单', async () => {
      // 进入店铺详情页并添加商品
      await page.goto('http://localhost:8080/#/pages/store/detail?id=1');
      await page.waitForSelector('.store-detail');
      await E2ETestUtils.waitForElementAndClick(page, '.product-item:first-child .add-btn');
      
      // 打开购物车并结算
      await E2ETestUtils.waitForElementAndClick(page, '.cart-btn');
      await page.waitForSelector('.cart-modal');
      await E2ETestUtils.waitForElementAndClick(page, '.checkout-btn');
      
      // 等待跳转到订单确认页
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.order-confirm', { timeout: 10000 });
      
      // 验证订单信息
      const orderInfo = await page.$('.order-info');
      expect(orderInfo).toBeTruthy();
      
      // 填写备注
      await E2ETestUtils.waitForElementAndType(page, '.order-remark', '请尽快送达');
      
      // 选择支付方式
      await E2ETestUtils.waitForElementAndClick(page, '.payment-method[data-method="wechat"]');
      
      // 提交订单
      await E2ETestUtils.waitForElementAndClick(page, '.submit-order-btn');
      
      // 等待订单创建成功
      await page.waitForSelector('.order-success', { timeout: 15000 });
      
      // 验证订单号显示
      const orderNumber = await page.$eval('.order-number', el => el.textContent);
      expect(orderNumber).toMatch(/\d{10,}/);
      
      // 验证跳转到订单详情
      await E2ETestUtils.waitForElementAndClick(page, '.view-order-btn');
      await E2ETestUtils.waitForNavigation(page);
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('pages/order/detail');
    });
    
    test('应该能够使用积分抵扣', async () => {
      // 进入店铺详情页并添加商品
      await page.goto('http://localhost:8080/#/pages/store/detail?id=1');
      await page.waitForSelector('.store-detail');
      await E2ETestUtils.waitForElementAndClick(page, '.product-item:first-child .add-btn');
      
      // 进入订单确认页
      await E2ETestUtils.waitForElementAndClick(page, '.cart-btn');
      await page.waitForSelector('.cart-modal');
      await E2ETestUtils.waitForElementAndClick(page, '.checkout-btn');
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.order-confirm');
      
      // 使用积分抵扣
      const pointsToggle = await page.$('.points-toggle');
      if (pointsToggle) {
        await E2ETestUtils.waitForElementAndClick(page, '.points-toggle');
        
        // 验证价格变化
        await page.waitForTimeout(1000); // 等待价格更新
        const discountAmount = await page.$eval('.discount-amount', el => el.textContent);
        expect(discountAmount).toContain('¥');
      }
    });
    
    test('应该能够创建包间预订订单', async () => {
      // 进入店铺详情页
      await page.goto('http://localhost:8080/#/pages/store/detail?id=1');
      await page.waitForSelector('.store-detail');
      
      // 点击包间预订
      await E2ETestUtils.waitForElementAndClick(page, '.room-booking-btn');
      await page.waitForSelector('.room-list');
      
      // 选择包间
      await E2ETestUtils.waitForElementAndClick(page, '.room-item:first-child .book-btn');
      
      // 选择时间
      await page.waitForSelector('.time-picker');
      await E2ETestUtils.waitForElementAndClick(page, '.time-slot:first-child');
      
      // 填写预订信息
      await E2ETestUtils.waitForElementAndType(page, '.guest-count', '6');
      await E2ETestUtils.waitForElementAndType(page, '.contact-phone', '13800138000');
      await E2ETestUtils.waitForElementAndType(page, '.booking-remark', '生日聚会');
      
      // 提交预订
      await E2ETestUtils.waitForElementAndClick(page, '.submit-booking-btn');
      
      // 等待预订成功
      await page.waitForSelector('.booking-success', { timeout: 15000 });
      
      // 验证预订信息
      const bookingNumber = await page.$eval('.booking-number', el => el.textContent);
      expect(bookingNumber).toMatch(/\d{10,}/);
    });
  });
  
  describe('订单管理功能', () => {
    test('应该能够查看订单列表', async () => {
      // 导航到订单列表页
      await page.goto('http://localhost:8080/#/pages/order/list');
      await page.waitForSelector('.order-list', { timeout: 10000 });
      
      // 验证订单卡片
      const orderCards = await page.$$('.order-card');
      
      if (orderCards.length > 0) {
        // 验证订单信息显示
        const firstOrder = orderCards[0];
        const orderNumber = await firstOrder.$eval('.order-number', el => el.textContent);
        const orderStatus = await firstOrder.$eval('.order-status', el => el.textContent);
        const orderAmount = await firstOrder.$eval('.order-amount', el => el.textContent);
        
        expect(orderNumber).toBeTruthy();
        expect(orderStatus).toBeTruthy();
        expect(orderAmount).toContain('¥');
      }
    });
    
    test('应该能够筛选订单状态', async () => {
      // 导航到订单列表页
      await page.goto('http://localhost:8080/#/pages/order/list');
      await page.waitForSelector('.order-list');
      
      // 点击待付款标签
      await E2ETestUtils.waitForElementAndClick(page, '.status-tab[data-status="pending"]');
      
      // 等待筛选结果
      await page.waitForTimeout(2000);
      
      // 验证筛选结果
      const filteredOrders = await page.$$('.order-card');
      
      if (filteredOrders.length > 0) {
        for (const order of filteredOrders.slice(0, 3)) {
          const status = await order.$eval('.order-status', el => el.textContent);
          expect(status).toContain('待付款');
        }
      }
    });
    
    test('应该能够查看订单详情', async () => {
      // 导航到订单列表页
      await page.goto('http://localhost:8080/#/pages/order/list');
      await page.waitForSelector('.order-list');
      
      const orderCards = await page.$$('.order-card');
      
      if (orderCards.length > 0) {
        // 点击第一个订单
        await orderCards[0].click();
        
        // 等待跳转到订单详情页
        await E2ETestUtils.waitForNavigation(page);
        await page.waitForSelector('.order-detail', { timeout: 10000 });
        
        // 验证订单详情信息
        const orderInfo = await page.$('.order-info');
        expect(orderInfo).toBeTruthy();
        
        const orderStatus = await page.$eval('.order-status', el => el.textContent);
        const orderItems = await page.$$('.order-item');
        
        expect(orderStatus).toBeTruthy();
        expect(orderItems.length).toBeGreaterThan(0);
      }
    });
    
    test('应该能够取消订单', async () => {
      // 创建新订单然后取消
      await page.goto('http://localhost:8080/#/pages/store/detail?id=1');
      await page.waitForSelector('.store-detail');
      await E2ETestUtils.waitForElementAndClick(page, '.product-item:first-child .add-btn');
      
      // 快速下单
      await E2ETestUtils.waitForElementAndClick(page, '.cart-btn');
      await page.waitForSelector('.cart-modal');
      await E2ETestUtils.waitForElementAndClick(page, '.checkout-btn');
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.order-confirm');
      await E2ETestUtils.waitForElementAndClick(page, '.submit-order-btn');
      
      // 等待订单创建成功
      await page.waitForSelector('.order-success', { timeout: 15000 });
      
      // 进入订单详情
      await E2ETestUtils.waitForElementAndClick(page, '.view-order-btn');
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.order-detail');
      
      // 取消订单
      const cancelBtn = await page.$('.cancel-order-btn');
      if (cancelBtn) {
        await cancelBtn.click();
        
        // 确认取消
        await page.waitForSelector('.confirm-modal');
        await E2ETestUtils.waitForElementAndType(page, '.cancel-reason', '临时有事');
        await E2ETestUtils.waitForElementAndClick(page, '.confirm-btn');
        
        // 验证订单状态更新
        await page.waitForTimeout(2000);
        const orderStatus = await page.$eval('.order-status', el => el.textContent);
        expect(orderStatus).toContain('已取消');
      }
    });
  });
});
