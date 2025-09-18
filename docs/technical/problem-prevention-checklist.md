# 常见问题预防清单

> 基于 KTV 员工管理系统开发经验提炼的问题预防指南
> 目标：避免重复踩坑，提升开发效率
> 文档版本：v1.0
> 创建时间：2025-01-18

## 🚨 Critical Issues Prevention

### 1. TypeScript 类型错误预防

**问题**：使用不存在的 uni-app 类型导致编译错误

```typescript
// ❌ 错误：使用不存在的类型
UniApp.ChooseImageRes;

// ✅ 正确：使用官方类型
UniNamespace.ChooseImageSuccessCallbackResult;
```

**预防措施**：

- [ ] 使用前检查 uni-app 官方类型定义
- [ ] 优先使用 `UniNamespace` 命名空间下的类型
- [ ] 对返回值进行安全类型检查

### 2. CSS 兼容性问题预防

**问题**：小程序环境不支持某些 CSS 选择器

```css
/* ❌ 不兼容 */
.input:focus {
  border-color: #ff6b35;
}

/* ✅ 兼容 */
.input[focus] {
  border-color: #ff6b35;
}
```

**预防措施**：

- [ ] 避免使用 `:hover`、`:focus` 伪类选择器
- [ ] 使用 `hover-class` 属性替代 `:hover`
- [ ] 使用属性选择器 `[focus]` 替代 `:focus`
- [ ] 避免使用通配符选择器 `*`

### 3. 模块导入问题预防

**问题**：动态导入在小程序中不稳定

```typescript
// ❌ 不稳定
const { useUserStore } = await import('../stores/user');

// ✅ 稳定
import { useUserStore } from '@/stores/user';
```

**预防措施**：

- [ ] 禁用 `await import()` 动态导入
- [ ] 使用静态导入 `import` 语句
- [ ] 实现多重降级策略获取数据

### 4. API 错误处理问题预防

**问题**：HTTP 状态码掩盖业务错误信息

```typescript
// ❌ 错误的处理优先级
if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
if (data.code !== 'success') throw new Error(data.message);

// ✅ 正确的处理优先级
if (data.code !== 'success') throw new Error(data.message);
if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
```

**预防措施**：

- [ ] 优先检查业务状态码
- [ ] 业务错误消息优先于 HTTP 错误
- [ ] 实现统一的错误处理机制

### 5. 页面跳转问题预防

**问题**：使用错误的跳转方法导致跳转失败

```typescript
// ❌ 错误：对 tabbar 页面使用 navigateTo
uni.navigateTo({ url: '/pages/index/index' });

// ✅ 正确：对 tabbar 页面使用 switchTab
uni.switchTab({ url: '/pages/index/index' });
```

**预防措施**：

- [ ] 确认目标页面类型（tabbar vs 普通页面）
- [ ] tabbar 页面使用 `switchTab`
- [ ] 普通页面使用 `navigateTo`

## 🎯 Development Quality Checklist

### Vue 单文件组件结构检查

```
□ 是否只有一个 <template> 块？
□ 是否只有一个 <script setup> 块？
□ 是否只有一个 <style> 块？
□ 是否所有标签都正确闭合？
□ 是否没有重复或多余的标签？
```

### API 开发检查

```
□ 是否使用了正确的 API 字段含义？
□ 是否实现了业务错误优先的处理逻辑？
□ 是否添加了用户友好的错误提示？
□ 是否支持 loading 状态的明确控制？
□ 是否遵循了项目的 API 调用规范？
```

### 移动端适配检查

```
□ 表格内容是否能在一屏内完整显示？
□ 浮动按钮是否适配了 iPhone 安全区域？
□ 是否使用了正确的事件类型（@tap vs @click）？
□ 是否设置了足够高的 z-index 值？
□ 是否添加了触摸反馈效果？
```

### 业务逻辑检查

```
□ 是否严格按照 API 文档实现字段映射？
□ 是否避免了基于 UI 需求推测 API 含义？
□ 是否使用枚举定义状态值避免魔法数字？
□ 是否实现了项目特有的业务规则？
□ 是否验证了所有状态切换的正确性？
```

### 文件管理检查

