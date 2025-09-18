# uni-app + TypeScript 项目开发规范指南

> 基于 KTV 员工管理系统实际开发经验提炼
> 适用技术栈：uni-app + Vue 3 + TypeScript + Pinia + Vite
> 文档版本：v1.0
> 创建时间：2025-01-18

## 📋 核心规范概述

本文档基于真实项目开发中的经验教训，制定了一套完整的开发规范，旨在帮助团队在相同技术架构下避免常见陷阱，提升开发效率和代码质量。

## 🏗️ 项目架构规范

### 目录结构标准

```
src/
├── api/                    # API 接口模块
├── components/             # 组件目录
│   ├── business/          # 业务组件
│   └── common/           # 通用组件
├── pages/                 # 页面目录
├── stores/               # Pinia 状态管理
├── types/                # TypeScript 类型定义
├── utils/                # 工具函数
├── styles/               # 样式文件
├── pages.json           # 页面配置（注意：在src目录下）
└── App.vue              # 应用根组件
```

### 文件命名规范

- **页面文件**：`kebab-case.vue` (如 `profile-edit.vue`)
- **组件文件**：`PascalCase.vue` (如 `CommonButton.vue`)
- **API 模块**：`kebab-case.ts` (如 `user-center.ts`)

## 🎯 TypeScript 类型规范

### uni-app 官方类型使用

```typescript
// ✅ 正确：使用官方类型定义
const res = await new Promise<UniNamespace.ChooseImageSuccessCallbackResult>((resolve, reject) => {
  uni.chooseImage({
    success: resolve,
    fail: reject,
  });
});

// 安全处理返回值
const tempFilePath = Array.isArray(res.tempFilePaths) ? res.tempFilePaths[0] : res.tempFilePaths;

// ❌ 错误：使用不存在的类型
// UniApp.ChooseImageRes - 此类型不存在
```

### 业务类型定义规范

```typescript
// 统一的 API 响应结构
interface ApiResponse<T = any> {
  code: number | string;
  message: string;
  data: T;
}

// 使用枚举避免魔法数字
enum StaffStatus {
  WORKING = 2, // 上班中
  ORDER_ACCEPTED = 10, // 已接单
  REAL_NAME_NEEDED = 80, // 未实名
}
```

## 🔧 API 开发规范

### 错误处理优先级原则

```typescript
private handleResponse(response: any): any {
  const { data, statusCode } = response

  // 1. 优先检查业务状态码（即使 HTTP 状态码不是 200）
  if (data?.code !== undefined && data.code !== 'success' && data.code !== 0) {
    throw new ApiError(data.message || '业务处理失败', data)
  }

  // 2. 只有在没有业务状态码时才检查 HTTP 状态码
  if (statusCode !== 200) {
    throw new ApiError(`HTTP ${statusCode}`, response)
  }

  return data
}
```

### Loading 状态管理规范

```typescript
// 明确控制 loading 显示
export const getUserProfile = async (options?: { loading?: boolean }) => {
  return await apiAdapter.get('/api/user/profile', params, {
    loading: options?.loading === true, // 明确为 true 才显示
  });
};

// 使用示例
await getUserProfile({ loading: true }); // 显示 loading
await getUserProfile({ loading: false }); // 不显示（下拉刷新时）
```

## 🎨 CSS 兼容性规范

### 小程序兼容性要求

```css
/* ❌ 不兼容的选择器 */
* {
  box-sizing: border-box;
} /* 通配符选择器 */
.button:hover {
  background: #ff6b35;
} /* :hover 伪类 */
.input:focus {
  border-color: #ff6b35;
} /* :focus 伪类 */

/* ✅ 推荐的替代方案 */
view,
text,
button,
input,
textarea {
  box-sizing: border-box;
}

/* 使用 hover-class 属性 */
.button-hover {
  background: #ff6b35;
}

/* 使用属性选择器 */
.input[focus] {
  outline: none;
  border-color: #ff6b35;
}
```

### 移动端表格布局

```css
/* Flex 表格实现 */
.table-row {
  display: flex;
  width: 100%;
}

/* 精确列宽分配（总和必须为100%）*/
.time-col {
  flex: 0 0 16%;
}
.amount-col {
  flex: 0 0 20%;
}
.status-col {
  flex: 0 0 12%;
}
```

## 🚫 模块导入规范

### 禁用动态导入

```typescript
// ❌ 禁止：在小程序中不稳定
const { useUserStore } = await import('../stores/user');

// ✅ 推荐：使用静态导入
import { useUserStore } from '@/stores/user';

// ✅ 多重降级策略
const getUserInfoSafely = () => {
  try {
    // 方案1：本地存储
    const userInfo = uni.getStorageSync('user_info');
    if (userInfo) return JSON.parse(userInfo);

    // 方案2：静态导入
    return useUserStore().userInfo;
  } catch (error) {
    return null;
  }
};
```

## 🎪 交互设计规范

