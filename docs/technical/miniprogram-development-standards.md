# 微信小程序开发规范与调试指南

> 基于KTV员工管理系统实际开发经验总结
> 文档版本：v1.1
> 更新时间：2025-07-07 11:50:00
> 适用范围：uni-app + 微信小程序开发

## 📋 概述

本文档总结了在微信小程序开发过程中遇到的兼容性问题、解决方案和最佳实践，旨在帮助开发团队避免常见陷阱，提高开发效率。

## 🎯 表格布局规范

### HTML表格标签兼容性

**问题**：微信小程序不支持HTML表格标签，会导致布局错乱

```html
<!-- ❌ 不兼容的HTML表格 -->
<table class="details-table">
  <thead>
    <tr>
      <th>列1</th>
      <th>列2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>数据1</td>
      <td>数据2</td>
    </tr>
  </tbody>
</table>

<!-- ✅ 使用view元素 + flex布局 -->
<view class="details-table">
  <!-- 表头 -->
  <view class="table-header-row">
    <view class="table-cell col1">列1</view>
    <view class="table-cell col2">列2</view>
  </view>
  <!-- 数据行 -->
  <view class="table-row">
    <view class="table-cell col1">数据1</view>
    <view class="table-cell col2">数据2</view>
  </view>
</view>
```

### Flex表格布局最佳实践

#### 1. 基础表格结构

```css
/* 表格容器 */
.details-table {
  width: 100%;
  font-size: 11px;
}

/* 表头样式 */
.table-header-row {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

/* 数据行样式 */
.table-row {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.2s ease;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.table-row:last-child {
  border-bottom: none;
}

/* 基础单元格样式 */
.table-cell {
  padding: 10px 6px;
  text-align: center;
  color: #cccccc;
  font-weight: 600;
  font-size: 10px;
  line-height: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  word-wrap: break-word;
  word-break: break-all;
}
```

#### 2. 列宽分配策略

**原则**：根据内容长度和重要性分配列宽，确保总和为100%

```css
/* 7列表格示例（收益明细） */
.time-col {
  flex: 0 0 16%;
} /* 时间列 */
.ktv-col {
  flex: 0 0 20%;
} /* KTV名称（可能较长） */
.room-col {
  flex: 0 0 10%;
} /* 房间号（较短） */
.rate-col {
  flex: 0 0 12%;
} /* 资费 */
.duration-col {
  flex: 0 0 10%;
} /* 时长 */
.method-col {
  flex: 0 0 12%;
} /* 结算方式 */
.amount-col {
  flex: 0 0 20%;
} /* 金额（包含状态） */

/* 6列表格示例（酒水收益） */
.time-col {
  flex: 0 0 16%;
} /* 订单时间 */
.consumption-col {
  flex: 0 0 17%;
} /* 酒水消费 */
.deduction-col {
  flex: 0 0 15%;
} /* 扣除低消 */
.base-col {
  flex: 0 0 17%;
} /* 提成基数 */
.rate-col {
  flex: 0 0 12%;
} /* 提成比例 */
.earnings-col {
  flex: 0 0 17%;
} /* 收益金额 */
```

#### 3. 特殊状态行处理

**跨列单元格**：加载状态和空状态需要跨越所有列

```html
<!-- 加载状态 -->
<view class="table-row loading-row">
  <view class="table-cell loading-cell" style="flex: 1;">
    <view>数据加载中...</view>
  </view>
</view>

<!-- 空状态 -->
<view class="table-row empty-row">
  <view class="table-cell empty-cell" style="flex: 1;">
    <view>暂无数据</view>
    <view class="empty-subtitle">请调整查询条件后重试</view>
  </view>
</view>
```

#### 4. 数据对齐规范

**一致性原则**：确保每个数据行的列数与表头完全对应

```html
<!-- ✅ 正确：每行都有相同的列数和类名 -->
<view class="table-row">
  <view class="table-cell datetime-cell time-col">...</view>
  <view class="table-cell ktv-cell ktv-col">...</view>
  <view class="table-cell room-cell room-col">...</view>
  <view class="table-cell rate-cell rate-col">...</view>
  <view class="table-cell duration-cell duration-col">...</view>
  <view class="table-cell method-cell method-col">...</view>
  <view class="table-cell amount-cell amount-col">...</view>
</view>
```