```
□ 文件命名是否符合项目规范？
□ 是否避免了创建重复功能的文件？
□ 是否正确理解了项目文件结构？
□ 是否同步更新了 pages.json 配置？
□ 是否清理了无用的测试文件？
```

## 🔧 Common Pitfall Solutions

### 1. iOS 小程序浮动按钮无响应

**解决方案**：

```vue
<view
  @tap="handleAction"           <!-- 使用 @tap 替代 @click -->
  hover-class="btn-hover"       <!-- 添加 hover 反馈 -->
  @catchtouchmove="preventMove" <!-- 防止事件穿透 -->
  :style="{ zIndex: 9999 }">    <!-- 提高层级 -->
</view>
```

### 2. 下拉刷新与 API loading 冲突

**解决方案**：

```typescript
// 下拉刷新时禁用 API loading
await userStore.fetchData({ loading: false });

// 正常调用显示 loading
await userStore.fetchData({ loading: true });
```

### 3. 跨页面数据不一致

**解决方案**：

```typescript
// 在关键页面主动同步数据
const syncUserInfo = (apiResponse) => {
  if (apiResponse.data?.agentId) {
    userStore.updateUserInfoLocal({
      agentId: apiResponse.data.agentId,
    });
  }
};
```

### 4. URL 参数过长导致页面跳转失败

**解决方案**：

```typescript
// 使用全局数据传递替代 URL 参数
const app = getApp();
app.globalData.pageData = complexData;

uni.navigateTo({ url: '/pages/target/target' });
```

### 5. 文件上传命名混乱

**解决方案**：

```typescript
// 使用标准命名格式
const fileName = `${Date.now()}_avatar.jpg`;

// 确保正确的文件后缀
const generateFileName = (type) => {
  const timestamp = Date.now();
  const extensions = {
    image: 'jpg',
    video: 'mp4',
    avatar: 'jpg',
  };
  return `${timestamp}_${type}.${extensions[type]}`;
};
```

## 🎨 UI/UX Best Practices

### 移动端表格设计

```css
/* 精确列宽分配，总和 100% */
.time-col {
  flex: 0 0 16%;
}
.amount-col {
  flex: 0 0 20%;
}
.status-col {
  flex: 0 0 12%;
}

/* 自适应字体系统 */
.long-text {
  font-size: 9px;
}
.normal-text {
  font-size: 11px;
}
.highlight-text {
  font-size: 12px;
  color: #ff6b35;
}
```

### 主内容区居中适配

```css
.page-root {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.main-content {
  width: 390px;
  max-width: 100vw;
  margin: 0 auto;
}
```

## 🔍 Debug & Testing Guidelines

### 调试日志标准格式

```typescript
console.log('🚀 功能开始:', functionName);
console.log('📝 参数:', params);
console.log('✅ 成功:', result);
console.warn('⚠️ 警告:', warning);
console.error('❌ 错误:', error);
```

### 平台兼容性测试

```
□ H5 环境功能测试
□ 微信小程序环境测试
□ iOS 设备真机测试
□ Android 设备真机测试
□ 网络异常场景测试
□ 弱网环境测试
```

## 📋 Pre-development Checklist

### 开始开发前必须确认

```
□ 是否阅读了项目技术架构文档？
□ 是否了解了项目文件结构？
□ 是否熟悉了 API 接口规范？
□ 是否理解了业务逻辑和特殊规则？
□ 是否配置了正确的开发环境？
□ 是否了解了项目的命名规范？
```

### 功能开发中必须检查

```
□ 类型定义是否正确？
□ CSS 是否兼容小程序？
□ API 调用是否规范？
□ 错误处理是否完善？
□ 页面跳转是否正确？
□ 是否添加了调试日志？
```

### 功能完成后必须验证

```
□ TypeScript 编译是否通过？
□ 多平台环境是否测试？
□ 错误场景是否覆盖？
□ 用户体验是否良好？
□ 相关文档是否更新？
□ 代码是否通过 review？
```

---

**使用说明**：

1. 开发前请仔细阅读本清单
2. 开发过程中定期检查相关项目
3. 发现新问题时及时更新本清单
4. 定期与团队分享问题解决经验

**更新频率**：每月更新一次，或发现重大问题时及时更新
