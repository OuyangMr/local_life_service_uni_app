# E2E 端到端测试套件

本目录包含本地生活服务应用的端到端(E2E)测试，使用 Puppeteer 模拟真实用户在浏览器中的操作行为。

## 测试架构

### 技术栈
- **Puppeteer**: 控制无头/有头 Chrome 浏览器
- **Jest**: 测试运行器和断言库
- **TypeScript**: 类型安全的测试代码
- **jest-puppeteer**: Puppeteer 和 Jest 的集成

### 目录结构
```
tests/e2e/
├── package.json              # E2E测试依赖配置
├── jest-puppeteer.config.js  # Puppeteer配置
├── global-setup.ts           # 全局测试环境设置
├── global-teardown.ts        # 全局测试环境清理
├── setup.ts                  # 测试工具类和全局设置
├── screenshots/              # 测试失败截图存储
├── user-app/                 # 用户端应用测试
│   ├── auth.e2e.test.ts      # 用户认证流程测试
│   └── store-order.e2e.test.ts # 店铺浏览和订单流程测试
├── merchant-app/             # 商户端应用测试
│   └── merchant-management.e2e.test.ts # 商户管理功能测试
└── README.md                 # 本文档
```

## 测试环境要求

### 前置条件
1. **后端服务运行**: 确保后端API服务在 `http://localhost:3000` 运行
2. **前端开发服务器**: 
   - 用户端应用: `http://localhost:8080`
   - 商户端应用: `http://localhost:8081`
3. **测试数据**: 确保数据库中有基础测试数据

### 环境变量
- `CI=true`: 在CI环境中启用无头模式
- `DEBUG=true`: 启用详细调试日志

## 运行测试

### 安装依赖
```bash
cd tests/e2e
npm install
```

### 运行所有测试
```bash
npm test
```

### 运行特定应用测试
```bash
# 只运行用户端测试
npm run test:user-app

# 只运行商户端测试  
npm run test:merchant-app
```

### 并行运行测试
```bash
npm run test:parallel
```

### 调试模式
```bash
npm run test:debug
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

## 测试用例说明

### 用户端测试 (`user-app/`)

#### 认证流程测试 (`auth.e2e.test.ts`)
- ✅ 完整用户注册流程
- ✅ 手机号格式验证
- ✅ 密码强度验证
- ✅ 用户登录流程
- ✅ 错误凭据处理
- ✅ 记住登录状态
- ✅ 密码重置流程
- ✅ 退出登录功能

#### 店铺和订单流程测试 (`store-order.e2e.test.ts`)
- ✅ 附近店铺浏览
- ✅ 店铺搜索功能
- ✅ 分类筛选功能
- ✅ 店铺详情查看
- ✅ 购物车管理（添加、修改、清空）
- ✅ 商品订单创建
- ✅ 积分抵扣功能
- ✅ 包间预订流程
- ✅ 订单列表和筛选
- ✅ 订单详情查看
- ✅ 订单取消功能

### 商户端测试 (`merchant-app/`)

#### 商户管理功能测试 (`merchant-management.e2e.test.ts`)
- ✅ 商户账号登录
- ✅ 无效登录处理
- ✅ 仪表板数据显示
- ✅ 营业趋势图表
- ✅ 最新订单列表
- ✅ 快速订单处理
- ✅ 空间列表管理
- ✅ 包间添加/编辑
- ✅ 包间状态切换
- ✅ 订单状态筛选
- ✅ 订单状态处理
- ✅ 订单详情查看
- ✅ 商品列表管理
- ✅ 商品添加/编辑
- ✅ 商品状态切换
- ✅ 商品删除功能

## 测试工具类

### E2ETestUtils 主要方法

#### 用户认证
- `login(page, phone, password)`: 执行登录流程
- `logout(page)`: 执行退出登录
- `clearBrowserData(page)`: 清除浏览器数据

#### 页面交互
- `waitForElementAndClick(page, selector)`: 等待元素并点击
- `waitForElementAndType(page, selector, text)`: 等待元素并输入文本
- `waitForNavigation(page)`: 等待页面导航完成

#### 环境模拟
- `mockLocation(page, lat, lng)`: 模拟地理位置
- `mockDeviceOrientation(page, orientation)`: 模拟设备方向
- `simulateNetworkCondition(page, condition)`: 模拟网络状况

#### 数据生成
- `generateTestUser()`: 生成测试用户数据
- `generateTestStore()`: 生成测试店铺数据

#### API交互
- `waitForApiResponse(page, urlPattern)`: 等待API响应
- `interceptApiCall(page, urlPattern, mockResponse)`: 拦截API调用

#### 调试辅助
- `takeScreenshot(page, name)`: 截图保存

## 最佳实践

### 测试编写规范
1. **独立性**: 每个测试用例应该独立运行，不依赖其他测试
2. **清理性**: 每个测试前后都应清理数据，避免状态污染
3. **稳定性**: 使用明确的等待条件，避免不稳定的测试
4. **可读性**: 测试描述应该清晰表达测试意图

### 选择器策略
- 优先使用语义化的 CSS 类名（如 `.login-btn`）
- 避免使用易变的选择器（如标签名、位置选择器）
- 为测试页面添加专用的 `data-testid` 属性

### 等待策略
- 使用 `page.waitForSelector()` 等待元素出现
- 使用 `page.waitForNavigation()` 等待页面跳转
- 使用 `page.waitForFunction()` 等待自定义条件
- 避免使用固定时间的 `setTimeout`

### 错误处理
- 测试失败时自动截图保存到 `screenshots/` 目录
- 使用详细的断言消息帮助问题定位
- 在 CI 环境中启用无头模式提高执行效率

## 持续集成

### CI/CD 集成
E2E 测试可以集成到 CI/CD 流水线中：

```yaml
# .github/workflows/e2e.yml 示例
steps:
  - name: 启动后端服务
    run: npm run start:backend &
    
  - name: 启动前端服务
    run: |
      cd frontend/user-app && npm run dev:h5 &
      cd frontend/merchant-app && npm run dev:h5 &
      
  - name: 运行E2E测试
    run: |
      cd tests/e2e
      npm install
      npm test
    env:
      CI: true
```

### 测试报告
- Jest 生成详细的测试报告
- 失败测试的截图自动保存
- 支持 JUnit 格式报告输出

## 故障排查

### 常见问题

#### 测试超时
- 检查网络连接和服务器状态
- 增加超时时间配置
- 检查页面加载性能

#### 元素找不到
- 验证选择器正确性
- 检查页面渲染是否完成
- 确认测试数据是否存在

#### 浏览器启动失败
- 检查系统依赖（Chrome/Chromium）
- 验证无头模式配置
- 检查系统资源使用情况

### 调试技巧
1. 设置 `headless: false` 查看浏览器操作过程
2. 使用 `page.screenshot()` 在关键步骤截图
3. 启用 `devtools: true` 使用开发者工具
4. 查看控制台日志和网络请求

## 维护指南

### 新增测试用例
1. 确定测试范围和用户场景
2. 选择合适的测试文件或创建新文件
3. 使用 E2ETestUtils 工具类简化代码
4. 添加清晰的测试描述和断言
5. 验证测试稳定性和独立性

### 更新测试用例
1. 页面结构变更时更新选择器
2. 业务流程变更时更新测试步骤
3. 新功能上线时补充相应测试
4. 定期检查和优化测试性能

通过完善的 E2E 测试套件，我们可以确保应用在真实用户场景下的稳定性和可靠性，及时发现和修复潜在问题。