### 响应式表格设计

```css
/* 小屏幕适配 */
@media (max-width: 375px) {
  .details-table {
    font-size: 10px;
  }

  .table-cell {
    padding: 6px 4px;
    font-size: 9px;
  }

  /* 可选：隐藏次要列 */
  .secondary-col {
    display: none;
  }
}
```

### 表格样式统一规范

**命名约定**：

- 表格容器：`.details-table`
- 表头行：`.table-header-row`
- 数据行：`.table-row`
- 单元格：`.table-cell`
- 列宽类：`.{column-name}-col`

## 🚫 模块导入规范

### 动态导入问题与解决方案

#### 1. 动态导入的不稳定性

**问题**：`await import()`在微信小程序中不稳定，会导致模块加载失败，常见错误：`TypeError: i is not a function`

**案例**：位置服务中的动态导入问题

```javascript
// ❌ 错误做法 - 导致微信小程序报错
const { useUserStore } = await import('../stores/user');
const userStore = useUserStore();
const accountId = userStore.userInfo?.id?.toString();
```

#### 2. 推荐解决方案

**方案1：静态导入（首选）**

```javascript
// ✅ 正确做法 - 使用静态导入
import { useUserStore } from '@/stores/user';

// 在需要时调用
const userStore = useUserStore();
const accountId = userStore.userInfo?.id?.toString();
```

**方案2：本地存储直接读取（兼容性强）**

```javascript
// ✅ 微信小程序优化方案
let accountId: string | undefined;

// 优先使用本地存储读取，避免动态导入
try {
  if (typeof uni !== 'undefined' && uni.getStorageSync) {
    const userInfoStr = uni.getStorageSync('user_info')
    if (userInfoStr) {
      const userInfo = JSON.parse(userInfoStr)
      accountId = userInfo?.id?.toString()
    }
  }
} catch (storageError) {
  console.warn('读取本地存储失败:', storageError)
}

// 后备方案：静态导入
if (!accountId) {
  import { useUserStore } from '@/stores/user'
  const userStore = useUserStore()
  accountId = userStore.userInfo?.id?.toString()
}
```

**方案3：多重降级策略**

```javascript
// ✅ 最佳实践：多重备用方案
const getUserInfoSafely = () => {
  try {
    // 方案1：本地存储
    const userInfoStr = uni.getStorageSync('user_info');
    if (userInfoStr) return JSON.parse(userInfoStr);

    // 方案2：静态导入（已确保模块加载）
    const { useUserStore } = require('@/stores/user');
    return useUserStore().userInfo;
  } catch (error) {
    console.warn('获取用户信息失败:', error);
    return null;
  }
};
```

#### 3. 动态导入使用场景

**允许使用的情况**：

- 代码分割和懒加载（仅在H5环境）
- 非关键功能的按需加载
- 第三方库的动态加载

**禁用场景**：

- 核心业务流程中的模块导入
- 微信小程序环境下的用户状态获取
- 位置服务等关键功能的依赖注入

### 模块导入最佳实践

```javascript
// ✅ 标准导入规范
import { authAdapter } from './auth';
import { shouldRequireLogin, forceGotoLogin, apiAuthGuard } from '../utils/auth-guard';

// ✅ 平台特定导入
// #ifdef H5
import { webSpecificModule } from './web-module';
// #endif

// #ifdef MP-WEIXIN
import { miniProgramModule } from './miniprogram-module';
// #endif
```

### 第三方库兼容性

**crypto-js库问题**：在微信小程序中存在兼容性问题

```javascript
// ❌ 问题库
import CryptoJS from 'crypto-js';

// ✅ 替代方案
// 1. 使用内嵌MD5函数
function md5(string) {
  // 完整的MD5实现...
}

// 2. 使用uni原生API
const base64 = uni.arrayBufferToBase64(uni.stringToArrayBuffer(str));
```

### 循环依赖处理

**原则**：避免模块间的循环依赖，使用依赖注入或事件系统

```javascript
// ❌ 循环依赖
// auth.js imports user-store.js
// user-store.js imports auth.js

// ✅ 解决方案
// 使用事件系统或依赖注入
import { EventBus } from './event-bus';
EventBus.emit('auth-changed', { token, user });
```

