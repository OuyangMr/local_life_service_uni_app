import { Page } from 'puppeteer';
import E2ETestUtils from '../setup';

describe('用户端认证流程 E2E 测试', () => {
  let page: Page;
  
  beforeAll(async () => {
    page = global.page;
  });
  
  beforeEach(async () => {
    // 确保从登录页面开始
    await page.goto('http://localhost:8080/#/pages/auth/login');
    await page.waitForSelector('.login-container', { timeout: 10000 });
  });
  
  describe('用户注册流程', () => {
    test('应该能够完成完整的注册流程', async () => {
      const testUser = E2ETestUtils.generateTestUser();
      
      // 点击注册链接
      await E2ETestUtils.waitForElementAndClick(page, '.register-link');
      await page.waitForSelector('.register-form');
      
      // 填写注册表单
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', testUser.phone);
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="昵称"]', testUser.nickname);
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', testUser.password);
      
      // 获取验证码
      await E2ETestUtils.waitForElementAndClick(page, '.send-code-btn');
      
      // 等待验证码按钮变为倒计时状态
      await page.waitForFunction(
        () => document.querySelector('.send-code-btn')?.textContent?.includes('秒后重新发送'),
        { timeout: 5000 }
      );
      
      // 填写验证码
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="验证码"]', testUser.verificationCode);
      
      // 同意用户协议
      await E2ETestUtils.waitForElementAndClick(page, '.agreement-checkbox');
      
      // 提交注册
      await E2ETestUtils.waitForElementAndClick(page, '.register-btn');
      
      // 等待注册成功并跳转到首页
      await E2ETestUtils.waitForNavigation(page);
      
      // 验证注册成功
      const currentUrl = page.url();
      expect(currentUrl).toContain('pages/index');
      
      // 验证用户信息显示
      await page.waitForSelector('.user-info');
      const userNickname = await page.$eval('.user-nickname', el => el.textContent);
      expect(userNickname).toContain(testUser.nickname);
    });
    
    test('应该验证手机号格式', async () => {
      // 点击注册链接
      await E2ETestUtils.waitForElementAndClick(page, '.register-link');
      await page.waitForSelector('.register-form');
      
      // 输入无效手机号
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '123');
      await E2ETestUtils.waitForElementAndClick(page, '.send-code-btn');
      
      // 验证错误提示
      await page.waitForSelector('.error-message');
      const errorMessage = await page.$eval('.error-message', el => el.textContent);
      expect(errorMessage).toContain('手机号格式不正确');
    });
    
    test('应该防止密码过于简单', async () => {
      const testUser = E2ETestUtils.generateTestUser();
      
      // 点击注册链接
      await E2ETestUtils.waitForElementAndClick(page, '.register-link');
      await page.waitForSelector('.register-form');
      
      // 填写表单，使用简单密码
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', testUser.phone);
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="昵称"]', testUser.nickname);
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', '123');
      
      // 尝试提交
      await E2ETestUtils.waitForElementAndClick(page, '.register-btn');
      
      // 验证密码强度提示
      await page.waitForSelector('.password-strength-tip');
      const strengthTip = await page.$eval('.password-strength-tip', el => el.textContent);
      expect(strengthTip).toContain('密码长度至少6位');
    });
  });
  
  describe('用户登录流程', () => {
    test('应该能够使用正确凭据登录', async () => {
      // 使用测试账户登录
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13800138000');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', '123456');
      
      // 点击登录
      await E2ETestUtils.waitForElementAndClick(page, '.login-btn');
      
      // 等待登录成功
      await E2ETestUtils.waitForNavigation(page);
      
      // 验证跳转到首页
      const currentUrl = page.url();
      expect(currentUrl).toContain('pages/index');
      
      // 验证用户信息加载
      await page.waitForSelector('.user-info');
      const isLoggedIn = await page.$('.user-avatar') !== null;
      expect(isLoggedIn).toBe(true);
    });
    
    test('应该拒绝错误的登录凭据', async () => {
      // 使用错误凭据
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13800138000');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', 'wrongpassword');
      
      // 点击登录
      await E2ETestUtils.waitForElementAndClick(page, '.login-btn');
      
      // 等待错误提示
      await page.waitForSelector('.error-toast', { timeout: 5000 });
      const errorMessage = await page.$eval('.error-toast', el => el.textContent);
      expect(errorMessage).toContain('用户名或密码错误');
      
      // 验证仍在登录页面
      const currentUrl = page.url();
      expect(currentUrl).toContain('pages/auth/login');
    });
    
    test('应该支持记住登录状态', async () => {
      // 勾选记住登录
      await E2ETestUtils.waitForElementAndClick(page, '.remember-login');
      
      // 正常登录
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13800138000');
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="密码"]', '123456');
      await E2ETestUtils.waitForElementAndClick(page, '.login-btn');
      
      // 等待登录成功
      await E2ETestUtils.waitForNavigation(page);
      
      // 刷新页面
      await page.reload({ waitUntil: 'networkidle0' });
      
      // 验证仍然保持登录状态
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('pages/auth/login');
      
      // 验证用户信息仍然存在
      await page.waitForSelector('.user-info');
      const isLoggedIn = await page.$('.user-avatar') !== null;
      expect(isLoggedIn).toBe(true);
    });
  });
  
  describe('密码重置流程', () => {
    test('应该能够通过短信重置密码', async () => {
      // 点击忘记密码
      await E2ETestUtils.waitForElementAndClick(page, '.forgot-password-link');
      await page.waitForSelector('.reset-password-form');
      
      // 填写手机号
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="手机号"]', '13800138000');
      
      // 获取验证码
      await E2ETestUtils.waitForElementAndClick(page, '.send-code-btn');
      
      // 填写验证码
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="验证码"]', '123456');
      
      // 设置新密码
      const newPassword = 'newpassword123';
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="新密码"]', newPassword);
      await E2ETestUtils.waitForElementAndType(page, 'input[placeholder*="确认密码"]', newPassword);
      
      // 提交重置
      await E2ETestUtils.waitForElementAndClick(page, '.reset-btn');
      
      // 等待成功提示
      await page.waitForSelector('.success-toast');
      const successMessage = await page.$eval('.success-toast', el => el.textContent);
      expect(successMessage).toContain('密码重置成功');
      
      // 验证跳转回登录页面
      await E2ETestUtils.waitForNavigation(page);
      const currentUrl = page.url();
      expect(currentUrl).toContain('pages/auth/login');
    });
  });
  
  describe('退出登录流程', () => {
    test('应该能够正常退出登录', async () => {
      // 先登录
      await E2ETestUtils.login(page);
      
      // 执行退出登录
      await E2ETestUtils.logout(page);
      
      // 验证已回到登录页面
      const currentUrl = page.url();
      expect(currentUrl).toContain('pages/auth/login');
      
      // 验证本地存储已清除
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
    });
    
    test('退出登录后应该无法访问需要认证的页面', async () => {
      // 先登录
      await E2ETestUtils.login(page);
      
      // 退出登录
      await E2ETestUtils.logout(page);
      
      // 尝试访问需要认证的页面
      await page.goto('http://localhost:8080/#/pages/user/profile');
      
      // 验证被重定向到登录页面
      await E2ETestUtils.waitForNavigation(page);
      const currentUrl = page.url();
      expect(currentUrl).toContain('pages/auth/login');
    });
  });
});