### 页面跳转类型选择

```typescript
// 跳转方法选择规范
const navigateToPage = (pageType: 'tabbar' | 'normal', url: string) => {
  if (pageType === 'tabbar') {
    uni.switchTab({ url }); // tabbar 页面
  } else {
    uni.navigateTo({ url }); // 普通页面
  }
};
```

### iOS 小程序浮动按钮优化

```vue
<template>
  <view
    class="floating-btn"
    hover-class="floating-btn-hover"
    @tap="handleAction"
    @catchtouchmove="preventMove"
  >
    操作
  </view>
</template>

<style lang="scss" scoped>
.floating-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999; /* 高层级 */
  /* iOS 安全区域适配 */
  bottom: calc(30px + env(safe-area-inset-bottom));
  /* 小程序优化 */
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
</style>
```

### 下拉刷新防冲突

```typescript
const handleRefresh = async () => {
  if (isRefreshing.value) return;

  isRefreshing.value = true;
  try {
    // 禁用 API 的自动 loading
    await userStore.fetchData({ loading: false });
    uni.showToast({ title: '刷新成功', icon: 'success' });
  } finally {
    setTimeout(() => (isRefreshing.value = false), 500);
  }
};
```

## 🧪 Vue 单文件组件规范

### 标准 SFC 结构

```vue
<template>
  <!-- 只能有一个 template -->
</template>

<script setup lang="ts">
// 只能有一个 script setup 块
</script>

<style lang="scss" scoped>
/* 只能有一个 style 块 */
</style>
```

### 组件开发模式

```vue
<script setup lang="ts">
// 1. 导入语句
import { ref, computed } from 'vue';

// 2. Props 和 Emits 定义
interface Props {
  title: string;
  showAction?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  showAction: true,
});

// 3. 响应式数据
const isLoading = ref(false);

// 4. 计算属性和方法
const isValid = computed(() => props.title.length > 0);
</script>
```

## 📂 文件上传规范

### OSS 文件命名标准

```typescript
// 标准命名格式：{timestamp}_{业务标识}.{标准后缀}
const generateFileName = (type: 'image' | 'video' | 'avatar') => {
  const timestamp = Date.now();
  switch (type) {
    case 'image':
      return `${timestamp}_image_1.jpg`;
    case 'video':
      return `${timestamp}_video_1.mp4`;
    case 'avatar':
      return `${timestamp}_avatar.jpg`;
  }
};
```

## 🎯 业务逻辑规范

### API 字段权威性原则

```typescript
// ❌ 错误：基于 UI 推测 API 含义
const params = {
  uId: userId, // 错误推测
  room: '101', // 显示名称
};

// ✅ 正确：严格按照 API 文档
const params = {
  uId: staffId, // 实际含义：服务员ID
  room: roomId, // 实际含义：房间唯一标识
};
```

### 状态映射准确性

```typescript
// 使用业务规则函数，避免重复逻辑
const BusinessRules = {
  isRealNameVerified: (status: number): boolean => {
    return ![79, 80].includes(status); // 明确的业务规则
  },

  shouldShowServiceCard: (status: number): boolean => {
    return status === 2; // 仅上班中状态显示
  },
};
```

## 📋 开发流程检查清单

### 开发前检查

```
□ 是否了解项目技术架构和文件结构？
□ 是否阅读了相关API文档？
□ 是否了解业务逻辑和特殊规则？
```

### 开发中检查

```
□ 类型定义是否使用正确的uni-app类型？
□ CSS选择器是否兼容小程序环境？
□ API调用是否遵循项目规范？
□ 页面跳转类型是否选择正确？
```

### 开发后检查

```
□ 是否通过TypeScript编译检查？
□ 是否在多平台环境中测试？
□ 是否更新了相关文档？
□ 是否进行了代码review？
```

## 🔍 调试规范

### 标准日志格式

```typescript
// 功能日志
console.log('🚀 功能开始:', functionName);
console.log('📝 参数:', params);
console.log('✅ 成功结果:', result);

// 错误日志
console.error('❌ 错误信息:', error);
console.warn('⚠️ 警告信息:', warning);
```

## 📈 质量保证

### 代码审查要点

```
□ 代码是否遵循命名规范？
□ 错误处理是否完善？
□ 业务逻辑是否正确实现？
□ 是否考虑了移动端用户体验？
```

### 测试要求

- **多平台测试**：H5、微信小程序环境
- **错误场景测试**：网络异常、API错误
- **用户体验测试**：加载状态、交互反馈

## 🔄 持续改进

### 经验积累机制

1. **问题记录**：及时记录开发问题和解决方案
2. **规范更新**：定期更新开发规范文档
3. **团队分享**：定期进行技术分享和经验交流

---

**维护说明**：本规范基于实际项目经验制定，应根据新的实践经验持续更新和完善。

**适用范围**：所有使用 uni-app + Vue 3 + TypeScript + Pinia 技术栈的项目。