## 🔧 API兼容性规范

### Web API替代方案

**navigator API限制**：微信小程序中navigator对象功能受限

```javascript
// ❌ 不兼容的Web API
if (navigator.vibrate) {
  navigator.vibrate(50);
}

// ✅ uni-app官方API
if (uni.vibrateShort && typeof uni.vibrateShort === 'function') {
  uni.vibrateShort();
}
```

### 安全调用模式

**原则**：所有API调用都应该包含存在性检查

```javascript
// ✅ 安全调用模式
const safeVibrate = (type = 'short') => {
  try {
    if (type === 'short') {
      if (uni.vibrateShort && typeof uni.vibrateShort === 'function') {
        uni.vibrateShort({
          success: () => console.log('振动成功'),
          fail: (error) => console.warn('振动失败:', error),
        });
      }
    }
  } catch (error) {
    console.warn('振动API异常:', error);
  }
};
```

### 常用API替代表

| Web API                   | uni-app API          | 说明        |
| ------------------------- | -------------------- | ----------- |
| `navigator.vibrate()`     | `uni.vibrateShort()` | 短振动      |
| `navigator.vibrate(1000)` | `uni.vibrateLong()`  | 长振动      |
| `localStorage`            | `uni.setStorage()`   | 本地存储    |
| `sessionStorage`          | `uni.setStorage()`   | 会话存储    |
| `window.location`         | `uni.navigateTo()`   | 页面跳转    |
| `URLSearchParams`         | `buildUrlParams()`   | URL参数处理 |

### URL参数处理

**URLSearchParams不兼容**：微信小程序中不支持URLSearchParams API

```javascript
// ❌ 不兼容的URLSearchParams
const params = new URLSearchParams({
  ktv: 'KTV名称',
  room: '包间号',
}).toString();

// ✅ 使用工具函数替代
import { buildUrlParams, parseUrlParams } from '@/utils/common';

// 构建URL参数
const params = buildUrlParams({
  ktv: 'KTV名称',
  room: '包间号',
  ktvId: 123,
  roomId: 456,
});
// 结果: "ktv=KTV%E5%90%8D%E7%A7%B0&room=%E5%8C%85%E9%97%B4%E5%8F%B7&ktvId=123&roomId=456"

// 解析URL参数
const queryParams = parseUrlParams('ktv=KTV%E5%90%8D%E7%A7%B0&room=%E5%8C%85%E9%97%B4%E5%8F%B7');
// 结果: { ktv: 'KTV名称', room: '包间号' }
```

## 🎨 CSS兼容性规范

### 禁用选择器

**通配符选择器**：微信小程序不支持`*{}`选择器

```scss
// ❌ 不兼容
* {
  box-sizing: border-box;
}

// ✅ 替代方案
view,
text,
button,
input,
textarea,
image,
scroll-view {
  box-sizing: border-box;
}
```

### 推荐的CSS写法

```scss
// ✅ 推荐写法
page {
  font-family: $font-family;
  background: $bg-gradient;
}

.container {
  padding: 20rpx;
  background: #fff;
}

// 使用@import替代@use（兼容性更好）
@import './variables.scss';
@import './mixins.scss';
```

### 锚点滑动最佳实践

**问题**：微信小程序环境下uni.pageScrollTo存在兼容性问题，位置计算不准确

**推荐方案**：使用scroll-view + scroll-into-view

#### ✅ 标准实现方式

```html
<!-- 模板结构 -->
<view class="page-container">
  <scroll-view
    class="content-scroll"
    scroll-y
    :scroll-into-view="scrollIntoView"
    scroll-with-animation
    :scroll-top="scrollTop"
    enhanced
    :show-scrollbar="false"
  >
    <!-- 页面内容 -->
    <view id="section1" class="section">内容1</view>
    <view id="section2" class="section">内容2</view>
    <view id="section3" class="section">内容3</view>
  </scroll-view>
</view>
```

