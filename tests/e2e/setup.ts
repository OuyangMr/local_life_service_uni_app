import { Page, Browser } from 'puppeteer';

declare global {
  var page: Page;
  var browser: Browser;
}

// 测试工具函数
export class E2ETestUtils {
  static async login(page: Page, phone: string = '13800138000', password: string = '123456') {
    // 导航到登录页面
    await page.goto('http://localhost:8080/#/pages/auth/login');
    await page.waitForSelector('.login-form', { timeout: 10000 });
    
    // 填写登录表单
    await page.type('input[placeholder*="手机号"]', phone);
    await page.type('input[placeholder*="密码"]', password);
    
    // 点击登录按钮
    await page.click('.login-btn');
    
    // 等待登录完成
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // 验证登录成功
    const currentUrl = page.url();
    expect(currentUrl).toContain('pages/index');
  }
  
  static async logout(page: Page) {
    // 导航到个人中心
    await page.goto('http://localhost:8080/#/pages/user/profile');
    await page.waitForSelector('.profile-content', { timeout: 10000 });
    
    // 点击退出登录
    await page.click('.logout-btn');
    
    // 确认退出
    await page.waitForSelector('.uni-modal', { timeout: 5000 });
    await page.click('.uni-modal .confirm-btn');
    
    // 等待跳转到登录页面
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // 验证已退出
    const currentUrl = page.url();
    expect(currentUrl).toContain('pages/auth/login');
  }
  
  static async waitForElementAndClick(page: Page, selector: string, timeout: number = 10000) {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector);
  }
  
  static async waitForElementAndType(page: Page, selector: string, text: string, timeout: number = 10000) {
    await page.waitForSelector(selector, { timeout });
    await page.type(selector, text);
  }
  
  static async waitForNavigation(page: Page, timeout: number = 30000) {
    await page.waitForNavigation({ 
      waitUntil: 'networkidle0',
      timeout 
    });
  }
  
  static async takeScreenshot(page: Page, name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `tests/e2e/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }
  
  static async mockLocation(page: Page, latitude: number = 31.2304, longitude: number = 121.4737) {
    // 模拟地理位置（默认为上海）
    await page.setGeolocation({ latitude, longitude });
  }
  
  static async mockDeviceOrientation(page: Page, orientation: 'portrait' | 'landscape' = 'portrait') {
    if (orientation === 'landscape') {
      await page.setViewport({ width: 667, height: 375 });
    } else {
      await page.setViewport({ width: 375, height: 667 });
    }
  }
  
  static async simulateNetworkCondition(page: Page, condition: 'fast' | 'slow' | 'offline' = 'fast') {
    const conditions = {
      fast: { offline: false, downloadThroughput: 10000000, uploadThroughput: 10000000, latency: 0 },
      slow: { offline: false, downloadThroughput: 50000, uploadThroughput: 50000, latency: 500 },
      offline: { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
    };
    
    await page.emulateNetworkConditions(conditions[condition]);
  }
  
  static async clearBrowserData(page: Page) {
    // 清除本地存储
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // 清除Cookie
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
  }
  
  static generateTestUser() {
    const timestamp = Date.now();
    return {
      phone: `138${String(timestamp).slice(-8)}`,
      nickname: `测试用户${timestamp}`,
      password: '123456',
      verificationCode: '123456'
    };
  }
  
  static generateTestStore() {
    const timestamp = Date.now();
    return {
      name: `测试店铺${timestamp}`,
      address: '上海市浦东新区世纪大道1000号',
      phone: `021${String(timestamp).slice(-8)}`,
      description: `这是一个测试店铺，创建时间：${new Date().toLocaleString()}`
    };
  }
  
  static async waitForApiResponse(page: Page, urlPattern: string, timeout: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`API响应超时: ${urlPattern}`));
      }, timeout);
      
      page.on('response', async (response) => {
        if (response.url().includes(urlPattern)) {
          clearTimeout(timeoutId);
          try {
            const data = await response.json();
            resolve(data);
          } catch (error) {
            resolve(response);
          }
        }
      });
    });
  }
  
  static async interceptApiCall(page: Page, urlPattern: string, mockResponse: any) {
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      if (request.url().includes(urlPattern)) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockResponse)
        });
      } else {
        request.continue();
      }
    });
  }
}

// Jest全局设置
beforeEach(async () => {
  // 每个测试前清理浏览器数据
  await E2ETestUtils.clearBrowserData(page);
  
  // 设置默认视口
  await page.setViewport({ width: 375, height: 667 });
  
  // 模拟地理位置
  await E2ETestUtils.mockLocation(page);
  
  // 设置默认超时
  page.setDefaultTimeout(30000);
});

afterEach(async () => {
  // 每个测试后截图（失败时）
  if (expect.getState().currentTestName && expect.getState().assertionCalls > 0) {
    try {
      await E2ETestUtils.takeScreenshot(page, 'test-failure');
    } catch (error) {
      console.log('截图失败:', error);
    }
  }
});

export default E2ETestUtils;
