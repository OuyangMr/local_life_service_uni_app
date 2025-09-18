import { Page } from 'puppeteer';
import E2ETestUtils from '../setup';

describe('商户端管理功能 E2E 测试', () => {
  let page: Page;
  
  beforeAll(async () => {
    page = global.page;
  });
  
  beforeEach(async () => {
    // 确保从商户登录页面开始
    await page.goto('http://localhost:8081/#/pages/auth/login');
    await page.waitForSelector('.merchant-login-container', { timeout: 10000 });
  });
  
  describe('商户认证流程', () => {
    test('应该能够使用商户账号登录', async () => {
      // 填写商户登录信息
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13900139000');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', '123456');
      
      // 点击登录
      await E2ETestUtils.waitForElementAndClick(page, '.login-btn');
      
      // 等待登录成功跳转到仪表板
      await E2ETestUtils.waitForNavigation(page);
      
      // 验证跳转到商户仪表板
      const currentUrl = page.url();
      expect(currentUrl).toContain('pages/dashboard');
      
      // 验证仪表板内容加载
      await page.waitForSelector('.dashboard-container', { timeout: 10000 });
      const welcomeText = await page.$eval('.welcome-text', el => el.textContent);
      expect(welcomeText).toContain('欢迎');
    });
    
    test('应该拒绝无效的商户登录', async () => {
      // 使用错误凭据
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13900139000');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', 'wrongpassword');
      
      // 点击登录
      await E2ETestUtils.waitForElementAndClick(page, '.login-btn');
      
      // 等待错误提示
      await page.waitForSelector('.error-toast', { timeout: 5000 });
      const errorMessage = await page.$eval('.error-toast', el => el.textContent);
      expect(errorMessage).toContain('用户名或密码错误');
    });
  });
  
  describe('商户仪表板功能', () => {
    beforeEach(async () => {
      // 登录商户账号
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13900139000');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', '123456');
      await E2ETestUtils.waitForElementAndClick(page, '.login-btn');
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.dashboard-container');
    });
    
    test('应该显示实时营业数据', async () => {
      // 验证今日营业额
      const todayRevenue = await page.$eval('.today-revenue .amount', el => el.textContent);
      expect(todayRevenue).toMatch(/¥[\d,]+\.?\d*/);
      
      // 验证今日订单数
      const todayOrders = await page.$eval('.today-orders .count', el => el.textContent);
      expect(parseInt(todayOrders!)).toBeGreaterThanOrEqual(0);
      
      // 验证在线包间数
      const onlineRooms = await page.$eval('.online-rooms .count', el => el.textContent);
      expect(parseInt(onlineRooms!)).toBeGreaterThanOrEqual(0);
      
      // 验证待处理订单数
      const pendingOrders = await page.$eval('.pending-orders .count', el => el.textContent);
      expect(parseInt(pendingOrders!)).toBeGreaterThanOrEqual(0);
    });
    
    test('应该显示营业趋势图表', async () => {
      // 验证图表容器存在
      const chartContainer = await page.$('.revenue-chart');
      expect(chartContainer).toBeTruthy();
      
      // 验证图表数据加载
      await page.waitForSelector('.chart-data', { timeout: 10000 });
      
      // 切换时间范围
      await E2ETestUtils.waitForElementAndClick(page, '.time-filter[data-range="week"]');
      await page.waitForTimeout(2000); // 等待图表更新
      
      // 验证图表重新加载
      const chartTitle = await page.$eval('.chart-title', el => el.textContent);
      expect(chartTitle).toContain('最近7天');
    });
    
    test('应该显示最新订单列表', async () => {
      // 验证订单列表存在
      await page.waitForSelector('.recent-orders', { timeout: 10000 });
      
      const orderItems = await page.$$('.order-item');
      
      if (orderItems.length > 0) {
        // 验证订单信息完整
        const firstOrder = orderItems[0];
        const orderNumber = await firstOrder.$eval('.order-number', el => el.textContent);
        const orderTime = await firstOrder.$eval('.order-time', el => el.textContent);
        const orderAmount = await firstOrder.$eval('.order-amount', el => el.textContent);
        
        expect(orderNumber).toBeTruthy();
        expect(orderTime).toBeTruthy();
        expect(orderAmount).toContain('¥');
      }
    });
    
    test('应该能够快速处理订单', async () => {
      // 等待订单列表加载
      await page.waitForSelector('.recent-orders');
      const pendingOrders = await page.$$('.order-item[data-status="pending"]');
      
      if (pendingOrders.length > 0) {
        const firstPendingOrder = pendingOrders[0];
        
        // 点击接单按钮
        await firstPendingOrder.$eval('.accept-btn', el => (el as HTMLElement).click());
        
        // 等待确认弹窗
        await page.waitForSelector('.confirm-modal');
        await E2ETestUtils.waitForElementAndClick(page, '.confirm-btn');
        
        // 验证订单状态更新
        await page.waitForTimeout(2000);
        const updatedStatus = await firstPendingOrder.$eval('.order-status', el => el.textContent);
        expect(updatedStatus).toContain('已接单');
      }
    });
  });
  
  describe('空间管理功能', () => {
    beforeEach(async () => {
      // 登录并导航到空间管理页面
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13900139000');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', '123456');
      await E2ETestUtils.waitForElementAndClick(page, '.login-btn');
      await E2ETestUtils.waitForNavigation(page);
      
      // 导航到空间管理
      await page.goto('http://localhost:8081/#/pages/space/list');
      await page.waitForSelector('.space-management', { timeout: 10000 });
    });
    
    test('应该显示包间列表', async () => {
      // 验证包间卡片存在
      const spaceCards = await page.$$('.space-card');
      expect(spaceCards.length).toBeGreaterThan(0);
      
      // 验证包间信息完整
      const firstSpace = spaceCards[0];
      const spaceName = await firstSpace.$eval('.space-name', el => el.textContent);
      const spaceCapacity = await firstSpace.$eval('.space-capacity', el => el.textContent);
      const spaceStatus = await firstSpace.$eval('.space-status', el => el.textContent);
      
      expect(spaceName).toBeTruthy();
      expect(spaceCapacity).toContain('人');
      expect(spaceStatus).toBeTruthy();
    });
    
    test('应该能够添加新包间', async () => {
      // 点击添加包间按钮
      await E2ETestUtils.waitForElementAndClick(page, '.add-space-btn');
      
      // 等待表单弹窗
      await page.waitForSelector('.space-form-modal');
      
      // 填写包间信息
      const newSpace = E2ETestUtils.generateTestStore();
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="包间名称"]', `${newSpace.name}包间`);
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="容纳人数"]', '8');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="价格"]', '299');
      await E2ETestUtils.waitForElementAndType(page, 'textarea[placeholder*="描述"]', '温馨雅致的包间，适合朋友聚会');
      
      // 选择设施
      await E2ETestUtils.waitForElementAndClick(page, '.facility-checkbox[data-facility="wifi"]');
      await E2ETestUtils.waitForElementAndClick(page, '.facility-checkbox[data-facility="air-conditioning"]');
      
      // 提交表单
      await E2ETestUtils.waitForElementAndClick(page, '.submit-btn');
      
      // 等待保存成功
      await page.waitForSelector('.success-toast', { timeout: 10000 });
      const successMessage = await page.$eval('.success-toast', el => el.textContent);
      expect(successMessage).toContain('添加成功');
      
      // 验证新包间出现在列表中
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('.space-management');
      
      const spaceNames = await page.$$eval('.space-name', elements => 
        elements.map(el => el.textContent)
      );
      expect(spaceNames.some(name => name?.includes(newSpace.name))).toBe(true);
    });
    
    test('应该能够编辑包间信息', async () => {
      // 找到第一个包间的编辑按钮
      await E2ETestUtils.waitForElementAndClick(page, '.space-card:first-child .edit-btn');
      
      // 等待编辑表单
      await page.waitForSelector('.space-form-modal');
      
      // 修改包间信息
      await page.$eval('input[placeholder*="包间名称"]', el => (el as HTMLInputElement).value = '');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="包间名称"]', '已编辑包间');
      
      // 提交修改
      await E2ETestUtils.waitForElementAndClick(page, '.submit-btn');
      
      // 等待保存成功
      await page.waitForSelector('.success-toast');
      
      // 验证修改生效
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector('.space-management');
      
      const firstSpaceName = await page.$eval('.space-card:first-child .space-name', el => el.textContent);
      expect(firstSpaceName).toContain('已编辑包间');
    });
    
    test('应该能够切换包间状态', async () => {
      // 获取第一个包间的当前状态
      const currentStatus = await page.$eval('.space-card:first-child .space-status', el => el.textContent);
      
      // 点击状态切换按钮
      await E2ETestUtils.waitForElementAndClick(page, '.space-card:first-child .status-toggle');
      
      // 等待状态更新
      await page.waitForTimeout(2000);
      
      // 验证状态已改变
      const newStatus = await page.$eval('.space-card:first-child .space-status', el => el.textContent);
      expect(newStatus).not.toBe(currentStatus);
    });
  });
  
  describe('订单管理功能', () => {
    beforeEach(async () => {
      // 登录并导航到订单管理页面
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13900139000');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', '123456');
      await E2ETestUtils.waitForElementAndClick(page, '.login-btn');
      await E2ETestUtils.waitForNavigation(page);
      
      // 导航到订单管理
      await page.goto('http://localhost:8081/#/pages/order/list');
      await page.waitForSelector('.order-management', { timeout: 10000 });
    });
    
    test('应该显示店铺订单列表', async () => {
      // 验证订单列表加载
      await page.waitForSelector('.order-list');
      
      const orderCards = await page.$$('.order-card');
      
      if (orderCards.length > 0) {
        // 验证订单信息显示
        const firstOrder = orderCards[0];
        const orderNumber = await firstOrder.$eval('.order-number', el => el.textContent);
        const customerInfo = await firstOrder.$eval('.customer-info', el => el.textContent);
        const orderAmount = await firstOrder.$eval('.order-amount', el => el.textContent);
        const orderStatus = await firstOrder.$eval('.order-status', el => el.textContent);
        
        expect(orderNumber).toBeTruthy();
        expect(customerInfo).toBeTruthy();
        expect(orderAmount).toContain('¥');
        expect(orderStatus).toBeTruthy();
      }
    });
    
    test('应该能够筛选订单状态', async () => {
      // 点击待处理订单标签
      await E2ETestUtils.waitForElementAndClick(page, '.status-filter[data-status="pending"]');
      
      // 等待筛选结果
      await page.waitForTimeout(2000);
      
      // 验证筛选结果
      const filteredOrders = await page.$$('.order-card');
      
      if (filteredOrders.length > 0) {
        for (const order of filteredOrders.slice(0, 3)) {
          const status = await order.$eval('.order-status', el => el.textContent);
          expect(status).toContain('待处理');
        }
      }
    });
    
    test('应该能够处理订单状态', async () => {
      // 查找待处理订单
      const pendingOrders = await page.$$('.order-card[data-status="pending"]');
      
      if (pendingOrders.length > 0) {
        const firstOrder = pendingOrders[0];
        
        // 点击处理按钮
        await firstOrder.$eval('.process-btn', el => (el as HTMLElement).click());
        
        // 等待操作菜单
        await page.waitForSelector('.action-menu');
        
        // 选择接单
        await E2ETestUtils.waitForElementAndClick(page, '.action-item[data-action="accept"]');
        
        // 填写预计完成时间
        await page.waitForSelector('.time-picker-modal');
        await E2ETestUtils.waitForElementAndClick(page, '.time-option:first-child');
        await E2ETestUtils.waitForElementAndClick(page, '.confirm-btn');
        
        // 等待处理成功
        await page.waitForSelector('.success-toast');
        
        // 验证订单状态更新
        await page.waitForTimeout(2000);
        const updatedStatus = await firstOrder.$eval('.order-status', el => el.textContent);
        expect(updatedStatus).toContain('已接单');
      }
    });
    
    test('应该能够查看订单详情', async () => {
      // 点击第一个订单
      const orderCards = await page.$$('.order-card');
      
      if (orderCards.length > 0) {
        await orderCards[0].click();
        
        // 等待跳转到订单详情页
        await E2ETestUtils.waitForNavigation(page);
        await page.waitForSelector('.order-detail', { timeout: 10000 });
        
        // 验证订单详情信息
        const orderInfo = await page.$('.order-info');
        expect(orderInfo).toBeTruthy();
        
        const customerInfo = await page.$('.customer-info');
        expect(customerInfo).toBeTruthy();
        
        const orderItems = await page.$$('.order-item');
        expect(orderItems.length).toBeGreaterThan(0);
        
        // 验证操作按钮存在
        const actionButtons = await page.$('.action-buttons');
        expect(actionButtons).toBeTruthy();
      }
    });
  });
  
  describe('商品管理功能', () => {
    beforeEach(async () => {
      // 登录并导航到商品管理页面
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13900139000');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', '123456');
      await E2ETestUtils.waitForElementAndClick(page, '.login-btn');
      await E2ETestUtils.waitForNavigation(page);
      
      // 导航到商品管理
      await page.goto('http://localhost:8081/#/pages/product/list');
      await page.waitForSelector('.product-management', { timeout: 10000 });
    });
    
    test('应该显示商品列表', async () => {
      // 验证商品列表加载
      await page.waitForSelector('.product-list');
      
      const productCards = await page.$$('.product-card');
      expect(productCards.length).toBeGreaterThan(0);
      
      // 验证商品信息完整
      const firstProduct = productCards[0];
      const productName = await firstProduct.$eval('.product-name', el => el.textContent);
      const productPrice = await firstProduct.$eval('.product-price', el => el.textContent);
      const productStatus = await firstProduct.$eval('.product-status', el => el.textContent);
      
      expect(productName).toBeTruthy();
      expect(productPrice).toContain('¥');
      expect(productStatus).toBeTruthy();
    });
    
    test('应该能够添加新商品', async () => {
      // 点击添加商品按钮
      await E2ETestUtils.waitForElementAndClick(page, '.add-product-btn');
      
      // 等待商品表单页面
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.product-form', { timeout: 10000 });
      
      // 填写商品信息
      const timestamp = Date.now();
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="商品名称"]', `测试商品${timestamp}`);
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="价格"]', '25.50');
      await E2ETestUtils.waitForElementAndType(page, 'textarea[placeholder*="描述"]', '这是一个测试商品');
      
      // 选择分类
      await E2ETestUtils.waitForElementAndClick(page, '.category-select');
      await page.waitForSelector('.category-options');
      await E2ETestUtils.waitForElementAndClick(page, '.category-option:first-child');
      
      // 设置库存
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="库存"]', '100');
      
      // 提交表单
      await E2ETestUtils.waitForElementAndClick(page, '.submit-btn');
      
      // 等待保存成功
      await page.waitForSelector('.success-toast', { timeout: 10000 });
      
      // 验证跳转回商品列表
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.product-management');
      
      // 验证新商品出现在列表中
      const productNames = await page.$$eval('.product-name', elements => 
        elements.map(el => el.textContent)
      );
      expect(productNames.some(name => name?.includes(`测试商品${timestamp}`))).toBe(true);
    });
    
    test('应该能够编辑商品信息', async () => {
      // 点击第一个商品的编辑按钮
      await E2ETestUtils.waitForElementAndClick(page, '.product-card:first-child .edit-btn');
      
      // 等待跳转到编辑页面
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.product-form');
      
      // 修改商品名称
      await page.$eval('input[placeholder*="商品名称"]', el => (el as HTMLInputElement).value = '');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="商品名称"]', '已编辑商品');
      
      // 提交修改
      await E2ETestUtils.waitForElementAndClick(page, '.submit-btn');
      
      // 等待保存成功
      await page.waitForSelector('.success-toast');
      
      // 验证跳转回列表页
      await E2ETestUtils.waitForNavigation(page);
      await page.waitForSelector('.product-management');
      
      // 验证修改生效
      const firstProductName = await page.$eval('.product-card:first-child .product-name', el => el.textContent);
      expect(firstProductName).toContain('已编辑商品');
    });
    
    test('应该能够切换商品状态', async () => {
      // 获取第一个商品的当前状态
      const currentStatus = await page.$eval('.product-card:first-child .product-status', el => el.textContent);
      
      // 点击状态切换按钮
      await E2ETestUtils.waitForElementAndClick(page, '.product-card:first-child .status-toggle');
      
      // 等待状态更新
      await page.waitForTimeout(2000);
      
      // 验证状态已改变
      const newStatus = await page.$eval('.product-card:first-child .product-status', el => el.textContent);
      expect(newStatus).not.toBe(currentStatus);
    });
    
    test('应该能够删除商品', async () => {
      // 获取商品总数
      const initialCount = (await page.$$('.product-card')).length;
      
      // 点击删除按钮
      await E2ETestUtils.waitForElementAndClick(page, '.product-card:last-child .delete-btn');
      
      // 确认删除
      await page.waitForSelector('.confirm-modal');
      await E2ETestUtils.waitForElementAndClick(page, '.confirm-btn');
      
      // 等待删除成功
      await page.waitForSelector('.success-toast');
      
      // 验证商品数量减少
      await page.waitForTimeout(2000);
      const finalCount = (await page.$$('.product-card')).length;
      expect(finalCount).toBe(initialCount - 1);
    });
  });
});