```javascript
// 数据定义
export default {
  data() {
    return {
      scrollIntoView: '',
      scrollTop: 0,
      isScrolling: false,
    };
  },

  methods: {
    scrollToElement(elementId) {
      try {
        // 微信小程序环境使用scroll-into-view
        if (this.isWeChatMiniProgram()) {
          this.scrollIntoView = elementId;

          // 清理状态
          this.isScrolling = true;
          setTimeout(() => {
            this.scrollIntoView = '';
            this.isScrolling = false;
          }, 600);
        } else {
          // H5/APP环境使用传统方式
          this.useTraditionalScroll(elementId);
        }
      } catch (error) {
        console.error('滚动失败:', error);
      }
    },

    isWeChatMiniProgram() {
      try {
        const systemInfo = uni.getSystemInfoSync();
        return ['devtools', 'ios', 'android'].includes(systemInfo.platform);
      } catch {
        return false;
      }
    },
  },
};
```

#### ✅ CSS布局要求

```css
.page-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.content-scroll {
  flex: 1;
  padding: 20rpx;
  padding-bottom: 120rpx; /* 为底部按钮留出空间 */
}
```

#### 🚫 不兼容做法

```javascript
// ❌ 微信小程序环境不稳定
uni.pageScrollTo({
  scrollTop: targetPosition,
  duration: 400
})

// ❌ 固定延时不可靠
setTimeout(() => {
  uni.pageScrollTo(...)
}, 600)
```

### 样式单位规范

- 使用`rpx`作为主要单位（响应式像素）
- 字体大小使用`rpx`或`px`
- 边框使用`1px`（物理像素）

## 🛡️ 错误处理规范

### 防御性编程原则

**多重备用方案**：为关键功能提供多个实现方案

```javascript
// ✅ 多重备用方案示例
const encodeBase64 = (str) => {
  // 方案1：使用btoa（优先）
  if (typeof btoa !== 'undefined') {
    try {
      return btoa(str);
    } catch (error) {
      console.warn('btoa方法失败，使用备用方案');
    }
  }

  // 方案2：使用uni原生API
  if (uni.arrayBufferToBase64) {
    try {
      return uni.arrayBufferToBase64(uni.stringToArrayBuffer(str));
    } catch (error) {
      console.warn('uni原生API失败，使用手动实现');
    }
  }

  // 方案3：手动实现
  return manualBase64Encode(str);
};
```

### 类型安全检查

**token类型问题**：不同环境下数据类型可能不一致

```javascript
// ✅ 类型安全检查
const safeTokenOperation = (token) => {
  if (token && typeof token === 'string') {
    return token.substring(0, 10) + '...';
  } else if (token) {
    console.warn('token不是字符串类型:', typeof token, token);
    return String(token);
  }
  return 'no-token';
};
```

### 错误日志规范

```javascript
// ✅ 标准错误处理
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('操作失败:', {
    operation: 'riskyOperation',
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // 用户友好的错误提示
  uni.showToast({
    title: '操作失败，请重试',
    icon: 'none',
    duration: 2000,
  });

  // 可选：上报错误到监控系统
  // errorReporter.report(error)
}
```

## 📍 位置服务开发经验

### 微信小程序位置服务兼容性

基于实际开发经验，位置服务在微信小程序环境中需要特别注意以下问题：

#### 1. 动态导入导致的错误

**问题描述**：

- 错误信息：`TypeError: i is not a function`
- 发生位置：`location-service.js:1` 位置信息同步失败
- 根本原因：动态导入 `await import('../stores/user')` 在微信小程序中不稳定

**解决方案**：

```javascript
// ❌ 错误做法 - 微信小程序中不稳定
const { useUserStore } = await import('../stores/user')
const userStore = useUserStore()
const accountId = userStore.userInfo?.id?.toString()

// ✅ 正确做法 - 多重降级策略
private async syncLocationToServer(location: LocationInfo): Promise<void> {
  try {
    let accountId: string | undefined

    // 方案1：本地存储直接读取（最稳定）
    try {
      if (typeof uni !== 'undefined' && uni.getStorageSync) {
        const userInfoStr = uni.getStorageSync('user_info')
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr)
          accountId = userInfo?.id?.toString()
        }
      }
    } catch (storageError) {
      console.warn('读取本地存储失败:', storageError)
    }

    // 方案2：静态导入（后备方案）
    if (!accountId) {
      const { useUserStore } = await import('../stores/user')
      const userStore = useUserStore()
      accountId = userStore.userInfo?.id?.toString()
    }

    if (!accountId) {
      console.warn('⚠️ 未找到用户ID，跳过位置同步')
      return
    }

    // 继续位置同步逻辑...
  } catch (error) {
    console.error('❌ 位置信息同步失败:', error)
    // 记录但不中断主流程
  }
}
```

#### 2. API兼容性检查

**位置服务API调用规范**：

```javascript
// ✅ 安全调用模式
const safeGetLocation = () => {
  return new Promise((resolve) => {
    // 添加兼容性检查
    if (typeof uni === 'undefined' || !uni.getLocation) {
      console.warn('⚠️ uni.getLocation 不可用');
      resolve(null);
      return;
    }

    uni.getLocation({
      type: 'gcj02',
      timeout: 8000,
      enableHighAccuracy: true,
      success: (res) => {
        console.log('📍 GPS定位成功:', res);
        resolve(res);
      },
      fail: (error) => {
        console.warn('📍 GPS定位失败:', error);
        resolve(null);
      },
    });
  });
};
```

#### 3. 位置服务初始化最佳实践

```javascript
// ✅ 微信小程序优化的位置服务初始化
async initialize(): Promise<void> {
  console.log(`🌍 初始化位置服务... [${this.platform}环境]`)

  try {
    // 平台兼容性检查
    if (typeof uni === 'undefined') {
      console.warn('⚠️ uni对象不可用，跳过位置服务初始化')
      return
    }

    // 根据平台配置决定行为
    if (!this.platformConfig.enableCache && !this.platformConfig.enableAutoUpdate) {
      console.log('⚠️ 当前平台禁用位置服务，跳过初始化')
      return
    }

    // 检查缓存是否有效
    if (this.platformConfig.enableCache && this.isCacheValid()) {
      console.log('📱 使用有效缓存位置:', this.cache.location)
      this.notifySubscribers(this.cache.location)
    } else {
      console.log('🔄 获取位置信息...')
      await this.updateLocation()
    }

    // 仅在支持自动更新的平台上启动定时更新
    if (this.platformConfig.enableAutoUpdate) {
      this.scheduleLocationUpdate()
      console.log('⏰ 自动位置更新已启用')
    }

    console.log('✅ 位置服务初始化完成')
  } catch (error) {
    console.error('❌ 位置服务初始化失败:', error)
    // 所有平台都不抛出错误，允许应用继续运行
    console.log('💡 位置服务初始化失败，应用将继续运行（位置功能可能受限）')
  }
}
```

#### 4. 错误处理与降级策略

```javascript
// ✅ 完善的错误处理机制
private async updateLocation(): Promise<void> {
  if (this.isUpdating) {
    console.log('📍 位置更新中，跳过重复请求')
    return
  }

  this.isUpdating = true

  try {
    console.log('🔄 开始位置更新流程...')
    const location = await this.fetchLocation()

    if (location) {
      // 更新缓存和通知
      this.cache = { location, lastUpdate: Date.now(), isValid: true }
      this.saveCacheToStorage()
      await this.syncLocationToServer(location)
      this.notifySubscribers(location)
      console.log('✅ 位置更新成功:', location)
    } else {
      console.log('🔄 尝试使用降级定位策略...')
      await this.tryFallbackLocation()
    }
  } catch (error) {
    console.error('❌ 位置更新失败:', {
      platform: this.platform,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : '无堆栈信息'
    })

    // 智能重试策略
    this.retryCount++
    if (this.retryCount < this.platformConfig.retryCount) {
      const delay = Math.pow(2, this.retryCount) * 1000
      console.log(`📍 ${this.retryCount}/${this.platformConfig.retryCount} 次重试... (${delay}ms后)`)
      setTimeout(() => this.updateLocation(), delay)
    } else {
      console.error('📍 位置获取重试次数已达上限')
      await this.tryFallbackLocation()
    }
  } finally {
    this.isUpdating = false
  }
}
```

#### 5. 位置服务调试指南

**常见问题排查**：

1. **动态导入失败** → 检查是否使用了`await import()`，改用静态导入
2. **API调用失败** → 验证`uni.getLocation`等API的兼容性
3. **用户ID获取失败** → 优先使用本地存储读取，避免动态导入
4. **位置同步失败** → 检查网络连接和权限设置

**调试代码示例**：

```javascript
// ✅ 位置服务调试工具
const debugLocationService = () => {
  console.group('🔍 位置服务调试信息');

  // 检查平台环境
  const systemInfo = uni.getSystemInfoSync();
  console.log('平台信息:', systemInfo.platform);

  // 检查uni对象可用性
  console.log('uni对象:', typeof uni);
  console.log('uni.getLocation:', typeof uni.getLocation);
  console.log('uni.getStorageSync:', typeof uni.getStorageSync);

  // 检查本地存储
  try {
    const userInfo = uni.getStorageSync('user_info');
    console.log('用户信息:', userInfo ? '存在' : '不存在');
  } catch (e) {
    console.error('读取用户信息失败:', e);
  }

  console.groupEnd();
};
```

## 🔍 调试技巧

**常见问题排查**：

1. **数据行与表头不对应** → 检查每行的列数和类名是否一致
2. **列宽分配不合理** → 确保所有列的flex值总和为100%
3. **跨列单元格显示异常** → 使用`style="flex: 1;"`而非固定宽度

```javascript
// ✅ 表格调试工具函数
const debugTableLayout = () => {
  const headerCells = document.querySelectorAll('.table-header-row .table-cell');
  const firstRowCells = document.querySelectorAll('.table-row:first-of-type .table-cell');

  console.log('表头列数:', headerCells.length);
  console.log('数据行列数:', firstRowCells.length);

  if (headerCells.length !== firstRowCells.length) {
    console.error('❌ 表头与数据行列数不匹配！');
  } else {
    console.log('✅ 表格结构正确');
  }
};
```

### 错误信息解读

**常见错误模式**：

1. `Cannot read property 'xxx' of undefined` → 对象不存在，需要添加存在性检查
2. `xxx is not a function` → 函数不存在或导入失败
3. `module 'xxx' is not defined` → 模块导入问题
4. `unexpected token` → 语法不兼容或编译错误

### 调试工具使用

```javascript
// ✅ 调试日志规范
console.log('🚀 功能开始:', functionName);
console.log('📝 参数:', params);
console.log('✅ 成功结果:', result);
console.warn('⚠️ 警告信息:', warning);
console.error('❌ 错误信息:', error);
```

### 性能优化建议

1. **避免频繁的API调用**：使用缓存和防抖
2. **优化图片资源**：使用合适的格式和尺寸
3. **减少DOM操作**：使用虚拟列表处理大量数据
4. **懒加载**：非关键资源延迟加载

## ✅ 最佳实践清单

### 开发阶段

- [ ] 使用静态导入替代动态导入
- [ ] 为所有API调用添加存在性检查
- [ ] 避免使用不兼容的CSS选择器
- [ ] 实现多重备用方案
- [ ] 添加完整的错误处理
- [ ] 使用flex布局替代HTML表格
- [ ] 确保表格数据行与表头列数一致
- [ ] 添加类型安全检查
- [ ] 使用scroll-view + scroll-into-view实现锚点滑动
- [ ] 在微信小程序环境下使用scroll-view而非pageScrollTo

### 测试阶段

- [ ] 在微信开发者工具中测试所有功能
- [ ] 验证在真机上的表现
- [ ] 检查控制台是否有错误和警告
- [ ] 测试网络异常情况下的表现
- [ ] 验证表格在不同屏幕尺寸下的显示效果
- [ ] 测试跨平台兼容性（H5、小程序）

### 发布阶段

- [ ] 清理调试代码和console.log
- [ ] 优化资源文件大小
- [ ] 检查小程序包体积限制
- [ ] 验证所有页面路径配置正确

## 🔗 相关文档

- [uni-app官方文档](https://uniapp.dcloud.io/)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/)
- [项目API接口文档](../api/)
- [项目技术架构文档](./technical-architecture.md)

## 📝 更新记录

- 2025-08-01：v1.2 - 新增位置服务开发经验，包含动态导入问题解决方案、API兼容性检查、错误处理与降级策略
- 2025-07-07：v1.1 - 新增表格布局规范、数据对齐规范、类型安全检查等内容
- 2025-07-06：v1.0 - 创建文档，基于实际开发经验总结

---

**维护责任人**：前端开发团队
**审核周期**：每月更新一次
**适用项目**：所有uni-app + 微信小程序项目
